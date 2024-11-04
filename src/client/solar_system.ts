export const BIT_RARITY_MASK = (1<<0) | (1<<1);
export const BIT_SAME_LOOSE = 1<<2;
export const BIT_DETAIL_IDX_SHIFT = 3; // 5 bits

import assert from 'assert';
import { getFrameIndex } from 'glov/client/engine';
import { randSimpleSpatial } from 'glov/client/rand_fast';
import { Texture } from 'glov/client/sprites';
import {
  TEXTURE_FORMAT,
  textureLoad,
} from 'glov/client/textures';
import {
  mashString,
  randCreate,
} from 'glov/common/rand_alea';
import { KeysMatching, TSMap } from 'glov/common/types';
import {
  clamp,
  defaults,
  lerp,
  nextHighestPowerOfTwo,
} from 'glov/common/util';
import {
  ROVec4,
  vec2,
  vec3,
  vec4,
} from 'glov/common/vmath';
import SimplexNoise from 'simplex-noise';
import {
  BIOMES,
  BIOMES_SAME_LOOSE,
  Biome,
} from './biomes';
import { Star } from './galaxy';
import {
  StarType,
  starTypeData,
  starTypeFromID,
} from './star_types';

const { abs, atan2, floor, max, min, round, sqrt, PI, pow } = Math;

let rand = [
  randCreate(0),
  randCreate(0),
  randCreate(0),
  randCreate(0),
];

let planet_gen_layer: number;

// returns roughly 0.4...0.7 with default settings
let sampleBiomeMap: () => number;

type WeightFunc = (x: number, y: number, h: number) => number;
function weightDefault(): number {
  return 0.5;
}

function weightBiomeRange(mn: number, mx: number, weight: number): WeightFunc {
  return function (x: number, y: number, h: number): number {
    let v = sampleBiomeMap();
    return v > mn && v < mx ? weight : 0;
  };
}

type ColorTable = number[];
type BiomeTableEntry = {
  weight_func: WeightFunc;
  color_table: ColorTable;
};
type BiomeTable = BiomeTableEntry[];

type VariationEntry = {
  weight: number;
  min_layer?: number;
  offs?: number;
  freqx?: number;
  freqy?: number;
  biome: Biome;
};
const BOTTOM_LAYER = 5; // PLANET_PIXELART_LEVEL + MAP_SUBDIVIDE
const BIOME_VARIATION: Partial<Record<Biome, VariationEntry[]>> = {
  [BIOMES.GREEN_PLAINS]: [{
    weight: 0.01,
    biome: BIOMES.GREEN_FOREST,
  }, {
    min_layer: BOTTOM_LAYER - 1,
    offs: 1,
    weight: 0.05,
    freqx: 111,
    freqy: 111,
    biome: BIOMES.WATER_SHALLOW,
  }],
  [BIOMES.DESERT]: [{
    weight: 0.00018,
    biome: BIOMES.WATER_SHALLOW,
  }],
  [BIOMES.GREEN_FOREST]: [{
    weight: 0.00018,
    biome: BIOMES.WATER_SHALLOW,
  }, {
    min_layer: BOTTOM_LAYER - 1,
    offs: 1,
    weight: 0.05,
    freqx: 111,
    freqy: 111,
    biome: BIOMES.GREEN_PLAINS,
  }],
  [BIOMES.DIRT_RED]: [{
    weight: 0.002,
    biome: BIOMES.DEAD_FOREST,
  }],
  [BIOMES.FROZEN_PLAINS]: [{
    min_layer: BOTTOM_LAYER - 1,
    offs: 1,
    weight: 0.08,
    freqx: 111,
    freqy: 111,
    biome: BIOMES.FROZEN_OCEAN,
  }],
  [BIOMES.MOLTEN_PLAINS]: [{
    //weight: 0.00018,
    min_layer: BOTTOM_LAYER - 1,
    offs: 1,
    weight: 0.06,
    freqx: 133,
    freqy: 171,
    biome: BIOMES.MOLTEN_LAVAFLOW,
  }],
  [BIOMES.MOLTEN_MOUNTAINS]: [{
    weight: 0.00018,
    biome: BIOMES.MOLTEN_LAVAFLOW,
  }],
  [BIOMES.DIRT_DARK]: [{
    weight: 0.00018,
    biome: BIOMES.DIRT,
  }],
  [BIOMES.DIRT]: [{
    min_layer: BOTTOM_LAYER - 1,
    offs: 1,
    weight: 0.06,
    freqx: 133,
    freqy: 171,
    biome: BIOMES.DIRT_DARK,
  }],
};

