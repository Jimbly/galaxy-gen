export const LAYER_STEP = 4;
export const STAR_LAYER = 6;
export const MAX_LAYER = 8;
const assert = require('assert');
const engine = require('./glov/engine.js');
const { abs, atan2, ceil, floor, max, min, sqrt, pow, PI, round } = Math;
const { randCreate, mashString } = require('./glov/rand_alea.js');
const SimplexNoise = require('simplex-noise');
const { hueFromID } = require('./star_types.js');
const { solarSystemCreate } = require('./solar_system.js');
const textures = require('./glov/textures.js');
const { clamp, lerp, easeOut, easeInOut } = require('../common/util.js');

const SUMSQ = 0.75;

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

let counts = {
  bicubic: 0,
  getSampleBuf: 0,
  realizeStars: 0,
  realizeStarsFinish: 0,
  perturb: 0,
  assignChildStars: 0,
  data: 0,
  star_buf: 0,
  hue_buf: 0,
  getCellTextured: 0,
  tex: 0,
  cell: 0,
  star: 0,
  renderStars: 0,
};

let star_buf_pool = [];
let hue_buf_pool = [];

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
  this.loading = false;
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
  ++counts.bicubic;
  let sample_dim = buf_dim + SAMPLE_PAD * 2;
  let ret = new Float32Array(buf_dim * buf_dim);
  ++counts.data;
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

  if (engine.frame_index === this.work_frame && !this.loading) {
    return null;
  }

  ++counts.getSampleBuf;
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

