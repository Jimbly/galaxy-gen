const assert = require('assert');
const gb = require('glov-build');
const micromatch = require('micromatch');
const { pngRead, pngWrite } = require('./png.js');

const { abs, floor, round } = Math;

// Photoshop writes pixels with 0 alpha but a bright white color, which causes
// interpolation errors - instead spread the nearest non-alpha color.
// In this extended version, continue spreading until all alpha pixels are full

function gbif(globs, fn) {
  return function (job, done) {
    let file = job.getFile();
    if (micromatch(file.relative, globs).length) {
      fn(job, done);
    } else {
      job.out(file);
      done();
    }
  };
}

module.exports = function (globs) {
  function imgproc(job, done) {
    let file = job.getFile();
    let { err, img: pngin } = pngRead(file.contents);
    if (err) {
      return void done(err);
    }
    let { width, height, data } = pngin;
    assert.equal(width * height * 4, data.length);
    let dim = width * height;
    let is_solid = new Uint8Array(dim);
    let queued = new Uint8Array(dim);
    let todo_buf = new Uint32Array(dim);
    let todo_start = 0;
    let todo_end = 0;
    function addNeighbors(idx) {
      let x = idx % width;
      if (x > 0 && !queued[idx - 1]) {
        todo_buf[todo_end++] = idx - 1;
        queued[idx - 1] = 1;
      }
      if (x + 1 < width && !queued[idx + 1]) {
        todo_buf[todo_end++] = idx + 1;
        queued[idx + 1] = 1;
      }
      if (idx > width && !queued[idx - width]) {
        todo_buf[todo_end++] = idx - width;
        queued[idx - width] = 1;
      }
      if (idx + width < dim && !queued[idx + width]) {
        todo_buf[todo_end++] = idx + width;
        queued[idx + width] = 1;
      }
    }
    for (let idx = 0; idx < dim; ++idx) {
      if (data[idx*4 + 3]) {
        queued[idx] = 1;
        is_solid[idx] = 1;
        addNeighbors(idx);
      }
    }
    if (!todo_end) {
      job.out(file);
      return void done();
    }
    let diff = false;
    let solid_mark = [];
    let loop_end = todo_end;
    while (todo_start < todo_end) {
      if (todo_start === loop_end) {
        for (let ii = 0; ii < solid_mark.length; ++ii) {
          is_solid[solid_mark[ii]] = 1;
        }
        solid_mark.length = 0;
        loop_end = todo_end;
      }
      let idx = todo_buf[todo_start++];
      if (is_solid[idx]) {
        continue;
      }
      let y = floor(idx / width);
      let x = idx - y * width;
      let c = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      if (x > 0 && is_solid[idx - 1]) {
        r += data[idx*4-4];
        g += data[idx*4-3];
        b += data[idx*4-2];
        c++;
      }
      if (x < width-1 && is_solid[idx + 1]) {
        r += data[idx*4+4];
        g += data[idx*4+5];
        b += data[idx*4+6];
        c++;
      }
      if (y > 0 && is_solid[idx - width]) {
        r += data[(idx-width)*4];
        g += data[(idx-width)*4+1];
        b += data[(idx-width)*4+2];
        c++;
      }
      if (y < height-1 && is_solid[idx + width]) {
        r += data[(idx+width)*4];
        g += data[(idx+width)*4+1];
        b += data[(idx+width)*4+2];
        c++;
      }
      assert(c);
      r = round(r/c);
      g = round(g/c);
      b = round(b/c);
      diff ||= data[idx*4] !== r;
      diff ||= data[idx*4+1] !== g;
      diff ||= data[idx*4+2] !== b;
      data[idx*4] = r;
      data[idx*4+1] = g;
      data[idx*4+2] = b;
      addNeighbors(idx);
      solid_mark.push(idx);
    }

    let buffer = pngWrite(pngin);
    if (!diff && buffer.length > file.contents.length) {
      // No change, and output is larger, output original
      job.out(file);
    } else {
      job.out({
        relative: file.relative,
        contents: buffer,
      });
    }
    done();
  }
  return {
    type: gb.SINGLE,
    func: gbif(globs, imgproc),
    version: [
      globs,
      imgproc,
    ],
  };
};
