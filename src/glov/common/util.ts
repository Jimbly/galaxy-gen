// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

import assert from 'assert';

import type { DataObject, ErrorCallback } from './types';
import type { Vec2 } from './vmath';

const { PI, abs, floor, min, max, random, round, pow, sin, sqrt } = Math;
const TWO_PI = PI * 2;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const VALID_USER_ID_REGEX = /^(?:fb\$|[a-z0-9])[a-z0-9_]{1,32}$/;

export function nop(): void {
  // empty
}

export function identity<T>(a: T): T {
  return a;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function once<T extends any[]>(fn: (...args: T) => void): (...args: T) => void {
  let called = false;
  return function (...args) {
    if (called) {
      return;
    }
    called = true;
    fn(...args);
  };
}

export function empty(obj: DataObject | null | undefined): boolean {
  for (let key in obj) {
    return false;
  }
  return true;
}

export function easeInOut(v: number, a: number): number {
  let va = pow(v, a);
  return va / (va + pow(1 - v, a));
}
export function easeIn(v: number, a: number): number {
  return 2 * easeInOut(0.5 * v, a);
}
export function easeOut(v: number, a: number): number {
  return 2 * easeInOut(0.5 + 0.5 * v, a) - 1;
}

// Extra easing types from pixijs-userland/animate - MIT Licensed
// Exponential ease
export function tweenExpoIn(v: number): number {
  return (v === 0 ? 0 : pow(2, 10 * v - 10));
}
export function tweenExpoOut(v: number): number {
  return (v === 1 ? 1 : 1 - pow(2, -10 * v));
}
export function tweenExpoInOut(v: number): number {
  return v === 0 ? 0 : v === 1 ? 1 : v < 0.5 ? 0.5 * pow(2, 20 * v - 10) : 1 - 0.5 * pow(2, -20 * v + 10);
}

// Elastic ease - elastic back and forth a bit on the eased end
export function tweenElasticIn(v: number): number {
  return sin(13 * (PI / 2) * v) * pow(2, 10 * (v - 1));
}
export function tweenElasticOut(v: number): number {
  return sin(-13 * (PI / 2) * (v + 1)) * pow(2, -10 * v) + 1;
}
export function tweenElasticInOut(v: number): number {
  return v < 0.5 ?
    0.5 * sin(13 * (PI / 2) * (2 * v)) * pow(2, 10 * (2 * v - 1)) :
    0.5 * (sin(-13 * (PI / 2) * (2 * v - 1 + 1)) * pow(2, -10 * (2 * v - 1)) + 2);
}
// Bounce ease - bouncing back and forth a bit on the eased end - only tweanBounceOut feels useful
export function tweenBounceOut(v: number): number {
  if (v < 1 / 2.75) {
    return 7.5625 * v * v;
  } else if (v < 2 / 2.75) {
    v -= 1.5 / 2.75;
    return 7.5625 * v * v + 0.75;
  } else if (v < 2.5 / 2.75) {
    v -= 2.25 / 2.75;
    return 7.5625 * v * v + 0.9375;
  } else {
    v -= 2.625 / 2.75;
    return 7.5625 * v * v + 0.984375;
  }
}
export function tweenBounceIn(v: number): number {
  return 1 - tweenBounceOut(1 - v);
}
export function tweenBounceInOut(v: number): number {
  return (v < 0.5 ? (1 - tweenBounceOut(1 - 2 * v)) / 2 : (1 + tweenBounceOut(2 * v - 1)) / 2);
}


export function clone<T>(obj: T): T {
  if (!obj) { // handle undefined
    return obj;
  }
  return JSON.parse(JSON.stringify(obj));
}

export function merge<A, B>(dest: A, src: B): A & B {
  for (let f in src) {
    (dest as DataObject)[f] = src[f];
  }
  return dest as (A & B);
}

export function has<T>(obj: T, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, field);
}

export function defaults<A, B>(dest: A, src: B): A & B {
  for (let f in src) {
    if (!has(dest, f)) {
      (dest as DataObject)[f] = src[f];
    }
  }
  return dest as (A & B);
}

export function defaultsDeep<A, B>(dest: A, src: B): A & B {
  for (let f in src) {
    if (!has(dest, f)) {
      (dest as DataObject)[f] = src[f];
    } else {
      let vd = (dest as DataObject)[f];
      let vs = src[f];
      if (typeof vd === 'object' && !Array.isArray(vd) && typeof vs === 'object' && !Array.isArray(vs)) {
        defaultsDeep(vd, src[f]);
      }
    }
  }
  return dest as (A & B);
}