const STAR_QUOTA = 14; // ms
let realize_scratch_buf;
let realize_scratch_buf_size = 0;
Galaxy.prototype.realizeStars = function (cell) {
  let start = Date.now();
  let {
    layer_idx, cell_idx, star_count, data, sum, sumsq, x0, y0, w, pois,
    star_progress, star_storage,
  } = cell;
  let scale = star_count / lerp(SUMSQ, sum, sumsq) * 1.03;
  assert.equal(layer_idx, STAR_LAYER); // consistent IDs only on this layer
  let { buf_dim, params } = this;
  let { seed } = params;
  let yy0;
  let out_idx;
  ++counts.realizeStars;
  if (!star_progress) {
    assert(star_count >= pois.length);
    rand.reseed(mashString(`${seed}_${layer_idx}_${cell_idx}`));
    star_storage = cell.star_storage = new Float64Array(star_count * 2);
    cell.star_storage_start = 0;
    yy0 = 0;
    out_idx = 0;
  } else {
    if (star_progress.state) {
      rand.importState(star_progress.state);
    }
    yy0 = star_progress.y;
    out_idx = star_progress.out;
  }
  // const value_scale = 0.75; // Was: (sum / star_count), which was ~0.75 before SUMSQ
  function addStarSub(x, y) {
    ++counts.star;
    let idx;
    if (out_idx === star_count) {
      idx = rand.range(star_count - pois.length) + pois.length;
    } else {
      idx = out_idx++;
    }
    star_storage[idx*2] = x;
    star_storage[idx*2+1] = y;
    let xfloat = star_storage[idx*2];
    let yfloat = star_storage[idx*2+1];
    assert(xfloat >= cell.x0);
    assert(xfloat < cell.x0 + w);
    assert(yfloat >= cell.y0);
    assert(yfloat < cell.y0 + w);
  }
  function addStar(xx, yy) {
    // type: rand.range(POI_TYPE_OFFS.length),  // this choice now implicit from the ID
    // v: (0.5 + rand.random()) * value_scale, // this choice now implicit from the ID
    let x = x0 + xx/buf_dim * w;
    let y = y0 + yy/buf_dim * w;
    addStarSub(x, y);
  }
  if (star_count) {
    let expire = start + STAR_QUOTA;
    if (out_idx === 0) {
      for (let ii = 0; ii < pois.length; ++ii) {
        let poi = pois[ii];
        addStarSub(poi.x, poi.y);  // Losing ID / changing shape here!
        // stars[out_idx++] = poi; // Losing ID / changing shape here!
      }
    }
    for (let idx=yy0*buf_dim, yy = yy0; yy < buf_dim; ++yy) {
      for (let xx = 0; xx < buf_dim; ++xx, ++idx) {
        let v = data[idx];
        v *= 1 + SUMSQ * (v - 1); // v = lerp(SUMSQ, v, v*v);
        let expected_stars = v * scale;
        // assert(expected_stars < 10); // sometimes more than 65
        // assert(expected_stars < 50);
        let actual_stars = floor(rand.random() * (expected_stars + 1) + expected_stars * 0.5);
        for (let ii = 0; ii < actual_stars; ++ii) {
          // uniform within sub-cell
          addStar(xx + rand.random(), yy + rand.random());
        }
      }
      if (Date.now() > expire && yy !== buf_dim - 1 && !this.loading) {
        cell.star_progress = {
          y: yy + 1,
          state: rand.exportState(),
          out: out_idx,
        };
        //let end = Date.now();
        //console.log(`realizeStars(${star_count}): ${end - start}ms place (partial ${yy - yy0 + 1})`);
        return false;
      }
    }
    // console.log((stars.length-star_count)/star_count, stars.length, star_count); // about 5% under to 30% over
    // eslint-disable-next-line no-unmodified-loop-condition
    while (out_idx < star_count) {
      addStar(rand.floatBetween(0, buf_dim), rand.floatBetween(0, buf_dim));
    }
    assert.equal(out_idx, star_count);

    // TODO: relaxation step to separate really close stars (1/1000 ly? <=2px in highest res buffer?)

    // sort by xy into octants
    let temp = new Array(star_count);
    for (let ii = 0; ii < star_count; ++ii) {
      temp[ii] = ii*2;
    }
    let mod0 = w/LAYER_STEP;
    temp.sort((ai, bi) => {
      let ax = star_storage[ai];
      let ay = star_storage[ai+1];
      let bx = star_storage[bi];
      let by = star_storage[bi+1];
      let mod = mod0;
      let layer = layer_idx;
      while (true) {
        if (layer === MAX_LAYER+1) {
          return 0;
        }
        let ayi = floor(ay / mod);
        let byi = floor(by / mod);
        if (ayi !== byi) {
          return ayi - byi;
        }
        let axi = floor(ax / mod);
        let bxi = floor(bx / mod);
        if (axi !== bxi) {
          return axi - bxi;
        }
        mod /= LAYER_STEP;
        ++layer;
      }
    });
    if (star_count > realize_scratch_buf_size) {
      realize_scratch_buf_size = ceil(1.25 * star_count);
      realize_scratch_buf = new Float64Array(realize_scratch_buf_size*2);
    }
    // fill buffer
    for (let ii = 0; ii < star_count; ++ii) {
      let idx = temp[ii];
      realize_scratch_buf[ii*2] = star_storage[idx];
      realize_scratch_buf[ii*2+1] = star_storage[idx+1];
      let x = realize_scratch_buf[ii*2];
      let y = realize_scratch_buf[ii*2+1];
      assert(x >= cell.x0);
      assert(x < cell.x0 + w);
      assert(y >= cell.y0);
      assert(y < cell.y0 + w);
    }
    for (let ii = 0; ii < star_count * 2; ++ii) {
      star_storage[ii] = realize_scratch_buf[ii];
    }
  }
  delete cell.star_progress;
  // let end = Date.now();
  // console.log(`realizeStars(${star_count}): ${end - start}ms place`);
  ++counts.realizeStarsFinish;
  return true;
};

// https://stackoverflow.com/questions/664014/what-integer-hash-function-are-good-that-accepts-an-integer-hash-key
function hash(x) {
  x = (((x >>> 16) ^ x) * 0x45d9f3b) >>> 0;
  x = (((x >>> 16) ^ x) * 0x45d9f3b) >>> 0;
  x = ((x >>> 16) ^ x) >>> 0;
  return x;
}
function starValueFromID(id) {
  return (0.5 + hash(id) / 0xffffffff) * 0.75;
}
function starVisTypeFromID(id) {
  return ((hash(id) & 0x7fff) / 0x8000 * POI_TYPE_OFFS.length) | 0;
}

