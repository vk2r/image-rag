export type DocInfo = {
  name: string;
  docType: string;
  chunks: number;
};

export function inferDocType(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.endsWith('.pdf')) return 'pdf';
  if (n.endsWith('.md')) return 'md';
  if (n.endsWith('.txt')) return 'txt';
  return 'otro';
}
