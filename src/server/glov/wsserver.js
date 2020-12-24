// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

const ack = require('../../common/ack.js');
const { ackInitReceiver, ackWrapPakFinish, ackWrapPakPayload } = ack;
const assert = require('assert');
const events = require('../../common/tiny-events.js');
const { logEx } = require('./log.js');
const { isPacket } = require('../../common/packet.js');
const { packetLog, packetLogInit } = require('./packet_log.js');
const querystring = require('querystring');
const { ipFromRequest } = require('./request_utils.js');
const util = require('../../common/util.js');
const url = require('url');
const wscommon = require('../../common/wscommon.js');
const { wsHandleMessage, wsPak, wsPakSendDest } = wscommon;
const WebSocket = require('ws');

function WSClient(ws_server, socket) {
  events.EventEmitter.call(this);
  this.ws_server = ws_server;
  this.socket = socket;
  this.id = ++ws_server.last_client_id;
  this.secret = Math.ceil(Math.random() * 1e10).toString();
  this.addr = ipFromRequest(socket.handshake);
  if (socket.handshake.headers) {
    this.user_agent = socket.handshake.headers['user-agent'];
    this.origin = socket.handshake.headers.origin;
  }
  this.handlers = ws_server.handlers; // reference, not copy!
  this.connected = true;
  this.disconnected = false;
  this.last_receive_time = Date.now();
  this.idle_counter = 0;
  this.last_client = null; // Last client to have had a message dispatched
  ackInitReceiver(this);
  ws_server.clients[this.id] = this;
  this.logPacketDispatch = ws_server.logPacketDispatch.bind(ws_server);
}
util.inherits(WSClient, events.EventEmitter);

WSClient.prototype.ctx = function () {
  let user_id = this.client_channel && this.client_channel.log_user_id || undefined;
  return {
    client: this.client_id,
    ip: this.addr,
    user_id,
  };
};

WSClient.prototype.logCtx = function (level, ...args) {
  let ctx = this.ctx();
  logEx(ctx, level, `WSClient:${this.client_id}(${ctx.user_id || ''})`, ...args);
};

WSClient.prototype.log = function (...args) {
  this.logCtx('info', ...args);
};

WSClient.prototype.onError = function (e) {
  this.ws_server.emit('error', e);
};

WSClient.prototype.onClose = function () {
  let client = this;
  if (!client.connected) {
    return;
  }
  let ws_server = client.ws_server;
  client.connected = false;
  client.disconnected = true;
  delete ws_server.clients[client.id];
  this.log(`disconnected (${Object.keys(ws_server.clients).length} clients connected)`);
  ack.failAll(client); // Should this be before or after other disconnect events?
  client.emit('disconnect');
  ws_server.emit('disconnect', client);
};

WSClient.prototype.send = wscommon.sendMessage;

WSClient.prototype.pak = function (msg, ref_pak) {
  return wsPak(msg, ref_pak, this);
};

function WSServer() {
  events.EventEmitter.call(this);
  this.wss = null;
  this.last_client_id = 0;
  this.clients = Object.create(null);
  this.handlers = {};
  this.restarting = undefined;
  this.app_ver = 0;
  this.restart_filter = null;
  this.onMsg('ping', util.nop);
  packetLogInit(this);
}
util.inherits(WSServer, events.EventEmitter);

WSServer.prototype.logPacketDispatch = packetLog;

// `filter` returns true if message is allowed while shutting down
WSServer.prototype.setRestartFilter = function (filter) {
  this.restart_filter = filter;
};

// cb(client, data, resp_func)
WSServer.prototype.onMsg = function (msg, cb) {
  assert.ok(!this.handlers[msg]);
  this.handlers[msg] = cb;
};

