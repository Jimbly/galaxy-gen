import assert from 'assert';
import { Texture } from 'glov/client/sprites';
import {
  TEXTURE_FORMAT,
  textureLoad,
} from 'glov/client/textures';
import {
  mashString,
  randCreate,
} from 'glov/common/rand_alea';
import { KeysMatching } from 'glov/common/types';
import {
  clamp,
  defaults,
  nextHighestPowerOfTwo,
} from 'glov/common/util';
import {
  ROVec4,
  vec2,
  vec4,
} from 'glov/common/vmath';
import SimplexNoise from 'simplex-noise';
import { Star } from './galaxy';
import {
  starTypeData,
  starTypeFromID,
} from './star_types';

type StarType = ReturnType<typeof starTypeData>;

const { atan2, max, round, sqrt, PI } = Math;

let rand = [
  randCreate(0),
  randCreate(0),
  randCreate(0),
  randCreate(0),
];

const color_table_earthlike = [
  0.5, 0,
  0.6, 1,
  1, 2,
];

const color_table_earthlike_islands = [
  0.7, 0,
  0.8, 1,
  1, 2,
];

const color_table_earthlike_pangea = [
  0.3, 0,
  0.7, 1,
  1, 2,
];

const color_table_water_world = [
  0.5, 22,
  0.8, 0,
  1, 22,
];

const color_table_low_life = [
  0.3, 0,
  0.7, 14,
  1, 1,
];

const color_table_molten = [
  0.25, 4,
  0.46, 3,
  0.54, 5,
  0.75, 3,
  1, 4,
];

const color_table_molten_small = [
  0.4, 3,
  0.6, 5,
  1, 4,
];

const color_table_gray = [
  0.25, 6,
  0.5, 7,
  0.75, 8,
  1, 9,
];

const color_table_frozen = [
  0.23, 11,
  0.77, 10,
  1, 9,
];

// saturn-like, greys and oranges
const color_table_gasgiant1 = [
  0.2, 12,
  0.35, 13,
  0.5, 9,
  0.65, 12,
  0.8, 13,
  1, 9,
];

const color_table_dirt = [
  0.5, 14,
  1, 15,
];

// purples
const color_table_gasgiant2 = [
  0.2, 16,
  0.4, 17,
  0.6, 16,
  0.8, 17,
  1, 16,
];

// reds
const color_table_gasgiant3 = [
  0.2, 18,
  0.4, 5,
  0.6, 18,
  0.8, 5,
  1, 18,
];

// blues
const color_table_gasgiant4 = [
  0.2, 19,
  0.35, 20,
  0.5, 21,
  0.65, 19,
  0.8, 20,
  1, 21,
];

// yellows
const color_table_gasgiant5 = [
  0.2, 23,
  0.35, 5,
  0.5, 12,
  0.65, 23,
  0.8, 5,
  1, 12,
];

type NoiseOptRange = {
  min: number;
  max: number;
  freq: number;
  mul?: number; // calculated
  add?: number;
};
type NoiseOptRangeRT = Required<NoiseOptRange>;
type NoiseOpts = {
  frequency: number | NoiseOptRange;
  amplitude: number;
  persistence: number | NoiseOptRange;
  lacunarity: number | NoiseOptRange;
  octaves: number;
  cutoff: number;
  domain_warp: number;
  warp_freq: number;
  warp_amp: number;
  skew_x: number;
  skew_y: number;
  key?: string;
};
type NoiseOptsRangeField = KeysMatching<NoiseOpts, NoiseOptRange | number>;

const noise_base: NoiseOpts = {
  frequency: 2,
  amplitude: 1,
  persistence: 0.5,
  lacunarity: { min: 1.6, max: 2.8, freq: 0.3 },
  octaves: 6,
  cutoff: 0.5,
  domain_warp: 0,
  warp_freq: 1,
  warp_amp: 0.1,
  skew_x: 1,
  skew_y: 1,
};

function noiseMod(opts: Partial<NoiseOpts>, base?: NoiseOpts): NoiseOpts {
  base = base || noise_base;
  return defaults(opts, base || noise_base);
}

const noise_gasgiant = noiseMod({
  skew_x: 0.2,
  domain_warp: 1,
  warp_amp: 0.1,
});

