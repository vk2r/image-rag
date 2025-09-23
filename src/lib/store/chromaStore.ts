import { ChromaClient, CloudClient, type Collection } from 'chromadb';
import { v4 as uuidv4 } from 'uuid';
import { CHROMA_URL, CHROMA_COLLECTION, CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE } from '@/lib/config';
import type { Metadata } from '@/lib/store/vectorStore';
import type { DocInfo } from '@/lib/store/types';

export class ChromaStore {
  private client: ChromaClient | CloudClient;
  private collection?: Collection;
  private collectionName: string;

  constructor(collectionName?: string) {
    // Si hay credenciales de Chroma Cloud, usamos CloudClient; si no, cliente local por URL
    if (CHROMA_API_KEY && CHROMA_TENANT && CHROMA_DATABASE) {
      this.client = new CloudClient({ apiKey: CHROMA_API_KEY, tenant: CHROMA_TENANT, database: CHROMA_DATABASE } as any);
    } else {
      this.client = new ChromaClient({ path: CHROMA_URL });
    }
    this.collectionName = collectionName || CHROMA_COLLECTION;
  }

  private async ensureCollection(): Promise<Collection> {
    if (this.collection) return this.collection;
    const name = this.collectionName;
    try {
      this.collection = await this.client.getOrCreateCollection({ name });
      return this.collection;
    } catch (err) {
      // Fallback: try create explicitly (older clients)
      this.collection = await this.client.createCollection({ name });
      return this.collection;
    }
  }

  async add(texts: string[], embeddings: number[][], metadatas: Metadata[]): Promise<number> {
    if (texts.length !== embeddings.length || texts.length !== metadatas.length) {
      throw new Error('ChromaStore.add: array length mismatch');
    }
    const col = await this.ensureCollection();
    const ids = texts.map(() => uuidv4());
    await col.add({ ids, documents: texts, embeddings, metadatas });
    return texts.length;
  }

  async search(queryEmbedding: number[], k: number): Promise<Array<{ text: string; score: number; metadata: Metadata }>> {
    const col = await this.ensureCollection();
    const res = await col.query({
      queryEmbeddings: [queryEmbedding],
      nResults: k,
      include: ["documents", "metadatas", "distances"],
    } as any);
    const docs = (res.documents?.[0] || []) as string[];
    const metas = (res.metadatas?.[0] || []) as Metadata[];
    const dists = (res.distances?.[0] || []) as number[];
    const out = docs.map((text, i) => {
      const dist = dists[i] ?? 0;
      // Convertir distancia coseno a score tipo similitud (aprox): 1 - dist
      const score = 1 - dist;
      return { text, score, metadata: metas[i] };
    });
    return out;
  }

  async searchFiltered(
    queryEmbedding: number[],
    k: number,
    filter: { name: string; docType?: string }
  ): Promise<Array<{ text: string; score: number; metadata: Metadata }>> {
    const col = await this.ensureCollection();
    const where: any = { source: filter.name };
    if (filter.docType) where.docType = filter.docType;
    const res = await col.query({
      queryEmbeddings: [queryEmbedding],
      nResults: k,
      include: ["documents", "metadatas", "distances"],
      where,
    } as any);
    const docs = (res.documents?.[0] || []) as string[];
    const metas = (res.metadatas?.[0] || []) as Metadata[];
    const dists = (res.distances?.[0] || []) as number[];
    const out = docs.map((text, i) => {
      const dist = dists[i] ?? 0;
      const score = 1 - dist;
      return { text, score, metadata: metas[i] };
    });
    return out;
  }
 
  async listDocuments(): Promise<DocInfo[]> {
    const col = await this.ensureCollection();
    // Intentar obtener todos los documentos con metadatos (límite alto por simplicidad)
    const res: any = await (col as any).get({ include: ["metadatas", "documents"], limit: 10000 });
    const docs: string[] = (res?.documents || []) as string[];
    const metas: Metadata[] = (res?.metadatas || []) as Metadata[];
    const map = new Map<string, { name: string; docType: string; chunks: number }>();
    const n = Math.max(docs.length, metas.length);
    for (let i = 0; i < n; i++) {
      const m = metas[i] as any;
      const name = (m?.source as string) || 'documento';
      const docType = (m?.docType as string) || 'otro';
      const key = `${name}__${docType}`;
      const prev = map.get(key) || { name, docType, chunks: 0 };
      prev.chunks += 1;
      map.set(key, prev);
    }
    return Array.from(map.values());
  }
}
