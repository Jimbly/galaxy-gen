const assert = require('assert');
const gb = require('glov-build');
const { PNG } = require('pngjs');
const {
  drawImageBilinear,
  pngAlloc,
  pngWrite,
} = require('./png.js');

const { floor } = Math;

function nextHighestPowerOfTwo(x) {
  --x;
  for (let i = 1; i < 32; i <<= 1) {
    x |= x >> i;
  }
  return x + 1;
}

function makeAtlas(atlas_params, alpha_map, src, allocator) {
  let { pad, tiles_per_row, tile_res, np2, tiled } = atlas_params;
  if (!tiles_per_row) {
    tiles_per_row = floor(src.width / tile_res);
  }
  let tile_w = floor(src.width / tiles_per_row);
  let tiles_per_column = floor(src.height / tile_w);

  let tile_w_extra = tile_w + pad * 2;
  let tex_w = tile_w_extra * tiles_per_row;
  let tex_h = tile_w_extra * tiles_per_column;
  if (!np2) {
    tex_w = nextHighestPowerOfTwo(tex_w);
    tex_h = nextHighestPowerOfTwo(tex_h);
  }
  let dest = allocator(tex_w, tex_h);
  let frame = 0;
  // tiles:
  // type AutoAtlasBuildData = [string, number, number, number[], number[], number[] | undefined, number[] | undefined];
  let tiles = [];
  for (let jj = 0; jj < tiles_per_column; ++jj) {
    let sy = jj * tile_w;
    let dy = jj * tile_w_extra;
    for (let ii = 0; ii < tiles_per_row; ++ii) {
      let sx = ii * tile_w;
      let dx = ii * tile_w_extra;

      if (alpha_map && !alpha_map[frame]) {
        dest.preClearRect(dx, dy, tile_w_extra, tile_w_extra);
      }


      if (tiled) {
        // LR to UL
        dest.drawImage(src, sx + tile_w - pad, sy + tile_w - pad, pad, pad, dx, dy, pad, pad);
        // bottom to top
        dest.drawImage(src, sx, sy + tile_w - pad, tile_w, pad, dx + pad, dy, tile_w, pad);
        // LL to UR
        dest.drawImage(src, sx, sy + tile_w - pad, pad, pad, dx + pad + tile_w, dy, pad, pad);
        // right to left
        dest.drawImage(src, sx + tile_w - pad, sy, pad, tile_w, dx, dy + pad, pad, tile_w);
        // copy body
        dest.drawImage(src, sx, sy, tile_w, tile_w, dx + pad, dy + pad, tile_w, tile_w);
        // left to right
        dest.drawImage(src, sx, sy, pad, tile_w, dx + tile_w + pad, dy + pad, pad, tile_w);
        // UR to LL
        dest.drawImage(src, sx + tile_w - pad, sy, pad, pad, dx, dy + pad + tile_w, pad, pad);
        // top to bottom
        dest.drawImage(src, sx, sy, tile_w, pad, dx + pad, dy + pad + tile_w, tile_w, pad);
        // UL to LR
        dest.drawImage(src, sx, sy, pad, pad, dx + pad + tile_w, dy + pad + tile_w, pad, pad);
      } else {
        // repeated
        // repeat top
        for (let kk = 0; kk < pad; ++kk) {
          dest.drawImage(src, sx, sy, tile_w, 1, dx + pad, dy + kk, tile_w, 1);
        }
        // copy body
        dest.drawImage(src, sx, sy, tile_w, tile_w, dx + pad, dy + pad, tile_w, tile_w);
        // repeat bottom
        for (let kk = 0; kk < pad; ++kk) {
          dest.drawImage(src, sx, sy + tile_w - 1, tile_w, 1, dx + pad, dy + pad + tile_w + kk, tile_w, 1);
        }
        // extend left
        for (let kk = 0; kk < pad; ++kk) {
          dest.drawImage(dest, dx + pad, dy, 1, tile_w + pad * 2, dx + kk, dy, 1, tile_w + pad * 2);
        }
        // extend right
        for (let kk = 0; kk < pad; ++kk) {
          dest.drawImage(dest, dx + pad + tile_w - 1, dy, 1, tile_w + pad * 2,
            dx + pad + tile_w + kk, dy, 1, tile_w + pad * 2);
        }
      }

      // [tile_name, x, y, ws, hs, padh, padv]
      tiles.push([
        String(frame),
        dx + pad,
        dy + pad,
        [tile_w], [tile_w],
        0, 0
      ]);
      ++frame;
    }
  }
  let autoatlas_data = {
    w: tex_w,
    h: tex_h,
    tiles,
  };
  dest.autoatlas_data = autoatlas_data;
  return dest;
}