// render into `data` appropriately for the current zoom
{
  const blur_weights = [
    1/16, 1/8, 1/16,
    1/8, 1/4, 1/8,
    1/16, 1/8, 1/16,
    // 0,0,0,
    // 0,1,0,
    // 0,0,0,
  ];
  // Note: this function gets called recursively
  Galaxy.prototype.renderStars = function (cell) {
    let { layer_idx, x0, y0, w, cx, cy } = cell;
    let { buf_dim } = this;
    let scale = buf_dim / w;

    let layer_res = pow(LAYER_STEP, layer_idx);
    let ndata = [];
    let nhue = [];
    for (let yy = -1; yy <= 1; ++yy) {
      let ncy = cy + yy;
      for (let xx = -1; xx <= 1; ++xx) {
        let ncx = cx + xx;
        let n;
        if (ncy < 0 || ncy >= layer_res || ncx < 0 || ncx >= layer_res) {
          n = cell;
        } else {
          n = this.getCell(layer_idx, ncx + ncy * layer_res, true);
        }
        assert(!n.tex); // just for debug, make sure this neighbor we're writing into hasn't already made a texture
        if (!n.star_buf) {
          if (star_buf_pool.length) {
            n.star_buf = star_buf_pool.pop();
            n.star_buf.fill(0);
          } else {
            n.star_buf = new Float32Array(buf_dim * buf_dim);
            ++counts.star_buf;
          }
        }
        ndata.push(n.star_buf);
        if (!n.hue_buf) {
          if (hue_buf_pool.length) {
            n.hue_buf = hue_buf_pool.pop();
            n.hue_buf.fill(0);
          } else {
            n.hue_buf = new Uint8Array(buf_dim * buf_dim);
            ++counts.hue_buf;
          }
        }
        nhue.push(n.hue_buf);
      }
    }
    assert(ndata[4] === cell.star_buf);
    ++counts.renderStars;

    let weights = [];
    let xpos = [];
    let ypos = [];
    // let { max_zoom } = this.params;
    // let max_res = pow(2, max_zoom);
    let { star_count, star_storage, star_storage_start, star_idx } = cell;
    let store_idx = star_storage_start*2;
    for (let ii = 0; ii < star_count; ++ii) {
      let x = star_storage[store_idx++];
      let y = star_storage[store_idx++];
      let id = star_idx + ii;
      let v = starValueFromID(id);
      x = (x - x0) * scale;
      y = (y - y0) * scale;
      if (layer_idx === 7 || layer_idx === 6) {
        let hue = hueFromID(id);
        const r = layer_idx === 7 ? 2 : 1.5;
        const vscale = layer_idx === 7 ? 4 : 2;
        const rsq = r * r;
        let wtot = 0;
        let widx = 0;
        // scoot in so we don't need to go into neighboring data
        // TODO: This causes visible seams, but without it we get discontinuities - need to render neighbor stars too!
        // x = max(r/2 + 0.5, min(buf_dim - r/2 - 0.5, x));
        // y = max(r/2 + 0.5, min(buf_dim - r/2 - 0.5, y));
        let ix = floor(x);
        let iy = floor(y);
        if (layer_idx === 7) {
          // distance squared falloff blurred star
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
              xpos[widx] = ix + xx;
              ypos[widx++] = iy + yy;
            }
          }
        } else if (layer_idx === 6) {
          weights = blur_weights;
          wtot = 1;
          for (let yy = -1; yy <= 1; ++yy) {
            for (let xx = -1; xx <= 1; ++xx) {
              xpos[widx] = ix + xx;
              ypos[widx++] = iy + yy;
            }
          }
        }
        for (let jj = 0; jj < widx; ++jj) {
          let wt = weights[jj];
          let xx = xpos[jj];
          let yy = ypos[jj];
          let nid = 4;
          if (xx < 0) {
            nid--;
            xx+=buf_dim;
          } else if (xx >= buf_dim) {
            nid++;
            xx-=buf_dim;
          }
          if (yy < 0) {
            nid-=3;
            yy+=buf_dim;
          } else if (yy >= buf_dim) {
            nid+=3;
            yy-=buf_dim;
          }
          let data = ndata[nid];
          let hue_buf = nhue[nid];
          let idx = xx + yy * buf_dim;
          let old_w = data[idx];
          let new_w = wt / wtot;
          data[idx] += v * vscale * new_w;
          hue_buf[idx] = round((old_w * hue_buf[idx] + hue * new_w) / (new_w + old_w));
        }
      } else {
        // layer 8, basically ignored?  Move poi-style star rendering here to deal with wrap-around?
        // let ix = floor(x);
        // let iy = floor(y);
        // let idx = ix + iy * buf_dim;
        // // just add
        // cell.data[idx] += v;
      }
    }
    return true;
  };
}

