// Portions Copyright 2023 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT
/* eslint-env browser */

import { VoidFunc } from 'glov/common/types';
import { fetch } from './fetch';

const PLAYER_NAME_KEY = 'ld.player_name';
const MAX_SCORES = 1000;
const SCORE_REFRESH_TIME = 5*60*1000; // also refreshes if we submit a new score, or forceRefreshScores() is called
const SUBMIT_RATELIMIT = 5000; // Only kicks in if two are in-flight at the same time

let player_name: string;
let lsd = (function (): Partial<Record<string, string>> {
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    return localStorage;
  } catch (e) {
    return {};
  }
}());

if (lsd[PLAYER_NAME_KEY]) {
  player_name = lsd[PLAYER_NAME_KEY]!;
} else {
  // eslint-disable-next-line newline-per-chained-call
  lsd[PLAYER_NAME_KEY] = player_name = `Anonymous ${Math.random().toString().slice(2, 8)}`;
}

let score_host = 'http://scores.dashingstrike.com';
if (window.location.host.indexOf('localhost') !== -1 ||
  window.location.host.indexOf('staging') !== -1) {
  score_host = 'http://scores.staging.dashingstrike.com';
}
if (window.location.href.startsWith('https://')) {
  score_host = score_host.replace(/^http:/, 'https:');
}
export function scoreGetPlayerName(): string {
  return player_name;
}

function fetchJSON2<T>(url: string, cb: (err: string | undefined, o: T) => void): void {
  fetch({
    url: url,
    response_type: 'json',
  }, (err: string | undefined, resp: unknown) => {
    cb(err, resp as T);
  });
}

export type LevelName = string;
export type LevelDef = {
  name?: LevelName;
};
type ScoreTypeInternal<ScoreType> = ScoreType & {
  submitted?: boolean;
};
type LevelDefInternal<ScoreType> = {
  name: LevelName;
  local_score?: ScoreTypeInternal<ScoreType>; // internal to score system
  last_refresh_time?: number;
  refresh_in_flight?: boolean;
  save_in_flight?: boolean;
};
export type ScoreSystem<T> = ScoreSystemImpl<T>;
export type ScoreSystemParam<ScoreType> = {
  score_to_value: (s: ScoreType) => number;
  value_to_score: (v: number) => ScoreType;
  level_defs: LevelDef[] | number; // List of {name}s or just a number of (numerically indexed) levels
  score_key: string;
};
type HighScoreListEntryRaw = {
  name: string;
  score: number;
};
type HighScoreListRaw = HighScoreListEntryRaw[];
export type HighScoreListEntry<ScoreType> = {
  name: string;
  score: ScoreType;
};
type HighScoreList<ScoreType> = HighScoreListEntry<ScoreType>[];
class ScoreSystemImpl<ScoreType> {
  score_to_value: (s: ScoreType) => number;
  value_to_score: (v: number) => ScoreType;
  level_defs: LevelDefInternal<ScoreType>[];
  SCORE_KEY: string;
  LS_KEY: string;
  constructor(param: ScoreSystemParam<ScoreType>) {
    this.score_to_value = param.score_to_value;
    this.value_to_score = param.value_to_score;
    let level_defs: LevelDefInternal<ScoreType>[] = [];
    if (typeof param.level_defs === 'number') {
      for (let level_idx = 0; level_idx < param.level_defs; ++level_idx) {
        level_defs.push({
          name: '', // name filled below
        });
      }
    } else {
      for (let ii = 0; ii < param.level_defs.length; ++ii) {
        level_defs.push({
          name: param.level_defs[ii].name || '', // name filled below
        });
      }
    }
    this.level_defs = level_defs;

    this.SCORE_KEY = param.score_key;
    this.LS_KEY = this.SCORE_KEY.toLowerCase();

    for (let level_idx = 0; level_idx < level_defs.length; ++level_idx) {
      let ld = level_defs[level_idx];
      if (!ld.name) {
        if (level_defs.length === 1) {
          ld.name = 'the';
        } else {
          ld.name = String(level_idx);
        }
      }
      this.getScore(level_idx); // fetch .local_score for updatePlayerName to take advantage of
    }
  }

  high_scores: Partial<Record<number, HighScoreList<ScoreType>>> = {};
  getHighScores(level_idx: number): HighScoreList<ScoreType> | null {
    this.refreshScores(level_idx);
    return this.high_scores[level_idx] || null;
  }

  private handleScoreResp(level_idx: number, scores: HighScoreListRaw): void {
    let list: HighScoreList<ScoreType> = [];
    scores.forEach((score) => {
      list.push({
        name: score.name,
        score: this.value_to_score(score.score),
      });
    });
    this.high_scores[level_idx] = list;
  }
  private refreshScores(level_idx: number, changed_cb?: VoidFunc): void {
    let ld = this.level_defs[level_idx];
    if (!ld) {
      ld = this.level_defs[level_idx] = {
        name: String(level_idx),
      };
    }
    if (ld.refresh_in_flight) {
      changed_cb?.();
      return;
    }
    let now = Date.now();
    if (!ld.last_refresh_time || now - ld.last_refresh_time > SCORE_REFRESH_TIME) {
      // do it
    } else {
      changed_cb?.();
      return;
    }
    ld.last_refresh_time = now;
    ld.refresh_in_flight = true;
    fetchJSON2(
      `${score_host}/api/scoreget?key=${this.SCORE_KEY}.${ld.name}&limit=${MAX_SCORES}`,
      (err: string | undefined, scores: HighScoreListRaw) => {
        ld.refresh_in_flight = false;
        if (!err) {
          this.handleScoreResp(level_idx, scores);
        }
        changed_cb?.();
      }
    );
  }

