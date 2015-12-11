// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT
/* global WebSocket, XMLHttpRequest */

const ack = require('../../common/ack.js');
const { ackInitReceiver } = ack;
const assert = require('assert');
const { errorReportSetDetails } = require('./error_report.js');
const { min } = Math;
const urlhash = require('./urlhash.js');
const walltime = require('./walltime.js');
const wscommon = require('../../common/wscommon.js');
const { wsHandleMessage } = wscommon;

// let net_time = 0;
// export function getNetTime() {
//   let r = net_time;
//   net_time = 0;
//   return r;
// }

export function WSClient(path) {
  this.id = null;
  this.my_ids = {}; // set of all IDs I've been during this session
  this.handlers = {};
  this.socket = null;
  this.connected = false;
  this.disconnected = false;
  this.retry_scheduled = false;
  this.retry_count = 0;
  this.disconnect_time = Date.now();
  this.last_receive_time = Date.now();
  this.idle_counter = 0;
  this.last_send_time = Date.now();
  this.auto_path = !path;
  ackInitReceiver(this);

  if (this.auto_path) {

    path = document.location.toString().match(/^[^#?]+/)[0]; // remove search and anchor


    if (path.slice(-1) !== '/') {
      // /file.html or /path/file.html or /path
      let idx = path.lastIndexOf('/');
      if (idx !== -1) {
        let filename = path.slice(idx+1);
        if (filename.indexOf('.') !== -1) {
          path = path.slice(0, idx+1);
        } else {
          path += '/';
        }
      } else {
        path += '/';
      }
    }
    path = path.replace(/^http/, 'ws');
    this.path = `${path}ws`;

  } else {
    this.path = path;
  }

  if (path.match(/:\d+\//)) {
    // has port, don't try anything fancy
    this.path2 = this.path;
  } else if (path.match(/^ws:/)) {
    // no port, try wss:// if this fails
    // Should fix Comcast injection issue
    this.path2 = this.path.replace(/^ws:/, 'wss:');
  } else {
    // Using wss:// some browsers will not allow connecting to ws://, so don't even try
    this.path2 = this.path;
  }

  this.connect(false);

  this.onMsg('cack', this.onConnectAck.bind(this));
  this.onMsg('app_ver', this.onAppVer.bind(this));
  this.onMsg('error', this.onError.bind(this));
}

WSClient.prototype.timeSinceDisconnect = function () {
  return Date.now() - this.disconnect_time;
};

WSClient.prototype.onAppVer = function (ver) {
  if (ver !== BUILD_TIMESTAMP) {
    if (this.on_app_ver_mismatch) {
      this.on_app_ver_mismatch();
    } else {
      if (this.auto_path) {
        console.error(`App version mismatch (server: ${ver}, client: ${BUILD_TIMESTAMP}), reloading`);
        if (window.reloadSafe) {
          window.reloadSafe();
        } else {
          document.location.reload();
        }
      } else {
        console.warn(`App version mismatch (server: ${ver}, client: ${BUILD_TIMESTAMP}), ignoring`);
      }
    }
  }
};

WSClient.prototype.onConnectAck = function (data, resp_func) {
  let client = this;
  walltime.sync(data.time);
  client.connected = true;
  client.disconnected = false;
  client.id = data.id;
  client.my_ids[data.id] = true;
  errorReportSetDetails('client_id', client.id);
  client.secret = data.secret;
  if (data.app_ver) {
    client.onAppVer(data.app_ver);
  }
  // Fire user-level connect handler as well
  assert(client.handlers.connect);
  client.handlers.connect(client, {
    client_id: client.id,
    restarting: data.restarting,
  });
  resp_func();
};


WSClient.prototype.pak = function (msg) {
  return wscommon.wsPak(msg, null, this);
};

WSClient.prototype.send = function (msg, data, resp_func) {
  wscommon.sendMessage.call(this, msg, data, resp_func);
};

WSClient.prototype.onError = function (e) {
  console.error('WSClient Error');
  console.error(e);
  throw e;
};

// cb(client, data, resp_func)
WSClient.prototype.onMsg = function (msg, cb) {
  assert.ok(!this.handlers[msg]);
  this.handlers[msg] = function wrappedCallback(client, data, resp_func) {
    // Client interface does not need a client passed to it!
    return cb(data, resp_func);
  };
};

WSClient.prototype.checkForNewAppVersion = function () {
  if (this.app_ver_check_in_progress) {
    return;
  }
  this.app_ver_check_in_progress = true;
  let xhr = new XMLHttpRequest();
  xhr.open('GET', `${urlhash.getURLBase()}app.ver.json`, true);
  // xhr.responseType = 'json'; // causes un-catchable, un-reported errors
  xhr.onload = () => {
    this.app_ver_check_in_progress = false;
    let text;
    try {
      text = xhr.responseText;
      let obj = JSON.parse(text);
      if (obj && obj.ver) {
        this.onAppVer(obj.ver);
      }
    } catch (e) {
      console.error('Received invalid response when checking app version:', text || '<empty response>');
      // Probably internal server error or such as the server is restart, try again momentarily
      // This is not triggered on connection errors, only if we got a (non-parseable) response from the server
      if (!this.delayed_recheck) {
        this.delayed_recheck = true;
        setTimeout(() => {
          this.delayed_recheck = false;
          this.checkForNewAppVersion();
        }, 1000);
      }
    }
  };
  xhr.onerror = () => {
    this.app_ver_check_in_progress = false;
  };
  xhr.send(null);
};

WSClient.prototype.retryConnection = function () {
  let client = this;
  assert(!client.socket);
  assert(!client.retry_scheduled);
  client.retry_scheduled = true;
  ++client.retry_count;
  this.checkForNewAppVersion();
  setTimeout(function () {
    assert(client.retry_scheduled);
    assert(!client.socket);
    client.retry_scheduled = false;
    client.connect(true);
  }, min(client.retry_count * client.retry_count * 100, 15000));
};

WSClient.prototype.checkDisconnect = function () {
  if (this.connected && this.socket.readyState !== 1) { // WebSocket.OPEN
    // We think we're connected, but we're not, we must have received an
    // animation frame before the close event when phone was locked or something
    this.on_close();
    assert(!this.connected);
  }
};

WSClient.prototype.connect = function (for_reconnect) {
  let client = this;

  let path = `${(client.retry_count % 2) ? client.path2 : client.path}?pver=${wscommon.PROTOCOL_VERSION}${
    for_reconnect && client.id && client.secret ? `&reconnect=${client.id}&secret=${client.secret}` : ''
  }`;
  let socket = new WebSocket(path);
  socket.binaryType = 'arraybuffer';
  client.socket = socket;

  // Protect callbacks from ever firing if we've already disconnected this socket
  //   from the WSClient
  function guard(fn) {
    return function (...args) {
      if (client.socket !== socket) {
        return;
      }
      fn(...args);
    };
  }

  function abort(skip_close) {
    client.socket = null;
    if (client.connected) {
      client.disconnect_time = Date.now();
      client.disconnected = true;
      errorReportSetDetails('disconnected', 1);
    }
    client.connected = false;
    if (!skip_close) {
      try {
        socket.close();
      } catch (e) {
        // ignore
      }
    }
    ack.failAll(client);
  }

  function retry(skip_close) {
    abort(skip_close);
    client.retryConnection();
  }

  // Local state, for this one connection
  let connected = false;
  client.socket.addEventListener('error', guard(function (err) {
    if (!connected) {
      console.log('WebSocket error during initial connection, retrying...', err);
      retry();
    } else {
      console.error('WebSocket error', err);
      // Disconnect and reconnect here, is this a terminal error? Probably not, we'll get a 'close' event if it is?
      // We some error occasionally on iOS, not sure what error, but it auto-reconnects fine, so let's
      // not do a throw
      // client.onError(err);
    }
  }));

  client.socket.addEventListener('message', guard(function (message) {
    // net_time -= Date.now();
    assert(message.data instanceof ArrayBuffer);
    wsHandleMessage(client, new Uint8Array(message.data));
    // net_time += Date.now();
  }));

  client.socket.addEventListener('open', guard(function () {
    console.log('WebSocket open');
    connected = true;
    // reset retry count so next retry is fast if we get disconnected
    client.retry_count = 0;
  }));

  // This may get called before the close event gets to use
  client.on_close = guard(function () {
    console.log('WebSocket close, retrying connection...');
    retry(true);
  });
  client.socket.addEventListener('close', client.on_close);

  let doPing = guard(function () {
    if (Date.now() - client.last_send_time > wscommon.PING_TIME && client.connected && client.socket.readyState === 1) {
      client.send('ping');
    }
    setTimeout(doPing, wscommon.PING_TIME);
  });
  setTimeout(doPing, wscommon.PING_TIME);

  // For debugging reconnect handling
  // setTimeout(function () {
  //   if (connected) {
  //     socket.close();
  //   }
  // }, 5000);
};
