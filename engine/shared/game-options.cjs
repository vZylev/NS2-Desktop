function parseTitles(value) {
  if (typeof value !== 'string') throw Error('Expected title IDs');
  const titles = value.trim().split(/[\s,;]+/);
  if (!titles.length || titles.length > 64 || titles.some(title => !/^(?:0x)?[0-9a-fA-F]{16}$/.test(title)))
    throw Error('Expected 1–64 hexadecimal title IDs (16 digits each)');
  return [...new Set(titles.map(title => title.replace(/^0x/, '').toLowerCase()))];
}

// Parse game options before creating a console session or changing local output.
function parseGameOptions(args) {
  if (!['--list-games', '--probe-game', '--dump-game'].includes(args[0])) return null;
  const mode = {'--list-games': 'inventory', '--probe-game': 'probe', '--dump-game': 'dump'}[args[0]];
  const rest = args.slice(1), options = {mode};
  if (mode !== 'inventory') {
    const titles = parseTitles(rest.shift()).map(title => '0x' + title);
    options.title = titles[0];
    if (titles.length > 1) options.titles = titles;
  }
  const storageAt = rest.indexOf('--storage');
  if (storageAt >= 0) {
    options.storage = Number(rest[storageAt + 1]);
    if (![2, 4, 5].includes(options.storage)) throw Error('Storage must be 2 (cart), 4 (USER), or 5 (SD)');
    rest.splice(storageAt, 2);
  }
  const versionAt = rest.indexOf('--version');
  if (versionAt >= 0) {
    const value = rest[versionAt + 1];
    if (mode === 'inventory' || !/^\d+$/.test(value || '') || Number(value) > 0xffffffff)
      throw Error('Version must be an unsigned 32-bit decimal number for probe/dump');
    options.version = Number(value);
    rest.splice(versionAt, 2);
  }
  if (rest.some(arg => arg.startsWith('--'))) throw Error('Unknown game option');
  return {options, hostArgs: rest};
}
module.exports = {parseGameOptions, parseTitles};
