import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

import { RAG_PROVIDER, type ProviderName } from '@/lib/config';
import { VectorStore } from '@/lib/store/vectorStore';
import fs from 'node:fs';
import fsp from 'node:fs/promises';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const providerRaw = (searchParams.get('provider') || '').toLowerCase();
    const activeProvider = (providerRaw as ProviderName) || RAG_PROVIDER;
    const fileName = `data/vector_store-${activeProvider}.json`;
    const jStore = new VectorStore(fileName);
    await jStore.load();
    const docs = jStore.listDocuments();
    return NextResponse.json({ docs, provider: activeProvider, db: 'json', ref: fileName });
  } catch (err: any) {
    console.error('/api/docs error', err);
    return NextResponse.json({ error: err?.message || 'Docs error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const providerRaw = (searchParams.get('provider') || '').toLowerCase();
    const activeProvider = (providerRaw as ProviderName) || RAG_PROVIDER;
    const fileName = `data/vector_store-${activeProvider}.json`;

    if (fs.existsSync(fileName)) {
      await fsp.unlink(fileName);
      return NextResponse.json({ ok: true, deleted: true, provider: activeProvider, ref: fileName, message: 'Archivo eliminado' });
    } else {
      return NextResponse.json({ ok: true, deleted: false, provider: activeProvider, ref: fileName, message: 'El archivo no existe, nada que borrar' });
    }
  } catch (err: any) {
    console.error('/api/docs DELETE error', err);
    return NextResponse.json({ error: err?.message || 'Delete error' }, { status: 500 });
  }
}
