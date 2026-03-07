import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, createAuditLog, ApiResponse } from '@/lib/request-utils';
import { prisma } from '@/lib/prisma';

export async function DELETE(
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

    await prisma.contact.delete({
      where: { id },
    });

    await createAuditLog(
      user.id,
      'HARD_DELETE',
      'CONTACT',
      id,
      contact,
      null,
      request
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Контакт удалён навсегда',
    });
  } catch (error) {
    console.error('Failed to hard delete contact:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при удалении контакта' },
      { status: 500 }
    );
  }
}