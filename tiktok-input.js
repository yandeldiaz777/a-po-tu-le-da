// A po tu le da? · Autor del código de la aplicación — Yandel Diaz
function tiktokInputMode(value) {
  if (typeof value !== 'string') return null;
  const input = value.trim();
  if (/^@[\w.]{1,24}$/.test(input)) return 'profile';
  try {
    const link = new URL(input);
    if (!['https:', 'http:'].includes(link.protocol) || link.username || link.password || link.port) return null;
    const fullLink = ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'].includes(link.hostname);
    if (fullLink && /^\/@[\w.]{1,24}\/?$/.test(link.pathname)) return 'profile';
    if (fullLink && /^\/@[\w.]+\/video\/\d+\/?$/.test(link.pathname)) return 'video';
    if (['vm.tiktok.com', 'vt.tiktok.com'].includes(link.hostname) && /^\/[\w-]+\/?$/.test(link.pathname)) return 'video';
  } catch {
    return null;
  }
  return null;
}

if (typeof module === 'object' && module.exports) {
  module.exports = {tiktokInputMode};
}
