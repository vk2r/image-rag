import { RAG_CHUNK_OVERLAP, RAG_CHUNK_SIZE } from '@/lib/config';

export type Chunk = { text: string; index: number };

export function chunkText(
  text: string,
  size: number = RAG_CHUNK_SIZE,
  overlap: number = RAG_CHUNK_OVERLAP
): Chunk[] {
  const chunks: Chunk[] = [];
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return chunks;
  let start = 0;
  let idx = 0;
  while (start < clean.length) {
    const end = Math.min(start + size, clean.length);
    const slice = clean.slice(start, end);
    chunks.push({ text: slice, index: idx++ });
    if (end === clean.length) break;
    start = end - overlap;
    if (start < 0) start = 0;
  }
  return chunks;
}
