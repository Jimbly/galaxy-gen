import { GlovSoundSetUp, soundLoad, soundPlay, soundResumed } from 'glov/client/sound';
import { TSMap } from 'glov/common/types';
import { clamp } from 'glov/common/util';

const { floor, random } = Math;

const FADE_TIME = 1000;

export type SoundscapeParamLevel = string[][];
export type SimpleSoundscapeParam = {
  prefix: string;
  levels: SoundscapeParamLevel[];
};

type SoundscapeSound = {
  soundname: string;
};
type SoundscapeLevel = SoundscapeSound[][];

export class SimpleSoundscape {
  levels: SoundscapeLevel[];
  sound_need_load: TSMap<true> = {};
  sound_load_requested: TSMap<true> = {};
  constructor(param: SimpleSoundscapeParam) {
    let levels: SoundscapeLevel[] = this.levels = [];
    for (let ii = 0; ii < param.levels.length; ++ii) {
      let level_in = param.levels[ii];
      let level: SoundscapeLevel = [];
      for (let jj = 0; jj < level_in.length; ++jj) {
        let options_in = level_in[jj];
        let options: SoundscapeSound[] = [];
        for (let kk = 0; kk < options_in.length; ++kk) {
          let basename = options_in[kk];
          let soundname = `${param.prefix}${basename}`;
          this.sound_need_load[soundname] = true;
          // soundLoad(soundname, { loop: true });
          let sound: SoundscapeSound = {
            soundname,
          };
          options.push(sound);
        }
        level.push(options);
      }
      levels.push(level);
    }
  }
  last_level_idx = -1;
  playing_sounds: TSMap<GlovSoundSetUp | true> = {};
  last_time = 0;
  level_debug = -1;
  new_loads: string[] = [];
  tick(level_idx: number): void {
    this.level_debug = level_idx;
    if (!soundResumed()) {
      return;
    }
    level_idx = clamp(level_idx, 0, this.levels.length - 1);
    let seen: TSMap<true> = {};
    let level = this.levels[level_idx];
    let complete_rebuild = level_idx !== this.last_level_idx;
    let new_stems = complete_rebuild;
    let sync_to: GlovSoundSetUp | null = null;
    if (!complete_rebuild) {
      let keys = Object.keys(this.playing_sounds);
      if (keys.length) {
        for (let ii = 0; ii < keys.length; ++ii) {
          let sound = this.playing_sounds[keys[ii]]!;
          if (sound !== true) {
            sync_to = sound;
            break;
          }
        }
        if (sync_to) {
          let new_time = sync_to.location();
          if (new_time < this.last_time) {
            // looped
            new_stems = true;
          }
          this.last_time = new_time;
        }
      }
    }

    let new_sounds: GlovSoundSetUp[] = [];
    if (complete_rebuild || new_stems) {
      this.last_level_idx = level_idx;
      for (let ii = 0; ii < level.length; ++ii) {
        let options = level[ii];
        let option = options[floor(random() * options.length)];
        if (option) {
          let existing = this.playing_sounds[option.soundname];
          if (!existing) {
            this.playing_sounds[option.soundname] = true; // want it, even if not loaded / fails to play
            if (this.sound_need_load[option.soundname]) {
              if (!this.sound_load_requested[option.soundname]) {
                // start the load
                this.sound_load_requested[option.soundname] = true;
                soundLoad(option.soundname, { loop: true }, (err) => {
                  if (!err) {
                    delete this.sound_need_load[option.soundname];
                    this.new_loads.push(option.soundname);
                  }
                });
              }
            } else {
              let sound = soundPlay(option.soundname, 0.0001);
              if (sound) {
                sound.fade(1, FADE_TIME);
                this.playing_sounds[option.soundname] = sound;
                new_sounds.push(sound);
              }
            }
          } else if (existing === true) {
            // already loading
          } else if (!sync_to) {
            sync_to = existing;
          }
          seen[option.soundname] = true;
        }
      }

      for (let key in this.playing_sounds) {
        if (!seen[key]) {
          let sound = this.playing_sounds[key]!;
          if (!sync_to && sound !== true) {
            sync_to = sound;
          }
          delete this.playing_sounds[key];
          if (sound !== true) {
            sound.fade(0, FADE_TIME);
          }
        }
      }
    }
    if (this.new_loads.length) {
      for (let ii = 0; ii < this.new_loads.length; ++ii) {
        let soundname = this.new_loads[ii];
        if (this.playing_sounds[soundname]) {
          let sound = soundPlay(soundname, 0.0001);
          if (sound) {
            sound.fade(1, FADE_TIME);
            this.playing_sounds[soundname] = sound;
            new_sounds.push(sound);
          }
        }
      }
    }
    this.new_loads.length = 0;
    if (sync_to) {
      let loc = this.last_time = sync_to.location();
      for (let ii = 0; ii < new_sounds.length; ++ii) {
        new_sounds[ii].location(loc);
      }
    }
  }
  debug(): string[] {
    let keys = Object.keys(this.playing_sounds);
    let ret: string[] = [];
    ret.push(`Level ${this.last_level_idx} (desired: ${this.level_debug})`);
    if (keys.length) {
      let sound = this.playing_sounds[keys[0]]!;
      ret.push(`Time = ${this.last_time.toFixed(1)} / ${sound === true ? '?' : sound.duration().toFixed(1)}`);
    }
    ret = ret.concat(keys.map((key) => {
      let sound = this.playing_sounds[key]!;
      let delta;
      if (sound === true) {
        delta = '(loading)';
      } else {
        delta = (sound.location() - this.last_time).toFixed(3);
        if (delta[0] !== '-') {
          delta = `+${delta}`;
        }
      }
      return `${key}: ${delta}`;
    }));
    return ret;
  }
}
