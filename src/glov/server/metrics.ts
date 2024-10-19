export const METRIC_FREQ_HIGH = 'high'; // at least once a minute - whatever the maximum frequency of the back-end is
export const METRIC_FREQ_MED = 'med'; // once every 2 minutes - default
export const METRIC_FREQ_LOW = 'low'; // flushed once every 10 minutes, used for large bulk counters, e.g. # of logs
export type MetricFreq = typeof METRIC_FREQ_HIGH | typeof METRIC_FREQ_MED | typeof METRIC_FREQ_LOW;

import * as execute_with_retry from 'glov/common/execute_with_retry';
import { TSMap } from 'glov/common/types';

const assert = require('assert');

export type MetricsImplementation = {
  add(metric_name: string, value: number, freq: MetricFreq): void;
  set(metric_name: string, value: number, freq: MetricFreq): void;
  stats(metric_name: string, value: number, freq: MetricFreq): void;
};

let metric: MetricsImplementation | undefined;
let add_metrics: TSMap<number> = {};
let set_metrics: TSMap<number> = {};

// Add to a metric for event counts (i.e. something that we want to view the sum of over a time range)
export function metricsAdd(metric_name: string, value: number, freq: MetricFreq): void {
  assert(!set_metrics[metric_name]);
  add_metrics[metric_name] = 1;
  if (metric) {
    metric.add(metric_name, value, freq || METRIC_FREQ_MED);
  }
}

// Set a measurement metric (i.e. something reported on a fixed period that we may want to view the min/max/average of)
// The most recent value will be reported when flushed
export function metricsSet(metric_name: string, value: number, freq: MetricFreq): void {
  assert(!add_metrics[metric_name]);
  if (set_metrics[metric_name] !== value || true) {
    set_metrics[metric_name] = value;
    if (metric) {
      metric.set(metric_name, value, freq || METRIC_FREQ_MED);
    }
  }
}

// Set a valued event metric for which we want detailed statistics (e.g. bytes sent per request), *not* sampled
//   at a regular interval
// The metric provider may need to track sum/min/max/avg in-process between flushes
// This could maybe be combined with `metric.add(metric_name, 1)` (but only care about sum in that case)?
export function metricsStats(metric_name: string, value: number, freq: MetricFreq): void {
  if (metric) {
    metric.stats(metric_name, value, freq || METRIC_FREQ_MED);
  }
}

// metric_impl must have .add and .set
export function metricsInit(metric_impl: MetricsImplementation): void {
  metric = metric_impl;
  execute_with_retry.setMetricsAdd(metricsAdd);
}

// Legacy API
exports.add = metricsAdd;
exports.set = metricsSet;
exports.stats = metricsStats;
exports.init = metricsInit;
