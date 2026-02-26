import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/request-utils'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 })
    }

    const { id: contactId } = await params
    const body = await request.json()
    const { url, thumbnailUrl, fileName, mimeType, size, caption } = body

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL файла обязателен' }, { status: 400 })
    }

    // Проверяем контакт
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, user_id: user.id, deleted_at: null },
    })
    if (!contact) {
      return NextResponse.json({ success: false, error: 'Контакт не найден' }, { status: 404 })
    }

    // Создаем запись в Media
    const media = await prisma.media.create({
      data: {
        user_id: user.id,
        contact_id: contactId,
        filename: fileName || url.split('/').pop() || 'file',
        file_path: url,
        mime_type: mimeType,
        file_size: size && !isNaN(Number(size)) ? BigInt(Number(size)) : null,
        title: caption || '',
        uploaded_at: new Date(),
      },
    })

    // Преобразуем BigInt в число для корректной сериализации в JSON
    const responseData = {
      ...media,
      file_size: media.file_size ? Number(media.file_size) : null,
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    })
  } catch (error) {
    console.error('Failed to add media:', error)
    return NextResponse.json({ success: false, error: 'Ошибка сервера' }, { status: 500 })
  }
}