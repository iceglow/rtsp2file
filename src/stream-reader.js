const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const { Observable, of, timer } = require('rxjs');
const { filter, map, mergeMap } = require('rxjs/operators');

const logger = require('./logging-service').logger;

function start(cacheDir, dateTime, streamUrl, duration, partDuration) {
  logger.info(`Starting to read stream '${streamUrl}'.`);

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
    logger.info(`stdout: ${data}`);
  });
  
  openRTSP.stderr.on('data', (data) => {
    // openRTSP is verry verbose on stderr, sending it to debug log.
    logger.debug(`stderr: ${data}`);
  }); 

  return new Observable(subscriber => {
    let lastFile = undefined;
    let processedFiles = [];

    fs.watch(cacheDir, { encoding: 'utf8' }, async (eventType, filename) => {
      logger.debug(`Watching cache dir ${cacheDir} for video files.`);
      if (filename) {
        logger.debug(`Event cache file '${filename}': ${eventType}`);
        if (lastFile && filename !== lastFile) {
          const fileToCopy = lastFile.slice();
          logger.debug(`Done writing to file '${cacheDir + path.sep + fileToCopy}'. Sending trigger.`);
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
          logger.debug(`Found non-processed cache-file '${cacheDir + path.sep + file}'. Sending trigger.`);
          subscriber.next(cacheDir + path.sep + file);
        }
      };
      logger.debug(`Done processing all files in '${cacheDir}'. Sending complete.`);
      subscriber.complete();
    });
  });
}

module.exports = {
  start
};