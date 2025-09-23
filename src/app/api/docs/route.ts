import { NextRequest } from 'next/server';
export const runtime = 'nodejs';

import { CHROMA_COLLECTION, RAG_PROVIDER, type ProviderName } from '@/lib/config';
import { VectorStore } from '@/lib/store/vectorStore';
import { ChromaStore } from '@/lib/store/chromaStore';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const providerRaw = (searchParams.get('provider') || '').toLowerCase();
    const activeProvider = (providerRaw as ProviderName) || RAG_PROVIDER;
    const dbRaw = (searchParams.get('db') || '').toLowerCase();
    const db: 'json' | 'chroma' = dbRaw === 'json' ? 'json' : 'chroma';

    if (db === 'json') {
      const fileName = `data/vector_store-${activeProvider}.json`;
      const jStore = new VectorStore(fileName);
      await jStore.load();
      const docs = jStore.listDocuments();
      return Response.json({ docs, provider: activeProvider, db, ref: fileName });
    } else {
      const collectionName = `${CHROMA_COLLECTION}-${activeProvider}`;
      const cStore = new ChromaStore(collectionName);
      const docs = await cStore.listDocuments();
      return Response.json({ docs, provider: activeProvider, db, ref: collectionName });
    }
  } catch (err: any) {
    console.error('/api/docs error', err);
    return Response.json({ error: err?.message || 'Docs error' }, { status: 500 });
  }
}
