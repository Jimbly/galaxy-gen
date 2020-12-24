const argv = require('minimist')(process.argv.slice(2));
const express = require('express');
const express_static_gzip = require('express-static-gzip');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const {
  // allowMapFromLocalhostOnly,
  setOriginHeaders,
} = require('./glov/request_utils.js');
const glov_server = require('./glov/server.js');
const test_worker = require('./test_worker.js');

let app = express();
let server = http.createServer(app);
// allowMapFromLocalhostOnly(app);

let server_https;
if (argv.dev) {
  if (fs.existsSync('debugkeys/localhost.crt')) {
    let https_options = {
      cert: fs.readFileSync('debugkeys/localhost.crt'),
      key: fs.readFileSync('debugkeys/localhost.key'),
    };
    server_https = https.createServer(https_options, app);
  }
}
app.use(setOriginHeaders);

app.use(express_static_gzip(path.join(__dirname, '../client/'), {
  enableBrotli: true,
  orderPreference: ['br'],
}));

app.use(express_static_gzip('data_store/public', {
  enableBrotli: true,
  orderPreference: ['br'],
}));

glov_server.startup({ server, server_https });

test_worker.init(glov_server.channel_server);

let port = argv.port || process.env.port || 3000;

server.listen(port, () => {
  console.info(`Running server at http://localhost:${port}`);
});
if (server_https) {
  let secure_port = argv.sport || process.env.sport || (port + 100);
  server_https.listen(secure_port, () => {
    console.info(`Running server at https://localhost:${secure_port}`);
  });
}
