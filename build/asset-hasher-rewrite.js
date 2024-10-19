const assert = require('assert');
const path = require('path');
const gb = require('glov-build');
const { forwardSlashes } = gb;

function copy(job, done) {
  job.out(job.getFile());
  done();
}

function parseAssetsJS(job, s) {
  try {
    let m = s.match(/mappings = (\{[^;]*\});/);
    if (!m) {
      return null;
    }
    return JSON.parse(m[1]);
  } catch (e) {
    job.error(e);
  }
  return null;
}

function assetHasherRewriteInternal(job, out_base, asset_prefix, file, mappings) {
  let buffer = file.contents;
  let text = buffer.toString('utf8');

  let dirname = forwardSlashes(path.dirname(path.relative(out_base, file.relative))); // e.g. '' or 'tools'

  text = text.replace(/"([-a-zA-Z0-9._/]+)"/g, function (full, match) {
    let new_name = mappings[match];
    let use_prefix = asset_prefix;
    if (!new_name) {
      // Look for a relative path if we happen to not be at the root, and adjust for that
      match = forwardSlashes(path.join(dirname, match)); // e.g. 'tools/foo.html'
      new_name = mappings[match]; // e.g. 'tools/bundle.js'
      if (new_name) {
        use_prefix = forwardSlashes(path.relative(path.dirname(match), `${asset_prefix}`)); // e.g. ../a
        if (!use_prefix.endsWith('/')) {
          use_prefix += '/';
        }
      }
    }
    if (new_name) {
      let idx = match.lastIndexOf('.');
      if (idx !== -1 && !match.endsWith('.')) {
        new_name += match.slice(idx);
      }
      return `"${use_prefix}${new_name}"`;
    } else {
      if (match.match(/\.\w+$/) && !match.match(/^\d+\.\d+$/)) {
        // Warn on this, it's probably just something missing from asset_hashed_files
        // Fine to remove this if there are exceptions, though, mostly useful during boostrapping hashing
        job.warn(`References unhashed filename "${match}"`);
      }
      return full;
    }
  });
  return text;
}

function assetHasherLoadMappings(hash_dep, out_base, job, next) {
  job.depAdd(`${hash_dep}:${out_base}assets.js`, function (err, assets_file) {
    if (err) {
      return void next(err);
    }

    let mappings = parseAssetsJS(job, assets_file.contents.toString('utf8'));
    if (!mappings) {
      return void next('Could not parse assets.js');
    }

    next(null, mappings);
  });
}

module.exports = function (opts) {
  assert(opts);
  if (!opts.enabled) {
    return {
      type: gb.SINGLE,
      func: copy,
    };
  }
  let { hash_dep } = opts;
  assert(hash_dep);
  const out_base = opts.out_base || 'client/';
  function assetHasherRewrite(job, done) {
    assetHasherLoadMappings(hash_dep, out_base, job, function (err, mappings) {
      if (err) {
        return void done(err);
      }

      let { asset_dir } = mappings;
      assert(asset_dir);

      let file = job.getFile();
      let text = assetHasherRewriteInternal(job, out_base, `${asset_dir}/`, file, mappings);

      job.out({
        relative: file.relative,
        contents: text,
      });
      done();
    });
  }
  return {
    type: gb.SINGLE,
    func: assetHasherRewrite,
    version: [
      assetHasherRewriteInternal,
      assetHasherLoadMappings,
      parseAssetsJS,
      module.exports,
    ],
    deps: [hash_dep],
  };
};
module.exports.assetHasherRewriteInternal = assetHasherRewriteInternal;
module.exports.assetHasherLoadMappings = assetHasherLoadMappings;
