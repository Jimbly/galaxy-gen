// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

export const FADE_DEFAULT = 0;
export const FADE_OUT = 1;
export const FADE_IN = 2;
export const FADE = FADE_OUT + FADE_IN;

const assert = require('assert');
const { cmd_parse } = require('./cmds.js');
const { filewatchOn } = require('./filewatch.js');
const { Howl, Howler } = require('@jimbly/howler/src/howler.core.js');
const { abs, floor, max, min, random } = Math;
const settings = require('./settings.js');
const urlhash = require('./urlhash.js');
const { defaults, ridx } = require('../../common/util.js');

const DEFAULT_FADE_RATE = 0.001;

let sounds = {};
let num_loading = 0;

// Howler.usingWebAudio = false; // Disable WebAudio for testing HTML5 fallbacks

const default_params = {
  ext_list: ['mp3', 'wav'], // (recommended) try loading .mp3 versions first, then fallback to .wav
  //  also covers all browsers: ['webm', 'mp3']
  fade_rate: DEFAULT_FADE_RATE,
};
let sound_params;

let last_played = {};
let frame_timestamp = 0;
let fades = [];
let music;

let volume_override = 1;
let volume_override_target = 1;

settings.register({
  volume: {
    default_value: 1,
    type: cmd_parse.TYPE_FLOAT,
    range: [0,1],
  },
});

settings.register({
  sound: {
    default_value: 1,
    type: cmd_parse.TYPE_INT,
    range: [0,1],
  },
});

settings.register({
  music: {
    default_value: 1,
    type: cmd_parse.TYPE_INT,
    range: [0,1],
  },
});

export function soundLoad(base, opts, cb) {
  opts = opts || {};
  if (Array.isArray(base)) {
    assert(!cb);
    for (let ii = 0; ii < base.length; ++ii) {
      soundLoad(base[ii], opts);
    }
    return;
  }
  let key = base;
  if (sounds[key]) {
    if (cb) {
      cb();
    }
    return;
  }
  let m = base.match(/^(.*)\.(mp3|ogg|wav|webm)$/u);
  let preferred_ext;
  if (m) {
    base = m[1];
    preferred_ext = m[2];
  }
  let src = `sounds/${base}`;
  let srcs = [];
  let suffix = '';
  if (opts.for_reload) {
    suffix = `?rl=${Date.now()}`;
  }
  if (preferred_ext) {
    srcs.push(`${urlhash.getURLBase()}${src}.${preferred_ext}${suffix}`);
  }
  for (let ii = 0; ii < sound_params.ext_list.length; ++ii) {
    let ext = sound_params.ext_list[ii];
    if (ext !== preferred_ext) {
      srcs.push(`${urlhash.getURLBase()}${src}.${ext}${suffix}`);
    }
  }
  // Try loading desired sound types one at a time.
  // Cannot rely on Howler's built-in support for this because it only continues
  //   through the list on *some* load errors, not all :(.
  function tryLoad(idx) {
    if (idx === srcs.length) {
      console.error(`Error loading sound ${base}: All fallbacks exhausted, giving up`);
      if (cb) {
        cb('Error loading sound');
      }
      return;
    }
    ++num_loading;
    let once = false;
    let sound = new Howl({
      src: srcs.slice(idx),
      html5: Boolean(opts.streaming),
      loop: Boolean(opts.loop),
      volume: 0,
      onload: function () {
        if (!once) {
          --num_loading;
          once = true;
          sound.glov_load_opts = opts;
          sounds[key] = sound;
          if (cb) {
            cb(null);
          }
        }
      },
      onloaderror: function (id, err, extra) {
        if (idx === srcs.length - 1) {
          console.error(`Error loading sound ${srcs[idx]}: ${err}`);
        } else {
          console.log(`Error loading sound ${srcs[idx]}: ${err}, trying fallback...`);
        }
        if (!once) {
          --num_loading;
          once = true;
          tryLoad(idx + 1);
        }
      },
    });
  }
  tryLoad(0);
}

function soundReload(filename) {
  let sound_name = filename.match(/^sounds\/([^.]+)\.\w+$/);
  sound_name = sound_name && sound_name[1];
  if (!sound_name) {
    return;
  }
  if (!sounds[sound_name]) {
    console.log(`Reload trigged for non-existent sound: ${filename}`);
    return;
  }
  let opts = sounds[sound_name].glov_load_opts;
  opts.for_reload = true;
  delete sounds[sound_name];
  soundLoad(sound_name, opts);
}

export function soundStartup(params) {
  sound_params = defaults(params || {}, default_params);

  // Music
  music = []; // 0 is current, 1 is previous (fading out)
  for (let ii = 0; ii < 2; ++ii) {
    music.push({
      sound: null,
      id: 0,
      current_volume: 0,
      target_volume: 0,
      sys_volume: 0,
      need_play: false,
    });
  }
  filewatchOn('.mp3', soundReload);
  filewatchOn('.ogg', soundReload);
  filewatchOn('.wav', soundReload);
  filewatchOn('.webm', soundReload);
}