export function cloneShallow<T>(src: T): T {
  return merge({}, src);
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) {
      return false;
    }
    if (a.length !== b.length) {
      return false;
    }
    for (let ii = 0; ii < a.length; ++ii) {
      if (!deepEqual(a[ii], b[ii])) {
        return false;
      }
    }
    return true;
  } else if (typeof a === 'object') {
    if (typeof b !== 'object') {
      return false;
    }
    if (!a || !b) { // at least one is null
      return !a && !b; // equal if both are null
    }
    for (let key in a) {
      // b must have key, or both a[key] and b[key] are undefined
      if (!deepEqual((a as DataObject)[key], (b as DataObject)[key])) {
        return false;
      }
    }
    for (let key in b) {
      // if b has key and it's defined, a must also be defined (and would have checked equality above)
      if ((b as DataObject)[key] !== undefined && (a as DataObject)[key] === undefined) {
        return false;
      }
    }
    return true;
  }
  return a === b;
}

export function deepAdd(dest: DataObject, src: DataObject): void {
  assert(dest && src);
  for (let key in src) {
    let value = src[key];
    let dest_value = dest[key];
    if (typeof value === 'object') {
      assert(value);
      let dest_sub = (dest[key] = dest_value || {}) as DataObject;
      assert.equal(typeof dest_sub, 'object');
      deepAdd(dest_sub, value);
    } else {
      if (!dest_value) {
        dest_value = 0;
      }
      assert(typeof dest_value === 'number');
      assert(typeof value === 'number');
      dest[key] = (dest_value || 0) + value;
    }
  }
}

// Creates a deep clone of B, but attempts to preserve shared references from A
// wherever structurally identical.
// Expected usage: A is a previous snapshot of B, B has been modified, makes a
// new snapshot that takes minimal additional memory.
export function refclone<T>(a: T, b: T): T {
  if (typeof b !== 'object' || !b) {
    // primitive type
    return b;
  }

  if (deepEqual(a, b)) {
    return a;
  }

  if (Array.isArray(b)) {
    let result: unknown[] = [];
    for (let i = 0; i < b.length; i++) {
      result[i] = refclone(a && (a as unknown[])[i], (b as unknown[])[i]);
    }
    return result as T;
  }

  let result: DataObject = {};
  for (let key in b) {
    result[key] = refclone(a && (a as DataObject)[key], (b as DataObject)[key]);
  }
  return result as T;
}

export function clamp(v: number, mn: number, mx: number): number {
  return min(max(mn, v), mx);
}

export function lerp(a: number, v0: number, v1: number): number {
  return (1 - a) * v0 + a * v1;
}

export function shortAngleDist(a0: number, a1: number): number {
  let delta = (a1 - a0) % TWO_PI;
  return 2 * delta % TWO_PI - delta;
}

export function lerpAngle(t: number, a0: number, a1: number): number {
  let r = a0 + shortAngleDist(a0, a1) * t;
  if (r < 0) {
    r += TWO_PI;
  }
  return r;
}


export function mix(v0: number, v1: number, a: number): number { // GLSL semantics
  return (1 - a) * v0 + a * v1;
}

export function map01(number: number, in_min: number, in_max: number): number {
  return (number - in_min) / (in_max - in_min);
}

export function sign(a: number): -1 | 0 | 1 {
  return a < 0 ? -1 : a > 0 ? 1 : 0;
}

export function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

// log2 rounded up to nearest integer
export function log2(val: number): number {
  for (let ii=1, jj=0; ; ii <<= 1, ++jj) {
    if (ii >= val) {
      return jj;
    }
  }
}

export function ridx(arr: unknown[], idx: number): void {
  arr[idx] = arr[arr.length - 1];
  arr.pop();
}

export function tail<T>(arr: T[]): T | null {
  if (!arr.length) {
    return null;
  }
  return arr[arr.length - 1];
}

export function round100(a: number): number {
  return round(a * 100) / 100;
}

export function round1000(a: number): number {
  return round(a * 1000) / 1000;
}

export function fract(a: number): number {
  return a - floor(a);
}

export function nearSame(a: number, b: number, tol: number): boolean {
  return abs(b - a) <= tol;
}

export function nearSameAngle(a: number, b: number, tol: number): boolean {
  return abs(shortAngleDist(a, b)) <= tol;
}

