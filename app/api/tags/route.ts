import { NextRequest, NextResponse } from 'next/server'
import { 
  authenticateRequest, 
  createAuditLog,
  ApiResponse 
} from '@/lib/request-utils'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    
    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

    // Получаем все теги, доступные пользователю (свои + системные)
    const tags = await prisma.tag.findMany({
      where: {
        OR: [
          { user_id: user.id },
          { is_system: true }
        ],
      },
      orderBy: [
        { is_system: 'asc' },   // сначала пользовательские (false), потом системные (true)
        { name: 'asc' },        // внутри каждой группы по алфавиту
      ],
    })

    // Получаем количество использований каждого тега у текущего пользователя
    const tagIds = tags.map(t => t.id)
    let usageCounts: Record<string, number> = {}
    if (tagIds.length > 0) {
      const counts = await prisma.contactTag.groupBy({
        by: ['tag_id'],
        where: {
          tag_id: { in: tagIds },
          contacts: {
            user_id: user.id,
            deleted_at: null,
          }
        },
        _count: {
          tag_id: true,
        }
      })
      usageCounts = counts.reduce((acc, item) => {
        acc[item.tag_id] = item._count.tag_id
        return acc
      }, {} as Record<string, number>)
    }

    // Добавляем _count к каждому тегу
    const tagsWithCount = tags.map(tag => ({
      ...tag,
      _count: { contact_tags: usageCounts[tag.id] || 0 }
    }))

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { tags: tagsWithCount },
    })
  } catch (error) {
    console.error('Failed to fetch tags:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при загрузке тегов' },
      { status: 500 }
    )
  }
}

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
    const { name, color, icon, description } = body

    // Валидация
    if (!name || !color) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не указаны обязательные поля: name, color' },
        { status: 400 }
      )
    }

    // Проверяем, существует ли тег с таким именем
    const existingTag = await prisma.tag.findFirst({
      where: {
        user_id: user.id,
        name,
      },
    })

    if (existingTag) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Тег с таким именем уже существует' },
        { status: 409 }
      )
    }

    // Создаем тег
    const tag = await prisma.tag.create({
      data: {
        user_id: user.id,
        name,
        color,
        icon: icon || null,
        description: description || null,
        is_system: false,
      },
    })

    // Логируем в аудит
    await createAuditLog(
      user.id,
      'CREATE',
      'TAG',
      tag.id,
      undefined,
      tag,
      request
    )

    return NextResponse.json<ApiResponse>(
      { 
        success: true, 
        data: { tag },
        message: 'Тег успешно создан'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create tag:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при создании тега' },
      { status: 500 }
    )
  }
}