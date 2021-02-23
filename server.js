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
const FtpWriter = require('./src/ftp-writer');
const DropboxWriter = require('./src/dropbox-writer');

const router = express.Router();
const app = express();

router.post('/record', function (req, res) {
  const name = req.body.source_name;
  const streamUrl = req.body.stream_url;
  const duration = req.body.duration;
  const partDuration = req.body.part_duration;
  const destinations = req.body.destinations;

  const recievedDate = new Date();
  logger.info(`/record request named '${name}'`);

  const writers = [];
  destinations.forEach(destination => {
    if (Object.keys(config.destinations).includes(destination)) {
      const confDest = config.destinations[destination];

      switch(confDest.type) {
        case 'dropbox':
          writers.push(new DropboxWriter(destination, name, recievedDate, confDest));
          break;
        case 'ftp':
          writers.push(new FtpWriter(destination, name, recievedDate, confDest));
          break;
        default:
          logger.warn(`Unknown type "${confDest.type}" configured for destination "${confDest}"`);
      }
    }
  });

  const cacheDir = cacheManager.getCacheDir(recievedDate);
  const queue = new Queue({
    concurrent: 1,
    interval: 1,
    start: false
  });

  streamReader.start(cacheDir, recievedDate, streamUrl, duration, partDuration).subscribe(file => {
    for (let i = 0; i < writers.length; i++) {
      queue.enqueue(async () => {
        await writers[i].upload(file); 
      });
    }
  }, error => {
    logger.error("Error while processing request: " + error);
    cacheManager.cleanupCache(cacheDir);
  }, () => {
    if (queue.isEmpty) {
      cacheManager.cleanupCache(cacheDir);
    } else {
      queue.on("end", () => cacheManager.cleanupCache(cacheDir));
    }
  });

  Promise.all(writers.map(w => w.prepare()))
  .then(() => {logger.error('starting queue')
    queue.options.start = true;
    queue.start();

    Promise.all(writers.map(w => w.getLink()))
    .then(results => {
      res.json({
        destinations: results,
        status: 'Ok' 
      });
    }).catch(error => {
      logger.error("Error while processing request: " + error);
      res.status(500);
      res.json({ status: 'Error' });
    });
  })
  .catch(error => {
    logger.error("Error while processing request: " + error);
    res.status(500);
    res.json({ status: 'Error' });
  });
});

const port = env.PORT || config.api.port || 80;
const contextPath = env.CONTEXT_PATH || config.api.contextPath || '/';

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(contextPath, router);

app.listen(port, () => {
  logger.info("Server listening at port %s, context path %s", port, contextPath);
});