type BiomeDetails = {
  odds_none: number;
  odds_common: number;
  odds_uncommon: number;
  // odds_rare: number;
  // odds_total: number;
};
function procBiomeDetails(
  details: Partial<Record<Biome | 'default', BiomeDetails & { odds_rare: number }>>
): Record<Biome | 'default', BiomeDetails> {
  let ret: Partial<Record<Biome, BiomeDetails>> = {};
  let def: BiomeDetails;
  for (let key in details) {
    let entry = details[key]!;
    let odds_total = entry.odds_none + entry.odds_common + entry.odds_uncommon + entry.odds_rare;
    let newentry: BiomeDetails = {
      odds_none: (entry.odds_none) / odds_total,
      odds_common: (entry.odds_none + entry.odds_common) / odds_total,
      odds_uncommon: (entry.odds_none + entry.odds_common + entry.odds_uncommon) / odds_total,
    };
    if (key === 'default') {
      def = newentry;
    } else {
      ret[key] = newentry;
    }
  }
  assert(def!);
  for (let key in BIOMES) {
    let b: Biome = BIOMES[key as keyof typeof BIOMES];
    if (!ret[b]) {
      ret[b] = def;
    }
  }
  return ret as Record<Biome | 'default', BiomeDetails>;
}
const BIOME_DETAILS: Record<Biome, BiomeDetails> = procBiomeDetails({
  default: {
    odds_none: 2000,
    odds_common: 27,
    odds_uncommon: 9,
    odds_rare: 1,
  },
  [BIOMES.GREEN_FOREST]: {
    odds_none: 4000,
    odds_common: 8,
    odds_uncommon: 4,
    odds_rare: 2,
  },
});

const color_table_frozen = [
  0.23, BIOMES.FROZEN_OCEAN,
  0.77, BIOMES.FROZEN_PLAINS,
  1, BIOMES.FROZEN_MOUNTAINS,
];

const color_table_earthlike = [
  0.4, BIOMES.WATER_DEEP,
  0.5, BIOMES.WATER_SHALLOW,
  0.65, BIOMES.GREEN_PLAINS,
  0.75, BIOMES.MOUNTAINS,
  1, BIOMES.MOUNTAINS_SNOW,
];
const color_table_earthlike_forest = [
  0.4, BIOMES.WATER_DEEP,
  0.5, BIOMES.WATER_SHALLOW,
  0.52, BIOMES.GREEN_PLAINS,
  0.64, BIOMES.GREEN_FOREST,
  0.65, BIOMES.GREEN_PLAINS,
  0.75, BIOMES.MOUNTAINS,
  1, BIOMES.MOUNTAINS_SNOW,
];
const color_table_earthlike_desert = [
  0.4, BIOMES.WATER_DEEP,
  0.5, BIOMES.WATER_SHALLOW,
  0.65, BIOMES.DESERT,
  0.75, BIOMES.MOUNTAINS,
  1, BIOMES.MOUNTAINS_SNOW,
];

const biome_entry_earthlike: BiomeTableEntry = {
  weight_func: weightDefault,
  color_table: color_table_earthlike,
};
const biome_entry_icecaps: BiomeTableEntry = {
  weight_func: function (x: number, y: number, h: number): number {
    let d = 1 - min(y, 1 - y) * 5;
    return d + (h - 0.5) * 1.8;
  },
  color_table: color_table_frozen,
};
const biome_table_earthlike: BiomeTable = [
  biome_entry_earthlike,
  biome_entry_icecaps,
  {
    weight_func: weightBiomeRange(0.6, 1, 0.55),
    color_table: color_table_earthlike_forest,
  },
  {
    weight_func: function (x: number, y: number, h: number): number {
      if (planet_gen_layer === 0) {
        // too noisy on this layer
        return 0;
      }
      let v = sampleBiomeMap();
      let d = 1 - abs(y - 0.5) * 8;
      return d - h * 4 + 2.5 + v - 0.5;
    },
    color_table: color_table_earthlike_desert,
  },
];

const biome_entry_earthlike_islands: BiomeTableEntry = {
  weight_func: weightDefault,
  color_table: [
    0.6, BIOMES.WATER_DEEP,
    0.7, BIOMES.WATER_SHALLOW,
    0.8, BIOMES.GREEN_FOREST,
    1, BIOMES.GREEN_PLAINS,
  ]
};
const biome_table_earthlike_islands = [biome_entry_earthlike_islands];

const biome_entry_earthlike_pangea: BiomeTableEntry = {
  weight_func: weightDefault,
  color_table: [
    0.25, BIOMES.WATER_DEEP,
    0.3, BIOMES.WATER_SHALLOW,
    0.68, BIOMES.GREEN_FOREST,
    0.75, BIOMES.GREEN_PLAINS,
    1, BIOMES.MOUNTAINS,
  ]
};
const biome_table_earthlike_pangea = [
  biome_entry_earthlike_pangea,
  biome_entry_icecaps,
];

const biome_entry_water_world: BiomeTableEntry = {
  weight_func: weightDefault,
  color_table: [
    0.5, BIOMES.WATER_DEEP,
    0.8, BIOMES.WATER_SHALLOW,
    1, BIOMES.WATER_DEEP,
  ]
};
const biome_table_water_world = [biome_entry_water_world];

const biome_entry_low_life: BiomeTableEntry = {
  weight_func: weightDefault,
  color_table: [
    0.3, BIOMES.WATER_SHALLOW,
    0.7, BIOMES.DIRT_RED,
    1, BIOMES.DEAD_FOREST,
  ]
};
const biome_table_low_life = [biome_entry_low_life];

