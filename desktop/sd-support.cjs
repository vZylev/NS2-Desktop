const path = require('node:path');
const {history, runPath, readJSON} = require('./history.cjs');

// Capability declaration for the existing exporter. Storage 5 selects the source,
// not an output filesystem. Historical inventory results cannot establish write access.
async function sdSupport(dataRoot) {
  let observation = null;
  for (const run of await history(dataRoot)) {
    const directory = await runPath(dataRoot, run.id);
    const reports = [path.join(directory, 'games/game-export.json'),
      ...run.titles.filter(row => row.folder).map(row => path.join(directory, 'games', row.title, 'game-export.json'))];
    for (const file of reports) {
      const report = await readJSON(file);
      const sd = Array.isArray(report?.inventories) ? report.inventories.find(item => item?.storage === 5) : null;
      if (!sd || typeof sd.available !== 'boolean') continue;
      observation = {run: run.id, recordedAt: report.started || run.started,
        inventoryAvailable: sd.available, inventoryComplete: sd.complete === true};
      break;
    }
    if (observation) break;
  }
  return {directConsoleSdExport: false, reason: 'notImplemented', currentDestination: 'computer',
    consoleWriteTestPerformed: false, sdWritePermission: 'unknown', sdFreeBytes: null, observation};
}
module.exports = {sdSupport};
