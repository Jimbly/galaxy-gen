/* globals FBInstant */
const urlhash = require('./urlhash.js');
const local_storage = require('./local_storage.js');
const { soundPause } = require('./sound.js');

export let ready = false;
let onreadycallbacks = [];
export function onready(callback) {
  if (ready) {
    return void callback();
  }
  onreadycallbacks.push(callback);
}

let hasSubscribedAlready = false;
function initSubscribe(callback, skipShortcut) {

  skipShortcut = skipShortcut||false;

  function handleSubscribeToBotComplete() {
    if (callback) {
      //Prevents the handleSubscribeToBotComplete promise from eating unfreeze event errors
      setTimeout(callback,1);
    }
  }

  function handleSubscribeToBotFailure(e) {
    if (e && e.code !== 'USER_INPUT') {
      console.error('handleSubscribeToBotFailure', e);
    }
    FBInstant.logEvent(
      'bot_subscribe_failure'
    );
    handleSubscribeToBotComplete();
  }

  function subscribeToBot() {
    console.warn('Window social trying to bot subscribe');
    if (FBInstant.getSupportedAPIs().indexOf('player.canSubscribeBotAsync') !== -1) {
      FBInstant.player.canSubscribeBotAsync().then(function (canSubscribe) {
        if (canSubscribe) {
          FBInstant.logEvent(
            'bot_subscribe_show'
          );
          FBInstant.player.subscribeBotAsync().then(function () {
            FBInstant.logEvent(
              'bot_subscribe_success'
            );
            handleSubscribeToBotComplete();
          },handleSubscribeToBotFailure).catch(handleSubscribeToBotFailure);
        } else {
          handleSubscribeToBotComplete();
        }
      }).catch(handleSubscribeToBotFailure);
    } else {
      handleSubscribeToBotComplete();
    }
  }

  function handleHomescreenComplete() {
    subscribeToBot();
  }

  function handleCreateShortcutFailure(e) {
    console.error('handleCreateShortcutFailure', e);
    FBInstant.logEvent(
      'homescreen_install_failure'
    );
    handleHomescreenComplete();
  }

  let hasAddedToHomescreen = local_storage.get('instant.hasInstalledShortcut.v2');
  function createShortcut() {
    console.warn('Window social trying to create shortcut');
    if (FBInstant.getSupportedAPIs().indexOf('canCreateShortcutAsync') !== -1 &&
      !hasAddedToHomescreen &&
      !hasSubscribedAlready
    ) {
      hasSubscribedAlready = true;
      FBInstant.canCreateShortcutAsync().then(function (canCreateShortcut) {
        if (canCreateShortcut) {
          FBInstant.logEvent(
            'homescreen_install_show'
          );
          FBInstant.createShortcutAsync().then(function () {
            local_storage.set('instant.hasInstalledShortcut.v2',true);
            FBInstant.logEvent(
              'homescreen_install_success'
            );
            handleHomescreenComplete();
          },function () {
            FBInstant.logEvent(
              'homescreen_install_useraborted'
            );
            handleHomescreenComplete();
          }).catch(handleCreateShortcutFailure);
        } else {
          handleHomescreenComplete();
        }
      }).catch(handleCreateShortcutFailure);
    } else {
      handleHomescreenComplete();
    }
  }

  if (skipShortcut) {
    subscribeToBot();
  } else {
    createShortcut();
  }
}

export function init() {
  if (!window.FBInstant) {
    return;
  }

  let left = 1;
  let fake_load_interval = setInterval(function () {
    left *= 0.9;
    FBInstant.setLoadingProgress(100-(left*100)>>0);
  },100);

  FBInstant.initializeAsync().then(function () {
    let entryPointData = FBInstant.getEntryPointData()||{};
    // let entryPointData = { querystring: { w: '4675', wg: '1' } }; // FRVR
    // let entryPointData = { querystring: { blueprint: 'RKWVAE26XS24Z' } }; // FRVR
    let querystring = entryPointData.querystring||{};
    for (let x in querystring) {
      urlhash.set(x, querystring[x]);
    }

    clearInterval(fake_load_interval);
    ready = true;
    FBInstant.startGameAsync().then(function () {
      onreadycallbacks.forEach((e) => e());
      onreadycallbacks = [];

      console.warn('outside init fb');
      initSubscribe(function () {
        console.warn('All done initing FB');
      });
    });
  }).catch(function (e) {
    console.warn('initializeAsync failed', e);
  });

  FBInstant.onPause(() => {
    soundPause();
  });
}

export function fbGetLoginInfo(cb) {
  onready(() => {
    window.FBInstant.player.getSignedPlayerInfoAsync().then((result) => {
      if (cb) {
        cb(null, {
          signature: result.getSignature(),
          display_name: window.FBInstant.player.getName(),
        });
        cb = null;
      }
    }).catch((err) => {
      if (cb) {
        cb(err);
        cb = null;
      }
    });
  });
}

let fb_friends = {};
// Returns a display name if the user_id is a Facebook friend
export function fbFriendName(user_id) {
  return fb_friends[user_id];
}

// Expects an array of valid user IDs:
// cb(null, ['fb$1234', 'fb$4567']);
export function fbGetFriends(cb) {
  onready(() => {
    window.FBInstant.player.getConnectedPlayersAsync().then((players) => {
      let list = players.map((player) => {
        let user_id = `fb$${player.getID()}`;
        fb_friends[user_id] = player.getName();
        return user_id;
      });
      if (cb) {
        cb(null, list);
        cb = null;
      }
    }).catch((err) => {
      if (cb) {
        cb(err);
        cb = null;
      }
    });
  });
}
