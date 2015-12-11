// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

const argv = require('minimist')(process.argv.slice(2));
const assert = require('assert');
const data_store = require('./data_store.js');
const data_store_image = require('./data_store_image.js');
const data_store_limited = require('./data_store_limited.js');
const data_store_mirror = require('./data_store_mirror.js');
const data_store_shield = require('./data_store_shield.js');
const glov_exchange = require('./exchange.js');
const glov_channel_server = require('./channel_server.js');
const fs = require('fs');
const log = require('./log.js');
const metrics = require('./metrics.js');
const path = require('path');
const packet = require('../../common/packet.js');
const { serverConfig } = require('./server_config.js');
const glov_wsserver = require('./wsserver.js');
const glov_wscommon = require('../../common/wscommon.js');

const STATUS_TIME = 5000;
const FILE_CHANGE_POLL = 16;
const FILE_CHANGE_STABLE = 150;
export let ws_server;
export let channel_server;

let last_status = '';
function displayStatus() {
  setTimeout(displayStatus, STATUS_TIME);
  let status = channel_server.getStatus();
  if (status !== last_status) {
    console.info('STATUS', new Date().toISOString(), status);
    last_status = status;
  }
}

let last_version = {};
function updateVersion(base_name, is_startup) {
  let version_file_name = path.join(__dirname, `../../client/${base_name}.ver.json`);
  fs.readFile(version_file_name, function (err, data) {
    if (err) {
      // ignore, probably being written to
      return;
    }
    let obj;
    try {
      obj = JSON.parse(data);
    } catch (e) {
      return;
    }
    if (!obj || !obj.ver) {
      return;
    }
    let old_version = last_version[base_name];
    if (old_version === obj.ver) {
      return;
    }
    console.info(`Version for "${base_name}"${old_version ? ' changed to' : ''}: ${obj.ver}`);
    last_version[base_name] = obj.ver;
    if (base_name === 'app') {
      ws_server.setAppVer(obj.ver);
      if (!is_startup) {
        // Do a broadcast message so people get a few seconds of warning
        ws_server.broadcast('chat_broadcast', {
          src: 'system',
          msg: 'New client version deployed, reloading momentarily...'
        });
        if (argv.dev) {
          // immediate
          ws_server.broadcast('app_ver', last_version.app);
        } else {
          // delay by 15 seconds, the server may also be about to be restarted
          setTimeout(function () {
            ws_server.broadcast('app_ver', last_version.app);
          }, 15000);
        }
      }
    }
  });
}

function waitForAccess(filename, cb) {
  // Really this should just use _sopen_s() w/ _SH_DENYRW, but that seems totally inaccessible from Node :(
  let first = true;
  let last_stats;
  let last_change = Date.now();
  let err_count = 0;
  function check() {
    fs.stat(filename, function (err, stats) {
      let now = Date.now();
      if (err) {
        ++err_count;
        if (err_count > 50) {
          // give up
          console.error(`Too many errors waiting for ${filename} to finish writing, giving up`);
          return void cb();
        }
      } else {
        err_count = 0;
      }
      let unchanged = false;
      if (!first) {
        unchanged = last_stats && stats &&
          last_stats.mtime.getTime() === stats.mtime.getTime() &&
          last_stats.size === stats.size;
        if (unchanged && now - last_change > FILE_CHANGE_STABLE) {
          return void cb();
        }
      }
      first = false;
      last_stats = stats;
      if (!unchanged) {
        last_change = now;
      }
      // Two timeouts, ensure main loop gets to tick
      setTimeout(function () {
        setTimeout(check, FILE_CHANGE_POLL);
      }, FILE_CHANGE_POLL);
    });
  }
  setTimeout(check, FILE_CHANGE_POLL);
}

