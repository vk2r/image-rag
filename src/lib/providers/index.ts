export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface EmbeddingsProvider {
  embed(texts: string[]): Promise<number[][]>;
}

export interface ChatProvider {
  complete(messages: ChatMessage[]): Promise<string>;
}

import { RAG_PROVIDER, type ProviderName } from '@/lib/config';
import { openAIProviders } from '@/lib/providers/openai';
import { ollamaProviders } from '@/lib/providers/ollama';

export function getEmbeddingsProvider(provider?: ProviderName): EmbeddingsProvider {
  const p = provider || RAG_PROVIDER;
  if (p === 'ollama') return ollamaProviders.embeddings;
  return openAIProviders.embeddings;
}

export function getChatProvider(provider?: ProviderName): ChatProvider {
  const p = provider || RAG_PROVIDER;
  if (p === 'ollama') return ollamaProviders.chat;
  return openAIProviders.chat;
}
