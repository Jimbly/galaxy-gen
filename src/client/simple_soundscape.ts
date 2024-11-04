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
          soundLoad(soundname, { loop: true });
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
  playing_sounds: TSMap<GlovSoundSetUp> = {};
  last_time = 0;
  level_debug = -1;
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
        let sound = this.playing_sounds[keys[0]]!;
        sync_to = sound;
        let new_time = sound.location();
        if (new_time < this.last_time) {
          // looped
          new_stems = true;
        }
        this.last_time = new_time;
      }
    }

    if (complete_rebuild || new_stems) {
      this.last_level_idx = level_idx;
      let new_sounds: GlovSoundSetUp[] = [];
      for (let ii = 0; ii < level.length; ++ii) {
        let options = level[ii];
        let option = options[floor(random() * options.length)];
        if (option) {
          let existing = this.playing_sounds[option.soundname];
          if (!existing) {
            let sound = soundPlay(option.soundname, 0.0001);
            if (sound) {
              sound.fade(1, FADE_TIME);
              this.playing_sounds[option.soundname] = sound;
              new_sounds.push(sound);
            }
          } else if (!sync_to) {
            sync_to = existing;
          }
          seen[option.soundname] = true;
        }
      }

      for (let key in this.playing_sounds) {
        if (!seen[key]) {
          let sound = this.playing_sounds[key]!;
          if (!sync_to) {
            sync_to = sound;
          }
          delete this.playing_sounds[key];
          sound.fade(0, FADE_TIME);
        }
      }
      if (sync_to) {
        let loc = this.last_time = sync_to.location();
        for (let ii = 0; ii < new_sounds.length; ++ii) {
          new_sounds[ii].location(loc);
        }
      }
    }
  }
  debug(): string[] {
    let keys = Object.keys(this.playing_sounds);
    let ret: string[] = [];
    ret.push(`Level ${this.last_level_idx} (desired: ${this.level_debug})`);
    if (keys.length) {
      let sound = this.playing_sounds[keys[0]]!;
      ret.push(`Time = ${this.last_time.toFixed(1)} / ${sound.duration().toFixed(1)}`);
    }
    ret = ret.concat(keys.map((key) => {
      let sound = this.playing_sounds[key]!;
      let delta = (sound.location() - this.last_time).toFixed(3);
      if (delta[0] !== '-') {
        delta = `+${delta}`;
      }
      return `${key}: ${delta}`;
    }));
    return ret;
  }
}
