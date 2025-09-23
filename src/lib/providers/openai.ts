import OpenAI from "openai";
import {
  OPENAI_API_KEY,
  OPENAI_CHAT_MODEL,
  OPENAI_EMBED_MODEL,
} from "@/lib/config";
import type {
  ChatProvider,
  EmbeddingsProvider,
  ChatMessage,
} from "@/lib/providers";

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

const embeddings: EmbeddingsProvider = {
  async embed(texts: string[]) {
    const res = await client.embeddings.create({
      model: OPENAI_EMBED_MODEL,
      input: texts,
    });
    return res.data.map((d) => d.embedding as number[]);
  },
};

const chat: ChatProvider = {
  async complete(messages: ChatMessage[]) {
    const res = await client.chat.completions.create({
      model: OPENAI_CHAT_MODEL,
      messages,
      temperature: 0.1,
    });
    return res.choices?.[0]?.message?.content ?? "";
  },
};

export const openAIProviders = { embeddings, chat };