export function titleCase(str: string): string {
  return str.split(' ').map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

const EPSILON = 0.00001;

// http://local.wasp.uwa.edu.au/~pbourke/geometry/sphereline/
export function lineCircleIntersect(p1: Vec2, p2: Vec2, pCircle: Vec2, radius: number): boolean {
  let dp = [
    p2[0] - p1[0],
    p2[1] - p1[1]
  ];
  let a = dp[0] * dp[0] + dp[1] * dp[1];
  let b = 2 * (dp[0] * (p1[0] - pCircle[0]) + dp[1] * (p1[1] - pCircle[1]));
  let c = pCircle[0] * pCircle[0] + pCircle[1] * pCircle[1];
  c += p1[0] * p1[0] + p1[1] * p1[1];
  c -= 2 * (pCircle[0] * p1[0] + pCircle[1] * p1[1]);
  c -= radius * radius;
  let bb4ac = b * b - 4 * a * c;
  if (abs(a) < EPSILON || bb4ac < 0) {
    return false;
  }

  let mu1 = (-b + sqrt(bb4ac)) / (2 * a);
  let mu2 = (-b - sqrt(bb4ac)) / (2 * a);
  if (mu1 >= 0 && mu1 <= 1 || mu2 >= 0 && mu2 <= 1) {
    return true;
  }

  return false;
}

// line segment intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
export function lineLineIntersect(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): boolean {
  let denominator = ((p4[1] - p3[1]) * (p2[0] - p1[0]) - (p4[0] - p3[0]) * (p2[1] - p1[1]));
  let numa = ((p4[0] - p3[0]) * (p1[1] - p3[1]) - (p4[1] - p3[1]) * (p1[0] - p3[0]));
  let numb = ((p2[0] - p1[0]) * (p1[1] - p3[1]) - (p2[1] - p1[1]) * (p1[0] - p3[0]));

  if (denominator === 0) {
    // lines are parallel, or 0-length line
    if (!numa && !numb) {
      // lines are coincident
      return true;
    }
    return false;
  }

  let ua = numa / denominator;
  let ub = numb / denominator;

  // is the intersection along the segments
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return false;
  }

  return true;
  // let x = p1[0] + ua * (p2[0] - p1[0]);
  // let y = p1[1] + ua * (p2[1] - p1[1]);
  // return [x, y];
}

// let setPrototypeOf = Object.setPrototypeOf ?
//   Object.setPrototypeOf.bind() :
//   function _setPrototypeOf(o, p) {
//     o.__proto__ = p; // eslint-disable-line no-proto
//     return o;
//   };
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function inherits(ctor: Constructor | Function, superCtor: Constructor | Function): void {
  // From Node.js
  assert(typeof superCtor === 'function');
  let ctor_proto_orig = ctor.prototype;
  // not needed? ctor.super_ = superCtor; // eslint-disable-line no-underscore-dangle
  // second parameter also not actually needed, just defines new Foo().constructor === Foo?
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  // If anything had been added to the prototype (only in the case of late/double
  //   inheritance), add it
  for (let key in ctor_proto_orig) {
    ctor.prototype[key] = ctor_proto_orig[key];
  }
  // Also inherit static methods
  // Could use setPrototypeOf (fewer ordering issues) if needed, but has strong performance warnings
  // setPrototypeOf(ctor, superCtor);
  for (let key in superCtor) {
    (ctor as unknown as DataObject)[key] = (superCtor as unknown as DataObject)[key];
  }
}

export function isPowerOfTwo(n: number): boolean {
  return ((n & (n - 1)) === 0);
}

export function nextHighestPowerOfTwo(x: number): number {
  --x;
  for (let i = 1; i < 32; i <<= 1) {
    x |= x >> i;
  }
  return x + 1;
}

export function logdata(data: unknown): string {
  if (data === undefined) {
    return '';
  }
  let r = JSON.stringify(data);
  if (r.length < 120) {
    return r;
  }
  return `${r.slice(0, 120-3)}...(${r.length})`;
}

export function isInteger(v: unknown): v is number /* and an integer */ {
  return typeof v === 'number' && isFinite(v) && floor(v) === v;
}

export function toNumber(v: string): number {
  return Number(v);
}

export function randomNot(not_value: number, min_value: number, max_value: number): number {
  let new_value;
  let range = max_value - min_value;
  do {
    new_value = floor(min_value + random() * range);
  } while (new_value === not_value);
  return new_value;
}

export function toArray(array_like: Float32Array | Int32Array | Uint8Array): number[] {
  return Array.prototype.slice.call(array_like);
}

