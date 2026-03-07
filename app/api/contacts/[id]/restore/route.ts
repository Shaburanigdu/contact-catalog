import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, createAuditLog, ApiResponse } from '@/lib/request-utils';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const { user, error } = await authenticateRequest(request);
    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const contact = await prisma.contact.findFirst({
      where: {
        id,
        user_id: user.id,
        deleted_at: { not: null },
      },
    });

    if (!contact) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Контакт не найден в корзине' },
        { status: 404 }
      );
    }

    const restored = await prisma.contact.update({
      where: { id },
      data: {
        deleted_at: null,
        updated_at: new Date(),
      },
    });

    await createAuditLog(
      user.id,
      'RESTORE',
      'CONTACT',
      id,
      contact,
      restored,
      request
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: restored,
      message: 'Контакт восстановлен',
    });
  } catch (error) {
    console.error('Failed to restore contact:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при восстановлении контакта' },
      { status: 500 }
    );
  }
}