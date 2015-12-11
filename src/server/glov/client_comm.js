// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

const assert = require('assert');
const {
  chunkedReceiverCleanup,
  chunkedReceiverFinish,
  chunkedReceiverInit,
  chunkedReceiverOnChunk,
  chunkedReceiverStart,
} = require('../../common/chunked_send.js');
const client_worker = require('./client_worker.js');
const createHmac = require('crypto').createHmac;
const { channelServerPak, channelServerSend, quietMessage } = require('./channel_server.js');
const { regex_valid_username } = require('./default_workers.js');
const fs = require('fs');
const { isPacket } = require('../../common/packet.js');
const { logdata } = require('../../common/util.js');
const { isProfane, profanityCommonStartup } = require('../../common/words/profanity_common.js');
const random_names = require('./random_names.js');
const { serverConfig } = require('./server_config.js');

// combined size of all chunked sends at any given time
const MAX_CLIENT_UPLOAD_SIZE = 1*1024*1024;

// Note: this object is both filtering wsclient -> wsserver messages and client->channel messages
let ALLOWED_DURING_RESTART = Object.create(null);
ALLOWED_DURING_RESTART.login = true; // filtered at lower level
ALLOWED_DURING_RESTART.logout = true; // always allow
ALLOWED_DURING_RESTART.channel_msg = true; // filtered at lower level
ALLOWED_DURING_RESTART.chat = true;

let channel_server;


function restartFilter(client, msg, data) {
  if (client && client.client_channel && client.client_channel.ids && client.client_channel.ids.sysadmin) {
    return true;
  }
  if (ALLOWED_DURING_RESTART[msg]) {
    return true;
  }
  return false;
}

function onUnSubscribe(client, channel_id) {
  client.client_channel.unsubscribeOther(channel_id);
}

function uploadCleanup(client) {
  if (client.chunked) {
    chunkedReceiverCleanup(client.chunked);
    delete client.chunked;
  }
}

function onClientDisconnect(client) {
  uploadCleanup(client);
  client.client_channel.unsubscribeAll();
  client.client_channel.shutdownImmediate();
}

function onSubscribe(client, channel_id, resp_func) {
  client.client_channel.logDest(channel_id, 'debug', 'subscribe');
  client.client_channel.subscribeOther(channel_id, ['*'], resp_func);
}

function onSetChannelData(client, pak, resp_func) {
  assert(isPacket(pak));
  let channel_id = pak.readAnsiString();
  assert(channel_id);
  let q = pak.readBool();
  let key = pak.readAnsiString();
  let keyparts = key.split('.');
  if (keyparts[0] !== 'public' && keyparts[0] !== 'private') {
    client.client_channel.logCtx('error', ` - failed, invalid scope: ${keyparts[0]}`);
    resp_func('failed: invalid scope');
    pak.pool();
    return;
  }
  if (!keyparts[1]) {
    client.client_channel.logCtx('error', ' - failed, missing member name');
    resp_func('failed: missing member name');
    pak.pool();
    return;
  }

  // TODO: Disable autocreate for this call?
  // TODO: Error if channel does not exist, but do not require an ack? channelServerSend needs a simple "sent" ack?

  let client_channel = client.client_channel;

  if (!client_channel.isSubscribedTo(channel_id)) {
    pak.pool();
    return void resp_func(`Client is not on channel ${channel_id}`);
  }

  client_channel.ids = client_channel.ids_direct;
  let outpak = channelServerPak(client_channel, channel_id, 'set_channel_data', pak, q);
  outpak.writeBool(q);
  outpak.writeAnsiString(key);
  outpak.appendRemaining(pak);
  outpak.send();
  client_channel.ids = client_channel.ids_base;
  resp_func();
}

function applyCustomIds(ids, user_data_public) {
  // FRVR - maybe generalize this
  let perm = user_data_public.permissions;
  delete ids.sysadmin;
  delete ids.elevated;
  if (perm) {
    if (perm.sysadmin) {
      ids.sysadmin = 1;
    }
  }
}

