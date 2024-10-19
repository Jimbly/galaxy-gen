import * as assert from 'assert';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import * as express from 'express';
import * as express_static_gzip from 'express-static-gzip';
import { permTokenWorkerInit } from 'glov/server/perm_token_worker';
import {
  requestLogEverything,
  setupRequestHeaders,
} from 'glov/server/request_utils';
import * as glov_server from 'glov/server/server';
import minimist from 'minimist';

const argv = minimist(process.argv.slice(2));

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
if (argv.requestlog) {
  requestLogEverything(app);
}
setupRequestHeaders(app, {
  dev: argv.dev,
  allow_map: true,
});

function isDiscord(headers) {
  return headers.referrer && headers.referrer.includes('discord') ||
    headers['cf-worker'] && headers['cf-worker'].includes('discord');
}

if (argv.dev) {
  // In dev, `index.html` is unhashed, but we need to serve the hashed version
  //   to the Discord proxy, otherwise it'll never load the new files
  app.get('/', function (req, res, next) {
    if (isDiscord(req.headers)) {
      assert(req.url.startsWith('/'));
      req.url = `/index_hashed.html${req.url.slice(1)}`;
    }
    next();
  });
}

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
