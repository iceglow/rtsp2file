const path = require('path');
const ftp = require("basic-ftp");

const Writer = require('./writer');
const logger = require('./logging-service').logger;

class FileWriter extends Writer {

  constructor(name, streamName, date, config) {
    super(name, streamName, date);

    this.client = new ftp.Client();
    
    this.host = config.host,
    this.port = config.port,
    this.user = config.user,
    this.password = config.password,
    this.secure = config.secure
  }

  prepare() {
    return new Promise((resolve, reject) => {
      logger.info(`Connecting to FTP server ${this.host}.`);

      this.client.access({
          host: this.host,
          port: this.port,
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

  getLink() {
    logger.info("Getting link for: " + this.destination);

    return new Promise((resolve, reject) => {
      resolve(`${this.secure?'ftps':'ftp'}://${this.host}:${this.port}${this.destination}`);
    });
  }

  async upload(file) {
    logger.info("Uploading file: " + file + " -> " + this.destination);

    await this.client.ensureDir(this.destination);
    await this.client.uploadFrom(file, this.destination + '/' + path.basename(file));
  }
}

module.exports = FileWriter;