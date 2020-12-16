const { abs, atan2, cos, floor, max, min, sin, sqrt, PI } = Math;
const { randCreate } = require('./glov/rand_alea.js');
const SimplexNoise = require('simplex-noise');
const { clamp, lerp, easeOut, easeInOut } = require('../common/util.js');

let noise = new Array(1);
export function genGalaxy(params) {
  let { seed, arms, width, twirl, center, arm_soft, len_mods, noise_freq, noise_weight } = params;
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
      let rawtheta = (theta / (2*PI) + 1) % 1; // 0..1
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
      dense = easeOut(dense, 2);
      dense = arm_soft + (1 - arm_soft) * dense;
      let v;
      let invd = max(0, 1 - d);
      dense = lerp(d, invd, dense);
      v = dense - d;
      v += invd * center;

      let noise_v1 = noise[0].noise2D(rawd * noise_freq, theta * d) * 0.5 + 0.5;
      let noise_v2 = noise[0].noise2D(rawd * noise_freq, ((theta + PI*2) % (PI*2)) * d + 7) * 0.5 + 0.5;
      let noise_v = lerp(abs(rawtheta * 2 - 1), noise_v2, noise_v1);
      noise_v = max(0, 1 - (1 - noise_v) * d * noise_weight);
      v *= noise_v;
      data[idx] = clamp(v, 0, 1) * 255;
    }
  }
  return { data };
}