const noise_molten = noiseMod({
  domain_warp: 0,
  warp_amp: 0.1,
});

const noise_dirt = noiseMod({
  domain_warp: 1,
  warp_amp: 0.3,
});

const noise_waterworld = noiseMod({
  skew_x: 0.5,
  domain_warp: 1,
  warp_amp: 0.3,
});

type PlanetType = {
  name: string;
  size: [number, number];
  bias?: number;
  color: ROVec4;
  color_table: number[] | number[][];
  noise: NoiseOpts;
};
const planet_types: PlanetType[] = [
  // Class D (planetoid or moon with little to no atmosphere)
  { name: 'D', size: [4,8], color: vec4(0.7,0.7,0.7,1), color_table: color_table_gray, noise: noise_base },
  // Class H (generally uninhabitable)
  { name: 'H', size: [6,10], color: vec4(0.3,0.4,0.5,1), color_table: color_table_gray, noise: noise_base },
  // Class J (gas giant)
  { name: 'J', size: [12,20], color: vec4(0.9,0.6,0,1),
    color_table: [color_table_gasgiant1, color_table_gasgiant4],
    noise: noise_gasgiant },
  // Class K (habitable, as long as pressure domes are used)
  { name: 'K', size: [8,12], color: vec4(0.5,0.3,0.2,1), color_table: color_table_dirt, noise: noise_dirt },
  // Class L (marginally habitable, with vegetation but no animal life)
  { name: 'L', size: [6,10], bias: 1, color: vec4(0.3,0.7,0.3,1),
    color_table: color_table_frozen,
    noise: noise_base },
  // Class M (terrestrial)
  { name: 'M', size: [9,12], color: vec4(0,1,0,1),
    color_table: [color_table_earthlike, color_table_earthlike_islands, color_table_earthlike_pangea],
    noise: noise_base },
  // Class N (sulfuric)
  { name: 'N', size: [4,8], bias: -1, color: vec4(0.6,0.6,0,1),
    color_table: color_table_molten_small,
    noise: noise_molten },
  // Class P (glacial)
  { name: 'P', size: [4,14], bias: 1, color: vec4(0.5,0.7,1,1),
    color_table: color_table_frozen,
    noise: noise_base },
  // Class R (a rogue planet, not as habitable as a terrestrial planet)
  { name: 'R', size: [6,12], color: vec4(0.2,0.3,0.2,1), color_table: color_table_low_life, noise: noise_base },
  // Class T (gas giant)
  { name: 'T', size: [12,20], color: vec4(0.6,0.9,0,1),
    color_table: [color_table_gasgiant2, color_table_gasgiant3, color_table_gasgiant5],
    noise: noise_gasgiant },
  // Class W (water world)
  { name: 'W', size: [8,18], color: vec4(0.3,0.3,1.0,1),
    color_table: color_table_water_world,
    noise: noise_waterworld },
  // Class Y (toxic atmosphere, high temperatures)
  { name: 'Y', size: [8,18], color: vec4(1,0.3,0,1), color_table: color_table_molten, noise: noise_base },
];

function randExp(idx: number, min: number, mx: number): number {
  let v = rand[idx].random();
  v *= v;
  return min + (mx - min) * v;
}

function typeFromName(name: string): PlanetType {
  for (let ii = 0; ii < planet_types.length; ++ii) {
    if (planet_types[ii].name === name) {
      return planet_types[ii];
    }
  }
  assert(false);
}

class Planet {
  type: PlanetType;
  size: number;
  orbit: number;
  orbit_speed: number;
  seed: number;
  constructor(solar_system: SolarSystem, override_data?: {
    name?: string;
    size?: number;
    seed?: number;
  }) {
    override_data = override_data || {};
    this.type = override_data.name ?
      typeFromName(override_data.name) :
      planet_types[rand[2].range(planet_types.length)];
    this.size = override_data.size || randExp(3, this.type.size[0], this.type.size[1]);
    this.orbit = rand[0].floatBetween(0, PI*2) * 11;
    this.orbit_speed = randExp(1, 0.1, 1);
    this.seed = override_data.seed || rand[2].uint32();
    // this.parent = solar_system;
  }