  forceRefreshScores(level_idx: number, timeout?: number): void {
    if (timeout === undefined) {
      timeout = 5000;
    }
    let ld = this.level_defs[level_idx];
    if (ld.last_refresh_time && ld.last_refresh_time < Date.now() - timeout) {
      // Old enough we can bump it up now
      ld.last_refresh_time = 0;
    }
    this.refreshScores(level_idx);
  }

  prefetchScores(level_idx: number): void {
    this.refreshScores(level_idx);
  }

  private clearScore(level: LevelName, old_player_name: string, cb?: VoidFunc): void {
    if (!old_player_name) {
      return;
    }
    fetchJSON2(`${score_host}/api/scoreclear?key=${this.SCORE_KEY}.${level}&name=${old_player_name}`, () => {
      cb?.();
    });
  }

  private submitScore(level_idx: number, score: ScoreType, cb?: VoidFunc): void {
    let level = this.level_defs[level_idx].name;
    let high_score = this.score_to_value(score);
    if (!player_name) {
      return;
    }
    fetchJSON2(
      `${score_host}/api/scoreset?key=${this.SCORE_KEY}.${level}&name=${player_name}&score=${high_score}`,
      (err: string | undefined, scores: HighScoreListRaw) => {
        if (!err) {
          this.handleScoreResp(level_idx, scores);
        }
        cb?.();
      },
    );
  }

  private saveScore(level_idx: number, obj_in: ScoreType): void {
    let ld = this.level_defs[level_idx];
    let obj = obj_in as ScoreTypeInternal<ScoreType>;
    ld.local_score = obj;
    let key = `${this.LS_KEY}.score_${ld.name}`;
    lsd[key] = JSON.stringify(obj);
    if (ld.save_in_flight) {
      return;
    }
    let doSubmit = (): void => {
      this.submitScore(level_idx, obj, () => {
        ld.save_in_flight = false;
        obj.submitted = true;
        if (obj === ld.local_score) {
          lsd[key] = JSON.stringify(obj);
        } else {
          // new score in the meantime
          ld.save_in_flight = true;
          setTimeout(doSubmit, SUBMIT_RATELIMIT);
        }
      });
    };
    ld.save_in_flight = true;
    doSubmit();
  }

  hasScore(level_idx: number): boolean {
    return Boolean(this.getScore(level_idx));
  }

  getScore(level_idx: number): ScoreType | null {
    let ld = this.level_defs[level_idx];
    if (ld.local_score) {
      return ld.local_score; // allow calling each frame and getting cached version instead of spamming submits
    }
    let key = `${this.LS_KEY}.score_${ld.name}`;
    if (lsd[key]) {
      let ret = JSON.parse(lsd[key]!);
      if (!ret) {
        return null;
      }
      ld.local_score = ret;
      if (!ret.submitted) {
        this.saveScore(level_idx, ret);
      }
      return ret;
    }
    return null;
  }

  setScore(level_idx: number, score: ScoreType): void {
    let ld = this.level_defs[level_idx];
    let encoded = this.score_to_value(score) || 0;
    let encoded_local = ld.local_score && this.score_to_value(ld.local_score) || 0;
    if (encoded > encoded_local) {
      this.saveScore(level_idx, score);
    }
  }

  onUpdatePlayerName(old_name: string): void {
    this.level_defs.forEach((ld, level_idx) => {
      if (ld.local_score) {
        this.clearScore(ld.name, old_name, () => {
          this.saveScore(level_idx, ld.local_score!);
        });
      }
    });
  }
}


let all_score_systems: ScoreSystem<any>[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any

export function scoreAlloc<ScoreType>(param: ScoreSystemParam<ScoreType>): ScoreSystem<ScoreType> {
  let ret = new ScoreSystemImpl(param);
  all_score_systems.push(ret);
  return ret;
}

export function scoreFormatName(score: { name: string }): string {
  if (score.name.indexOf('Anonymous') === 0) {
    return score.name.slice(0, 'Anonymous'.length);
  }
  return score.name;
}

export function scoreUpdatePlayerName(new_player_name: string): void {
  if (new_player_name === player_name) {
    return;
  }
  let old_name = player_name;
  lsd[PLAYER_NAME_KEY] = player_name = new_player_name;

  if (old_name.startsWith('Anonymous')) {
    // Only wiping old scores if anonymous, so we can't delete other people's scores!
    for (let ii = 0; ii < all_score_systems.length; ++ii) {
      all_score_systems[ii].onUpdatePlayerName(old_name);
    }
  }
}
