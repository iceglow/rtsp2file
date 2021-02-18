'use strict';

var env = process.env;

const Queue = require('queue-promise');

const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const app = express();

const config_data = env.RTSP2FILE_CONFIG ? require(env.RTSP2FILE_CONFIG) : require('./config/config.json');
const cacheBaseDir = env.RTSP2FILE_CACHE || '.';

const cacheManager = require('./src/cache-manager')(cacheBaseDir);
const streamReader = require('./src/stream-reader');
const ftpWriter = require('./src/ftp-writer');

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

  ftpWriter.connect(config_data).then(client => {
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
      console.error("Error while processing request: " + error);
      cacheManager.cleanupCache(cacheDir);
    }, () => {
      queue.on("end", () => cacheManager.cleanupCache(cacheDir));
    });
  });

  res.json({ status: 'Ok' });
});

app.use('/', router);

var server = app.listen(PORT, function () {
  var host = server.address().address
  var port = server.address().port
  console.log("Example app listening at http://%s:%s", host, port)
})