export function arrayToSet(array: Readonly<number[]>): Partial<Record<number, true>>;
export function arrayToSet(array: Readonly<string[]>): Partial<Record<string, true>>;
export function arrayToSet<T extends string | number>(array: Readonly<T[]>): Partial<Record<T, true>> {
  let ret = Object.create(null);
  for (let ii = 0; ii < array.length; ++ii) {
    ret[array[ii]] = true;
  }
  return ret;
}

// Makes a prototype-less object that can safely be used as a set to query for user-supplied strings
export function objectToSet<V, T extends Partial<Record<string, V>>>(obj: T | undefined): T {
  return merge(Object.create(null), obj);
}

export function matchAll(str: string, re: RegExp): string[] {
  let ret = [];
  let m;
  do {
    m = re.exec(str);
    if (m) {
      ret.push(m[1]);
    }
  } while (m);
  return ret;
}

export function callEach<T extends unknown[]>(
  arr: ((...fargs: T) => void)[] | null | undefined,
  pre_clear?: null | undefined | boolean | never[], // `boolean` for `delete foo.cbs`
  ...args: T
): void {
  if (arr && arr.length) {
    for (let ii = 0; ii < arr.length; ++ii) {
      arr[ii](...args);
    }
  }
}

// The characters cause problems with lower level systems (Google Firestore)
// that presumably try to convert to UTF-16.
// const utf16_surrogates = /[\uD800-\uDFFF]/g;

// "Bad" whitespace characters not caught by .trim()
// Found by running:
//   require('somefont.json').char_infos.filter(a=>String.fromCharCode(a.c).trim()).filter(a=>!a.w).map(a=a.c)
// const bad_whitespace = /[\x00-\x1F\x7F\u1D54\u1D55\u2000-\u200F\u205F-\u206F\uFE00]/g;

// eslint-disable-next-line no-control-regex, no-misleading-character-class
const sanitize_regex = /[\uD800-\uDFFF\x00-\x1F\x7F\u1D54\u1D55\u2000-\u200F\u205F-\u206F\uFE00]/g;
export function sanitize(str: string): string {
  return (str || '').replace(sanitize_regex, '');
}

export function plural(number: number, label: string): string {
  return `${label}${number === 1 ? '' : 's'}`;
}

export function capitalize(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

export function secondsToFriendlyString(seconds: number, force_include_seconds?: boolean): string {
  let days = floor(seconds / (60*60*24));
  seconds -= days * 60*60*24;
  let hours = floor(seconds / (60*60));
  seconds -= hours * 60*60;
  let minutes = floor(seconds / 60);
  seconds -= minutes * 60;
  let resp = [];
  if (days) {
    let years = floor(days / 365.25);
    if (years) {
      days -= floor(years * 365.25);
      resp.push(`${years} ${plural(years, 'year')}`);
    }
    resp.push(`${days} ${plural(days, 'day')}`);
  }
  if (hours) {
    resp.push(`${hours} ${plural(hours, 'hour')}`);
  }
  if (minutes || !resp.length) {
    resp.push(`${minutes} ${plural(minutes, 'minute')}`);
  }
  if (force_include_seconds) {
    resp.push(`${seconds} ${plural(seconds, 'second')}`);
  }
  return resp.join(', ');
}

export function secondsSince2020(): number {
  // Seconds since Jan 1st, 2020
  return floor(Date.now() / 1000) - 1577836800;
}

export function dateToSafeLocaleString(date: Date, date_only: boolean, options?: {
  weekday?: 'long' | 'short';
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short';
  day?: 'numeric' | '2-digit';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
  second?: 'numeric' | '2-digit';
  timeZoneName?: 'long' | 'short';
}): string {
  // Uses toString as a fallback since some browsers do not properly detect default locale.
  let date_text;
  try {
    date_text = date_only ? date.toLocaleDateString(undefined, options) : date.toLocaleString(undefined, options);
  } catch (e) {
    console.error(e, '(Using toString as fallback)');
    date_text = date_only ? date.toDateString() : date.toString();
  }
  return date_text;
}

export function dateToFileTimestamp(date: Date): string {
  function pad(value: number): string {
    return `${value < 10 ? 0 : ''}${value}`;
  }
  let year = date.getFullYear();
  let month = pad(date.getMonth() + 1);
  let day = pad(date.getDate());
  let hours = pad(date.getHours());
  let minutes = pad(date.getMinutes());
  let seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}_${minutes}_${seconds}`;
}

export function msToTimeString(duration: number, opts?: { hide_ms?: boolean }): string {
  opts = opts || {};
  let ms = duration % 1000;
  let s;
  let m;
  let h;
  s = duration - ms;
  s %= (60 * 1000);
  m = (duration - ms - s);
  m %= (60 * 60 * 1000);
  h = duration - ms - s - m;
  h /= 60 * 60 * 1000;
  m /= 60 * 1000;
  s /= 1000;

  return `${
    h ? `${h}:` : ''}${
    h && m < 10 ? '0': ''}${m}:${
    s < 10 ? '0' : ''}${s}${
    opts.hide_ms ? '' : `.${ms < 10 ? '00' : ms < 100 ? '0' : ''}${ms}`
  }`;
}
/**
 * Returns the string with removed symbols and punctuations
 * @param {string} string String to filter out symbols
 * @returns {string} New string without symbols and punctuations
 */
export function removeSymbols(string: string): string {
  return string.replace(/[.,/\\@#£!$%^&*;:<>{}|?=\-+_`'"~[\]()]/g,'').replace(/\s{1,}/g,' ');
}

