import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateRequest,
  validateContactData,
  createAuditLog,
  ApiResponse
} from '@/lib/request-utils'
import { prisma } from '@/lib/prisma'

// GET /api/contacts/[id] - Получить контакт по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params
    const { id } = resolvedParams

    const { user, error } = await authenticateRequest(request)
    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

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
          where: { deleted_at: null, status: 'pending' },
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
          where: { events: { deleted_at: null } },
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

    return NextResponse.json<ApiResponse>({ success: true, data: contact })
  } catch (error) {
    console.error('Failed to fetch contact:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при загрузке контакта' },
      { status: 500 }
    )
  }
}

// PUT /api/contacts/[id] - Обновить контакт
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params
    const { id } = resolvedParams

    if (!id) {
      console.error('ID is missing in params', resolvedParams)
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ID контакта не указан' },
        { status: 400 }
      )
    }

    const { user, error } = await authenticateRequest(request)
    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

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

    // Валидация
    const validationErrors = validateContactData(body)
    if (validationErrors.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: validationErrors.join(', ') },
        { status: 400 }
      )
    }

    // Базовое обновление (поля, не требующие специальной обработки)
    const updateData: any = {
      first_name: body.first_name ?? existingContact.first_name,
      last_name: body.last_name ?? existingContact.last_name,
      middle_name: body.middle_name ?? existingContact.middle_name,
      nickname: body.nickname ?? existingContact.nickname,
      email: body.email ?? existingContact.email,
      phone: body.phone ?? existingContact.phone,
      phone_secondary: body.phone_secondary ?? existingContact.phone_secondary,
      website: body.website ?? existingContact.website,
      gender: body.gender ?? existingContact.gender,
      country: body.country ?? existingContact.country,
      city: body.city ?? existingContact.city,
      address: body.address ?? existingContact.address,
      postal_code: body.postal_code ?? existingContact.postal_code,
      company: body.company ?? existingContact.company,
      job_title: body.job_title ?? existingContact.job_title,
      department: body.department ?? existingContact.department,
      relationship_type: body.relationship_type ?? existingContact.relationship_type,
      how_we_met: body.how_we_met ?? existingContact.how_we_met,
      met_location: body.met_location ?? existingContact.met_location,
      personal_notes: body.personal_notes ?? existingContact.personal_notes,
      interests: body.interests ?? existingContact.interests,
      important_facts: body.important_facts ?? existingContact.important_facts,
      avatar_url: body.avatar_url ?? existingContact.avatar_url,
      updated_at: new Date(),
    }

    // Безопасная обработка дат (пустая строка → null)
    if (body.date_of_birth !== undefined) {
      updateData.date_of_birth =
        body.date_of_birth && body.date_of_birth.trim() !== ''
          ? new Date(body.date_of_birth)
          : null
    }

    if (body.met_date !== undefined) {
      updateData.met_date =
        body.met_date && body.met_date.trim() !== ''
          ? new Date(body.met_date)
          : null
    }

    // Безопасная обработка чисел (пустая строка → null)
    if (body.relationship_level !== undefined) {
      const val = parseInt(body.relationship_level, 10)
      updateData.relationship_level = isNaN(val) ? null : val
    }

    if (body.trust_level !== undefined) {
      const val = parseInt(body.trust_level, 10)
      updateData.trust_level = isNaN(val) ? null : val
    }

    // Обновляем контакт
    const updatedContact = await prisma.contact.update({
      where: { id },
      data: updateData,
    })

    // Обработка тегов (если переданы)
    if (Array.isArray(body.tags)) {
      // Удаляем старые связи
      await prisma.contactTag.deleteMany({
        where: { contact_id: id },
      })

      // Добавляем новые теги (теги, которые принадлежат пользователю ИЛИ являются системными)
      for (const tagId of body.tags) {
        const tag = await prisma.tag.findFirst({
          where: {
            id: tagId,
            OR: [
              { user_id: user.id },
              { is_system: true }
            ]
          },
        })
        if (tag) {
          await prisma.contactTag.create({
            data: {
              contact_id: id,
              tag_id: tagId,
            },
          })
        }
      }
    }

    // Аудит
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
      message: 'Контакт успешно обновлён',
    })
  } catch (error) {
    console.error('Failed to update contact:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при обновлении контакта' },
      { status: 500 }
    )
  }
}

// DELETE /api/contacts/[id] - Мягкое удаление
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params
    const { id } = resolvedParams

    const { user, error } = await authenticateRequest(request)
    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

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

    await prisma.contact.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    })

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
      message: 'Контакт успешно удалён',
    })
  } catch (error) {
    console.error('Failed to delete contact:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при удалении контакта' },
      { status: 500 }
    )
  }
}