const biome_entry_molten: BiomeTableEntry = {
  weight_func: weightDefault,
  color_table: [
    0.25, BIOMES.MOLTEN_MOUNTAINS,
    0.46, BIOMES.MOLTEN_PLAINS,
    0.54, BIOMES.MOLTEN_LAVAFLOW,
    0.75, BIOMES.MOLTEN_PLAINS,
    1, BIOMES.MOLTEN_MOUNTAINS,
  ]
};
const biome_table_molten = [biome_entry_molten];

const biome_entry_molten_small: BiomeTableEntry = {
  weight_func: weightDefault,
  color_table: [
    0.4, BIOMES.MOLTEN_PLAINS,
    0.6, BIOMES.MOLTEN_LAVAFLOW,
    1, BIOMES.MOLTEN_MOUNTAINS,
  ]
};
const biome_table_molten_small = [biome_entry_molten_small];

const biome_entry_gray: BiomeTableEntry = {
  weight_func: weightDefault,
  color_table: [
    0.25, BIOMES.MOONROCK1,
    0.5, BIOMES.MOONROCK2,
    0.75, BIOMES.MOONROCK3,
    1, BIOMES.MOONROCK4,
  ]
};
const biome_table_gray = [biome_entry_gray];

const biome_entry_frozen: BiomeTableEntry = {
  weight_func: weightDefault,
  color_table: color_table_frozen,
};
const biome_table_frozen = [biome_entry_frozen];

// saturn-like, greys and oranges
const biome_entry_gasgiant1: BiomeTableEntry = {
  weight_func: weightDefault,
  color_table: [
    0.2, BIOMES.GAS_ORANGE_LIGHT,
    0.35, BIOMES.GAS_ORANGE_DARK,
    0.5, BIOMES.GAS_GRAY,
    0.65, BIOMES.GAS_ORANGE_LIGHT,
    0.8, BIOMES.GAS_ORANGE_DARK,
    1, BIOMES.GAS_GRAY,
  ]
};
const biome_table_gasgiant1 = [biome_entry_gasgiant1];

const biome_entry_dirt: BiomeTableEntry = {
  weight_func: weightDefault,
  color_table: [
    0.5, BIOMES.DIRT,
    1, BIOMES.DIRT_DARK,
  ]
};
const biome_table_dirt = [biome_entry_dirt];

// purples
const biome_entry_gasgiant2: BiomeTableEntry = {
  weight_func: weightDefault,
  color_table: [
    0.2, BIOMES.GAS_PURPLE_LIGHT,
    0.4, BIOMES.GAS_PURPLE_DARK,
    0.6, BIOMES.GAS_PURPLE_LIGHT,
    0.8, BIOMES.GAS_PURPLE_DARK,
    1, BIOMES.GAS_PURPLE_LIGHT,
  ]
};
const biome_table_gasgiant2 = [biome_entry_gasgiant2];

// reds
const biome_entry_gasgiant3: BiomeTableEntry = {
  weight_func: weightDefault,
  color_table: [
    0.2, BIOMES.GAS_RED,
    0.4, BIOMES.GAS_YELLOW_RED,
    0.6, BIOMES.GAS_RED,
    0.8, BIOMES.GAS_YELLOW_RED,
    1, BIOMES.GAS_RED,
  ]
};
const biome_table_gasgiant3 = [biome_entry_gasgiant3];

// blues
const biome_entry_gasgiant4: BiomeTableEntry = {
  weight_func: weightDefault,
  color_table: [
    0.2, BIOMES.GAS_BLUE_MED,
    0.35, BIOMES.GAS_BLUE_LIGHT,
    0.5, BIOMES.GAS_BLUE_DARK,
    0.65, BIOMES.GAS_BLUE_MED,
    0.8, BIOMES.GAS_BLUE_LIGHT,
    1, BIOMES.GAS_BLUE_DARK,
  ]
};
const biome_table_gasgiant4 = [biome_entry_gasgiant4];

// yellows
const biome_entry_gasgiant5: BiomeTableEntry = {
  weight_func: weightDefault,
  color_table: [
    0.2, BIOMES.GAS_YELLOW,
    0.35, BIOMES.GAS_YELLOW_RED,
    0.5, BIOMES.GAS_ORANGE_LIGHT,
    0.65, BIOMES.GAS_YELLOW,
    0.8, BIOMES.GAS_YELLOW_RED,
    1, BIOMES.GAS_ORANGE_LIGHT,
  ]
};
const biome_table_gasgiant5 = [biome_entry_gasgiant5];

export type NoiseOptRange = {
  min: number;
  max: number;
  freq: number;
  mul?: number; // calculated
  add?: number;
};
type NoiseOptRangeRT = Required<NoiseOptRange>;
export type NoiseOpts = {
  frequency: number | NoiseOptRange;
  amplitude: number;
  persistence: number | NoiseOptRange;
  lacunarity: number | NoiseOptRange;
  octaves: number;
  domain_warp: number;
  warp_freq: number;
  warp_amp: number;
  skew_x: number;
  key?: string;
};
export type NoiseOptsRangeField = KeysMatching<NoiseOpts, NoiseOptRange | number>;
export type NoiseOptsNumberField = KeysMatching<NoiseOpts, number>;

