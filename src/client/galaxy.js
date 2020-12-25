export const LAYER_STEP = 4;
const assert = require('assert');
const { abs, atan2, floor, max, min, sqrt, pow, PI } = Math;
const { randCreate } = require('./glov/rand_alea.js');
const SimplexNoise = require('simplex-noise');
const textures = require('./glov/textures.js');
const { clamp, lerp, easeOut, easeInOut } = require('../common/util.js');

const POI_TYPE_OFFS = [
  [1, 0,0,
   0.5, 0,-1, 0.5, -1,0, 0.5, 0,1, 0.5, 1,0], // 4 neighbors
  [1, 0,0,
   0.5, 0,-1, 0.5, 0,-2, 0.5, -1,0, 0.5, -2,0, 0.5, 1,0, 0.5, 2,0, 0.5, 0,1, 0.5, 0,2, // plus pattern
   0.2, -1,-1, 0.2, 1,-1, 0.2, -1,1, 0.2, 1,1], // diagonals
  [1, 0,0,
   0.2, 0,-1, 0.2, 0,-2, 0.2, -1,0, 0.2, -2,0, 0.2, 1,0, 0.2, 2,0, 0.2, 0,1, 0.2, 0,2,
   0.2, -1,-1, 0.2, 1,-1, 0.2, -1,1, 0.2, 1,1],
];


let noise = new Array(1);
function genGalaxy(params) {
  let { seed, arms, buf_dim, twirl, center, poi_count, len_mods, noise_freq, noise_weight } = params;
  for (let ii = 0; ii < noise.length; ++ii) {
    noise[ii] = new SimplexNoise(`${seed}n${ii}`);
  }
  let rand = randCreate(seed);
  let arm_len = new Array(len_mods);
  for (let ii = 0; ii < arm_len.length; ++ii) {
    arm_len[ii] = rand.random();
  }

  let data = new Float32Array(buf_dim * buf_dim);
  for (let idx = 0, yy = 0; yy < buf_dim; ++yy) {
    let y = yy / buf_dim * 2 - 1; // -1 ... 1
    for (let xx = 0; xx < buf_dim; ++xx, ++idx) {
      let x = xx / buf_dim * 2 - 1; // -1 ... 1
      let d = sqrt(x * x + y * y);
      let rawd = d;
      let theta = atan2(x, y);
      let rawtheta = theta;
      theta += d*twirl;
      //let dense = sin(theta * 7) * 0.5 + 0.5;
      let dense = theta / (2*PI); // 0...1
      while (dense < 0) {
        dense += 1;
      }
      let armidx = (dense * 2 % 1) * arm_len.length;
      let armi = floor(armidx);
      let armf = armidx - armi;
      let interp_arm_len = lerp(easeInOut(armf, 2), arm_len[armi], arm_len[(armi + 1) % arm_len.length]);
      d *= 1 + interp_arm_len;

      dense *= arms; // 0..arms
      dense %= 1;
      dense = abs(dense *2 - 1);
      dense *= dense;
      let invd = max(0, 1 - d);
      // Change falloff to be tighter farther out
      let id2 = max(0, min(1, invd * 2));
      if (id2 === 0) {
        dense = 0;
      } else {
        dense = max(0, min(1, dense / id2 - (1 / id2 - 1)));
      }
      dense = easeOut(dense, 2);
      //dense = arm_soft + (1 - arm_soft) * dense;
      let v;
      dense = lerp(min(d, 1), invd, dense);
      v = dense;
      //v = dense - d;
      let cv = clamp((center - rawd) * 20, 0, 1);
      v += easeInOut(cv, 2);

      let noise_v1 = noise[0].noise2D(rawd * noise_freq, theta * d) * 0.5 + 0.5;
      let theta_rot = ((rawtheta + PI*2) % (PI*2) + d*twirl);
      let noise_v2 = noise[0].noise2D(rawd * noise_freq, theta_rot * d) * 0.5 + 0.5;
      let theta01 = (rawtheta/(PI*2)+1)%1;
      let noise_v = lerp(abs(theta01 * 2 - 1), noise_v2, noise_v1);
      noise_v = (noise_v * 2) - 1;
      // as v goes from 0 to 0.1, fade noise_v from 0.05 to 1
      noise_v *= lerp(clamp(v * 10, 0, 1), 0.05, 1);
      // as v goes above a threshold, fade noise_v from 1 to 0
      noise_v *= lerp(clamp((v - 0.7)/0.1, 0, 1), 1, 0);
      // as d goes to 1, fade out noise_v
      noise_v *= lerp(clamp((rawd-0.7)/0.3, 0, 1), 1, 0);
      v += noise_v * noise_weight;
      // noise_v = max(0, 1 - (1 - noise_v) * d * noise_weight);
      // v *= noise_v;
      data[idx] = clamp(v, 0, 1);
    }
  }

  const POI_BORDER = 5;
  let pois = [];
  for (let ii = 0; ii < poi_count; ++ii) {
    let x = POI_BORDER + rand.range(buf_dim - POI_BORDER * 2);
    let y = POI_BORDER + rand.range(buf_dim - POI_BORDER * 2);
    let v = rand.floatBetween(0.2, 1);
    let type = rand.range(POI_TYPE_OFFS.length);
    pois.push({
      x: x / buf_dim,
      y: y / buf_dim,
      type, v,
    });
    // Also add a little density around the POI
    data[x + y * buf_dim] = max(data[x + y * buf_dim], v * 0.5);
  }

  let sum = 0;
  for (let ii = 0; ii < data.length; ++ii) {
    sum += data[ii];
  }

  return {
    data,
    sum,
    pois,
    // relative position and size to entire galaxy
    x0: 0, y0: 0, w: 1, h: 1,
  };
}

