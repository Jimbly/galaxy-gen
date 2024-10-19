// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

import assert from 'assert';
// Must have NO internal dependencies, otherwise get circular dependencies between this, engine, and settings
import { cmdParseCreate } from 'glov/common/cmd_parse';
import * as local_storage from './local_storage';
import * as urlhash from './urlhash';
export let cmd_parse = cmdParseCreate({ storage: local_storage });
export let safearea = [-1,-1,-1,-1];

function cmdDesc(cmd_data) {
  return `**/${cmd_data.cmd}** - ${cmd_data.help}`;
}

cmd_parse.register({
  cmd: 'help',
  help: 'Searches commands',
  func: function (str, resp_func) {
    let list = cmd_parse.autoComplete('', this && this.access);
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

cmd_parse.registerValue('safe_area', {
  label: 'Safe Area',
  type: cmd_parse.TYPE_STRING,
  usage: 'Safe Area value: Use -1 for auto based on browser environment,\n' +
    'or 0-25 for percentage of screen size\n' +
    '  Usage: /safe_area [value]\n' +
    '  Usage: /safe_area horizontal,vertical\n' +
    '  Usage: /safe_area left,right,top,bottom',
  default_value: '-1',
  get: () => (safearea[0] === -1 ? '-1 (auto)' : safearea.join(',')),
  set: (v) => {
    v = String(v);
    let keys = v.split(',');
    if (v && keys.length === 1) {
      safearea[0] = safearea[1] = safearea[2] = safearea[3] = Number(v);
    } else if (keys.length === 2) {
      safearea[0] = safearea[1] = Number(keys[0]);
      safearea[2] = safearea[3] = Number(keys[1]);
    } else if (keys.length === 4) {
      for (let ii = 0; ii < 4; ++ii) {
        safearea[ii] = Number(keys[ii]);
      }
    } else {
      // error, ignore?
    }
    for (let ii = 0; ii < 4; ++ii) {
      if (!isFinite(safearea[ii])) {
        safearea[ii] = -1;
      }
    }
  },
  store: true,
});

cmd_parse.register({
  cmd: 'webgl2_auto',
  help: 'Resets WebGL2 auto-detection',
  func: function (str, resp_func) {
    let disable_data = local_storage.getJSON('webgl2_disable');
    if (!disable_data) {
      return resp_func(null, 'WebGL2 is already being auto-detected');
    }
    local_storage.setJSON('webgl2_disable', undefined);
    return resp_func(null, 'WebGL2 was disabled, will attempt to use it again on the next load');
  },
});

cmd_parse.register({
  cmd: 'url',
  help: 'Opens an internal URL',
  func: function (str, resp_func) {
    // execute out-of-tick to prevent fighting with other things that may updating the url at the end of frame
    setTimeout(() => {
      profilerStart('/url');
      urlhash.go(str); // .goRoute(str) is also a reasonable implementation depending on the context
      profilerStop('/url');
    }, 1);
  },
});

cmd_parse.register({
  cmd: 'client_crash',
  help: '(Debug) - Crash on the client',
  access_show: ['sysadmin'],
  func: function (str, resp_func) {
    let foo;
    foo.bar++;
  }
});

cmd_parse.register({
  cmd: 'client_assert',
  help: '(Debug) - Fail an assert on the client',
  access_show: ['sysadmin'],
  func: function (str, resp_func) {
    assert(false);
  },
});

cmd_parse.register({
  cmd: 'client_reject_now',
  help: '(Debug) - Fail an unhandled promise rejection on the client (Error, sync)',
  access_show: ['sysadmin'],
  func: function (str, resp_func) {
    // eslint-disable-next-line no-new
    new Promise((resolve, reject) => {
      reject(new Error('client_reject_now'));
    });
  },
});
