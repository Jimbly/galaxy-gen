/* eslint no-invalid-this:off */
const assert = require('assert');
const log = require('fancy-log');
const through = require('through2');
const Vinyl = require('vinyl');

const preamble = `(function () {
var fs = window.glov_webfs = window.glov_webfs || {};`;
const postamble = '}());';

let chars = (function () {
  const ESC = String.fromCharCode(27);
  let ret = [];
  for (let ii = 0; ii < 256; ++ii) {
    ret[ii] = String.fromCharCode(ii);
  }
  // ASCII text must encode directly
  // single-byte nulls
  ret[0] = String.fromCharCode(126);
  // escape our escape character and otherwise overlapped values
  ret[27] = `${ESC}${String.fromCharCode(27)}`;
  ret[126] = `${ESC}${String.fromCharCode(126)}`;
  // escape things not valid in Javascript strings
  ret[8] = '\\b';
  ret[9] = '\\t';
  ret[10] = '\\n';
  ret[11] = '\\v';
  ret[12] = '\\f';
  ret[13] = '\\r';
  ret['\''.charCodeAt(0)] = '\\\'';
  ret['\\'.charCodeAt(0)] = '\\\\';
  // All other characters are fine (though many get turned into 2-byte UTF-8 strings)
  return ret;
}());

function encodeString(buf) {
  let ret = [];
  for (let ii = 0; ii < buf.length; ++ii) {
    let c = buf[ii];
    ret.push(chars[c]);
  }
  return ret.join('');
}

module.exports = function () {
  let files = [];
  return through.obj(function transform(file, encoding, callback) {
    if (file.isDirectory()) {
      return void callback();
    }
    assert(file.isBuffer());
    let data = file.contents;
    let name = file.relative.replace(/\\/g, '/').replace('autogen/', '');
    files.push({ name, data });
    callback();
  }, function flush(cb) {
    if (!files.length) {
      return void cb();
    }
    log(`webfs(${files.length} files)`);
    let output = [preamble];
    for (let ii = 0; ii < files.length; ++ii) {
      let name = files[ii].name;
      let data = files[ii].data;
      output.push(`fs['${name}'] = [${data.length},'${encodeString(data)}'];`);
    }

    output.push(postamble);
    this.push(new Vinyl({
      // base: file.base,
      path: 'fsdata.js',
      contents: Buffer.from(output.join('\n')),
    }));
    cb();
  });
};
