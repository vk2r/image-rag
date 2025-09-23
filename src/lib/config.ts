export type ProviderName = "openai" | "ollama";

export const RAG_PROVIDER: ProviderName =
  (process.env.RAG_PROVIDER as ProviderName) || "openai";

// OpenAI
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
export const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
export const OPENAI_EMBED_MODEL =
  process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small";

// Ollama
export const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL || "http://localhost:11434";
export const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || "llama3.1:8b";
export const OLLAMA_EMBED_MODEL =
  process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text:latest";

// RAG params
const intFromEnv = (val: string | undefined, def: number) => {
  const n = Number.parseInt(val || "", 10);
  return Number.isFinite(n) ? n : def;
};

export const RAG_CHUNK_SIZE = intFromEnv(process.env.RAG_CHUNK_SIZE, 1000);
export const RAG_CHUNK_OVERLAP = intFromEnv(process.env.RAG_CHUNK_OVERLAP, 150);
export const RAG_TOP_K = intFromEnv(process.env.RAG_TOP_K, 5);

// ChromaDB
export const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
export const CHROMA_COLLECTION = process.env.CHROMA_COLLECTION || 'rag-docs';
export const CHROMA_API_KEY = process.env.CHROMA_API_KEY || '';
export const CHROMA_TENANT = process.env.CHROMA_TENANT || '';
export const CHROMA_DATABASE = process.env.CHROMA_DATABASE || '';
