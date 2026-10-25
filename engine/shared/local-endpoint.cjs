const path = require('node:path');
const crypto = require('node:crypto');

function endpointPath(directory, platform = process.platform) {
  return platform === 'win32' ? '\\\\.\\pipe\\ns2-' + crypto.randomBytes(16).toString('hex') :
    path.join(directory, 'memory.sock');
}

module.exports = {endpointPath};
