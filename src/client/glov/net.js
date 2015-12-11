// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

const { filewatchStartup } = require('./filewatch.js');
const packet = require('../../common/packet.js');
const subscription_manager = require('./subscription_manager.js');
const WSClient = require('./wsclient.js').WSClient;
const wscommon = require('../../common/wscommon.js');

let client;
let subs;

export function init(params) {
  params = params || {};
  if (params.pver) {
    wscommon.PROTOCOL_VERSION = params.pver;
  }
  if (String(document.location).match(/^https?:\/\/localhost/)) {
    console.log('PacketDebug: ON');
    packet.default_flags |= packet.PACKET_DEBUG;
  }
  client = new WSClient(params.path);
  subs = subscription_manager.create(client, params.cmd_parse);
  subs.auto_create_user = Boolean(params.auto_create_user);
  window.subs = subs; // for debugging
  exports.subs = subs;
  exports.client = client;
  filewatchStartup(client);

  if (params.engine) {
    params.engine.addTickFunc((dt) => {
      client.checkDisconnect();
      subs.tick(dt);
    });
  }
}

const build_timestamp_string = new Date(Number(BUILD_TIMESTAMP))
  .toISOString()
  .replace('T', ' ')
  .slice(5, -8);
export function buildString() {
  return build_timestamp_string;
}