Galaxy.prototype.assignChildStars = function (cell) {
  let { buf_dim } = this;
  let { pois, star_count, sum, sumsq, data, star_idx, star_storage, star_storage_start } = cell;
  let child_data = [];
  for (let ii = 0; ii < LAYER_STEP * LAYER_STEP; ++ii) {
    child_data.push({ pois: [] });
  }
  if (!star_storage) {
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
        let sc = sum ? round(lerp(SUMSQ, running_sum / sum, running_sumsq / sumsq) * star_count) : 0;
        child_data[idx].star_count = sc - last_star_count;
        child_data[idx].star_idx = star_idx + last_star_count;
        last_star_count = sc;
      }
    }
    assert.equal(last_star_count, star_count);
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
  if (star_storage) {
    let child_idx = 0;
    let last_start = star_storage_start;
    let end = star_storage_start + star_count;
    for (let ii = star_storage_start; ii < end; ++ii) {
      let x = star_storage[ii*2];
      let y = star_storage[ii*2+1];
      let qx = floor((x - cell.x0) * mul);
      let qy = floor((y - cell.y0) * mul);
      assert(qx >= 0 && qx < LAYER_STEP);
      assert(qy >= 0 && qy < LAYER_STEP);
      let idx = qy * LAYER_STEP + qx;
      assert(idx >= child_idx);
      while (child_idx < idx) {
        child_data[child_idx].store_start = last_start;
        child_data[child_idx++].store_count = ii - last_start;
        last_start = ii;
      }
    }
    while (child_idx < LAYER_STEP * LAYER_STEP) {
      child_data[child_idx].store_start = last_start;
      child_data[child_idx++].store_count = end - last_start;
      last_start = end;
    }
  }
  cell.child_data = child_data;
  ++counts.assignChildStars;
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
  ++counts.perturb;
};

