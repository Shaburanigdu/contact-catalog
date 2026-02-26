import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/request-utils'
import { prisma } from '@/lib/prisma'

// GET /api/contacts/[id]/timeline - получить все записи для контакта (медиа, заметки, напоминания)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 })
    }

    const { id: contactId } = await params

    // Проверяем, что контакт принадлежит пользователю
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, user_id: user.id, deleted_at: null },
    })
    if (!contact) {
      return NextResponse.json({ success: false, error: 'Контакт не найден' }, { status: 404 })
    }

    // Получаем медиа (включаем file_size для размера)
    const media = await prisma.media.findMany({
      where: { contact_id: contactId, deleted_at: null },
      orderBy: { uploaded_at: 'desc' },
      select: {
        id: true,
        filename: true,
        file_path: true,
        mime_type: true,
        title: true,
        description: true,
        uploaded_at: true,
        file_size: true,
      },
    })

    // Получаем заметки
    const notes = await prisma.note.findMany({
      where: { contact_id: contactId, deleted_at: null },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        created_at: true,
      },
    })

    // Получаем напоминания (только активные? пока все)
    const reminders = await prisma.reminder.findMany({
      where: { contact_id: contactId, deleted_at: null },
      orderBy: { due_at: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        due_at: true,
        status: true,
        created_at: true,
      },
    })

    // Формируем медиа-элементы с преобразованием в нужный формат
    const mediaItems = media.map(m => ({
      id: m.id,
      type: 'media',
      mediaType: m.mime_type?.startsWith('image/') ? 'image' : 
                  m.mime_type?.startsWith('video/') ? 'video' : 
                  m.mime_type?.startsWith('audio/') ? 'audio' : 'document',
      url: m.file_path,
      thumbnailUrl: m.description || null, // сохраняем превью из description, если есть
      fileName: m.filename,
      fileSize: m.file_size ? Number(m.file_size) : 0,
      caption: m.title || '',
      createdAt: m.uploaded_at?.toISOString() || new Date().toISOString(),
    }))

    const noteItems = notes.map(n => ({
      id: n.id,
      type: 'note',
      content: n.content,
      createdAt: n.created_at?.toISOString() || new Date().toISOString(),
    }))

    const reminderItems = reminders.map(r => ({
      id: r.id,
      type: 'reminder',
      title: r.title,
      description: r.description || '',
      dueAt: r.due_at?.toISOString() || new Date().toISOString(),
      createdAt: r.created_at?.toISOString() || new Date().toISOString(),
    }))

    // Объединяем и сортируем по дате создания (новые сверху)
    const timeline = [...mediaItems, ...noteItems, ...reminderItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      success: true,
      data: timeline,
    })
  } catch (error) {
    console.error('Failed to fetch timeline:', error)
    return NextResponse.json({ success: false, error: 'Ошибка сервера' }, { status: 500 })
  }
}