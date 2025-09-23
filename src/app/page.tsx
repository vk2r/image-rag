"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Home() {
  // States
  const [files, setFiles] = useState<FileList | null>(null);
  const [ingestStatus, setIngestStatus] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState<number>(5);
  const [answer, setAnswer] = useState<string>("");
  const [contexts, setContexts] = useState<any[]>([]);
  const uploadingRef = useRef<boolean>(false);
  const [provider, setProvider] = useState<"openai" | "ollama">("openai");
  const [docs, setDocs] = useState<
    Array<{ name: string; docType: string; chunks: number }>
  >([]);
  const [selectedDoc, setSelectedDoc] = useState<{
    name: string;
    docType: string;
  } | null>(null);

  // Methods
  async function loadDocs(currentProvider = provider) {
    const params = new URLSearchParams({
      provider: currentProvider,
    });
    const res = await fetch(`/api/docs?${params.toString()}`, {
      method: "GET",
    });
    const data = await res.json();
    if (res.ok) setDocs(data.docs || []);
    else setDocs([]);
  }

  async function handleIngest() {
    if (!files || files.length === 0) {
      setIngestStatus("Selecciona uno o más archivos");
      return;
    }
    setIngestStatus("Subiendo e indexando...");
    uploadingRef.current = true;
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append("files", f));
      form.append("provider", provider);
      const res = await fetch("/api/ingest", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error de ingestión");
      setIngestStatus(
        `Procesados ${data.filesProcessed} archivos, ${data.chunks} chunks, almacenados ${data.stored}`
      );
      // refrescar listado
      loadDocs(provider);
    } catch (e: any) {
      setIngestStatus(`Error: ${e.message}`);
    } finally {
      uploadingRef.current = false;
    }
  }

  async function handleAsk() {
    setAnswer("");
    setContexts([]);
    if (!question.trim()) return;
    const body: any = { question, topK, provider };
    if (selectedDoc) body.doc = selectedDoc;
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setAnswer(`Error: ${data?.error || "No se pudo obtener respuesta"}`);
      return;
    }
    setAnswer(data.answer || "");
    setContexts(data.contexts || []);
  }

  // Effects
  useEffect(() => {
    setSelectedDoc(null);
    loadDocs();
  }, [provider]);

  return (
    <div className="min-h-screen w-full bg-white text-black">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">RAG</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="provider" className="text-sm opacity-80">
                Proveedor
              </label>
              <select
                id="provider"
                className="rounded-md border border-zinc-300 bg-white p-2 text-sm"
                value={provider}
                onChange={(e) =>
                  setProvider(e.target.value as "openai" | "ollama")
                }
              >
                <option value="openai">OpenAI</option>
                <option value="ollama">Ollama</option>
              </select>
            </div>
          </div>
        </header>

        <section className="rounded-xl border border-zinc-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold">
            1) Subir documentos (PDF / TXT / MD)
          </h2>
          <input
            className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-zinc-200 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-zinc-900 hover:file:bg-zinc-300"
            type="file"
            multiple
            accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
            onChange={(e) => setFiles(e.target.files)}
          />
          <button
            onClick={handleIngest}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={uploadingRef.current}
          >
            {uploadingRef.current ? "Procesando..." : "Ingerir documentos"}
          </button>
          {ingestStatus && (
            <p className="text-sm text-zinc-600">{ingestStatus}</p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold">3) Documentos almacenados</h2>
          <p className="text-sm text-zinc-600">
            Mostrando en JSON local para proveedor {provider.toUpperCase()}
          </p>
          {docs.length === 0 ? (
            <p className="text-sm opacity-80">No hay documentos aún.</p>
          ) : (
            <ul className="space-y-2">
              {docs.map((d, i) => {
                const checked =
                  selectedDoc?.name === d.name &&
                  selectedDoc?.docType === d.docType;
                return (
                  <li
                    key={`${d.name}-${d.docType}-${i}`}
                    className="flex items-center justify-between rounded border border-zinc-200 p-2"
                  >
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="doc-select"
                        checked={checked}
                        onChange={() =>
                          setSelectedDoc({ name: d.name, docType: d.docType })
                        }
                      />
                      <div>
                        <div className="font-medium">{d.name}</div>
                        <div className="text-xs opacity-70">
                          Tipo: {d.docType}
                        </div>
                      </div>
                    </label>
                    <div className="text-xs opacity-70">Chunks: {d.chunks}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold">2) Hacer una pregunta</h2>
          <div className="space-y-3">
            <textarea
              className="w-full min-h-[100px] rounded-md border border-zinc-300 bg-transparent p-3 outline-none"
              placeholder="Escribe tu pregunta..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <label className="text-sm opacity-80" htmlFor="topK">
                Top K
              </label>
              <input
                id="topK"
                type="number"
                min={1}
                max={20}
                className="w-20 rounded-md border border-zinc-300 bg-transparent p-2"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value || "5", 10))}
              />
              <button
                onClick={handleAsk}
                className="ml-auto inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
              >
                Preguntar
              </button>
            </div>
          </div>

          {answer && (
            <div className="mt-4 rounded-md border border-zinc-200 p-4">
              <h3 className="font-semibold mb-2">Respuesta</h3>
              <div className="prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {answer}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {contexts?.length > 0 && (
            <div className="mt-4 rounded-md border border-zinc-200 p-4 space-y-3">
              <h3 className="font-semibold">Contexto utilizado</h3>
              {contexts.map((c: any, i: number) => (
                <div key={i} className="rounded border border-zinc-200 p-3">
                  <div className="text-xs opacity-70 mb-1">
                    {c?.metadata?.source} • chunk #{c?.metadata?.chunkIndex} •
                    score {c?.score?.toFixed?.(3)}
                  </div>
                  <div className="prose max-w-none text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {c.text}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="text-center text-xs opacity-70">MVP RAG</footer>
      </div>
    </div>
  );
}