// from textures.js
function cname(key) {
  key = key.replace(/\\/g, '/');
  let idx = key.lastIndexOf('/');
  if (idx !== -1) {
    key = key.slice(idx+1);
  }
  idx = key.indexOf('.');
  if (idx !== -1) {
    key = key.slice(0, idx);
  }
  return key.toLowerCase();
}

function pngAllocator(w, h) {
  let ret = pngAlloc({ width: w, height: h, byte_depth: 4 });
  ret.drawImage = function (src, sx, sy, sw, sh, dx, dy, dw, dh) {
    let dest = this;
    if (sw === dw && sh === dh) {
      return void src.bitblt(dest, sx, sy, sw, sh, dx, dy);
    }

    if (dw === floor(sw/2) && dh === floor(sh/2) && dw === dh) {
      // 2:1 reduciton for mipmaps (note: not currently used)
      return void drawImageBilinear(dest, 4, dx, dy, dw, dh, src, 4, sx, sy, sw, sh, 0xF);
    }


    // Should just be a 2:1 vertical squish (tiles with "nudge")
    assert.equal(sw, dw);
    assert.equal(dh * 2, sh);
    let sd = src.data;
    let dd = dest.data;
    let stride = src.width * 4;
    for (let jj = 0; jj < dh; ++jj) {
      let sidx1 = (sy + jj * 2) * stride + sx * 4;
      let sidx2 = (sy + jj * 2 + 1) * stride + sx * 4;
      let didx = (dy + jj) * dest.width * 4 + dx * 4;
      for (let ii = 0; ii < dw * 4; ++ii) {
        let a = sd[sidx1 + ii];
        let b = sd[sidx2 + ii];
        let c = (a + b) >> 1;
        dd[didx + ii] = c;
      }
    }
  };
  return ret;
}

function doProcess(atlas_params, buffer, next) {
  let pngin = new PNG();
  pngin.parse(buffer, (err) => {
    if (err) {
      return void next(err);
    }
    let pngout_atlas = makeAtlas(atlas_params, null, pngin, pngAllocator);
    next(null, pngout_atlas, pngout_atlas.autoatlas_data);
  });
}

module.exports = function (params_file) {

  function atlaspad(job, done) {
    let file = job.getFile();
    job.depAdd(params_file, function (err, params_data) {
      if (err) {
        return void done(err);
      }
      try {
        params_data = JSON.parse(params_data.contents);
      } catch (e) {
        return void done(e);
      }

      let fn = cname(file.relative);
      let atlas_params = params_data.default;
      for (let key in params_data) {
        if (params_data[key].fn === fn ||
          params_data[key].suffix && fn.endsWith(params_data[key].suffix)
        ) {
          atlas_params = params_data[key];
          break;
        }
      }
      if (!atlas_params) {
        return void done(`No atlas params in ${params_file} for ${fn}`);
      }
      doProcess(atlas_params, file.contents, (err, pngout_atlas, autoatlas_data) => {
        if (err) {
          return void done(err);
        }
        job.out({
          relative: `client/img/atlas_${fn}.png`,
          contents: pngWrite(pngout_atlas),
        });
        job.out({
          relative: `client/${fn}.auat`,
          contents: JSON.stringify(autoatlas_data),
        });

        done();
      });
    });
  }

  return {
    type: gb.SINGLE,
    func: atlaspad,
    version: [
      makeAtlas,
      doProcess,
      drawImageBilinear,
      pngAllocator,
    ],
  };
};
