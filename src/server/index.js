const assert = require('assert');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const express = require('express');
const express_static_gzip = require('express-static-gzip');
const { permTokenWorkerInit } = require('glov/server/perm_token_worker.js');
const { setupRequestHeaders } = require('glov/server/request_utils.js');
const glov_server = require('glov/server/server.js');
const argv = require('minimist')(process.argv.slice(2));

let app = express();
let server = http.createServer(app);

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
setupRequestHeaders(app, {
  dev: argv.dev,
  allow_map: true,
});

app.use(express_static_gzip(path.join(__dirname, '../client/'), {
  enableBrotli: true,
  orderPreference: ['br'],
}));

app.use(express_static_gzip('data_store/public', {
  enableBrotli: true,
  orderPreference: ['br'],
}));

glov_server.startup({
  app,
  server,
  server_https,
});

glov_server.ws_server.onMsg('img', function (client, pak, resp_func) {
  let id = pak.readInt();
  let str = pak.readString();
  assert(str.startsWith('data:image/png;base64,'));
  let buf = Buffer.from(str.slice('data:image/png;base64,'.length), 'base64');
  try {
    fs.mkdirSync('img');
  } catch (e) {
    // ignored
  }
  let fn = `img/${client.id}_${id}.png`;
  fs.writeFile(fn, buf, function (err) {
    if (err) {
      throw err;
    }
    console.log(`Wrote ${fn} (${buf.length} bytes)`);
    resp_func(err);
  });
});


// Opt-in to the permissions token system (Note: make sure config/server.json:forward_depth is correct!)
permTokenWorkerInit(glov_server.channel_server, app);

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
