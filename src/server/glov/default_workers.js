// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

const assert = require('assert');
const { ChannelWorker } = require('./channel_worker.js');
const { FRIEND_ADDED, FRIEND_ADDED_AUTO, FRIEND_REMOVED, PRESENCE_OFFLINE } = require('../../common/enums.js');
const master_worker = require('./master_worker.js');
const md5 = require('../../common/md5.js');
const metrics = require('./metrics.js');
const { isProfane } = require('../../common/words/profanity_common.js');
const random_names = require('./random_names.js');
const { sanitize } = require('../../common/util.js');

const DISPLAY_NAME_MAX_LENGTH = 30;
const DISPLAY_NAME_WAITING_PERIOD = 23 * 60 * 60 * 1000;
const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FRIENDS = 100;

function validDisplayName(display_name) {
  if (!display_name || sanitize(display_name).trim() !== display_name ||
    isProfane(display_name) || display_name.length > DISPLAY_NAME_MAX_LENGTH
  ) {
    return false;
  }
  return true;
}

export class DefaultUserWorker extends ChannelWorker {
  constructor(channel_server, channel_id, channel_data) {
    super(channel_server, channel_id, channel_data);
    this.user_id = this.channel_subid; // 1234
    this.presence_data = {}; // client_id -> data
    this.presence_idx = 0;
    this.my_clients = {};
  }
  cmdRename(new_name, resp_func) {
    if (this.cmd_parse_source.user_id !== this.user_id) {
      return resp_func('ERR_INVALID_USER');
    }
    if (!new_name) {
      return resp_func('Missing name');
    }
    if (!validDisplayName(new_name)) {
      return resp_func('Invalid display name');
    }
    let old_name = this.getChannelData('public.display_name');
    if (new_name === old_name) {
      return resp_func('Name unchanged');
    }
    let unimportant = new_name.toLowerCase() === old_name.toLowerCase();
    let now = Date.now();
    let last_change = this.getChannelData('private.display_name_change');
    if (last_change && now - last_change < DISPLAY_NAME_WAITING_PERIOD && !unimportant &&
      !this.cmd_parse_source.sysadmin
    ) {
      return resp_func('You must wait 24h before changing your display name again');
    }
    this.setChannelData('public.display_name', new_name);
    if (!unimportant) {
      this.setChannelData('private.display_name_change', now);
    }
    return resp_func(null, 'Successfully renamed');
  }
  cmdRenameRandom(ignored, resp_func) {
    return this.cmdRename(random_names.get(), resp_func);
  }
  cmdFriendAdd(user_id, resp_func) {
    if (this.cmd_parse_source.user_id !== this.user_id) {
      return void resp_func('ERR_INVALID_USER');
    }
    if (!user_id) {
      return void resp_func('Missing User ID');
    }
    if (user_id === this.user_id) {
      return void resp_func('Cannot friend yourself');
    }
    let friend_value = this.getChannelData(`private.friends.${user_id}`);
    if (friend_value && friend_value !== FRIEND_REMOVED) {
      return void resp_func(`Already on friends list: ${user_id}`);
    }
    if (Object.keys(this.getChannelData('private.friends', {})).length >= MAX_FRIENDS) {
      return void resp_func('Maximum friends list size exceeded');
    }
    this.pak(`user.${user_id}`, 'user_ping').send((err) => {
      if (err) {
        this.log(`Error pinging ${user_id}: ${err}`);
        // Return generic error
        return void resp_func(`User not found: ${user_id}`);
      }
      assert(!this.shutting_down); // Took really long?  Need to override `isEmpty`
      this.setChannelData(`private.friends.${user_id}`, FRIEND_ADDED);
      resp_func(null, `Friend added: ${user_id}`);
    });
  }
  cmdFriendRemove(user_id, resp_func) {
    if (this.cmd_parse_source.user_id !== this.user_id) {
      return void resp_func('ERR_INVALID_USER');
    }
    if (!user_id) {
      return void resp_func('Missing User ID');
    }
    if (!this.getChannelData(`private.friends.${user_id}`)) {
      return void resp_func(`Not on your friends list: ${user_id}`);
    }
    // Flag as 'removed' if this was potentially populated from an external auth system
    let new_value = (user_id.indexOf('$') === -1 || this.user_id.indexOf('$') === -1) ?
      undefined :
      FRIEND_REMOVED;
    this.setChannelData(`private.friends.${user_id}`, new_value);
    resp_func(null, `Friend removed: ${user_id}`);
  }
  cmdChannelDataGet(param, resp_func) {
    if (this.cmd_parse_source.user_id !== this.user_id) {
      return void resp_func('ERR_INVALID_USER');
    }
    if (!this.getChannelData('public.permissions.sysadmin')) {
      return void resp_func('ERR_ACCESS_DENIED');
    }
    let m = param.match(/^([^ ]+) ([^ ]+)$/);
    if (!m) {
      return void resp_func('Error parsing arguments');
    }
    if (!m[2].match(/^(public|private)/)) {
      return void resp_func('Key must start with public. or private.');
    }
    this.sendChannelMessage(m[1], 'get_channel_data', m[2], function (err, resp) {
      resp_func(err,
        `${m[1]}:${m[2]} = ${resp === undefined ? 'undefined' : JSON.stringify(resp)}`);
    });
  }
  cmdChannelDataSet(param, resp_func) {
    if (this.cmd_parse_source.user_id !== this.user_id) {
      return void resp_func('ERR_INVALID_USER');
    }
    if (!this.getChannelData('public.permissions.sysadmin')) {
      return void resp_func('ERR_ACCESS_DENIED');
    }
    let m = param.match(/^([^ ]+) ([^ ]+) (.+)$/);
    if (!m) {
      return void resp_func('Error parsing arguments');
    }
    if (!m[2].match(/^(public\.|private\.)/)) {
      return void resp_func('Key must start with public. or private.');
    }
    let value;
    try {
      if (m[3] !== 'undefined') {
        value = JSON.parse(m[3]);
      }
    } catch (e) {
      return void resp_func(`Error parsing value: ${e}`);
    }
    this.setChannelDataOnOther(m[1], m[2], value, function (err, resp) {
      if (err || resp) {
        resp_func(err, resp);
      } else {
        resp_func(null, 'Channel data set.');
      }
    });
  }
  handleFriendList(src, pak, resp_func) {
    if (src.user_id !== this.user_id) {
      return void resp_func('ERR_INVALID_USER');
    }
    let friends = this.getChannelData('private.friends', {});
    pak = resp_func.pak();
    for (let user_id in friends) {
      pak.writeAnsiString(user_id);
      pak.writeInt(friends[user_id]);
    }
    pak.writeAnsiString('');
    pak.send();
  }
  handleFriendAutoUpdate(src, pak, resp_func) {
    if (src.user_id !== this.user_id) {
      pak.pool();
      return void resp_func('ERR_INVALID_USER');
    }
    let user_id;
    let friends = this.getChannelData('private.friends', {});
    while ((user_id = pak.readAnsiString())) {
      if (user_id !== this.user_id) {
        friends[user_id] = FRIEND_ADDED_AUTO;
      }
    }
    while ((user_id = pak.readAnsiString())) {
      friends[user_id] = FRIEND_REMOVED;
    }
    this.setChannelData('private.friends', friends);
    resp_func();
  }
  exists() {
    return this.getChannelData('private.password') || this.getChannelData('private.external');
  }
  handleUserPing(src, pak, resp_func) {
    if (!this.exists()) {
      return resp_func('ERR_USER_NOT_FOUND');
    }
    // Also return display name and any other relevant info?
    return resp_func();
  }
  handleLogin(src, data, resp_func) {
    if (this.channel_server.restarting) {
      if (!this.getChannelData('public.permissions.sysadmin')) {
        // Maybe black-hole like other messages instead?
        return resp_func('ERR_RESTARTING');
      }
    }
    if (!data.password) {
      return resp_func('Missing password');
    }

    if (!this.getChannelData('private.password')) {
      return resp_func('ERR_USER_NOT_FOUND');
    }
    if (md5(data.salt + this.getChannelData('private.password')) !== data.password) {
      return resp_func('Invalid password');
    }
    this.setChannelData('private.login_ip', data.ip);
    this.setChannelData('private.login_ua', data.ua);
    this.setChannelData('private.login_time', Date.now());
    metrics.add('user.login', 1);
    return resp_func(null, this.getChannelData('public'));
  }
  handleLoginFacebook(src, data, resp_func) {
    //Should the authentication step happen here instead?
    if (!this.getChannelData('private.external')) {
      this.setChannelData('private.external', true);
      return this.createShared(data, resp_func);
    }
    this.setChannelData('private.login_ip', data.ip);
    this.setChannelData('private.login_ua', data.ua);
    this.setChannelData('private.login_time', Date.now());
    metrics.add('user.login', 1);
    metrics.add('user.login_fb', 1);
    return resp_func(null, this.getChannelData('public'));
  }
  handleCreate(src, data, resp_func) {
    if (this.exists()) {
      return resp_func('Account already exists');
    }
    if (!data.password) {
      return resp_func('Missing password');
    }
    if (this.require_email && !email_regex.test(data.email)) {
      return resp_func('Email invalid');
    }
    if (!validDisplayName(data.display_name)) {
      return resp_func('Invalid display name');
    }
    return this.createShared(data, resp_func);
  }
  createShared(data, resp_func) {
    if (this.onUserCreate) {
      let err = this.onUserCreate(data);
      if (err) {
        return resp_func(err);
      }
    }

    let public_data = this.data.public;
    let private_data = this.data.private;

    public_data.display_name = data.display_name;
    if (!validDisplayName(public_data.display_name)) { // If from external auth
      public_data.display_name = random_names.get();
    }
    private_data.password = data.password;
    private_data.email = data.email;
    private_data.creation_ip = data.ip;
    private_data.creation_time = Date.now();
    private_data.login_ip = data.ip;
    private_data.login_ua = data.ua;
    private_data.login_time = Date.now();
    this.setChannelData('private', private_data);
    this.setChannelData('public', public_data);
    metrics.add('user.create', 1);
    return resp_func(null, this.getChannelData('public'));
  }
  handleSetChannelData(src, key, value) {
    if (!this.defaultHandleSetChannelData(src, key, value)) {
      return false;
    }
    assert(src);
    assert(src.type);
    if (src.type !== 'client') {
      // from another channel, accept it
      return true;
    }
    // Only allow changes from own client!
    if (src.user_id !== this.user_id) {
      return false;
    }
    return true;
  }

