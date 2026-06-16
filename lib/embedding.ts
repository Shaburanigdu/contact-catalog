// lib/embedding.ts
export async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch('http://localhost:11434/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text', input: text }),
  });

  // Логируем статус и тело ответа (для диагностики в консоли сервера)
  const responseText = await response.text();
  console.log('Ollama status:', response.status);
  console.log('Ollama body:', responseText);

  if (!response.ok) {
    throw new Error(`Ollama error (${response.status}): ${responseText}`);
  }

  const data = JSON.parse(responseText);
  if (!data.embeddings?.[0]) throw new Error('Invalid embedding');
  return data.embeddings[0];
}