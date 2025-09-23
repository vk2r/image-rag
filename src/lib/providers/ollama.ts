import OpenAI from 'openai';
import { OLLAMA_BASE_URL, OLLAMA_CHAT_MODEL, OLLAMA_EMBED_MODEL } from '@/lib/config';
import type { ChatProvider, EmbeddingsProvider, ChatMessage } from '@/lib/providers';

// Usamos el SDK de OpenAI apuntando al endpoint OpenAI-compatible de Ollama
const baseURL = `${OLLAMA_BASE_URL.replace(/\/$/, '')}/v1`;
const client = new OpenAI({ baseURL, apiKey: 'ollama' });

const embeddings: EmbeddingsProvider = {
  async embed(texts: string[]) {
    const out: number[][] = [];
    for (const t of texts) {
      // Algunos servidores OpenAI-compatibles de Ollama no aceptan arrays en "input"
      // por lo que enviamos 1 texto por request.
      let lastErr: any = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await client.embeddings.create({ model: OLLAMA_EMBED_MODEL, input: t });
          const emb = res.data?.[0]?.embedding as number[] | undefined;
          if (!emb) throw new Error('Respuesta de embeddings vacía');
          out.push(emb);
          lastErr = null;
          break;
        } catch (e: any) {
          lastErr = e;
          // pequeño retry inmediato
        }
      }
      if (lastErr) {
        throw new Error(`Ollama embeddings error: ${lastErr?.message || lastErr}`);
      }
    }
    return out;
  },
};

const chat: ChatProvider = {
  async complete(messages: ChatMessage[]) {
    const res = await client.chat.completions.create({
      model: OLLAMA_CHAT_MODEL,
      messages,
      temperature: 0.1,
    });
    return res.choices?.[0]?.message?.content ?? '';
  },
};

export const ollamaProviders = { embeddings, chat };
