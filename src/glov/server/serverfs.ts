import assert from 'assert';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import type { DataObject } from 'glov/common/types';

const FS_BASEPATH = '../../client/';

export function serverFSGetFileNames(directory: string): string[] {
  let ret = readdirSync(path.join(__dirname, FS_BASEPATH, directory));
  ret = ret.filter((filename) => (!filename.endsWith('.br') && !filename.endsWith('.gz')));
  ret = ret.map((filename) => `${directory}/${filename}`);
  return ret;
}

type ServerFSEntry = DataObject | Buffer;
let serverfs_cache: Partial<Record<string, ServerFSEntry>> = {};

export function serverFSGetFile<T extends ServerFSEntry>(filename: string, encoding?: string): T {
  let cached = serverfs_cache[filename];
  if (cached) {
    return cached as T;
  }
  let data = readFileSync(path.join(__dirname, FS_BASEPATH, filename));
  assert(data, `Error loading file: ${filename}`);
  let ret;
  if (encoding === 'jsobj') {
    ret = JSON.parse(data.toString());
  } else {
    ret = data;
  }
  serverfs_cache[filename] = ret;
  return ret;
}

export function serverFSdeleteCached(filename: string): void {
  delete serverfs_cache[filename];
}
