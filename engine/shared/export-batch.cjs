const fs = require('node:fs/promises');
const path = require('node:path');
const {parseTitles} = require('./game-options.cjs');
const {writeAtomic} = require('./atomic-file.cjs');

// Schedule existing exports sequentially; each keeps its own report and files.
async function exportBatch(options, directory, exportOne, log = console.log) {
  if (!['probe', 'dump'].includes(options.mode) || !Array.isArray(options.titles))
    throw Error('Invalid batch export options');
  const titles = parseTitles(options.titles.join(',')).map(title => '0x' + title);
  await fs.mkdir(directory, {recursive: true, mode: 0o700});
  const file = path.join(directory, 'game-export-batch.json');
  const journal = {mode: options.mode, started: new Date().toISOString(), complete: false,
    completeGameImage: false, titles: titles.map(title => ({title, status: 'pending'}))};
  await fs.writeFile(file, JSON.stringify(journal, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  const save = () => writeAtomic(file, JSON.stringify(journal, null, 2) + '\n');
  for (const [index, entry] of journal.titles.entries()) {
    entry.status = 'running'; await save();
    log(`Games: title ${index + 1}/${titles.length}: ${entry.title} — starting`);
    try {
      const {titles: ignored, ...single} = options;
      entry.result = await exportOne({...single, title: entry.title}, path.join(directory, entry.title.slice(2)));
      if (!entry.result?.complete || options.mode === 'dump' && !entry.result.completeContentSet)
        throw Error('Title export was incomplete');
      entry.status = 'complete'; await save();
      log(`Games: title ${index + 1}/${titles.length}: ${entry.title} — complete`);
    } catch (error) {
      entry.status = 'failed'; entry.error = error.message; journal.error = error.message;
      await save();
      log(`Games: title ${index + 1}/${titles.length}: ${entry.title} — failed; remaining titles were not started`);
      throw error;
    }
  }
  journal.complete = true;
  journal.completeContentSet = options.mode === 'dump' && journal.titles.every(entry => entry.result.completeContentSet);
  journal.completed = new Date().toISOString(); await save();
  log('Games: batch report ' + file);
  return {file, directory, complete: true, completeContentSet: journal.completeContentSet, completeGameImage: false};
}
module.exports = {exportBatch};