// Stop words map
let sw = arrayToSet([
  'am', 'an', 'and', 'as', 'at', 'be', 'by', 'el',
  'for', 'in', 'is', 'la', 'las', 'los', 'of', 'on',
  'or', 'the', 'that', 'this', 'to', 'with',
]);
/**
 * Removes single char and stop words from the string array.
 * @param {string[]} string_array Array of strings to filter out single char
 * @returns {string[]} Filter string array with single char and stop words removed
 */
export function cleanupStringArray(string_array: string[]): string[] {
  return string_array.filter((s) => (s.length > 1) && (s.length <= 32) && !sw[s]);
}

/**
 * Return an array of the string splits after transforming to lowercase and trimming whitespaces on each of the split.
 * Punctuations and symbols are also filtered.
 * Also removes single char and stopwords via cleanupStringArray.
 * @param {string[]} string String to use to form the string split result
 * @param {string} pattern String pattern to divide the string on
 * @returns {string[]} String split result
 */
export function cleanStringSplit(string: string, pattern: string): string[] {
  // remove punctuations and symbols; e.g., 'In!@£$%^&*()_+sane Wo`{}[]|/?\'"rld;:<>s,.' = 'Insane Worlds'
  const base = removeSymbols(sanitize(string));
  return cleanupStringArray(base.toLowerCase().split(pattern).map((s) => s.trim()));
}

export function eatPossiblePromise(p: Promise<unknown> | undefined): void {
  // On some browsers, some APIs return Promises where they did not before,
  //   wrap in this to discard any exceptions / rejections from these.
  //   For example, pointerLockEnter, throws "Uncaught UnknownError" on Chrome on
  //   Android, as well as triggering pointerlockerror.
  if (p && p.catch) {
    p.catch(nop);
  }
}

export function errorString(e: Error | DataObject | string | unknown) : string {
  let msg = String(e);
  if (msg === '[object Object]') {
    try {
      msg = JSON.stringify(e);
    } catch (ignored) {
      // ignored
    }
  }
  if (e && (e as Error).stack && (e as Error).message) {
    // Error object or similar
    // Just grabbing the message, but could do something with the stack similar to error handler in bootstrap.js
    msg = String((e as Error).message);
  }
  msg = msg.slice(0, 600); // Not too huge
  return msg;
}

export function deprecate(exports: Partial<Record<string, unknown>>, field: string, replacement: string): void {
  Object.defineProperty(exports, field, {
    get: function () {
      assert(false, `${field} is deprecated, use ${replacement} instead`);
      return undefined;
    }
  });
}

let nextTick = typeof process !== 'undefined' ?
  process.nextTick :
  typeof window !== 'undefined' && window.setImmediate ? window.setImmediate :
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fn: (...args: any[]) => void) => setTimeout(fn, 1);

export function callbackify<T>(f: () => Promise<T>): (next: ErrorCallback<T>) => void;
export function callbackify<T, P1>(f: (p1: P1) => Promise<T>): (p1: P1, next: ErrorCallback<T>) => void;
export function callbackify<T, P1, P2>(
  f: (p1: P1, p2: P2) => Promise<T>
): (p1: P1, p2: P2, next: ErrorCallback<T>) => void;
export function callbackify<T, P1, P2, P3>(
  f: (p1: P1, p2: P2, p3: P3) => Promise<T>
): (p1: P1, p2: P2, p3: P3, next: ErrorCallback<T>) => void;
export function callbackify<T, P1, P2, P3, P4>(
  f: (p1: P1, p2: P2, p3: P3, p4: P4) => Promise<T>
): (p1: P1, p2: P2, p3: P3, p4: P4, next: ErrorCallback<T>) => void;

