/*eslint global-require:off*/
const local_storage = require('./glov/local_storage.js');
local_storage.storage_prefix = 'galaxy-gen'; // Before requiring anything else that might load from this

const assert = require('assert');
const camera2d = require('./glov/camera2d.js');
const engine = require('./glov/engine.js');
const { createGalaxy, distSq, LAYER_STEP } = require('./galaxy.js');
const { abs, cos, floor, max, min, pow, round, sin, sqrt, PI } = Math;
const input = require('./glov/input.js');
const { KEYS } = input;
const net = require('./glov/net.js');
const perf = require('./glov/perf.js');
const shaders = require('./glov/shaders.js');
const sprites = require('./glov/sprites.js');
const textures = require('./glov/textures.js');
const ui = require('./glov/ui.js');
const { clamp, clone, deepEqual, easeOut } = require('../common/util.js');
const { unit_vec, vec2, v2add, v2addScale, v2copy, v2floor, v2set, vec4 } = require('./glov/vmath.js');
const createSprite = sprites.create;
const { BLEND_ADDITIVE } = sprites;

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
  if (pixely === 'strict' || true) {
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
    url: 'palette/pal2.png',
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

    layer1: {
      noise_freq: 20,
      noise_weight: 0.2,
    },
    layer2: {
      noise_freq: 80,
      noise_weight: 0.2,
    },
    layer3: {
      noise_freq: 250,
      noise_weight: 0.2,
    },
    layer4: {
      noise_freq: 750,
      noise_weight: 0.25,
    },
    layer5: {
      noise_freq: 2500,
      noise_weight: 0.3,
    },
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
  let use_mouse_pos = false;
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

  const color_black = vec4(0,0,0,1);
  const color_orbit = vec4(0.5, 0.5, 0, 1);
  const VSCALE = 0.5;
  function drawElipse(x, y, z, r0, r1, color) {
    let segments = max(20, r0 - 10);
    let last_pos = [0,0];
    let cur_pos = [0,0];
    for (let ii = 0; ii <= segments + 1; ++ii) {
      v2copy(last_pos, cur_pos);
      let theta = ii / segments * PI * 2 + 0.1;
      v2set(cur_pos, x + cos(theta) * r0, y + sin(theta) * r1);
      if (view === 1) {
        v2floor(cur_pos, cur_pos);
        v2addScale(cur_pos, cur_pos, unit_vec, 0.5);
      }
      if (ii) {
        ui.drawLine(last_pos[0], last_pos[1], cur_pos[0], cur_pos[1], z, 1, 0.9, color);
      }
    }
  }
  const ORBIT_RATE = 0.0002;
  function drawSolarSystem(solar_system, x0, y0, z, w, h) {
    let { star_data, planets } = solar_system;
    let xmid = x0 + w/2;
    let ymid = y0 + h/2;
    let sun_radius = star_data.game_radius;
    let sun_pad = w * 0.1;
    ui.drawCircle(xmid, ymid, z, sun_radius + 2, 0.25, star_data.color, BLEND_ADDITIVE);
    ui.drawCircle(xmid, ymid, z + 0.005, sun_radius, 0.95, star_data.color);
    let rstep = (w/2 - sun_pad) / (planets.length + 2);
    let r0 = sun_pad + rstep;
    for (let ii = 0; ii < planets.length; ++ii) {
      let r = r0 + rstep * ii;
      let planet = planets[ii];
      let x = xmid + cos(planet.orbit + planet.orbit_speed * engine.frame_timestamp*ORBIT_RATE) * r;
      let y = ymid + sin(planet.orbit + planet.orbit_speed * engine.frame_timestamp*ORBIT_RATE) * r * VSCALE;
      let zz = z + (y - ymid)/h;
      ui.drawCircle(x, y, zz, planet.size + 2, 0.99, color_black);
      ui.drawCircle(x, y, zz + 0.005, planet.size, 0.99, planet.type.color);
      drawElipse(xmid, ymid, z - 2, r, r * VSCALE, color_orbit);
    }

    // draw backdrop
    let br0 = w/2;
    let br1 = h/2*VSCALE;
    ui.drawElipse(xmid - br0, ymid - br1, xmid + br0, ymid + br1, z - 2.1, 0, color_black);
  }

  let drag_temp = vec2();
  function test(dt) {

    gl.clearColor(0, 0, 0, 1);
    let z = Z.UI;

    let x = 4;
    let button_spacing = ui.button_height + 6;
    let y = 4;

    let w = min(game_width, game_height);
    let map_x0 = game_width - w;
    let map_y0 = 0;

    if (galaxy) {
      galaxy.loading = false;
    }

    if (!deepEqual(params, gen_params)) {
      gen_params = clone(params);
      let first = true;
      if (galaxy) {
        first = false;
        galaxy.dispose();
      }
      galaxy = createGalaxy(params);
      galaxy.loading = first;
      allocSprite();
    }

    if (ui.buttonText({ x, y, text: `View: ${view ? 'Pixely' : 'Raw'}`, w: ui.button_width * 0.75 }) ||
      input.keyDownEdge(KEYS.V)
    ) {
      view = (view + 1) % 2;
      local_storage.setJSON('view', view);
      setTimeout(() => engine.setPixelyStrict(view === 1), 0);
      //engine.reloadSafe();
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

    if (zoom_level < 1.9) { // Galaxy
      ui.print(style, x, y, z, `Arms: ${params.arms}`);
      y += ui.font_height;
      params.arms = round(ui.slider(params.arms, { x, y, z, min: 1, max: 16 }));
      y += button_spacing;

      ui.print(style, x, y, z, `Arm Mods: ${params.len_mods}`);
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
    } else {
      let layer_idx = round(zoom_level / (LAYER_STEP / 2));
      ui.print(style, x, y, z, `Layer #${layer_idx}:`);
      y += ui.font_height + 2;
      let key = `layer${layer_idx}`;
      if (params[key]) {
        ui.print(style, x, y, z, `Noise Freq: ${params[key].noise_freq}`);
        y += ui.font_height;
        params[key].noise_freq = round4(ui.slider(params[key].noise_freq,
          { x, y, z, min: 0.1, max: 100 * pow(2, layer_idx) }));
        y += button_spacing;

        ui.print(style, x, y, z, `Noise Weight: ${params[key].noise_weight}`);
        y += ui.font_height;
        params[key].noise_weight = round4(ui.slider(params[key].noise_weight, { x, y, z, min: 0, max: 4 }));
        y += button_spacing;
      }
    }

    ui.panel({
      x: x - 4, y: 0, w: ui.button_width + 8, h: y, z: z - 1,
    });


    x = game_width - w + 4;
    y = w - ui.button_height;

    if (ui.buttonText({ x, y, z, w: ui.button_height, text: '-' }) ||
      input.keyDownEdge(KEYS.MINUS) || input.keyDownEdge(KEYS.Q)
    ) {
      use_mouse_pos = false;
      doZoom(0.5, 0.5, -1);
    }
    x += ui.button_height + 2;
    const SLIDER_W = 110;
    let new_zoom = ui.slider(target_zoom_level, { x, y, z, w: SLIDER_W, min: 0, max: MAX_ZOOM });
    if (abs(new_zoom - target_zoom_level) > 0.000001) {
      doZoom(0.5, 0.5, new_zoom - target_zoom_level);
    }
    x += SLIDER_W + 2;
    if (ui.buttonText({ x, y, z, w: ui.button_height, text: '+' }) ||
      input.keyDownEdge(KEYS.EQUALS) ||
      input.keyDownEdge(KEYS.E)
    ) {
      use_mouse_pos = false;
      doZoom(0.5, 0.5, 1);
    }
    x += ui.button_height + 2;
    let mouse_wheel = input.mouseWheel();
    if (mouse_wheel) {
      use_mouse_pos = true;
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

    v2set(drag_temp, 0, 0);
    let kb_scale = input.keyDown(KEYS.SHIFT) ? 0.5 : 0.125;
    drag_temp[0] += input.keyDown(KEYS.A) * kb_scale;
    drag_temp[0] -= input.keyDown(KEYS.D) * kb_scale;
    drag_temp[1] += input.keyDown(KEYS.W) * kb_scale;
    drag_temp[1] -= input.keyDown(KEYS.S) * kb_scale;
    let drag = input.drag();
    if (drag && drag.delta) {
      v2add(drag_temp, drag_temp, drag.delta);
      use_mouse_pos = true;
    }
    if (drag_temp[0] || drag_temp[1]) {
      zoom_offs[0] -= drag_temp[0] / w / zoom;
      zoom_offs[1] -= drag_temp[1] / w / zoom;
      local_storage.setJSON('offsx', zoom_offs[0]);
      local_storage.setJSON('offsy', zoom_offs[1]);
    }
    zoom_offs[0] = clamp(zoom_offs[0], -1/zoom, 1);
    zoom_offs[1] = clamp(zoom_offs[1], -1/zoom, 1);

    if (input.mouseMoved()) {
      use_mouse_pos = true;
    }
    if (use_mouse_pos) {
      input.mousePos(mouse_pos);
    } else {
      mouse_pos[0] = map_x0 + w/2;
      mouse_pos[1] = map_y0 + w/2;
    }
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
    if (0) {
      overlayText(`${use_mouse_pos?'Mouse':'Target'}: ${mouse_pos[0].toFixed(9)},${mouse_pos[1].toFixed(9)}`);
    }
    function highlightCell(cell) {
      let xp = x + (cell.x0 - zoom_offs[0]) * zoom * w;
      let yp = y + (cell.y0 - zoom_offs[1]) * zoom * w;
      let wp = w * zoom * cell.w;
      let hp = w * zoom * cell.h;
      if (view === 1) {
        xp = round(xp);
        yp = round(yp);
        hp = round(hp);
        wp = round(wp);
      }
      if (engine.defines.CELL) {
        ui.drawHollowRect2({
          x: xp - 0.5,
          y: yp - 0.5,
          w: wp + 1,
          h: hp + 1,
          z: Z.UI - 8,
          color: color_highlight,
        });
        overlayText(`Layer ${cell.layer_idx}, Cell ${cell.cell_idx} (${cell.cx},${cell.cy})`);
        overlayText(`Stars: ${format(cell.star_count)}`);
        if (cell.pois.length) {
          overlayText(`POIs: ${cell.pois.length}`);
        }
      }

      if (engine.defines.CURSOR) {
        let dx = floor((mouse_pos[0] - cell.x0) / cell.w * galaxy.buf_dim);
        let dy = floor((mouse_pos[1] - cell.y0) / cell.w * galaxy.buf_dim);
        let dd = cell.data[dy * galaxy.buf_dim + dx];
        overlayText(`Value: ${dd.toFixed(5)}`);
      }
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
    if (!extra && level0) {
      level0--;
      extra = 1;
    }
    drawLevel(level0 + 1, extra, Boolean(extra));

    if (zoom_level >= 12) {
      let star = galaxy.starsNear(mouse_pos[0], mouse_pos[1], 1);
      star = star && star[0];
      if (star && sqrt(distSq(star.x, star.y, mouse_pos[0], mouse_pos[1])) * zoom * w > 40) {
        star = null;
      }
      if (star) {
        overlayText(`Star #${star.id}, seed=${star.seed}`);
        let max_zoom = pow(2, MAX_ZOOM);
        let xp = floor(star.x * max_zoom * buf_dim);
        let yp = floor(star.y * max_zoom * buf_dim);
        xp = x + (xp*zoom/max_zoom/buf_dim - zoom_offs[0] * zoom) * w;
        yp = y + (yp*zoom/max_zoom/buf_dim - zoom_offs[1] * zoom) * w;
        if (view === 1) {
          xp = round(xp);
          yp = round(yp);
        }
        let r = 4 / (1 + MAX_ZOOM - zoom_level);
        ui.drawHollowCircle(xp + 0.5, yp + 0.5, Z.UI - 5, r, 0.5, [1,1,0,1], BLEND_ADDITIVE);

        galaxy.getStarData(star);
        let solar_system = star.solar_system;
        if (solar_system) {
          let { planets, star_data } = solar_system;
          overlayText(`  Star Type: ${star_data.label}`);
          for (let ii = 0; ii < planets.length; ++ii) {
            let planet = planets[ii];
            overlayText(`    Planet #${ii+1}: Class ${planet.type.name}, R=${round(planet.size)}`);
          }
          if (zoom_level > 15.5) {
            drawSolarSystem(solar_system, map_x0, map_y0, Z.UI - 1, w, w);
          }
        }
      }
    }

    ui.drawRect(overlay_x - 2, 0, overlay_x + overlay_w + 2, overlay_y, z - 1, color_text_backdrop);
  }

  function testInit(dt) {
    engine.setState(test);
    test(dt);
  }

  engine.setState(testInit);
}
