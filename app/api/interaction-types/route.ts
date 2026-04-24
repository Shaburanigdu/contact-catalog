import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/request-utils';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { user, error } = await authenticateRequest(request);
  if (error || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const types = await prisma.interactionType.findMany({
    where: {
      OR: [
        { user_id: user.id },
        { is_system: true },
      ],
    },
    orderBy: [{ is_system: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json({ success: true, data: types });
}

export async function POST(request: NextRequest) {
  const { user, error } = await authenticateRequest(request);
  if (error || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, icon, color } = body;

  if (!name || name.trim() === '') {
    return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
  }

  const existing = await prisma.interactionType.findFirst({
    where: { user_id: user.id, name: { equals: name, mode: 'insensitive' } },
  });
  if (existing) {
    return NextResponse.json({ success: false, error: 'Type already exists' }, { status: 409 });
  }

  const newType = await prisma.interactionType.create({
    data: {
      user_id: user.id,
      name: name.trim(),
      icon: icon || null,
      color: color || '#3B82F6',
      is_system: false,
    },
  });

  return NextResponse.json({ success: true, data: newType }, { status: 201 });
}