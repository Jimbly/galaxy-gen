/* eslint no-invalid-this:off */
const log = require('fancy-log');
const through = require('through2');

// patterns = { 'No eval': /\beval\b/ }
module.exports = function (task_name) {
  return through.obj(function transform(file, encoding, callback) {
    if (file.isDirectory()) {
      return void callback();
    }
    log(`${task_name}: ${file.relative}`);
    callback(null, file);
  });
};
