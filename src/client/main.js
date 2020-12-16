/*eslint global-require:off*/
const glov_local_storage = require('./glov/local_storage.js');
glov_local_storage.storage_prefix = 'glovjs-playground'; // Before requiring anything else that might load from this

const engine = require('./glov/engine.js');
const { genGalaxy } = require('./galaxy.js');
const { min, round } = Math;
const net = require('./glov/net.js');
const sprites = require('./glov/sprites.js');
const textures = require('./glov/textures.js');
const ui = require('./glov/ui.js');
const { clamp, clone, deepEqual } = require('../common/util.js');
const { vec4, v3set } = require('./glov/vmath.js');
const createSprite = sprites.create;

window.Z = window.Z || {};
Z.BACKGROUND = 1;
Z.SPRITES = 10;
Z.PARTICLES = 20;
Z.UI_TEST = 200;

// let app = exports;
// Virtual viewport for our game logic
const game_width = 384;
const game_height = 256;

export function main() {
  if (engine.DEBUG) {
    // Enable auto-reload, etc
    net.init({ engine });
  }

  const font_info_04b03x2 = require('./img/font/04b03_8x2.json');
  const font_info_04b03x1 = require('./img/font/04b03_8x1.json');
  const font_info_palanquin32 = require('./img/font/palanquin32.json');
  let pixely = 'on';
  let font;
  if (pixely === 'strict') {
    font = { info: font_info_04b03x1, texture: 'font/04b03_8x1' };
  } else if (pixely && pixely !== 'off') {
    font = { info: font_info_04b03x2, texture: 'font/04b03_8x2' };
  } else {
    font = { info: font_info_palanquin32, texture: 'font/palanquin32' };
  }

  if (!engine.startup({
    game_width,
    game_height,
    pixely,
    font,
    viewport_postprocess: false,
    antialias: false,
  })) {
    return;
  }
  font = engine.font;

  ui.scaleSizes(13 / 32);
  ui.setFontHeight(8);


  const width = 256;
  const height = width;
  let params = {
    width,
    arms: 7,
    len_mods: 4,
    twirl: 2,
    center: 0.25,
    seed: 1,
    arm_soft: 0.3,
    noise_freq: 5,
    noise_weight: 1,
  };
  let gen_params;
  const tex_total_size = width * height;
  let tex_data = new Uint8Array(tex_total_size * 4);
  let debug_tex;
  let debug_sprite;
  let color = vec4(0,0,0,1);
  function updateTexture(galaxy) {
    let start = Date.now();
    let { data } = galaxy;

    for (let ii = 0; ii < tex_total_size; ++ii) {
      let d = data[ii];
      v3set(color, d/255, d/255, d/255);
      for (let jj = 0; jj < 4; ++jj) {
        tex_data[ii * 4 + jj] = clamp(color[jj] * 255, 0, 255);
      }
    }

    if (!debug_tex) {
      debug_tex = textures.load({
        name: 'proc_gen_debug',
        format: textures.format.RGBA8,
        width,
        height,
        data: tex_data,
        filter_min: gl.NEAREST,
        filter_mag: gl.NEAREST,
        wrap_s: gl.CLAMP_TO_EDGE,
        wrap_t: gl.CLAMP_TO_EDGE,
      });
    } else {
      debug_tex.updateData(width, height, tex_data);
    }
    if (!debug_sprite) {
      debug_sprite = createSprite({
        texs: [debug_tex],
      });
    }
    console.log(`Debug texture update in ${(Date.now() - start)}ms`);
  }

  function round4(v) {
    return round(v * 1000)/1000;
  }

  function test(dt) {

    gl.clearColor(0, 0.72, 1, 1);
    let z = Z.UI;

    let x = ui.button_height;
    let button_spacing = ui.button_height + 6;
    let y = ui.button_height;

    if (!deepEqual(params, gen_params)) {
      gen_params = clone(params);
      let galaxy = genGalaxy(params);
      updateTexture(galaxy);
    }
    // if (ui.buttonText({ x, y, text: 'Test', w: ui.button_width * 0.5 }) || !maze) {
    //   mazeGen();
    // }
    // y += button_spacing;

    ui.print(null, x, y, z, `Seed: ${params.seed}`);
    y += ui.font_height;
    params.seed = round(ui.slider(params.seed, { x, y, z, min: 1, max: 9999 }));
    y += button_spacing;

    ui.print(null, x, y, z, `Arms: ${params.arms}`);
    y += ui.font_height;
    params.arms = round(ui.slider(params.arms, { x, y, z, min: 1, max: 16 }));
    y += button_spacing;

    ui.print(null, x, y, z, `Arm Length Mods: ${params.len_mods}`);
    y += ui.font_height;
    params.len_mods = round(ui.slider(params.len_mods, { x, y, z, min: 1, max: 32 }));
    y += button_spacing;

    ui.print(null, x, y, z, `Twirl: ${params.twirl}`);
    y += ui.font_height;
    params.twirl = round4(ui.slider(params.twirl, { x, y, z, min: 0, max: 8 }));
    y += button_spacing;

    ui.print(null, x, y, z, `Center: ${params.center}`);
    y += ui.font_height;
    params.center = round4(ui.slider(params.center, { x, y, z, min: 0, max: 2 }));
    y += button_spacing;

    ui.print(null, x, y, z, `Arm Softness: ${params.arm_soft}`);
    y += ui.font_height;
    params.arm_soft = round4(ui.slider(params.arm_soft, { x, y, z, min: -1, max: 1 }));
    y += button_spacing;

    ui.print(null, x, y, z, `Noise Freq: ${params.noise_freq}`);
    y += ui.font_height;
    params.noise_freq = round4(ui.slider(params.noise_freq, { x, y, z, min: 0.1, max: 10 }));
    y += button_spacing;

    ui.print(null, x, y, z, `Noise Weight: ${params.noise_weight}`);
    y += ui.font_height;
    params.noise_weight = round4(ui.slider(params.noise_weight, { x, y, z, min: 0, max: 1 }));
    y += button_spacing;

    let w = min(game_width, game_height);
    x = game_width - w;
    y = 0;
    debug_sprite.draw({
      x, y, w, h: w,
      z: Z.UI - 10,
      //uvs: debug_uvs,
      //shader: shader_hex,
    });
  }

  function testInit(dt) {
    engine.setState(test);
    test(dt);
  }

  engine.setState(testInit);
}