const noise_base: NoiseOpts = {
  frequency: 2,
  amplitude: 1,
  persistence: 0.5,
  lacunarity: { min: 1.6, max: 2.8, freq: 0.3 },
  octaves: 6,
  domain_warp: 0,
  warp_freq: 1,
  warp_amp: 0.1,
  skew_x: 1,
};

function noiseMod(opts: Partial<NoiseOpts>, base?: NoiseOpts): NoiseOpts {
  base = base || noise_base;
  return defaults(opts, base || noise_base);
}

const noise_biome_base: NoiseOpts = noiseMod({
  // note: no NoiseOptRange supported
  lacunarity: 2.0,
});

const noise_gasgiant = noiseMod({
  skew_x: 0.2,
  domain_warp: 1,
  warp_amp: 0.1,
});

const noise_gasgiant_swirly = noiseMod({
  skew_x: 0.2,
  domain_warp: 1,
  warp_amp: 0.1,
  lacunarity: { min: 1.6, max: 2.8, freq: 1.3 },
});

const noise_molten = noiseMod({
  lacunarity: 3.0,
  octaves: 7,
  domain_warp: 0,
  warp_amp: 0.1,
});

const noise_dirt = noiseMod({
  domain_warp: 1,
  warp_amp: 0.3,
});

const noise_low_life = noiseMod({
  lacunarity: 4.5,
  octaves: 5,
});

const noise_waterworld = noiseMod({
  skew_x: 0.5,
  domain_warp: 1,
  warp_amp: 0.3,
});

export const PLANET_TYPE_NAMES = ['D', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'T', 'W', 'Y'] as const;
export type PlanetTypeName = typeof PLANET_TYPE_NAMES[number];

type PlanetType = {
  name: PlanetTypeName;
  size: [number, number];
  bias?: number;
  color?: ROVec4; // unused
  biome_tables: BiomeTable[];
  noise: NoiseOpts;
  noise_biome?: NoiseOpts;
};
const planet_types: PlanetType[] = [
  // Class D (planetoid or moon with little to no atmosphere)
  { name: 'D', size: [4,8], color: vec4(0.7,0.7,0.7,1), biome_tables: [biome_table_gray], noise: noise_base },
  // Class H (generally uninhabitable)
  { name: 'H', size: [6,10], color: vec4(0.3,0.4,0.5,1), biome_tables: [biome_table_gray], noise: noise_base },
  // Class J (gas giant)
  { name: 'J', size: [12,20], color: vec4(0.9,0.6,0,1),
    biome_tables: [biome_table_gasgiant1, biome_table_gasgiant4],
    noise: noise_gasgiant_swirly },
  // Class K (habitable, as long as pressure domes are used)
  { name: 'K', size: [8,12], color: vec4(0.5,0.3,0.2,1), biome_tables: [biome_table_dirt], noise: noise_dirt },
  // Class L (marginally habitable, with vegetation but no animal life)
  { name: 'L', size: [6,10], bias: 1, color: vec4(0.3,0.7,0.3,1),
    biome_tables: [biome_table_frozen],
    noise: noise_base },
  // Class M (terrestrial)
  { name: 'M', size: [9,12], color: vec4(0,1,0,1),
    biome_tables: [biome_table_earthlike, biome_table_earthlike_islands, biome_table_earthlike_pangea],
    noise: noise_base },
  // Class N (sulfuric)
  { name: 'N', size: [4,8], bias: -1, color: vec4(0.6,0.6,0,1),
    biome_tables: [biome_table_molten_small],
    noise: noise_molten },
  // Class P (glacial)
  { name: 'P', size: [4,14], bias: 1, color: vec4(0.5,0.7,1,1),
    biome_tables: [biome_table_frozen],
    noise: noise_base },
  // Class R (a rogue planet, not as habitable as a terrestrial planet)
  { name: 'R', size: [6,12], color: vec4(0.2,0.3,0.2,1), biome_tables: [biome_table_low_life], noise: noise_low_life },
  // Class T (gas giant)
  { name: 'T', size: [12,20], color: vec4(0.6,0.9,0,1),
    biome_tables: [biome_table_gasgiant2, biome_table_gasgiant3, biome_table_gasgiant5],
    noise: noise_gasgiant },
  // Class W (water world)
  { name: 'W', size: [8,18], color: vec4(0.3,0.3,1.0,1),
    biome_tables: [biome_table_water_world],
    noise: noise_waterworld },
  // Class Y (toxic atmosphere, high temperatures)
  { name: 'Y', size: [8,18], color: vec4(1,0.3,0,1), biome_tables: [biome_table_molten], noise: noise_base },
];

function randExp(idx: number, mn: number, mx: number): number {
  let v = rand[idx].random();
  v *= v;
  return mn + (mx - mn) * v;
}

function typeFromName(name: PlanetTypeName): PlanetType {
  for (let ii = 0; ii < planet_types.length; ++ii) {
    if (planet_types[ii].name === name) {
      return planet_types[ii];
    }
  }
  assert(false);
}

export function planetNoiseForType(name: PlanetTypeName): NoiseOpts {
  let type = typeFromName(name);
  return type.noise;
}

export type PlanetOverrideParams = {
  name?: PlanetTypeName;
  size?: number;
  seed?: number;
  noise?: NoiseOpts;
};