  handleNewClient(src) {
    if (this.rich_presence && src.type === 'client' && this.presence_data) {
      this.sendChannelMessage(src.channel_id, 'presence', this.presence_data);
    }
    if (src.type === 'client' && src.user_id === this.user_id) {
      this.my_clients[src.channel_id] = true;
    }
  }
  updatePresence() {
    for (let channel_id in this.subscribers) {
      if (channel_id.startsWith('client.')) {
        this.sendChannelMessage(channel_id, 'presence', this.presence_data);
      }
    }
  }
  handleClientDisconnect(src) {
    if (this.rich_presence && this.presence_data[src.channel_id]) {
      delete this.presence_data[src.channel_id];
      this.updatePresence();
    }
    if (this.my_clients[src.channel_id]) {
      delete this.my_clients[src.channel_id];
    }
  }
  handlePresenceSet(src, pak, resp_func) {
    if (src.user_id !== this.user_id) {
      pak.pool();
      return void resp_func('ERR_INVALID_USER');
    }
    let active = pak.readInt();
    let state = pak.readAnsiString(); // app-defined state
    let payload = pak.readJSON();
    if (!this.rich_presence) {
      return void resp_func('ERR_NO_RICH_PRESENCE');
    }
    if (src.user_id !== this.user_id) {
      return void resp_func('ERR_INVALID_USER');
    }
    if (active === PRESENCE_OFFLINE) {
      delete this.presence_data[src.channel_id];
    } else {
      this.presence_data[src.channel_id] = {
        id: ++this.presence_idx, // Timestamp would work too for ordering, but this is more concise
        active,
        state,
        payload
      };
    }
    this.updatePresence();
    resp_func();
  }
  handleCSRAdminToUser(src, pak, resp_func) {
    let cmd = pak.readString();
    if (!this.exists()) {
      return void resp_func('ERR_INVALID_USER');
    }
    if (!src.sysadmin) {
      return void resp_func('ERR_ACCESS_DENIED');
    }
    // first, try running here on a (potentially offline) user
    this.cmd_parse_source = { user_id: this.user_id }; // spoof as is from self
    this.access = src; // use caller's access credentials
    this.cmd_parse.handle(this, cmd, (err, resp) => {
      if (!this.cmd_parse.was_not_found) {
        return void resp_func(err, resp);
      }
      // not found
      // find a client worker for this user
      let to_use;
      for (let channel_id in this.my_clients) {
        to_use = channel_id;
        if (channel_id !== src.channel_id) {
          break;
        }
      }
      if (!to_use) {
        return void resp_func(`User ${this.user_id} has no connected clients`);
      }
      this.log(`Fowarding /csr request ("${cmd}") for ${src.user_id}(${src.channel_id}) to ${to_use}`);
      let out = this.pak(to_use, 'csr_user_to_clientworker');
      out.writeString(cmd);
      out.writeJSON(src);
      out.send(resp_func);
    });

  }
}
DefaultUserWorker.prototype.auto_destroy = true;
DefaultUserWorker.prototype.require_email = true;
DefaultUserWorker.prototype.rich_presence = true;

