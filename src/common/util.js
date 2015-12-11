// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

const assert = require('assert');
const { abs, floor, min, max, random, round, pow, sqrt } = Math;

export function nop() {
  // empty
}

export function once(fn) {
  let called = false;
  return function (...args) {
    if (called) {
      return;
    }
    called = true;
    fn(...args);
  };
}

export function empty(obj) {
  for (let key in obj) {
    return false;
  }
  return true;
}

export function easeInOut(v, a) {
  let va = pow(v, a);
  return va / (va + pow(1 - v, a));
}

export function easeIn(v, a) {
  return 2 * easeInOut(0.5 * v, a);
}

export function easeOut(v, a) {
  return 2 * easeInOut(0.5 + 0.5 * v, a) - 1;
}

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function merge(dest, src) {
  for (let f in src) {
    dest[f] = src[f];
  }
  return dest;
}

export function has(obj, field) {
  return Object.prototype.hasOwnProperty.call(obj, field);
}

export function defaults(dest, src) {
  for (let f in src) {
    if (!has(dest, f)) {
      dest[f] = src[f];
    }
  }
  return dest;
}

export function defaultsDeep(dest, src) {
  for (let f in src) {
    if (!has(dest, f)) {
      dest[f] = src[f];
    } else if (typeof dest[f] === 'object') {
      defaultsDeep(dest[f], src[f]);
    }
  }
  return dest;
}

export function cloneShallow(src) {
  return merge({}, src);
}

export function deepEqual(a, b) {
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
      if (!deepEqual(a[key], b[key])) {
        return false;
      }
    }
    for (let key in b) {
      // if b has key and it's defined, a must also be defined (and would have checked equality above)
      if (b[key] !== undefined && a[key] === undefined) {
        return false;
      }
    }
    return true;
  }
  return a === b;
}

export function clamp(v, mn, mx) {
  return min(max(mn, v), mx);
}

export function lerp(a, v0, v1) {
  return (1 - a) * v0 + a * v1;
}

export function mix(v0, v1, a) { // GLSL semantics
  return (1 - a) * v0 + a * v1;
}

export function sign(a) {
  return a < 0 ? -1 : a > 0 ? 1 : 0;
}

// log2 rounded up to nearest integer
export function log2(val) {
  for (let ii=1, jj=0; ; ii <<= 1, ++jj) { // eslint-disable-line no-bitwise
    if (ii >= val) {
      return jj;
    }
  }
}

export function ridx(arr, idx) {
  arr[idx] = arr[arr.length - 1];
  arr.pop();
}

export function round100(a) {
  return round(a * 100) / 100;
}

export function round1000(a) {
  return round(a * 1000) / 1000;
}

export function fract(a) {
  return a - floor(a);
}

export function nearSame(a, b, tol) {
  return abs(b - a) <= tol;
}

export function titleCase(str) {
  return str.split(' ').map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

const EPSILON = 0.00001;

// http://local.wasp.uwa.edu.au/~pbourke/geometry/sphereline/
export function lineCircleIntersect(p1, p2, pCircle, radius) {
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

export function inherits(ctor, superCtor) {
  // From Node.js
  assert(typeof superCtor === 'function');
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
}

export function isPowerOfTwo(n) {
  return ((n & (n - 1)) === 0); // eslint-disable-line no-bitwise
}

export function nextHighestPowerOfTwo(x) {
  --x;
  for (let i = 1; i < 32; i <<= 1) { // eslint-disable-line no-bitwise
    x |= x >> i; // eslint-disable-line no-bitwise
  }
  return x + 1;
}

export function logdata(data) {
  if (data === undefined) {
    return '';
  }
  let r = JSON.stringify(data);
  if (r.length < 120) {
    return r;
  }
  return `${r.slice(0, 120-3)}...`;
}

export function isInteger(v) {
  return typeof v === 'number' && isFinite(v) && floor(v) === v;
}

export function toNumber(v) {
  return Number(v);
}

export function randomNot(not_value, max_value) {
  let new_value;
  do {
    new_value = floor(random() * max_value);
  } while (new_value === not_value);
  return new_value;
}

export function toArray(array_like) {
  return Array.prototype.slice.call(array_like);
}

export function matchAll(str, re) {
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

export function callEach(arr, pre_clear, ...args) {
  if (arr && arr.length) {
    for (let ii = 0; ii < arr.length; ++ii) {
      arr[ii](...args);
    }
  }
}

// The characters cause problems with lower level systems (Google Firestore)
// that presumably try to convert to UTF-16.
const utf16_surrogates = /[\uD800-\uDFFF]/g;
export function sanitize(str) {
  return (str || '').replace(utf16_surrogates, '');
}

export function plural(number, label) {
  return `${label}${number === 1 ? '' : 's'}`;
}
