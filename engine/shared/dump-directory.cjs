const path = require('node:path');
function dumpDirectory(subdirectory, root = process.env.NS2_FIRMWARE_DUMP_DIR) {
  if (!root || !path.isAbsolute(root)) throw Error('A dedicated firmware dump directory is required');
  if (subdirectory !== undefined && !/^[a-zA-Z0-9_-]{1,80}$/.test(subdirectory)) throw Error('Invalid dump subdirectory');
  return subdirectory ? path.join(root, subdirectory) : root;
}
module.exports = {dumpDirectory};
