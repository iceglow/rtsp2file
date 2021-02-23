const https = require("https");
const fs = require('fs')
const path = require('path');

const Writer = require('./writer');
const logger = require('./logging-service').logger;

class DropboxWriter extends Writer {

  constructor(name, streamName, date, config) {
    super(name, streamName, date);
    this.token = config.token;
  }

  prepare() {
    logger.info("Creating folder: " + this.destination);

    return this.createFolder(this.destination);
  }

  async getLink() {
    logger.info("Getting link for: " + this.destination);

    let link = await this.findLink();
    if (!link) {
      link =  await this.createLink();
    }

    return link;
  }

  async upload(file) {
    logger.info("Uploading file: " + file + " -> " + this.destination);

    const data = fs.readFileSync(file, {flag:'r'});
    await this.uploadFile(data, file);
  };

  uploadFile(data, file) {
    return this.dropboxRequest(
      'https://content.dropboxapi.com/2/files/upload',
      'POST',
      {
        'Authorization': `Bearer ${this.token}`,
        'Dropbox-API-Arg': JSON.stringify({
          'path': this.destination + '/' + path.basename(file),
          'mode': 'overwrite',
          'autorename': true, 
          'mute': false,
          'strict_conflict': false
        }),
          'Content-Type': 'application/octet-stream',
      },
      data);
  }

  findLink() {
    return this.dropboxRequest(
      'https://api.dropboxapi.com/2/sharing/list_shared_links',
      'POST',
      {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      JSON.stringify({
        'path': this.destination,
        "direct_only": true
      }), (res) => {
        if (res && res.links && res.links.length > 0) {
          return res.links[0].url;
        } else {
          return null;
        }
      });
  }

  createLink() {
    return this.dropboxRequest(
      'https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings',
      'POST',
      {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      JSON.stringify({
        'path': this.destination,
        "settings": {
            "requested_visibility": "public",
            "audience": "public",
            "access": "viewer"
        }
      }), (res) => {
        if (res && res.url) {
          return res.url;
        } else {
          return null;
        }
      });
  }

  createFolder() {
    return this.dropboxRequest(
      'https://api.dropboxapi.com/2/files/create_folder_v2',
      'POST',
      {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      JSON.stringify({
        'path': this.destination,
        "autorename": false
      }));
  }

  dropboxRequest(url, method, headers, data, responseProcessing = (res) => {return res}) {
    return new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: method,
        headers: headers
      }, (res) => {
        logger.debug(`Dropbox response statusCode: ${res.statusCode}`);
        logger.debug(`Dropbox response headers: ${res.headers}`);
        let chunks_of_data = [];

        res.on('data', function(fragments) {
          chunks_of_data.push(fragments);
        });

        res.on('end', function(d) {
          let response_body = Buffer.concat(chunks_of_data);
          resolve(responseProcessing(JSON.parse(response_body)));
        });

        res.on('error', (error) => {
          logger.error(error);
          reject(error);
        });
      });

      req.write(data);
      req.end();
    });
  }
};

module.exports = DropboxWriter;