// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

export const TYPE_INT = 0;
export const TYPE_FLOAT = 1;
export const TYPE_STRING = 2;

export type CmdParseType = typeof TYPE_INT | typeof TYPE_FLOAT | typeof TYPE_STRING;

export type CmdRespFunc<T=string | unknown> = ErrorCallback<T, string | null>;
export type CmdDef = {
  cmd: string;
  help?: Text;
  usage?: Text;
  prefix_usage_with_help?: boolean;
  access_show?: string[];
  access_run?: string[];
  store_data?: {
    store_key: string;
    param: CmdValueDefBase;
  };
  override?: boolean; // Allows replacing a command registered earlier by an engine module
  expose_global?: boolean; // expose the command on `window` for easy use, defaults true if !access_show/_run
  func(this: AccessContainer | undefined, str: string, resp_func: CmdRespFunc): void;
};

type CmdDefRegistered = Omit<CmdDef, 'cmd' | 'func' | 'override'> & {
  name: string;
  fn(this: AccessContainer | undefined, str: string, resp_func: CmdRespFunc): void;
};

type CmdValueDefBase<T=string|number> = {
  type: CmdParseType;
  label?: string;
  range?: [number, number]; // TYPE_INT or TYPE_FLOAT
  store?: boolean;
  ver?: number;
  help?: Text;
  usage?: Text;
  prefix_usage_with_help?: boolean;
  on_change?: (is_startup: boolean) => void;
  access_run?: string[];
  access_show?: string[];
  default_value?: string | number;
  enum_lookup?: TSMap<number>; // TYPE_INT only
  is_toggle?: boolean;
  set?: (str: T) => void;
  get?: () => T;
};

export type CmdValueDef = (
  { type: typeof TYPE_INT } & CmdValueDefBase<number>
) | (
  { type: typeof TYPE_FLOAT } & CmdValueDefBase<number>
) | (
  { type: typeof TYPE_STRING } & CmdValueDefBase<string>
);

exports.create = cmdParseCreate; // eslint-disable-line @typescript-eslint/no-use-before-define

import assert from 'assert';
import type { Text } from 'glov/client/font';
import type {
  ErrorCallback,
  Roles,
  TSMap,
} from 'glov/common/types';
import { perfCounterAdd } from './perfcounters';
import { isInteger } from './util';

export function canonical(cmd: string): string {
  return cmd.toLowerCase().replace(/[_.]/g, '');
}

const TYPE_NAME = ['INTEGER', 'NUMBER', 'STRING'];

export function defaultHandler(err?: string | null, resp?: unknown): void {
  if (err) {
    console.error(err, resp);
  } else {
    console.info(resp);
  }
}

function checkAccess(access: Roles | null, implied_access: TSMap<Roles>, list?: string[]): boolean {
  if (list) {
    if (!access) {
      return false;
    }
    for (let ii = 0; ii < list.length; ++ii) {
      let role = list[ii];
      if (access[role]) {
        return true;
      }
      // Check for access via implied access
      for (let my_role in access) {
        let extra = implied_access[my_role];
        if (extra && extra[role]) {
          return true;
        }
      }
    }
    return false;
  }
  return true;
}

export function formatUsage(cmd_data: CmdListEntry): string | undefined {
  let { usage, prefix_usage_with_help, help } = cmd_data;
  return !usage ? undefined :
    prefix_usage_with_help ? `${help}\n${usage}`:
    help ? String(usage).replace(/\$HELP/, String(help)) :
    String(usage);
}

function formatRangeValue(type: CmdParseType, value: number | string): string {
  let ret = String(value);
  if (type === TYPE_FLOAT && !ret.includes('.')) {
    ret += '.00';
  }
  return ret;
}

function formatEnumValue(enum_lookup: TSMap<number> | undefined, value: string | number): string | number {
  if (enum_lookup) {
    for (let key in enum_lookup) {
      if (enum_lookup[key] === value) {
        return key;
      }
    }
  }
  return value;
}

function lookupEnumValue(enum_lookup: TSMap<number>, str: string): number | null {
  str = str.toUpperCase();
  let v = enum_lookup[str];
  if (typeof v === 'number') {
    return v;
  }
  let n = Number(str);
  if (Object.values(enum_lookup).includes(n)) {
    return n;
  }
  for (let key in enum_lookup) {
    if (key.startsWith(str)) {
      return enum_lookup[key]!;
    }
  }
  return null;
}

const BOOLEAN_LOOKUP: TSMap<number> = {
  OFF: 0,
  ON: 1,
};

const CMD_STORAGE_PREFIX = 'cmd_parse_';

