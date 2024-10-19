// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { inspect } from 'util';
import { asyncEachSeries } from 'glov-async';
import { ridx } from 'glov/common/util';
import * as winston from 'winston';
import { format } from 'winston';
import 'winston-daily-rotate-file';
import Transport from 'winston-transport';
import { metricsAdd } from './metrics';
import { processUID, serverConfig } from './server_config';
const argv = require('minimist')(process.argv.slice(2));
let fadvise;
try {
  fadvise = require('fadvise'); // eslint-disable-line global-require
} catch (e) {
  fadvise = null;
}

let log_dump_to_logger = true;
let log_dir = './logs/';
let last_uid = 0;
let pid = process.pid;
let puid = processUID();
let logger = {};
let raw_console = {};
if (pid < 100 && process.env.PODNAME) {
  pid = process.env.PODNAME;
  let split = pid.split('-');
  let tail = split.pop();
  if (split.includes('worker')) {
    // test-worker-foo-1234
    pid = `w${tail}`;
  } else if (split.includes('master')) {
    // test-master-foo-1234
    // master-instance-foo-1234
    pid = `m${tail}`;
  } else if (split.length > 2) {
    // instance-foo-1234
    pid = `${split[0][0]}${tail}`;
  }
  if (process.pid !== 1) {
    pid += `-${process.pid}`;
  }
  console.log(`Using fake logging PID of ${pid}`);
}
// ON by default, if not specified
// entries can be:
//  true: goes to console/regular transport
//  false: only goes to local file (if config.local_log is enabled)
//  null: goes nowhere, always
let log_categories = {};

const LOG_LEVELS = {
  debug: 'debug',
  log: 'info',
  info: 'info',
  warn: 'warn',
  error: 'error',
};
const LOG_LEVEL_TO_METRIC_FREQ = { // default 'low'
  warn: 'med',
  error: 'high',
};

let level_map = {};

export function logDowngradeErrors(do_downgrade) {
  if (do_downgrade) {
    level_map.error = 'warn';
  } else {
    delete level_map.error;
  }
}

export function logCategoryEnable(cat, enable) {
  log_categories[cat] = enable === null ? null : Boolean(enable);
}

export function logCategoryEnabled(cat) {
  let v = log_categories[cat];
  if (v === undefined) {
    v = true;
  }
  return v;
}

let last_external_uid = 0;
export function getUID() {
  return ++last_external_uid;
}

export function logDumpJSON(prefix, data, ext) {
  let filename = path.join(log_dir, `${prefix}-${pid}-${getUID()}.${ext || 'log'}`);
  fs.writeFile(filename, JSON.stringify(data), function (err) {
    if (err) {
      console.error(`Error writing to log file ${filename}`, err);
    }
  });

  if (!log_dump_to_logger) {
    return filename;
  }
  let level = prefix === 'crash' || prefix === 'error' ? 'error' : 'warn';
  let pre_log_uid = ++last_uid;
  let crash_uid = ++last_uid;
  let crash_id = `${prefix}-${crash_uid}`;
  logger.log(level, `Writing dump to log with crash_id=${crash_id}, also saved to ${filename}`, { uid: pre_log_uid });
  data.uid = crash_uid;
  logger.log(level, crash_id, data);
  return `LOG:${crash_id},FILE:${filename}`;
}

function argProcessor(arg) {
  if (typeof arg === 'object') {
    return inspect(arg, { breakLength: Infinity, compact: true });
  }
  return arg;
}


// Note: modifies `context`
export function logEx(context, level, ...args) {
  assert(typeof context !== 'string');
  context = context || {};
  let enabled;
  if (context.cat && !(enabled = logCategoryEnabled(context.cat))) {
    if (enabled === null) {
      return;
    }
    level = 'silly';
  } else {
    level = LOG_LEVELS[level];
  }
  assert(level);
  level = level_map[level] || level;
  metricsAdd(`log.${level}`, 1, LOG_LEVEL_TO_METRIC_FREQ[level] || 'low');
  context.level = level;
  // If 2 or more arguments and the last argument is an object, assume it is
  //   per-call metadata, and merge with context metadata
  let arg_len = args.length;
  let meta_arg = args[arg_len - 1];
  if (meta_arg && typeof meta_arg === 'object' && !Array.isArray(meta_arg) && !(meta_arg instanceof Error)) {
    // last parameter is an object pass as a payload
    if (typeof meta_arg.toJSON === 'function') {
      meta_arg = meta_arg.toJSON();
    }
    context.payload = meta_arg;
    --arg_len;
  }
  let message = [];
  for (let ii = 0; ii < arg_len; ++ii) {
    message.push(argProcessor(args[ii]));
  }
  message = message.join(' ');
  if (!message) {
    message = 'NO_MESSAGE';
  }
  context.message = message;
  context.uid = ++last_uid;
  logger.log(context);
}