export function startup(params) {
  log.startup();
  assert(params.server);
  if (params.pver) {
    glov_wscommon.PROTOCOL_VERSION = params.pver;
  }

  let { data_stores, exchange, metrics_impl } = params;
  if (!data_stores) {
    data_stores = {};
  }
  let server_config = serverConfig();

  // Meta and bulk stores
  if (!data_stores.meta) {
    data_stores.meta = data_store.create('data_store');
  } else if (server_config.do_mirror) {
    if (data_stores.meta) {
      if (server_config.local_authoritative === false) {
        console.log('[DATASTORE] Mirroring meta store (cloud authoritative)');
        data_stores.meta = data_store_mirror.create({
          read_check: true,
          readwrite: data_stores.meta,
          write: data_store.create('data_store'),
        });
      } else {
        console.log('[DATASTORE] Mirroring meta store (local authoritative)');
        data_stores.meta = data_store_mirror.create({
          read_check: true,
          readwrite: data_store.create('data_store'),
          write: data_stores.meta,
        });
      }
    }
  }
  if (!data_stores.bulk) {
    data_stores.bulk = data_store.create('data_store/bulk');
    if (argv.dev) {
      data_stores.bulk = data_store_limited.create(data_stores.bulk, 1000, 1000, 250);
    }
  } else if (server_config.do_mirror) {
    if (data_stores.bulk) {
      if (server_config.local_authoritative === false) {
        console.log('[DATASTORE] Mirroring bulk store (cloud authoritative)');
        data_stores.bulk = data_store_mirror.create({
          read_check: true,
          readwrite: data_stores.bulk,
          write: data_store.create('data_store/bulk'),
        });
      } else {
        console.log('[DATASTORE] Mirroring bulk store (local authoritative)');
        data_stores.bulk = data_store_mirror.create({
          read_check: true,
          readwrite: data_store.create('data_store/bulk'),
          write: data_stores.bulk,
        });
      }
    }
  }
  if (server_config.do_shield) {
    console.log('[DATASTORE] Applying shield layer to bulk and meta stores');
    data_stores.meta = data_store_shield.create(data_stores.meta, { label: 'meta' });
    data_stores.bulk = data_store_shield.create(data_stores.bulk, { label: 'bulk' });
  }

  // Image data store is a different API, not supporting mirror/shield for now
  if (data_stores.image === undefined) {
    data_stores.image = data_store_image.create('data_store/public', 'upload');
  }

  if (metrics_impl) {
    metrics.init(metrics_impl);
  }

  if (!exchange) {
    exchange = glov_exchange.create();
  }
  channel_server = glov_channel_server.create();
  if (argv.dev) {
    console.log('PacketDebug: ON');
    packet.default_flags = packet.PACKET_DEBUG;
  }
  if (server_config.log && server_config.log.load_log) {
    channel_server.load_log = true;
  }

  ws_server = glov_wsserver.create(params.server, params.server_https);
  ws_server.on('error', function (error) {
    console.error('Unhandled WSServer error:', error);
    let text = String(error);
    if (text.indexOf('Invalid WebSocket frame: RSV1 must be clear') !== -1) {
      // Log, but don't broadcast or write crash dump
      console.error('ERROR (no dump)', new Date().toISOString(), error);
    } else {
      channel_server.handleUncaughtError(error);
    }
  });

  channel_server.init({
    exchange,
    data_stores,
    ws_server,
    is_master: argv.master,
  });

  process.on('SIGTERM', channel_server.forceShutdown.bind(channel_server));
  process.on('uncaughtException', channel_server.handleUncaughtError.bind(channel_server));
  ws_server.on('uncaught_exception', channel_server.handleUncaughtError.bind(channel_server));

  setTimeout(displayStatus, STATUS_TIME);

  let deferred_file_changes = {};
  fs.watch(path.join(__dirname, '../../client/'), { recursive: true }, function (eventType, filename) {
    if (!filename) {
      return;
    }
    filename = filename.replace(/\\/g, '/');
    let m = filename.match(/(.*)\.ver\.json$/);
    if (!m) {
      // not a version file
      if (argv.dev) {
        // send a dynamic reload message
        if (deferred_file_changes[filename]) {
          // console.log(`File changed: ${filename} (already waiting)`);
        } else {
          // console.log(`File changed: ${filename} (starting waiting)`);
          deferred_file_changes[filename] = true;
          waitForAccess(path.join(__dirname, '../../client', filename), function () {
            console.log(`File changed: ${filename}`);
            delete deferred_file_changes[filename];
            ws_server.broadcast('filewatch', filename);
          });
        }
      }
      return;
    }
    let file_base_name = m[1]; // e.g. 'app' or 'worker'
    updateVersion(file_base_name);
  });
  updateVersion('app', true);
}

export function panic(...message) {
  if (message && message.length === 1 && message[0] instanceof Error) {
    console.error(message[0]);
  } else {
    console.error(...message); // Log all parameters
    console.error(new Error(message)); // So Stackdriver error reporting catches it
  }
  console.error('Process exiting due to panic');
  process.stderr.write(String(message), () => {
    console.error('Process exiting due to panic (2)'); // May not be seen due to buffering, but useful if it is seen
    process.exit(1);
  });
  throw new Error('panic'); // ensure calling code does not continue
}
