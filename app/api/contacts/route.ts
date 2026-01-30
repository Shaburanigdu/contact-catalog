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
          nickname: true,
          email: true,
          phone: true,
          city: true,
          country: true,
          company: true,
          job_title: true,
          relationship_type: true,
          relationship_level: true,
          trust_level: true,
          avatar_url: true,
          date_of_birth: true,
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
                  color: true
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
      tags: contact.contact_tags.map(ct => ct.tags)
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

// POST /api/contacts - Создать новый контакт
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

    // Подготовка данных
    const contactData: any = {
      user_id: user.id,
      first_name: body.first_name,
      last_name: body.last_name,
      middle_name: body.middle_name,
      nickname: body.nickname,
      email: body.email,
      phone: body.phone,
      phone_secondary: body.phone_secondary,
      website: body.website,
      gender: body.gender,
      date_of_birth: body.date_of_birth ? new Date(body.date_of_birth) : null,
      country: body.country,
      city: body.city,
      address: body.address,
      postal_code: body.postal_code,
      company: body.company,
      job_title: body.job_title,
      department: body.department,
      relationship_type: body.relationship_type || 'friend',
      relationship_level: body.relationship_level ? parseInt(body.relationship_level) : null,
      trust_level: body.trust_level ? parseInt(body.trust_level) : null,
      how_we_met: body.how_we_met,
      met_date: body.met_date ? new Date(body.met_date) : null,
      met_location: body.met_location,
      personal_notes: body.personal_notes,
      interests: body.interests,
      important_facts: body.important_facts,
      avatar_url: body.avatar_url,
    }

    // Создаем контакт
    const contact = await prisma.contact.create({
      data: contactData,
    })

    // Создаем теги если они есть
    if (body.tags && Array.isArray(body.tags)) {
      for (const tagId of body.tags) {
        await prisma.contactTag.create({
          data: {
            contact_id: contact.id,
            tag_id: tagId,
          },
        })
      }
    }

    // Логируем в аудит
    await createAuditLog(
      user.id,
      'CREATE',
      'CONTACT',
      contact.id,
      undefined,
      contact,
      request
    )

    return NextResponse.json<ApiResponse>(
      { 
        success: true, 
        data: contact,
        message: 'Контакт успешно создан'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create contact:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при создании контакта' },
      { status: 500 }
    )
  }
}