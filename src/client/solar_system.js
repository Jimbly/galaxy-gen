const { PI } = Math;
const { randCreate, mashString } = require('./glov/rand_alea.js');
const { starTypeData } = require('./star_types.js');
const { vec4 } = require('./glov/vmath.js');

let rand = [
  randCreate(0),
  randCreate(0),
  randCreate(0),
  randCreate(0),
];

let planet_types = [
  // Class D (planetoid or moon with little to no atmosphere)
  { name: 'D', color: vec4(0.7,0.7,0.7,1) },
  // Class H (generally uninhabitable)
  { name: 'H', color: vec4(0.3,0.4,0.5,1) },
  // Class J (gas giant)
  { name: 'J', color: vec4(0.9,0.6,0,1) },
  // Class K (habitable, as long as pressure domes are used)
  { name: 'K', color: vec4(0.5,0.3,0.2,1) },
  // Class L (marginally habitable, with vegetation but no animal life)
  { name: 'L', color: vec4(0.3,0.7,0.3,1) },
  // Class M (terrestrial)
  { name: 'M', color: vec4(0,1,0,1) },
  // Class N (sulfuric)
  { name: 'N', color: vec4(0.6,0.6,0,1) },
  // Class P (glacial)
  { name: 'P', color: vec4(0.5,0.7,1,1) },
  // Class R (a rogue planet, not as habitable as a terrestrial planet)
  { name: 'R', color: vec4(0.2,0.3,0.2,1) },
  // Class T (gas giant)
  { name: 'T', color: vec4(0.6,0.9,0,1) },
  // Class Y (toxic atmosphere, high temperatures)
  { name: 'Y', color: vec4(1,0.3,0,1) },
];

function randExp(idx, min, max) {
  let v = rand[idx].random();
  v *= v;
  return min + (max - min) * v;
}

function genPlanet() {
  return {
    type: planet_types[rand[2].range(planet_types.length)],
    size: randExp(3, 4, 20),
    orbit: rand[0].floatBetween(0, PI*2),
    orbit_speed: randExp(1, 0.1, 1),
  };
}

function cmpSize(a, b) {
  return a.size - b.size;
}

function SolarSystem(global_seed, star) {
  let { /*x, y,*/ id, classif } = star;
  let star_data = starTypeData(classif);
  this.star_data = star_data;
  for (let ii = 0; ii < rand.length; ++ii) {
    rand[ii].reseed(mashString(`${id}_${global_seed}_${ii}`));
  }
  let num_planets = rand[0].range(4);
  let chance = 0.5;
  let planets = [];
  while (num_planets) {
    planets.push(genPlanet());
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
