// Portions Copyright 2020 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

const fs = require('fs');
const path = require('path');

const FILE_CHANGE_POLL = 16;
const FILE_CHANGE_STABLE = 150;

function waitForAccess(filename, cb) {
  // Really this should just use _sopen_s() w/ _SH_DENYRW, but that seems totally inaccessible from Node :(
  let first = true;
  let last_stats;
  let last_change = Date.now();
  let err_count = 0;
  function check() {
    fs.stat(filename, function (err, stats) {
      let now = Date.now();
      if (err) {
        ++err_count;
        if (err_count > 50) {
          // give up
          console.error(`Too many errors waiting for ${filename} to finish writing, giving up`);
          return void cb();
        }
      } else {
        err_count = 0;
      }
      let unchanged = false;
      if (!first) {
        unchanged = last_stats && stats &&
          last_stats.mtime.getTime() === stats.mtime.getTime() &&
          last_stats.size === stats.size;
        if (unchanged && now - last_change > FILE_CHANGE_STABLE) {
          return void cb();
        }
      }
      first = false;
      last_stats = stats;
      if (!unchanged) {
        last_change = now;
      }
      // Two timeouts, ensure main loop gets to tick
      setTimeout(function () {
        setTimeout(check, FILE_CHANGE_POLL);
      }, FILE_CHANGE_POLL);
    });
  }
  setTimeout(check, FILE_CHANGE_POLL);
}

module.exports = function watch(root, filter, callback) {
  let deferred_file_changes = {};

  fs.watch(root, { recursive: true }, function (eventType, filename) {
    // TODO: if we get a `null` here, we might need to scan the folder and check
    //   for any files matching the filter with modification times newer than we
    //   expect
    if (!filename || !filename.match(filter)) {
      return;
    }
    if (deferred_file_changes[filename]) {
      // console.log(`File changed: ${filename} (already waiting)`);
    } else {
      // console.log(`File changed: ${filename} (starting waiting)`);
      deferred_file_changes[filename] = true;
      let fuller_path = path.join(root, filename);
      waitForAccess(fuller_path, function () {
        delete deferred_file_changes[filename];
        callback(fuller_path);
      });
    }
  });
};

module.exports.waitForAccess = waitForAccess;
