// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT
/* eslint no-bitwise:off */

// Vector math functions required by the rest of the engine taken piecemeal from
// gl-matrix and related, as well as some generic math utilities
exports.mat3 = require('gl-mat3/create');
exports.mat4 = require('gl-mat4/create');

const { abs, max, min, floor, round, sqrt } = Math;

export function vec1(v) {
  return new Float32Array([v]);
}

export function vec2(a, b) {
  let r = new Float32Array(2);
  if (a || b) {
    r[0] = a;
    r[1] = b;
  }
  return r;
}

export function vec3(a, b, c) {
  let r = new Float32Array(3);
  if (a || b || c) {
    r[0] = a;
    r[1] = b;
    r[2] = c;
  }
  return r;
}

export function vec4(a, b, c, d) {
  let r = new Float32Array(4);
  if (a || b || c || d) {
    r[0] = a;
    r[1] = b;
    r[2] = c;
    r[3] = d;
  }
  return r;
}

function frozenVec4(a,b,c,d) {
  // if (debug) {
  //   return Object.freeze([a,b,c,d]); // Not a vec4, but lets us catch bugs
  // }
  return vec4(a,b,c,d);
}

export const unit_vec = frozenVec4(1,1,1,1);
export const half_vec = frozenVec4(0.5,0.5,0.5,0.5);
export const zero_vec = frozenVec4(0,0,0,0);
export const identity_mat3 = exports.mat3();
export const identity_mat4 = exports.mat4();
export const xaxis = frozenVec4(1,0,0,0);
export const yaxis = frozenVec4(0,1,0,0);
export const zaxis = frozenVec4(0,0,1,0);

export function v2abs(out, a) {
  out[0] = abs(a[0]);
  out[1] = abs(a[1]);
  return out;
}

export function v2add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  return out;
}

export function v2addScale(out, a, b, s) {
  out[0] = a[0] + b[0] * s;
  out[1] = a[1] + b[1] * s;
  return out;
}

export function v2copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  return out;
}

export function v2distSq(a, b) {
  return (a[0] - b[0]) * (a[0] - b[0]) +
    (a[1] - b[1]) * (a[1] - b[1]);
}

export function v2div(out, a, b) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  return out;
}

export function v2floor(out, a) {
  out[0] = floor(a[0]);
  out[1] = floor(a[1]);
  return out;
}

export function v2lengthSq(a) {
  return a[0]*a[0] + a[1]*a[1];
}

export function v2lerp(out, t, a, b) {
  let it = 1 - t;
  out[0] = it * a[0] + t * b[0];
  out[1] = it * a[1] + t * b[1];
  return out;
}

export function v2mul(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  return out;
}

export function v2normalize(out, a) {
  let len = a[0]*a[0] + a[1]*a[1];
  if (len > 0) {
    len = 1 / sqrt(len);
    out[0] = a[0] * len;
    out[1] = a[1] * len;
  }
  return out;
}

export function v2same(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

export function v2scale(out, a, s) {
  out[0] = a[0] * s;
  out[1] = a[1] * s;
  return out;
}

export function v2set(out, a, b) {
  out[0] = a;
  out[1] = b;
  return out;
}

export function v2sub(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  return out;
}

export function v3add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}

export function v3iAdd(a, b) {
  a[0] += b[0];
  a[1] += b[1];
  a[2] += b[2];
  return a;
}

export function v3addScale(out, a, b, s) {
  out[0] = a[0] + b[0] * s;
  out[1] = a[1] + b[1] * s;
  out[2] = a[2] + b[2] * s;
  return out;
}

export function v3copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}

export function v3cross(out, a, b) {
  let a0 = a[0];
  let a1 = a[1];
  let a2 = a[2];
  let b0 = b[0];
  let b1 = b[1];
  let b2 = b[2];
  out[0] = ((a1 * b2) - (a2 * b1));
  out[1] = ((a2 * b0) - (a0 * b2));
  out[2] = ((a0 * b1) - (a1 * b0));
  return out;
}

// determinant of the matrix made by (columns?) [a, b, c];
export function v3determinant(a, b, c) {
  // let a00 = a[0];
  // let a01 = a[1];
  // let a02 = a[2];
  // let a10 = b[0];
  // let a11 = b[1];
  // let a12 = b[2];
  // let a20 = c[0];
  // let a21 = c[2];
  // let a22 = c[2];
  let a00 = a[0];
  let a01 = b[0];
  let a02 = c[0];
  let a10 = a[1];
  let a11 = b[1];
  let a12 = c[1];
  let a20 = a[2];
  let a21 = b[2];
  let a22 = c[2];

  return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
}

export function v3dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function v3distSq(a, b) {
  return (a[0] - b[0]) * (a[0] - b[0]) +
    (a[1] - b[1]) * (a[1] - b[1]) +
    (a[2] - b[2]) * (a[2] - b[2]);
}