Galaxy.prototype.getCell = function (layer_idx, cell_idx, just_alloc) {
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
    ++counts.cell;
    cell = {
      // relative position and size to entire galaxy
      x0, y0, w, h: w,
      layer_idx, cell_idx, cx, cy,
      ready: false,
    };
    layer[cell_idx] = cell;
  }

  if (just_alloc) {
    return cell;
  }

  // Fill it
  if (layer_idx === 0) {
    assert(cell_idx === 0);
    let ret = genGalaxy(params);
    cell.sum = ret.sum;
    cell.sumsq = ret.sumsq;
    cell.data = ret.data;
    cell.star_count = ret.star_count;
    cell.star_idx = 0;
    cell.stars_ready = true;
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

    if (engine.frame_index === this.work_frame && !this.loading) {
      // Already did one this frame (presumably a parent)
      return cell;
    }

    let qx = cx - px * LAYER_STEP;
    let qy = cy - py * LAYER_STEP;
    let qidx = qx + qy * LAYER_STEP;

    if (!cell.pois) {
      cell.pois = parent.child_data[qidx].pois;
      // pois.filter((poi) => poi.x >= x0 && poi.x < x0 + w && poi.y >= y0 && poi.y < y0 + w);
    }

    if (!cell.data) {
      if (layer_idx > STAR_LAYER) {
        // just rendered stars, don't need interpolation here
        cell.data = null;
        // cell.data = new Float32Array(this.tex_total_size);
        // ++counts.data;
      } else {
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
      }
    }

    if (!cell.stars_ready) {
      if (parent.star_storage) {
        // filter existing stars
        cell.star_storage = parent.star_storage;
        cell.star_storage_start = parent.child_data[qidx].store_start;
        cell.star_count = parent.child_data[qidx].store_count;
        cell.star_idx = parent.star_idx + (cell.star_storage_start - parent.star_storage_start);
      } else {
        // count or generate stars
        cell.star_count = parent.child_data[qidx].star_count;
        cell.star_idx = parent.child_data[qidx].star_idx;

        // did or will do work this frame
        this.work_frame = engine.frame_index;

        if (layer_idx === STAR_LAYER) { // || cell.star_count < 100000) {
          // realize stars
          if (!this.realizeStars(cell)) {
            // didn't complete
            return cell;
          }
        }
      }
      cell.stars_ready = true;
    }
    if (layer_idx >= STAR_LAYER) {
      if (!this.renderStars(cell)) {
        return cell;
      }
    }
  }
  this.assignChildStars(cell);
  cell.ready = true;

  return cell;
};

{
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
    let { data, pois, x0, y0, w, ready, cx, cy } = cell;
    if (!ready) {
      // still loading
      return cell;
    }
    let layer_res = pow(LAYER_STEP, layer_idx);
    if (layer_idx >= STAR_LAYER) {
      data = cell.star_buf;
      // neighbors must also be ready / have rendered stars
      for (let yy = -1; yy <= 1; ++yy) {
        let ny = cy + yy;
        if (ny < 0 || ny >= layer_res) {
          continue;
        }
        for (let xx = -1; xx <= 1; ++xx) {
          let nx = cx + xx;
          if (!nx && !ny || nx < 0 || nx >= layer_res) {
            continue;
          }
          let n = this.getCell(layer_idx, nx + ny * layer_res);
          if (!n.ready) {
            return cell;
          }
        }
      }
    }
    ++counts.getCellTextured;

    let max_res = pow(2, this.params.max_zoom);
    if (layer_res === max_res) {
      for (let ii = 0; ii < tex_total_size; ++ii) {
        tex_data[ii * 4 + 0] = 0; // brightness
        tex_data[ii * 4 + 1] = 0; // hue
        tex_data[ii * 4 + 2] = 0; // ignored
        tex_data[ii * 4 + 3] = 255; // ignored
      }
      // Render in stars
      let { star_storage, star_count, star_storage_start, star_idx } = cell;
      let store_idx = star_storage_start*2;
      for (let ii = 0; ii < star_count; ++ii) {
        let x = star_storage[store_idx++];
        let y = star_storage[store_idx++];
        let id = star_idx + ii;
        let type = starVisTypeFromID(id);
        let v = starValueFromID(id);
        let hue = hueFromID(id);
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
          tex_data[idx + d] = max(tex_data[idx + d], v2);
          tex_data[idx + d + 1] = max(tex_data[idx + d + 1], hue);
        }
      }
    } else {
      let { hue_buf } = cell;
      for (let ii = 0; ii < tex_total_size; ++ii) {
        let d = data[ii];
        tex_data[ii * 4 + 0] = clamp(floor(d * 255), 0, 255);
        tex_data[ii * 4 + 1] = hue_buf ? hue_buf[ii] : 0;
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
          tex_data[idx + d + 0] = max(tex_data[idx + d + 0], v2);
          tex_data[idx + d + 1] = max(tex_data[idx + d + 1], 0); // todo: use real hue?
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
      ++counts.tex;
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

    if (cell.star_buf) {
      star_buf_pool.push(cell.star_buf);
      cell.star_buf = null;
    }
    if (cell.hue_buf) {
      hue_buf_pool.push(cell.hue_buf);
      cell.hue_buf = null;
    }
    return cell;
  };
}

