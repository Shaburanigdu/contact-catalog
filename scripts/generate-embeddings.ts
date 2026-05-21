import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch('http://localhost:11434/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text', input: text }),
  });
  const data = await response.json();
  return data.embeddings[0];
}

async function embedContacts() {
  const contacts = await prisma.contact.findMany({
    where: { deleted_at: null },
    select: { id: true, first_name: true, last_name: true, company: true, personal_notes: true },
  });
  for (const contact of contacts) {
    const text = `${contact.first_name} ${contact.last_name || ''} ${contact.company || ''} ${contact.personal_notes || ''}`.trim();
    if (!text) continue;
    const embedding = await getEmbedding(text);
    await prisma.$executeRaw`
      UPDATE "Contact_catalog".contacts
      SET embedding = ${JSON.stringify(embedding)}::vector
      WHERE id = ${contact.id}::uuid
    `;
    console.log(`✅ Contact ${contact.id}`);
  }
}

async function embedEvents() {
  const events = await prisma.event.findMany({
    where: { deleted_at: null },
    select: { id: true, title: true, description: true },
  });
  for (const event of events) {
    const text = `${event.title} ${event.description || ''}`.trim();
    if (!text) continue;
    const embedding = await getEmbedding(text);
    await prisma.$executeRaw`
      UPDATE "Contact_catalog".events
      SET embedding = ${JSON.stringify(embedding)}::vector
      WHERE id = ${event.id}::uuid
    `;
    console.log(`✅ Event ${event.id}`);
  }
}

async function embedInteractions() {
  const interactions = await prisma.interaction.findMany({
    where: { deleted_at: null },
    select: {
      id: true,
      title: true,
      description: true,
      quick_notes: true,
      interaction_types: { select: { name: true } }
    },
  });
  for (const interaction of interactions) {
    const text = `${interaction.title || ''} ${interaction.description || ''} ${interaction.quick_notes || ''} ${interaction.interaction_types?.name || ''}`.trim();
    if (!text) continue;
    const embedding = await getEmbedding(text);
    await prisma.$executeRaw`
      UPDATE "Contact_catalog".interactions
      SET embedding = ${JSON.stringify(embedding)}::vector
      WHERE id = ${interaction.id}::uuid
    `;
    console.log(`✅ Interaction ${interaction.id}`);
  }
}

async function main() {
  console.log('Generating embeddings for contacts...');
  await embedContacts();
  console.log('Generating embeddings for events...');
  await embedEvents();
  console.log('Generating embeddings for interactions...');
  await embedInteractions();
  // При необходимости добавить embedNotes
  console.log('Done');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());