'use strict';

var env = process.env;

const fs = require('fs');
const path = require('path')
const { spawn } = require('child_process');

const ftp = require("basic-ftp");
const Queue = require('queue-promise');
const { Observable, of, timer } = require('rxjs');
const { filter, map, mergeMap } = require('rxjs/operators');

const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const app = express();

const config_data = env.RTSP2FILE_CONFIG ? require(env.RTSP2FILE_CONFIG) : require('./config/config.json');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var PORT = env.PORT || 80;

router.post('/record', function (req, res) {

  const name = req.body.source_name;
  const streamUrl = req.body.stream_url;
  const duration = req.body.duration;
  const partDuration = req.body.part_duration;

  const recievedDate = new Date();

  console.log("Starting work on " + name);

  const queue = new Queue({
    concurrent: 1,
    interval: 1000
  });

  ftpConnect(new ftp.Client()).then(client => {
    const dateTime = recievedDate.toISOString().replace(/T/, '_').replace(/\..+/, '');
    const tempDir = fs.mkdtempSync("stream-" + dateTime + "-");
    
    readStream(tempDir, dateTime, streamUrl, duration, partDuration).subscribe(file => {
      queue.enqueue(async () => { await processFile(client, file, recievedDate, name); });
    }, error => {
      console.error("Error while processing request: " + error);
      fs.rmdirSync(tempDir, {recursive: true});
      console.log('Removed cache dir "' + tempDir + '"');
    }, () => {
      let completeCb = () => {
        fs.rmdirSync(tempDir, {recursive: true});
        console.log('Removed cache dir "' + tempDir + '"');
      };
      if (queue.isEmpty) {
        completeCb();
      } else {
        queue.on("end", () => completeCb);
      }
    });
  });

  res.json({ status: 'Ok' });
})

function ftpConnect(client) {
  return new Promise((resolve, reject) => {
    client.access({
        host: config_data.ftp.host,
        user: config_data.ftp.user,
        password: config_data.ftp.password,
        secure: config_data.ftp.secure
    }).then(resolve(client)).catch(reason => reject(reason));
  });
}

async function processFile(client, file, date, name) {
  let destination = '/' + date.toISOString().split('T')[0] + '/' + name;
  console.log("Uploading file: " + file + " -> " + destination);

  await client.ensureDir(destination);
  await client.uploadFrom(file, destination + '/' + path.basename(file));
}

function readStream(cacheDir, dateTime, streamUrl, duration, partDuration) {

  const openRTSP = spawn('openRTSP', [
    '-d', duration,
    '-t',
    '-4',
    '-b','1000000',
    '-P', partDuration,
    '-F', dateTime, 
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

app.use('/', router);

var server = app.listen(PORT, function () {
  var host = server.address().address
  var port = server.address().port
  console.log("Example app listening at http://%s:%s", host, port)
})