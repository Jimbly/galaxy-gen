/* eslint no-multi-spaces:off, key-spacing:off */
const assert = require('assert');
const engine = require('./glov/engine.js');
const { mashI53 } = require('./glov/rand_alea.js');
const { vec4 } = require('./glov/vmath.js');

const colors = [
  vec4(0.816,1,1,1),
  vec4(0.98,0.204,0,1),
  vec4(1,0.467,0,1),
  vec4(1,1,0.408,1), // G
  vec4(1,1,0.8,1),
  vec4(0.922,1,1,1),
  vec4(0.875,1,1,1),
  vec4(0.816,1,1,1),
];

// From http://www.atlasoftheuniverse.com/startype.html
// label, odds, color index, astro_radius, mass, luminosity, game_radius
const sg_scale = 0.001 / (0.001 + 0.1 + 0.7 + 2 + 3.5 + 8 + 80);
const star_types = (function () {
  let raw = {
    O:   ['O',            0.001,          7,    10,  50,  100000, 30],
    B:   ['B',            0.1,            6,     5,  10,    1000, 25],
    A:   ['A',            0.7,            5,   1.7,   2,      20, 23],
    F:   ['F',            2,              4,   1.3, 1.5,       4, 22],
    G:   ['G',            3.5,            3,     1,   1,       1, 21],
    K:   ['K',            8,              2,   0.8, 0.7,     0.2, 20],
    M:   ['M',            80,             1,   0.3, 0.2,    0.01, 18],
    gG:  ['Giant G',      0.4*(4/92),     3,    50,   5,    1000, 36],
    gK:  ['Giant K',      0.4*(8/92),     2,    20, 3.5,     400, 33],
    gM:  ['Giant M',      0.4*(80/92),    1,    10,   1,      50, 30],
    D:   ['White Dwarf',  5,              6,  0.01, 1.4,    0.01,  6],
    sgO: ['Supergiant O', sg_scale * 0.001, 7, 500,  70, 1000000, 40],
    sgB: ['Supergiant B', sg_scale * 0.1, 6,   300,  60,   82000, 37],
    sgA: ['Supergiant A', sg_scale * 0.7, 5,   120,  50,   60000, 35],
    sgF: ['Supergiant F', sg_scale * 2,   4,   100,  35,   50000, 34],
    sgG: ['Supergiant G', sg_scale * 3.5, 3,    80,  16,   44000, 33],
    sgK: ['Supergiant K', sg_scale * 8,   2,    72,  12,   38000, 32],
    sgM: ['Supergiant M', sg_scale * 80,  1,    30,  10,   30000, 30],
  };
  let ret = {};
  for (let key in raw) {
    let rd = raw[key];
    ret[key] = {
      label: rd[0],
      odds: rd[1],
      hue: rd[2],
      color: colors[rd[2]],
      astro_radius: rd[3],
      mass: rd[4],
      lumin: rd[5],
      game_radius: rd[6],
    };
  }
  return ret;
}());
const star_types_total = (function () {
  let ret = 0;
  for (let key in star_types) {
    ret += star_types[key].odds;
  }
  return ret;
}());

function starType(choice) {
  choice *= star_types_total;
  for (let key in star_types) {
    choice -= star_types[key].odds;
    if (choice <= 0) {
      return key;
    }
  }
  assert(!engine.DEBUG);
  return 'M';
}

export function starTypeFromID(id) {
  return starType(mashI53(id));
}

export function hueFromID(id) {
  return star_types[starType(mashI53(id))].hue
}

export function starTypeData(key) {
  return star_types[key];
}

export function hueFromType(key) {
  return star_types[key].hue;
}
