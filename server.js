'use strict';

var env = process.env;

const Queue = require('queue-promise');
const logger = require('./src/logging-service').logger;
const configYaml = require('config-yaml');

const express = require('express');
const bodyParser = require('body-parser');

const config = configYaml(env.RTSP2FILE_CONFIG || `${process.cwd()}/config/config.yml`);
const cacheBaseDir = env.RTSP2FILE_CACHE || process.cwd() + '/cache';

const cacheManager = require('./src/cache-manager')(cacheBaseDir);
const streamReader = require('./src/stream-reader');
const ftpWriter = require('./src/ftp-writer');

const router = express.Router();
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var PORT = env.PORT || 80;

router.post('/record', function (req, res) {
  const name = req.body.source_name;
  const streamUrl = req.body.stream_url;
  const duration = req.body.duration;
  const partDuration = req.body.part_duration;

  const recievedDate = new Date();

  logger.info(`/record request named '${name}'`);

  try {
    ftpWriter.connect(config).then(client => {
      const cacheDir = cacheManager.getCacheDir(recievedDate);
      const queue = new Queue({
        concurrent: 1,
        interval: 1000
      });
      
      streamReader.start(cacheDir, recievedDate, streamUrl, duration, partDuration).subscribe(file => {
        queue.enqueue(async () => {
          await ftpWriter.upload(client, file, recievedDate, name); 
        });
      }, error => {
        logger.error("Error while processing request: " + error);
        cacheManager.cleanupCache(cacheDir);
      }, () => {
        queue.on("end", () => cacheManager.cleanupCache(cacheDir));
      });
    });
    res.json({ status: 'Ok' });
  } catch (error) {
    logger.error("Error while processing request /record: ", error);

    res.status(500)
    res.json({ status: 'Error' });
  }
});

app.use('/', router);

app.listen(PORT, () => {
  logger.info("Server listening at port: %s", PORT)
});