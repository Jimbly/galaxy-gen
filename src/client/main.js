/*eslint global-require:off*/
const glov_local_storage = require('./glov/local_storage.js');
glov_local_storage.storage_prefix = 'glovjs-playground'; // Before requiring anything else that might load from this

const engine = require('./glov/engine.js');
const { createGalaxy } = require('./galaxy.js');
const { abs, max, min, pow, round } = Math;
const input = require('./glov/input.js');
const { KEYS } = input;
const net = require('./glov/net.js');
const shaders = require('./glov/shaders.js');
const sprites = require('./glov/sprites.js');
const textures = require('./glov/textures.js');
const ui = require('./glov/ui.js');
const { clamp, clone, deepEqual } = require('../common/util.js');
const { vec2 } = require('./glov/vmath.js');
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
    do_borders: false,
  })) {
    return;
  }
  font = engine.font;

  ui.scaleSizes(13 / 32);
  ui.setFontHeight(8);

  let tex_palette = textures.load({
    url: 'palette/pal1.png',
    filter_min: gl.NEAREST,
    filter_mag: gl.NEAREST,
    wrap_s: gl.CLAMP_TO_EDGE,
    wrap_t: gl.CLAMP_TO_EDGE,
  });

  let shader_galaxy = shaders.create('shaders/galaxy.fp');


  const buf_dim = 256;
  let params = {
    buf_dim,
    dither: 0.5,
    arms: 7,
    len_mods: 4,
    twirl: 4,
    center: 0.09,
    seed: 1,
    noise_freq: 5,
    noise_weight: 0.22,
    lone_clusters: 200,
  };
  let gen_params;
  let debug_sprite;
  function updateTexture(tex) {
    if (!debug_sprite) {
      debug_sprite = createSprite({
        texs: [tex, tex_palette],
      });
    } else {
      debug_sprite.texs[0] = tex;
    }
  }

  function round4(v) {
    return round(v * 1000)/1000;
  }

  let view = 1;
  let zoom_level = 0;
  let zoom_offs = vec2(0,0);
  let galaxy;
  let cell;
  let style = font.styleColored(null, 0x000000ff);
  let mouse_pos = vec2();
  function doZoom(x, y, delta) {
    let cur_zoom = pow(2, zoom_level);
    let new_zoom_level = max(0, zoom_level + delta);
    let new_zoom = pow(2, new_zoom_level);
    // Calc actual coords at [x,y]
    let point_x = zoom_offs[0] + x / cur_zoom;
    let point_y = zoom_offs[1] + y / cur_zoom;
    // Calc new x0 at new zoom relative to these coords
    zoom_offs[0] = max(0, point_x - x / new_zoom);
    zoom_offs[1] = max(0, point_y - y / new_zoom);
    zoom_level = new_zoom_level;
  }
  function test(dt) {

    gl.clearColor(0, 0, 0, 1);
    let z = Z.UI;

    let x = ui.button_height;
    let button_spacing = ui.button_height + 6;
    let y = 4;

    if (!deepEqual(params, gen_params)) {
      gen_params = clone(params);
      if (galaxy) {
        galaxy.dispose();
      }
      galaxy = createGalaxy(params);
      cell = galaxy.getCell(0, 0);
      updateTexture(cell.tex);
    }

    if (ui.buttonText({ x, y, text: `View: ${view}`, w: ui.button_width * 0.5 }) || input.keyDownEdge(KEYS.V)) {
      view = (view + 1) % 2;
    }
    y += button_spacing;

    // if (view === 1) {
    //   ui.print(style, x, y, z, `Dither: ${params.dither}`);
    //   y += ui.font_height;
    //   params.dither = round4(ui.slider(params.dither, { x, y, z, min: 0, max: 1 }));
    //   y += button_spacing;
    // }

    ui.print(style, x, y, z, `Seed: ${params.seed}`);
    y += ui.font_height;
    params.seed = round(ui.slider(params.seed, { x, y, z, min: 1, max: 9999 }));
    y += button_spacing;

    ui.print(style, x, y, z, `Arms: ${params.arms}`);
    y += ui.font_height;
    params.arms = round(ui.slider(params.arms, { x, y, z, min: 1, max: 16 }));
    y += button_spacing;

    ui.print(style, x, y, z, `Arm Length Mods: ${params.len_mods}`);
    y += ui.font_height;
    params.len_mods = round(ui.slider(params.len_mods, { x, y, z, min: 1, max: 32 }));
    y += button_spacing;

    ui.print(style, x, y, z, `Twirl: ${params.twirl}`);
    y += ui.font_height;
    params.twirl = round4(ui.slider(params.twirl, { x, y, z, min: 0, max: 8 }));
    y += button_spacing;

    ui.print(style, x, y, z, `Center: ${params.center}`);
    y += ui.font_height;
    params.center = round4(ui.slider(params.center, { x, y, z, min: 0, max: 0.3 }));
    y += button_spacing;

    ui.print(style, x, y, z, `Noise Freq: ${params.noise_freq}`);
    y += ui.font_height;
    params.noise_freq = round4(ui.slider(params.noise_freq, { x, y, z, min: 0.1, max: 10 }));
    y += button_spacing;

    ui.print(style, x, y, z, `Noise Weight: ${params.noise_weight}`);
    y += ui.font_height;
    params.noise_weight = round4(ui.slider(params.noise_weight, { x, y, z, min: 0, max: 4 }));
    y += button_spacing;

    ui.print(style, x, y, z, `Lone Clusters: ${params.lone_clusters}`);
    y += ui.font_height;
    params.lone_clusters = round(ui.slider(params.lone_clusters, { x, y, z, min: 0, max: 1000 }));
    y += button_spacing;

    ui.panel({
      x: x - 4, y: 0, w: ui.button_width + 8, h: y, z: z - 1,
    });


    let w = min(game_width, game_height);
    x = game_width - w + 4;
    y = w - ui.button_height;

    if (ui.buttonText({ x, y, z, w: ui.button_height, text: '-' })) {
      doZoom(0.5, 0.5, -1);
    }
    x += ui.button_height + 2;
    let new_zoom = ui.slider(zoom_level, { x, y, z, min: 0, max: 16 });
    if (abs(new_zoom - zoom_level) > 0.000001) {
      doZoom(0.5, 0.5, new_zoom - zoom_level);
    }
    x += ui.button_width + 2;
    if (ui.buttonText({ x, y, z, w: ui.button_height, text: '+' })) {
      doZoom(0.5, 0.5, 1);
    }
    x += ui.button_height + 2;
    let zoom = pow(2, zoom_level);
    ui.print(null, x, y + (ui.button_height - ui.font_height)/2, z,
      `${zoom.toFixed(0)}X`);

    x = game_width - w;
    y -= ui.font_height - 2;
    ui.print(null, x+2, y, z, `Offset: ${round4(zoom_offs[0])},${round4(zoom_offs[1])}`);

    let map_x0 = game_width - w;
    let map_y0 = 0;
    input.mousePos(mouse_pos);
    mouse_pos[0] = zoom_offs[0] + (mouse_pos[0] - map_x0) / w / zoom;
    mouse_pos[1] = zoom_offs[1] + (mouse_pos[1] - map_y0) / w / zoom;
    y -= ui.font_height - 2;
    ui.print(null, x+2, y, z, `Mouse: ${round4(mouse_pos[0])},${round4(mouse_pos[1])}`);

    x = map_x0;
    y = map_y0;

    let mouse_wheel = input.mouseWheel();
    if (mouse_wheel) {
      input.mousePos(mouse_pos);
      if (zoom_level === 0 && mouse_wheel < 0) {
        // recenter
        zoom_offs[0] = zoom_offs[1] = 0;
      } else {
        doZoom((mouse_pos[0] - map_x0) / w, (mouse_pos[1] - map_y0) / w, mouse_wheel*0.25);
        zoom = pow(2, zoom_level);
      }
    }
    let drag = input.drag();
    if (drag) {
      let { delta } = drag;
      zoom_offs[0] -= delta[0] / w / zoom;
      zoom_offs[1] -= delta[1] / w / zoom;
    }
    zoom_offs[0] = clamp(zoom_offs[0], -1/zoom, 1);
    zoom_offs[1] = clamp(zoom_offs[1], -1/zoom, 1);


    let draw_param = {
      x: x + (cell.x0 - zoom_offs[0]) * zoom * w,
      y: y + (cell.y0 - zoom_offs[1]) * zoom * w,
      w: w * zoom,
      h: w * zoom,
      z: Z.UI - 10,
    };
    if (view === 1) {
      draw_param.shader = shader_galaxy;
    }
    draw_param.shader_params = {
      params: [buf_dim, params.dither],
    };
    debug_sprite.draw(draw_param);
  }

  function testInit(dt) {
    engine.setState(test);
    test(dt);
  }

  engine.setState(testInit);
}
