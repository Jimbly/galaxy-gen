/**
 * Data Store Shield module
 *
 * This provides a very high level guard on top of data stores, ensuring they do
 * not get stuck, do not leave our process hung.  If data stores are behaving
 * correctly (they are doing their own error handling and retrying), none of
 * this should ever be hit, however with unreliable low-level libraries for
 * some cloud services, this will be needed on occasion.
 *
 * This also guards against things like callbacks being called multiple times
 * and adds a layer of metric tracking so we can monitor how many ops we are
 * doing and if they are getting backed up.
 */

export let dss_stats = {
  set: 0,
  get: 0,
  search: 0,
  inflight_set: 0,
  inflight_get: 0,
  inflight_search: 0,
};

import assert from 'assert';
import {
  perfCounterAdd,
  perfCounterAddValue,
} from 'glov/common/perfcounters';
import { getUID } from './log';
import {
  metricsAdd,
  metricsSet,
  metricsStats,
} from './metrics';

// Write timeouts *very* high, because if we ever assume a write has failed when
//  it's still in progress, that can lead to data corruption (earlier write
//  finally finishing after a later write went through).
// GCP Firestore has a timeout of 10 minutes, so should be higher than that
const TIMEOUT_WRITE = 15*60*1000;
const RETRIES_WRITE = 3;

const TIMEOUT_READ = 5*60*1000;
const RETRIES_READ = 6;

const TIMEOUT_SEARCH = 10*60*1000;
const RETRIES_SEARCH = 3;

const RETRY_DELAY_BASE = 5000;
const ERR_TIMEOUT_FORCED_SHIELD = 'ERR_TIMEOUT_FORCED_SHIELD'; // Must be a unique error string

let log_sets = false;
export function dataStoreLogSets(log) {
  log_sets = log;
}

function perfNamerDefault(obj_name) {
  return obj_name.split('/')[0];
}
let perf_namer = perfNamerDefault;
export function dataStoreSetPerfNamer(cb) {
  perf_namer = cb;
}

function DataStoreShield(data_store, opts) {
  let { label } = opts;
  this.label = label;
  this.metric_set = `${label}.set`;
  this.metric_get = `${label}.get`;
  this.metric_search = `${label}.search`;
  this.metric_errors = `${label}.errors`;
  this.metric_inflight_set = `${label}.inflight_set`;
  this.metric_inflight_get = `${label}.inflight_get`;
  this.metric_inflight_search = `${label}.inflight_search`;
  this.metric_timing = `${label}.timing`;
  this.metric_timing_search = `${label}.search_timing`;
  this.data_store = data_store;
  this.inflight_set = 0;
  this.inflight_get = 0;
  this.inflight_search = 0;
  if (!data_store.search) {
    this.search = null;
  }
}

DataStoreShield.prototype.unload = function (obj_name) {
  this.data_store.unload(obj_name);
};


DataStoreShield.prototype.executeShielded = function (op, obj_name, max_retries, timeout_time, func, cb) {
  let self = this;
  let uid = getUID();
  let metric_inflight = self[`metric_inflight_${op}`];
  let field_inflight = `inflight_${op}`;
  metricsSet(metric_inflight, ++self[field_inflight], 'med');
  ++dss_stats[field_inflight];
  let attempts = 0;
  function doAttempt() {
    let attempt = attempts++;
    let cb_called = false;
    let timeout;
    let timed_out = false;
    let start = Date.now();
    function onDone(err, ret) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      if (err || cb_called) {
        metricsAdd(self.metric_errors, 1, 'high');
        perfCounterAdd(self.metric_errors);
      }

      if (err !== ERR_TIMEOUT_FORCED_SHIELD) { // If not already logged about
        let dt = Date.now() - start;
        if (op === 'search') {
          metricsStats(self.metric_timing_search, dt, 'low');
        } else {
          metricsStats(self.metric_timing, dt, 'high');
        }
        if (dt > 15000) {
          console.warn(`DATASTORESHIELD(${op}:${uid}:${attempt}) Slow response for ${self.label}:${obj_name}` +
            ` (${(dt/1000).toFixed(1)}s elapsed)`);
        }
        if (err) {
          console.error(`DATASTORESHIELD(${op}:${uid}:${attempt}) Error result on ${self.label}:${obj_name}`, err);
        }
      }

      if (cb_called) {
        if (timed_out) {
          if (op === 'set') {
            // This is a critical error, may result in data corruption if another
            //   write has been issued after the first succeeded.
            console.error(`DATASTORESHIELD(${op}:${uid}:${attempt}) Callback ` +
              'called AFTER TIMEOUT (POSSIBLE DATA CORRUPTION)' +
              ` on ${self.label}:${obj_name}`);
          } else {
            console.error(`DATASTORESHIELD(${op}:${uid}:${attempt}) Callback ` +
              `called after timeout on ${self.label}:${obj_name}`);
          }
        } else {
          console.error(`DATASTORESHIELD(${op}:${uid}:${attempt}) Callback ` +
            `called twice on ${self.label}:${obj_name}`);
        }
        return;
      }
      cb_called = true;

      if (err) {
        if (attempts < max_retries) {
          console.error(`DATASTORESHIELD(${op}:${uid}:${attempt}) Retrying (${attempts})`);
          return void setTimeout(doAttempt, RETRY_DELAY_BASE * attempts * attempts);
        }
        console.error(`DATASTORESHIELD(${op}:${uid}:${attempt}) retries exhausted, erroring`);
      }
      metricsSet(metric_inflight, --self[field_inflight], 'med');
      --dss_stats[field_inflight];
      cb(err, ret);
    }

    // Chaining two setTimeout calls to be more responsive to large process stalls
    timeout = setTimeout(function () {
      timeout = setTimeout(function () {
        assert(!cb_called);
        timeout = null;
        timed_out = true;
        console.error(`DATASTORESHIELD(${op}:${uid}:${attempt}) Timeout, ` +
          `assuming failure on ${self.label}:${obj_name}`);
        onDone(ERR_TIMEOUT_FORCED_SHIELD);
      }, timeout_time/2);
    }, timeout_time/2);
    func(onDone);
  }
  doAttempt();
};

