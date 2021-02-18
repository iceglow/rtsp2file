const fs = require('fs');
const path = require('path');

let cacheBaseDir = './';

function getCacheDir(recievedDate) {
  const dateTime = recievedDate.toISOString().replace(/T/, '_').replace(/\..+/, '');
  const cacheDir = fs.mkdtempSync(cacheBaseDir + path.sep + "stream-" + dateTime + "-");
  console.log('Creating cache dir "' + cacheDir + '"');
  return cacheDir;
}

function cleanupCache(cacheDir) {
  console.log('Removing cache dir "' + cacheDir + '"');
  fs.rmdirSync(cacheDir, {recursive: true});
}

module.exports = (cacheBase) => {
  cacheBaseDir = cacheBase;
  return {
      getCacheDir,
      cleanupCache
  }
};