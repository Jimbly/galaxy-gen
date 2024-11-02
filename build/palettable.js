const gb = require('glov-build');
const {
  pngRead,
  pngWrite,
} = require('./png.js');

const REPLACEMENTS = [
  //aabbggrr
  0xFF0020FF, // 0.125 = 32
  0xFF0060FF, // 0.375 = 96
  0xFF009FFF, // 0.625 = 159
  0xFF00DFFF, // 0.875 = 223
];

module.exports = function (params_file) {

  function palettable(job, done) {
    let file = job.getFile();
    let { err, img } = pngRead(file.contents);
    if (err) {
      job.error(err);
      return void done();
    }
    let { width, height, data } = img;
    let data32 = new Uint32Array(data.buffer);

    let colors = [
      data32[0],
      data32[width],
      data32[width*2],
      data32[width*3],
    ];

    for (let yy = 0, idx = 0; yy < height; ++yy) {
      for (let xx = 0; xx < width; ++xx, ++idx) {
        let c = data32[idx];
        let changed = false;
        if (colors[0]) {
          for (let ii = 0; ii < colors.length; ++ii) {
            if (c === colors[ii]) {
              data32[idx] = REPLACEMENTS[ii];
              changed = true;
            }
          }
        }
        if (!changed && (c & 0xFF) === 0xFF) {
          data32[idx] = c & ~1;
        }
      }
    }

    job.out({
      relative: file.relative,
      contents: pngWrite(img),
    });

    done();
  }

  return {
    type: gb.SINGLE,
    func: palettable,
    version: [
      REPLACEMENTS,
    ],
  };
};
