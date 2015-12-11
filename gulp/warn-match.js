/* eslint no-invalid-this:off */
const assert = require('assert');
const chalk = require('chalk');
const log = require('fancy-log');
const through = require('through2');

// patterns = { 'No eval': /\beval\b/ }
module.exports = function (patterns) {
  assert.equal(typeof patterns, 'object');
  for (let key in patterns) {
    assert(patterns[key] instanceof RegExp || typeof patterns[key] === 'string');
  }
  return through.obj(function transform(file, encoding, callback) {
    if (file.isDirectory()) {
      return void callback();
    }
    assert(file.isBuffer());
    let data = file.contents.toString();
    for (let key in patterns) {
      if (data.match(patterns[key])) {
        log.warn(`${chalk.yellow('warning')} ${file.relative}: failed ${chalk.yellow(key)}`);
      }
    }

    // Pass file through
    this.push(file);
    callback();
  });
};
