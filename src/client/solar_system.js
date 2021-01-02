const assert = require('assert');
const { atan2, max, round, sqrt, PI } = Math;
const { randCreate, mashString } = require('./glov/rand_alea.js');
const SimplexNoise = require('simplex-noise');
const { starTypeData, starTypeFromID } = require('./star_types.js');
const textures = require('./glov/textures.js');
const { clamp, nextHighestPowerOfTwo } = require('../common/util.js');
const { vec2, vec4 } = require('./glov/vmath.js');

let rand = [
  randCreate(0),
  randCreate(0),
  randCreate(0),
  randCreate(0),
];

let color_table_earthlike = [
  0.5, 0,
  0.6, 1,
  1, 2,
];

let color_table_earthlike2 = [
  0.3, 0,
  0.7, 1,
  1, 2,
];

let color_table_molten = [
  0.25, 5,
  0.75, 3,
  1, 4,
];

let color_table_gray = [
  0.25, 6,
  0.5, 7,
  0.75, 8,
  1, 9,
];

let color_table_frozen = [
  0.23, 11,
  0.77, 10,
  1, 9,
];

let color_table_gasgiant1 = [
  0.2, 12,
  0.3, 13,
  0.4, 12,
  0.5, 9,
  0.6, 13,
  0.7, 12,
  0.8, 9,
  0.9, 13,
  1, 9,
];

let color_table_dirt = [
  0.5, 14,
  1, 15,
];

let color_table_gasgiant2 = [
  0.2, 16,
  0.4, 17,
  0.6, 16,
  0.8, 17,
  1, 16,
];

let planet_types = [
  // Class D (planetoid or moon with little to no atmosphere)
  { name: 'D', color: vec4(0.7,0.7,0.7,1), color_table: color_table_gray },
  // Class H (generally uninhabitable)
  { name: 'H', color: vec4(0.3,0.4,0.5,1), color_table: color_table_gray },
  // Class J (gas giant)
  { name: 'J', color: vec4(0.9,0.6,0,1), color_table: color_table_gasgiant1 },
  // Class K (habitable, as long as pressure domes are used)
  { name: 'K', color: vec4(0.5,0.3,0.2,1), color_table: color_table_dirt },
  // Class L (marginally habitable, with vegetation but no animal life)
  { name: 'L', color: vec4(0.3,0.7,0.3,1), color_table: color_table_frozen },
  // Class M (terrestrial)
  { name: 'M', color: vec4(0,1,0,1), color_table: color_table_earthlike },
  // Class N (sulfuric)
  { name: 'N', color: vec4(0.6,0.6,0,1), color_table: color_table_molten },
  // Class P (glacial)
  { name: 'P', color: vec4(0.5,0.7,1,1), color_table: color_table_frozen },
  // Class R (a rogue planet, not as habitable as a terrestrial planet)
  { name: 'R', color: vec4(0.2,0.3,0.2,1), color_table: color_table_earthlike2 },
  // Class T (gas giant)
  { name: 'T', color: vec4(0.6,0.9,0,1), color_table: color_table_gasgiant2 },
  // Class Y (toxic atmosphere, high temperatures)
  { name: 'Y', color: vec4(1,0.3,0,1), color_table: color_table_molten },
];

function randExp(idx, min, mx) {
  let v = rand[idx].random();
  v *= v;
  return min + (mx - min) * v;
}

function Planet(solar_system) {
  this.type = planet_types[rand[2].range(planet_types.length)];
  this.size = randExp(3, 4, 20);
  this.orbit = rand[0].floatBetween(0, PI*2);
  this.orbit_speed = randExp(1, 0.1, 1);
  this.seed = rand[2].uint32();
  //this.parent = solar_system;
}

