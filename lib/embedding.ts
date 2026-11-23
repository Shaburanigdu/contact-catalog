// lib/embedding.ts
import { OLLAMA_URL, EMBEDDING_MODEL } from './config';

/** Requests a text embedding from the local Ollama server. */
export async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Ollama error (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  if (!data.embeddings?.[0]) throw new Error('Invalid embedding response from Ollama');
  return data.embeddings[0];
}