// Turns a promise-generating function into a callback-style function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function callbackify(f: (...args: any[]) => Promise<unknown>): (...args: any[]) => void {
  return function (this: unknown) {
    let cb = arguments[arguments.length - 1]; // eslint-disable-line prefer-rest-params
    assert.equal(typeof cb, 'function');
    let args = Array.prototype.slice.call(arguments, 0, -1); // eslint-disable-line prefer-rest-params
    let p = f.apply(this, args);
    p.then((result) => {
      if (cb) {
        // escape promise so it doesn't catch and re-throw the error!
        nextTick(cb.bind(this, null, result));
        cb = null;
      }
    }).catch((err) => {
      if (cb) {
        nextTick(cb.bind(this, err));
        cb = null;
      }
    });
  };
}

// Wraps a callback so that it escapes implicit try/catches from callbacks fired
//   within Promises.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function unpromisify<P extends any[], T=never>(f: (this: T, ...args: P) => void): (this: T, ...args: P) => void {
  return function (this: T): void {
  // eslint-disable-next-line prefer-rest-params, @typescript-eslint/no-explicit-any
    nextTick((f as any).apply.bind(f, this, arguments));
  };
}

export function msToSS2020(milliseconds: number): number {
  // Integer seconds since Jan 1st, 2020
  return floor(milliseconds / 1000) - 1577836800;
}

export function ss2020ToMS(ss2020: number): number {
  // Integer seconds since Jan 1st, 2020
  return (ss2020 + 1577836800) * 1000;
}

const whitespace_regex = /\s/;
export function trimEnd(s: string): string {
  let idx = s.length;
  while (idx > 0 && s[idx-1].match(whitespace_regex)) {
    --idx;
  }
  return s.slice(0, idx);
}

function isDigit(c: string): boolean {
  return c >= '0' && c <= '9';
}

const char_code_0 = '0'.charCodeAt(0);
export function cmpNumericSmart(a: string, b: string): number {
  // smart compare numbers within strings
  let ia = 0;
  let ib = 0;
  while (ia < a.length && ib < b.length) {
    if (isDigit(a[ia])) {
      if (isDigit(b[ib])) {
        // compare numbers
        let va = 0;
        while (isDigit(a[ia])) {
          va *= 10;
          va += a.charCodeAt(ia++) - char_code_0;
        }
        let vb = 0;
        while (isDigit(b[ib])) {
          vb *= 10;
          vb += b.charCodeAt(ib++) - char_code_0;
        }
        let d = va - vb;
        if (d) {
          return d;
        }
      } else {
        // numbers before strings
        return -1;
      }
    } else if (isDigit(b[ib])) {
      return 1;
    } else {
      let d = a[ia].toLowerCase().charCodeAt(0) - b[ib].toLowerCase().charCodeAt(0);
      if (d) {
        return d;
      }
      ia++;
      ib++;
    }
  }
  if (ia < a.length) {
    return 1;
  } else if (ib < b.length) {
    return -1;
  } else {
    return 0;
  }
}

export function mdEscape(text: string): string {
  return text.replace(/([\\[*_])/g, '\\$1');
}

type AsyncDictCacheInternal<T> = Partial<Record<string, {
  in_flight?: Array<(value: T) => void>;
  value?: T;
}>>;
let async_dict_caches: Record<string, Record<never, never>> = {};
export function asyncDictionaryGet<T>(
  cache_in: string | Record<never, never>, // {}
  key: string,
  get: (key: string, cb: (value: T) => void)=> void,
  cb: (value: T) => void
): void {
  if (typeof cache_in === 'string') {
    cache_in = async_dict_caches[cache_in] = async_dict_caches[cache_in] || {};
  }
  let cache = cache_in as AsyncDictCacheInternal<T>;
  let elem = cache[key];
  if (elem) {
    if (elem.in_flight) {
      elem.in_flight.push(cb);
    } else {
      cb(elem.value!);
    }
    return;
  }
  cache[key] = elem = {
    in_flight: [cb],
  };
  get(key, function (value: T) {
    elem.value = value;
    callEach(elem.in_flight, elem.in_flight = undefined, value);
  });
}
