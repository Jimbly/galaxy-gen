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
      x: (x + 0.5) / buf_dim,
      y: (y + 0.5) / buf_dim, type, v,
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

function expandLinear16X(data, buf_dim, xq, yq) {
  let ret = new Float32Array(data.length);
  let qs = buf_dim / 4;
  for (let yy = 0; yy < buf_dim / 4; ++yy) {
    let oy = yy * 4;
    for (let xx = 0; xx < buf_dim / 4; ++xx) {
      let ox = xx * 4;
      let in_idx = (yy + yq *qs) * buf_dim + xx + xq * qs;
      let v00 = data[in_idx];
      let v10 = v00;
      if (xx + xq * qs + 1 < buf_dim) {
        v10 = data[in_idx + 1];
      }
      let v01 = v00;
      let v11 = v10;
      if (yy + yq * qs + 1 < buf_dim) {
        v01 = data[in_idx + buf_dim];
        if (xx + xq * qs + 1 < buf_dim) {
          v11 = data[in_idx + buf_dim + 1];
        }
      }
      for (let jj = 0; jj < 4; ++jj) {
        let yf = jj / 4;
        let v0 = lerp(yf, v00, v01);
        let v1 = lerp(yf, v10, v11);
        for (let ii = 0; ii < 4; ++ii) {
          ret[(oy + jj) * buf_dim + ox + ii] = lerp(ii / 4, v0, v1);
        }
      }
    }
  }
  return ret;
}

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
    let data = expandLinear16X(parent.data, buf_dim, qx, qy);
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
