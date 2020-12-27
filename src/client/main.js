/*eslint global-require:off*/
const local_storage = require('./glov/local_storage.js');
local_storage.storage_prefix = 'galaxy-gen'; // Before requiring anything else that might load from this

const assert = require('assert');
const camera2d = require('./glov/camera2d.js');
const engine = require('./glov/engine.js');
const { createGalaxy, LAYER_STEP } = require('./galaxy.js');
const { abs, floor, max, min, pow, round } = Math;
const input = require('./glov/input.js');
const { KEYS } = input;
const net = require('./glov/net.js');
const perf = require('./glov/perf.js');
const shaders = require('./glov/shaders.js');
const sprites = require('./glov/sprites.js');
const textures = require('./glov/textures.js');
const ui = require('./glov/ui.js');
const { clamp, clone, deepEqual, easeOut } = require('../common/util.js');
const { unit_vec, vec2, vec4 } = require('./glov/vmath.js');
const createSprite = sprites.create;

window.Z = window.Z || {};
Z.BACKGROUND = 1;
Z.SPRITES = 10;
Z.PARTICLES = 20;
Z.UI_TEST = 200;

// let app = exports;
// Virtual viewport for our game logic
const game_width = 256 + 90;
const game_height = 256;

export function main() {
  if (engine.DEBUG) {
    // Enable auto-reload, etc
    net.init({ engine });
  }

  let view = local_storage.getJSON('view', 1);

  const font_info_04b03x2 = require('./img/font/04b03_8x2.json');
  const font_info_04b03x1 = require('./img/font/04b03_8x1.json');
  const font_info_palanquin32 = require('./img/font/palanquin32.json');
  let pixely = view === 1 ? 'strict' : 'on';
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

  let shader_galaxy_pixel = shaders.create('shaders/galaxy_blend_pixel.fp');
  let shader_galaxy_blend = shaders.create('shaders/galaxy_blend.fp');
  let white_tex = textures.textures.white;

  const MAX_ZOOM = 16;
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
    poi_count: 200,
    width_ly: 128*1024,
    star_count: 100*1000*1000*1000,
    max_zoom: MAX_ZOOM,
  };
  let gen_params;
  let debug_sprite;
  let galaxy;
  function allocSprite() {
    if (!debug_sprite) {
      let tex = galaxy.getCellTextured(0, 0).tex;
      debug_sprite = createSprite({
        texs: [tex, tex, tex],
      });
    }
  }

  function round4(v) {
    return round(v * 1000)/1000;
  }

  function format(v) {
    assert(v >= 0);
    if (!v) {
      return '0';
    }
    if (v > 900000000) {
      return `${(v/1000000000).toFixed(1)}B`;
    }
    if (v > 900000) {
      return `${(v/1000000).toFixed(1)}M`;
    }
    if (v > 900) {
      return `${(v/1000).toFixed(1)}K`;
    }
    if (v > 9) {
      return `${round(v)}`;
    }
    let precis = 1;
    let check = 0.2;
    while (true) {
      if (v > check) {
        return v.toFixed(precis);
      }
      check *= 0.1;
      precis++;
    }
  }

  let cells_drawn = 0;
  perf.addMetric({
    name: 'cells',
    show_stat: 'true',
    labels: {
      'cells: ': () => cells_drawn.toString(),
    },
  });


  let zoom_level = local_storage.getJSON('zoom', 0);
  let target_zoom_level = zoom_level;
  let zoom_offs = vec2(local_storage.getJSON('offsx', 0),local_storage.getJSON('offsy', 0));
  let style = font.styleColored(null, 0x000000ff);
  let mouse_pos = vec2();
  const color_highlight = vec4(1,1,0,0.75);
  const color_text_backdrop = vec4(0,0,0,0.5);
  function doZoomActual(x, y, delta) {
    let cur_zoom = pow(2, zoom_level);
    let new_zoom_level = max(0, min(zoom_level + delta, MAX_ZOOM));
    let new_zoom = pow(2, new_zoom_level);
    // Calc actual coords at [x,y]
    let point_x = zoom_offs[0] + x / cur_zoom;
    let point_y = zoom_offs[1] + y / cur_zoom;
    // Calc new x0 at new zoom relative to these coords
    zoom_offs[0] = point_x - x / new_zoom;
    zoom_offs[1] = point_y - y / new_zoom;
    zoom_level = new_zoom_level;

    if (zoom_level === 0) {
      // recenter
      zoom_offs[0] = zoom_offs[1] = 0;
    }
    local_storage.setJSON('offsx', zoom_offs[0]);
    local_storage.setJSON('offsy', zoom_offs[1]);
    local_storage.setJSON('zoom', zoom_level);
  }
  let queued_zooms = [];
  function zoomTick() {
    let dt = engine.frame_dt;
    for (let ii = 0; ii < queued_zooms.length; ++ii) {
      let zm = queued_zooms[ii];
      let new_progress = min(1, zm.progress + dt/500);
      let dp = easeOut(new_progress, 2) - easeOut(zm.progress, 2);
      zm.progress = new_progress;
      doZoomActual(zm.x, zm.y, zm.delta * dp);
      if (new_progress === 1) {
        queued_zooms.splice(ii, 1);
      }
    }
  }
  function doZoom(x, y, delta) {
    target_zoom_level = max(0, min(target_zoom_level + delta, MAX_ZOOM));
    queued_zooms.push({
      x, y, delta,
      progress: 0,
    });
  }
  function test(dt) {

    gl.clearColor(0, 0, 0, 1);
    let z = Z.UI;

    let x = 4;
    let button_spacing = ui.button_height + 6;
    let y = 4;

    let w = min(game_width, game_height);
    let map_x0 = game_width - w;
    let map_y0 = 0;

    if (!deepEqual(params, gen_params)) {
      gen_params = clone(params);
      if (galaxy) {
        galaxy.dispose();
      }
      galaxy = createGalaxy(params);
      allocSprite();
    }

    if (ui.buttonText({ x, y, text: `View: ${view}`, w: ui.button_width * 0.5 }) || input.keyDownEdge(KEYS.V)) {
      view = (view + 1) % 2;
      local_storage.setJSON('view', view);
      engine.reloadSafe();
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

    ui.print(style, x, y, z, `Lone Clusters: ${params.poi_count}`);
    y += ui.font_height;
    params.poi_count = round(ui.slider(params.poi_count, { x, y, z, min: 0, max: 1000 }));
    y += button_spacing;

    ui.panel({
      x: x - 4, y: 0, w: ui.button_width + 8, h: y, z: z - 1,
    });


    x = game_width - w + 4;
    y = w - ui.button_height;

    if (ui.buttonText({ x, y, z, w: ui.button_height, text: '-' })) {
      doZoom(0.5, 0.5, -1);
    }
    x += ui.button_height + 2;
    let new_zoom = ui.slider(target_zoom_level, { x, y, z, min: 0, max: MAX_ZOOM });
    if (abs(new_zoom - target_zoom_level) > 0.000001) {
      doZoom(0.5, 0.5, new_zoom - target_zoom_level);
    }
    x += ui.button_width + 2;
    if (ui.buttonText({ x, y, z, w: ui.button_height, text: '+' })) {
      doZoom(0.5, 0.5, 1);
    }
    x += ui.button_height + 2;
    let mouse_wheel = input.mouseWheel();
    if (mouse_wheel) {
      input.mousePos(mouse_pos);
      doZoom((mouse_pos[0] - map_x0) / w, (mouse_pos[1] - map_y0) / w, mouse_wheel*0.25);
    }

    zoomTick();
    let zoom = pow(2, zoom_level);
    let zoom_text_y = floor(y + (ui.button_height - ui.font_height)/2);
    let zoom_text_w = ui.print(null, x, zoom_text_y, z,
      `${zoom.toFixed(0)}X`);
    ui.drawRect(x - 2, zoom_text_y, x + zoom_text_w + 2, zoom_text_y + ui.font_height, z - 1, color_text_backdrop);

    x = game_width - w;
    // y -= ui.font_height;
    // ui.print(null, x+2, y, z, `Offset: ${round4(zoom_offs[0])},${round4(zoom_offs[1])}`);

    let legend_scale = 0.25;
    let legend_x0 = game_width - w*legend_scale - 2;
    let legend_x1 = game_width - 4;
    y = w;
    ui.drawLine(legend_x0 - 0.5, y - 4.5, legend_x1 + 0.5, y - 4.5, z, 1, 1, unit_vec);
    ui.drawLine(legend_x0 - 0.5, y - 7, legend_x0 - 0.5, y - 2, z, 1, 1, unit_vec);
    ui.drawLine(legend_x1 + 0.5, y - 7, legend_x1 + 0.5, y - 2, z, 1, 1, unit_vec);
    let ly = legend_scale * params.width_ly / zoom;
    let legend_y = y - 6 - ui.font_height;
    font.drawSizedAligned(null, legend_x0, legend_y, z, ui.font_height, font.ALIGN.HCENTER, legend_x1 - legend_x0, 0,
      `${format(ly)}ly`);
    ui.drawRect(legend_x0 - 2, legend_y, legend_x1 + 2, y, z - 1, color_text_backdrop);

    x = map_x0;
    y = map_y0;

    let drag = input.drag();
    if (drag) {
      let { delta } = drag;
      zoom_offs[0] -= delta[0] / w / zoom;
      zoom_offs[1] -= delta[1] / w / zoom;
      local_storage.setJSON('offsx', zoom_offs[0]);
      local_storage.setJSON('offsy', zoom_offs[1]);
    }
    zoom_offs[0] = clamp(zoom_offs[0], -1/zoom, 1);
    zoom_offs[1] = clamp(zoom_offs[1], -1/zoom, 1);

    input.mousePos(mouse_pos);
    mouse_pos[0] = zoom_offs[0] + (mouse_pos[0] - map_x0) / w / zoom;
    mouse_pos[1] = zoom_offs[1] + (mouse_pos[1] - map_y0) / w / zoom;

    let overlay_y = 0;
    let overlay_x = map_x0 + 2;
    let overlay_w = 0;
    function overlayText(line) {
      let textw = ui.print(null, overlay_x, overlay_y, z, line);
      overlay_w = max(overlay_w, textw);
      overlay_y += ui.font_height;
    }
    overlayText(`Mouse: ${round4(mouse_pos[0])},${round4(mouse_pos[1])}`);
    function highlightCell(cell) {
      ui.drawHollowRect2({
        x: floor(x + (cell.x0 - zoom_offs[0]) * zoom * w) - 0.5,
        y: floor(y + (cell.y0 - zoom_offs[1]) * zoom * w) - 0.5,
        w: w * zoom * cell.w + 1,
        h: w * zoom * cell.h + 1,
        z: Z.UI - 8,
        color: color_highlight,
      });

      overlayText(`Layer ${cell.layer_idx}, Cell ${cell.cell_idx} (${cell.cx},${cell.cy})`);
      overlayText(`Stars: ${format(cell.star_count)}`);
      overlayText(`POIs: ${cell.pois.length}`);
      let dx = floor((mouse_pos[0] - cell.x0) / cell.w * galaxy.buf_dim);
      let dy = floor((mouse_pos[1] - cell.y0) / cell.w * galaxy.buf_dim);
      let dd = cell.data[dy * galaxy.buf_dim + dx];
      overlayText(`Value: ${dd.toFixed(5)}`);
    }

    let did_highlight = false;
    function checkCellHighlight(cell) {
      if (cell.ready && !did_highlight &&
        mouse_pos[0] >= cell.x0 && mouse_pos[0] < cell.x0 + cell.w &&
        mouse_pos[1] >= cell.y0 && mouse_pos[1] < cell.y0 + cell.h
      ) {
        did_highlight = true;
        highlightCell(cell);
      }
    }

    cells_drawn = 0;
    function drawCell(alpha, parent, cell) {
      ++cells_drawn;
      let qx = cell.cx - parent.cx * LAYER_STEP;
      let qy = cell.cy - parent.cy * LAYER_STEP;
      let draw_param = {
        x: x + (cell.x0 - zoom_offs[0]) * zoom * w,
        y: y + (cell.y0 - zoom_offs[1]) * zoom * w,
        w: w * zoom * cell.w,
        h: w * zoom * cell.h,
        z: Z.UI - 10,
        nozoom: true,
      };
      let partial = false;
      if (!parent.tex) {
        if (!cell.tex) {
          return;
        }
        alpha = 1;
        partial = true;
      } else if (!cell.tex) {
        alpha = 0;
        partial = true;
      }
      draw_param.shader = view === 1 ? shader_galaxy_pixel : shader_galaxy_blend;
      draw_param.shader_params = {
        params: [alpha ? buf_dim : buf_dim / LAYER_STEP, params.dither],
        scale: [qx/LAYER_STEP, qy/LAYER_STEP, 1/LAYER_STEP, alpha],
      };
      let texs = cell.texs;
      if (!texs) {
        texs = [cell.tex || white_tex, parent.tex || white_tex, tex_palette];
        if (!partial) {
          cell.texs = texs;
        }
      }
      debug_sprite.texs = texs;
      debug_sprite.draw(draw_param);
    }
    function drawLevel(layer_idx, alpha, do_highlight) {
      let gal_x0 = (camera2d.x0Real() - map_x0) / w / zoom + zoom_offs[0];
      let gal_x1 = (camera2d.x1Real() - map_x0) / w / zoom + zoom_offs[0];
      let gal_y0 = (camera2d.y0Real() - map_y0) / w / zoom + zoom_offs[1];
      let gal_y1 = (camera2d.y1Real() - map_y0) / w / zoom + zoom_offs[1];
      let layer_res = pow(LAYER_STEP, layer_idx);
      let layer_x0 = max(0, floor(gal_x0 * layer_res));
      let layer_x1 = min(layer_res - 1, floor(gal_x1 * layer_res));
      let layer_y0 = max(0, floor(gal_y0 * layer_res));
      let layer_y1 = min(layer_res - 1, floor(gal_y1 * layer_res));
      let pres = pow(LAYER_STEP, layer_idx - 1);
      for (let cy = layer_y0; cy <= layer_y1; ++cy) {
        for (let cx = layer_x0; cx <= layer_x1; ++cx) {
          let cell = galaxy.getCellTextured(layer_idx, cy * layer_res + cx);
          let px = floor(cx / LAYER_STEP);
          let py = floor(cy / LAYER_STEP);
          let parent = galaxy.getCellTextured(layer_idx - 1, py * pres + px);

          drawCell(alpha, parent, cell);

          if (do_highlight) {
            checkCellHighlight(cell);
          } else {
            checkCellHighlight(parent);
          }
        }
      }
    }
    const blend_range = 1;
    let draw_level = max(0, (zoom_level - 1) / (LAYER_STEP/2) + blend_range/2);
    let level0 = floor(draw_level);
    let extra = min((draw_level - level0) / blend_range, 1);
    drawLevel(level0 + 1, extra, Boolean(extra));

    ui.drawRect(overlay_x - 2, 0, overlay_x + overlay_w + 2, overlay_y, z - 1, color_text_backdrop);
  }

  function testInit(dt) {
    engine.setState(test);
    test(dt);
  }

  engine.setState(testInit);
}