let tex_pool = [];
let tex_id_idx = 0;

function Galaxy(params) {
  this.params = params;
  let buf_dim = this.buf_dim = params.buf_dim;
  let tex_total_size = this.tex_total_size = buf_dim * buf_dim;
  this.tex_data = new Uint8Array(tex_total_size * 4);
  this.layers = [];
}

const SAMPLE_PAD = 4;
// function expandLinear16X(data, buf_dim, xq, yq) {
//   let sample_dim = buf_dim + SAMPLE_PAD * 2;
//   let ret = new Float32Array(buf_dim * buf_dim);
//   let qs = buf_dim / 4;
//   for (let yy = 0; yy < buf_dim; ++yy) {
//     for (let xx = 0; xx < buf_dim; ++xx) {
//       let x_in = floor(xx / 4);
//       let dx = xx/4 - x_in;
//       let y_in = floor(yy / 4);
//       let dy = yy/4 - y_in;
//       let in_idx = (y_in + yq * qs + SAMPLE_PAD) * sample_dim + x_in + xq * qs + SAMPLE_PAD;
//       let v00 = data[in_idx];
//       let v10 = data[in_idx + 1];
//       let v01 = data[in_idx + sample_dim];
//       let v11 = data[in_idx + sample_dim + 1];
//       let v0 = lerp(dy, v00, v01);
//       let v1 = lerp(dy, v10, v11);
//       ret[xx + yy * buf_dim] = lerp(dx, v0, v1);
//     }
//   }
//   return ret;
// }

