export const LAYER_STEP = 4;
export const STAR_LAYER = 6;
export const MAX_LAYER = 8;
const assert = require('assert');
const engine = require('./glov/engine.js');
const { abs, atan2, ceil, floor, max, min, sqrt, pow, PI, round } = Math;
const { randCreate, mashString } = require('./glov/rand_alea.js');
const SimplexNoise = require('simplex-noise');
const { starType } = require('./star_types.js');
const { solarSystemCreate } = require('./solar_system.js');
const textures = require('./glov/textures.js');
const { clamp, lerp, easeOut, easeInOut, ridx } = require('../common/util.js');

const SUMSQ = false;

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


let noise = new Array(2);
let rand = randCreate(0);
function genGalaxy(params) {
  let {
    seed, arms, buf_dim, twirl, center, poi_count, len_mods, noise_freq, noise_weight,
    star_count, max_zoom,
  } = params;
  for (let ii = 0; ii < noise.length; ++ii) {
    noise[ii] = new SimplexNoise(`${seed}n${ii}`);
  }
  rand.reseed(seed);
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
      data[idx] = max(v, 0); // clamp(v, 0, 1);
    }
  }

  const POI_BORDER = 5;
  let pois = [];
  let poi_offs = 0.5 / pow(2, max_zoom);
  for (let ii = 0; ii < poi_count; ++ii) {
    let x = POI_BORDER + rand.range(buf_dim - POI_BORDER * 2);
    let y = POI_BORDER + rand.range(buf_dim - POI_BORDER * 2);
    let v = rand.floatBetween(0.2, 1);
    // Also add a little density around the POI
    let idx = x + y * buf_dim;
    data[idx] = max(data[idx], v * 0.5);
    x = x/buf_dim + poi_offs; // center in a final zoomed in cell
    y = y/buf_dim + poi_offs; // center in a final zoomed in cell
    let type = rand.range(POI_TYPE_OFFS.length);
    pois.push({
      x, y,
      type, v,
    });
  }

  let sum = 0;
  let sumsq = 0;
  for (let ii = 0; ii < data.length; ++ii) {
    let v = data[ii];
    sum += v;
    sumsq += v*v;
  }

  return {
    data,
    sum,
    sumsq,
    star_count,
    pois,
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
  this.work_frame = 0;
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
        if (!cell.ready) {
          return null;
        }
        buf = cell.data;
      }
      bufs[dy][dx] = buf;
    }
  }

  if (engine.frame_index === this.work_frame) {
    return null;
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

Galaxy.prototype.realizeStars = function (cell) {
  let { layer_idx, cell_idx, star_count, data, sum, sumsq, x0, y0, w, pois } = cell;
  let stars = cell.stars = [];
  let { buf_dim, params } = this;
  let { seed } = params;
  rand.reseed(mashString(`${seed}_${layer_idx}_${cell_idx}`));
  let scale;
  if (SUMSQ) {
    scale = star_count / sumsq * 1.03;
  } else {
    scale = star_count / sum * 1.03;
  }
  let value_scale = 0.75; // Was: (sum / star_count), which was ~0.75 before SUMSQ
  assert.equal(layer_idx, STAR_LAYER); // consistent IDs only on this layer
  function fillStar(star) {
    star.id = [cell_idx, 0]; // 24bit cell_idx, <~18bit id, filled later
    star.classif = starType(rand.random()); // TODO: correlate to `type`
    star.seed = rand.uint32();
  }
  function addStar(xx, yy) {
    let star = {
      type: rand.range(POI_TYPE_OFFS.length),
      x: x0 + xx/buf_dim * w,
      y: y0 + yy/buf_dim * w,
      v: (0.5 + rand.random()) * value_scale,
    };
    fillStar(star);
    stars.push(star);
  }
  if (star_count) {
    for (let idx=0, yy = 0; yy < buf_dim; ++yy) {
      for (let xx = 0; xx < buf_dim; ++xx, ++idx) {
        let v = data[idx];
        if (SUMSQ) {
          v *= v;
        }
        let expected_stars = v * scale;
        // assert(expected_stars < 10); // sometimes more than 65
        // assert(expected_stars < 50);
        let actual_stars = floor(rand.random() * (expected_stars + 1) + expected_stars * 0.5);
        for (let ii = 0; ii < actual_stars; ++ii) {
          // uniform within sub-cell
          addStar(xx + rand.random(), yy + rand.random());
        }
      }
    }
  }
  // console.log((stars.length-star_count)/star_count, stars.length, star_count); // about 5% under to 30% over
  while (stars.length < star_count) {
    addStar(rand.floatBetween(0, buf_dim), rand.floatBetween(0, buf_dim));
  }
  while (stars.length > star_count) {
    ridx(stars, rand.range(stars.length));
  }
  for (let ii = 0; ii < pois.length; ++ii) {
    let poi = pois[ii];
    fillStar(poi);
    stars.push(poi);
  }
  for (let ii = 0; ii < stars.length; ++ii) {
    stars[ii].id[1] = ii;
  }
  // TODO: relaxation step to separate really close stars (1/1000 ly? <=2px in highest res buffer?)
  this.renderStars(cell);
};

// render into `data` appropriately for the current zoom
{
  let weights = [];
  let idxes = [];
  Galaxy.prototype.renderStars = function (cell) {
    let { layer_idx, data, x0, y0, w, stars } = cell;
    let { buf_dim } = this;
    let scale = buf_dim / w;
    // let { max_zoom } = this.params;
    // let layer_res = pow(LAYER_STEP, layer_idx);
    // let max_res = pow(2, max_zoom);
    data.fill(0);
    for (let ii = 0; ii < stars.length; ++ii) {
      let star = stars[ii];
      let { x, y, v } = star;
      x = (x - x0) * scale;
      y = (y - y0) * scale;
      if (layer_idx === 7) {
        const r = 2;
        const rsq = r * r;
        let wtot = 0;
        let widx = 0;
        // scoot in so we don't need to go into neighboring data
        x = max(r/2, min(buf_dim - r/2, x));
        y = max(r/2, min(buf_dim - r/2, y));
        let ix = floor(x);
        let iy = floor(y);
        for (let yy = floor(-r); yy <= ceil(r); ++yy) {
          let dy = iy + yy - y + 0.5;
          if (abs(dy) >= r) {
            continue;
          }
          for (let xx = floor(-r); xx <= ceil(r); ++xx) {
            let dx = ix + xx - x + 0.5;
            let dsq = dx * dx + dy * dy;
            if (dsq >= rsq) {
              continue;
            }
            let d =sqrt(dsq);
            let wt = (1-d/r)*(1-d/r);
            // let wt = 1 - dsq / rsq;
            wtot += wt;
            weights[widx] = wt;
            idxes[widx++] = ix + xx + (iy + yy) * buf_dim;
          }
        }
        for (let jj = 0; jj < widx; ++jj) {
          let wt = weights[jj];
          let idx = idxes[jj];
          data[idx] += v * 4 * wt / wtot;
        }
      } else {
        let ix = floor(x);
        let iy = floor(y);
        let idx = ix + iy * buf_dim;
        // just add
        data[idx] += v;
      }
    }
  };
}

Galaxy.prototype.assignChildStars = function (cell) {
  let { buf_dim } = this;
  let { pois, star_count, stars, sum, sumsq, data } = cell;
  let child_data = [];
  for (let ii = 0; ii < LAYER_STEP * LAYER_STEP; ++ii) {
    child_data.push({ pois: [] });
  }
  if (!stars) {
    let qs = buf_dim / LAYER_STEP;
    let running_sum = 0;
    let running_sumsq = 0;
    let last_star_count = 0;
    for (let idx=0, yy = 0; yy < LAYER_STEP; ++yy) {
      for (let xx = 0; xx < LAYER_STEP; ++xx, ++idx) {
        if (sum) {
          let idxbase = xx * qs + yy * qs * buf_dim;
          for (let jj = 0; jj < qs; ++jj) {
            let idx_in = idxbase + jj * buf_dim;
            for (let ii = 0; ii < qs; ++ii, ++idx_in) {
              let v = data[idx_in];
              running_sum += v;
              running_sumsq += v*v;
            }
          }
        }
        let sc;
        if (SUMSQ) {
          sc = sumsq ? round(running_sumsq / sumsq * star_count) : 0;
        } else {
          sc = sum ? round(running_sum / sum * star_count) : 0;
        }
        child_data[idx].star_count = sc - last_star_count;
        last_star_count = sc;
      }
    }
    if (last_star_count !== star_count) {
      assert.equal(last_star_count, star_count);
    }
  }
  let mul = LAYER_STEP / cell.w;
  for (let ii = 0; ii < pois.length; ++ii) {
    let poi = pois[ii];
    let qx = floor((poi.x - cell.x0) * mul);
    let qy = floor((poi.y - cell.y0) * mul);
    assert(qx >= 0 && qx < LAYER_STEP);
    assert(qy >= 0 && qy < LAYER_STEP);
    let idx = qy * LAYER_STEP + qx;
    child_data[idx].pois.push(poi);
  }
  if (stars) {
    for (let ii = 0; ii < child_data.length; ++ii) {
      child_data[ii].stars = [];
    }
    for (let ii = 0; ii < stars.length; ++ii) {
      let poi = stars[ii];
      let qx = floor((poi.x - cell.x0) * mul);
      let qy = floor((poi.y - cell.y0) * mul);
      assert(qx >= 0 && qx < LAYER_STEP);
      assert(qy >= 0 && qy < LAYER_STEP);
      let idx = qy * LAYER_STEP + qx;
      child_data[idx].stars.push(poi);
    }
  }
  cell.child_data = child_data;
};

Galaxy.prototype.perturb = function (cell, params) {
  let { buf_dim } = this;
  let { noise_freq, noise_weight } = params;
  let { data, x0, y0, w } = cell;
  let mul = w / buf_dim;
  for (let idx=0, yy = 0; yy < buf_dim; ++yy) {
    let world_y = y0 + yy * mul;
    for (let xx = 0; xx < buf_dim; ++xx, ++idx) {
      let world_x = x0 + xx * mul;
      let noisev = noise[1].noise2D(world_x * noise_freq, world_y * noise_freq);
      //data[idx] *= 1 + noise_weight * noisev; // uniform scale around 1.0
      // instead, only decrease, makes rendered maps look better, darken as you zoom in
      let v = data[idx] * (1 + noise_weight * (noisev * 0.5 - 0.5));
      // assert(v >= 0); // not if noise_weight > 1
      v = max(0, v);
      data[idx] = v;
    }
  }
};

Galaxy.prototype.getCell = function (layer_idx, cell_idx) {
  if (layer_idx > MAX_LAYER) {
    return {};
  }
  let { layers, buf_dim, params } = this;
  let layer = layers[layer_idx];
  if (!layer) {
    layer = layers[layer_idx] = [];
  }
  let cell = layer[cell_idx];
  if (cell && cell.ready) {
    return cell;
  }

  let layer_res = pow(LAYER_STEP, layer_idx);
  let cx = cell_idx % layer_res;
  let cy = floor(cell_idx / layer_res);
  let x0 = cx / layer_res;
  let y0 = cy / layer_res;
  let w = 1/layer_res;
  if (!cell) {
    cell = {
      // relative position and size to entire galaxy
      x0, y0, w, h: w,
      layer_idx, cell_idx, cx, cy,
      ready: false,
    };
    layer[cell_idx] = cell;
  }

  // Fill it
  if (layer_idx === 0) {
    assert(cell_idx === 0);
    let ret = genGalaxy(params);
    cell.sum = ret.sum;
    cell.sumsq = ret.sumsq;
    cell.data = ret.data;
    cell.star_count = ret.star_count;
    cell.pois = ret.pois;
  } else {
    // How many cells wide is this layer?
    let px = floor(cx / LAYER_STEP);
    let py = floor(cy / LAYER_STEP);
    let pres = pow(LAYER_STEP, layer_idx - 1);
    let parent = this.getCell(layer_idx - 1, py * pres + px);
    if (!parent.ready) {
      return cell;
    }

    if (engine.frame_index === this.work_frame) {
      // Already did one this frame (presumably a parent)
      return cell;
    }

    let qx = cx - px * LAYER_STEP;
    let qy = cy - py * LAYER_STEP;
    let qidx = qx + qy * LAYER_STEP;

    cell.pois = parent.child_data[qidx].pois;
    // pois.filter((poi) => poi.x >= x0 && poi.x < x0 + w && poi.y >= y0 && poi.y < y0 + w);
    let sample_buf = this.getSampleBuf(layer_idx - 1, px, py);

    if (!sample_buf) {
      // Already did one this frame
      return cell;
    }
    // Going to do work, take the frame's allotment
    this.work_frame = engine.frame_index;

    // Have the parent sample buf, generate us
    let data = cell.data = expandBicubic16X(sample_buf, buf_dim, qx, qy);
    let key = `layer${layer_idx}`;
    if (params[key]) {
      this.perturb(cell, params[key]);
    }
    let sum = 0;
    let sumsq = 0;
    for (let ii = 0; ii < data.length; ++ii) {
      let v = data[ii];
      sum += v;
      sumsq += v*v;
    }
    cell.sum = sum;
    cell.sumsq = sumsq;

    if (parent.stars) {
      // filter existing stars
      cell.stars = parent.child_data[qidx].stars;
      // parent.stars.filter((poi) => poi.x >= x0 && poi.x < x0 + w && poi.y >= y0 && poi.y < y0 + w);
      cell.star_count = cell.stars.length;
      this.renderStars(cell);
    } else {
      // count or generate stars

      cell.star_count = parent.child_data[qidx].star_count;

      if (layer_idx === STAR_LAYER) { // || cell.star_count < 100000) {
        // realize stars
        this.realizeStars(cell);
      }
    }
  }
  this.assignChildStars(cell);
  cell.ready = true;

  return cell;
};

{
  let temp_data;
  const debug_pix = [
    [0,0,0,0,0,
     0,0,1,0,0,
     0,1,0,1,0,
     0,1,0,1,0,
     0,1,0,1,0,
     0,0,1,0,0,
     0,0,0,0,0],
    [0,0,0,0,0,
     0,0,1,0,0,
     0,1,1,0,0,
     0,0,1,0,0,
     0,0,1,0,0,
     0,1,1,1,0,
     0,0,0,0,0],
    [0,0,0,0,0,
     0,0,1,0,0,
     0,1,0,1,0,
     0,0,0,1,0,
     0,0,1,0,0,
     0,1,1,1,0,
     0,0,0,0,0],
    [0,0,0,0,0,
     0,1,1,0,0,
     0,0,0,1,0,
     0,1,1,0,0,
     0,0,0,1,0,
     0,1,1,0,0,
     0,0,0,0,0],
    [0,0,0,0,0,
     0,1,0,1,0,
     0,1,0,1,0,
     0,1,1,1,0,
     0,0,0,1,0,
     0,0,0,1,0,
     0,0,0,0,0],
    [0,0,0,0,0,
     0,1,1,1,0,
     0,1,0,0,0,
     0,1,1,0,0,
     0,0,0,1,0,
     0,1,1,0,0,
     0,0,0,0,0],
    [0,0,0,0,0,
     0,0,1,1,0,
     0,1,0,0,0,
     0,1,1,1,0,
     0,1,0,1,0,
     0,1,1,1,0,
     0,0,0,0,0],
    [0,0,0,0,0,
     0,1,1,1,0,
     0,0,0,1,0,
     0,0,0,1,0,
     0,0,1,0,0,
     0,0,1,0,0,
     0,0,0,0,0],
    [0,0,0,0,0,
     0,1,1,1,0,
     0,1,0,1,0,
     0,1,1,1,0,
     0,1,0,1,0,
     0,1,1,1,0,
     0,0,0,0,0],
  ];
  Galaxy.prototype.getCellTextured = function (layer_idx, cell_idx) {
    let { buf_dim, tex_data, tex_total_size } = this;
    let cell = this.getCell(layer_idx, cell_idx);
    if (cell.tex) {
      return cell;
    }
    let { data, pois, x0, y0, w, stars, cx, cy, ready } = cell;
    if (!ready) {
      // still loading
      return cell;
    }

    let layer_res = pow(LAYER_STEP, layer_idx);
    let max_res = pow(2, this.params.max_zoom);
    if (stars && layer_res === max_res) {
      for (let ii = 0; ii < tex_total_size; ++ii) {
        for (let jj = 0; jj < 3; ++jj) {
          tex_data[ii * 4 + jj] = 0;
        }
        tex_data[ii * 4 + 3] = 255;
      }
      if (layer_res === max_res) {
        // Render in stars, merge POIs into this?
        for (let ii = 0; ii < stars.length; ++ii) {
          let poi = stars[ii];
          let { x, y, type, v } = poi;
          x = floor((x - x0) / w * buf_dim);
          y = floor((y - y0) / w * buf_dim);
          x = max(2, min(buf_dim - 2 - 1, x));
          y = max(2, min(buf_dim - 2 - 1, y));
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
      } else {
        // // at reduced resolution, each star is a single, additive point
        // let reduce = layer_res*layer_res / (max_res*max_res);
        // for (let ii = 0; ii < stars.length; ++ii) {
        //   let poi = stars[ii];
        //   let { x, y, type, v } = poi;
        //   x = floor((x - x0) / w * buf_dim);
        //   y = floor((y - y0) / w * buf_dim);
        //   let idx = (x + y * buf_dim) * 4;
        //   let d = (dx + dy * buf_dim) * 4;
        //   for (let kk = 0; kk < 3; ++kk) {
        //     tex_data[idx + d + kk] += v * reduce * 255; // float!
        //   }
        // }
      }
    } else {
      // Fill from density data
      if (layer_idx === STAR_LAYER) {
        // blur
        const blur_weights = [
          1/16, 1/8, 1/16,
          1/8, 1/4, 1/8,
          1/16, 1/8, 1/16,
        ];
        let sample_buf = this.getSampleBuf(layer_idx, cx, cy);
        if (!sample_buf) {
          // something still loading
          return cell;
        }
        if (!temp_data || temp_data.length !== tex_total_size) {
          temp_data = new Float32Array(tex_total_size);
        }
        data = temp_data;

        let sample_dim = buf_dim + SAMPLE_PAD * 2;
        let idx_add = SAMPLE_PAD * sample_dim + SAMPLE_PAD;
        for (let idx=0, yy = 0; yy < buf_dim; ++yy) {
          for (let in_idx=yy*sample_dim + idx_add, xx = 0; xx < buf_dim; ++xx, ++idx, ++in_idx) {
            let sum = 0;
            for (let ii = -1, widx=0; ii <= 1; ++ii) {
              for (let jj = -1; jj <= 1; ++jj, ++widx) {
                sum += sample_buf[in_idx + ii + jj * sample_dim] * blur_weights[widx];
              }
            }
            data[idx] = sum;
          }
        }
      }
      for (let ii = 0; ii < tex_total_size; ++ii) {
        let d = data[ii];
        for (let jj = 0; jj < 3; ++jj) {
          tex_data[ii * 4 + jj] = clamp(floor(d * 255), 0, 255);
        }
        tex_data[ii * 4 + 3] = 255;
      }
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

    if (engine.DEBUG && false) {
      let dbg = debug_pix[layer_idx];
      if (dbg) {
        for (let idx=0, yy = 0; yy < 7; ++yy) {
          for (let xx = 0; xx < 5; ++xx,++idx) {
            let idx2 = (yy * buf_dim + xx) * 4;
            for (let ii = 0; ii < 3; ++ii) {
              tex_data[idx2 + ii] = dbg[idx] ? 255 : 0;
            }
          }
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
}

export function distSq(x1, y1, x2, y2) {
  let dx = x2 - x1;
  let dy = y2 - y1;
  return dx*dx + dy*dy;
}

Galaxy.prototype.starsNear = function (x, y, num) {
  let { layers } = this;
  let layer_idx = MAX_LAYER - 1;
  let layer = layers[layer_idx];
  if (!layer) {
    return [];
  }
  let layer_res = pow(LAYER_STEP, layer_idx);
  let cx = floor(x * layer_res);
  let cy = floor(y * layer_res);
  let closest = new Array(num);
  for (let yy = cy - 1; yy <= cy + 1; ++yy) {
    if (yy < 0 || yy >= layer_res) {
      continue;
    }
    for (let xx = cx - 1; xx <= cx + 1; ++xx) {
      if (xx < 0 || xx >= layer_res) {
        continue;
      }
      let cell_idx = yy * layer_res + xx;
      let cell = layer[cell_idx];
      if (!cell || !cell.stars) {
        // incomplete data loaded, dynamic load here? just for stars?
        continue;
      }
      let { stars } = cell;
      for (let ii = 0; ii < stars.length; ++ii) {
        let star = stars[ii];
        star.dist_temp = distSq(x, y, star.x, star.y);
        for (let jj = 0; jj < closest.length; ++jj) {
          let other = closest[jj];
          if (!other) {
            closest[jj] = star;
            break;
          }
          if (star.dist_temp < other.dist_temp) {
            closest[jj] = star;
            star = other;
          }
        }
      }
    }
  }
  return closest;
};

Galaxy.prototype.getStar = function (id) {
  let { layers } = this;
  let layer = layers[STAR_LAYER];
  let [cell_idx, idx] = id;
  let star = layer && layer[cell_idx] && layer[cell_idx].stars && layer[cell_idx].stars[idx];
  if (!star) {
    return null;
  }
  if (!star.solar_system) {
    star.solar_system = solarSystemCreate(this.params.seed, star);
  }
  return star;
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
