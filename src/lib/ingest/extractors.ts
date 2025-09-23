import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

export async function fileToText(file: File): Promise<string> {
  const name = (file as any).name || "document";
  const type = (file as any).type || "";

  if (type === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
    const buf = Buffer.from(await file.arrayBuffer());
    // Extraer texto usando únicamente pdfjs-dist
    try {
      const text = await extractTextWithPdfjs(buf, name);
      if (text && text.trim().length > 0) return text;
      console.warn("[extractors] pdfjs-dist devolvió texto vacío", { name });
    } catch (err) {
      console.error("[extractors] Error con pdfjs-dist", { name, type }, err);
    }

    // 3) Último recurso: sin texto (probablemente PDF escaneado/imagen)
    return "";
  }

  // Fallback: as text
  return await file.text();
}

async function extractTextWithPdfjs(buf: Buffer, name?: string): Promise<string> {
  // Importación estática: pdfjs se carga al evaluar el módulo
  // pdfjs-dist no acepta Buffer directamente; requiere Uint8Array
  const data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  const loadingTask = (pdfjs as any).getDocument({ data });
  let doc: any;
  try {
    doc = await loadingTask.promise;
  } catch (err) {
    console.error("[extractors] Error abriendo PDF con pdfjs-dist", { name }, err);
    throw err;
  }
  let out = "";
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    let page: any;
    try {
      page = await doc.getPage(pageNum);
    } catch (err) {
      console.error(`[extractors] Error obteniendo página ${pageNum} con pdfjs-dist`, { name }, err);
      continue;
    }
    let content: any;
    try {
      content = await page.getTextContent();
    } catch (err) {
      console.error(`[extractors] Error extrayendo texto de página ${pageNum} con pdfjs-dist`, { name }, err);
      continue;
    }
    // content.items puede variar; normalmente i.str contiene el texto
    const items = Array.isArray(content.items) ? content.items : [];
    const strings = items
      .map((i: any) => (typeof i?.str === "string" ? i.str : ""))
      .filter(Boolean);
    out += strings.join(" ") + "\n";
  }
  try {
    await doc.cleanup?.();
  } catch (error) {
    console.log("Error al limpiar el documento PDF:", error);
  }
  return out;
}