  declare tex?: Texture & { planet_tex_id?: number };
  declare tex_id?: number;
  declare getTexture: (onscreen_size: number) => Texture;
}

let noise: SimplexNoise[];
let noise_warp: SimplexNoise[];
let noise_skew = vec2();
let total_amplitude: number;
let noise_field: Record<NoiseOptsRangeField, SimplexNoise>;
let subopts: NoiseOpts;
function initNoise(seed: number, subopts_in: NoiseOpts): void {
  subopts = subopts_in;
  noise = new Array(subopts.octaves);
  for (let ii = 0; ii < noise.length; ++ii) {
    noise[ii] = new SimplexNoise(`${seed}n${ii}`);
  }
  noise_warp = new Array(subopts.domain_warp);
  for (let ii = 0; ii < noise_warp.length; ++ii) {
    noise_warp[ii] = new SimplexNoise(`${seed}w${ii}`);
  }
  total_amplitude = 0;  // Used for normalizing result to 0.0 - 1.0
  let amp = subopts.amplitude;
  let p = subopts.persistence && (subopts.persistence as NoiseOptRange).max || subopts.persistence as number;
  for (let ii=0; ii<subopts.octaves; ii++) {
    total_amplitude += amp;
    amp *= p;
  }
  noise_field = {} as Record<NoiseOptsRangeField, SimplexNoise>;
  let f: keyof NoiseOpts;
  for (f in subopts) {
    let v = subopts[f] as NoiseOptRange | number;
    if (typeof v === 'object') {
      let f2 = f as NoiseOptsRangeField;
      noise_field[f2] = new SimplexNoise(`${seed}f${subopts.key!}${f2}`);
      v.mul = (v.max - v.min) * 0.5;
      v.add = v.min + v.mul;
    }
  }
  noise_skew[0] = subopts.skew_x;
  noise_skew[1] = subopts.skew_y;
}


