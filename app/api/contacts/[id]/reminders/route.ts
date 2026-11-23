import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/request-utils'
import { prisma } from '@/lib/prisma'
import { ruleForRepeat } from '@/lib/recurrence'

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
    const { title, description, due_at, repeat } = body
    const recurrenceRule = ruleForRepeat(repeat)

    if (!title || !due_at) {
      return NextResponse.json({ success: false, error: 'Название и дата обязательны' }, { status: 400 })
    }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, user_id: user.id, deleted_at: null },
    })
    if (!contact) {
      return NextResponse.json({ success: false, error: 'Контакт не найден' }, { status: 404 })
    }

    const reminder = await prisma.reminder.create({
      data: {
        user_id: user.id,
        contact_id: contactId,
        title,
        description,
        due_at: new Date(due_at),
        created_at: new Date(),
        status: 'pending',
        is_recurring: recurrenceRule !== null,
        recurrence_pattern: recurrenceRule,
      },
    })

    return NextResponse.json({
      success: true,
      data: reminder,
    })
  } catch (error) {
    console.error('Failed to add reminder:', error)
    return NextResponse.json({ success: false, error: 'Ошибка сервера' }, { status: 500 })
  }
}