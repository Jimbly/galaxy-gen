import assert from 'assert';
import { dotPropDelete, dotPropGet, dotPropSet } from 'glov/common/dot-prop';
import { ChannelServerWorker } from './channel_server_worker';
import { ClientHandlerFunction } from './channel_worker';
import {
  globalWorkerAddCmd,
  globalWorkerRegisterClientHandler,
} from './global_worker';

import type { CmdDef } from 'glov/common/cmd_parse';
import type { TSMap } from 'glov/common/types';

let global_data: Partial<Record<string, unknown>>;

let csworker: ChannelServerWorker;
export function serverGlobalsInit(csworker_in: ChannelServerWorker): void {
  assert(!csworker);
  csworker = csworker_in;
}

export type ServerGlobalOnDataCB<T=unknown> = (csworker: ChannelServerWorker, data: T | undefined) => void;

let on_data_cbs: {
  prefix: string;
  cb: ServerGlobalOnDataCB;
}[] = [];

function prefixMatches(prefix: string, key: string): boolean {
  // true if watching `foo.bar` and we get an update on `foo` or the other way around
  return key.startsWith(prefix) || prefix.startsWith(key);
}

export function serverGlobalsHandleChannelData(key: string, value: unknown): void {
  if (!key) {
    global_data = value as Partial<Record<string, unknown>>;
  } else {
    if (value === undefined) {
      dotPropDelete(global_data, key);
    } else {
      dotPropSet(global_data, key, value);
    }
  }
  for (let ii = 0; ii < on_data_cbs.length; ++ii) {
    let { prefix, cb } = on_data_cbs[ii];
    if (prefixMatches(prefix, key)) {
      cb(csworker, dotPropGet(global_data, prefix));
    }
  }
}

export function serverGlobalsReady(): boolean {
  return Boolean(global_data);
}

export function serverGlobalsGet<T>(key: string): T | undefined;
export function serverGlobalsGet<T>(key: string, def: T): T;
export function serverGlobalsGet<T>(key: string, def?: T): T | undefined {
  return dotPropGet(global_data, key, def);
}

type ServerGlobalsDef<T=unknown> = {
  // Note: callbacks here are ran in the context of the _ChannelServerWorker_
  on_data?: ServerGlobalOnDataCB<T>;
  // Note: commands here are ran in the context of the _GlobalWorker_
  cmds?: CmdDef[];
  client_handlers?: TSMap<ClientHandlerFunction>;
};

export function serverGlobalsRegister<T>(prefix: string, param: ServerGlobalsDef<T>): void {
  if (param.on_data) {
    on_data_cbs.push({
      prefix,
      cb: param.on_data as ServerGlobalOnDataCB,
    });
  }
  if (param.cmds) {
    for (let ii = 0; ii < param.cmds.length; ++ii) {
      globalWorkerAddCmd(param.cmds[ii]);
    }
  }
  if (param.client_handlers) {
    for (let key in param.client_handlers) {
      globalWorkerRegisterClientHandler(key, param.client_handlers[key]!);
    }
  }
}