export type StorageProvider = {
  setJSON<T = unknown>(key: string, value: T): void;
  getJSON<T = unknown>(key: string, def?: T): T | undefined;
  set(key: string, value: undefined): void; // to delete
  localStorageExportAll(prefix: string): TSMap<string>;
};

export type CmdParseOpts = {
  storage?: StorageProvider;
};

export type AccessContainer = {
  access?: Roles | null;
};

export type CmdListEntry = {
  name: string;
  help?: Text;
  usage?: Text;
  access_show?: string[];
  access_run?: string[];
  prefix_usage_with_help?: boolean; // will be there on client commands, but already applied on server commands
};

class CmdParse {
  declare TYPE_INT: typeof TYPE_INT;
  declare TYPE_FLOAT: typeof TYPE_FLOAT;
  declare TYPE_STRING: typeof TYPE_STRING;
  declare canonical: typeof canonical;

  private default_handler: CmdRespFunc = defaultHandler;
  last_access: Roles | null = null;
  was_not_found = false;
  private storage?: StorageProvider;
  private cmds: TSMap<CmdDefRegistered>;
  cmds_for_complete: TSMap<CmdListEntry>;
  private implied_access: TSMap<Roles>;
  private last_cmd_data?: CmdDefRegistered;

  constructor(params?: CmdParseOpts) {
    this.cmds = {};
    this.cmds_for_complete = this.cmds;
    this.storage = params && params.storage;
    this.register({
      cmd: 'cmd_list',
      func: this.cmdList.bind(this),
      access_show: ['hidden'],
    });
    this.implied_access = {
      sysadmin: { csr: 1 },
    };
  }

  private cmd_list?: TSMap<CmdListEntry>;
  private cmdList(str: string, resp_func: CmdRespFunc<TSMap<CmdListEntry>>): void {
    if (!this.cmd_list) {
      this.cmd_list = {};
      let list = this.cmd_list;
      for (let cmd in this.cmds) {
        let cmd_data = this.cmds[cmd]!;
        if (cmd_data.access_show?.includes('hidden')) {
          continue;
        }
        if (cmd_data.access_run?.includes('hidden')) {
          continue;
        }
        let data: CmdListEntry = {
          name: cmd_data.name,
          help: String(cmd_data.help),
        };
        if (cmd_data.usage) {
          data.usage = formatUsage(cmd_data);
        }
        if (cmd_data.access_run?.length) {
          data.access_run = cmd_data.access_run;
        }
        if (cmd_data.access_show?.length) {
          data.access_show = cmd_data.access_show;
        }
        list[cmd] = data;
      }
    }
    resp_func(null, this.cmd_list);
  }

  setDefaultHandler(fn: CmdRespFunc): void {
    assert(this.default_handler === defaultHandler); // Should only set this once
    this.default_handler = fn;
  }
  checkAccess(access_list?: string[]): boolean {
    return checkAccess(this.last_access, this.implied_access, access_list);
  }

  handle(self: AccessContainer | undefined, str: string, resp_func: CmdRespFunc): boolean {
    resp_func = resp_func || this.default_handler;
    this.was_not_found = false;
    this.last_cmd_data = undefined;
    let m = str.match(/^([^\s]+)(?:\s+(.*))?$/);
    if (!m) {
      resp_func('Missing command');
      return true;
    }
    let cmd = canonical(m[1]);
    let cmd_data = this.cmds[cmd];
    this.last_access = self && self.access || null;
    if (cmd_data && !this.checkAccess(cmd_data.access_run)) {
      // this.was_not_found = true;
      resp_func(`Access denied: "${m[1]}"`);
      return false;
    }
    if (!cmd_data) {
      this.was_not_found = true;
      resp_func(`Unknown command: "${m[1]}"`);
      this.was_not_found = false;
      return false;
    }
    perfCounterAdd(`cmd.${cmd}`);
    this.last_cmd_data = cmd_data;
    cmd_data.fn.call(self, m[2] || '', resp_func);
    return true;
  }

  getLastSuccessfulCmdData(): CmdDefRegistered | undefined {
    return this.last_cmd_data;
  }

  exposeGlobal(cmd: string, override?: boolean): void {
    if (typeof window === 'undefined') {
      return;
    }
    let func_name = cmd.replace(/_(.)/g, function (a, b) {
      return b.toUpperCase();
    });
    type Funcs = TSMap<(a: string) => void>;
    if ((window as unknown as Funcs)[func_name] && !override) {
      return;
    }
    (window as unknown as Funcs)[func_name] = (...args) => {
      let is_sync = true;
      let sync_ret;
      this.handle(undefined, `${cmd} ${args.join(' ')}`,
        function (err?: string | null, resp?: unknown): void {
          if (err) {
            if (is_sync && !resp) {
              sync_ret = err;
            } else {
              console.error(err, resp);
            }
          } else {
            if (is_sync) {
              sync_ret = resp;
            } else {
              console.info(resp);
            }
          }
        }
      );
      is_sync = false;
      return sync_ret;
    };
  }

