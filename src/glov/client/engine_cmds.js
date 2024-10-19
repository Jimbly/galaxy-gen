import * as cmd_parse_mod from 'glov/common/cmd_parse';
import { netDelayGet, netDelaySet } from 'glov/common/wscommon';
import { cmd_parse } from './cmds';
import * as engine from './engine';
import { errorReportDetailsString } from './error_report';
import { fetchDelaySet } from './fetch';
import { netClient, netDisconnected } from './net';
import { SEMANTIC } from './shaders';
import { textureGetAll } from './textures';

window.cmd = function (str) {
  cmd_parse.handle(null, str, cmd_parse_mod.defaultHandler);
};

function byteFormat(bytes) {
  if (bytes > 850000) {
    return `${(bytes/(1024*1024)).toFixed(2)}MB`;
  }
  if (bytes > 850) {
    return `${(bytes/1024).toFixed(2)}KB`;
  }
  return `${bytes}B`;
}

cmd_parse.register({
  cmd: 'texmem',
  help: 'Displays texture memory usage',
  func: function (str, resp_func) {
    let all_textures = textureGetAll();
    let keys = Object.keys(all_textures);
    keys = keys.filter((a) => all_textures[a].gpu_mem > 1024);
    keys.sort((a, b) => all_textures[a].gpu_mem - all_textures[b].gpu_mem);
    resp_func(null, keys.map((a) => `${byteFormat(all_textures[a].gpu_mem)} ${a}`).join('\n'));
  }
});

cmd_parse.register({
  cmd: 'gpumem',
  help: 'Displays GPU memory usage summary',
  func: function (str, resp_func) {
    let { gpu_mem } = engine.perf_state;
    resp_func(null, `${byteFormat(gpu_mem.geom)} Geo\n${byteFormat(gpu_mem.tex)} Tex\n${
      byteFormat(gpu_mem.geom + gpu_mem.tex)} Total`);
  }
});

function validDefine(str) {
  if (SEMANTIC[str] !== undefined) {
    return false;
  }
  return str.match(/^[A-Z][A-Z0-9_]*$/);
}

cmd_parse.register({
  cmd: 'd',
  help: 'Toggles a debug define',
  func: function (str, resp_func) {
    str = str.toUpperCase().trim();
    if (!str) {
      if (engine.definesClearAll()) {
        return void resp_func(null, 'All debug defines cleared');
      } else {
        return void resp_func(null, 'No debug defines active');
      }
    }
    if (!validDefine(str)) {
      return void resp_func('Invalid define specified');
    }
    engine.defines[str] = !engine.defines[str];
    resp_func(null, `D=${str} now ${engine.defines[str]?'SET':'unset'}`);
    engine.definesChanged();
  }
});

cmd_parse.register({
  cmd: 'renderer',
  help: 'Displays current renderer',
  func: function (str, resp_func) {
    resp_func(null, `Renderer=WebGL${engine.webgl2?2:1}`);
  }
});

cmd_parse.registerValue('postprocessing', {
  label: 'Postprocessing',
  type: cmd_parse.TYPE_INT,
  help: 'Enables/disables postprocessing',
  get: () => (engine.postprocessing ? 1 : 0),
  set: (v) => engine.postprocessingAllow(v),
});

cmd_parse.register({
  cmd: 'net_delay',
  help: 'Sets/shows network delay values',
  usage: '$HELP\n/net_delay time_base time_rand',
  func: function (str, resp_func) {
    if (str) {
      let params = str.split(' ');
      netDelaySet(Number(params[0]), Number(params[1]) || 0);
      fetchDelaySet(Number(params[0]), Number(params[1]) || 0);
    }
    let cur = netDelayGet();
    resp_func(null, `Client NetDelay: ${cur[0]}+${cur[1]}`);
  }
});

cmd_parse.register({
  cmd: 'error_report_details',
  help: 'Shows details submitted with any error report',
  access_show: ['hidden'],
  func: function (str, resp_func) {
    resp_func(null, errorReportDetailsString());
  },
});

cmd_parse.register({
  cmd: 'disconnect',
  help: 'Forcibly disconnect WebSocket connection (Note: will auto-reconnect)',
  prefix_usage_with_help: true,
  usage: '/disconnect [disconnnect_duration [disconnect_delay]]',
  func: function (str, resp_func) {
    let socket = netClient()?.socket;
    if (!socket) {
      return void resp_func('No socket');
    }
    if (netDisconnected()) {
      return void resp_func('Not connected');
    }
    let params = str.split(' ').map(Number);
    let disconnect_duration = isFinite(params[0]) ? params[0] : 0;
    let disconnect_delay = isFinite(params[1]) ? params[1] : 0;
    netClient().retry_extra_delay = disconnect_duration;
    if (disconnect_delay) {
      setTimeout(socket.close.bind(socket), disconnect_delay);
    } else {
      socket.close();
    }
    resp_func();
  },
});

export function resetSettings() {
  let results = cmd_parse.resetSettings();
  if (engine.definesClearAll()) {
    results.push('Debug defines cleared');
  }
  if (!results.length) {
    return null;
  }
  results.push('Please restart the app or reload to page for the new settings to take effect.');
  return results.join('\n');
}

cmd_parse.register({
  cmd: 'reset_settings',
  help: 'Resets all settings and options to their defaults (Note: requires an app restart)',
  func: function (str, resp_func) {
    resp_func(null, resetSettings() || 'No stored settings to reset');
  },
});
