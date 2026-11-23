import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEmbedding } from '@/lib/embedding';
import { getUserIdFromRequest } from '@/lib/auth';
import { rankResults } from '@/lib/search-ranking';

// nomic-embed-text scores almost any Russian text at 0.6–0.7, so an absolute
// threshold alone lets noise through; semantic hits must also be close to the best one.
const MIN_SIMILARITY = Number(process.env.AI_SEARCH_MIN_SIMILARITY ?? 0.5);
const RELATIVE_GAP = Number(process.env.AI_SEARCH_RELATIVE_GAP ?? 0.05);

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

    const exactNotes = await prisma.$queryRaw<any[]>`
      SELECT
        n.id, n.title, n.content, n.contact_id, 'note' as type, 1.0 as similarity,
        c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name
      FROM "Contact_catalog".notes n
      LEFT JOIN "Contact_catalog".contacts c ON n.contact_id = c.id
      WHERE n.deleted_at IS NULL AND n.user_id = ${userId}::uuid
        AND (n.title ILIKE ${`%${cleanQuery}%`} OR n.content ILIKE ${`%${cleanQuery}%`})
      LIMIT 10
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
    let vectorNotes: any[] = [];

    try {
      const embedding = await getEmbedding(cleanQuery);
      const vec = JSON.stringify(embedding);

      if (exactContacts.length < 10) {
        vectorContacts = await prisma.$queryRaw<any[]>`
          SELECT
            id, first_name, last_name, 'contact' as type,
            1 - (embedding <=> ${vec}::vector) as similarity
          FROM "Contact_catalog".contacts
          WHERE deleted_at IS NULL AND user_id = ${userId}::uuid AND embedding IS NOT NULL
          ORDER BY embedding <=> ${vec}::vector
          LIMIT ${10 - exactContacts.length}
        `;
      }

      if (exactEvents.length < 10) {
        vectorEvents = await prisma.$queryRaw<any[]>`
          SELECT id, title, 'event' as type,
            1 - (embedding <=> ${vec}::vector) as similarity
          FROM "Contact_catalog".events
          WHERE deleted_at IS NULL AND user_id = ${userId}::uuid AND embedding IS NOT NULL
          ORDER BY embedding <=> ${vec}::vector
          LIMIT ${10 - exactEvents.length}
        `;
      }

      if (exactInteractions.length < 10) {
        vectorInteractions = await prisma.$queryRaw<any[]>`
          SELECT
            i.id, i.title, i.description, i.contact_id, 'interaction' as type,
            1 - (i.embedding <=> ${vec}::vector) as similarity,
            c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name
          FROM "Contact_catalog".interactions i
          LEFT JOIN "Contact_catalog".contacts c ON i.contact_id = c.id
          WHERE i.deleted_at IS NULL AND i.user_id = ${userId}::uuid AND i.embedding IS NOT NULL
          ORDER BY i.embedding <=> ${vec}::vector
          LIMIT ${10 - exactInteractions.length}
        `;
      }

      if (exactNotes.length < 10) {
        vectorNotes = await prisma.$queryRaw<any[]>`
          SELECT
            n.id, n.title, n.content, n.contact_id, 'note' as type,
            1 - (n.embedding <=> ${vec}::vector) as similarity,
            c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name
          FROM "Contact_catalog".notes n
          LEFT JOIN "Contact_catalog".contacts c ON n.contact_id = c.id
          WHERE n.deleted_at IS NULL AND n.user_id = ${userId}::uuid AND n.embedding IS NOT NULL
          ORDER BY n.embedding <=> ${vec}::vector
          LIMIT ${10 - exactNotes.length}
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
      ...exactNotes,
      ...vectorContacts,
      ...vectorEvents,
      ...vectorInteractions,
      ...vectorNotes,
    ];

    for (const item of allResults) item.similarity = Number(item.similarity);
    const results = rankResults(allResults, MIN_SIMILARITY, RELATIVE_GAP);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('AI search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}