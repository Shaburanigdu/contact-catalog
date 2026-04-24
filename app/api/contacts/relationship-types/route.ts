import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/request-utils';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { user, error } = await authenticateRequest(request);
  if (error || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const result = await prisma.contact.groupBy({
    by: ['relationship_type'],
    where: {
      user_id: user.id,
      deleted_at: null,
      relationship_type: { not: null },
    },
    orderBy: { relationship_type: 'asc' },
  });

  const types = result.map(r => r.relationship_type).filter(Boolean);
  return NextResponse.json({ success: true, data: types });
}