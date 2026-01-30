import { NextRequest, NextResponse } from 'next/server'
import { 
  authenticateRequest, 
  validateContactData,
  createAuditLog,
  ApiResponse 
} from '@/lib/request-utils'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/contacts/[id] - Получить контакт по ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await authenticateRequest(request)
    
    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { id } = params

    const contact = await prisma.contact.findFirst({
      where: {
        id,
        user_id: user.id,
        deleted_at: null,
      },
      include: {
        contact_tags: {
          include: {
            tags: true,
          },
        },
        interactions: {
          take: 10,
          orderBy: { started_at: 'desc' },
          where: { deleted_at: null },
        },
        notes: {
          take: 5,
          orderBy: { created_at: 'desc' },
          where: { deleted_at: null },
        },
        reminders: {
          take: 5,
          orderBy: { due_at: 'asc' },
          where: { 
            deleted_at: null,
            status: 'pending'
          },
        },
        event_participants: {
          include: {
            events: {
              select: {
                id: true,
                title: true,
                start_at: true,
                end_at: true,
              },
            },
          },
          where: {
            events: {
              deleted_at: null,
            },
          },
          take: 5,
        },
      },
    })

    if (!contact) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Контакт не найден' },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: contact,
    })
  } catch (error) {
    console.error('Failed to fetch contact:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при загрузке контакта' },
      { status: 500 }
    )
  }
}

// PUT /api/contacts/[id] - Обновить контакт
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await authenticateRequest(request)
    
    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { id } = params

    // Проверяем существование контакта
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        user_id: user.id,
        deleted_at: null,
      },
    })

    if (!existingContact) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Контакт не найден' },
        { status: 404 }
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

    // Подготовка данных для обновления
    const updateData: any = {
      first_name: body.first_name !== undefined ? body.first_name : existingContact.first_name,
      last_name: body.last_name !== undefined ? body.last_name : existingContact.last_name,
      middle_name: body.middle_name !== undefined ? body.middle_name : existingContact.middle_name,
      nickname: body.nickname !== undefined ? body.nickname : existingContact.nickname,
      email: body.email !== undefined ? body.email : existingContact.email,
      phone: body.phone !== undefined ? body.phone : existingContact.phone,
      phone_secondary: body.phone_secondary !== undefined ? body.phone_secondary : existingContact.phone_secondary,
      website: body.website !== undefined ? body.website : existingContact.website,
      gender: body.gender !== undefined ? body.gender : existingContact.gender,
      date_of_birth: body.date_of_birth !== undefined ? new Date(body.date_of_birth) : existingContact.date_of_birth,
      country: body.country !== undefined ? body.country : existingContact.country,
      city: body.city !== undefined ? body.city : existingContact.city,
      address: body.address !== undefined ? body.address : existingContact.address,
      postal_code: body.postal_code !== undefined ? body.postal_code : existingContact.postal_code,
      company: body.company !== undefined ? body.company : existingContact.company,
      job_title: body.job_title !== undefined ? body.job_title : existingContact.job_title,
      department: body.department !== undefined ? body.department : existingContact.department,
      relationship_type: body.relationship_type !== undefined ? body.relationship_type : existingContact.relationship_type,
      relationship_level: body.relationship_level !== undefined ? parseInt(body.relationship_level) : existingContact.relationship_level,
      trust_level: body.trust_level !== undefined ? parseInt(body.trust_level) : existingContact.trust_level,
      how_we_met: body.how_we_met !== undefined ? body.how_we_met : existingContact.how_we_met,
      met_date: body.met_date !== undefined ? new Date(body.met_date) : existingContact.met_date,
      met_location: body.met_location !== undefined ? body.met_location : existingContact.met_location,
      personal_notes: body.personal_notes !== undefined ? body.personal_notes : existingContact.personal_notes,
      interests: body.interests !== undefined ? body.interests : existingContact.interests,
      important_facts: body.important_facts !== undefined ? body.important_facts : existingContact.important_facts,
      avatar_url: body.avatar_url !== undefined ? body.avatar_url : existingContact.avatar_url,
      updated_at: new Date(),
    }

    // Обновляем контакт
    const updatedContact = await prisma.contact.update({
      where: { id },
      data: updateData,
    })

    // Обновляем теги если они есть
    if (body.tags && Array.isArray(body.tags)) {
      // Удаляем старые теги
      await prisma.contactTag.deleteMany({
        where: { contact_id: id },
      })

      // Добавляем новые теги
      for (const tagId of body.tags) {
        await prisma.contactTag.create({
          data: {
            contact_id: id,
            tag_id: tagId,
          },
        })
      }
    }

    // Логируем в аудит
    await createAuditLog(
      user.id,
      'UPDATE',
      'CONTACT',
      id,
      existingContact,
      updatedContact,
      request
    )

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedContact,
      message: 'Контакт успешно обновлен',
    })
  } catch (error) {
    console.error('Failed to update contact:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при обновлении контакта' },
      { status: 500 }
    )
  }
}

// DELETE /api/contacts/[id] - Удалить контакт (мягкое удаление)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await authenticateRequest(request)
    
    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { id } = params

    // Проверяем существование контакта
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        user_id: user.id,
        deleted_at: null,
      },
    })

    if (!existingContact) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Контакт не найден' },
        { status: 404 }
      )
    }

    // Мягкое удаление
    await prisma.contact.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    })

    // Логируем в аудит
    await createAuditLog(
      user.id,
      'DELETE',
      'CONTACT',
      id,
      existingContact,
      null,
      request
    )

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Контакт успешно удален',
    })
  } catch (error) {
    console.error('Failed to delete contact:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при удалении контакта' },
      { status: 500 }
    )
  }
}