// from http://paulbourke.net/miscellaneous/imageprocess/
let cubic_weights = (function () {
  function cub(v) {
    return v*v*v;
  }
  function p(v) {
    return max(0, v);
  }
  function r(x) {
    let v= 1/6 * (cub(p(x+2)) - 4 * cub(p(x+1)) + 6*cub(p(x)) - 4 * cub(p(x-1)));
    return v;
  }
  function weight(ii, jj, dx, dy) {
    return r(ii - dx/4) * r(jj - dy/4);
  }
  let ret = [];
  for (let dy = 0; dy < 4; ++dy) {
    let row = [];
    ret.push(row);
    for (let dx = 0; dx < 4; ++dx) {
      let w = [];
      for (let ii = -1; ii <= 2; ++ii) {
        for (let jj = -1; jj <= 2; ++jj) {
          w.push(weight(ii, jj, dx, dy));
        }
      }
      row.push(w);
    }
  }
  return ret;
}());
function expandBicubic16X(data, buf_dim, xq, yq) {
  let sample_dim = buf_dim + SAMPLE_PAD * 2;
  let ret = new Float32Array(buf_dim * buf_dim);
  let qs = buf_dim / 4;
  let idx_add = (yq * qs + SAMPLE_PAD) * sample_dim + xq * qs + SAMPLE_PAD;
  for (let yy = 0; yy < buf_dim; ++yy) {
    let y_in = floor(yy / 4);
    let dy = yy - y_in * 4;
    let in_idx_y = y_in * sample_dim + idx_add;
    let w_row = cubic_weights[dy];
    for (let xx = 0; xx < buf_dim; ++xx) {
      let x_in = floor(xx / 4);
      let dx = xx - x_in * 4;
      let in_idx = in_idx_y + x_in;
      let sum = 0;
      let weights = w_row[dx];
      for (let ii = -1, widx=0; ii <= 2; ++ii) {
        for (let jj = -1; jj <= 2; ++jj, ++widx) {
          sum += data[in_idx + ii + jj * sample_dim] * weights[widx];
        }
      }
      ret[xx + yy * buf_dim] = sum;
    }
  }
  return ret;
}


// Gets a padded buffer from the specified cell and all neighbors
Galaxy.prototype.getSampleBuf = function (layer_idx, cx, cy) {
  let { sample_buf, buf_dim } = this;
  let key = [layer_idx, cx, cy].join();
  if (this.last_sample_buf === key) {
    return sample_buf;
  }
  let layer_res = pow(LAYER_STEP, layer_idx);
  let sample_dim = buf_dim + SAMPLE_PAD * 2;
  if (!sample_buf) {
    sample_buf = this.sample_buf = new Float32Array(sample_dim*sample_dim);
  }
  // Call getCell() on all requirements (may recurse into here)
  let bufs = [];
  for (let dy = -1; dy <= 1; ++dy) {
    let py = cy + dy;
    bufs[dy] = [];
    for (let dx = -1; dx <= 1; ++dx) {
      let px = cx + dx;
      let buf;
      if (px < 0 || px >= layer_res || py < 0 || py >= layer_res) {
        buf = null;
      } else {
        let cell = this.getCell(layer_idx, px + py * layer_res);
        buf = cell.data;
      }
      bufs[dy][dx] = buf;
    }
  }

  for (let dy = -1; dy <= 1; ++dy) {
    for (let dx = -1; dx <= 1; ++dx) {
      let buf = bufs[dy][dx];
      let ox = SAMPLE_PAD + dx * buf_dim;
      let oy = SAMPLE_PAD + dy * buf_dim;
      let x0 = max(0, -ox);
      let y0 = max(0, -oy);
      let x1 = min(buf_dim, sample_dim - ox);
      let y1 = min(buf_dim, sample_dim - oy);
      for (let xx = x0; xx < x1; ++xx) {
        for (let yy = y0; yy < y1; ++yy) {
          sample_buf[ox + xx + (oy + yy) * sample_dim] = buf ? buf[xx + yy * buf_dim] : 0;
        }
      }
    }
  }
  this.last_sample_buf = key;
  return sample_buf;
};

