import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEmbedding } from '@/lib/embedding';
import { getUserIdFromRequest } from '@/lib/auth';

// Cosine similarity below this value is treated as noise (tuned for nomic-embed-text).
const MIN_SIMILARITY = Number(process.env.AI_SEARCH_MIN_SIMILARITY ?? 0.5);

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await request.json();
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }
    const cleanQuery = query.trim();

    // ---- ТОЧНЫЙ ПОИСК (всегда работает) ----
    const exactContacts = await prisma.$queryRaw<any[]>`
      SELECT
        id, first_name, last_name, 'contact' as type, 1.0 as similarity
      FROM "Contact_catalog".contacts
      WHERE deleted_at IS NULL AND user_id = ${userId}::uuid
        AND (first_name ILIKE ${`%${cleanQuery}%`} OR last_name ILIKE ${`%${cleanQuery}%`}
             OR nickname ILIKE ${`%${cleanQuery}%`}
             OR CONCAT(first_name, ' ', COALESCE(last_name, '')) ILIKE ${`%${cleanQuery}%`})
    `;

    const exactEvents = await prisma.$queryRaw<any[]>`
      SELECT id, title, 'event' as type, 1.0 as similarity
      FROM "Contact_catalog".events
      WHERE deleted_at IS NULL AND user_id = ${userId}::uuid
        AND title ILIKE ${`%${cleanQuery}%`}
    `;

    const exactInteractions = await prisma.$queryRaw<any[]>`
      SELECT
        i.id, i.title, i.description, i.contact_id, 'interaction' as type, 1.0 as similarity,
        c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name
      FROM "Contact_catalog".interactions i
      LEFT JOIN "Contact_catalog".contacts c ON i.contact_id = c.id
      WHERE i.deleted_at IS NULL AND i.user_id = ${userId}::uuid
        AND (i.title ILIKE ${`%${cleanQuery}%`} OR i.description ILIKE ${`%${cleanQuery}%`}
             OR i.quick_notes ILIKE ${`%${cleanQuery}%`})
      LIMIT 10
    `;

    // ---- ВЕКТОРНЫЙ ПОИСК (только если получится) ----
    let vectorContacts: any[] = [];
    let vectorEvents: any[] = [];
    let vectorInteractions: any[] = [];

    try {
      const embedding = await getEmbedding(cleanQuery);

      if (exactContacts.length < 10) {
        vectorContacts = await prisma.$queryRaw<any[]>`
          SELECT
            id, first_name, last_name, 'contact' as type,
            1 - (embedding <=> ${JSON.stringify(embedding)}::vector) as similarity
          FROM "Contact_catalog".contacts
          WHERE deleted_at IS NULL AND user_id = ${userId}::uuid AND embedding IS NOT NULL
          ORDER BY similarity DESC
          LIMIT ${10 - exactContacts.length}
        `;
      }

      if (exactEvents.length < 10) {
        vectorEvents = await prisma.$queryRaw<any[]>`
          SELECT id, title, 'event' as type,
            1 - (embedding <=> ${JSON.stringify(embedding)}::vector) as similarity
          FROM "Contact_catalog".events
          WHERE deleted_at IS NULL AND user_id = ${userId}::uuid AND embedding IS NOT NULL
          ORDER BY similarity DESC
          LIMIT ${10 - exactEvents.length}
        `;
      }

      if (exactInteractions.length < 10) {
        vectorInteractions = await prisma.$queryRaw<any[]>`
          SELECT
            i.id, i.title, i.description, i.contact_id, 'interaction' as type,
            1 - (i.embedding <=> ${JSON.stringify(embedding)}::vector) as similarity,
            c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name
          FROM "Contact_catalog".interactions i
          LEFT JOIN "Contact_catalog".contacts c ON i.contact_id = c.id
          WHERE i.deleted_at IS NULL AND i.user_id = ${userId}::uuid AND i.embedding IS NOT NULL
          ORDER BY similarity DESC
          LIMIT ${10 - exactInteractions.length}
        `;
      }
    } catch (embedError) {
      // Если эмбеддинг не получен (например, Ollama недоступен) – просто логируем и пропускаем векторный поиск
      console.warn('Embedding failed, using only exact matches:', embedError);
    }

    // ---- Объединение результатов ----
    const allResults = [
      ...exactContacts,
      ...exactEvents,
      ...exactInteractions,
      ...vectorContacts,
      ...vectorEvents,
      ...vectorInteractions,
    ];

    const resultsMap = new Map<string, any>();
    for (const item of allResults) {
      item.similarity = Number(item.similarity);
      if (item.similarity < MIN_SIMILARITY) continue;
      const key = `${item.type}_${item.id}`;
      if (!resultsMap.has(key)) resultsMap.set(key, item);
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