type RawData = {
  raw_data: Uint8Array;
  details?: Uint8Array & { planet_tex_id?: number; valid?: boolean };
};

type TexPair = {
  tex: Texture & RawData & { planet_tex_id?: number };
  tex_id: number;
  tex_idx: number; // for planet textures
};

export class Planet {
  type: PlanetType;
  size: number;
  orbit: number;
  orbit_speed: number;
  seed: number;
  biome_table: BiomeTable;
  tex_idx = 0;
  work_frame = 0;
  noise: NoiseOpts;
  constructor(override_data?: PlanetOverrideParams) {
    override_data = override_data || {};
    this.type = override_data.name ?
      typeFromName(override_data.name) :
      planet_types[rand[2].range(planet_types.length)];
    this.size = override_data.size || randExp(3, this.type.size[0], this.type.size[1]);
    this.orbit = rand[0].floatBetween(0, PI*2) * 11;
    this.orbit_speed = randExp(1, 0.1, 1);
    this.seed = override_data.seed || rand[2].uint32();
    let biome_tables = this.type.biome_tables;
    this.biome_table = biome_tables[rand[1].range(biome_tables.length)];
    this.noise = override_data && override_data.noise || this.type.noise;
  }

  texpairs: Partial<Record<number, TexPair>> = {};
  declare getTexture: (
    layer: number,
    texture_size: number,
    sublayer: number,
    sub_x: number,
    sub_y: number,
    want_details: boolean,
  ) => (Texture & RawData) | null;
  declare getDetails: (
    tex: Texture & RawData,
    nmap: Uint8Array[],
    texture_size: number,
    sub_x: number,
    sub_y: number,
  ) => void;
}

let noise: SimplexNoise[];
let noise_warp: SimplexNoise[];
let noise_skew_x: number;
let total_amplitude: number;
let noise_field: Record<NoiseOptsRangeField, SimplexNoise>;
let subopts: NoiseOpts;
function initNoise(seed: number, subopts_in: NoiseOpts): void {
  subopts = subopts_in;
  noise = new Array(subopts.octaves + 2);
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
  noise_skew_x = subopts.skew_x * 2;
}

let biome_subopts: NoiseOpts;
let biome_total_amplitude: number;
function initBiomeNoise(subopts_in: NoiseOpts): void {
  biome_subopts = subopts_in;
  biome_total_amplitude = 0;  // Used for normalizing result to 0.0 - 1.0
  let amp = subopts.amplitude;
  let p = biome_subopts.persistence as number;
  for (let ii=0; ii<biome_subopts.octaves; ii++) {
    biome_total_amplitude += amp;
    amp *= p;
  }
}
let sample_pos = vec2();
function sampleBiomeMapAtPos(x: number, y: number): number {
  sample_pos[0] = x * 2 + 77;
  sample_pos[1] = y + 77;
  let total = 0;
  let amp = biome_subopts.amplitude;
  let freq = biome_subopts.frequency as number;
  let p = biome_subopts.persistence as number;
  let lac = biome_subopts.lacunarity as number;
  for (let i=0; i<biome_subopts.octaves; i++) {
    total += (0.5 + 0.5 * noise[i].noise2D(sample_pos[0] * freq, sample_pos[1] * freq)) * amp;
    amp *= p;
    freq *= lac;
  }
  return total/biome_total_amplitude;
}
let biome_map_pos = vec3(); // x, y, blend weight
let biome_value: number | null = null;
// eslint-disable-next-line @typescript-eslint/no-shadow
sampleBiomeMap = function sampleBiomeMap(): number {
  if (biome_value === null) {
    let v = sampleBiomeMapAtPos(biome_map_pos[0], biome_map_pos[1]);
    let w = biome_map_pos[2];
    if (w < 1) {
      let v2 = sampleBiomeMapAtPos(biome_map_pos[0] - 1, biome_map_pos[1]);
      v = lerp(w, v, v2);
    }
    biome_value = v;
  }
  return biome_value;
};