class ChannelServerWorker extends ChannelWorker {
}
// Returns a function that forwards to a method of the same name on the ChannelServer
function channelServerBroadcast(name) {
  return (ChannelServerWorker.prototype[name] = function (src, data, resp_func) {
    assert(!resp_func.expecting_response); // this is a broadcast
    this.channel_server[name](data);
  });
}
function channelServerHandler(name) {
  return (ChannelServerWorker.prototype[name] = function (src, data, resp_func) {
    this.channel_server[name](data, resp_func);
  });
}

ChannelServerWorker.prototype.no_datastore = true; // No datastore instances created here as no persistance is needed

export const regex_valid_username = /^[a-z][a-z0-9_]{1,32}$/;
const regex_valid_channelname = /^(?:fb\$|[a-z])[a-z0-9_]{1,32}$/;

let inited = false;
let user_worker = DefaultUserWorker;
let user_worker_init_data = {
  autocreate: true,
  subid_regex: regex_valid_channelname,
  cmds: [{
    cmd: 'rename',
    help: 'Change display name',
    usage: 'Changes your name as seen by others, your user name (login) remains the same.\n  Usage: /rename New Name',
    func: DefaultUserWorker.prototype.cmdRename,
  },{
    cmd: 'rename_random',
    help: 'Change display name to something random',
    func: DefaultUserWorker.prototype.cmdRenameRandom,
  },{
    cmd: 'friend_add',
    help: 'Add a friend',
    func: DefaultUserWorker.prototype.cmdFriendAdd,
  },{
    cmd: 'friend_remove',
    help: 'Remove a friend',
    func: DefaultUserWorker.prototype.cmdFriendRemove,
  },{
    cmd: 'channel_data_get',
    help: '(Admin) Get from a channel\'s metadata',
    usage: '/channel_data_get channel_id field.name',
    func: DefaultUserWorker.prototype.cmdChannelDataGet,
  },{
    cmd: 'channel_data_set',
    help: '(Admin) Set a channel\'s metadata',
    usage: '/channel_data_set channel_id field.name JSON',
    func: DefaultUserWorker.prototype.cmdChannelDataSet,
  }],
  handlers: {
    login_facebook: DefaultUserWorker.prototype.handleLoginFacebook,
    login: DefaultUserWorker.prototype.handleLogin,
    create: DefaultUserWorker.prototype.handleCreate,
    user_ping: DefaultUserWorker.prototype.handleUserPing,
  },
  client_handlers: {
    friend_auto_update: DefaultUserWorker.prototype.handleFriendAutoUpdate,
    friend_list: DefaultUserWorker.prototype.handleFriendList,
    presence_set: DefaultUserWorker.prototype.handlePresenceSet,
    csr_admin_to_user: DefaultUserWorker.prototype.handleCSRAdminToUser,
  },
};
export function overrideUserWorker(new_user_worker, extra_data) {
  assert(!inited);
  user_worker = new_user_worker;
  for (let key in extra_data) {
    let v = extra_data[key];
    if (Array.isArray(v)) {
      let dest = user_worker_init_data[key] = user_worker_init_data[key] || [];
      for (let ii = 0; ii < v.length; ++ii) {
        dest.push(v[ii]);
      }
    } else if (typeof v === 'object') {
      let dest = user_worker_init_data[key] = user_worker_init_data[key] || {};
      for (let subkey in v) {
        dest[subkey] = v[subkey];
      }
    } else {
      user_worker_init_data[key] = v;
    }
  }
}