{
  const MAX_TEXTURES = 20;
  let tex_pool: Texture[] = [];
  let tex_idx = 0;
  let planet_tex_id = 0;

  const PLANET_MIN_RES = 8;
  const PLANET_MAX_RES = 128;
  let tex_data = new Uint8Array(PLANET_MAX_RES * PLANET_MAX_RES);

  let sample_pos = vec2();
  function get(field: NoiseOptsRangeField): number {
    let v = subopts[field] as NoiseOptRangeRT;
    if (typeof v !== 'object') {
      return v;
    }
    return v.add + v.mul * noise_field[field].noise2D(sample_pos[0] * v.freq, sample_pos[1] * v.freq);
  }
  function sample(x: number, y: number): number {
    sample_pos[0] = x * noise_skew[0];
    sample_pos[1] = y * noise_skew[1];
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

  function colorIndex(table: number[], value: number): number {
    for (let ii = 0; ii < table.length; ii+=2) {
      if (value <= table[ii]) {
        return table[ii+1];
      }
    }
    return table[table.length - 1];
  }

  function is2DArray(a: number[] | number[][]): a is number[][] {
    return Array.isArray(a[0]);
  }

  Planet.prototype.getTexture = function (onscreen_size: number): Texture {
    if (this.tex && this.tex.planet_tex_id === this.tex_id) {
      return this.tex;
    }

    for (let ii = 0; ii < rand.length; ++ii) {
      rand[ii].reseed(mashString(`${this.seed}_${ii}`));
    }

    let color_table_test = this.type.color_table;
    let color_table: number[];
    if (is2DArray(color_table_test)) {
      color_table = color_table_test[rand[0].range(color_table_test.length)];
    } else {
      color_table = color_table_test;
    }
    // with pixely view, looks a lot better with a /2 on the texture resolution
    let planet_res = clamp(nextHighestPowerOfTwo(onscreen_size)/2, PLANET_MIN_RES, PLANET_MAX_RES);
    initNoise(this.seed, this.type.noise);
    for (let idx=0, jj = 0; jj < planet_res; ++jj) {
      let last_wrap = false;
      for (let ii = 0; ii < planet_res; ++ii, ++idx) {
        let v = sample(ii/planet_res, jj/planet_res);
        if (last_wrap || ii === planet_res - 1 && rand[1].range(2)) { // blend around to other side by 1 texel
          v = sample(-1/planet_res, jj/planet_res);
        } else if (ii === planet_res - 2 && !rand[1].range(4)) {
          v = sample(-2/planet_res, jj/planet_res);
          last_wrap = true;
        }
        let b = colorIndex(color_table, v);
        tex_data[idx] = b;
      }
    }
    if (tex_pool[tex_idx]) {
      this.tex = tex_pool[tex_idx];
      this.tex.updateData(planet_res, planet_res, tex_data);
    } else {
      this.tex = tex_pool[tex_idx] = textureLoad({
        name: `planet_${++tex_idx}`,
        format: TEXTURE_FORMAT.R8,
        width: planet_res,
        height: planet_res,
        data: tex_data,
        filter_min: gl.NEAREST,
        filter_mag: gl.NEAREST,
        wrap_s: gl.REPEAT,
        wrap_t: gl.CLAMP_TO_EDGE,
      });
      assert(this.tex);
    }
    tex_idx = (tex_idx + 1) % MAX_TEXTURES;
    this.tex_id = ++planet_tex_id;
    this.tex.planet_tex_id = this.tex_id;
    return this.tex;
  };
}

const PMRES = 128;
const PMBORDER = 16;
let pmtex: Texture | undefined;
export function planetMapTexture(): Texture {
  if (pmtex) {
    return pmtex;
  }
  let tex_data = new Uint8Array(PMRES * PMRES * 3);
  let idx = 0;
  let mid = PMRES / 2;
  const PMR = PMRES / 2 - PMBORDER;
  function encodeRadian(rad: number): number {
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
  pmtex = textureLoad({
    name: 'pmtex',
    format: TEXTURE_FORMAT.RGB8,
    width: PMRES,
    height: PMRES,
    data: tex_data,
    filter_min: gl.NEAREST,
    filter_mag: gl.NEAREST,
    wrap_s: gl.CLAMP_TO_EDGE,
    wrap_t: gl.CLAMP_TO_EDGE,
  });

  return pmtex!;
}

function cmpSize(a: Planet, b: Planet): number {
  return a.size - b.size;
}

export class SolarSystem {

  star_data: StarType;
  name?: string;
  planets: Planet[];
  constructor(global_seed: number, star: Star) {
    let { /*x, y,*/ id } = star;
    let classif = starTypeFromID(id);
    let star_data = starTypeData(classif);
    this.star_data = star_data;
    // this.star_id = id;
    for (let ii = 0; ii < rand.length; ++ii) {
      rand[ii].reseed(mashString(`${id}_${global_seed}_${ii}`));
    }
    let planets = [];
    if (id === 98897686813) { // Sol
      this.name = 'Sol';
      planets.push(new Planet(this, { name: 'D', size: 4 })); // Mercury
      planets.push(new Planet(this, { name: 'K', size: 6 })); // Venus
      planets.push(new Planet(this, { name: 'M', size: 8, seed: 5 })); // Earth
      planets.push(new Planet(this, { name: 'Y', size: 5 })); // Mars

      planets.push(new Planet(this, { name: 'T', size: 16, seed: 1 })); // Jupiter
      planets.push(new Planet(this, { name: 'J', size: 12, seed: 1 })); // Saturn

      planets.push(new Planet(this, { name: 'P', size: 9 })); // Uranus
      planets.push(new Planet(this, { name: 'W', size: 8 })); // Neptune
    } else {
      let num_planets = rand[0].range(4);
      let chance = 0.5;
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
        let planet = planets[ii];
        if (!planet.type.bias && rand[0].range(2) || planet.type.bias! < 0) {
          p1.push(planet);
        } else {
          p2.push(planet);
        }
      }
      p1.sort(cmpSize);
      p2.sort(cmpSize).reverse();
      planets = p1.concat(p2);
    }
    this.planets = planets;
    // for (let ii = 0; ii < planets.length; ++ii) {
    //   planets[ii].ord = ii;
    // }
  }
}

export function solarSystemCreate(global_seed: number, star: Star): SolarSystem {
  return new SolarSystem(global_seed, star);
}
