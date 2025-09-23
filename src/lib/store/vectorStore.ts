import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import type { DocInfo } from '@/lib/store/types';

export type Metadata = { source: string; chunkIndex: number; docType?: string };
export type StoredDoc = { id: string; text: string; embedding: number[]; metadata: Metadata };

export class VectorStore {
  private filePath: string;
  private documents: StoredDoc[] = [];

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), 'data', 'vector_store.json');
  }

  async load(): Promise<void> {
    try {
      if (!fs.existsSync(this.filePath)) {
        await this.save();
        return;
      }
      const raw = await fsp.readFile(this.filePath, 'utf-8');
      const json = JSON.parse(raw || '{"documents":[]}');
      this.documents = Array.isArray(json.documents) ? json.documents : [];
    } catch (err) {
      console.error('VectorStore.load error', err);
      this.documents = [];
    }
  }

  async save(): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fsp.mkdir(dir, { recursive: true });
    const payload = JSON.stringify({ documents: this.documents }, null, 2);
    await fsp.writeFile(this.filePath, payload, 'utf-8');
  }

  async add(texts: string[], embeddings: number[][], metadatas: Metadata[]): Promise<number> {
    if (texts.length !== embeddings.length || texts.length !== metadatas.length) {
      throw new Error('VectorStore.add: array length mismatch');
    }
    const toAdd: StoredDoc[] = texts.map((t, i) => ({ id: uuidv4(), text: t, embedding: embeddings[i], metadata: metadatas[i] }));
    this.documents.push(...toAdd);
    await this.save();
    return toAdd.length;
  }

  private static cosineSim(a: number[], b: number[]): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      const av = a[i];
      const bv = b[i] || 0;
      dot += av * bv;
      na += av * av;
      nb += bv * bv;
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
    return dot / denom;
  }

  search(queryEmbedding: number[], k: number): Array<{ text: string; score: number; metadata: Metadata }>{
    const scored = this.documents.map((d) => ({ text: d.text, metadata: d.metadata, score: VectorStore.cosineSim(queryEmbedding, d.embedding) }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }

  listDocuments(): DocInfo[] {
    const map = new Map<string, { name: string; docType: string; chunks: number }>();
    for (const d of this.documents) {
      const name = d.metadata?.source || 'documento';
      const docType = d.metadata?.docType || 'otro';
      const key = `${name}__${docType}`;
      const prev = map.get(key) || { name, docType, chunks: 0 };
      prev.chunks += 1;
      map.set(key, prev);
    }
    return Array.from(map.values());
  }

  searchFiltered(
    queryEmbedding: number[],
    k: number,
    filter: { name: string; docType?: string }
  ): Array<{ text: string; score: number; metadata: Metadata }>{
    const { name, docType } = filter;
    const filtered = this.documents.filter((d) => {
      const sameName = (d.metadata?.source || '').toLowerCase() === (name || '').toLowerCase();
      const sameType = docType ? (d.metadata?.docType || '').toLowerCase() === docType.toLowerCase() : true;
      return sameName && sameType;
    });
    const scored = filtered.map((d) => ({ text: d.text, metadata: d.metadata, score: VectorStore.cosineSim(queryEmbedding, d.embedding) }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }
}
