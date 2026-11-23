import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, createAuditLog, ApiResponse } from '@/lib/request-utils';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request);
    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity') || 'all'; // 'contacts', 'events', 'all'

    const where: any = {
      OR: [
        { user_id: user.id },
        { is_system: true }
      ],
    };

    const tags = await prisma.tag.findMany({
      where,
      orderBy: [{ is_system: 'asc' }, { name: 'asc' }],
    });

    const tagIds = tags.map(t => t.id);
    let contactCounts: Record<string, number> = {};
    let eventCounts: Record<string, number> = {};

    if (tagIds.length > 0) {
      const contactAgg = await prisma.contactTag.groupBy({
        by: ['tag_id'],
        where: {
          tag_id: { in: tagIds },
          contacts: { user_id: user.id, deleted_at: null }
        },
        _count: { tag_id: true },
      });
      contactCounts = contactAgg.reduce((acc, item) => {
        acc[item.tag_id] = item._count.tag_id;
        return acc;
      }, {} as Record<string, number>);

      const eventAgg = await prisma.eventTag.groupBy({
        by: ['tag_id'],
        where: {
          tag_id: { in: tagIds },
          events: { user_id: user.id, deleted_at: null }
        },
        _count: { tag_id: true },
      });
      eventCounts = eventAgg.reduce((acc, item) => {
        acc[item.tag_id] = item._count.tag_id;
        return acc;
      }, {} as Record<string, number>);
    }

    const tagsWithCounts = tags.map(tag => ({
      ...tag,
      contactCount: contactCounts[tag.id] || 0,
      eventCount: eventCounts[tag.id] || 0,
      // interactionCount убран
    }));

    let filteredTags = tagsWithCounts;
    if (entity === 'contacts') {
      filteredTags = tagsWithCounts.filter(tag => tag.contactCount > 0);
    } else if (entity === 'events') {
      filteredTags = tagsWithCounts.filter(tag => tag.eventCount > 0);
    }
    // для 'all' – никакой фильтрации

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { tags: filteredTags },
    });
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при загрузке тегов' },
      { status: 500 }
    );
  }
}

// POST (создание тега) остаётся без изменений, но чтобы не было проблем с новой колонкой scope, оставьте как есть.
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request);
    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, color, icon, description, scope = 'both' } = body;

    if (!name || !color) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не указаны обязательные поля: name, color' },
        { status: 400 }
      );
    }

    const existingTag = await prisma.tag.findFirst({
      where: {
        user_id: user.id,
        name,
      },
    });

    if (existingTag) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Тег с таким именем уже существует' },
        { status: 409 }
      );
    }

    const tag = await prisma.tag.create({
      data: {
        user_id: user.id,
        name,
        color,
        icon: icon || null,
        description: description || null,
        is_system: false,
        scope, // колонка существует в БД, так что можно оставить
      },
    });

    await createAuditLog(
      user.id,
      'CREATE',
      'TAG',
      tag.id,
      undefined,
      tag,
      request
    );

    return NextResponse.json<ApiResponse>(
      { success: true, data: { tag }, message: 'Тег успешно создан' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create tag:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при создании тега' },
      { status: 500 }
    );
  }
}