export function soundPause() {
  volume_override = volume_override_target = 0;
  // Immediately mute all the music
  // Can't do a nice fade out here because we stop getting ticked when we're not in the foreground
  soundTick(0); // eslint-disable-line no-use-before-define
}

export function soundResume() {
  volume_override_target = 1;

  // Actual context resuming handled internally by Howler, leaving hooks in for now, though
  // Maybe more reliable than `Howler.safeToPlay`...
}

export function soundResumed() {
  return !Howler.noAudio && Howler.safeToPlay;
}

export function soundTick(dt) {
  frame_timestamp += dt;
  if (volume_override !== volume_override_target) {
    let delta = dt * 0.004;
    if (volume_override < volume_override_target) {
      volume_override = min(volume_override + delta, volume_override_target);
    } else {
      volume_override = max(volume_override - delta, volume_override_target);
    }
  }
  if (!soundResumed()) {
    return;
  }
  // Do music fading
  // Cannot rely on Howler's fading because starting a fade when one is in progress
  //   messes things up, as well causes snaps in volume :(
  let max_fade = dt * sound_params.fade_rate;
  for (let ii = 0; ii < music.length; ++ii) {
    let mus = music[ii];
    if (!mus.sound) {
      continue;
    }
    let target = settings.music ? mus.target_volume : 0;
    if (mus.current_volume !== target) {
      let delta = target - mus.current_volume;
      let fade_amt = min(abs(delta), max_fade);
      if (delta < 0) {
        mus.current_volume = max(target, mus.current_volume - fade_amt);
      } else {
        mus.current_volume = min(target, mus.current_volume + fade_amt);
      }
      if (!mus.target_volume && !mus.current_volume) {
        if (!mus.need_play) {
          mus.sound.stop(mus.id);
        }
        mus.sound = null;
      }
    }
    if (mus.sound) {
      let sys_volume = mus.current_volume * settings.volume * volume_override;
      if (mus.need_play) {
        mus.need_play= false;
        mus.id = mus.sound.play();
        mus.sys_volume = -1;
      }
      if (mus.sys_volume !== sys_volume) {
        mus.sound.volume(sys_volume, mus.id);
        mus.sys_volume = sys_volume;
      }
    }
  }

  for (let ii = fades.length - 1; ii >= 0; --ii) {
    let fade = fades[ii];
    fade.volume = max(0, fade.volume - max_fade);
    fade.sound.volume(fade.volume * settings.volume * volume_override, fade.id);
    if (!fade.volume) {
      fade.sound.stop(fade.id);
      ridx(fades, ii);
    }
  }
}

export function soundPlay(soundname, volume, as_music) {
  volume = volume || 1;
  if (!as_music && !settings.sound || as_music && !settings.music) {
    return null;
  }
  if (!soundResumed()) {
    return null;
  }
  if (Array.isArray(soundname)) {
    soundname = soundname[floor(random() * soundname.length)];
  }
  let sound = sounds[soundname];
  if (!sound) {
    return null;
  }
  let last_played_time = last_played[soundname] || -9e9;
  if (frame_timestamp - last_played_time < 45) {
    return null;
  }

  let id = sound.play(undefined, volume * settings.volume * volume_override);
  // sound.volume(volume * settings.volume * volume_override, id);
  last_played[soundname] = frame_timestamp;
  return {
    stop: sound.stop.bind(sound, id),
    playing: sound.playing.bind(sound, id), // not reliable if it hasn't started yet? :(
    fadeOut: (time) => {
      fades.push({
        volume,
        sound,
        id,
        time,
      });
    },
  };
}

export function soundPlayMusic(soundname, volume, transition) {
  if (!settings.music) {
    return;
  }
  if (volume === undefined) {
    volume = 1;
  }
  transition = transition || FADE_DEFAULT;
  soundLoad(soundname, { streaming: true, loop: true }, (err) => {
    assert(!err);
    let sound = sounds[soundname];
    assert(sound);
    if (music[0].sound === sound) {
      // Same sound, just adjust volume, if required
      music[0].target_volume = volume;
      if (!transition) {
        if (!volume) {
          sound.stop(music[0].id);
          music[0].sound = null;
        } else {
          let sys_volume = music[0].sys_volume = volume * settings.volume * volume_override;
          sound.volume(sys_volume, music[0].id);
        }
      }
      return;
    }
    // fade out previous music, if any
    if (music[0].current_volume) {
      if (transition & FADE_OUT) {
        // swap to position 1, start fadeout
        let temp = music[1];
        music[1] = music[0];
        music[0] = temp;
        music[1].target_volume = 0;
      }
    }
    if (music[0].sound) {
      music[0].sound.stop(music[0].id);
    }
    music[0].sound = sound;
    music[0].target_volume = volume;
    let start_vol = (transition & FADE_IN) ? 0 : volume;
    music[0].current_volume = start_vol;
    if (soundResumed()) {
      let sys_volume = start_vol * settings.volume * volume_override;
      music[0].id = sound.play(undefined, sys_volume);
      // sound.volume(sys_volume, music[0].id);
      music[0].sys_volume = sys_volume;
      music[0].need_play = false;
    } else {
      music[0].need_play = true;
    }
  });
}

export function soundLoading() {
  return num_loading;
}
