import { NextRequest, NextResponse } from 'next/server'
import { 
  authenticateRequest, 
  validateContactData,
  createAuditLog,
  ApiResponse 
} from '@/lib/request-utils'
import { prisma } from '@/lib/prisma'

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
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const search = searchParams.get('search') || undefined
    const city = searchParams.get('city') || undefined
    const country = searchParams.get('country') || undefined
    const relationship_type = searchParams.get('relationship_type') || undefined
    const tag = searchParams.get('tag') || undefined
    const has_upcoming_events = searchParams.get('has_upcoming_events') === 'true'
    const last_interaction_days = searchParams.get('last_interaction_days')

    // Построение фильтров
    const where: any = {
      user_id: user.id,
      deleted_at: null,
    }

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { nickname: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { job_title: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (city) {
      where.city = city
    }

    if (country) {
      where.country = country
    }

    if (relationship_type) {
      where.relationship_type = relationship_type
    }

    if (tag) {
      where.contact_tags = {
        some: {
          tag: {
            name: tag
          }
        }
      }
    }

    if (last_interaction_days) {
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - parseInt(last_interaction_days))
      where.last_interaction_date = {
        lt: daysAgo
      }
    }

    // Если нужны контакты с предстоящими событиями
    if (has_upcoming_events) {
      where.event_participants = {
        some: {
          event: {
            start_at: {
              gt: new Date()
            },
            deleted_at: null
          }
        }
      }
    }

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
          middle_name: true,
          nickname: true,
          email: true,
          phone: true,
          phone_secondary: true,
          website: true,
          gender: true,
          date_of_birth: true,
          country: true,
          city: true,
          address: true,
          postal_code: true,
          company: true,
          job_title: true,
          department: true,
          relationship_type: true,
          relationship_level: true,
          trust_level: true,
          how_we_met: true,
          met_date: true,
          met_location: true,
          personal_notes: true,
          interests: true,
          important_facts: true,
          avatar_url: true,
          last_interaction_date: true,
          total_interactions: true,
          created_at: true,
          updated_at: true,
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

    // Преобразуем контакты
    const formattedContacts = contacts.map(contact => ({
      ...contact,
      tags: contact.contact_tags.map(ct => ct.tags),
      contact_tags: undefined // Убираем промежуточное поле
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

// POST /api/contacts - Создать новый контакт (полная версия)
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

    // Валидация данных
    const validationErrors = validateContactData(body)
    if (validationErrors.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: validationErrors.join(', ') },
        { status: 400 }
      )
    }

    // Проверка тегов, если они есть
    if (body.tags && Array.isArray(body.tags) && body.tags.length > 0) {
      // Проверяем, что все теги существуют и доступны пользователю
      const validTags = await prisma.tag.findMany({
        where: {
          id: { in: body.tags },
          OR: [
            { user_id: user.id },
            { is_system: true }
          ]
        }
      })

      // Если количество валидных тегов не совпадает с запрошенными
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

    // Обработка интересов и важных фактов
    const interests = Array.isArray(body.interests) ? body.interests : [];
    const important_facts = Array.isArray(body.important_facts) ? body.important_facts : [];

    // Подготовка данных
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
      relationship_type: body.relationship_type || 'friend',
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

    // Создаем контакт
    const contact = await prisma.contact.create({
      data: contactData,
    })

    // Создаем связи с тегами, если они есть
    if (body.tags && Array.isArray(body.tags) && body.tags.length > 0) {
      // Используем createMany для эффективности
      const tagConnections = body.tags.map((tagId: string) => ({
        contact_id: contact.id,
        tag_id: tagId,
      }))

      await prisma.contactTag.createMany({
        data: tagConnections,
        skipDuplicates: true
      })
    }

    // Получаем созданный контакт с тегами для ответа
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

    // Преобразуем контакт для ответа
    const formattedContact = {
      ...createdContact,
      tags: createdContact?.contact_tags.map(ct => ct.tags),
      contact_tags: undefined
    }

    // Логируем в аудит
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
    
    // Проверяем конкретные ошибки Prisma
    if (error instanceof Error) {
      // Ошибка уникальности
      if (error.message.includes('Unique constraint failed')) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Контакт с таким email или телефоном уже существует' },
          { status: 409 }
        )
      }
      
      // Ошибка валидации
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