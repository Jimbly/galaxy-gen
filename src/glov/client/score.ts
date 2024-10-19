// Portions Copyright 2023 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT
/* eslint-env browser */

export const FRIEND_CAT_FRIENDS = 'friends';
export const FRIEND_CAT_GLOBAL = 'global';

import assert from 'assert';
import { CmdRespFunc } from 'glov/common/cmd_parse';
import { executeWithRetry } from 'glov/common/execute_with_retry';
import {
  asyncDictionaryGet,
  nop,
} from 'glov/common/util';
import { cmd_parse } from './cmds';
import { fetch } from './fetch';

import type {
  ErrorCallback,
  NetErrorCallback,
  TSMap,
  VoidFunc,
} from 'glov/common/types';

const PLAYER_NAME_KEY = 'ld.player_name';
const USERID_KEY = 'score.userid';
const FRIENDS_KEY = 'score.friends';
const FRIEND_SET_CACHE_KEY = 'score.fsc';
const SCORE_REFRESH_TIME = 5*60*1000; // also refreshes if we submit a new score, or forceRefreshScores() is called
const SUBMIT_RATELIMIT = 5000; // Only kicks in if two are in-flight at the same time

let player_name: string = '';
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
}

let friend_cats: TSMap<string[]> = {};
let friends_by_code: string[] = [];
if (lsd[FRIENDS_KEY]) {
  try {
    friends_by_code = JSON.parse(lsd[FRIENDS_KEY]!) as string[];
  } catch (e) {
    // ignored
  }
}
friend_cats.friends = friends_by_code;

let score_host = 'http://scores.dashingstrike.com';
let score_use_staging = false;
if (window.location.host.indexOf('localhost') !== -1 ||
  window.location.host.indexOf('staging') !== -1/* ||
  window.location.host.indexOf('pink') !== -1*/
) {
  score_host = 'http://scores.staging.dashingstrike.com';
  score_use_staging = true;
}
if (window.location.href.startsWith('https://')) {
  score_host = score_host.replace(/^http:/, 'https:');
}
const friends_host = score_host.replace('scores.', 'friends.');
export function scoreGetPlayerName(): string {
  return player_name;
}
export function scoreIsStaging(): boolean {
  return score_use_staging;
}

function fetchJSON2<T>(url: string, cb: (err: string | undefined, o: T) => void): void {
  fetch({
    url: url,
    response_type: 'json',
  }, (err: string | undefined, resp: unknown) => {
    cb(err, resp as T);
  });
}

function fetchJSON2Timeout<T>(url: string, timeout: number, cb: (err: string | undefined, o: T) => void): void {
  fetch({
    url: url,
    response_type: 'json',
    timeout,
  }, (err: string | undefined, resp: unknown) => {
    cb(err, resp as T);
  });
}


let allocated_user_id: string | null = null;
type UserIDCB = (user_id: string) => void;
type UserAllocResponse = { userid: string };
function withUserID(f: UserIDCB): void {
  if (allocated_user_id === null && lsd[USERID_KEY]) {
    allocated_user_id = lsd[USERID_KEY]!;
    console.log(`Using existing ScoreAPI UserID: "${allocated_user_id}"`);
  }
  if (allocated_user_id !== null) {
    return f(allocated_user_id);
  }

  asyncDictionaryGet<string>('score_user_id', 'the', function (key_the_ignored: string, cb: (value: string) => void) {
    let url = `${score_host}/api/useralloc`;
    function fetchUserID(next: ErrorCallback<string, string>): void {
      fetchJSON2Timeout<UserAllocResponse>(url, 20000, function (err: string | undefined, res: UserAllocResponse) {
        if (err) {
          return next(err);
        }
        assert(res);
        assert(res.userid);
        assert.equal(typeof res.userid, 'string');
        next(null, res.userid);
      });
    }
    function done(err?: string | null, result?: string | null): void {
      assert(!err);
      assert(result);
      allocated_user_id = result;
      lsd[USERID_KEY] = result;
      console.log(`Allocated new ScoreAPI UserID: "${allocated_user_id}"`);
      cb(allocated_user_id);
    }
    executeWithRetry<string, string>(
      fetchUserID, {
        max_retries: Infinity,
        inc_backoff_duration: 250,
        max_backoff: 30000,
        log_prefix: 'ScoreAPI UserID fetch',
      },
      done,
    );
  }, f);
}

