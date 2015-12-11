// From https://github.com/dg-jacquard/gulp-json5 (latest version, with bugfixes; What's in NPM is old and buggy)
// MIT licensed
var path = require('path');
var gutil = require('gulp-util');
var map = require('map-stream');
var JSON5 = require('json5');

var PluginError = gutil.PluginError;

const PLUGIN_NAME = 'gulp-json5';

module.exports = function(options) {

  options = typeof options !== 'object' ? {} : options;
  options.beautify = options.hasOwnProperty('beautify') ? !!options.beautify : true;

  function parseJSON5(file, callback) {
    var obj = {};
    if (!file.isNull()) {
      try {
        obj = JSON5.parse(file.contents + '');
      } catch (err) {
        throw new PluginError(PLUGIN_NAME, "JSON5 parser error", err);
      }
    }
    file.contents = Buffer.from(JSON.stringify(obj, null, options['beautify'] ? 2 : null));
    file.path = file.path.replace(/\.json5$/, '.json');
    callback(null, file);
  }

  return map(parseJSON5);

}
