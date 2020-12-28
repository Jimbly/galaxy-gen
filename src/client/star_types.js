/* eslint no-multi-spaces:off */
const assert = require('assert');
const engine = require('./glov/engine.js');

// From http://www.atlasoftheuniverse.com/startype.html
// label, odds, color index, radius, mass, luminosity
const sg_scale = 0.001 / (0.001 + 0.1 + 0.7 + 2 + 3.5 + 8 + 80);
const star_types = {
  O: ['O', 0.001, 0, 10, 50, 100000],
  B: ['B', 0.1, 1, 5, 10, 1000],
  A: ['A', 0.7, 2, 1.7, 2, 20],
  F: ['F', 2, 3, 1.3, 1.5, 4],
  G: ['G', 3.5, 4, 1, 1, 1],
  K: ['K', 8, 5, 0.8, 0.7, 0.2],
  M: ['M', 80, 6, 0.3, 0.2, 0.01],
  gG: ['Giant G', 0.4*(4/92), 4, 50, 5, 1000],
  gK: ['Giant K', 0.4*(8/92), 5, 20, 3.5, 400],
  gM: ['Giant M', 0.4*(80/92), 6, 10, 1, 50],
  D: ['White Dwarf', 5, 2, 0.01, 1.4, 0.01],
  sgO: ['Supergiant O', sg_scale * 0.001, 0, 500, 70, 1000000],
  sgB: ['Supergiant B', sg_scale * 0.1, 1,   300, 60,   82000],
  sgA: ['Supergiant A', sg_scale * 0.7, 2,   120, 50,   6000],
  sgF: ['Supergiant F', sg_scale * 2,   3,   100, 35,   50000],
  sgG: ['Supergiant G', sg_scale * 3.5, 4,    80, 16,   44000],
  sgK: ['Supergiant K', sg_scale * 8,   5,    72, 12,   38000],
  sgM: ['Supergiant M', sg_scale * 80,  6,    30, 10,   30000],
};
const star_types_total = (function () {
  let ret = 0;
  for (let key in star_types) {
    ret += star_types[key][1];
  }
  return ret;
}());

export function starType(choice) {
  choice *= star_types_total;
  for (let key in star_types) {
    choice -= star_types[key][1];
    if (choice <= 0) {
      return key;
    }
  }
  assert(!engine.DEBUG);
  return 'M';
}

export function starTypeData(key) {
  return star_types[key];
}
