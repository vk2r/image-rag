import { NextRequest } from 'next/server';
export const runtime = 'nodejs';

import { chunkText } from '@/lib/ingest/chunker';
import { fileToText } from '@/lib/ingest/extractors';
import { getEmbeddingsProvider } from '@/lib/providers';
import type { Metadata } from '@/lib/store/vectorStore';
import { VectorStore } from '@/lib/store/vectorStore';
import { ChromaStore } from '@/lib/store/chromaStore';
import { CHROMA_COLLECTION, RAG_PROVIDER, type ProviderName } from '@/lib/config';
import { inferDocType } from '@/lib/store/types';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form.getAll('files').filter(Boolean) as File[];
    const fileSingle = form.get('file');
    if (fileSingle && files.length === 0 && fileSingle instanceof File) files.push(fileSingle);

    if (!files.length) {
      return Response.json({ error: 'No files provided. Use field "files" or "file".' }, { status: 400 });
    }

    const providerRaw = (form.get('provider') as string) || '';
    const provider = (providerRaw.toLowerCase() as ProviderName) || undefined;
    const activeProvider = provider || RAG_PROVIDER;
    const dbRaw = ((form.get('db') as string) || '').toLowerCase();
    const db: 'json' | 'chroma' = dbRaw === 'json' ? 'json' : 'chroma';

    const allChunks: string[] = [];
    const metas: Metadata[] = [];
    const fileSummaries: Array<{ name: string; docType: string; chunks: number; chars: number }> = [];

    for (const file of files) {
      const text = await fileToText(file);
      const chunks = chunkText(text);
      const name = (file as any).name || 'document';
      const docType = inferDocType(name);
      chunks.forEach((c) => {
        allChunks.push(c.text);
        metas.push({ source: name, chunkIndex: c.index, docType });
      });
      fileSummaries.push({ name, docType, chunks: chunks.length, chars: (text || '').length });
    }

    if (allChunks.length === 0) {
      return Response.json({
        filesProcessed: files.length,
        chunks: 0,
        stored: 0,
        provider: activeProvider,
        db,
        ref: null,
        files: fileSummaries,
        message: 'No se extrajo texto. Verifica que los archivos no sean PDFs escaneados o vacíos.'
      });
    }

    const embedder = getEmbeddingsProvider(activeProvider);
    const embeddings = await embedder.embed(allChunks);

    let storedRef: string;
    let added: number;
    if (db === 'json') {
      const fileName = `data/vector_store-${activeProvider}.json`;
      const store = new VectorStore(fileName);
      await store.load();
      added = await store.add(allChunks, embeddings, metas);
      storedRef = fileName;
    } else {
      const collectionName = `${CHROMA_COLLECTION}-${activeProvider}`;
      const store = new ChromaStore(collectionName);
      added = await store.add(allChunks, embeddings, metas);
      storedRef = collectionName;
    }

    return Response.json({ filesProcessed: files.length, chunks: allChunks.length, stored: added, provider: activeProvider, db, ref: storedRef, files: fileSummaries });
  } catch (err: any) {
    console.error('/api/ingest error', err);
    return Response.json({ error: err?.message || 'Ingest error' }, { status: 500 });
  }
}
