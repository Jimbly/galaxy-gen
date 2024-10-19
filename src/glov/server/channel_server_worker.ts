import assert from 'assert';
import {
  ApplyChannelDataParam,
  ChannelData,
  ChannelWorker,
} from './channel_worker';
import {
  serverGlobalsHandleChannelData,
  serverGlobalsInit,
} from './server_globals';

import type { ChannelServer } from './channel_server';
import type {
  DataObject,
  HandlerCallback,
  HandlerSource,
} from 'glov/common/types';

export class ChannelServerWorker extends ChannelWorker {
  constructor(channel_server: ChannelServer, channel_id: string, channel_data: Partial<ChannelData>) {
    super(channel_server, channel_id, channel_data);
    serverGlobalsInit(this);
    channel_server.whenReady(this.subscribeOther.bind(this, 'global.global', ['*']));
  }

  // data is a { key, value } pair of what has changed
  onApplyChannelData(source: HandlerSource, data: ApplyChannelDataParam): void {
    if (source.type === 'global') {
      serverGlobalsHandleChannelData(data.key, data.value);
    }
  }

  // data is the channel's entire (public) data sent in response to a subscribe
  onChannelData(source: HandlerSource, data: ChannelData): void {
    if (source.type === 'global') {
      serverGlobalsHandleChannelData('', data);
    }
  }

}
// Returns a function that forwards to a method of the same name on the ChannelServer
function channelServerBroadcast(name: keyof ChannelServer): (
  this: ChannelServerWorker,
  src: HandlerSource,
  data: unknown,
  resp_func: HandlerCallback,
) => void {
  return function (
    this: ChannelServerWorker,
    src: HandlerSource,
    data: unknown,
    resp_func: HandlerCallback
  ) {
    assert(!(resp_func as unknown as DataObject).expecting_response); // this is a broadcast
    this.channel_server[name](data);
  };
}
function channelServerHandler(name: keyof ChannelServer): (
  this: ChannelServerWorker,
  src: HandlerSource,
  data: unknown,
  resp_func: HandlerCallback,
) => void {
  return function (
    this: ChannelServerWorker,
    src: HandlerSource,
    data: unknown,
    resp_func: HandlerCallback
  ) {
    this.channel_server[name](data, resp_func);
  };
}

ChannelServerWorker.prototype.no_datastore = true; // No datastore instances created here as no persistence is needed

export function channelServerWorkerInit(channel_server: ChannelServer): void {
  channel_server.registerChannelWorker('channel_server', ChannelServerWorker, {
    autocreate: false,
    subid_regex: /^[a-zA-Z0-9-]+$/,
    handlers: {
      worker_create: channelServerHandler('handleWorkerCreate'),
      master_startup: channelServerBroadcast('handleMasterStartup'),
      master_stats: channelServerBroadcast('handleMasterStats'),
      restarting: channelServerBroadcast('handleRestarting'),
      chat_broadcast: channelServerBroadcast('handleChatBroadcast'),
      log_cat: channelServerBroadcast('handleLogCat'),
      ping: channelServerBroadcast('handlePing'),
      eat_cpu: channelServerHandler('handleEatCPU'),
    },
    filters: {
      // note: these do *not* override the one on ChannelWorker.prototype, both
      // would be called via `filters` (if maintain_client_list were set)
      channel_data: ChannelServerWorker.prototype.onChannelData,
      apply_channel_data: ChannelServerWorker.prototype.onApplyChannelData,
    },
  });
}
