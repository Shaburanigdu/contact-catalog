// app/api/search/ai/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getEmbedding } from '@/lib/embedding';
import { getUserIdFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // 1. Получаем ID текущего пользователя
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await request.json();
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }
    const cleanQuery = query.trim();

    // 2. Точный поиск по контактам (только текущего пользователя)
    const exactContacts = await prisma.$queryRaw<any[]>`
      SELECT
        id,
        first_name,
        last_name,
        'contact' as type,
        1.0 as similarity
      FROM "Contact_catalog".contacts
      WHERE deleted_at IS NULL
        AND user_id = ${userId}::uuid
        AND (
          first_name ILIKE ${`%${cleanQuery}%`} OR
          last_name ILIKE ${`%${cleanQuery}%`} OR
          nickname ILIKE ${`%${cleanQuery}%`} OR
          CONCAT(first_name, ' ', COALESCE(last_name, '')) ILIKE ${`%${cleanQuery}%`}
        )
    `;

    // 3. Точный поиск по событиям (только текущего пользователя)
    const exactEvents = await prisma.$queryRaw<any[]>`
      SELECT
        id,
        title,
        'event' as type,
        1.0 as similarity
      FROM "Contact_catalog".events
      WHERE deleted_at IS NULL
        AND user_id = ${userId}::uuid
        AND title ILIKE ${`%${cleanQuery}%`}
    `;

    // 4. Векторный поиск по контактам (добиваем до 10)
    let vectorContacts: any[] = [];
    if (exactContacts.length < 10) {
      const embedding = await getEmbedding(cleanQuery);
      vectorContacts = await prisma.$queryRaw<any[]>`
        SELECT
          id,
          first_name,
          last_name,
          'contact' as type,
          1 - (embedding <=> ${JSON.stringify(embedding)}::vector) as similarity
        FROM "Contact_catalog".contacts
        WHERE deleted_at IS NULL
          AND user_id = ${userId}::uuid
          AND embedding IS NOT NULL
        ORDER BY similarity DESC
        LIMIT ${10 - exactContacts.length}
      `;
    }

    // 5. Векторный поиск по событиям (добиваем до 10)
    let vectorEvents: any[] = [];
    if (exactEvents.length < 10) {
      const eventEmbedding = await getEmbedding(cleanQuery);
      vectorEvents = await prisma.$queryRaw<any[]>`
        SELECT
          id,
          title,
          'event' as type,
          1 - (embedding <=> ${JSON.stringify(eventEmbedding)}::vector) as similarity
        FROM "Contact_catalog".events
        WHERE deleted_at IS NULL
          AND user_id = ${userId}::uuid
          AND embedding IS NOT NULL
        ORDER BY similarity DESC
        LIMIT ${10 - exactEvents.length}
      `;
    }

    // 6. Объединение и устранение дубликатов
    const allResults = [...exactContacts, ...exactEvents, ...vectorContacts, ...vectorEvents];
    const resultsMap = new Map<string, any>();
    for (const item of allResults) {
      const key = `${item.type}_${item.id}`;
      if (!resultsMap.has(key)) {
        resultsMap.set(key, item);
      }
    }

    const results = Array.from(resultsMap.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('AI search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}