WSServer.prototype.init = function (server, server_https) {
  let ws_server = this;
  ws_server.wss = new WebSocket.Server({ noServer: true });

  // Doing my own upgrade handling to early-reject invalid protocol versions
  let onUpgrade = (req, socket, head) => {
    let query = querystring.parse(url.parse(req.url).query);
    if (!query.pver || String(query.pver) !== wscommon.PROTOCOL_VERSION) {
      logEx({
        ip: ipFromRequest(req),
      }, 'info', `WS Client rejected (bad pver) from ${ipFromRequest(req)}: ${req.url}`);
      socket.write('HTTP/1.1 400 Invalid Protocol\r\n\r\n');
      socket.end();
      socket.destroy();
      return;
    }

    ws_server.wss.handleUpgrade(req, socket, head, function done(ws) {
      ws_server.wss.emit('connection', ws, req);
    });
  };
  server.on('upgrade', onUpgrade);
  ws_server.http_servers = [server];
  if (server_https) {
    ws_server.http_servers.push(server_https);
    server_https.on('upgrade', onUpgrade);
  }

  ws_server.wss.on('connection', (socket, req) => {
    socket.handshake = req;
    let client = new WSClient(ws_server, socket);

    socket.on('close', function () {
      // disable this for testing
      client.onClose();
    });
    socket.on('message', function (data) {
      if (client.disconnected) {
        // message received after disconnect!
        // ignore
        client.log('ignoring message received after disconnect');
      } else {
        ws_server.last_client = client;
        try {
          wsHandleMessage(client, data, ws_server.restarting && ws_server.restart_filter);
        } catch (e) {
          e.source = client.ctx();
          client.logCtx('error', `Exception "${e}" while handling packet from`, e.source);
          client.logCtx('error', `Packet data (base64) = ${data.toString('base64', 0, 1000000)}`);
          client.logCtx('error', `Packet data (utf8,1K) = ${JSON.stringify(data.toString('utf8', 0, 1000))}`);
          ws_server.emit('uncaught_exception', e);
        }
      }
    });
    socket.on('error', function (e) {
      // Not sure this exists on `ws`
      client.onError(e);
    });
    ws_server.emit('client', client);

    // log and send cack after the .emit('client') has a chance to set client.client_id
    client.client_id = client.client_id || client.id;

    client.log(`connected to ${req.url} from ${client.addr}` +
      ` (${Object.keys(ws_server.clients).length} clients connected)`,
    {
      ua: client.user_agent,
      origin: client.origin,
      url: req.url,
    });

    client.send('cack', {
      id: client.client_id,
      secret: client.secret,
      app_ver: this.app_ver,
      time: Date.now(),
      restarting: ws_server.restarting,
    });

    let query = querystring.parse(url.parse(req.url).query);
    let reconnect_id = Number(query.reconnect);
    if (reconnect_id) {
      // we're reconnecting an existing client, immediately disconnect the old one
      let old_client = ws_server.clients[reconnect_id];
      if (old_client) {
        if (old_client.secret === query.secret) {
          old_client.log('being replaced by reconnect, disconnecting...');
          this.disconnectClient(old_client);
        } else {
          client.log(`requested disconnect of Client ${reconnect_id} with incorrect secret, ignoring`);
        }
      }
    }
  });

  this.check_timeouts_fn = this.checkTimeouts.bind(this);
  setTimeout(this.check_timeouts_fn, wscommon.CONNECTION_TIMEOUT / 4);
};

WSServer.prototype.disconnectClient = function (client) {
  try {
    client.socket.close();
  } catch (err) {
    // ignore
  }
  client.onClose();
};

WSServer.prototype.checkTimeouts = function () {
  for (let client_id in this.clients) {
    let client = this.clients[client_id];
    client.idle_counter++;
    if (client.idle_counter === 5) {
      client.log('timed out, disconnecting...');
      this.disconnectClient(client);
    }
  }
  setTimeout(this.check_timeouts_fn, wscommon.CONNECTION_TIMEOUT / 4);
};

WSServer.prototype.close = function () {
  for (let client_id in this.clients) {
    let client = this.clients[client_id];
    this.disconnectClient(client);
  }
  for (let ii = 0; ii < this.http_servers.length; ++ii) {
    this.http_servers[ii].close();
  }
};

// Must be a ready-to-send packet created with .pak, not just the payload
WSServer.prototype.broadcastPacket = function (pak) {
  let ws_server = this;
  let num_sent = 0;
  assert(isPacket(pak)); // And should have been created with pak()
  ackWrapPakFinish(pak);
  for (let client_id in ws_server.clients) {
    if (ws_server.clients[client_id]) {
      let client = ws_server.clients[client_id];
      pak.ref();
      wsPakSendDest(client, pak);
      ++num_sent;
    }
  }
  pak.pool();
  return num_sent;
};

WSServer.prototype.broadcast = function (msg, data) {
  assert(!isPacket(data));
  let pak = wsPak(msg);
  ackWrapPakPayload(pak, data);
  return this.broadcastPacket(pak);
};

WSServer.prototype.setAppVer = function (ver) {
  this.app_ver = ver;
};

export function isClient(obj) {
  return obj instanceof WSClient;
}

WSServer.prototype.isClient = isClient;

WSServer.prototype.pak = wsPak;

export function create(...args) {
  let ret = new WSServer();
  ret.init(...args);
  return ret;
}
