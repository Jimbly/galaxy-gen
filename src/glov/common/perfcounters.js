const NUM_BUCKETS = 5;

let counters = { time_start: Date.now() };
let hist = [counters];
let bucket_time = 10000;
let countdown = bucket_time;

export function perfCounterSetBucketTime(time) {
  countdown = bucket_time = time;
}

export function perfCounterAdd(key) {
  counters[key] = (counters[key] || 0) + 1;
}

export function perfCounterAddValue(key, value) {
  counters[key] = (counters[key] || 0) + value;
}

export function perfCounterTick(dt, log) {
  countdown -= dt;
  if (countdown <= 0) {
    countdown = bucket_time;
    if (hist.length === NUM_BUCKETS) {
      hist.splice(0, 1);
    }
    let now = Date.now();
    counters.time_end = now;
    if (log) {
      log(counters);
    }
    counters = {};
    counters.time_start = now;
    hist.push(counters);
  }
}

export function perfCounterHistory() {
  return hist;
}
