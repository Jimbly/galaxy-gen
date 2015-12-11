// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT
/* eslint-env browser */

exports.storage_prefix = 'demo';

let lsd = (function () {
  try {
    localStorage.test = 'test';
    return localStorage;
  } catch (e) {
    return {};
  }
}());
export function get(key) {
  key = `${exports.storage_prefix}_${key}`;
  let ret = lsd[key];
  if (ret === 'undefined') {
    ret = undefined;
  }
  return ret;
}

export function set(key, value) {
  key = `${exports.storage_prefix}_${key}`;
  if (value === undefined || value === null) {
    delete lsd[key];
  } else {
    lsd[key] = value;
  }
}

export function setJSON(key, value) {
  set(key, JSON.stringify(value));
}

export function getJSON(key, def) {
  let value = get(key);
  if (value === undefined) {
    return def;
  }
  try {
    return JSON.parse(value);
  } catch (e) {
    // ignore
  }
  return def;
}

export function clearAll(key_prefix) {
  let prefix = new RegExp(`^${exports.storage_prefix}_${key_prefix || ''}`, 'u');
  for (let key in lsd) {
    if (key.match(prefix)) {
      delete lsd[key];
    }
  }
}

export function exportAll() {
  let obj = {};
  let prefix = new RegExp(`^${exports.storage_prefix}_(.*)`, 'u');
  for (let key in lsd) {
    let m = key.match(prefix);
    if (m) {
      let v = lsd[key];
      if (v && v !== 'undefined') {
        obj[m[1]] = v;
      }
    }
  }
  return JSON.stringify(obj);
}

export function importAll(serialized) {
  let obj = JSON.parse(serialized);
  clearAll();
  for (let key in obj) {
    set(key, obj[key]);
  }
}
