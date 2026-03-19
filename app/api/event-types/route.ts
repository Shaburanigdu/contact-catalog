// app/api/event-types/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем все типы пользователя (включая системные)
    const userTypes = await prisma.eventType.findMany({
      where: { user_id: user.id },
      orderBy: [
        { is_system: 'desc' },
        { name: 'asc' }
      ],
    });

    return NextResponse.json({ success: true, data: userTypes });
  } catch (error) {
    console.error('Error fetching event types:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, icon, color } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Проверка на дубликат в пользовательских типах
    const existing = await prisma.eventType.findFirst({
      where: {
        user_id: user.id,
        name: name,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Тип события с таким названием уже существует' },
        { status: 400 }
      );
    }

    const type = await prisma.eventType.create({
      data: {
        user_id: user.id,
        name,
        icon,
        color,
      },
    });

    return NextResponse.json({ success: true, data: type });
  } catch (error) {
    console.error('Error creating event type:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}