const nop_pool = {
  pool: function () {
    // No-op
  },
};

function onChannelMsg(client, data, resp_func) {
  // Arbitrary messages
  let channel_id;
  let msg;
  let payload;
  let is_packet = isPacket(data);
  let log;
  let pool = nop_pool;
  if (is_packet) {
    let pak = data;
    pak.ref(); // deal with auto-pool of an empty packet
    channel_id = pak.readAnsiString();
    msg = pak.readAnsiString();
    if (!pak.ended()) {
      pool = pak;
    }
    // let flags = pak.readInt();
    payload = pak;
    log = '(pak)';
  } else {
    if (typeof data !== 'object') {
      return void resp_func('Invalid data type');
    }
    channel_id = data.channel_id;
    msg = data.msg;
    payload = data.data;
    log = logdata(payload);
  }
  if (channel_server.restarting) {
    if (!restartFilter(client, msg, data)) {
      return;
    }
  }
  if (quietMessage(msg, payload)) {
    if (!is_packet && typeof payload === 'object') {
      payload.q = 1; // do not print later, either
    }
  } else {
    client.client_channel.logDest(channel_id, 'debug', `channel_msg ${msg} ${log}`);
  }
  if (!channel_id) {
    pool.pool();
    return void resp_func('Missing channel_id');
  }
  let client_channel = client.client_channel;

  if (!client_channel.isSubscribedTo(channel_id)) {
    pool.pool();
    return void resp_func(`Client is not on channel ${channel_id}`);
  }
  if (!resp_func.expecting_response) {
    resp_func = null;
  }
  let old_resp_func = resp_func;
  resp_func = function (err, resp_data) {
    if (err && err !== 'ERR_FAILALL_DISCONNECT') { // Was previously not logging on cmd_parse packets to
      client.log(`Error "${err}" sent from ${channel_id} to client in response to ${
        msg} ${is_packet ? '(pak)' : logdata(payload)}`);
    }
    if (old_resp_func) {
      old_resp_func(err, resp_data);
    }
  };
  resp_func.expecting_response = Boolean(old_resp_func);
  client_channel.ids = client_channel.ids_direct;
  channelServerSend(client_channel, channel_id, msg, null, payload, resp_func, true); // quiet since we already logged
  client_channel.ids = client_channel.ids_base;
  pool.pool();
}

const invalid_names = {
  constructor: 1,
  hasownproperty: 1,
  isprototypeof: 1,
  propertyisenumerable: 1,
  tolocalestring: 1,
  tostring: 1,
  valueof: 1,
  admin: 1,
  sysadmin: 1,
  sysop: 1,
  gm: 1,
  mod: 1,
  moderator: 1,
  default: 1,
  all: 1,
  everyone: 1,
  anonymous: 1,
  public: 1,
  clear: 1,
  wipe: 1,
  reset: 1,
  password: 1,
  server: 1,
  system: 1,
  internal: 1,
  error: 1,
  info: 1,
  user: 1,
};
const regex_admin_username = /^(admin|mod_|gm_|moderator)/; // Might exist in the system, do not allow to be created
function validUsername(user_id, allow_admin) {
  if (!user_id) {
    return false;
  }
  if ({}[user_id]) {
    // hasOwnProperty, etc
    return false;
  }
  user_id = user_id.toLowerCase();
  if (invalid_names[user_id]) {
    // also catches anything on Object.prototype
    return false;
  }
  if (!allow_admin && user_id.match(regex_admin_username)) {
    return false;
  }
  if (!user_id.match(regex_valid_username)) {
    // has a "." or other invalid character
    return false;
  }
  if (isProfane(user_id)) {
    return false;
  }
  return true;
}

