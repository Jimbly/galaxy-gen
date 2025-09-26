/* globals localStorage */
import type { DataObject, TSMap } from 'glov/common/types';

let asset_mappings = typeof window === 'undefined' ?
  {} :
  (window as unknown as DataObject).glov_asset_mappings as TSMap<string>;
let asset_dir = asset_mappings && asset_mappings.asset_dir || '';

// Raw LocalStorage access, not using the module, since this is imported
//   _before_ we've had a chance to set our local storage key.
let lsd = (function (): Partial<Record<string, string>> {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    return localStorage;
  } catch (e) {
    return {};
  }
}());

const DISABLED_KEY = 'asset_hashing_disabled_until';
if (Number(lsd[DISABLED_KEY]) > Date.now()) {
  console.log('Disabling asset mappings due to auto-reload.');
  asset_mappings = {};
}

let proxy_path: string = '';
// e.g. `.proxy/`
export function locateAssetSetProxyPath(proxy_path_in: string): void {
  proxy_path = proxy_path_in;
}

let host_mappings: [string, string][] = [];
export function locateAssetAddHostMapping(src: string, dest: string): void {
  host_mappings.push([src, dest]);

}

export function locateAsset(name: string): string {
  if (!asset_mappings) {
    // shouldn't happen, but this should be safe as a fallback
    return name;
  }
  let m = asset_mappings[name];
  if (!m) {
    if (name.includes('://')) {
      // external/full path
      for (let ii = 0; ii < host_mappings.length; ++ii) {
        let pair = host_mappings[ii];
        if (name.startsWith(pair[0])) {
          name = pair[1] + name.slice(pair[0].length);
        }
      }
    } else {
      // internal/relative path
      if (proxy_path) {
        return `${proxy_path}${name}`;
      }
    }
    return name;
  }
  let ret = `${asset_dir}/${m}`;
  let idx = name.lastIndexOf('.');
  if (idx !== -1) {
    ret += name.slice(idx);
  }
  if (proxy_path) {
    ret = `${proxy_path}${ret}`;
  }
  return ret;
}

// Called in development before doing any reloads (as we don't reload asset_mappings)
export function locateAssetDisableHashing(): void {
  asset_mappings = {};
  // Also, if a reload is triggered after this, disable asset hashing in that
  //   session, as the reload happens _before_ the new assets.js is written out.
  lsd[DISABLED_KEY] = String(Date.now() + 5000);
}

export function unlocatePaths(s: string | null | undefined): string {
  let reverse_lookup = Object.create(null);
  for (let key in asset_mappings) {
    reverse_lookup[asset_mappings[key]!] = key;
  }
  return String(s).replace(new RegExp(`${asset_dir}/([a-zA-Z0-9]+)\\.\\w+`, 'g'), function (match, hash) {
    let m = reverse_lookup[hash];
    return m || match;
  });
}
