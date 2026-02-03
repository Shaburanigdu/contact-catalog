//app/api/tags/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { 
  authenticateRequest, 
  createAuditLog,
  ApiResponse 
} from '@/lib/request-utils'
import { prisma } from '@/lib/prisma'

// GET /api/tags - Получить теги пользователя
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    
    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const tags = await prisma.tag.findMany({
      where: {
        OR: [
          { user_id: user.id },
          { is_system: true }
        ],
      },
      orderBy: [
        { is_system: 'desc' },
        { created_at: 'desc' }
      ],
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { tags },
    })
  } catch (error) {
    console.error('Failed to fetch tags:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при загрузке тегов' },
      { status: 500 }
    )
  }
}

// POST /api/tags - Создать новый тег
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