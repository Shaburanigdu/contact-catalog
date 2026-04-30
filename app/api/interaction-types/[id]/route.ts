import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/request-utils';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await authenticateRequest(request);
  if (error || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Проверяем, существует ли тип и принадлежит ли пользователю (или системный)
  const type = await prisma.interactionType.findFirst({
    where: {
      id,
      OR: [
        { user_id: user.id },
        { is_system: true },
      ],
    },
  });

  if (!type) {
    return NextResponse.json({ success: false, error: 'Type not found' }, { status: 404 });
  }

  if (type.is_system) {
    return NextResponse.json({ success: false, error: 'Cannot delete system type' }, { status: 403 });
  }

  // Удаляем тип (связь во взаимодействиях станет null из-за onUpdate: NoAction? Лучше обнулить)
  // Сначала обнулим interaction_type_id у взаимодействий, чтобы избежать ошибок внешнего ключа
  await prisma.interaction.updateMany({
    where: { interaction_type_id: id },
    data: { interaction_type_id: null },
  });

  await prisma.interactionType.delete({ where: { id } });

  return NextResponse.json({ success: true });
}