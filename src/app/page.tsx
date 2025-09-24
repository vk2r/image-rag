"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Trash2, Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function Home() {
  // States
  const [files, setFiles] = useState<FileList | null>(null);
  const [ingestStatus, setIngestStatus] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState<number>(Number(process.env.RAG_TOP_K || 10));
  const [answer, setAnswer] = useState<string>("");
  const [contexts, setContexts] = useState<any[]>([]);
  const [asking, setAsking] = useState<boolean>(false);
  const uploadingRef = useRef<boolean>(false);
  const [provider, setProvider] = useState<"openai" | "ollama">("openai");
  const [docs, setDocs] = useState<
    Array<{ name: string; docType: string; chunks: number }>
  >([]);
  const [selectedDoc, setSelectedDoc] = useState<{
    name: string;
    docType: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Effects
  useEffect(() => {
    // Cargar documentos del proveedor activo al montar y al cambiar
    loadDocs(provider);
  }, [provider]);

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

  async function handleCopyAnswer() {
    try {
      await navigator.clipboard.writeText(answer || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error("No se pudo copiar al portapapeles", e);
    }
  }

  async function handleAsk() {
    setAnswer("");
    setContexts([]);
    if (!question.trim()) return;
    setAsking(true);
    try {
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
    } catch (e: any) {
      setAnswer(`Error: ${e?.message || "No se pudo obtener respuesta"}`);
    } finally {
      setAsking(false);
    }
  }

  async function handleDeleteStore() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Esto eliminará el JSON del proveedor ${provider.toUpperCase()}. ¿Continuar?`
      )
    )
      return;
    setIngestStatus("Eliminando JSON...");
    try {
      const params = new URLSearchParams({ provider });
      const res = await fetch(`/api/docs?${params.toString()}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo eliminar");
      setIngestStatus(data.message || "JSON eliminado");
      setSelectedDoc(null);
      // Resetear sección de preguntas a estado inicial
      setQuestion("");
      setTopK(10);
      setAnswer("");
      setContexts([]);
      await loadDocs(provider);
    } catch (e: any) {
      setIngestStatus(`Error: ${e.message}`);
    }
  }
  return (
    <div className="min-h-screen w-full bg-white text-black">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">RAG</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="provider" className="text-sm opacity-80">
                Proveedor
              </Label>
              <Select
                value={provider}
                onValueChange={(v: string) =>
                  setProvider(v as "openai" | "ollama")
                }
                disabled={asking}
              >
                <SelectTrigger id="provider" className="w-[160px]">
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="ollama">Ollama</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        <section className="rounded-xl border border-zinc-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold">
            1) Subir documentos (PDF / TXT / MD)
          </h2>
          <Input
            className="w-full"
            type="file"
            multiple
            accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
            onChange={(e) => setFiles((e.target as HTMLInputElement).files)}
          />
          <Button
            onClick={handleIngest}
            disabled={uploadingRef.current || asking}
          >
            {uploadingRef.current ? "Procesando..." : "Ingerir documentos"}
          </Button>
          {ingestStatus && (
            <p className="text-sm text-zinc-600">{ingestStatus}</p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">3) Documentos almacenados</h2>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDeleteStore}
              aria-label="Eliminar JSON del proveedor"
              title="Eliminar JSON del proveedor"
            >
              <Trash2 />
            </Button>
          </div>
          <p className="text-sm text-zinc-600">
            Mostrando en JSON local para proveedor {provider.toUpperCase()}
          </p>
          {docs.length === 0 ? (
            <p className="text-sm opacity-80">No hay documentos aún.</p>
          ) : (
            <RadioGroup
              className="space-y-2"
              value={
                selectedDoc
                  ? `${selectedDoc.name}::${selectedDoc.docType}`
                  : undefined
              }
              onValueChange={(val: string) => {
                if (asking) return; // evitar cambios mientras consulta
                const [name, docType] = val.split("::");
                setSelectedDoc({ name, docType });
              }}
              aria-disabled={asking}
            >
              {docs.map((d, i) => {
                const value = `${d.name}::${d.docType}`;
                return (
                  <div
                    key={`${d.name}-${d.docType}-${i}`}
                    className="flex items-center justify-between rounded border border-zinc-200 p-2"
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem
                        id={`doc-${i}`}
                        value={value}
                        disabled={asking}
                      />
                      <Label
                        htmlFor={`doc-${i}`}
                        className={`cursor-pointer ${
                          asking ? "opacity-50 pointer-events-none" : ""
                        }`}
                      >
                        <div className="font-medium">{d.name}</div>
                        <div className="text-xs opacity-70">
                          Tipo: {d.docType}
                        </div>
                      </Label>
                    </div>
                    <div className="text-xs opacity-70">Chunks: {d.chunks}</div>
                  </div>
                );
              })}
            </RadioGroup>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold">2) Hacer una pregunta</h2>
          <div className="space-y-3">
            <Textarea
              className="min-h-[100px]"
              placeholder="Escribe tu pregunta..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={asking || docs.length === 0}
            />
            <div className="flex items-center gap-3">
              <Label className="text-sm opacity-80" htmlFor="topK">
                Top K
              </Label>
              <Input
                id="topK"
                type="number"
                min={1}
                className="w-20"
                value={topK}
                onChange={(e) =>
                  setTopK(
                    parseInt((e.target as HTMLInputElement).value || "10", 10)
                  )
                }
                disabled={asking || docs.length === 0}
              />
              <Button
                className="ml-auto"
                onClick={handleAsk}
                disabled={asking || docs.length === 0}
              >
                {asking ? "Preguntando..." : "Preguntar"}
              </Button>
            </div>
            {docs.length === 0 && (
              <p className="text-xs text-zinc-500">
                No hay documentos para este proveedor. Ingiere documentos en la
                sección 1.
              </p>
            )}
          </div>

          {answer && (
            <div className="mt-4 rounded-md border border-zinc-200 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="font-semibold">Respuesta</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAnswer}
                  disabled={!answer}
                  aria-label="Copiar respuesta en portapapeles"
                  title="Copiar respuesta en portapapeles"
                >
                  {copied ? <Check /> : <Copy />}
                  {copied ? "Copiado" : "Copiar Markdown"}
                </Button>
              </div>
              <div className="markdown-body prose max-w-none">
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
                  <div className="markdown-body prose max-w-none text-sm">
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
