// Portions Copyright 2023 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT
/* globals localStorage, alert */

export const FRIEND_CAT_FRIENDS = 'friends';
export const FRIEND_CAT_GLOBAL = 'global';
export const FRIEND_CAT_JUSTME = 'justme';

import assert from 'assert';
import type { CmdRespFunc } from 'glov/common/cmd_parse';
import { executeWithRetry } from 'glov/common/execute_with_retry';
import type {
  ErrorCallback,
  NetErrorCallback,
  TSMap,
  VoidFunc,
} from 'glov/common/types';
import {
  asyncDictionaryGet,
  callEach,
  clone,
  nop,
  plural,
} from 'glov/common/util';
import { MODE_DEVELOPMENT } from './client_config';
import { cmd_parse } from './cmds';
import { errorReportSetDetails } from './error_report';
import { fetch } from './fetch';
import {
  score_user_provider_auto_web,
} from './score_provider_autoweb';

const USERID_CACHE_KEY = 'score.idcache';
const FRIEND_SET_CACHE_KEY = 'score.fsc';
const SCORE_REFRESH_TIME = 5*60*1000; // also refreshes if we submit a new score, or forceRefreshScores() is called
const SUBMIT_RATELIMIT = 5000; // Only kicks in if two are in-flight at the same time

let lsd = (function (): Partial<Record<string, string>> {
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    return localStorage;
  } catch (e) {
    return {};
  }
}());

export function scoreLSD(): Partial<Record<string, string>> {
  return lsd;
}

export function scoreLSDParse<T>(key: string): T | undefined {
  if (lsd[key]) {
    try {
      return JSON.parse(lsd[key]!) as T;
    } catch (e) {
      // ignored
    }
  }
  return undefined;
}

// Map from FRIEND_CAT_FRIENDS and user-specified categories to arrays of friend codes/u=user_ids
let friend_cats: TSMap<string[]> = {};

let score_host = 'http://scores.dashingstrike.com';
let score_use_staging = false;
if (MODE_DEVELOPMENT ||
  window.location.host.indexOf('staging') !== -1/* ||
  window.location.host.indexOf('pink') !== -1*/
) {
  score_host = 'http://scores.staging.dashingstrike.com';
  // score_host = 'http://localhost:4005';
  score_use_staging = true;
}
if (window.location.href.startsWith('https://')) {
  score_host = score_host.replace(/^http:/, 'https:');
}
const friends_host = score_host.replace('scores.', 'friends.').replace(':4005', ':4023');
const auth_host = score_host.replace('scores.', 'auth.').replace(':4005', ':4024');
export function scoreGetAuthHost(): string {
  return auth_host;
}
export function scoreGetScoreHost(): string {
  return score_host;
}
let player_name = '';
export function scoreGetPlayerName(): string {
  return player_name;
}
export function scoreIsStaging(): boolean {
  return score_use_staging;
}

let time_async_start = 0;
let time_async_finish = 0;
let likely_offline = false;
export function scoreLikelyOffline(): boolean {
  // Assumes this is called per-frame to keep state updated
  if (!time_async_start) {
    // no data, assume online
    return likely_offline;
  }
  if (time_async_finish > time_async_start) {
    // known online
    likely_offline = false;
  } else if (time_async_start < Date.now() - 2000) {
    // nothing in 2 seconds, assume offline until we get a response
    likely_offline = true;
  } // else, use whatever state we last saw
  return likely_offline;
}

function fetchJSON2<T>(url: string, cb: (err: string | undefined, o: T) => void): void {
  time_async_start = Date.now();
  fetch({
    url: url,
    response_type: 'json',
  }, (err: string | undefined, resp: unknown) => {
    if (!err) {
      time_async_finish = Date.now();
      likely_offline = false;
    }
    cb(err, resp as T);
  });
}

export function fetchJSON2Timeout<T>(url: string, timeout: number, cb: (err: string | undefined, o: T) => void): void {
  time_async_start = Date.now();
  fetch({
    url: url,
    response_type: 'json',
    timeout,
  }, (err: string | undefined, resp: unknown) => {
    if (!err) {
      time_async_finish = Date.now();
      likely_offline = false;
    }
    cb(err, resp as T);
  });
}

