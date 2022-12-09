const assert = require('assert');
const { PNG } = require('pngjs');

// const PNG_GRAYSCALE = 0;
const PNG_RGB = 2;
const PNG_RGBA = 6;

// Returns { err, img: { width, height, data } }
function pngRead(file_contents) {
  let img;
  try {
    img = PNG.sync.read(file_contents);
  } catch (e) {
    if (e.toString().indexOf('at end of stream') !== -1) {
      // Chrome stated adding an extra 0?!
      let extra = 0;
      while (file_contents[file_contents.length - 1 - extra] === 0) {
        ++extra;
      }
      try {
        img = PNG.sync.read(file_contents.slice(0, -extra));
      } catch (e2) {
        return { err: e2 };
      }
    } else {
      return { err: e };
    }
  }
  let { width, height, data } = img;
  assert.equal(width * height * 4, data.length);
  return { img };
}
exports.pngRead = pngRead;


function pngAlloc({ width, height, byte_depth }) {
  let colorType = byte_depth === 3 ? PNG_RGB : PNG_RGBA;
  let ret = new PNG({ width, height, colorType });
  let num_bytes = width * height * 4;
  assert.equal(ret.data.length, num_bytes);
  return ret;
}
exports.pngAlloc = pngAlloc;

// img is from pngAlloc or pngRead
function pngWrite(img) {
  return PNG.sync.write(img);
}
exports.pngWrite = pngWrite;
