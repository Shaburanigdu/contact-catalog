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

    // Проверяем, что событие принадлежит пользователю
    const existing = await prisma.event.findFirst({
      where: { id, user_id: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Полное удаление из БД
    await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error hard deleting event:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}