Galaxy.prototype.getCell = function (layer_idx, cell_idx) {
  let { layers, buf_dim } = this;
  let layer = layers[layer_idx];
  if (!layer) {
    layer = layers[layer_idx] = [];
  }
  let cell = layer[cell_idx];
  if (cell) {
    return cell;
  }

  // Fill it
  if (layer_idx === 0) {
    assert(cell_idx === 0);
    cell = genGalaxy(this.params);
  } else {
    let layer_res = pow(LAYER_STEP, layer_idx);
    let cx = cell_idx % layer_res;
    let cy = floor(cell_idx / layer_res);
    let px = floor(cx / LAYER_STEP);
    let py = floor(cy / LAYER_STEP);
    let pres = pow(LAYER_STEP, layer_idx - 1);
    let parent = this.getCell(layer_idx - 1, py * pres + px);
    let qx = cx - px * LAYER_STEP;
    let qy = cy - py * LAYER_STEP;
    let sample_buf = this.getSampleBuf(layer_idx - 1, px, py);
    let data = expandBicubic16X(sample_buf, buf_dim, qx, qy);
    let x0 = cx / layer_res;
    let y0 = cy / layer_res;
    let w = 1/layer_res;
    // TODO: This probably filters pois into two different children due to floating point consistency?
    let pois = parent.pois.filter((poi) => poi.x >= x0 && poi.x < x0 + w && poi.y >= y0 && poi.y < y0 + w);
    cell = {
      data,
      pois,
      // relative position and size to entire galaxy
      x0, y0, w, h: w,
    };
  }

  layer[cell_idx] = cell;
  return cell;
};

Galaxy.prototype.getCellTextured = function (layer_idx, cell_idx) {
  let { buf_dim, tex_data, tex_total_size } = this;
  let cell = this.getCell(layer_idx, cell_idx);
  if (cell.tex) {
    return cell;
  }
  let { data, pois, x0, y0, w } = cell;

  for (let ii = 0; ii < tex_total_size; ++ii) {
    let d = data[ii];
    for (let jj = 0; jj < 3; ++jj) {
      tex_data[ii * 4 + jj] = clamp(floor(d * 255), 0, 255);
    }
    tex_data[ii * 4 + 3] = 255;
  }

  // Render in POIs
  for (let ii = 0; ii < pois.length; ++ii) {
    let poi = pois[ii];
    let { x, y, type, v } = poi;
    x = floor((x - x0) / w * buf_dim);
    y = floor((y - y0) / w * buf_dim);
    let idx = (x + y * buf_dim) * 4;
    let offs = POI_TYPE_OFFS[type];
    for (let jj = 0; jj < offs.length; jj+=3) {
      let v2 = clamp(floor(v * offs[jj] * 255), 0, 255);
      let dx = offs[jj+1];
      let dy = offs[jj+2];
      let xx = x + dx;
      let yy = y + dy;
      if (xx < 0 || xx >= buf_dim || yy < 0 || yy >= buf_dim) {
        continue;
      }
      let d = (dx + dy * buf_dim) * 4;
      for (let kk = 0; kk < 3; ++kk) {
        tex_data[idx + d + kk] = max(tex_data[idx + d + kk], v2);
      }
    }
  }

  if (tex_pool.length) {
    cell.tex = tex_pool.pop();
    cell.tex.updateData(buf_dim, buf_dim, tex_data);
  } else {
    cell.tex = textures.load({
      name: `galaxy_${++tex_id_idx}`,
      format: textures.format.RGBA8,
      width: buf_dim,
      height: buf_dim,
      data: tex_data,
      filter_min: gl.NEAREST,
      filter_mag: gl.NEAREST,
      wrap_s: gl.CLAMP_TO_EDGE,
      wrap_t: gl.CLAMP_TO_EDGE,
    });
  }
  return cell;
};

Galaxy.prototype.dispose = function () {
  let { layers } = this;
  for (let ii = 0; ii < layers.length; ++ii) {
    let layer = layers[ii];
    for (let key in layer) {
      let cell = layer[key];
      if (cell.tex) {
        tex_pool.push(cell.tex);
        cell.tex = null;
      }
    }
  }
};

export function createGalaxy(params) {
  return new Galaxy(params);
}
