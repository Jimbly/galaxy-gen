const assert = require('assert');
const gb = require('glov-build');

const SOURCEMAP_STRING = '//# sourceMappingURL=';
const SOURCEMAP_BUFFER = Buffer.from(SOURCEMAP_STRING);

module.exports = function sourcemapRemap(cb) {
  return {
    type: gb.SINGLE,
    func: function (job, done) {
      let file = job.getFile();
      let { relative, contents } = file;

      function proc(next) {
        if (!relative.endsWith('.js')) {
          return void next();
        }
        let idx = contents.lastIndexOf(SOURCEMAP_BUFFER);
        if (idx === -1) {
          return void next();
        }
        idx += SOURCEMAP_BUFFER.length;
        let str_len = contents.length - idx;
        assert(str_len < 1000); // something gone wrong?  Should be exactly one of these at the end of the buffer
        let rest = contents.toString('utf8', idx);
        let m = rest.match(/^([^\s]+\.map)/);
        assert(m);
        let filename = m[1];
        rest = rest.slice(filename.length);
        cb(job, filename, function (err, new_filename) {
          if (err) {
            return void next(err);
          }
          assert(new_filename);
          rest = `${new_filename}${rest}`;
          let newbuf = Buffer.alloc(idx + Buffer.byteLength(rest, 'utf8'));
          contents.copy(newbuf);
          newbuf.write(rest, idx, 'utf8');
          contents = newbuf;
          next();
        });
      }
      proc(function (err) {
        job.out({
          relative,
          contents,
        });
        done(err);
      });
    },
    version: [cb],
  };
};