export function scoreWithUserID(cb: UserIDCB): void {
  withUserID(cb);
}

type FriendSetResponse = { friendset: string };
function friendSetFetch(friend_set_key: string, cb: (friend_set_code: string) => void): void {
  let url = `${friends_host}/api/friendsetget?${friend_set_key}`;
  function fetchFriendSet(next: ErrorCallback<string, string>): void {
    fetchJSON2Timeout<FriendSetResponse>(url, 20000, function (err: string | undefined, res: FriendSetResponse) {
      if (err) {
        return next(err);
      }
      assert(res);
      assert(res.friendset);
      assert.equal(typeof res.friendset, 'string');
      next(null, res.friendset);
    });
  }
  function done(err?: string | null, result?: string | null): void {
    assert(!err);
    assert(result);
    console.log(`Looked up ScoreAPI FriendSet for "${friend_set_key}": "${result}"`);
    cb(result);
  }
  executeWithRetry<string, string>(
    fetchFriendSet, {
      max_retries: Infinity,
      inc_backoff_duration: 250,
      max_backoff: 30000,
      log_prefix: 'ScoreAPI UserID fetch',
    },
    done,
  );
}

// run-time cache - caches all queried in this process
let friend_set_code_cache: TSMap<string> = {};
// persistent cache - caches just one per friend_cat, populates run-time cache once at startup
let friend_set_code_persistent_cache: TSMap<[string, string]> = {};
if (lsd[FRIEND_SET_CACHE_KEY]) {
  try {
    friend_set_code_persistent_cache = JSON.parse(lsd[FRIEND_SET_CACHE_KEY]!) as TSMap<[string, string]>;
    for (let key in friend_set_code_persistent_cache) {
      let pair = friend_set_code_persistent_cache[key]!;
      assert.equal(pair.length, 2);
      friend_set_code_cache[pair[0]] = pair[1];
    }
  } catch (e) {
    // ignored
  }
}
function withFriendSet(friend_cat: string, cb: (friend_set_code: string) => void): void {
  assert(allocated_user_id);
  if (friend_cat === FRIEND_CAT_GLOBAL) {
    // When fetching the global high score list, provide the user's friends' friend_set so
    //   they can be highlighted (but not filtered)
    friend_cat = FRIEND_CAT_FRIENDS;
  }
  let friend_codes = (friend_cats[friend_cat] || []).map((a) => `f=${a}`);
  friend_codes.push(`u=${allocated_user_id}`);
  friend_codes.sort();
  let friend_set_key = friend_codes.join('&');
  if (friend_set_code_cache[friend_set_key]) {
    return cb(friend_set_code_cache[friend_set_key]!);
  }
  asyncDictionaryGet('friend_set_code', friend_set_key, friendSetFetch, function (friend_set_code: string) {
    friend_set_code_cache[friend_set_key] = friend_set_code;
    friend_set_code_persistent_cache[friend_cat] = [friend_set_key, friend_set_code];
    lsd[FRIEND_SET_CACHE_KEY] = JSON.stringify(friend_set_code_persistent_cache);
    cb(friend_set_code);
  });
}