function handleLoginResponse(message, client, user_id, resp_func, err, resp_data) {
  let client_channel = client.client_channel;
  assert(client_channel);

  if (client_channel.ids.user_id) {
    // Logged in while processing the response?
    client.client_channel.logCtx('info', `${message} failed: Already logged in`);
    return resp_func('Already logged in');
  }

  if (err) {
    client.client_channel.logCtx('info', `${message} failed: ${err}`);
  } else {
    client_channel.ids_base.user_id = user_id;
    client_channel.ids_base.display_name = resp_data.display_name;
    client_channel.log_user_id = user_id;
    applyCustomIds(client_channel.ids, resp_data);
    client.client_channel.logCtx('info', `${message} success: logged in as ${user_id}`, { ip: client.addr });

    // Tell channels we have a new user id/display name
    for (let channel_id in client_channel.subscribe_counts) {
      channelServerSend(client_channel, channel_id, 'client_changed');
    }

    // Always subscribe client to own user
    onSubscribe(client, `user.${user_id}`);
  }
  return resp_func(err, client_channel.ids); // user_id and display_name
}

function onLogin(client, data, resp_func) {
  client.client_channel.logCtx('info', `login ${logdata(data)}`, { ip: client.addr });
  let user_id = data.user_id;
  if (!validUsername(user_id, true)) {
    client.client_channel.logCtx('info', 'login failed: Invalid username');
    return resp_func('Invalid username');
  }
  user_id = user_id.toLowerCase();

  let client_channel = client.client_channel;
  assert(client_channel);

  return channelServerSend(client_channel, `user.${user_id}`, 'login', null, {
    display_name: data.display_name || data.user_id, // original-case'd name
    password: data.password,
    salt: client.secret,
    ip: client.addr,
    ua: client.user_agent,
  }, handleLoginResponse.bind(null, 'login', client, user_id, resp_func));
}

let facebook_access_token;
function onLoginFacebook(client, data, resp_func) {
  client.client_channel.logCtx('info', `login_facebook ${logdata(data)}`);
  assert(facebook_access_token, 'Missing facebook.access_token in config/server.json');

  const signatureComponent = data.signature.split('.');
  // buffer supports base64url
  const signature = Buffer.from(signatureComponent[0], 'base64').toString('hex');
  const generated_signature = createHmac('sha256', facebook_access_token).update(signatureComponent[1]).digest('hex');
  if (generated_signature === signature) {
    const payload = JSON.parse(Buffer.from(signatureComponent[1], 'base64').toString('utf8'));
    let user_id = `fb$${payload.player_id}`;
    client.client_channel.logCtx('info', `login_facebook ${user_id} success ${logdata(payload)}`);

    let client_channel = client.client_channel;
    assert(client_channel);

    return channelServerSend(client_channel, `user.${user_id}`, 'login_facebook', null, {
      display_name: data.display_name,
      ip: client.addr,
      ua: client.user_agent,
    }, handleLoginResponse.bind(null, 'login_facebook', client, user_id, resp_func));

  } else {
    client.client_channel.logCtx('info', 'login_facebook auth failed', generated_signature, signature);
    return resp_func('Auth Failed');
  }
}

function onUserCreate(client, data, resp_func) {
  client.client_channel.logCtx('info', `user_create ${logdata(data)}`);
  let user_id = data.user_id;
  if (!validUsername(user_id)) {
    client.client_channel.logCtx('info', 'user_create failed: Invalid username');
    return resp_func('Invalid username');
  }
  user_id = user_id.toLowerCase();

  let client_channel = client.client_channel;
  assert(client_channel);

  if (client_channel.ids.user_id) {
    client.client_channel.logCtx('info', 'user_create failed: Already logged in');
    return resp_func('Already logged in');
  }

  return channelServerSend(client_channel, `user.${user_id}`, 'create', null, {
    display_name: data.display_name || data.user_id, // original-case'd name
    password: data.password,
    email: data.email,
    ip: client.addr,
    ua: client.user_agent,
  }, handleLoginResponse.bind(null, 'user_create', client, user_id, resp_func));
}

