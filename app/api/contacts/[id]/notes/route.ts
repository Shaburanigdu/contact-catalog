import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/request-utils'
import { prisma } from '@/lib/prisma'
import { getEmbedding } from '@/lib/embedding'

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
    const { content, title } = body

    if (!content) {
      return NextResponse.json({ success: false, error: 'Текст заметки обязателен' }, { status: 400 })
    }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, user_id: user.id, deleted_at: null },
    })
    if (!contact) {
      return NextResponse.json({ success: false, error: 'Контакт не найден' }, { status: 404 })
    }

    const note = await prisma.note.create({
      data: {
        user_id: user.id,
        contact_id: contactId,
        title: title || '',
        content,
        created_at: new Date(),
      },
    })

    // Index the note for AI search; failure (e.g. Ollama offline) must not block saving.
    try {
      const embedding = await getEmbedding(`${note.title || ''} ${note.content}`.trim())
      await prisma.$executeRaw`
        UPDATE "Contact_catalog".notes
        SET embedding = ${JSON.stringify(embedding)}::vector
        WHERE id = ${note.id}::uuid
      `
    } catch (err) {
      console.error('Failed to generate embedding for note:', err)
    }

    return NextResponse.json({
      success: true,
      data: note,
    })
  } catch (error) {
    console.error('Failed to add note:', error)
    return NextResponse.json({ success: false, error: 'Ошибка сервера' }, { status: 500 })
  }
}