function estimateSize(thing) {
  if (thing instanceof Buffer || thing instanceof Uint8Array) {
    return thing.length;
  } else {
    return JSON.stringify(thing).length;
  }
}

DataStoreShield.prototype.setAsync = function (obj_name, value, cb) {
  let self = this;
  metricsAdd(self.metric_set, 1, 'low');
  perfCounterAdd(self.metric_set);
  let obj_type = perf_namer(obj_name);
  perfCounterAdd(`${self.metric_set}.count.${obj_type}`);
  perfCounterAddValue(`${self.metric_set}.bytes.${obj_type}`, estimateSize(value));
  dss_stats.set++;
  if (log_sets) {
    console.debug(`DATASTORESHIELD Set while restarting: ${this.label}:${obj_name}`);
  }
  this.executeShielded('set', obj_name, RETRIES_WRITE, TIMEOUT_WRITE, (onDone) => {
    self.data_store.setAsync(obj_name, value, onDone);
  }, cb);
};

DataStoreShield.prototype.getAsync = function (obj_name, default_value, cb) {
  let self = this;
  metricsAdd(self.metric_get, 1, 'low');
  perfCounterAdd(self.metric_get);
  let obj_type = perf_namer(obj_name);
  perfCounterAdd(`${self.metric_get}.count.${obj_type}`);
  dss_stats.get++;
  this.executeShielded('get', obj_name, RETRIES_READ, TIMEOUT_READ, (onDone) => {
    self.data_store.getAsync(obj_name, default_value, onDone);
  }, function (err, result) {
    if (!err && result) {
      perfCounterAddValue(`${self.metric_get}.bytes.${obj_type}`, estimateSize(result));
    }
    cb(err, result);
  });
};

DataStoreShield.prototype.getAsyncBuffer = function (obj_name, cb) {
  let self = this;
  metricsAdd(self.metric_get, 1, 'low');
  perfCounterAdd(self.metric_get);
  let obj_type = perf_namer(obj_name);
  perfCounterAdd(`${self.metric_get}.count.${obj_type}`);
  dss_stats.get++;
  this.executeShielded('get', obj_name, RETRIES_READ, TIMEOUT_READ, (onDone) => {
    self.data_store.getAsyncBuffer(obj_name, onDone);
  }, function (err, result) {
    if (!err && result) {
      perfCounterAddValue(`${self.metric_get}.bytes.${obj_type}`, estimateSize(result));
    }
    cb(err, result);
  });
};

DataStoreShield.prototype.search = function (collection, search, cb) {
  let self = this;
  metricsAdd(self.metric_search, 1, 'low');
  perfCounterAdd(self.metric_search);
  dss_stats.search++;
  this.executeShielded('search', collection, RETRIES_SEARCH, TIMEOUT_SEARCH, (onDone) => {
    self.data_store.search(collection, search, onDone);
  }, cb);
};

export function dataStoreShieldCreate(data_store, opts) {
  return new DataStoreShield(data_store, opts);
}
