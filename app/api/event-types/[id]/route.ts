// app/api/event-types/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Проверяем, что тип принадлежит пользователю
    const type = await prisma.eventType.findFirst({
      where: { id, user_id: user.id },
    });

    if (!type) {
      return NextResponse.json({ error: 'Тип не найден' }, { status: 404 });
    }

    // Запрещаем удаление системных типов
    if (type.is_system) {
      return NextResponse.json(
        { error: 'Нельзя удалить системный тип' },
        { status: 403 }
      );
    }

    // Обновляем события, у которых был этот тип: устанавливаем event_type_id = null
    await prisma.event.updateMany({
      where: { event_type_id: id },
      data: { event_type_id: null },
    });

    // Удаляем сам тип
    await prisma.eventType.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event type:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}