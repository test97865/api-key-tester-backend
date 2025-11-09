/**
 * 加密工具
 */

/**
 * 生成 API Key 的 SHA-256 hash
 */
export async function hashKey(key) {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Mask API Key（显示前后几位）
 */
export function maskKey(key) {
  if (!key || key.length < 10) {
    return '***';
  }

  const prefixLength = Math.min(12, Math.floor(key.length * 0.2));
  const suffixLength = Math.min(6, Math.floor(key.length * 0.1));

  const prefix = key.substring(0, prefixLength);
  const suffix = key.substring(key.length - suffixLength);

  return `${prefix}***${suffix}`;
}