export type ScoreUserInfo = {
  user_id: string;
  display_name: string | null;
  friends: string[]; // array of `FriendCode` or `u=user_id` strings; mutable by provider if changed
};

export type ScoreUserProvider = {
  provider_id: string;
  // getUserID() - called once
  getAccountInfo(cb: ErrorCallback<ScoreUserInfo, string>): void;
  // getAuthToken() - called on every request (callee does caching/expiration)
  getAuthToken(cb: ErrorCallback<string | null, string>): void;
  // setName() - optional if provider allows renames to come from apps
  setName: null | ((name: string) => void);
};
let score_user_provider = score_user_provider_auto_web;
assert(score_user_provider);
let has_requested_user = false;
export function scoreUserProviderSet(provider: ScoreUserProvider): void {
  assert(!has_requested_user);
  score_user_provider = provider;
}


let allocated_user_id: string | null = null;
export function scoreDebugUserID(): string | null {
  return allocated_user_id;
}
type UserIDCB = (user_id: string) => void;
type ScoreIDCache = ScoreUserInfo & {
  provider_id: string;
};
function withUserID(f: UserIDCB): void {
  has_requested_user = true;
  if (allocated_user_id !== null) {
    return f(allocated_user_id);
  }

  asyncDictionaryGet<string>('score_user_id', 'the', function (key_the_ignored: string, cb: (value: string) => void) {

    function done(err?: string | null, result?: ScoreUserInfo | null): void {
      assert(!err);
      assert(result);
      assert(result.user_id);
      assert(result.friends); // possibly empty array, though
      allocated_user_id = result.user_id;
      player_name = result.display_name || '';
      errorReportSetDetails('score_id', allocated_user_id);
      errorReportSetDetails('score_name', player_name);

      friend_cats[FRIEND_CAT_FRIENDS] = result.friends;
      let new_user = false;
      let need_rename = false;

      let old_cache = scoreLSDParse<ScoreIDCache>(USERID_CACHE_KEY) || null;
      if (old_cache) {
        let id_changed = old_cache.user_id !== result.user_id;
        if (id_changed) {
          new_user = true;
        } else {
          need_rename = Boolean(old_cache.display_name !== result.display_name);
        }
      } else {
        new_user = true;
      }
      if (new_user) {
        // new user on this device
        // clear per-level score cache if user ID has changed
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        scoreClearScoreCache();
        // could also submit a rename here, but it causes a spurious rename for _every_ new user, which 400s
      }
      let cache_data: ScoreIDCache = {
        ...result,
        provider_id: score_user_provider.provider_id,
      };
      lsd[USERID_CACHE_KEY] = JSON.stringify(cache_data);
      console.log(`Using ScoreAPI UserID: "${allocated_user_id}", display name: "${player_name}"`);
      cb(allocated_user_id);

      if (need_rename && result.display_name) {
        // Send current name to the server
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        scoreUpdatePlayerNameInternal(player_name, function (err: string | null) {
          if (err) {
            console.error('Error updating score server with new name:', err);
          }
        });
      }
    }
    executeWithRetry<ScoreUserInfo, string>(
      score_user_provider.getAccountInfo.bind(score_user_provider), {
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

let auth_in_flight: null | ((auth: string) => void)[] = null;
function withAuthToken(cb: (auth: string) => void): void {
  if (auth_in_flight) {
    auth_in_flight.push(cb);
    return;
  }
  auth_in_flight = [cb];
  function done(err?: string | null, result?: string | null): void {
    assert(!err);
    assert(result !== undefined);
    let auth_param = result ? `&auth=${result}` : '';
    callEach(auth_in_flight, auth_in_flight = null, auth_param);
  }
  executeWithRetry<string, string>(
    score_user_provider.getAuthToken.bind(score_user_provider), {
      max_retries: Infinity,
      inc_backoff_duration: 250,
      max_backoff: 30000,
      log_prefix: 'ScoreAPI Auth token fetch',
    },
    done,
  );
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
let friend_set_dict_name = 'friend_set_code';
function friendSetCacheWipe(): void {
  friend_set_code_cache = {};
  friend_set_code_persistent_cache = {};
  delete lsd[FRIEND_SET_CACHE_KEY];
  friend_set_dict_name += '2';
}
function providerFriendToParam(str: string): string {
  if (str.startsWith('u=')) {
    return str;
  }
  return `f=${str}`;
}
function withFriendSet(friend_cat: string, cb: (friend_set_code: string | null) => void): void {
  assert(allocated_user_id);
  if (friend_cat === FRIEND_CAT_GLOBAL) {
    // When fetching the global high score list, provide the user's friends' friend_set so
    //   they can be highlighted (but not filtered)
    friend_cat = FRIEND_CAT_FRIENDS;
  }
  let friend_codes = (friend_cats[friend_cat] || []).map(providerFriendToParam);
  if (!friend_codes.length) {
    return cb(null);
  }
  friend_codes.push(`u=${allocated_user_id}`);
  friend_codes.sort();
  let friend_set_key = friend_codes.join('&');
  if (friend_set_code_cache[friend_set_key]) {
    return cb(friend_set_code_cache[friend_set_key]!);
  }
  asyncDictionaryGet(friend_set_dict_name, friend_set_key, friendSetFetch, function (friend_set_code: string) {
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
export type HighScoreListEntryRaw = {
  n?: string | string[]; // representative list of user display names
  s: number; // score value
  c?: number; // count of users at this score
  r?: number; // rank, if not implicit
};
export type HighScoreHistogramRaw = {
  s: number; // start
  b: number; // bucket_size
  h: number[];
};
export type HighScoreListRaw = {
  total: number;
  my_rank?: number;
  my_score?: number;
  list: HighScoreListEntryRaw[];
  histo?: HighScoreHistogramRaw;
  overloaded?: boolean;
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
  overloaded: boolean;
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
      this.loadLocalScore(level_idx); // fetch .local_score for updatePlayerName to take advantage of
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
      overloaded: scores.overloaded || false,
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
        let remaining = count - names.length;
        names_str += `${names_str ? ', ' : ''}${remaining} ${plural(remaining, names.length ? 'other' : 'user')}`;
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

  getHighScoresOverride(level_idx: number, scores: HighScoreListRaw): HighScoreList<ScoreType> | null {
    // Fetch "high scores" for just me to find my high score as known by the server
    let my_high_score = this.getHighScores(level_idx, FRIEND_CAT_JUSTME);
    let my_score = my_high_score?.my_score || undefined;
    let my_name = scoreGetPlayerName();

    if (!my_score) {
      // also try local storage if it's there
      let ld = this.level_defs[level_idx];
      if (ld.local_score) {
        my_score = this.score_to_value(ld.local_score);
      }
    }

    let ret: HighScoreList<ScoreType> = {
      total: scores.total,
      my_rank: undefined,
      my_score,
      list: [],
      overloaded: false,
    };
    if (my_score !== undefined) {
      ret.total++;
    }
    let did_my_score = false;
    let rank = 1;
    let rank_offs = 0;
    for (let ii = 0; ii < scores.list.length; ++ii) {
      let entry = scores.list[ii];
      let names = entry.n || [];
      if (typeof names === 'string') {
        names = [names];
      } else {
        names = names.slice(0);
      }
      let count = entry.c || 1;
      if (!did_my_score && my_score && (this.asc && entry.s > my_score || !this.asc && entry.s < my_score)) {
        // we passed my score, add an entry
        ret.my_rank = rank;
        ret.list.push({
          score: this.value_to_score(my_score),
          names: [my_name],
          names_str: my_name,
          count: 1,
          rank,
        });
        rank_offs++;
        rank++;
        did_my_score = true;
      }
      let this_rank = (entry.r ? entry.r + rank_offs : 0) || rank;
      if (entry.s === my_score) {
        // Add own name is in list
        names.unshift(my_name);
        count++;
        rank_offs++;
        ret.my_rank = this_rank;
        did_my_score = true;
      }
      if (!names.length) {
        // If unknown names, add at least one "Anonymous" to the list, so no entry is name-less
        names.push('Anonymous');
      }
      let names_str = names.join(', ');
      if (count > names.length) {
        let remaining = count - names.length;
        names_str += `${names_str ? ', ' : ''}${remaining} ${plural(remaining, names.length ? 'other' : 'user')}`;
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

    if (!did_my_score && my_score) {
      ret.my_rank = rank;
      ret.list.push({
        score: this.value_to_score(my_score),
        names: [my_name],
        names_str: my_name,
        count: 1,
        rank,
      });
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

    return ret;
  }


  last_friend_cat = FRIEND_CAT_GLOBAL;
  private makeURL(api: string, ld: LevelDef, friend_cat: string, friend_set_code: string | null): string {
    assert(allocated_user_id);
    let url = `${score_host}/api/${api}?v2&key=${this.SCORE_KEY}.${ld.name}&userid=${allocated_user_id}`;
    if (this.rel) {
      url += `&rel=${this.rel}`;
    }
    if (friend_set_code) {
      url += `&fs=${friend_set_code}`;
    }
    if (friend_cat !== FRIEND_CAT_GLOBAL) {
      url += '&of';
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
      withFriendSet(friend_cat, (friend_set_code: string | null) => {
        let url = this.makeURL('scoreget', ld, friend_cat, friend_set_code);

        let my_score = ld.local_score ? this.score_to_value(ld.local_score) : null;
        if (my_score) {
          url += `&score=${my_score}`;
        }
        fetchJSON2(
          url,
          (err: string | undefined, scores: HighScoreListRaw) => {
            bc.refresh_in_flight = false;
            if (err && scores && typeof scores === 'string' &&
              (scores as string).includes('ERR_INVALID_FRIENDSETID')
            ) {
              // probably a staging friendset on prod or vice versa, kill the cache
              console.error('Received ERR_INVALID_FRIENDSETID from server, wiping friend set cache');
              friendSetCacheWipe();
              // Could also automatically do 1 retry here, but it's probably fine
            }
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
      withFriendSet(friend_cat, (friend_set_code: string | null) => {
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
        withAuthToken((auth: string) => {
          fetchJSON2(
            url + auth,
            (err: string | undefined, scores: HighScoreListRaw) => {
              if (!err) {
                this.handleScoreResp(level_idx, friend_cat, scores);
              }
              cb?.(err || null);
            },
          );
        });
      });
    });
  }

  private saveScore(level_idx: number, obj_in: ScoreType, payload?: string): void {
    let ld = this.level_defs[level_idx];
    let obj = clone(obj_in as ScoreTypeInternal<ScoreType>);
    obj.payload = payload;
    ld.local_score = obj;
    let key = `${this.LS_KEY}.score_${ld.name}`;
    withUserID((user_id: string) => {
      lsd[key] = JSON.stringify({
        ...obj,
        submitted: false,
        user_id,
      });
    });
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
            withUserID((user_id: string) => {
              lsd[key] = JSON.stringify({
                ...obj,
                submitted: true,
                user_id,
              });
            });
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

  private loadLocalScore(level_idx: number): void {
    let ld = this.level_defs[level_idx];
    if (ld.local_score) {
      return;
    }
    let key = `${this.LS_KEY}.score_${ld.name}`;
    let saved = lsd[key];
    if (!saved) {
      return;
    }
    let ret = JSON.parse(saved);
    if (!ret) {
      return;
    }
    withUserID((user_id: string) => {
      if (ret.user_id !== user_id) {
        return;
      }
      ld.local_score = ret;
      if (!ret.submitted) {
        this.saveScore(level_idx, ret, ret.payload);
      }
      return ret;
    });
  }

  getScore(level_idx: number): ScoreType | null {
    let ld = this.level_defs[level_idx];
    if (ld.local_score) {
      return ld.local_score; // allow calling each frame and getting cached version instead of spamming submits
    }
    return null;
  }

  setScore(level_idx: number, score: ScoreType, payload?: string): void {
    let ld = this.level_defs[level_idx];
    let encoded = this.score_to_value(score) || 0;
    let encoded_local = ld.local_score && this.score_to_value(ld.local_score) || (this.asc ? Infinity : 0);
    if (this.asc ? encoded < encoded_local : encoded > encoded_local ||
      encoded === encoded_local && !ld.local_score?.submitted && !ld.save_in_flight
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

  clearScoreCache(): void {
    for (let level_idx = 0; level_idx < this.level_defs.length; ++level_idx) {
      let ld = this.level_defs[level_idx];
      if (ld.local_score && ld.local_score.submitted && !ld.save_in_flight) {
        console.log(`score: ${ld.name}: clearing cached score ${JSON.stringify(ld.local_score)}...`);
        delete ld.local_score;
        let key = `${this.LS_KEY}.score_${ld.name}`;
        delete lsd[key];
      }
    }
  }
}


let need_clear_at_startup = false;
let all_score_systems: ScoreSystem<any>[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any

export function scoreAlloc<ScoreType>(param: ScoreSystemParam<ScoreType>): ScoreSystem<ScoreType> {
  withUserID(nop);
  let ret = new ScoreSystemImpl(param);
  all_score_systems.push(ret);
  if (need_clear_at_startup) {
    ret.clearScoreCache();
  }
  return ret;
}

export function scoreFormatName<ScoreType>(score: HighScoreListEntry<ScoreType>): string {
  return score.names_str;
}

export function scoreCanUpdatePlayerName(): boolean {
  return Boolean(score_user_provider.setName);
}

// Just sends to server, no change to our state, call scoreUpdatePlayerName() for any run-time updates
function scoreUpdatePlayerNameInternal(new_player_name: string, cb: (err: string | null) => void): void {
  if (new_player_name) {
    new_player_name = new_player_name.trim().slice(0, 64); // same logic as on server
  }
  if (!new_player_name) {
    return cb(null);
  }

  withUserID((user_id: string) => {
    let url = `${score_host}/api/userrename?userid=${user_id}&name=${encodeURIComponent(player_name)}`;
    withAuthToken((auth: string) => {
      fetch({
        url: url + auth,
      }, (err: string | undefined, res: string) => {
        if (err) {
          if (res) {
            try {
              err = JSON.parse(res).err || err;
            } catch (e) {
              // ignored
            }
          }
          cb(err as string);
        } else {
          cb(null);
        }
      });
    });
  });
}
export function scoreUpdatePlayerName(new_player_name: string): void {
  assert(score_user_provider.setName);
  if (new_player_name) {
    new_player_name = new_player_name.trim().slice(0, 64); // same logic as on server
  }
  if (new_player_name === player_name || !new_player_name) {
    return;
  }
  let old_name = player_name;
  player_name = new_player_name;
  errorReportSetDetails('score_name', player_name);
  scoreUpdatePlayerNameInternal(new_player_name, function (err) {
    if (err) {
      player_name = old_name;
      errorReportSetDetails('score_name', player_name);
      alert(`Error updating player name: "${err}"`); // eslint-disable-line no-alert
    } else {
      score_user_provider.setName!(new_player_name);
      for (let ii = 0; ii < all_score_systems.length; ++ii) {
        all_score_systems[ii].onUpdatePlayerName(old_name);
      }
    }
  });
}

function scoreClearScoreCache(): void {
  need_clear_at_startup = true;
  for (let ii = 0; ii < all_score_systems.length; ++ii) {
    all_score_systems[ii].clearScoreCache();
  }
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

let debug_friend_code: string | null = null;
let friend_code_query_sent = false;
export function scoreDebugFriendCode(): string | null {
  if (!friend_code_query_sent) {
    friend_code_query_sent = true;
    scoreFriendCodeGet(function (err, code) {
      debug_friend_code = err || code;
    });
  }
  return debug_friend_code;
}

cmd_parse.register({
  cmd: 'score_friend_code_get',
  help: 'Displays one\'s own friend code',
  func: function (param: string, resp_func: CmdRespFunc): void {
    scoreFriendCodeGet(resp_func);
  },
});