export function distSq(x1, y1, x2, y2) {
  let dx = x2 - x1;
  let dy = y2 - y1;
  return dx*dx + dy*dy;
}

{
  const dy = [0, 1, -1];
  const dx = [0, 1, -1];
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
    let closest = new Array(num * 2); // dist, id
    for (let ddy = 0; ddy <= 3; ++ddy) {
      let yy = cy + dy[ddy];
      if (yy < 0 || yy >= layer_res) {
        continue;
      }
      for (let ddx = 0; ddx <= 3; ++ddx) {
        let xx = cx + dx[ddx];
        if (xx < 0 || xx >= layer_res) {
          continue;
        }
        let cell_idx = yy * layer_res + xx;
        let cell = layer[cell_idx];
        if (!cell || !cell.star_storage) {
          // incomplete data loaded, dynamic load here? just for stars?
          continue;
        }
        let { star_storage, star_storage_start, star_count, star_idx } = cell;
        let store_idx = star_storage_start*2;
        for (let ii = 0; ii < star_count; ++ii) {
          let star_x = star_storage[store_idx++];
          let star_y = star_storage[store_idx++];
          let star_id = star_idx + ii;
          let star_dist = distSq(x, y, star_x, star_y);
          for (let jj = 0; jj < closest.length; jj+=2) {
            let other_id = closest[jj+1];
            if (other_id === undefined) {
              closest[jj] = star_dist;
              closest[jj+1] = star_id;
              break;
            }

            let other_dist = closest[jj];
            if (star_dist < other_dist) {
              closest[jj] = star_dist;
              closest[jj+1] = star_id;
              star_dist = other_dist;
              star_id = other_id;
            }
          }
        }
      }
    }
    let ret = [];
    for (let ii = 1; ii < closest.length; ii+=2) {
      let id = closest[ii];
      if (id !== undefined) {
        ret.push(id);
      }
    }
    return ret;
  };
}

Galaxy.prototype.getStar = function (star_id) {
  let { layers, stars } = this;
  if (!stars) {
    this.stars = stars = {};
  }
  if (stars[star_id]) {
    return stars[star_id];
  }
  function search(layer_idx, cx, cy) {
    let layer = layers[layer_idx];
    let layer_res = pow(LAYER_STEP, layer_idx);
    let cell_idx = cx + cy * layer_res;
    let cell = layer[cell_idx];
    if (!cell || !cell.stars_ready) {
      return null;
    }
    assert(star_id >= cell.star_idx);
    if (layer_idx === STAR_LAYER) {
      let { star_storage, star_storage_start } = cell;
      if (!star_storage) {
        return null;
      }
      let idx = star_id - cell.star_idx;
      assert(idx < cell.star_count);
      let store_idx = (star_storage_start + idx) * 2;
      let x = star_storage[store_idx++];
      let y = star_storage[store_idx++];
      // Create and cache star
      let star = { x, y, id: star_id };
      stars[star_id] = star;
      return star;
    }
    // not this layer, drill down
    if (!cell.child_data) {
      return null;
    }
    for (let qidx = 0; qidx < cell.child_data.length; ++qidx) {
      let cd = cell.child_data[qidx];
      if (star_id < cd.star_idx + cd.star_count) {
        let qx = qidx % LAYER_STEP;
        let qy = (qidx - qx) / LAYER_STEP;
        return search(layer_idx + 1, cx * LAYER_STEP + qx, cy * LAYER_STEP + qy);
      }
    }
    assert(false);
    return null;
  }
  return search(0, 0, 0);
};

Galaxy.prototype.getStarData = function (star) {
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

let debug_buf = JSON.stringify(counts, undefined, 2);
setInterval(() => {
  let buf = JSON.stringify(counts, undefined, 2);
  if (debug_buf !== buf) {
    debug_buf = buf;
    console.log(buf);
  }
}, 5000);


export function createGalaxy(params) {
  return new Galaxy(params);
}
