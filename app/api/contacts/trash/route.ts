import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, ApiResponse } from '@/lib/request-utils';
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || undefined;

    const where: any = {
      user_id: user.id,
      deleted_at: { not: null },
    };

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { deleted_at: 'desc' },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          city: true,
          company: true,
          avatar_url: true,
          relationship_type: true,
          deleted_at: true,
        },
      }),
      prisma.contact.count({ where }),
    ]);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        contacts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Failed to fetch trashed contacts:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при загрузке корзины' },
      { status: 500 }
    );
  }
}