export function logCat(context, cat, level, ...args) {
  assert(typeof context !== 'string');
  context = context || {};
  context.cat = cat;
  logEx(context, level, ...args);
  delete context.cat;
}

// export function debug(...args) {
//   logEx(null, 'debug', ...args);
// }
// export function info(...args) {
//   logEx(null, 'info', ...args);
// }
// export function warn(...args) {
//   logEx(null, 'warn', ...args);
// }
// export function error(...args) {
//   logEx(null, 'error', ...args);
// }

// Attempt to remove logs from the "buffers/cache" pages on Linux
// Taking up this memory causes load balancing / K8s OOM / monitoring issues,
// and these are files that are never expected to be read.
const BUFFER_FLUSH_TIME = 60*1000;
function bufferFlush() {
  fs.readdir(log_dir, function (err, files) {
    if (err) {
      files = [];
    }
    asyncEachSeries(files, function (filename, next) {
      if (filename.startsWith('.')) {
        return void next();
      }
      filename = path.join(log_dir, filename);
      fs.stat(filename, function (err, stat) {
        if (err) {
          return void next();
        }
        let age = Date.now() - stat.mtimeMs;
        if (age > 24*60*60*1000) {
          // more than a day old, ignore
          return void next();
        }
        fs.open(filename, 'r', function (err, fd) {
          if (err) {
            return void next();
          }
          fadvise.posix_fadvise(fd, 0, 0, fadvise.POSIX_FADV_DONTNEED);
          fs.close(fd, function () {
            next();
          });
        });
      });
    }, function (err_ignored) {
      setTimeout(bufferFlush, BUFFER_FLUSH_TIME);
    });
  });
}

const { MESSAGE, LEVEL } = require('triple-beam');

class SimpleConsoleTransport extends Transport {
  log(linfo, callback) {
    raw_console[linfo[LEVEL]](linfo[MESSAGE]);

    if (callback) {
      callback();
    }
    this.emit('logged', linfo);
  }
}


const subscribed_clients = [];
export function logSubscribeClient(client) {
  subscribed_clients.push(client);
}
export function logUnsubscribeClient(client) {
  for (let ii = subscribed_clients.length - 1; ii >= 0; --ii) {
    if (subscribed_clients[ii] === client) {
      ridx(subscribed_clients, ii);
    }
  }
}

class SubscribedClientsTransport extends Transport {
  log(linfo, callback) {
    for (let ii = subscribed_clients.length - 1; ii >= 0; --ii) {
      let client = subscribed_clients[ii];
      if (!client.connected) {
        ridx(subscribed_clients, ii);
        continue;
      }
      client.send('log_echo', linfo);
    }
    if (callback) {
      callback();
    }
    this.emit('logged', linfo);
  }
}

const STACKDRIVER_SEVERITY = {
  // silly: 'DEFAULT',
  // verbose: 'DEBUG',
  debug: 'DEBUG',
  // default: 'INFO',
  // http: 'INFO',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
};

// add severity level to work on GCP stackdriver
// reference: https://gist.github.com/jasperkuperus/9df894041e3d5216ce25af03d38ec3f1
const stackdriverFormat = format((data) => {
  data.pid = pid;
  if (!data.uid) {
    data.uid = ++last_uid;
  }
  data.severity = STACKDRIVER_SEVERITY[data[LEVEL]] || STACKDRIVER_SEVERITY.info;
  data.puid = puid;
  return data;
});

// Simulate an output similar to stackdriver for comparable local logs
const stackdriverLocalFormat = format((data) => {
  data.pid = pid;
  if (!data.uid) {
    data.uid = ++last_uid;
  }
  // data.puid = puid;
  return {
    severity: STACKDRIVER_SEVERITY[data[LEVEL]] || STACKDRIVER_SEVERITY.info,
    timestamp: new Date().toISOString(),
    jsonPayload: data,
  };
});