function onLogOut(client, data, resp_func) {
  let client_channel = client.client_channel;
  assert(client_channel);
  let { user_id } = client_channel.ids;
  client.client_channel.logCtx('info', `logout ${user_id}`);
  if (!user_id) {
    return resp_func('ERR_NOT_LOGGED_IN');
  }

  onUnSubscribe(client, `user.${user_id}`);
  delete client_channel.ids_base.user_id;
  delete client_channel.ids_base.display_name;
  delete client_channel.ids_base.sysadmin;
  client_channel.log_user_id = null;

  // Tell channels we have a new user id/display name
  for (let channel_id in client_channel.subscribe_counts) {
    channelServerSend(client_channel, channel_id, 'client_changed');
  }

  return resp_func();
}

function onRandomName(client, data, resp_func) {
  return resp_func(null, random_names.get());
}

function onLog(client, data, resp_func) {
  let client_channel = client.client_channel;
  data.user_id = client_channel.ids.user_id;
  data.display_name = client_channel.ids.display_name;
  client.client_channel.logCtx('info', 'server_log', data);
  resp_func();
}

function uploadOnStart(client, pak, resp_func) {
  if (!client.chunked) {
    client.chunked = chunkedReceiverInit(`client_id:${client.id}`, MAX_CLIENT_UPLOAD_SIZE);
  }
  chunkedReceiverStart(client.chunked, pak, resp_func);
}

function uploadOnChunk(client, pak, resp_func) {
  chunkedReceiverOnChunk(client.chunked, pak, resp_func);
}

function uploadOnFinish(client, pak, resp_func) {
  chunkedReceiverFinish(client.chunked, pak, resp_func);
}

function onGetStats(client, data, resp_func) {
  resp_func(null, { ccu: channel_server.master_stats.num_channels.client || 1 });
}

function onCmdParseAuto(client, pak, resp_func) {
  let cmd = pak.readString();
  let { client_channel } = client;
  client_channel.cmdParseAuto({ cmd }, (err, resp) => {
    resp_func(err, resp ? resp.resp : null);
  });
}

export function init(channel_server_in) {
  profanityCommonStartup(fs.readFileSync(`${__dirname}/../../common/words/filter.gkg`, 'utf8'));

  channel_server = channel_server_in;
  let ws_server = channel_server.ws_server;
  ws_server.on('client', (client) => {
    let client_id = channel_server.clientIdFromWSClient(client);
    client.client_id = client_id;
    client.client_channel = channel_server.createChannelLocal(`client.${client_id}`);
    client.client_channel.client = client;
  });
  ws_server.on('disconnect', onClientDisconnect);
  ws_server.onMsg('subscribe', onSubscribe);
  ws_server.onMsg('unsubscribe', onUnSubscribe);
  ws_server.onMsg('set_channel_data', onSetChannelData);
  ws_server.onMsg('channel_msg', onChannelMsg);
  ws_server.onMsg('login', onLogin);
  ws_server.onMsg('login_facebook', onLoginFacebook);
  ws_server.onMsg('user_create', onUserCreate);
  ws_server.onMsg('logout', onLogOut);
  ws_server.onMsg('random_name', onRandomName);
  ws_server.onMsg('log', onLog);
  ws_server.onMsg('get_stats', onGetStats);
  ws_server.onMsg('cmd_parse_auto', onCmdParseAuto);

  ws_server.onMsg('upload_start', uploadOnStart);
  ws_server.onMsg('upload_chunk', uploadOnChunk);
  ws_server.onMsg('upload_finish', uploadOnFinish);

  ws_server.setRestartFilter(restartFilter);

  facebook_access_token = process.env.FACEBOOK_ACCESS_TOKEN ||
    serverConfig().facebook && serverConfig().facebook.access_token;

  client_worker.init(channel_server);
}