const CHAT_MAX_MESSAGES = 50;
const CHAT_MAX_LEN = 1024; // Client must be set to this or fewer
const CHAT_USER_FLAGS = 0x1;
export function handleChat(src, pak, resp_func) {
  // eslint-disable-next-line no-invalid-this
  let self = this;
  let { user_id, channel_id, display_name } = src; // user_id is falsey if not logged in
  let client_id = src.id;
  let flags = pak.readInt();
  let msg = sanitize(pak.readString()).trim();
  if (!msg) {
    return resp_func('ERR_EMPTY_MESSAGE');
  }
  if (msg.length > CHAT_MAX_LEN) {
    return resp_func('ERR_MESSAGE_TOO_LONG');
  }
  if (flags & ~CHAT_USER_FLAGS) {
    return resp_func('ERR_INVALID_FLAGS');
  }
  let chat = self.getChannelData('private.chat', null);
  if (!chat) {
    chat = {
      idx: 0,
      msgs: [],
    };
  }
  let ts = Date.now();
  let id = user_id || channel_id;
  let data_saved = { id, msg, flags, ts, display_name };
  // Not broadcasting timestamp, so client will use local timestamp for smooth fading
  // Need client_id on broadcast so client can avoid playing a sound for own messages
  let data_broad = { id, msg, flags, client_id, display_name };
  chat.msgs[chat.idx] = data_saved;
  chat.idx = (chat.idx + 1) % CHAT_MAX_MESSAGES;
  // Setting whole 'chat' blob, since we re-serialize the whole metadata anyway
  if (!self.channel_server.restarting) {
    self.setChannelData('private.chat', chat);
  }
  self.channelEmit('chat', data_broad);
  // Log entire, non-truncated chat string
  self.logSrc(src, `chat from ${id} ("${display_name}") ` +
    `(${channel_id}): ${JSON.stringify(msg)}`);
  return resp_func();
}

export function handleChatGet(src, data, resp_func) {
  // eslint-disable-next-line no-invalid-this
  resp_func(null, this.getChannelData('private.chat'));
}

export function init(channel_server) {
  inited = true;
  channel_server.registerChannelWorker('user', user_worker, user_worker_init_data);
  channel_server.registerChannelWorker('channel_server', ChannelServerWorker, {
    autocreate: false,
    subid_regex: /^[a-zA-Z0-9-]+$/,
    handlers: {
      worker_create: channelServerHandler('handleWorkerCreate'),
      master_startup: channelServerBroadcast('handleMasterStartup'),
      master_stats: channelServerBroadcast('handleMasterStats'),
      restarting: channelServerBroadcast('handleRestarting'),
      chat_broadcast: channelServerBroadcast('handleChatBroadcast'),
      ping: channelServerBroadcast('handlePing'),
      eat_cpu: channelServerHandler('handleEatCPU'),
    },
  });
  master_worker.init(channel_server);
}
