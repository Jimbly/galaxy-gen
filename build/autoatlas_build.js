/* eslint max-len:off */

const assert = require('assert');
const gb = require('glov-build');
const { max } = Math;
const { pngAlloc, pngRead, pngWrite } = require('./png.js');

function nextHighestPowerOfTwo(x) {
  --x;
  for (let i = 1; i < 32; i <<= 1) {
    x |= x >> i;
  }
  return x + 1;
}

function cmpFileKeys(a, b) {
  return a.localeCompare(b, 'en', { numeric: true });
}

let did_error = false;
function parseRow(job, img, x0, y0, dx, dy) {
  let ws = [];
  let lastcoord = dx ? x0 : y0;
  let lastv = false;
  let { data, width, height } = img;
  assert.equal(data.length, width * height * 4);
  let xx = x0;
  let yy = y0;
  while (dx ? xx < width - 1 : yy < height - 1) {
    let idx = (xx + yy * width) * 4;
    let v;
    let a = data[idx + 3];
    if (!a) {
      // transparent
      v = false;
    } else {
      let r = data[idx];
      let g = data[idx + 1];
      let b = data[idx + 2];
      if (a === 255 && !r && !g && !b) {
        // black
        v = true;
      } else if (a === 255 && r === 255 && g === 255 && b === 255) {
        // white
        v = false;
      } else {
        if (!did_error) {
          job.error(`Error parsing 9-patch file "${img.source_name}": found a pixel other than black, white, or invisible at ${xx},${yy}`);
          did_error = true;
        }
      }
    }
    if (v !== lastv) {
      ws.push((dx ? xx : yy) - lastcoord);
      lastv = v;
      lastcoord = (dx ? xx : yy);
    }
    xx += dx;
    yy += dy;
  }
  ws.push((dx ? width : height) - 1 - lastcoord);
  return ws;
}


