const assert = require('assert');
const { filewatchOn, filewatchTriggerChange } = require('./filewatch.js');
const urlhash = require('./urlhash.js');

let fs = window.glov_webfs = window.glov_webfs || {};
let decoded = {};
let used = {};
// export function webFSReady() {
//   // TODO: async ready state?
// }

function decode(data) {
  let len = data[0];
  let str = data[1];
  let u8 = new Uint8Array(len);
  let idxo = 0;
  let idxi = 0;
  while (idxo < len) {
    let byte = str.charCodeAt(idxi++);
    if (byte === 126) {
      byte = 0;
    } else if (byte === 27) {
      byte = str.charCodeAt(idxi++);
    }
    u8[idxo++] = byte;
  }
  assert.equal(idxi, str.length);
  assert.equal(idxo, len);
  return u8;
}

export function webFSGetFile(filename, encoding) {
  let ret = decoded[filename];
  if (ret) {
    return ret;
  }
  used[filename] = true;
  let data = fs[filename];
  assert(data, `Error loading file: ${filename}`);
  if (encoding === 'text') {
    ret = data[1];
  } else {
    ret = decode(data);
  }
  decoded[filename] = ret;
  return ret;
}

export function webFSExists(filename) {
  return Boolean(fs[filename]);
}

// Don't report on files we know are loaded dynamically, and are small
const report_ignore_regex = /\.(fp|vp|vm)$/;
export function webFSReportUnused() {
  let tot_size = 0;
  for (let filename in fs) {
    if (!used[filename] && !filename.match(report_ignore_regex)) {
      console.warn(`WebFS file bundled but unreferenced: ${filename}`);
      tot_size += fs[filename][0];
    }
  }
  if (tot_size) {
    console.warn(`WebFS wasting ${tot_size} bytes`);
  }
}

function webFSReload() {
  window.glov_webfs = {};
  let scriptTag = document.createElement('script');
  scriptTag.src = `${urlhash.getURLBase()}fsdata.js?rl=${Date.now()}`;
  scriptTag.onload = function () {
    if (window.glov_webfs) {
      let old_fs = fs;
      fs = window.glov_webfs;
      decoded = {};
      used = {};
      for (let key in fs) {
        let old_value = old_fs[key];
        let new_value = fs[key];
        for (let ii = 0; ii < new_value.length; ++ii) {
          if (!old_value || new_value[ii] !== old_value[ii]) {
            filewatchTriggerChange(key);
            break;
          }
        }
      }
    }
  };
  document.getElementsByTagName('head')[0].appendChild(scriptTag);
}

filewatchOn('fsdata.js', webFSReload);
