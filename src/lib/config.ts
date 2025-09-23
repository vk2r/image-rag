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
export const OLLAMA_CHAT_MODEL =
  process.env.OLLAMA_CHAT_MODEL ||
  "hf.co/unsloth/Qwen3-4B-Instruct-2507-GGUF:Q8_K_XL";
export const OLLAMA_EMBED_MODEL =
  process.env.OLLAMA_EMBED_MODEL || "embeddinggemma:300m";

// RAG params
const intFromEnv = (val: string | undefined, def: number) => {
  const n = Number.parseInt(val || "", 10);
  return Number.isFinite(n) ? n : def;
};

export const RAG_CHUNK_SIZE = intFromEnv(process.env.RAG_CHUNK_SIZE, 1000);
export const RAG_CHUNK_OVERLAP = intFromEnv(process.env.RAG_CHUNK_OVERLAP, 150);
export const RAG_TOP_K = intFromEnv(process.env.RAG_TOP_K, 5);