module.exports = function () {
  function imgproc(job, done) {
    // TODO: get these options from a yaml-based config file in each atlas folder
    const tile_horiz_regex = null;
    const clamp_regex = /./;
    let pad = 8; // opts.pad || 0;

    let files = job.getFiles();

    const max_tex_size = 1024;
    let atlases = {};
    // TODO: smart caching of unchanged atlases, only read and output the changed ones
    for (let ii = 0; ii < files.length; ++ii) {
      let img_file = files[ii];
      let { err, img } = pngRead(img_file.contents);
      if (err) {
        job.error(`Error reading ${img_file.relative}: ${err}`);
        return void done(err);
      }
      img.source_name = img_file.relative;
      let m = img_file.relative.match(/^(?:.*\/)?([^/]+)\/([^/]+)\.png$/);
      let atlas_name = m[1].toLowerCase();
      let img_name = m[2].toLowerCase();
      let do_9patch = img_name.endsWith('.9');
      if (do_9patch) {
        img_name = img_name.slice(0, -2);
      }
      m = img_name.match(/^(.*)_(\d+)$/);
      let idx = 0;
      if (m) {
        img_name = m[1];
        idx = Number(m[2]);
      }
      let atlas_data = atlases[atlas_name] = atlases[atlas_name] || { num_layers: 1, file_data: {} };
      atlas_data.num_layers = max(atlas_data.num_layers, idx + 1);
      let img_data = atlas_data.file_data[img_name] = atlas_data.file_data[img_name] || { imgs: [] };
      let ws = [img.width];
      let hs = [img.height];
      did_error = false;
      if (do_9patch) {
        ws = parseRow(job, img, 1, 0, 1, 0);
        hs = parseRow(job, img, 0, 1, 0, 1);
        if (idx === 0) {
          // currently unused, but can parse the padding values from the 9-patch as well
          img_data.padh = parseRow(job, img, 1, img.height - 1, 1, 0);
          img_data.padv = parseRow(job, img, img.width - 1, 1, 0, 1);
          if (img_data.padh.length === 1 && img_data.padv.length === 1) {
            delete img_data.padh;
            delete img_data.padv;
          }
        }
        let new_img = pngAlloc({ width: img.width - 2, height: img.height - 2, byte_depth: 4 });
        img.bitblt(new_img, 1, 1, img.width - 2, img.height - 2, 0, 0);
        img = new_img;
      }
      if (idx === 0) {
        img_data.ws = ws;
        img_data.hs = hs;
      }
      img.filename = img_file.relative;
      if (img_data.imgs[idx]) {
        job.error('Two atlas source files map to the same image:' +
          ` ${img.filename} and ${img_data.imgs[idx].filename}`);
      }
      img_data.imgs[idx] = img;
    }

    let atlas_keys = Object.keys(atlases);

    if (!atlas_keys.length) {
      // no error, just no atlases in this project, that's fine
      return void done();
    }

    function doAtlas(name) {
      let atlas_data = atlases[name];
      let { file_data } = atlas_data;

      let file_keys = Object.keys(file_data);
      file_keys.sort(cmpFileKeys);

      let runtime_data = {
        // name,
        tiles: [], // [name, x, y, ws, hs, padh, padv]
      };
      if (atlas_data.num_layers > 1) {
        runtime_data.layers = atlas_data.num_layers;
      }

      // Check input and pack output
      let maxx = 0;
      let maxy;
      {
        let x = 0;
        let y = 0;
        let row_height = 0;
        let any_error = false;
        for (let ii = 0; ii < file_keys.length; ++ii) {
          let img_name = file_keys[ii];
          let img_data = file_data[img_name];
          let { imgs } = img_data;
          let img0 = imgs[0];
          if (!img0) {
            any_error = true;
            job.error(`Image ${img_name} missing required base (_0) layer`);
            continue;
          }
          // Check all layers are the same size
          for (let idx = 1; idx < imgs.length; ++idx) {
            let img = imgs[idx];
            if (img) {
              if (img.width !== img0.width ||
                img.height !== img0.height
              ) {
                any_error = true;
                job.error(`Image ${img_name} layer ${idx} (${img.source_name}) resolution (${img.width}x${img.height})` +
                  ` does not match base layer (${img0.source_name}) resolution (${img0.width}x${img0.height})`);
              }
            }
          }
          // Pack into output
          if (x + img0.width + pad * 2 > max_tex_size) {
            x = 0;
            y += row_height;
            row_height = 0;
          }
          row_height = max(row_height, img0.height + pad * 2);
          img_data.x = x + pad;
          img_data.y = y + pad;
          x += img0.width + pad * 2;
          maxx = max(maxx, x);
        }
        y += row_height + pad * 2;
        maxy = y;
        if (any_error) {
          return;
        }
      }

      // Allocate actual images and copy into them
      let width = nextHighestPowerOfTwo(maxx);
      let height = nextHighestPowerOfTwo(maxy);
      let pngouts = [];
      for (let ii = 0; ii < atlas_data.num_layers; ++ii) {
        pngouts.push(pngAlloc({ width, height, byte_depth: 4 }));
      }
      runtime_data.w = width;
      runtime_data.h = height;

      for (let ii = 0; ii < file_keys.length; ++ii) {
        let img_name = file_keys[ii];
        let img_data = file_data[img_name];
        let { imgs, x, y, ws, hs, padh, padv } = img_data;
        let { width: imgw, height: imgh } = imgs[0];
        let tuple = [img_name, x, y, ws, hs];
        if (padh) {
          tuple.push(padh, padv);
        }
        runtime_data.tiles.push(tuple);

        for (let idx = 0; idx < imgs.length; ++idx) {
          let img = imgs[idx];
          if (!img) {
            continue;
          }
          let { data: outdata } = pngouts[idx];
          let { data: indata } = img;
          let clamp = clamp_regex && clamp_regex.test(img_name);
          let clamp_vert = clamp || tile_horiz_regex && tile_horiz_regex.test(img_name);
          let clamp_horiz = clamp;
          for (let yy = -pad; yy < imgh + pad; ++yy) {
            let yyy;
            if (clamp_vert) {
              yyy = yy < 0 ? 0 : yy >= imgh ? imgh - 1 : yy;
            } else {
              yyy = (yy + imgh) % imgh;
            }
            for (let xx = -pad; xx < imgw + pad; ++xx) {
              let xxx;
              if (clamp_horiz) {
                xxx = xx < 0 ? 0 : xx >= imgw ? imgh - 1 : xx;
              } else {
                xxx = (xx + imgw) % imgw;
              }
              for (let jj = 0; jj < 4; ++jj) {
                outdata[(x + xx + (y + yy) * width) * 4 + jj] = indata[(xxx + yyy * imgw) * 4 + jj];
              }
            }
          }
        }
      }

      for (let idx = 0; idx < pngouts.length; ++idx) {
        let pngout = pngouts[idx];
        job.out({
          relative: `client/img/atlas_${name}${atlas_data.num_layers > 1 ? `_${idx}` : ''}.png`,
          contents: pngWrite(pngout),
        });
      }
      job.out({
        relative: `client/${name}.auat`,
        contents: JSON.stringify(runtime_data),
      });
    }

    for (let key in atlases) {
      doAtlas(key);
    }
    done();
  }
  return {
    type: gb.ALL,
    func: imgproc,
    version: [
      cmpFileKeys,
      parseRow,
    ],
  };
};
