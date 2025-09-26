import {
  canonical,
  CmdListEntry,
  CmdRespFunc,
  formatUsage,
} from 'glov/common/cmd_parse';
import { Roles } from 'glov/common/types';
import { cmd_parse } from './cmds';
import * as settings from './settings';
import { settingsRegister } from './settings';

declare module 'glov/client/settings' {
  let autocomplete_strict: number;
}

settingsRegister({
  autocomplete_strict: {
    help: 'Requires a typed command to be a prefix match to auto-complete',
    default_value: 0,
    type: cmd_parse.TYPE_INT,
    range: [0,1],
    is_toggle: true,
  },
});

export type CmdAutoCompleteEntry = {
  cname: string;
  cmd: string;
  help: string;
  usage?: string; // only filled on first entry
  rank: number;
};

function cmpCmd(a: CmdAutoCompleteEntry, b: CmdAutoCompleteEntry): number {
  if (a.rank !== b.rank) {
    return b.rank - a.rank;
  }
  if (a.cname < b.cname) {
    return -1;
  }
  return 1;
}

function equalWithTranspose(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let ii = 0; ii < a.length;) {
    if (a[ii] === b[ii]) {
      ii++;
      continue;
    }

    // Check for adjacent transposition
    if (
      ii + 1 < a.length &&
      a[ii] === b[ii + 1] &&
      a[ii + 1] === b[ii]
    ) {
      ii += 2; // Skip over the transposed pair
      continue;
    }

    return false; // Found a mismatch that's not a valid transposition
  }

  return true;
}

// parameters may have underscores and case
// rough match
// weight bump 2 for prefix (of _-deliminated tokens) match
// weight bump 1 for no transpose
function autoCompleteMatch(user: string, cmd_name: string): number {
  user = user.toLowerCase();
  cmd_name = cmd_name.toLowerCase();
  // match against preferring word prefixes, e.g. abcd matches abXY_cdXY
  // ideally with transpositions in a single pass

  let useridx = 0;
  let cmdidx = 0;
  let prefix_only = true;
  let had_tranpose = false;
  let is_prefix = true;
  let uc0 = user[useridx];
  let uc1 = user[useridx + 1];
  let hit_next = false;
  let hit_next_was_prefix = false;
  while (true) {
    let cc = cmd_name[cmdidx];
    if (uc0 === cc) {
      if (!is_prefix) {
        prefix_only = false;
      }
      ++useridx;
      ++cmdidx;
      if (hit_next && cmd_name[cmdidx] !== user[useridx]) {
        had_tranpose = true;
        if (!hit_next_was_prefix) {
          prefix_only = false;
        }
        ++useridx;
      }
      if (useridx === user.length) {
        return 3 + (prefix_only ? 2 : 0) + (had_tranpose ? 0 : 1);
      }
      uc0 = user[useridx];
      uc1 = user[useridx + 1];
      hit_next = false;
    } else {
      if (uc1 === cc) {
        hit_next = true;
        hit_next_was_prefix = is_prefix;
      }
      // no match, skip past cmdix
      if (cc === '_') {
        is_prefix = true;
      } else {
        is_prefix = false;
      }
      ++cmdidx;
    }
    if (cmdidx === cmd_name.length) {
      // hit end, no match
      return 0;
    }
  }
}

function cmdAutoCompleteMatch(
  toks_length: number,
  first_tok_cname: string,
  first_tok_raw: string,
  cmd_cname: string,
  cmd_name: string,
  autocomplete_strict: number,
): number {
  if (cmd_cname === first_tok_cname) {
    return 10;
  } else if (toks_length === 1) { // do not do partial matches if we have multiple tokens
    let cname_sliced = cmd_cname.slice(0, first_tok_cname.length);
    if (cname_sliced === first_tok_cname) {
      return 9;
    } else if (equalWithTranspose(cname_sliced, first_tok_cname)) {
      return cmd_cname.length === first_tok_cname.length ? 8 : 7;
    } else if (!autocomplete_strict) {
      return autoCompleteMatch(first_tok_raw, cmd_name);
    }
  }
  return 0;
}

export function cmdAutoCompleteMatchForTesting(user_str: string, cmd_name: string): number {
  let toks = user_str.split(' ');
  let first_tok_raw = toks[0];
  let first_tok_cname = canonical(first_tok_raw);
  let cmd_cname = canonical(cmd_name);
  return cmdAutoCompleteMatch(toks.length, first_tok_cname, first_tok_raw, cmd_cname, cmd_name, 0);
}

export function cmdAutoComplete(str_in: string, access: Roles | null): CmdAutoCompleteEntry[] {
  let list: (CmdAutoCompleteEntry & {
    cmd_data: CmdListEntry;
  })[] = [];
  let toks = str_in.split(' ');
  let first_tok_raw = toks[0];
  let first_tok_cname = canonical(first_tok_raw);
  cmd_parse.last_access = access;
  for (let cname in cmd_parse.cmds_for_complete) {
    let cmd_data = cmd_parse.cmds_for_complete[cname]!;
    let rank = cmdAutoCompleteMatch(toks.length, first_tok_cname, first_tok_raw,
      cname, cmd_data.name,
      settings.autocomplete_strict);
    if (rank) {
      if (cmd_parse.checkAccess(cmd_data.access_show) && cmd_parse.checkAccess(cmd_data.access_run)) {
        list.push({
          cname,
          cmd: cmd_data.name,
          help: String(cmd_data.help),
          rank,
          cmd_data,
        });
      }
    }
  }
  list.sort(cmpCmd);
  if (list[0]) {
    list[0].usage = formatUsage(list[0].cmd_data);
  }
  return list; // .slice(0, 20); Maybe?
}

function cmdDesc(cmd_data: CmdAutoCompleteEntry): string {
  return `**/${cmd_data.cmd}** - ${cmd_data.help}`;
}

cmd_parse.register({
  cmd: 'help',
  help: 'Searches commands',
  func: function (
    this: { access: Roles | null },
    str: string,
    resp_func: CmdRespFunc,
  ): void {
    let list = cmdAutoComplete('', this && this.access);
    if (str) {
      let str_cname = cmd_parse.canonical(str);
      let str_lc = str.toLowerCase();
      list = list.filter((cmd_data) => cmd_data.cname.indexOf(str_cname) !== -1 ||
          cmd_data.help.toLowerCase().indexOf(str_lc) !== -1);
    }
    if (!list.length) {
      return void resp_func(null, `No commands found matching "${str}"`);
    }
    resp_func(null, list.map(cmdDesc).join('\n'));
  }
});
