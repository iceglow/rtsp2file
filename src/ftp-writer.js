const path = require('path');
const ftp = require("basic-ftp");

function connect(config_data) {
  const client = new ftp.Client();

  return new Promise((resolve, reject) => {
    client.access({
        host: config_data.ftp.host,
        user: config_data.ftp.user,
        password: config_data.ftp.password,
        secure: config_data.ftp.secure
    }).then(resolve(client)).catch(reason => reject(reason));
  });
}

async function upload(client, file, date, name) {
  let destination = '/' + date.toISOString().split('T')[0] + '/' + name;
  console.log("Uploading file: " + file + " -> " + destination);

  await client.ensureDir(destination);
  await client.uploadFrom(file, destination + '/' + path.basename(file));
}

module.exports = {
  connect,
  upload
};