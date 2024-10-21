// Portions Copyright 2020 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

/* globals Worker, Transferable, ErrorEvent */

// Do not require anything significant from this file, so it loads super quickly
// Maybe need to add a separate bootstrap if we need to require much.
import assert from 'assert';
import { locateAsset } from './locate_asset';
import { webFSGetData, webFSSetToWorkerCB } from './webfs';
import type { TSMap } from 'glov/common/types';

let workers: Worker[] = [];

export function numWorkers(): number {
  return workers.length;
}

export type WorkerRespHandler<T=unknown> = (worker_index: number, payload: T) => void;

let handlers: TSMap<WorkerRespHandler> = {};

export const WORKER_ALL = -1;
exports.ALL = WORKER_ALL;

// cb(worker_index, data)
export function addHandler<T>(msg: string, cb: WorkerRespHandler<T>): void {
  assert(!handlers[msg]);
  handlers[msg] = cb as WorkerRespHandler;
}

export function workerCommSendMsg<T=unknown>(
  worker_index: number,
  id: string,
  data: T,
  transfer?: Transferable[]
): void {
  if (worker_index === WORKER_ALL) {
    for (let ii = 0; ii < workers.length; ++ii) {
      workerCommSendMsg(ii, id, data);
    }
  } else {
    if (transfer) {
      workers[worker_index].postMessage({ id, data }, transfer);
    } else {
      workers[worker_index].postMessage({ id, data });
    }
  }
}
exports.sendmsg = workerCommSendMsg;

type MyWorkerMessage = {
  id: string;
  data: unknown;
};

function isMyWorkerMessage(evt: unknown): evt is MyWorkerMessage {
  return Boolean(evt instanceof Object && (evt as MyWorkerMessage).id);
}

function workerOnMessage(worker_index: number, evt_in: { data: unknown }): void {
  let evt = evt_in.data;
  if (isMyWorkerMessage(evt)) {
    profilerStart(`worker:${evt.id}`);
    let handler = handlers[evt.id];
    assert(handler);
    handler(worker_index, evt.data);
    profilerStop();
  } else {
    console.log('worker_comm (main thread) unhandled message', evt);
  }
}
function workerOnError(
  e: ErrorEvent,
  file?: string,
  line?: number,
  col?: number,
  errorobj?: Error
): void {
  if (!file && e.message && e.filename) {
    window.onerror!(e.message, e.filename, e.lineno, e.colno, errorobj || e as unknown as Error);
  } else {
    if (String(e) === '[object Event]') {
      window.onerror!(`Unknown worker error (${e.message || e.type || e})`, file, line, col, errorobj);
    } else {
      window.onerror!(e, file, line, col, errorobj);
    }
  }
}

let debug_names: Partial<Record<number, string>> | undefined;

function allocWorker(idx: number, worker_filename?: string): void {
  let suffix = debug_names && debug_names[idx] && `#${debug_names[idx]}` || '';
  let worker = new Worker(`${locateAsset(worker_filename || 'worker.bundle.js')}${suffix}`);
  worker.onmessage = workerOnMessage.bind(null, workers.length);
  worker.onerror = workerOnError;
  workers.push(worker);

  if (webFSGetData()) {
    workerCommSendMsg(idx, 'webfs_data', webFSGetData());
  }
}

export function setNumWorkers(max_workers: number, worker_filename?: string): void {
  for (let ii = workers.length; ii < max_workers; ++ii) {
    allocWorker(ii, worker_filename);
  }
}

export let keep_busy = 0;

export function startup(worker_filename: string, debug_names_in: typeof debug_names): void {
  if (String(document.location).match(/^https?:\/\/localhost/)) {
    debug_names = debug_names_in;
  }
  addHandler<{ msg: string; clear?: boolean }>('debugmsg', function (source, data) {
    window.debugmsg(data.msg, data.clear);
  });
  addHandler<string>('log', function (source, data) {
    console.log(`[Worker#${source}] ${data}`);
  });
  addHandler<Error>('error', function (source, msg) {
    console.error(msg);
    window.onerror!(null!, null!, null!, null!, msg);
  });
  addHandler('busy_done', function (source) {
    if (source < keep_busy) {
      workerCommSendMsg(source, 'busy', 1000);
    }
  });
  webFSSetToWorkerCB(function (fs: unknown) {
    workerCommSendMsg(WORKER_ALL, 'webfs_data', fs);
  });

  allocWorker(0, worker_filename);
}

export function keepBusy(num_workers: number): void {
  for (let ii = keep_busy; ii < num_workers; ++ii) {
    workerCommSendMsg(ii, 'busy', 1000);
  }
  keep_busy = num_workers;
}
