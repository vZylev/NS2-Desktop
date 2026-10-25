function normalizeCatalog(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('invalidCatalog');
  const entries = Object.entries(value);
  if (entries.length > 20000) throw Error('invalidCatalog');
  const result = Object.create(null);
  for (const [key, entry] of entries) {
    const name = typeof entry === 'string' ? entry : entry?.name;
    if (!/^(?:0x)?[0-9a-f]{16}$/i.test(key) || typeof name !== 'string' ||
      !name.trim() || name.length > 300 || /[\u0000-\u001f]/.test(name)) throw Error('invalidCatalog');
    const id = key.replace(/^0x/i, '').toLowerCase();
    if (result[id] && result[id] !== name.trim()) throw Error('invalidCatalog');
    result[id] = name.trim();
  }
  return result;
}
module.exports = {normalizeCatalog};
