import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateRequest,
  validateContactData,
  createAuditLog,
  ApiResponse
} from '@/lib/request-utils'
import { prisma } from '@/lib/prisma'
import { getEmbedding } from '@/lib/embedding';

/*
 * Рекомендуемые индексы для улучшения производительности:
 * 
 * -- Простые индексы для фильтрации
 * CREATE INDEX idx_contacts_city ON "Contact_catalog".contacts (city);
 * CREATE INDEX idx_contacts_relationship_type ON "Contact_catalog".contacts (relationship_type);
 * CREATE INDEX idx_contacts_last_interaction_date ON "Contact_catalog".contacts (last_interaction_date) WHERE deleted_at IS NULL;
 * 
 * -- GIN индекс для полнотекстового поиска
 * CREATE INDEX idx_contacts_search_vector ON "Contact_catalog".contacts 
 * USING GIN (to_tsvector('russian', 
 *   coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' || 
 *   coalesce(nickname,'') || ' ' || coalesce(email,'') || ' ' || 
 *   coalesce(company,'') || ' ' || coalesce(job_title,'')
 * ));
 */

// GET /api/contacts - Получить контакты пользователя
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12') // уменьшено до 12
    const skip = (page - 1) * limit

    const search = searchParams.get('search') || undefined
    const city = searchParams.get('city') || undefined
    const country = searchParams.get('country') || undefined
    const relationship_type = searchParams.get('relationship_type') || undefined
    const tagName = searchParams.get('tag') || undefined
    const tagIds = searchParams.get('tagIds')?.split(',').filter(Boolean) || undefined
    const has_upcoming_events = searchParams.get('has_upcoming_events') === 'true'
    const lastInteractionDays = searchParams.get('last_interaction_days')

    const where: any = {
      user_id: user.id,
      deleted_at: null,
    }

    const andConditions: any[] = []

    // Простые равенства
    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }
    if (country) where.country = country
    if (relationship_type) where.relationship_type = relationship_type

    // Полнотекстовый поиск (вместо LIKE)
    if (search) {
      const searchQuery = search.trim()
      if (searchQuery) {
        // Получаем ID контактов через полнотекстовый поиск
        const ids = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Contact_catalog".contacts
          WHERE to_tsvector('russian', 
            coalesce(first_name,'') || ' ' || 
            coalesce(last_name,'') || ' ' || 
            coalesce(nickname,'') || ' ' || 
            coalesce(email,'') || ' ' || 
            coalesce(company,'') || ' ' || 
            coalesce(job_title,'')
          ) @@ plainto_tsquery('russian', ${searchQuery})
          AND user_id = ${user.id}::uuid
          AND deleted_at IS NULL
        `
        const contactIds = ids.map(row => row.id)
        if (contactIds.length === 0) {
          // Нет результатов – возвращаем пустой список сразу
          return NextResponse.json<ApiResponse>({
            success: true,
            data: {
              contacts: [],
              pagination: { page, limit, total: 0, pages: 0 }
            }
          })
        }
        where.id = { in: contactIds }
      }
    }

    // Фильтр по тегам
    if (tagIds && tagIds.length > 0) {
      where.contact_tags = {
        some: {
          tag_id: { in: tagIds }
        }
      }
    } else if (tagName) {
      where.contact_tags = {
        some: {
          tag: { name: tagName }
        }
      }
    }

    // Фильтр "предстоящие события"
    if (has_upcoming_events) {
      where.event_participants = {
        some: {
          event: {
            start_at: { gt: new Date() },
            deleted_at: null
          }
        }
      }
    }

    // Фильтр "давно не общались"
    if (lastInteractionDays && !isNaN(Number(lastInteractionDays))) {
      const days = Number(lastInteractionDays)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      andConditions.push({
        OR: [
          { last_interaction_date: null },
          { last_interaction_date: { lt: cutoffDate } }
        ]
      })
    }

    // Объединяем дополнительные AND-условия
    if (andConditions.length > 0) {
      const { user_id, deleted_at, ...restWhere } = where
      const baseConditions = [
        { user_id },
        { deleted_at },
        ...Object.entries(restWhere).map(([key, value]) => ({ [key]: value }))
      ]
      where.AND = [...baseConditions, ...andConditions]
      delete where.user_id
      delete where.deleted_at
      Object.keys(restWhere).forEach(key => delete where[key])
    }

    // Выполняем запросы с ограниченным набором полей
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updated_at: 'desc' },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          nickname: true,
          email: true,
          phone: true,
          city: true,
          company: true,
          job_title: true,
          avatar_url: true,
          last_interaction_date: true,
          total_interactions: true,
          contact_tags: {
            select: {
              tags: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  is_system: true
                }
              }
            }
          }
        },
      }),
      prisma.contact.count({ where }),
    ])

    // Преобразуем формат тегов
    const formattedContacts = contacts.map(contact => ({
      ...contact,
      tags: contact.contact_tags.map(ct => ct.tags),
      contact_tags: undefined
    }))

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        contacts: formattedContacts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Failed to fetch contacts:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при загрузке контактов' },
      { status: 500 }
    )
  }
}

// POST /api/contacts - Создать новый контакт (без изменений, оставлен как в оригинале)
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const validationErrors = validateContactData(body)
    if (validationErrors.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: validationErrors.join(', ') },
        { status: 400 }
      )
    }

    if (body.tags && Array.isArray(body.tags) && body.tags.length > 0) {
      const validTags = await prisma.tag.findMany({
        where: {
          id: { in: body.tags },
          OR: [
            { user_id: user.id },
            { is_system: true }
          ]
        }
      })

      if (validTags.length !== body.tags.length) {
        const invalidTagIds = body.tags.filter((tagId: string) =>
          !validTags.some(tag => tag.id === tagId)
        )
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: `Некоторые теги не найдены или недоступны: ${invalidTagIds.join(', ')}`
          },
          { status: 400 }
        )
      }
    }

    const interests = Array.isArray(body.interests) ? body.interests : []
    const important_facts = Array.isArray(body.important_facts) ? body.important_facts : []

    const contactData: any = {
      user_id: user.id,
      first_name: body.first_name,
      last_name: body.last_name || null,
      middle_name: body.middle_name || null,
      nickname: body.nickname || null,
      email: body.email || null,
      phone: body.phone || null,
      phone_secondary: body.phone_secondary || null,
      website: body.website || null,
      gender: body.gender || null,
      date_of_birth: body.date_of_birth ? new Date(body.date_of_birth) : null,
      country: body.country || null,
      city: body.city || null,
      address: body.address || null,
      postal_code: body.postal_code || null,
      company: body.company || null,
      job_title: body.job_title || null,
      department: body.department || null,
      relationship_type: body.relationship_type || 'Друг',
      relationship_level: body.relationship_level ? parseInt(body.relationship_level) : null,
      trust_level: body.trust_level ? parseInt(body.trust_level) : null,
      how_we_met: body.how_we_met || null,
      met_date: body.met_date ? new Date(body.met_date) : null,
      met_location: body.met_location || null,
      personal_notes: body.personal_notes || null,
      interests: interests,
      important_facts: important_facts,
      avatar_url: body.avatar_url || null,
    }

    const contact = await prisma.contact.create({
      data: contactData,
    })

    const textForEmbedding = `${contact.first_name} ${contact.last_name || ''} ${contact.company || ''} ${contact.personal_notes || ''}`.trim();
    if (textForEmbedding) {
      try {
        const embedding = await getEmbedding(textForEmbedding);
        await prisma.$executeRaw`
          UPDATE "Contact_catalog".contacts
          SET embedding = ${JSON.stringify(embedding)}::vector
          WHERE id = ${contact.id}::uuid
        `;
      } catch (err) {
        console.error('Failed to generate embedding for contact:', err);
      }
    }

    if (body.tags && Array.isArray(body.tags) && body.tags.length > 0) {
      const tagConnections = body.tags.map((tagId: string) => ({
        contact_id: contact.id,
        tag_id: tagId,
      }))
      await prisma.contactTag.createMany({
        data: tagConnections,
        skipDuplicates: true
      })
    }

    const createdContact = await prisma.contact.findUnique({
      where: { id: contact.id },
      include: {
        contact_tags: {
          include: {
            tags: {
              select: {
                id: true,
                name: true,
                color: true,
                is_system: true
              }
            }
          }
        }
      }
    })

    const formattedContact = {
      ...createdContact,
      tags: createdContact?.contact_tags.map(ct => ct.tags),
      contact_tags: undefined
    }

    await createAuditLog(
      user.id,
      'CREATE',
      'CONTACT',
      contact.id,
      undefined,
      contactData,
      request
    )

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: formattedContact,
        message: 'Контакт успешно создан'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create contact:', error)

    if (error instanceof Error) {
      if (error.message.includes('Unique constraint failed')) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Контакт с таким email или телефоном уже существует' },
          { status: 409 }
        )
      }

      if (error.message.includes('Invalid value')) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Некорректные данные в одном из полей' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при создании контакта' },
      { status: 500 }
    )
  }
}