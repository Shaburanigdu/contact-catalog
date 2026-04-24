// lib/embedding.ts
export async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch('http://localhost:11434/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text', input: text }),
  });
  if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
  const data = await response.json();
  if (!data.embeddings?.[0]) throw new Error('Invalid embedding');
  return data.embeddings[0];
}