let inited = false;
export function startup(params) {
  if (inited) {
    return;
  }
  params = params || {};
  inited = true;
  let options = { transports: [] };

  let any_local_logging = false;

  let server_config = serverConfig();
  let config_log = server_config.log || {};
  let level = config_log.level || 'debug';
  let file_level = 'silly'; // referenced above
  if (config_log.cat) {
    for (let key in config_log.cat) {
      logCategoryEnable(key, config_log.cat[key]);
    }
  }
  if (params.transports) {
    options.transports = options.transports.concat(params.transports);
  } else {
    let args = [];
    let stderrLevels;
    if (config_log.stackdriver) {
      // Structured logging for Stackdriver through the console
      stderrLevels = ['error'];
      //args.push(format.timestamp()); // doesn't seem to be needed
      args.push(stackdriverFormat());
      args.push(format.json());
      if (config_log.local_log) {
        // Structured logging to disk in rotating files for local debugging at higher verbosity
        // Note: likely saved to a non-persistent disk
        let local_format = format.combine(
          stackdriverLocalFormat(),
          format.json(),
        );
        options.transports.push(new winston.transports.DailyRotateFile({
          level: file_level,
          filename: 'local-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          dirname: 'logs',
          maxSize: '1g',
          maxFiles: 7, // will be lesser of 7 days and 7 GB
          eol: '\n',
          format: local_format,
          zippedArchive: false,
        }));
        any_local_logging = true;
      }
    } else {
      if (config_log.local_log) {
        // Structured logging to disk in rotating files for local debugging at higher verbosity
        let local_format = format.combine(
          stackdriverLocalFormat(),
          format.json(),
        );
        options.transports.push(new winston.transports.DailyRotateFile({
          level: file_level,
          filename: 'server-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          dirname: 'logs',
          maxFiles: 7,
          eol: '\n',
          format: local_format,
        }));
        any_local_logging = true;
        options.transports.push(new SubscribedClientsTransport({
          level: file_level,
          format: local_format,
        }));
      }
      // Human-readable/grep-able console logger
      log_dump_to_logger = false;
      args.push(format.metadata());
      if (config_log.timestamp_format === 'long') {
        // implicitly toISOString, can get local time with {format: 'YYYY-MM-DDTHH:mm:ss.SSSZZ'}
        args.push(format.timestamp());
      } else {
        args.push(format.timestamp({ format: 'HH:mm:ss' }));
      }
      let colorizer = format.colorize();
      if (config_log.format === 'dev') {
        args.push(format(function (data) {
          if (data.metadata && data.metadata.cat) {
            data.message = `${colorizer.colorize('silly', `[${data.metadata.cat}]`)} ${data.message}`;
          }
          return data;
        })());
      }
      if (config_log.pad_levels) {
        args.push(format.padLevels());
      }
      if (config_log.format === 'dev') {
        args.push(colorizer);
        args.push(
          // Just the payload
          format.printf(function (data) {
            let payload = data.metadata && data.metadata.payload;
            let meta = payload ?
              ` | ${inspect(payload, { breakLength: Infinity, compact: true })}` :
              '';
            return `[${data.timestamp}] ${data.level} ${data.message}${meta}`;
          })
        );
      } else {
        args.push(
          format.printf(function (data) {
            let meta = Object.keys(data.metadata).length !== 0 ?
              ` | ${inspect(data.metadata, { breakLength: Infinity, compact: true })}` :
              '';
            return `[${data.timestamp} ${pid} ${++last_uid}] ${data.level} ${data.message}${meta}`;
          })
        );
      }
    }
    let format_param = format.combine(...args);
    if (argv.dev) {
      // DOES forward to debugger
      options.transports.push(
        new SimpleConsoleTransport({
          level,
          format: format_param,
        })
      );
    } else {
      // Does NOT forward to an interactive debugger (due to bug? useful, though)
      options.transports.push(
        new winston.transports.Console({
          level,
          format: format_param,
          stderrLevels,
        })
      );
    }
  }

  logger = winston.createLogger(options);
  //debug('TESTING DEBUG LEVEL');
  //info('TESTING INFO LEVEL');
  //warn('TESTING WARN LEVEL', { foo: 'bar' });
  //error('TESTING ERROR LEVEL', { foo: 'bar' }, { baaz: 'quux' });

  if (!fs.existsSync(log_dir)) {
    console.info(`Creating ${log_dir}...`);
    fs.mkdirSync(log_dir);
  }

  if (any_local_logging && fadvise && !fadvise.failed_to_load) {
    setTimeout(bufferFlush, BUFFER_FLUSH_TIME);
  }

  Object.keys(LOG_LEVELS).forEach(function (fn) {
    let log_level = LOG_LEVELS[fn];
    raw_console[fn] = console[fn];
    console[fn] = logEx.bind(null, null, log_level);
  });

  // console.debug('TESTING DEBUG LEVEL');
  // console.info('TESTING INFO LEVEL');
  // console.warn('TESTING WARN LEVEL', { foo: 'bar' });
  // console.error('TESTING ERROR LEVEL', { foo: 'bar' }, { baaz: 'quux' });
  // console.error('TESTING ERROR LEVEL', new Error('error param'));
  // console.error(new Error('raw error'));
  // console.info({ testing: 'info object' });
  // console.info('testing object param', { testing: 'info object' });
}
