export const PROVIDER_AUTO_WEB = 'auto_web';

import assert from 'assert';
import type { CmdRespFunc } from 'glov/common/cmd_parse';
import type { ErrorCallback } from 'glov/common/types';
import { cmd_parse } from './cmds';
import {
  fetchJSON2Timeout,
  scoreGetScoreHost,
  scoreLSD,
  scoreLSDParse,
  ScoreUserInfo,
  ScoreUserProvider,
} from './score';

type UserAllocResponse = { userid: string };

const PLAYER_NAME_KEY = 'ld.player_name';
const USERID_KEY = 'score.userid';
const FRIENDS_KEY = 'score.friends';

let friends_by_code: string[] | null = null;

cmd_parse.register({
  cmd: 'score_friend_list',
  help: 'List friends',
  func: function (param: string, resp_func: CmdRespFunc): void {
    if (!friends_by_code) {
      return resp_func('ScoreAutoWebProvider not in use');
    }
    resp_func(null, friends_by_code.join(', ') || 'You have no friends');
  },
});

cmd_parse.register({
  cmd: 'score_friend_add',
  help: 'Add friend by friend code',
  func: function (param: string, resp_func: CmdRespFunc): void {
    if (!friends_by_code) {
      return resp_func('ScoreAutoWebProvider not in use');
    }
    let fc = param.trim().toUpperCase();
    if (!fc) {
      return resp_func('Missing friend code');
    }
    if (friends_by_code.includes(fc)) {
      return resp_func(null, 'Friend already on list.');
    }
    friends_by_code.push(fc);
    scoreLSD()[FRIENDS_KEY] = JSON.stringify(friends_by_code);
    resp_func(null, 'Friend added');
  },
});

cmd_parse.register({
  cmd: 'score_friend_remove',
  help: 'Remove friend by friend code',
  func: function (param: string, resp_func: CmdRespFunc): void {
    if (!friends_by_code) {
      return resp_func('ScoreAutoWebProvider not in use');
    }
    let fc = param.trim().toUpperCase();
    if (!fc) {
      return resp_func('Missing friend code');
    }
    if (!friends_by_code.includes(fc)) {
      return resp_func(null, 'Friend not on list.');
    }
    friends_by_code.splice(friends_by_code.indexOf(fc), 1);
    scoreLSD()[FRIENDS_KEY] = JSON.stringify(friends_by_code);
    resp_func(null, 'Friend removed');
  },
});

export const score_user_provider_auto_web: ScoreUserProvider = {
  provider_id: PROVIDER_AUTO_WEB,
  getAuthToken(cb: ErrorCallback<string | null, string>): void {
    cb(null, null);
  },
  getAccountInfo(cb: ErrorCallback<ScoreUserInfo, string>): void {
    friends_by_code = scoreLSDParse<string[]>(FRIENDS_KEY) || [];
    let display_name: string | null = null;
    if (scoreLSD()[PLAYER_NAME_KEY]) {
      display_name = scoreLSD()[PLAYER_NAME_KEY]!;
    }
    if (scoreLSD()[USERID_KEY]) {
      let user_id = scoreLSD()[USERID_KEY]!;
      if (user_id.startsWith('w')) {
        console.log(`Using existing ScoreAPI Auto-Web UserID: "${user_id}"`);
        return cb(null, {
          user_id,
          display_name,
          friends: friends_by_code,
        });
      }
    }

    let url = `${scoreGetScoreHost()}/api/useralloc`;
    fetchJSON2Timeout<UserAllocResponse>(url, 20000, function (err: string | undefined, res: UserAllocResponse) {
      if (err) {
        return cb(err);
      }
      assert(res);
      assert(res.userid);
      assert.equal(typeof res.userid, 'string');
      scoreLSD()[USERID_KEY] = res.userid;
      console.log(`Allocated new ScoreAPI Auto-Web UserID: "${res.userid}"`);
      cb(null, {
        user_id: res.userid,
        display_name,
        friends: friends_by_code!,
      });
    });
  },
  setName(name: string): void {
    scoreLSD()[PLAYER_NAME_KEY] = name;
  },
};