let noise;
let noise_warp;
let total_amplitude;
let noise_field;
let subopts;
function initNoise(seed, subopts_in) {
  subopts = subopts_in;
  noise = new Array(subopts.octaves);
  for (let ii = 0; ii < noise.length; ++ii) {
    noise[ii] = new SimplexNoise(`${seed}n${subopts.key}${ii}`);
  }
  noise_warp = new Array(subopts.domain_warp);
  for (let ii = 0; ii < noise_warp.length; ++ii) {
    noise_warp[ii] = new SimplexNoise(`${seed}w${subopts.key}${ii}`);
  }
  total_amplitude = 0;  // Used for normalizing result to 0.0 - 1.0
  let amp = subopts.amplitude;
  let p = subopts.persistence && subopts.persistence.max || subopts.persistence;
  for (let ii=0; ii<subopts.octaves; ii++) {
    total_amplitude += amp;
    amp *= p;
  }
  noise_field = {};
  for (let f in subopts) {
    let v = subopts[f];
    if (typeof v === 'object') {
      noise_field[f] = new SimplexNoise(`${seed}f${subopts.key}${f}`);
      v.mul = (v.max - v.min) * 0.5;
      v.add = v.min + v.mul;
    }
  }
}


{
  const MAX_TEXTURES = 20;
  let tex_pool = [];
  let tex_idx = 0;
  let planet_tex_id = 0;

  const PLANET_MIN_RES = 16;
  const PLANET_MAX_RES = 128;
  let tex_data = new Uint8Array(PLANET_MAX_RES * PLANET_MAX_RES);

  let sample_pos = vec2();
  function get(field) {
    let v = subopts[field];
    if (typeof v !== 'object') {
      return v;
    }
    return v.add + v.mul * noise_field[field].noise2D(sample_pos[0] * v.freq, sample_pos[1] * v.freq);
  }
  function sample(x, y) {
    sample_pos[0] = x;
    sample_pos[1] = y;
    let warp_freq = subopts.warp_freq;
    let warp_amp = subopts.warp_amp;
    for (let ii = 0; ii < subopts.domain_warp; ++ii) {
      let dx = noise_warp[ii].noise2D(sample_pos[0] * warp_freq, sample_pos[1] * warp_freq);
      let dy = noise_warp[ii].noise2D((sample_pos[0] + 7) * warp_freq, sample_pos[1] * warp_freq);
      sample_pos[0] += dx * warp_amp;
      sample_pos[1] += dy * warp_amp;
    }
    let total = 0;
    let amp = subopts.amplitude;
    let freq = get('frequency');
    let p = get('persistence');
    let lac = get('lacunarity');
    for (let i=0; i<subopts.octaves; i++) {
      total += (0.5 + 0.5 * noise[i].noise2D(sample_pos[0] * freq, sample_pos[1] * freq)) * amp;
      amp *= p;
      freq *= lac;
    }
    return total/total_amplitude;
  }

  function colorIndex(table, value) {
    for (let ii = 0; ii < table.length; ii+=2) {
      if (value <= table[ii]) {
        return table[ii+1];
      }
    }
    return table[table.length - 1];
  }


  Planet.prototype.getTexture = function (onscreen_size) {
    if (this.tex && this.tex.planet_tex_id === this.tex_id) {
      return this.tex;
    }
    let color_table = this.type.color_table;
    let planet_res = clamp(nextHighestPowerOfTwo(onscreen_size), PLANET_MIN_RES, PLANET_MAX_RES);
    initNoise(this.seed, {
      key: '',
      frequency: 2,
      amplitude: 1,
      persistence: 0.5,
      lacunarity: { min: 1.6, max: 2.8, freq: 0.3 },
      octaves: 6,
      cutoff: 0.5,
      domain_warp: 0,
      warp_freq: 1,
      warp_amp: 0.1,
    });
    for (let idx=0, jj = 0; jj < planet_res; ++jj) {
      for (let ii = 0; ii < planet_res; ++ii, ++idx) {
        let v = sample(ii/planet_res, jj/planet_res);
        let b = colorIndex(color_table, v);
        tex_data[idx] = b;
      }
    }
    if (tex_pool[tex_idx]) {
      this.tex = tex_pool[tex_idx];
      this.tex.updateData(planet_res, planet_res, tex_data);
    } else {
      this.tex = tex_pool[tex_idx] = textures.load({
        name: `planet_${++tex_idx}`,
        format: textures.format.R8,
        width: planet_res,
        height: planet_res,
        data: tex_data,
        filter_min: gl.NEAREST,
        filter_mag: gl.NEAREST,
        wrap_s: gl.REPEAT,
        wrap_t: gl.CLAMP_TO_EDGE,
      });
    }
    tex_idx = (tex_idx + 1) % MAX_TEXTURES;
    this.tex_id = ++planet_tex_id;
    this.tex.planet_tex_id = this.tex_id;
    return this.tex;
  };
}

