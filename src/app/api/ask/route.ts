import { NextRequest } from "next/server";
export const runtime = "nodejs";

import { getEmbeddingsProvider, getChatProvider } from "@/lib/providers";
import { RAG_PROVIDER, RAG_TOP_K, type ProviderName } from "@/lib/config";
import { VectorStore } from "@/lib/store/vectorStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question: string = body?.question || "";
    const k: number = Number.isFinite(body?.topK) ? body.topK : RAG_TOP_K;
    const providerRaw: string = body?.provider || "";
    const provider = (providerRaw.toLowerCase() as ProviderName) || undefined;
    const activeProvider = provider || RAG_PROVIDER;
    const doc = body?.doc as { name?: string; docType?: string } | undefined;

    if (!question)
      return Response.json(
        { error: 'Falta el campo "question"' },
        { status: 400 }
      );

    const embedder = getEmbeddingsProvider(activeProvider);
    const [qEmbedding] = await embedder.embed([question]);

    let hits: Array<{ text: string; score: number; metadata: any }> = [];
    const fileName = `data/vector_store-${activeProvider}.json`;
    const jStore = new VectorStore(fileName);
    await jStore.load();
    if (doc?.name) {
      hits = jStore.searchFiltered(qEmbedding, k, {
        name: doc.name,
        docType: doc.docType,
      });
    } else {
      hits = jStore.search(qEmbedding, k);
    }
    const collectionName = fileName;

    const context = hits
      .map(
        (h, i) =>
          `[[${i + 1} | ${h.metadata.source} #${h.metadata.chunkIndex}]]\n${
            h.text
          }`
      )
      .join("\n\n---\n\n");

    const messages = [
      {
        role: "system",
        content:
          "Eres un asistente útil. Responde en español. Limítate al contexto proporcionado; si no aparece, responde que no está en los documentos.",
      },
      {
        role: "user",
        content: `Pregunta: ${question}\n\nContexto:\n${context}`,
      },
    ] as const;

    const chat = getChatProvider(activeProvider);
    const answer = await chat.complete(messages as any);

    return Response.json({
      answer,
      contexts: hits,
      provider: activeProvider,
      db: "json",
      ref: collectionName,
    });
  } catch (err: any) {
    console.error("/api/ask error", err);
    return Response.json(
      { error: err?.message || "Ask error" },
      { status: 500 }
    );
  }
}