  register(param: CmdDef): void {
    assert.equal(typeof param, 'object');
    let {
      cmd,
      func,
      help,
      usage,
      prefix_usage_with_help,
      access_show,
      access_run,
      store_data,
      override,
      expose_global,
    } = param;
    assert(cmd);
    assert(func, `Missing function for command "${cmd}"`);
    let help_lower = String(help || '').toLowerCase();
    if (help_lower.includes('(admin)')) {
      assert(access_run && access_run.includes('sysadmin'));
    }
    if (help_lower.includes('(csr)')) {
      assert(access_run && access_run.includes('csr'));
    }
    if (help_lower.includes('(hidden)')) {
      assert(access_show && access_show.length);
    }
    let canon = canonical(cmd);
    assert(!this.cmds[canon] || override, `Duplicate commands registered as "${canon}"`);
    if (expose_global === undefined) {
      expose_global = !access_show && !access_run;
    }
    if (expose_global) {
      this.exposeGlobal(cmd, override);
    }
    this.cmds[canon] = {
      name: cmd,
      fn: func,
      help,
      usage,
      prefix_usage_with_help,
      access_show,
      access_run,
      store_data, // just for resetSettings
    };
  }

  registerValue(cmd: string, param_in: CmdValueDef): void {
    let param: CmdValueDefBase = param_in as CmdValueDefBase;
    assert(TYPE_NAME[param.type] || !param.set);
    assert(param.set || param.get);
    let label = param.label || cmd;
    let store = param.store && this.storage || false;
    let enum_lookup = param.enum_lookup;
    if (enum_lookup) {
      assert.equal(param.type, TYPE_INT);
    }
    let store_key = `${CMD_STORAGE_PREFIX}${canonical(cmd)}`;
    if (param.ver) {
      store_key += `_${param.ver}`;
    }
    let is_toggle = param.is_toggle;
    if (is_toggle) {
      assert(param.get && param.set && param.range);
    }
    let store_data;
    if (store) {
      assert(this.storage);
      assert(param.set);
      store_data = {
        store_key,
        param,
      };
      let init_value: string | number | undefined = this.storage.getJSON(store_key);
      if (init_value !== undefined) {
        // enforce stored values within current range
        if (param.range) {
          init_value = Number(init_value);
          if (!isFinite(init_value) || init_value < param.range[0] || init_value > param.range[1]) {
            init_value = undefined;
          }
        }
        if (init_value !== undefined) {
          param.set(init_value);
          if (param.on_change) {
            param.on_change(true);
          }
        }
      }
    }
    if (!enum_lookup && param.type === TYPE_INT &&
      param.range && param.range[0] === 0 && param.range[1] === 1
    ) {
      enum_lookup = BOOLEAN_LOOKUP;
    }
    let param_label = TYPE_NAME[param.type];
    if (enum_lookup) {
      param_label = Object.keys(enum_lookup).join('|');
    }
    let fn = (str: string, resp_func: CmdRespFunc): void => {
      function value(): void {
        resp_func(null, `${label} = **${formatEnumValue(enum_lookup, param.get!())}**`);
      }
      function usage(): void {
        resp_func(`Usage: **/${cmd} ${param_label}**`);
      }
      if (!str && is_toggle) {
        if (param.get!() === param.range![0]) {
          str = String(param.range![1]);
        } else {
          str = String(param.range![0]);
        }
      }
      if (!str) {
        if (param.get && param.set) {
          // More explicit help for these automatic value settings
          let help = [
            `${label}:`,
          ];
          if (param.range && !(enum_lookup && param.type === TYPE_INT)) {
            help.push(`Valid range: [${formatRangeValue(param.type, param.range[0])}...` +
              `${formatRangeValue(param.type, param.range[1])}]`);
          }
          let cur_value = param.get();
          let value_example: string | number = param.range ?
            cur_value === param.range[0] ? param.range[1] : param.range[0] : 1;
          if (enum_lookup) {
            value_example = Object.keys(enum_lookup)[0];
          }
          help.push(`To change: **/${cmd} ${param_label}**`);
          help.push(`  example: **/${cmd} ${value_example}**`);
          let def_value = param.default_value;
          if (def_value !== undefined) {
            help.push(`Default value = **${formatEnumValue(enum_lookup, def_value)}**`);
          }
          help.push(`Current value = **${formatEnumValue(enum_lookup, cur_value)}**`);
          return resp_func(null, help.join('\n'));
        } else if (param.get) {
          return value();
        } else {
          return usage();
        }
      }
      if (!param.set) {
        return resp_func(`Usage: **/${cmd}**`);
      }
      let n = Number(str);
      if (enum_lookup) {
        let n_test: number | null = lookupEnumValue(enum_lookup, str);
        if (n_test === null) {
          return usage();
        }
        n = n_test;
      }
      if (param.range) {
        if (n < param.range[0]) {
          n = param.range[0];
        } else if (n > param.range[1]) {
          n = param.range[1];
        }
      }
      let store_value: string | number = n;
      if (param.type === TYPE_INT) {
        if (!isInteger(n)) {
          return usage();
        }
        param.set(n);
      } else if (param.type === TYPE_FLOAT) {
        if (!isFinite(n)) {
          return usage();
        }
        param.set(n);
      } else {
        store_value = str;
        param.set(str);
      }
      if (store) {
        this.storage!.setJSON(store_key, store_value);
      }
      if (param.on_change) {
        param.on_change(false);
      }
      if (param.get) {
        return value();
      } else {
        return resp_func(null, `${label} updated`);
      }
    };
    this.register({
      cmd,
      func: fn,
      help: param.help || ((param.get && param.set) ?
        `Set or display *${label}* value` :
        param.set ? `Set *${label}* value` : `Display *${label}* value`),
      usage: param.usage || ((param.get ? `${param.is_toggle ? 'Toggle' : 'Display'} *${label}* value\n` +
        `  Usage: **/${cmd}**\n` : '') +
        (param.set ? `Set *${label}* value\n  Usage: **/${cmd} ${param_label}**` : '')),
      prefix_usage_with_help: param.prefix_usage_with_help,
      access_show: param.access_show,
      access_run: param.access_run,
      store_data,
    });
  }

