// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT
/* globals localStorage */

import assert from 'assert';

let storage_prefix = 'demo';

let is_set = false;
export function setStoragePrefix(prefix: string): void {
  if (is_set) {
    return;
  }
  is_set = true;
  storage_prefix = prefix;
}
export function getStoragePrefix(): string {
  assert(is_set);
  return storage_prefix;
}

export type StorageStore = {
  test(key: string): boolean;
  get(key: string): string | undefined;
  set(key: string, value: undefined | string): void;
};
let external_store: StorageStore | null = null;
export function localStorageAddExternalStore(store: StorageStore): void {
  external_store = store;
}

let lsd = (function () {
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    return localStorage;
  } catch (e) {
    return null; // Use lsd_overlay only instead
  }
}());

// Overlay to use if we lose access to localStorage at run-time (Firefox "quota exceeded" error)
let lsd_overlay: Partial<Record<string, string>> = {};

export function localStorageGet(key: string): string | undefined {
  assert(is_set);
  let ret: string | null | undefined;
  if (external_store && external_store.test(key)) {
    ret = external_store.get(key);
  } else {
    key = `${storage_prefix}_${key}`;
    ret = lsd_overlay[key] || (lsd && lsd.getItem(key));
  }
  if (ret === 'undefined') {
    ret = undefined;
  } else if (ret === null) {
    ret = undefined;
  }
  return ret;
}

export function localStorageSet(key: string, value: string | null | undefined): void {
  assert(is_set);
  if (value === null) {
    value = undefined;
  }
  let full_key = `${storage_prefix}_${key}`;
  let unchanged = false;
  let str: string;
  if (value === undefined) {
    delete lsd_overlay[full_key];
  } else {
    str = String(value);
    if (lsd_overlay[full_key] === str) {
      unchanged = true;
    } else {
      lsd_overlay[full_key] = str;
    }
  }

  if (external_store && external_store.test(key)) {
    if (!unchanged) {
      external_store.set(key, value);
    }
    return;
  }
  if (value === undefined) {
    if (lsd) {
      lsd.removeItem(full_key);
    }
    delete lsd_overlay[full_key];
  } else {
    if (!unchanged) {
      try {
        if (lsd) {
          lsd.setItem(full_key, str!);
        }
      } catch (e) {
        // ignored, it's in the overlay for the current session at least
        // FireFox throws "The quota has been exceeded" errors here
      }
    }
  }
}

export function localStorageSetJSON<T = unknown>(key: string, value: T): void {
  localStorageSet(key, JSON.stringify(value));
}

export function localStorageGetJSON<T = unknown>(key: string, def: T): T;
export function localStorageGetJSON<T = unknown>(key: string, def?: T): T | undefined;
export function localStorageGetJSON<T = unknown>(key: string, def?: T): T | undefined {
  let value = localStorageGet(key);
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

export function localStorageClearAll(key_prefix?: string): void {
  let prefix = new RegExp(`^${storage_prefix}_${key_prefix || ''}`, 'u');
  if (lsd) {
    let keys_to_remove = [];
    for (let i = 0; i < lsd.length; i++) {
      let key = lsd.key(i);
      assert(key);
      if (key.match(prefix)) {
        keys_to_remove.push(key);
      }
    }
    for (let i = 0; i < keys_to_remove.length; i++) {
      lsd.removeItem(keys_to_remove[i]);
    }
  }
  for (let key in lsd_overlay) {
    if (key.match(prefix)) {
      delete lsd_overlay[key];
    }
  }
}

export type LocalStorageData = Partial<Record<string, string>>;

export function localStorageExportAll(filter_prefix: string): LocalStorageData {
  let obj: LocalStorageData = {};
  let prefix = new RegExp(`^${storage_prefix}_(${filter_prefix || ''}.*)`);
  if (lsd) {
    for (let i = 0; i < lsd.length; i++) {
      let key = lsd.key(i);
      assert(key);
      let m = key.match(prefix);
      if (m) {
        let v = lsd.getItem(key);
        if (v && v !== 'undefined') {
          obj[m[1]] = v;
        }
      }
    }
  }
  for (let key in lsd_overlay) {
    let m = key.match(prefix);
    if (m) {
      obj[m[1]] = lsd_overlay[key];
    }
  }
  return obj;
}

export function localStorageImportAll(serialized: LocalStorageData): void {
  localStorageClearAll();
  for (let key in serialized) {
    localStorageSet(key, serialized[key]);
  }
}

// Old API exports
exports.get = localStorageGet;
exports.set = localStorageSet;
exports.setJSON = localStorageSetJSON;
exports.getJSON = localStorageGetJSON;
exports.clearAll = localStorageClearAll;
