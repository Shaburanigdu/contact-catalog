// app/api/contacts/[id]/relationships/route.ts
// Links between two contacts of the same user ("Anna is Peter's sister").
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/request-utils';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

const contactSummary = {
  id: true,
  first_name: true,
  last_name: true,
  avatar_url: true,
} as const;

const createSchema = z.object({
  targetContactId: z.string().uuid(),
  relationshipType: z.string().trim().min(1).max(100),
  reciprocalRelationship: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  strength: z.number().int().min(1).max(5).optional().nullable(),
});

async function findOwnContact(userId: string, contactId: string) {
  return prisma.contact.findFirst({
    where: { id: contactId, user_id: userId, deleted_at: null },
    select: { id: true },
  });
}

// GET — all relationships of a contact, in both directions
export async function GET(request: NextRequest, { params }: Params) {
  const { user } = await authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });

  const { id } = await params;
  if (!(await findOwnContact(user.id, id))) {
    return NextResponse.json({ success: false, error: 'Контакт не найден' }, { status: 404 });
  }

  const rows = await prisma.contactRelationship.findMany({
    where: {
      user_id: user.id,
      OR: [{ source_contact_id: id }, { target_contact_id: id }],
    },
    include: {
      contacts_contact_relationships_source_contact_idTocontacts: { select: { ...contactSummary, deleted_at: true } },
      contacts_contact_relationships_target_contact_idTocontacts: { select: { ...contactSummary, deleted_at: true } },
    },
    orderBy: { created_at: 'asc' },
  });

  // Present every link from the point of view of the current contact.
  const data = rows
    .map((r) => {
      const outgoing = r.source_contact_id === id;
      const other = outgoing
        ? r.contacts_contact_relationships_target_contact_idTocontacts
        : r.contacts_contact_relationships_source_contact_idTocontacts;
      if (other.deleted_at) return null;
      return {
        id: r.id,
        // "other is <type> for this contact"
        relationshipType: outgoing ? r.relationship_type : r.reciprocal_relationship || r.relationship_type,
        notes: r.notes,
        strength: r.strength,
        contact: { id: other.id, first_name: other.first_name, last_name: other.last_name, avatar_url: other.avatar_url },
      };
    })
    .filter(Boolean);

  return NextResponse.json({ success: true, data });
}

// POST — link this contact with another one
export async function POST(request: NextRequest, { params }: Params) {
  const { user } = await authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });

  const { id } = await params;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Некорректные данные' }, { status: 400 });
  }
  const input = parsed.data;

  if (input.targetContactId === id) {
    return NextResponse.json({ success: false, error: 'Нельзя связать контакт с самим собой' }, { status: 400 });
  }
  const [source, target] = await Promise.all([
    findOwnContact(user.id, id),
    findOwnContact(user.id, input.targetContactId),
  ]);
  if (!source || !target) {
    return NextResponse.json({ success: false, error: 'Контакт не найден' }, { status: 404 });
  }

  try {
    const created = await prisma.contactRelationship.create({
      data: {
        user_id: user.id,
        source_contact_id: id,
        target_contact_id: input.targetContactId,
        relationship_type: input.relationshipType,
        reciprocal_relationship: input.reciprocalRelationship || null,
        notes: input.notes || null,
        strength: input.strength ?? null,
      },
    });
    return NextResponse.json({ success: true, data: { id: created.id } }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Такая связь уже существует' }, { status: 409 });
    }
    console.error('Failed to create relationship:', error);
    return NextResponse.json({ success: false, error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE ?relationshipId=... — remove a link
export async function DELETE(request: NextRequest, { params }: Params) {
  const { user } = await authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });

  const { id } = await params;
  const relationshipId = request.nextUrl.searchParams.get('relationshipId');
  if (!relationshipId) {
    return NextResponse.json({ success: false, error: 'relationshipId обязателен' }, { status: 400 });
  }

  const { count } = await prisma.contactRelationship.deleteMany({
    where: {
      id: relationshipId,
      user_id: user.id,
      OR: [{ source_contact_id: id }, { target_contact_id: id }],
    },
  });
  if (count === 0) {
    return NextResponse.json({ success: false, error: 'Связь не найдена' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
