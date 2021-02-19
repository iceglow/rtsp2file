const path = require('path');
const ftp = require("basic-ftp");

const logger = require('./logging-service').logger;

function connect(config_data) {
  const client = new ftp.Client();

  return new Promise((resolve, reject) => {
    logger.info(`Connecting to FTP server ${config_data.ftp.host}.`);

    client.access({
        host: config_data.ftp.host,
        user: config_data.ftp.user,
        password: config_data.ftp.password,
        secure: config_data.ftp.secure
    }).then(() => {
      logger.debug(`Connected to FTP server ${config_data.ftp.host}.`);
      resolve(client);
    }).catch(reason => {
      logger.error(`Error while connecting to FTP server (${config_data.ftp.host}): `, reason);
      reject(reason);
    });
  });
}

async function upload(client, file, date, name) {
  const destination = '/' + date.toISOString().split('T')[0] + '/' + name;
  logger.info("Uploading file: " + file + " -> " + destination);

  await client.ensureDir(destination);
  await client.uploadFrom(file, destination + '/' + path.basename(file));
}

module.exports = {
  connect,
  upload
};