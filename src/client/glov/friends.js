// Portions Copyright 2020 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT
const { cmd_parse } = require('./cmds.js');
const {
  FRIEND_ADDED,
  FRIEND_ADDED_AUTO,
  FRIEND_REMOVED,
  PRESENCE_ACTIVE,
  PRESENCE_INACTIVE,
  PRESENCE_OFFLINE,
} = require('../../common/enums.js');
const { fbGetFriends } = require('./fbinstant.js');
const input = require('./input.js');
const net = require('./net.js');
const { deepEqual } = require('../../common/util.js');

const IDLE_TIME = 60000;

let subs;

let friend_list = null;

// May be `null` if not logged in or still loading
export function friendsGet() {
  return friend_list;
}

export function isFriend(user_id) {
  return friend_list && friend_list[user_id] && friend_list[user_id] !== FRIEND_REMOVED;
}

export function friendAdd(user_id, cb) {
  net.subs.getMyUserChannel().cmdParse(`friend_add ${user_id}`, function (err, resp) {
    if (!err) {
      friend_list[user_id] = FRIEND_ADDED;
    }
    cb(err, resp);
  });
}

export function friendRemove(user_id, cb) {
  net.subs.getMyUserChannel().cmdParse(`friend_remove ${user_id}`, function (err, resp) {
    if (!err) {
      friend_list[user_id] = FRIEND_REMOVED;
    }
    cb(err, resp);
  });
}

// Pass-through commands
cmd_parse.register({
  cmd: 'friend_add',
  help: 'Add a friend',
  func: friendAdd,
});
cmd_parse.register({
  cmd: 'friend_remove',
  help: 'Remove a friend',
  func: friendRemove,
});
cmd_parse.register({
  cmd: 'friend_list',
  help: 'List all friends',
  func: function (str, resp_func) {
    if (!friend_list) {
      return void resp_func('Friend list not loaded');
    }
    resp_func(null, Object.keys(friend_list).filter((a) => friend_list[a] !== FRIEND_REMOVED).join(',') ||
      'You have no friends');
  },
});

let invisible = 0;
cmd_parse.registerValue('invisible', {
  type: cmd_parse.TYPE_INT,
  help: 'Hide rich presence information from other users',
  label: 'Invisible',
  range: [0,1],
  get: () => invisible,
  set: (v) => (invisible = v),
});

let afk = 0;
cmd_parse.registerValue('afk', {
  type: cmd_parse.TYPE_INT,
  help: 'Appear as idle to other users',
  label: 'AFK',
  range: [0,1],
  get: () => afk,
  set: (v) => (afk = v),
});

function onPresence(data) {
  let user_channel = this; // eslint-disable-line no-invalid-this
  user_channel.presence_data = data;
}

let last_presence = null;
let send_queued;
function richPresenceSend() {
  if (!net.subs.loggedIn() || !last_presence || send_queued) {
    return;
  }
  send_queued = true;
  subs.onceConnected(() => {
    send_queued = false;
    if (!net.subs.loggedIn() || !last_presence) {
      return;
    }
    let pak = net.subs.getMyUserChannel().pak('presence_set');
    pak.writeInt(last_presence.active);
    pak.writeAnsiString(last_presence.state);
    pak.writeJSON(last_presence.payload);
    pak.send();
  });
}
export function richPresenceSet(active, state, payload) {
  active = !active || afk || (Date.now() - input.inputLastTime() > IDLE_TIME) ? PRESENCE_INACTIVE : PRESENCE_ACTIVE;
  if (invisible) {
    active = PRESENCE_OFFLINE;
  }
  payload = payload || null;
  if (!last_presence ||
    active !== last_presence.active || state !== last_presence.state ||
    !deepEqual(last_presence.payload, payload)
  ) {
    last_presence = {
      active,
      state,
      payload,
    };
    richPresenceSend();
  }
}

export function friendsInit() {
  subs = net.subs;
  subs.on('login', function () {
    let user_channel = subs.getMyUserChannel();
    let user_id = subs.logged_in_username;
    richPresenceSend();
    friend_list = null;
    user_channel.pak('friend_list').send((err, pak) => {
      if (err || user_id !== subs.logged_in_username) {
        // disconnected, etc
        if (pak) {
          pak.pool();
        }
        return;
      }
      friend_list = {};
      let friend_id;
      while ((friend_id = pak.readAnsiString())) {
        friend_list[friend_id] = pak.readInt();
      }

      // Sync friend list with Facebook friends
      if (subs.login_credentials && subs.login_credentials.fb) {
        fbGetFriends((err, fb_friends) => {
          if (err || !fb_friends || user_id !== subs.logged_in_username) {
            return;
          }
          let to_add = [];
          let to_remove = [];
          let found = {};
          for (let ii = 0; ii < fb_friends.length; ++ii) {
            let id = fb_friends[ii];
            found[id] = true;
            if (!friend_list[id]) {
              friend_list[id] = FRIEND_ADDED_AUTO;
              to_add.push(id);
            }
          }
          for (let id in friend_list) {
            if (!found[id] && friend_list[id] === FRIEND_ADDED_AUTO) {
              friend_list[id] = FRIEND_REMOVED;
              to_remove.push(id);
            }
          }
          if (!to_add.length && !to_remove.length) {
            return;
          }
          let pak = user_channel.pak('friend_auto_update');
          for (let ii = 0; ii < to_add.length; ++ii) {
            pak.writeAnsiString(to_add[ii]);
          }
          pak.writeAnsiString('');
          for (let ii = 0; ii < to_remove.length; ++ii) {
            pak.writeAnsiString(to_remove[ii]);
          }
          pak.writeAnsiString('');
          pak.send();
        });
      }
    });
  });
  subs.on('logout', function () {
    friend_list = null;
  });

  subs.onChannelMsg('user', 'presence', onPresence);
}
