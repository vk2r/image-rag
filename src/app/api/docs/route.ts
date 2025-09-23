import { NextRequest } from 'next/server';
export const runtime = 'nodejs';

import { RAG_PROVIDER, type ProviderName } from '@/lib/config';
import { VectorStore } from '@/lib/store/vectorStore';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const providerRaw = (searchParams.get('provider') || '').toLowerCase();
    const activeProvider = (providerRaw as ProviderName) || RAG_PROVIDER;
    const fileName = `data/vector_store-${activeProvider}.json`;
    const jStore = new VectorStore(fileName);
    await jStore.load();
    const docs = jStore.listDocuments();
    return Response.json({ docs, provider: activeProvider, db: 'json', ref: fileName });
  } catch (err: any) {
    console.error('/api/docs error', err);
    return Response.json({ error: err?.message || 'Docs error' }, { status: 500 });
  }
}