export function v3dist(a,b) {
  return sqrt(v3distSq(a,b));
}

export function v3div(out, a, b) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  out[2] = a[2] / b[2];
  return out;
}

export function v3iFloor(a) {
  a[0] = floor(a[0]);
  a[1] = floor(a[1]);
  a[2] = floor(a[2]);
  return a;
}

export function v3floor(out, a) {
  out[0] = floor(a[0]);
  out[1] = floor(a[1]);
  out[2] = floor(a[2]);
  return out;
}

export function v3lengthSq(a) {
  return a[0]*a[0] + a[1]*a[1] + a[2]*a[2];
}

export function v3lerp(out, t, a, b) {
  let it = 1 - t;
  out[0] = it * a[0] + t * b[0];
  out[1] = it * a[1] + t * b[1];
  out[2] = it * a[2] + t * b[2];
  return out;
}

export function v3iMax(a, b) {
  a[0] = max(a[0], b[0]);
  a[1] = max(a[1], b[1]);
  a[2] = max(a[2], b[2]);
  return a;
}

export function v3iMin(a, b) {
  a[0] = min(a[0], b[0]);
  a[1] = min(a[1], b[1]);
  a[2] = min(a[2], b[2]);
  return a;
}

export function v3mul(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  return out;
}

export function v3mulMat4(out, a, m) {
  let x = a[0];
  let y = a[1];
  let z = a[2];
  out[0] = x * m[0] + y * m[4] + z * m[8];
  out[1] = x * m[1] + y * m[5] + z * m[9];
  out[2] = x * m[2] + y * m[6] + z * m[10];
  return out;
}

export function v3normalize(out, a) {
  let len = a[0]*a[0] + a[1]*a[1] + a[2]*a[2];
  if (len > 0) {
    len = 1 / sqrt(len);
    out[0] = a[0] * len;
    out[1] = a[1] * len;
    out[2] = a[2] * len;
  }
  return out;
}

export function v3iNormalize(a) {
  let len = a[0]*a[0] + a[1]*a[1] + a[2]*a[2];
  if (len > 0) {
    len = 1 / sqrt(len);
    a[0] *= len;
    a[1] *= len;
    a[2] *= len;
  }
  return a;
}

// Treats `a` as vec3 input with w assumed to be 1
// out[0]/[1] have had perspective divide and converted to normalized 0-1 range
// out[2] is distance
export function v3perspectiveProject(out, a, m) {
  let x = a[0];
  let y = a[1];
  let z = a[2];
  let w = m[3] * x + m[7] * y + m[11] * z + m[15];
  let invw = 0.5 / (w || 0.00001);
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) * invw + 0.5;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) * -invw + 0.5;
  out[2] = m[2] * x + m[6] * y + m[10] * z + m[14];
  return out;
}

export function v3round(out, a) {
  out[0] = round(a[0]);
  out[1] = round(a[1]);
  out[2] = round(a[2]);
  return out;
}

export function v3same(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

export function v3scale(out, a, s) {
  out[0] = a[0] * s;
  out[1] = a[1] * s;
  out[2] = a[2] * s;
  return out;
}

export function v3set(out, a, b, c) {
  out[0] = a;
  out[1] = b;
  out[2] = c;
  return out;
}

export function v3sub(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}

export function v3iScale(a, s) {
  a[0] *= s;
  a[1] *= s;
  a[2] *= s;
  return a;
}

export function v3iSub(a, b) {
  a[0] -= b[0];
  a[1] -= b[1];
  a[2] -= b[2];
  return a;
}

export function v3zero(out) {
  out[0] = out[1] = out[2] = 0;
  return out;
}

export function v4add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  return out;
}

export function v4clone(a) {
  return a.slice(0);
}

export function v4copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}

export function v4lerp(out, t, a, b) {
  let it = 1 - t;
  out[0] = it * a[0] + t * b[0];
  out[1] = it * a[1] + t * b[1];
  out[2] = it * a[2] + t * b[2];
  out[3] = it * a[3] + t * b[3];
  return out;
}

export function v4mul(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  out[3] = a[3] * b[3];
  return out;
}

export function v4mulAdd(out, a, b, c) {
  out[0] = a[0] * b[0] + c[0];
  out[1] = a[1] * b[1] + c[1];
  out[2] = a[2] * b[2] + c[2];
  out[3] = a[3] * b[3] + c[3];
  return out;
}

export function v4same(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

export function v4scale(out, a, s) {
  out[0] = a[0] * s;
  out[1] = a[1] * s;
  out[2] = a[2] * s;
  out[3] = a[3] * s;
  return out;
}

export function v4set(out, a, b, c, d) {
  out[0] = a;
  out[1] = b;
  out[2] = c;
  out[3] = d;
  return out;
}

export function v4zero(out) {
  out[0] = out[1] = out[2] = out[3] = 0;
  return out;
}
