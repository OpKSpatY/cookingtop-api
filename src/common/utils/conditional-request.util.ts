/**
 * ETag forte no formato `"hex"` (aspas incluídas, como no header de resposta).
 */
export function formatStrongEtag(hashHex: string): string {
  return `"${hashHex}"`;
}

/** Remove aspas e prefixo `W/` para comparação. */
export function normalizeEtagValue(etag: string): string {
  return etag
    .trim()
    .replace(/^W\//i, '')
    .replace(/^"|"$/g, '');
}

/**
 * RFC 7232: `If-None-Match` pode ser lista separada por vírgula ou `*`.
 */
export function isIfNoneMatchSatisfied(
  ifNoneMatchHeader: string | undefined,
  responseEtag: string,
): boolean {
  if (!ifNoneMatchHeader?.trim() || !responseEtag) {
    return false;
  }
  const server = normalizeEtagValue(responseEtag);
  const parts = ifNoneMatchHeader.split(',').map((p) => normalizeEtagValue(p));
  // RFC 7232: `If-None-Match: *` em GET com recurso existente → condição falsa (não 304).
  if (parts.includes('*')) {
    return false;
  }
  return parts.includes(server);
}
