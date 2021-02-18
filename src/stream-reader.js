const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const { Observable, of, timer } = require('rxjs');
const { filter, map, mergeMap } = require('rxjs/operators');

function start(cacheDir, dateTime, streamUrl, duration, partDuration) {
  const openRTSP = spawn('openRTSP', [
    '-d', duration,
    '-t',
    '-4',
    '-b','1000000',
    '-P', partDuration,
    '-F', dateTime.toISOString().replace(/T/, '_').replace(/\..+/, ''), 
    streamUrl
  ], {
      cwd: cacheDir
  });

  openRTSP.stdout.on('data', (data) => {
    //console.log(`stdout: ${data}`);
  });
  
  openRTSP.stderr.on('data', (data) => {
    //console.error(`stderr: ${data}`);
  }); 

  return new Observable(subscriber => {
    let lastFile = undefined;
    let processedFiles = [];

    fs.watch(cacheDir, { encoding: 'utf8' }, async (eventType, filename) => {
      if (filename) {
        if (lastFile && filename !== lastFile) {
          const fileToCopy = lastFile.slice();
          subscriber.next(cacheDir + path.sep + fileToCopy);
          processedFiles.push(fileToCopy);
        }
        lastFile = filename;
      }
    });

    openRTSP.on('close', (code) => {
      subscriber.next(cacheDir + path.sep + lastFile);
      processedFiles.push(lastFile);
      
      for (const file of fs.readdirSync(cacheDir)) {
        if (! processedFiles.includes(file)) {
          subscriber.next(cacheDir + path.sep + file);
        }
      };
      subscriber.complete();
    });
  });
}

module.exports = {
  start
};