const { starTypeData } = require('./star_types.js');

function SolarSystem(global_seed, star) {
  let { x, y, id, seed, classif } = star;
  let star_type = starTypeData(classif);
  this.sun_label = star_type[0];
}

export function solarSystemCreate(global_seed, star) {
  return new SolarSystem(global_seed, star);
}