export type LevelName = string;
export type LevelDef = {
  name?: LevelName;
};
type ScoreTypeInternal<ScoreType> = ScoreType & {
  submitted?: boolean;
  payload?: string;
};
type HighScoreContainer<ScoreType> = {
  last_refresh_time?: number;
  refresh_in_flight?: boolean;
  high_scores?: HighScoreList<ScoreType>;
  high_scores_raw?: HighScoreListRaw;
};
type LevelDefInternal<ScoreType> = {
  name: LevelName;
  local_score?: ScoreTypeInternal<ScoreType>; // internal to score system
  save_in_flight?: boolean;
  hs_by_cat: TSMap<HighScoreContainer<ScoreType>>;
};
export type ScoreSystem<T> = ScoreSystemImpl<T>;
export type ScoreSystemParam<ScoreType> = {
  score_to_value: (s: ScoreType) => number;
  value_to_score: (v: number) => ScoreType;
  level_defs: LevelDef[] | number; // List of {name}s or just a number of (numerically indexed) levels
  score_key: string;
  ls_key?: string; // only if different than score_key (for migration)
  asc: boolean;
  rel?: number;
  num_names?: number;
  histogram?: boolean; // also fetch histogram data
};
type HighScoreListEntryRaw = {
  n?: string | string[]; // representative list of user display names
  s: number; // score value
  c?: number; // count of users at this score
  r?: number; // rank, if not implicit
};
type HighScoreHistogramRaw = {
  s: number; // start
  b: number; // bucket_size
  h: number[];
};
type HighScoreListRaw = {
  total: number;
  my_rank?: number;
  my_score?: number;
  list: HighScoreListEntryRaw[];
  histo?: HighScoreHistogramRaw;
};
export type HighScoreListEntry<ScoreType> = {
  names: string[];
  names_str: string;
  count: number;
  rank: number;
  score: ScoreType;
};
export type HighScoreListHistogram = {
  start: number;
  bucket_size: number;
  counts: number[];
};
export type HighScoreList<ScoreType> = {
  total: number;
  my_rank?: number;
  my_score?: number;
  list: HighScoreListEntry<ScoreType>[];
  histogram?: HighScoreListHistogram;
};
class ScoreSystemImpl<ScoreType> {
  score_to_value: (s: ScoreType) => number;
  value_to_score: (v: number) => ScoreType;
  level_defs: LevelDefInternal<ScoreType>[];
  asc: boolean;
  rel: number;
  num_names: number;
  histogram: boolean;
  SCORE_KEY: string;
  LS_KEY: string;
  constructor(param: ScoreSystemParam<ScoreType>) {
    this.score_to_value = param.score_to_value;
    this.value_to_score = param.value_to_score;
    this.asc = param.asc;
    this.rel = param.rel || 20;
    this.num_names = param.num_names || 3;
    this.histogram = param.histogram || false;
    let level_defs: LevelDefInternal<ScoreType>[] = [];
    if (typeof param.level_defs === 'number') {
      for (let level_idx = 0; level_idx < param.level_defs; ++level_idx) {
        level_defs.push({
          name: '', // name filled below
          hs_by_cat: {},
        });
      }
    } else {
      for (let ii = 0; ii < param.level_defs.length; ++ii) {
        level_defs.push({
          name: param.level_defs[ii].name || '', // name filled below
          hs_by_cat: {},
        });
      }
    }
    this.level_defs = level_defs;

    this.SCORE_KEY = param.score_key;
    this.LS_KEY = param.ls_key || this.SCORE_KEY.toLowerCase();

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

  getHighScores(level_idx: number, friend_cat: string): HighScoreList<ScoreType> | null {
    this.refreshScores(level_idx, friend_cat);
    return this.level_defs[level_idx].hs_by_cat[friend_cat]?.high_scores || null;
  }

  private handleScoreResp(level_idx: number, friend_cat: string, scores: HighScoreListRaw): void {
    let ld = this.level_defs[level_idx];
    let bc = ld.hs_by_cat[friend_cat];
    if (!bc) {
      ld.hs_by_cat[friend_cat] = bc = {};
    }
    bc.high_scores_raw = scores;
    this.formatScoreResp(level_idx, friend_cat);
  }

  private formatScoreResp(level_idx: number, friend_cat: string): void {
    let ld = this.level_defs[level_idx];
    let bc = ld.hs_by_cat[friend_cat];
    assert(bc);
    let scores = bc.high_scores_raw;
    assert(scores);

    let ret: HighScoreList<ScoreType> = {
      total: scores.total,
      my_rank: scores.my_rank,
      my_score: scores.my_score,
      list: [],
    };
    let rank = 1;
    for (let ii = 0; ii < scores.list.length; ++ii) {
      let entry = scores.list[ii];
      let names = entry.n || [];
      if (typeof names === 'string') {
        names = [names];
      } else {
        names = names.slice(0);
      }
      let count = entry.c || 1;
      let this_rank = entry.r || rank;
      if (this_rank === scores.my_rank) {
        // Ensure own name is in list
        let my_name = scoreGetPlayerName();
        if (my_name && !names.includes(my_name)) {
          names.unshift(my_name);
          if (names.length > this.num_names) {
            names.pop();
          }
        }
      }
      if (!names.length) {
        // If unknown names, add at least one "Anonymous" to the list, so no entry is name-less
        names.push('Anonymous');
      }
      let names_str = names.join(', ');
      if (count > names.length) {
        names_str += `${names_str ? ', ' : ''}${count - names.length} ${names.length ? 'others' : 'users'}`;
      }
      ret.list.push({
        score: this.value_to_score(entry.s),
        names,
        names_str,
        count,
        rank: this_rank,
      });
      rank = this_rank + count;
    }

    let { histo } = scores;
    if (histo) {
      let histogram: HighScoreListHistogram = {
        start: histo.s,
        bucket_size: histo.b,
        counts: histo.h,
      };
      ret.histogram = histogram;
    }

    if (!ret.my_rank) {
      // No score on server, ensure things are consistent
      if (ld.local_score && ld.local_score.submitted && !ld.save_in_flight) {
        // we submitted it, but it's no longer on the server, must be invalid, clear it locally
        console.log(`score: ${ld.name}: fetched scores, but mine was not in it, deleting local score...`);
        delete ld.local_score;
        let key = `${this.LS_KEY}.score_${ld.name}`;
        delete lsd[key];
      }
    }

    bc.high_scores = ret;
  }
  last_friend_cat = FRIEND_CAT_GLOBAL;
  private makeURL(api: string, ld: LevelDef, friend_cat: string, friend_set_code: string): string {
    assert(allocated_user_id);
    let url = `${score_host}/api/${api}?v2&key=${this.SCORE_KEY}.${ld.name}&userid=${allocated_user_id}`;
    if (this.rel) {
      url += `&rel=${this.rel}`;
    }
    if (friend_set_code) {
      url += `&fs=${friend_set_code}`;
      if (friend_cat !== FRIEND_CAT_GLOBAL) {
        url += '&of';
      }
    }
    if (this.num_names !== 3) {
      url += `&num_names=${this.num_names}`;
    }
    if (this.asc) {
      url += '&asc';
    }
    if (this.histogram) {
      url += '&histo';
    }
    return url;
  }
  private refreshScores(level_idx: number, friend_cat: string, changed_cb?: VoidFunc): void {
    this.last_friend_cat = friend_cat;
    let ld = this.level_defs[level_idx];
    if (!ld) {
      ld = this.level_defs[level_idx] = {
        name: String(level_idx),
        hs_by_cat: {},
      };
    }
    let bc = ld.hs_by_cat[friend_cat] = ld.hs_by_cat[friend_cat] || {};
    if (bc.refresh_in_flight) {
      changed_cb?.();
      return;
    }
    let now = Date.now();
    if (!bc.last_refresh_time || now - bc.last_refresh_time > SCORE_REFRESH_TIME) {
      // do it
    } else {
      changed_cb?.();
      return;
    }
    bc.last_refresh_time = now;
    bc.refresh_in_flight = true;
    // Note: only technically need the `userid` if we have no locally saved
    //   score, are using `rel`, and expect to have a remotely saved score
    //   for our user ID (shouldn't actually ever happen on web)
    withUserID(() => {
      withFriendSet(friend_cat, (friend_set_code: string) => {
        let url = this.makeURL('scoreget', ld, friend_cat, friend_set_code);

        let my_score = ld.local_score ? this.score_to_value(ld.local_score) : null;
        if (my_score) {
          url += `&score=${my_score}`;
        }
        fetchJSON2(
          url,
          (err: string | undefined, scores: HighScoreListRaw) => {
            bc.refresh_in_flight = false;
            if (!err) {
              this.handleScoreResp(level_idx, friend_cat, scores);
            }
            changed_cb?.();
          }
        );
      });
    });
  }

  forceRefreshScores(level_idx: number, friend_cat: string, timeout?: number): void {
    if (timeout === undefined) {
      timeout = 5000;
    }
    let ld = this.level_defs[level_idx];
    let bc = ld.hs_by_cat[friend_cat] = ld.hs_by_cat[friend_cat] || {};
    if (bc.last_refresh_time && bc.last_refresh_time < Date.now() - timeout) {
      // Old enough we can bump it up now
      bc.last_refresh_time = 0;
    }
    this.refreshScores(level_idx, friend_cat);
  }

  prefetchScores(level_idx: number, friend_cat: string): void {
    this.refreshScores(level_idx, friend_cat);
  }

  private submitScore(level_idx: number, score: ScoreType, payload?: string, cb?: NetErrorCallback): void {
    let ld = this.level_defs[level_idx];
    let high_score = this.score_to_value(score);
    withUserID(() => {
      let friend_cat = this.last_friend_cat;
      withFriendSet(friend_cat, (friend_set_code: string) => {
        let url = this.makeURL('scoreset', ld, friend_cat, friend_set_code);
        url += `&score=${high_score}`;
        if (player_name) {
          url += `&name=${encodeURIComponent(player_name)}`;
        }
        if (payload) {
          let payload_part = `&payload=${encodeURIComponent(payload)}`;
          if (url.length + payload_part.length >= 2000) {
            payload_part = '&payload="truncated"';
          }
          url += payload_part;
          // if (payload.includes('ForceNetError')) {
          //   url = 'http://errornow.dashingstrike.com/scoreset/error';
          // }
        }
        fetchJSON2(
          url,
          (err: string | undefined, scores: HighScoreListRaw) => {
            if (!err) {
              this.handleScoreResp(level_idx, friend_cat, scores);
            }
            cb?.(err || null);
          },
        );
      });
    });
  }

  private saveScore(level_idx: number, obj_in: ScoreType, payload?: string): void {
    let ld = this.level_defs[level_idx];
    let obj = obj_in as ScoreTypeInternal<ScoreType>;
    obj.payload = payload;
    ld.local_score = obj;
    let key = `${this.LS_KEY}.score_${ld.name}`;
    lsd[key] = JSON.stringify(obj);
    if (ld.save_in_flight) {
      return;
    }
    let doSubmit = (): void => {
      obj = ld.local_score!;
      this.submitScore(level_idx, obj, obj.payload, (err: string | null) => {
        ld.save_in_flight = false;
        if (!err) {
          obj.submitted = true;
        }
        if (obj === ld.local_score) {
          if (!err) {
            lsd[key] = JSON.stringify(obj);
          }
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
        this.saveScore(level_idx, ret, ret.payload);
      }
      return ret;
    }
    return null;
  }

  setScore(level_idx: number, score: ScoreType, payload?: string): void {
    let ld = this.level_defs[level_idx];
    let encoded = this.score_to_value(score) || 0;
    let encoded_local = ld.local_score && this.score_to_value(ld.local_score) || (this.asc ? Infinity : 0);
    if (this.asc ? encoded < encoded_local : encoded > encoded_local ||
      encoded === encoded_local && !ld.local_score?.submitted
    ) {
      this.saveScore(level_idx, score, payload);
    }
  }

  onUpdatePlayerName(old_name: string): void {
    for (let level_idx = 0; level_idx < this.level_defs.length; ++level_idx) {
      let ld = this.level_defs[level_idx];
      for (let friend_cat in ld.hs_by_cat) {
        let scores = ld.hs_by_cat[friend_cat]!.high_scores_raw;
        if (!scores) {
          continue;
        }
        // Strip my old name from the cached responses
        if (scores.my_rank) {
          let rank = 1;
          for (let ii = 0; ii < scores.list.length; ++ii) {
            let entry = scores.list[ii];
            let count = entry.c || 1;
            let this_rank = entry.r || rank;
            if (this_rank === scores.my_rank) {
              let n = entry.n;
              if (n) {
                if (typeof n === 'string') {
                  n = [n];
                }
                let idx = n.indexOf(old_name);
                if (idx !== -1) {
                  n.splice(idx, 1);
                  entry.n = n;
                }
              }
            }
            rank = this_rank + count;
          }
        }
        // Reformat and add new name
        this.formatScoreResp(level_idx, friend_cat);
      }
    }
  }
}


let all_score_systems: ScoreSystem<any>[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any

export function scoreAlloc<ScoreType>(param: ScoreSystemParam<ScoreType>): ScoreSystem<ScoreType> {
  withUserID(nop);
  let ret = new ScoreSystemImpl(param);
  all_score_systems.push(ret);
  return ret;
}

export function scoreFormatName<ScoreType>(score: HighScoreListEntry<ScoreType>): string {
  return score.names_str;
}

export function scoreUpdatePlayerName(new_player_name: string): void {
  if (new_player_name) {
    new_player_name = new_player_name.trim().slice(0, 64); // same logic as on server
  }
  if (new_player_name === player_name || !new_player_name) {
    return;
  }
  let old_name = player_name;
  lsd[PLAYER_NAME_KEY] = player_name = new_player_name;

  withUserID((user_id: string) => {
    let url = `${score_host}/api/userrename?userid=${user_id}&name=${encodeURIComponent(player_name)}`;
    fetch({
      url,
    }, (err: string | undefined, res: string) => {
      if (err) {
        if (res) {
          try {
            err = JSON.parse(res).err || err;
          } catch (e) {
            // ignored
          }
        }
        lsd[PLAYER_NAME_KEY] = player_name = old_name;
        alert(`Error updating player name: "${err}"`); // eslint-disable-line no-alert
      } else {
        for (let ii = 0; ii < all_score_systems.length; ++ii) {
          all_score_systems[ii].onUpdatePlayerName(old_name);
        }
      }
    });
  });
}

export function scoreFriendCatAdd(cat: string, list: string[]): void {
  friend_cats[cat] = list;
}

export function scoreFriendCodeGet(cb: (err: null | string, code: string) => void): void {
  withUserID(function (user_id: string) {
    fetch({
      url: `${friends_host}/api/friendcodeget?userid=${user_id}`,
    }, (err: string | undefined, res: string) => {
      if (err) {
        if (res) {
          console.error(res);
          try {
            err = JSON.parse(res).err as string || err;
          } catch (e) {
            // ignored
          }
        }
        cb(err, '');
      } else {
        try {
          cb(null, JSON.parse(res).friendcode);
        } catch (e) {
          console.error(res);
          cb('Error parsing response', '');
        }
      }
    });
  });
}

cmd_parse.register({
  cmd: 'score_friend_code_get',
  help: 'Displays one\'s own friend code',
  func: function (param: string, resp_func: CmdRespFunc): void {
    scoreFriendCodeGet(resp_func);
  },
});

cmd_parse.register({
  cmd: 'score_friend_list',
  help: 'List friends',
  func: function (param: string, resp_func: CmdRespFunc): void {
    resp_func(null, friends_by_code.join(', ') || 'You have no friends');
  },
});

cmd_parse.register({
  cmd: 'score_friend_add',
  help: 'Add friend by friend code',
  func: function (param: string, resp_func: CmdRespFunc): void {
    let fc = param.trim().toUpperCase();
    if (!fc) {
      return resp_func('Missing friend code');
    }
    if (friends_by_code.includes(fc)) {
      return resp_func(null, 'Friend already on list.');
    }
    friends_by_code.push(fc);
    lsd[FRIENDS_KEY] = JSON.stringify(friends_by_code);
    resp_func(null, 'Friend added');
  },
});

cmd_parse.register({
  cmd: 'score_friend_remove',
  help: 'Remove friend by friend code',
  func: function (param: string, resp_func: CmdRespFunc): void {
    let fc = param.trim().toUpperCase();
    if (!fc) {
      return resp_func('Missing friend code');
    }
    if (!friends_by_code.includes(fc)) {
      return resp_func(null, 'Friend not on list.');
    }
    friends_by_code.splice(friends_by_code.indexOf(fc), 1);
    lsd[FRIENDS_KEY] = JSON.stringify(friends_by_code);
    resp_func(null, 'Friend removed');
  },
});
