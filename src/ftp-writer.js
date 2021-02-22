const path = require('path');
const ftp = require("basic-ftp");

const logger = require('./logging-service').logger;

class FileWriter {

  constructor(config) {
    this.client = new ftp.Client();
    
    this.host = config.host,
    this.user = config.user,
    this.password = config.password,
    this.secure = config.secure
  }

connect() {
  return new Promise((resolve, reject) => {
    logger.info(`Connecting to FTP server ${this.host}.`);

    this.client.access({
        host: this.host,
        user: this.user,
        password: this.password,
        secure: this.secure
    }).then(() => {
      logger.debug(`Connected to FTP server ${this.host}.`);
      resolve();
    }).catch(reason => {
      logger.error(`Error while connecting to FTP server (${this.host}): `, reason);
      reject(reason);
    });
  });
}

async upload(file, date, name) {
  const destination = '/' + date.toISOString().split('T')[0] + '/' + name;
  logger.info("Uploading file: " + file + " -> " + destination);

  await this.client.ensureDir(destination);
  await this.client.uploadFrom(file, destination + '/' + path.basename(file));
}

}
module.exports = FileWriter;