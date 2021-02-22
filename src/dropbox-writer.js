const https = require("https");
const fs = require('fs')
const path = require('path');

const logger = require('./logging-service').logger;

class DropboxWriter {

  constructor(config) {
    this.token = config.token;
  }

  connect() {  
    return new Promise((resolve, reject) => {
      resolve();
    });
  }

  async upload(file, date, name) {
    const destination = '/' + date.toISOString().split('T')[0] + '/' + name;
    logger.info("Uploading file: " + file + " -> " + destination);

    
    const data = fs.readFileSync(file, {flag:'r'});
    await this.uploadFile(data, this.token, destination, file);
  };

  uploadFile(data, token, destination, file) {
    return new Promise((resolve, reject) => {
      const req = https.request('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Dropbox-API-Arg': JSON.stringify({
            'path': destination + '/' + path.basename(file),
            'mode': 'overwrite',
            'autorename': true, 
            'mute': false,
            'strict_conflict': false
          }),
            'Content-Type': 'application/octet-stream',
        }
      }, (res) => {
        logger.debug(`statusCode: ${res.statusCode}`);
        logger.debug(`headers: ${res.headers}`);
        let chunks_of_data = [];

        res.on('data', function(fragments) {
          chunks_of_data.push(fragments);
        });

        res.on('end', function(d) {
          let response_body = Buffer.concat(chunks_of_data);
          resolve(response_body.toString());
        });

        res.on('error', (error) => {
          reject(error);
        });
      });

      req.write(data);
      req.end();
    });
  }
}

module.exports = DropboxWriter;