  resetSettings(): string[] {
    assert(this.storage);
    let results = [];
    let all_saved_data = this.storage.localStorageExportAll(CMD_STORAGE_PREFIX);
    let count = 0;
    for (let key in all_saved_data) {
      let value = all_saved_data[key];
      let cmd_name = key.slice(CMD_STORAGE_PREFIX.length);
      let version;
      ([cmd_name, version] = cmd_name.split('_')); // grab and strip version
      let cmd_data = this.cmds[cmd_name];
      if (!cmd_data) {
        this.storage.set(key, undefined);
        results.push(`Cleared unknown setting "${cmd_name}" = ${value}`);
        ++count;
      } else {
        let { name, store_data } = cmd_data;
        let default_value = store_data?.param?.default_value;
        if (store_data && store_data.store_key !== key) {
          this.storage.set(key, undefined);
          results.push(`Cleared old setting "${name} (v${version || 0})"`);
          ++count;
        } else if (default_value !== undefined) {
          if (JSON.stringify(default_value) === value) {
            // Already at default value, "clear" this silently, just remove from storage
            this.storage.set(key, undefined);
            // results.push(`Cleared setting "${name}" already at default value`);
            // ++count;
          } else {
            this.storage.set(key, undefined);
            results.push(`Cleared setting "${name}" = ${value} (default = ${default_value})`);
            ++count;
          }
        } else {
          this.storage.set(key, undefined);
          results.push(`Cleared setting "${name}" = ${value}`);
          ++count;
        }
      }
    }

    if (results.length) {
      results.push(`Reset ${count} setting(s)`);
    }
    return results;
  }

  // for auto-complete
  addServerCommands(new_cmds: TSMap<CmdListEntry>): void {
    let cmds = this.cmds_for_complete;
    if (this.cmds_for_complete === this.cmds) {
      cmds = this.cmds_for_complete = {};
      for (let cname in this.cmds) {
        cmds[cname] = this.cmds[cname];
      }
    }
    for (let cname in new_cmds) {
      if (!cmds[cname]) {
        cmds[cname] = new_cmds[cname]!;
      }
    }
  }
}
export type { CmdParse };

CmdParse.prototype.canonical = canonical;

CmdParse.prototype.TYPE_INT = TYPE_INT;
CmdParse.prototype.TYPE_FLOAT = TYPE_FLOAT;
CmdParse.prototype.TYPE_STRING = TYPE_STRING;

export function cmdParseCreate(params?: CmdParseOpts): CmdParse {
  return new CmdParse(params);
}