const PMRES = 128;
const PMBORDER = 8;
let pmtex;
export function planetMapTexture() {
  if (pmtex) {
    return pmtex;
  }
  let tex_data = new Uint8Array(PMRES * PMRES * 3);
  let idx = 0;
  let mid = PMRES / 2;
  const PMR = PMRES / 2 - PMBORDER;
  function encodeRadian(rad) {
    if (rad < 0) {
      rad += PI * 2;
    }
    return clamp(round((rad - PI/2) / PI * 255), 0, 255);
    //return round(rad / (PI * 2) * 255);
  }
  for (let yy = 0; yy < PMRES; ++yy) {
    let unif_y = (yy - mid) / PMR;
    for (let xx = 0; xx < PMRES; ++xx) {
      let unif_x = (xx - mid) / PMR;
      let dsq = unif_x * unif_x + unif_y * unif_y;
      let r = sqrt(dsq);
      let eff_r = max(1, r);
      // calc latitude / longitude for texturing and lighting
      let unif_z = r >= 1 ? 0 : sqrt(eff_r * eff_r - dsq);
      let longitude = -atan2(unif_x, -unif_z);
      let xz_len = sqrt(unif_x*unif_x + unif_z*unif_z);
      let latitude = atan2(-unif_y, -xz_len);

      tex_data[idx++] = encodeRadian(longitude);
      tex_data[idx++] = encodeRadian(latitude);
      tex_data[idx++] = round(r / 2 * 255); // radius of 2D circle / distance field: 0 to 2
    }
  }
  assert.equal(idx, tex_data.length);
  pmtex = textures.load({
    name: 'pmtex',
    format: textures.format.RGB8,
    width: PMRES,
    height: PMRES,
    data: tex_data,
    filter_min: gl.NEAREST,
    filter_mag: gl.NEAREST,
    wrap_s: gl.CLAMP_TO_EDGE,
    wrap_t: gl.CLAMP_TO_EDGE,
  });

  return pmtex;
}

function cmpSize(a, b) {
  return a.size - b.size;
}

function SolarSystem(global_seed, star) {
  let { /*x, y,*/ id } = star;
  let classif = starTypeFromID(id);
  let star_data = starTypeData(classif);
  this.star_data = star_data;
  for (let ii = 0; ii < rand.length; ++ii) {
    rand[ii].reseed(mashString(`${id}_${global_seed}_${ii}`));
  }
  let num_planets = rand[0].range(4);
  let chance = 0.5;
  let planets = [];
  while (num_planets) {
    planets.push(new Planet(this));
    --num_planets;
    if (!num_planets) {
      if (rand[1].random() < chance) {
        ++num_planets;
        chance *= 0.9;
      }
    }
  }
  // split in two, sort by size, put bigger in the middle
  let p1 = [];
  let p2 = [];
  for (let ii = 0; ii < planets.length; ++ii) {
    if (rand[0].range(2)) {
      p1.push(planets[ii]);
    } else {
      p2.push(planets[ii]);
    }
  }
  p1.sort(cmpSize);
  p2.sort(cmpSize).reverse();
  this.planets = p1.concat(p2);
}

export function solarSystemCreate(global_seed, star) {
  return new SolarSystem(global_seed, star);
}
