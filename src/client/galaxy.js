const { abs, atan2, cos, floor, max, min, sin, sqrt, PI } = Math;
const { randCreate } = require('./glov/rand_alea.js');
const SimplexNoise = require('simplex-noise');
const { clamp, lerp, easeOut, easeInOut } = require('../common/util.js');

let noise = new Array(1);
export function genGalaxy(params) {
  let { seed, arms, width, twirl, center, lone_clusters, len_mods, noise_freq, noise_weight } = params;
  for (let ii = 0; ii < noise.length; ++ii) {
    noise[ii] = new SimplexNoise(`${seed}n${ii}`);
  }
  let rand = randCreate(seed);
  let arm_len = new Array(len_mods);
  for (let ii = 0; ii < arm_len.length; ++ii) {
    arm_len[ii] = rand.random();
  }

  let data = new Uint8Array(width * width);
  for (let idx = 0, yy = 0; yy < width; ++yy) {
    let y = yy / width * 2 - 1; // -1 ... 1
    for (let xx = 0; xx < width; ++xx, ++idx) {
      let x = xx / width * 2 - 1; // -1 ... 1
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
      data[idx] = clamp(v, 0, 1) * 255;
    }
  }

  const LONE_BORDER = 5;
  let OFFS = [
    [0.5, -width, 0.5, -1, 0.5, 1, 0.5, width],
    [0.5, -width, 0.5, -width*2, 0.5, -1, 0.5, -2, 0.5, 1, 0.5, 2, 0.5, width, 0.5, width * 2,
     0.2, -width-1, 0.2, -width+1, 0.2, width-1, 0.2, width+1],
    [0.2, -width, 0.2, -width*2, 0.2, -1, 0.2, -2, 0.2, 1, 0.2, 2, 0.2, width, 0.2, width * 2,
     0.2, -width-1, 0.2, -width+1, 0.2, width-1, 0.2, width+1],
  ];
  for (let ii = 0; ii < lone_clusters; ++ii) {
    let x = LONE_BORDER + rand.range(width - LONE_BORDER * 2);
    let y = LONE_BORDER + rand.range(width - LONE_BORDER * 2);
    let idx = x + y * width;
    let v = rand.floatBetween(0.2, 1) * 255;
    data[idx] = max(data[idx], v);
    // Add a glow - should only be used for high level rendering, not for density?
    let offs = OFFS[rand.range(OFFS.length)];
    for (let jj = 0; jj < offs.length; jj+=2) {
      let v2 = v * offs[jj];
      let d = offs[jj+1];
      data[idx + d] = max(data[idx + d], v2);
    }
  }

  return { data };
}
