const assert = require('assert');
const engine = require('./engine.js');
const { floor, min, random } = Math;
const settings = require('./settings.js');
const { soundLoad, soundPlay, soundResumed } = require('./sound.js');
const { ridx } = require('../../common/util.js');

const DEFAULT_PERIOD = 30000;
const DEFAULT_PERIOD_NOISE = 15000;
const DEFAULT_ADD_DELAY = 5000; // how long to wait between adding another track
let inherit_props = ['min_intensity', 'odds', 'period', 'period_noise', 'add_delay'];
const volume = 1;
function SoundScape(params) {
  let { base_path, layers } = params;
  this.intensity = 0;
  this.tags = {};
  function preload(layer, parent) {
    let { files, tags } = layer;
    for (let ii = 0; ii < files.length; ++ii) {
      files[ii] = `${base_path}${files[ii]}`;
      soundLoad(files[ii], { streaming: true });
    }
    if (parent) {
      for (let ii = 0; ii < inherit_props.length; ++ii) {
        let key = inherit_props[ii];
        if (layer[key] === undefined) {
          layer[key] = parent[key];
        }
      }
    }
    if (layer.max) {
      layer.odds = [0];
      for (let ii = 0; ii < layer.max; ++ii) {
        layer.odds.push(1);
      }
    }
    layer.odds_total = 0;
    if (layer.odds) {
      for (let ii = 0; ii < layer.odds.length; ++ii) {
        layer.odds_total += layer.odds[ii];
      }
    }
    layer.add_delay = layer.add_delay || DEFAULT_ADD_DELAY;
    layer.period = layer.period || DEFAULT_PERIOD;
    layer.period_noise = layer.period_noise || DEFAULT_PERIOD_NOISE;
    for (let tag in tags) {
      preload(tags[tag], layer);
    }
  }
  this.layer_state = {};
  let now = engine.frame_timestamp;
  for (let key in layers) {
    preload(layers[key]);
    this.layer_state[key] = {
      active: [],
      rel_intensity: random(),
      // when we last started a new track playing
      last_add: 0,
      // change: when to change `rel_intensity`
      change: now + layers[key].period + random() * layers[key].period_noise,
    };
  }
  this.layer_data = layers;
}
SoundScape.prototype.getTag = function (tag) {
  return this.tags[tag];
};
SoundScape.prototype.setTag = function (tag, value) {
  this.tags[tag] = value;
};
SoundScape.prototype.setIntensity = function (value) {
  this.intensity = value;
};
SoundScape.prototype.getLayer = function (key) {
  let layer = this.layer_data[key];
  let ret = layer;
  let priority = 0;
  for (let tag in layer.tags) {
    if (!this.tags[tag]) {
      continue;
    }
    let taglayer = layer.tags[tag];
    if (taglayer.priority > priority) {
      ret = taglayer;
      priority = taglayer.priority;
    }
  }
  return ret;
};
function stop(active_list, idx) {
  let to_remove = active_list[idx];
  ridx(active_list, idx);
  to_remove.sound.fadeOut();
}
SoundScape.prototype.tick = function () {
  let now = engine.frame_timestamp;
  let { intensity, layer_state } = this;
  for (let key in layer_state) {
    let data = this.getLayer(key);
    let { files, add_delay } = data;
    let state = layer_state[key];
    if (now > state.change) {
      state.change = now + data.period + random() * data.period_noise;
      state.rel_intensity = random();
    }
    let wanted = 0;
    if (intensity > data.min_intensity && data.odds_total) {
      let v = state.rel_intensity * data.odds_total;
      wanted = 0;
      do {
        v -= data.odds[wanted];
        if (v < 0) {
          break;
        }
        wanted++;
      } while (wanted < data.odds.length - 1);
    }
    wanted = min(wanted, files.length);
    if (!settings.music || !soundResumed()) {
      wanted = 0;
    }
    // Ensure active sounds are in the current file list
    let active_files = {};
    for (let ii = state.active.length - 1; ii >= 0; --ii) {
      let active_sound = state.active[ii];
      let { file, sound, start } = active_sound;
      if (files.indexOf(file) === -1 && sound.playing()) {
        stop(state.active, ii);
      } else if (!sound.playing() && now - start > 1000) {
        ridx(state.active, ii);
      } else {
        active_files[file] = true;
      }
    }
    // Stop any extras
    while (state.active.length > wanted) {
      let idx = floor(random() * state.active.length);
      stop(state.active, idx);
      // Allow immediate adds
      state.last_add = 0;
    }
    // Start new to match
    state.add_blocked = false;
    while (state.active.length < wanted) {
      if (state.last_add && now - state.last_add < add_delay) {
        state.add_blocked = true;
        break;
      }
      let valid_files = files.filter((a) => !active_files[a]);
      assert(valid_files.length);
      let idx = floor(random() * valid_files.length);
      let file = valid_files[idx];
      let sound = soundPlay(file, volume, true);
      if (!sound) {
        // still loading?
        --wanted;
        continue;
      }
      state.last_add = now;
      state.active.push({
        file,
        sound,
        start: now,
      });
    }
  }
};

SoundScape.prototype.debug = function () {
  let { layer_state } = this;
  let ret = [];
  for (let key in layer_state) {
    let state = layer_state[key];
    let data = this.getLayer(key);
    let { active, rel_intensity } = state;
    if (active.length || this.intensity > data.min_intensity) {
      ret.push(`Layer ${key} (${rel_intensity.toFixed(2)})${state.add_blocked ? ' (waiting)' : ''}:`);
    }
    for (let ii = 0; ii < active.length; ++ii) {
      let active_sound = active[ii];
      ret.push(`  ${active_sound.file}`);
    }
  }
  return ret;
};

export function create(params) {
  return new SoundScape(params);
}
