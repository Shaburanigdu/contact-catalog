import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/request-utils';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await authenticateRequest(request);
  if (error || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id: contactId } = await params;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const page = parseInt(url.searchParams.get('page') || '1');
  const skip = (page - 1) * limit;

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, user_id: user.id, deleted_at: null },
  });
  if (!contact) {
    return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
  }

  const [interactions, total] = await Promise.all([
    prisma.interaction.findMany({
      where: { contact_id: contactId, deleted_at: null },
      orderBy: { started_at: 'desc' },
      skip,
      take: limit,
      include: {
        interaction_types: true,
      },
    }),
    prisma.interaction.count({ where: { contact_id: contactId, deleted_at: null } }),
  ]);

  return NextResponse.json({
    success: true,
    data: { interactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await authenticateRequest(request);
  if (error || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id: contactId } = await params;
  const body = await request.json();
  const {
    title,
    description,
    started_at,
    interaction_type_id,
    duration_minutes,
    mood_before,
    mood_after,
    importance,
    relationship_level_delta = 0,
    trust_level_delta = 0,
  } = body;

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, user_id: user.id, deleted_at: null },
  });
  if (!contact) {
    return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
  }

  const moodBeforeVal = mood_before ? Math.min(5, Math.max(1, parseInt(mood_before))) : null;
  const moodAfterVal = mood_after ? Math.min(5, Math.max(1, parseInt(mood_after))) : null;
  const importanceVal = importance ? Math.min(3, Math.max(1, parseInt(importance))) : null;

  let newRelationshipLevel = contact.relationship_level || 5;
  let newTrustLevel = contact.trust_level || 5;
  if (relationship_level_delta) {
    newRelationshipLevel = Math.min(10, Math.max(1, newRelationshipLevel + relationship_level_delta));
  }
  if (trust_level_delta) {
    newTrustLevel = Math.min(10, Math.max(1, newTrustLevel + trust_level_delta));
  }

  const interaction = await prisma.interaction.create({
    data: {
      user_id: user.id,
      contact_id: contactId,
      title: title || 'Взаимодействие',
      description: description || '',
      started_at: started_at ? new Date(started_at) : new Date(),
      interaction_type_id: interaction_type_id || null,
      duration_minutes: duration_minutes ? parseInt(duration_minutes) : null,
      mood_before: moodBeforeVal,
      mood_after: moodAfterVal,
      importance: importanceVal,
    },
  });

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      last_interaction_date: new Date(),
      total_interactions: { increment: 1 },
      relationship_level: newRelationshipLevel,
      trust_level: newTrustLevel,
    },
  });

  // Возвращаем созданное взаимодействие с типом
  const created = await prisma.interaction.findUnique({
    where: { id: interaction.id },
    include: { interaction_types: true },
  });

  return NextResponse.json({ success: true, data: created });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await authenticateRequest(request);
  if (error || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id: contactId } = await params;
  const url = new URL(request.url);
  const interactionId = url.searchParams.get('interactionId');
  if (!interactionId) {
    return NextResponse.json({ success: false, error: 'interactionId required' }, { status: 400 });
  }

  const interaction = await prisma.interaction.findFirst({
    where: { id: interactionId, contact_id: contactId, user_id: user.id, deleted_at: null },
  });
  if (!interaction) {
    return NextResponse.json({ success: false, error: 'Interaction not found' }, { status: 404 });
  }

  await prisma.interaction.update({
    where: { id: interactionId },
    data: { deleted_at: new Date() },
  });

  const remainingInteractions = await prisma.interaction.findMany({
    where: { contact_id: contactId, deleted_at: null },
    orderBy: { started_at: 'desc' },
    select: { started_at: true },
  });
  const newTotal = remainingInteractions.length;
  const newLastDate = remainingInteractions[0]?.started_at || null;

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      total_interactions: newTotal,
      last_interaction_date: newLastDate,
    },
  });

  return NextResponse.json({ success: true });
}