{
  const MAX_TEXTURES = 20;
  type TexPool = {
    texs: Texture[];
    tex_idx: number;
  };
  let tex_pools: TSMap<TexPool> = {};
  let planet_tex_id = 0;

  const PLANET_MIN_RES = 8;
  const PLANET_MAX_RES = 256;
  let tex_data_temp = new Uint8Array(PLANET_MAX_RES * PLANET_MAX_RES * 2);

  function get(field: NoiseOptsRangeField): number {
    let v = subopts[field] as NoiseOptRangeRT;
    if (typeof v !== 'object') {
      return v;
    }
    return v.add + v.mul * noise_field[field].noise2D(sample_pos[0] * v.freq, sample_pos[1] * v.freq);
  }
  function sample(x: number, y: number): number {
    sample_pos[0] = x * noise_skew_x;
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

  function colorIndex(table: ColorTable, value: number): number {
    for (let ii = 0; ii < table.length; ii+=2) {
      if (value <= table[ii]) {
        return table[ii+1];
      }
    }
    return table[table.length - 1];
  }

  Planet.prototype.getDetails = function (
    tex: Texture & RawData,
    nmap: Uint8Array[],
    texture_size: number,
    sub_x: number,
    sub_y: number,
  ): void {
    let ret = tex.details;
    if (!ret) {
      ret = tex.details = new Uint8Array(texture_size * texture_size);
    }
    let ndata = [
      0,0,0,
      0,0,0,
      0,0,0,
    ];
    function nget(xx: number, yy: number): number {
      let nidx = 4;
      if (yy < 0) {
        nidx -= 3;
        yy += texture_size;
      } else if (yy >= texture_size) {
        nidx += 3;
        yy -= texture_size;
      }
      if (xx < 0) {
        nidx--;
        xx += texture_size;
      } else if (xx >= texture_size) {
        nidx++;
        xx -= texture_size;
      }
      return nmap[nidx][yy * texture_size + xx];
    }
    let x0 = sub_x * texture_size;
    let y0 = sub_y * texture_size;
    for (let yy = 0, idx=0; yy < texture_size; ++yy) {
      for (let jj = 0; jj < 3; ++jj) {
        for (let ii = 0; ii < 2; ++ii) {
          ndata[jj * 3 + ii + 1] = nget(ii - 1, yy - 1 + jj);
        }
      }
      for (let xx = 0; xx < texture_size; ++xx, ++idx) {
        for (let jj = 0; jj < 3; ++jj) {
          // shift known data
          ndata[jj*3] = ndata[jj*3+1];
          ndata[jj*3+1] = ndata[jj*3+2];
          // get new data
          ndata[jj*3+2] = nget(xx + 1, yy - 1 + jj);
        }
        let my_v = ndata[4];
        let all_same_loose = true;
        for (let ii = 0; ii < 9; ++ii) {
          if (ndata[ii] !== my_v) {
            if (!BIOMES_SAME_LOOSE[my_v][ndata[ii]]) {
              all_same_loose = false;
              break;
            }
          }
        }
        let ret_bits = 0;
        if (all_same_loose) {
          ret_bits |= BIT_SAME_LOOSE;
        }
        let bd = BIOME_DETAILS[my_v];
        let r = randSimpleSpatial(this.seed, x0 + xx, y0 + yy, 0);
        if (r < bd.odds_none) {
          // nothing
        } else {
          let v = floor(randSimpleSpatial(this.seed, x0 + xx, y0 + yy, 1) * 32);
          let rarity = r < bd.odds_common ? 1 : r < bd.odds_uncommon ? 2 : 3;
          ret_bits |= rarity | (v << BIT_DETAIL_IDX_SHIFT);
        }

        ret[idx] = ret_bits;
      }
    }
    tex.details = ret;
  };

  Planet.prototype.getTexture = function (
    layer: number,
    texture_size: number,
    sublayer: number,
    sub_x: number,
    sub_y: number,
    want_details: boolean,
  ): (Texture & RawData) | null {
    if (layer !== 2) {
      assert(!sublayer && !sub_x && !sub_y);
    }
    let tp_idx = layer + ((sublayer * 65536 + sub_y) * 65536) + sub_x;
    let tp = this.texpairs[tp_idx];
    if (tp && tp.tex.planet_tex_id === tp.tex_id) {
      // tex is valid, what about details?
      if (want_details) {
        if ((!tp.tex.details || tp.tex.details.planet_tex_id !== tp.tex_id) && getFrameIndex() !== this.work_frame) {
          if (tp.tex.details) {
            tp.tex.details.valid = false;
          }
          let nmap = [];
          let nready = true;
          let hhh = pow(2, sublayer);
          let www = hhh * 2;
          outer: // eslint-disable-line no-labels
          for (let dy = -1; dy <= 1; ++dy) {
            for (let dx = -1; dx <= 1; ++dx) {
              let elem = this.getTexture(layer, texture_size, sublayer,
                (sub_x + dx + www) % www,
                (sub_y + dy + hhh) % hhh, false);
              if (!elem) {
                nready = false;
                break outer; // eslint-disable-line no-labels
              }
              nmap[(dy+1)*3+dx+1] = elem.raw_data;
            }
          }
          if (nready && getFrameIndex() !== this.work_frame) {
            this.getDetails(tp.tex, nmap, texture_size, sub_x, sub_y);
            tp.tex.details!.planet_tex_id = tp.tex_id;
            tp.tex.details!.valid = true;
            this.work_frame = getFrameIndex();
          }
        }
      }
      return tp.tex;
    }

    if (getFrameIndex() === this.work_frame) {
      return null;
    }
    this.work_frame = getFrameIndex();

    // for (let ii = 0; ii < rand.length; ++ii) {
    //   rand[ii].reseed(mashString(`${this.seed}_${ii}`));
    // }

    let tex_data = tp ? tp.tex.raw_data : tex_data_temp;

    let biome_table = this.biome_table;
    let planet_h = clamp(nextHighestPowerOfTwo(texture_size), PLANET_MIN_RES, PLANET_MAX_RES);
    let planet_w = planet_h * 2;
    let tex_h = planet_h;
    let tex_w = planet_w;
    let zoom = pow(2, sublayer);
    if (sublayer) {
      tex_w = tex_h;
      planet_h *= zoom;
      planet_w *= zoom;
    }
    assert(tex_data.length >= tex_h * tex_w);
    initNoise(this.seed, this.noise);
    initBiomeNoise(this.type.noise_biome || noise_biome_base);
    planet_gen_layer = layer;
    for (let idx=0, jj = 0; jj < tex_h; ++jj) {
      let unif_y = (sub_y * tex_h + jj) / planet_h;
      biome_map_pos[1] = unif_y;
      // 0.1...0.2
      let blend_offs = clamp((noise[noise.length-1].noise2D(unif_y*5, 0.5) + 1) * 0.05, 0, 0.1) + 0.1;
      for (let ii = 0; ii < tex_w; ++ii, ++idx) {
        let unif_x = (sub_x * tex_w + ii)/planet_w;
        let v = sample(unif_x, unif_y);
        biome_map_pos[0] = unif_x;
        biome_value = null;
        if (unif_x > 1 - blend_offs) {
          let w = min((unif_x - (1 - blend_offs)) / 0.1, 1);
          let v2 = sample(unif_x - 1, unif_y);
          biome_map_pos[2] = w;
          v = lerp(w, v, v2);
          if (w > 0.5) {
            // use this pos for biome funcs
            unif_x--;
          }
        } else {
          biome_map_pos[2] = 1;
        }
        let winner = 0;
        let winner_weight = 0;
        for (let kk = 0; kk < biome_table.length; ++kk) {
          let entry = biome_table[kk];
          let w = entry.weight_func(unif_x, unif_y, v);
          if (w > winner_weight) {
            winner_weight = w;
            winner = kk;
          }
        }
        let b = colorIndex(biome_table[winner].color_table, v);
        let varilist = BIOME_VARIATION[b];
        if (varilist) {
          for (let kk = 0; kk < varilist.length; ++kk) {
            let vari = varilist[kk];
            if (sublayer >= (
              vari.min_layer || BOTTOM_LAYER
            )) {
              if (!vari.freqx) {
                if (randSimpleSpatial(this.seed, sub_x * tex_w + ii, sub_y * tex_h + jj, 2) < vari.weight) {
                  b = vari.biome;
                }
              } else {
                if (noise[noise.length-2].noise2D((unif_x + (vari.offs || 0))*2 * (vari.freqx || 7777),
                  unif_y * (vari.freqy || 7777)) * 0.5 + 0.5 < vari.weight
                ) {
                  b = vari.biome;
                }
              }
            }
          }
        }
        tex_data[idx] = b;
      }
    }
    let tex_key = sublayer === 0 ? `${tex_w}x${tex_h}` : 'planet';
    let tex_pool = tex_pools[tex_key];
    if (!tex_pool) {
      tex_pool = tex_pools[tex_key] = { texs: [], tex_idx: 0 };
    }
    let tex: Texture;
    let tex_idx: number;
    if (sublayer === 0) {
      // orrery view and planet globe view
      // (basically) never two in the same frame, so just loop through the pool
      tex_idx = tex_pool.tex_idx;
      tex_pool.tex_idx = (tex_pool.tex_idx + 1) % MAX_TEXTURES;
    } else {
      // more complicated caching on the planet level;
      // always the same resolution
      if (tp) {
        assert(tp.tex_idx !== undefined);
        tex_idx = tp.tex_idx;
        assert(tp.tex === tex_pool.texs[tex_idx]); // same texture, just needs updating
      } else {
        tex_idx = this.tex_idx++;
      }
    }
    tex = tex_pool.texs[tex_idx];
    if (tex) {
      tex.updateData(tex_w, tex_h, tex_data);
    } else {
      tex = tex_pool.texs[tex_idx] = textureLoad({
        name: `planet_${planet_tex_id}`,
        format: TEXTURE_FORMAT.R8,
        width: tex_w,
        height: tex_h,
        data: tex_data,
        filter_min: gl.NEAREST,
        filter_mag: gl.NEAREST,
        wrap_s: sublayer === 0 ? gl.REPEAT : gl.CLAMP_TO_EDGE,
        wrap_t: gl.CLAMP_TO_EDGE,
      });
    }
    let raw_data = (tex_data === tex_data_temp) ? tex_data.slice(0, tex_w * tex_h) : tex_data;
    let ret = tex as (Texture & { raw_data: Uint8Array });
    ret.raw_data = raw_data;
    tp = {
      tex: ret,
      tex_id: ++planet_tex_id,
      tex_idx,
    };
    tp.tex.planet_tex_id = tp.tex_id;
    if (tp.tex.details) {
      tp.tex.details.valid = false;
    }
    this.texpairs[tp_idx] = tp;
    return ret;
  };
}

const PMRES_LOW = 128;
const PMRES_HIGH = 256;
const PMBORDER = 16;
let pmtex: Texture | undefined;
let pmtex_hires: Texture | undefined;
export function planetMapTexture(high_res: boolean): Texture {
  if (pmtex && !high_res) {
    return pmtex;
  }
  if (pmtex_hires && high_res) {
    return pmtex_hires;
  }
  const res = high_res ? PMRES_HIGH : PMRES_LOW;
  let tex_data = new Uint8Array(res * res * 3);
  let idx = 0;
  let mid = res / 2;
  const PMR = res / 2 - PMBORDER;
  function encodeRadian(rad: number): number {
    if (rad < 0) {
      rad += PI * 2;
    }
    return clamp(round((rad - PI/2) / PI * 255), 0, 255);
    //return round(rad / (PI * 2) * 255);
  }
  for (let yy = 0; yy < res; ++yy) {
    let unif_y = (yy - mid) / PMR;
    for (let xx = 0; xx < res; ++xx) {
      let unif_x = (xx - mid) / PMR;
      let dsq = unif_x * unif_x + unif_y * unif_y;
      let r = sqrt(dsq);
      let eff_r = max(1, r);
      // calc latitude / longitude for texturing and lighting
      let unif_z = r >= 1 ? 0 : sqrt(eff_r * eff_r - dsq);
      let longitude = -atan2(unif_x, -unif_z);
      let flat_uv_longitude = round((unif_x * 0.5 + 0.5) * 255);
      let xz_len = sqrt(unif_x*unif_x + unif_z*unif_z);
      let latitude = atan2(-unif_y, -xz_len);

      // use a softened longitude to reduce texture sampling artifacts
      // also /2 to sample from X at double resolution
      tex_data[idx++] = round((flat_uv_longitude + encodeRadian(longitude)) / 4);

      tex_data[idx++] = encodeRadian(latitude);
      tex_data[idx++] = round(r / 2 * 255); // radius of 2D circle / distance field: 0 to 2
    }
  }
  assert.equal(idx, tex_data.length);
  let tex = textureLoad({
    name: `pmtex${high_res ? 'hi' : 'lo'}`,
    format: TEXTURE_FORMAT.RGB8,
    width: res,
    height: res,
    data: tex_data,
    filter_min: gl.LINEAR,
    filter_mag: gl.LINEAR,
    wrap_s: gl.CLAMP_TO_EDGE,
    wrap_t: gl.CLAMP_TO_EDGE,
  });
  if (high_res) {
    pmtex_hires = tex;
  } else {
    pmtex = tex;
  }

  return tex;
}

let pmflattex: Texture;
export function planetMapFlatTexture(): Texture {
  if (pmflattex) {
    return pmflattex;
  }
  const res = PMRES_HIGH;
  let tex_data = new Uint8Array(res * res * 3);
  let idx = 0;
  for (let yy = 0; yy < res; ++yy) {
    // let unif_y = (yy - mid) / PMR;
    for (let xx = 0; xx < res; ++xx) {
      // let unif_x = (xx - mid) / PMR;

      tex_data[idx++] = round(xx / res * 255);
      tex_data[idx++] = round(yy / res * 255);
      tex_data[idx++] = 0;
    }
  }
  assert.equal(idx, tex_data.length);
  let tex = textureLoad({
    name: 'pmtexflat',
    format: TEXTURE_FORMAT.RGB8,
    width: res,
    height: res,
    data: tex_data,
    filter_min: gl.NEAREST,
    filter_mag: gl.NEAREST,
    wrap_s: gl.CLAMP_TO_EDGE,
    wrap_t: gl.CLAMP_TO_EDGE,
  });
  pmflattex = tex;
  return tex;
}

function cmpSize(a: Planet, b: Planet): number {
  return a.size - b.size;
}

export class SolarSystem {

  star_data: StarType;
  name?: string;
  planets: Planet[];
  star_id: number;
  constructor(global_seed: number, star: Pick<Star, 'id'>) {
    let { /*x, y,*/ id } = star;
    let classif = starTypeFromID(id);
    let star_data = starTypeData(classif);
    this.star_data = star_data;
    this.star_id = id;
    for (let ii = 0; ii < rand.length; ++ii) {
      rand[ii].reseed(mashString(`${id}_${global_seed}_${ii}`));
    }
    let planets = [];
    if (id === 98897686813) { // Sol
      this.name = 'Sol';
      planets.push(new Planet({ name: 'D', size: 4 })); // Mercury
      planets.push(new Planet({ name: 'K', size: 6 })); // Venus
      planets.push(new Planet({ name: 'M', size: 8, seed: 8 })); // Earth
      planets.push(new Planet({ name: 'Y', size: 5 })); // Mars

      planets.push(new Planet({ name: 'T', size: 16, seed: 1 })); // Jupiter
      planets.push(new Planet({ name: 'J', size: 12, seed: 1 })); // Saturn

      planets.push(new Planet({ name: 'P', size: 9 })); // Uranus
      planets.push(new Planet({ name: 'W', size: 8 })); // Neptune
    } else {
      let num_planets = rand[0].range(4);
      let chance = 0.5;
      while (num_planets) {
        planets.push(new Planet());
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

export function solarSystemCreate(global_seed: number, star: Pick<Star, 'id'>): SolarSystem {
  return new SolarSystem(global_seed, star);
}

export function planetCreate(global_seed: number, star_id: number, params: PlanetOverrideParams): Planet {
  for (let ii = 0; ii < rand.length; ++ii) {
    rand[ii].reseed(mashString(`${star_id}_${global_seed}_${ii}`));
  }
  return new Planet(params);
}
