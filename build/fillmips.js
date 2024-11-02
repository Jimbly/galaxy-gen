const gb = require('glov-build');
const {
  pngRead,
  pngAlloc,
  pngWrite,
} = require('./png.js');

module.exports = function (params_file) {

  function fillmips(job, done) {
    let files = job.getFiles();
    let file_data = {};
    let bases = [];
    for (let ii = 0; ii < files.length; ++ii) {
      let file = files[ii];
      let fn = file.relative;
      file_data[fn] = file;
      if (fn.endsWith('-l1.png') || fn.endsWith('-l2.png')) {
        // hand-drawn lods
      } else {
        bases.push(fn);
      }
      // pass through all source files
      job.out(file);
    }

    let png_cache = {};
    function genLOD(target, source_name) {
      let source = file_data[source_name];
      if (!source) {
        // must have had earlier error
        return;
      }
      let img = png_cache[source_name];
      if (!img) {
        let err;
        ({ err, img } = pngRead(source.contents));
        if (err) {
          job.error(`Error reading ${source_name}: ${err}`);
          return;
        }
        png_cache[source_name] = img;
      }

      let { width, height, data } = img;
      data = new Uint32Array(data.buffer);
      width /= 2;
      height /= 2;

      let dest = pngAlloc({ width, height, byte_depth: 4 });
      png_cache[target] = dest;
      let outdata = new Uint32Array(dest.data.buffer);
      for (let yy = 0, idx=0; yy < height; ++yy) {
        for (let xx = 0; xx < width; ++xx, ++idx) {
          // majority, else nearest neighbor
          let v0 = data[yy*2*width*2 + xx*2];
          let v1 = data[(yy*2+1)*width*2 + xx*2];
          let v2 = data[yy*2*width*2 + xx*2+1];
          let v3 = data[(yy*2+1)*width*2 + xx*2+1];
          let vo = v0;
          if (v0 === v1 && v1 === v2 ||
            v0 === v1 && v1 === v3 ||
            v0 === v2 && v2 === v3
          ) { // 3 same
            vo = v0;
          } else if (v1 === v2 && v2 === v3) { // 3 same
            vo = v1;
          } else if (
            v0 === v1 && v2 !== v3 ||
            v1 === v2 && v0 !== v3
          ) { // 2 same, 2 diff
            vo = v1;
          } else if (v2 === v3 && v0 !== v1) { // 2 same, 2 diff
            vo = v2;
          }
          outdata[idx] = vo;
        }
      }

      // copy palette stamp
      outdata[0] = data[0];
      outdata[width] = data[width*2];
      outdata[width*2] = data[width*2*2];
      outdata[width*3] = data[width*2*3];

      let out = {
        relative: target,
        contents: pngWrite(dest),
      };
      job.out(out);
      file_data[target] = out;
    }

    // generate missing lods
    for (let ii = 0; ii < bases.length; ++ii) {
      let base_name = bases[ii];
      let l1name = base_name.replace('.png', '-l1.png');
      let l2name = base_name.replace('.png', '-l2.png');
      if (!file_data[l1name]) {
        genLOD(l1name, base_name);
      }
      if (!file_data[l2name]) {
        genLOD(l2name, l1name);
      }
    }

    done();
  }

  return {
    type: gb.ALL,
    func: fillmips,
  };
};
