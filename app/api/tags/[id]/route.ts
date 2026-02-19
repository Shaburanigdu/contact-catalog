import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateRequest,
  createAuditLog,
  ApiResponse
} from '@/lib/request-utils'
import { prisma } from '@/lib/prisma'

// DELETE /api/tags/[id] - удалить тег (только пользовательский, не системный)
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

    // Проверяем, существует ли тег и принадлежит ли пользователю
    const tag = await prisma.tag.findFirst({
      where: {
        id,
        user_id: user.id,
      },
    })

    if (!tag) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Тег не найден' },
        { status: 404 }
      )
    }

    // Запрещаем удаление системных тегов (если они помечены is_system)
    if (tag.is_system) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Нельзя удалить системный тег' },
        { status: 403 }
      )
    }

    // Сохраняем данные для аудита до удаления
    const oldTag = { ...tag }

    // Удаляем тег (связи удалятся каскадно благодаря схеме Prisma)
    await prisma.tag.delete({
      where: { id },
    })

    // Аудит
    await createAuditLog(
      user.id,
      'DELETE',
      'TAG',
      id,
      oldTag,
      null,
      request
    )

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Тег успешно удалён',
    })
  } catch (error) {
    console.error('Failed to delete tag:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при удалении тега' },
      { status: 500 }
    )
  }
}