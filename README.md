## RAG en Next.js (Español)

Este proyecto implementa un flujo RAG minimalista con Next.js (TypeScript) y una interfaz web para:

- Subir documentos (PDF/TXT/MD) y fragmentarlos (chunking).
- Generar embeddings con OpenAI u Ollama.
- Almacenar embeddings en un VectorStore basado en JSON local.
- Realizar preguntas y recuperar contexto relevante.

### Requisitos

- Node.js 18+
- Cuenta y clave de API de OpenAI si usas el proveedor `openai` (recomendado por defecto).

### Variables de entorno (`.env.local`)

Ejemplo mínimo:

```
RAG_PROVIDER=ollama

# OpenAI (requerido si usas openai)
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small

# Ollama (opcional si usas ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=hf.co/unsloth/Qwen3-4B-Instruct-2507-GGUF:Q8_K_XL
OLLAMA_EMBED_MODEL=embeddinggemma:300m

# Parámetros RAG (opcionales)
RAG_CHUNK_SIZE=1000
RAG_CHUNK_OVERLAP=150
RAG_TOP_K=5
```

El proveedor por defecto es `openai`. Cambia `RAG_PROVIDER` a `ollama` si prefieres ejecutar localmente con Ollama.

### Ejecutar

```
npm install
npm run dev
```

Abre `http://localhost:3000`.

### UI y Endpoints

- UI principal: `src/app/page.tsx`

  - Selector de proveedor (`openai`/`ollama`)
  - Subida de archivos y estado de ingestión
  - Listado de documentos y consulta de preguntas

- Endpoints API:
  - `POST /api/ingest` — Ingesta de documentos (FormData: `files[]`, `provider`)
  - `GET  /api/docs` — Lista documentos por proveedor (`provider` como query param)
  - `POST /api/ask` — Preguntas con `question`, `topK`, `provider`, y opcional `doc`

### Almacenamiento Vectorial (JSON local)

Los embeddings se guardan en archivos JSON por proveedor en `data/`:

- `data/vector_store-openai.json`
- `data/vector_store-ollama.json`

Esto facilita respaldos y depuración. No se usa ninguna base de datos externa por defecto.

### Estructura relevante

- `src/app/api/ingest/route.ts` — Ingesta de documentos, chunking y guardado en JSON.
- `src/app/api/ask/route.ts` — Búsqueda por similitud y respuesta con contexto.
- `src/app/api/docs/route.ts` — Listado de documentos disponibles.
- `src/lib/providers/` — Proveedores de chat/embeddings (OpenAI/Ollama).
- `src/lib/store/vectorStore.ts`— Implementación del VectorStore en JSON.

### Problemas comunes

- Si ves errores de clave al usar OpenAI, asegúrate de definir `OPENAI_API_KEY` en `.env.local` y reiniciar el servidor.
- Si usas Ollama, verifica que el servidor esté activo en `OLLAMA_BASE_URL` y que los modelos configurados estén disponibles localmente.
