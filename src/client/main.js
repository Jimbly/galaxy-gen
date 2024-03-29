/*eslint global-require:off*/
// eslint-disable-next-line import/order
const local_storage = require('glov/client/local_storage.js');
local_storage.setStoragePrefix('galaxy-gen'); // Before requiring anything else that might load from this

import assert from 'assert';
import * as camera2d from 'glov/client/camera2d';
import * as engine from 'glov/client/engine';
import { copyCanvasToClipboard } from 'glov/client/framebuffer';
import * as input from 'glov/client/input';
import { KEYS } from 'glov/client/input';
import * as net from 'glov/client/net';
import { netDisconnected } from 'glov/client/net';
import * as perf from 'glov/client/perf';
import * as shaders from 'glov/client/shaders';
import { slider } from 'glov/client/slider';
import { spriteSetGet } from 'glov/client/sprite_sets.js';
import * as sprites from 'glov/client/sprites';
import { BLEND_ADDITIVE, spriteCreate } from 'glov/client/sprites';
import * as textures from 'glov/client/textures';
import * as ui from 'glov/client/ui';
import {
  clamp,
  clone,
  deepEqual,
  easeInOut,
  easeOut,
  lerp,
} from 'glov/common/util';
import {
  unit_vec,
  v2add,
  v2addScale,
  v2copy,
  v2floor,
  v2set,
  vec2,
  vec4,
} from 'glov/common/vmath';
import { LAYER_STEP, createGalaxy, distSq } from './galaxy';
import { planetMapTexture, solarSystemCreate } from './solar_system';

const { abs, ceil, cos, floor, max, min, pow, round, sin, sqrt, PI } = Math;

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
  let show_panel = local_storage.getJSON('panel', 0);

  const font_info_04b03x2 = require('./img/font/04b03_8x2.json');
  const font_info_04b03x1 = require('./img/font/04b03_8x1.json');
  const font_info_palanquin32 = require('./img/font/palanquin32.json');
  let pixely = view === 1 ? 'strict' : 'on';
  let font;
  let ui_sprites;
  if (pixely === 'strict' || true) {
    font = { info: font_info_04b03x1, texture: 'font/04b03_8x1' };
    ui_sprites = spriteSetGet('pixely');
  } else if (pixely && pixely !== 'off') {
    font = { info: font_info_04b03x2, texture: 'font/04b03_8x2' };
    ui_sprites = spriteSetGet('pixely');
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
    show_fps: engine.defines.ATTRACT ? false : undefined,
    ui_sprites,
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

  let tex_palette_planets = textures.load({
    url: 'palette/pal_planets.png',
    filter_min: gl.NEAREST,
    filter_mag: gl.NEAREST,
    wrap_s: gl.CLAMP_TO_EDGE,
    wrap_t: gl.CLAMP_TO_EDGE,
  });

  let shader_galaxy_pixel = shaders.create('shaders/galaxy_blend_pixel.fp');
  let shader_galaxy_blend = shaders.create('shaders/galaxy_blend.fp');
  let shader_planet_pixel = shaders.create('shaders/planet_pixel.fp');
  let white_tex = textures.textures.white;

  const MAX_ZOOM = 16;
  const MAX_SOLAR_VIEW = 1;
  const buf_dim = 256;
  let params = {
    buf_dim,
    dither: 0.5,
    arms: 7,
    len_mods: 4,
    twirl: 4,
    center: 0.09,
    seed: 1349,
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
  let solar_params = {
    seed: 80,
    star_id: 55,
  };
  let gen_params;
  let gen_solar_params;
  let debug_sprite;
  let galaxy;
  function allocSprite() {
    if (!debug_sprite) {
      let tex = galaxy.getCellTextured(0, 0).tex;
      debug_sprite = spriteCreate({
        texs: [tex, tex, tex],
      });
    }
  }

  function round4(v) {
    return round(v * 1000)/1000;
  }
  function roundZoom(v) {
    return view === 1 ? round(v) : v;
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
    show_stat: 'false',
    labels: {
      'cells: ': () => cells_drawn.toString(),
    },
  });


  let zoom_level = local_storage.getJSON('zoom', 0);
  let solar_view = local_storage.getJSON('solar_view', 0);
  let solar_override = local_storage.getJSON('solar_override', false);
  let solar_override_system = null;
  let selected_star_id = local_storage.getJSON('selected_star', null);
  let target_zoom_level = zoom_level;
  let zoom_offs = vec2(local_storage.getJSON('offsx', 0),local_storage.getJSON('offsy', 0));
  let style = font.styleColored(null, 0x000000ff);
  let mouse_pos = vec2();
  let use_mouse_pos = false;
  const font_style_fade = font.styleColored(null, 0xFFFFFF40);
  const color_legend_fade = vec4(1,1,1,0.25);
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
  let eff_solar_view = solar_view;
  let eff_solar_view_unsmooth = solar_view;
  function zoomTime(amount) {
    return abs(amount) * 500;
  }
  function zoomTick(max_okay_zoom) {
    let dt = engine.frame_dt;
    for (let ii = 0; ii < queued_zooms.length; ++ii) {
      let zm = queued_zooms[ii];
      let new_progress = min(1, zm.progress + dt/zoomTime(zm.delta));
      let dp;
      if (engine.defines.ATTRACT) {
        dp = new_progress - zm.progress;
      } else {
        // manual mode, smooth the application of zooming
        dp = easeOut(new_progress, 2) - easeOut(zm.progress, 2);
      }
      let new_zoom_level = min(zoom_level + zm.delta * dp, MAX_ZOOM);
      // not limiting zoom, just feels worse?
      if (zm.delta > 0 && new_zoom_level > max_okay_zoom && false) {
        continue;
      }
      zm.progress = new_progress;
      doZoomActual(zm.x, zm.y, zm.delta * dp);
      if (new_progress === 1) {
        queued_zooms.splice(ii, 1);
      }
    }
    if (!queued_zooms.length) {
      // recover from floating point issues
      zoom_level = target_zoom_level;
    }
    let dsolar = dt * 0.003;
    if (eff_solar_view_unsmooth < solar_view) {
      eff_solar_view_unsmooth = min(solar_view, eff_solar_view_unsmooth + dsolar);
    } else if (eff_solar_view_unsmooth > solar_view) {
      eff_solar_view_unsmooth = max(solar_view, eff_solar_view_unsmooth - dsolar);
    }
    let iesvu = floor(eff_solar_view_unsmooth);
    eff_solar_view = round4(iesvu + easeInOut(eff_solar_view_unsmooth - iesvu, 2));
  }
  function solarZoom(delta) {
    solar_view = clamp(solar_view + delta, 0, MAX_SOLAR_VIEW);
    local_storage.setJSON('solar_view', solar_view);
    local_storage.setJSON('selected_star', solar_view ? selected_star_id : null);
  }
  function doZoom(x, y, delta) {
    if (target_zoom_level === MAX_ZOOM && delta > 0) {
      if (selected_star_id !== null) {
        solarZoom(1);
      }
      return;
    }
    if (solar_view && delta < 0) {
      solarZoom(-1);
      return;
    }
    target_zoom_level = max(0, min(target_zoom_level + delta, MAX_ZOOM));
    queued_zooms.push({
      x, y, delta,
      progress: 0,
    });
  }

  let last_img;
  let img_id = 0;
  function saveSnapshot() {
    let src = engine.canvas;
    let viewport = engine.viewport;

    let canvas_full = document.createElement('canvas');
    canvas_full.width = game_width * 4;
    canvas_full.height = game_height * 4;
    let ctx = canvas_full.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, viewport[0], src.height - viewport[3] + viewport[1], viewport[2], viewport[3],
      0, 0, canvas_full.width, canvas_full.height);
    let data_full = canvas_full.toDataURL('image/png');
    //let data_full = canvas_full.toDataURL('image/jpeg', 0.92);
    if (data_full === last_img) {
      return;
    }
    last_img = data_full;

    if (net.client) {

      let pak = net.client.pak('img');
      pak.writeInt(img_id++);
      pak.writeString(data_full);
      pak.send();
    } else {
      let win = window.open('', 'img_preview');
      let elems = win.document.getElementsByTagName('img');
      if (elems && elems.length) {
        elems[0].remove();
      }
      win.document.write(`<html><body><img src="${data_full}"/></body></html>`);
    }
  }

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
  function drawSolarSystem(solar_system, x0, y0, z, w, h, star_xp, star_yp, fade) {
    let pmtex = planetMapTexture();
    x0 = lerp(fade, star_xp, x0);
    y0 = lerp(fade, star_yp, y0);
    w *= fade;
    h *= fade;
    let { star_data, planets } = solar_system;
    let xmid = x0 + w/2;
    let ymid = y0 + h/2;
    let sun_radius = star_data.game_radius;
    let sun_pad = w * 0.1;
    let c = star_data.color;
    ui.drawCircle(xmid, ymid, z, sun_radius + 2, 0.25, [c[0], c[1], c[2], fade], BLEND_ADDITIVE);
    ui.drawCircle(xmid, ymid, z + 0.005, sun_radius, 0.95, [c[0], c[1], c[2], fade]);
    let rstep = (w/2 - sun_pad) / (planets.length + 2);
    let r0 = sun_pad + rstep;
    for (let ii = 0; ii < planets.length; ++ii) {
      let r = r0 + rstep * ii;
      let planet = planets[ii];
      let theta = planet.orbit + planet.orbit_speed * engine.frame_timestamp*ORBIT_RATE;
      theta %= 2 * PI;
      let x = xmid + cos(theta) * r;
      let y = ymid + sin(theta) * r * VSCALE;
      // if (view === 1) {
      //   x = round(x);
      //   y = round(y);
      // }

      let zz = z + (y - ymid)/h;
      // ui.drawCircle(x, y, zz, planet.size + 2, 0.99, [0,0,0,fade]);
      // c = planet.type.color;
      // ui.drawCircle(x, y, zz + 0.00001, planet.size, 0.99, [c[0], c[1], c[2], fade]);
      drawElipse(xmid, ymid, z - 2, r, r * VSCALE, [0.5, 0.5, 0, fade]);

      let sprite_size = planet.size;
      let planet_params = {
        params: [engine.frame_timestamp * 0.0003, pmtex.width / (sprite_size)*1.5 / 255, 2 - theta / PI, 0],
      };
      sprites.queueraw([pmtex, planet.getTexture(sprite_size*2), tex_palette_planets],
        x - sprite_size, y - sprite_size, zz, sprite_size*2, sprite_size*2, 0, 0, 1, 1,
        [1,1,1,fade], shader_planet_pixel, planet_params);
    }

    // draw backdrop
    let br0 = w/2 * 1.5;
    let br1 = h/2*VSCALE * 1.5;
    ui.drawElipse(xmid - br0, ymid - br1, xmid + br0, ymid + br1, z - 2.1, 0, [0,0,0,fade]);
  }

  let drag_temp = vec2();
  function test(dt) {

    gl.clearColor(0, 0, 0, 1);
    let z = Z.UI;

    let x = 4;
    let button_spacing = ui.button_height + 6;
    let y = 4;

    let w = min(game_width, game_height);
    let map_x0 = show_panel ? game_width - w : (game_width - w)/2;
    let map_y0 = 0;

    function checkLevel(check_zoom_level) {
      let zoom = pow(2, zoom_level);
      let layer_idx = floor(check_zoom_level / (LAYER_STEP/ 2));
      let gal_x0 = (camera2d.x0Real() - map_x0) / w / zoom + zoom_offs[0];
      let gal_x1 = (camera2d.x1Real() - map_x0) / w / zoom + zoom_offs[0];
      let gal_y0 = (camera2d.y0Real() - map_y0) / w / zoom + zoom_offs[1];
      let gal_y1 = (camera2d.y1Real() - map_y0) / w / zoom + zoom_offs[1];
      let layer_res = pow(LAYER_STEP, layer_idx);
      let layer_x0 = max(0, floor(gal_x0 * layer_res));
      let layer_x1 = min(layer_res - 1, floor(gal_x1 * layer_res));
      let layer_y0 = max(0, floor(gal_y0 * layer_res));
      let layer_y1 = min(layer_res - 1, floor(gal_y1 * layer_res));
      for (let cy = layer_y0; cy <= layer_y1; ++cy) {
        for (let cx = layer_x0; cx <= layer_x1; ++cx) {
          let cell = galaxy.getCellTextured(layer_idx, cy * layer_res + cx);
          if (!cell.tex) {
            return false;
          }
        }
      }
      return true;
    }
    let max_okay_zoom = zoom_level;
    if (galaxy) {
      let zlis = [
        (LAYER_STEP/2) * ceil(zoom_level / (LAYER_STEP/2)),
        (LAYER_STEP/2) * ceil((zoom_level + 1) / (LAYER_STEP/2)),
      ];
      // ui.print(font.styleColored(null, 0x808080ff), 10, 20, 1000, `${zlis[0]} (${zoom_level})`);
      for (let ii = 0; ii < zlis.length; ++ii) {
        let r = checkLevel(zlis[ii]);
        if (r) {
          max_okay_zoom = zlis[ii];
        }
        // ui.print(font.styleColored(null, 0x808080ff), 10, 30 + ii * ui.font_height, 1000, `${zlis[ii]}: ${r}`);
      }
    }

    if (galaxy && !engine.defines.ATTRACT) {
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
      galaxy.loading = first || engine.defines.ATTRACT;
      allocSprite();
    }

    if (input.keyDown(KEYS.CTRL) && input.keyDownEdge(KEYS.C)) {
      copyCanvasToClipboard();
    }

    if (show_panel) {
      if (ui.buttonText({ x, y, text: `View: ${view ? 'Pixely' : 'Raw'}`, w: ui.button_width * 0.75 }) ||
        input.keyDownEdge(KEYS.V)
      ) {
        view = (view + 1) % 2;
        local_storage.setJSON('view', view);
        setTimeout(() => engine.setPixelyStrict(view === 1), 0);
        //engine.reloadSafe();
      }

      if (ui.buttonText({ x: x + ui.button_width - ui.button_height, y, text: '<<', w: ui.button_height }) ||
        input.keyDownEdge(KEYS.ESC)
      ) {
        show_panel = !show_panel;
        local_storage.setJSON('panel', show_panel);
      }

      y += button_spacing;

      // if (view === 1) {
      //   ui.print(style, x, y, z, `Dither: ${params.dither}`);
      //   y += ui.font_height;
      //   params.dither = round4(slider(params.dither, { x, y, z, min: 0, max: 1 }));
      //   y += button_spacing;
      // }

      if (solar_view) {
        if (ui.buttonText({ x, y, z, text: solar_override ? 'Override' : 'Generated' })) {
          solar_override = !solar_override;
          local_storage.setJSON('solar_override', solar_override);
          solar_override_system = null;
        }
        y += button_spacing;
        if (solar_override) {
          ui.print(style, x, y, z, `StarID: ${solar_params.star_id}`);
          y += ui.font_height;
          solar_params.star_id = round(slider(solar_params.star_id, { x, y, z, min: 1, max: 99 }));
          y += button_spacing;

          ui.print(style, x, y, z, `Seed: ${solar_params.seed}`);
          y += ui.font_height;
          solar_params.seed = round(slider(solar_params.seed, { x, y, z, min: 1, max: 99 }));
          y += button_spacing;

          if (!solar_override_system || !deepEqual(solar_params, gen_solar_params)) {
            gen_solar_params = clone(solar_params);
            solar_override_system = solarSystemCreate(solar_params.seed, {
              // Fake Star structure
              id: solar_params.star_id,
            });
          }
        }
      } else {
        ui.print(style, x, y, z, `Seed: ${params.seed}`);
        y += ui.font_height;
        params.seed = round(slider(params.seed, { x, y, z, min: 1, max: 9999 }));
        y += button_spacing;

        if (zoom_level < 1.9) { // Galaxy
          ui.print(style, x, y, z, `Arms: ${params.arms}`);
          y += ui.font_height;
          params.arms = round(slider(params.arms, { x, y, z, min: 1, max: 16 }));
          y += button_spacing;

          ui.print(style, x, y, z, `Arm Mods: ${params.len_mods}`);
          y += ui.font_height;
          params.len_mods = round(slider(params.len_mods, { x, y, z, min: 1, max: 32 }));
          y += button_spacing;

          ui.print(style, x, y, z, `Twirl: ${params.twirl}`);
          y += ui.font_height;
          params.twirl = round4(slider(params.twirl, { x, y, z, min: 0, max: 8 }));
          y += button_spacing;

          ui.print(style, x, y, z, `Center: ${params.center}`);
          y += ui.font_height;
          params.center = round4(slider(params.center, { x, y, z, min: 0, max: 0.3 }));
          y += button_spacing;

          ui.print(style, x, y, z, `Noise Freq: ${params.noise_freq}`);
          y += ui.font_height;
          params.noise_freq = round4(slider(params.noise_freq, { x, y, z, min: 0.1, max: 10 }));
          y += button_spacing;

          ui.print(style, x, y, z, `Noise Weight: ${params.noise_weight}`);
          y += ui.font_height;
          params.noise_weight = round4(slider(params.noise_weight, { x, y, z, min: 0, max: 4 }));
          y += button_spacing;

          ui.print(style, x, y, z, `Lone Clusters: ${params.poi_count}`);
          y += ui.font_height;
          params.poi_count = round(slider(params.poi_count, { x, y, z, min: 0, max: 1000 }));
          y += button_spacing;
        } else {
          let layer_idx = round(zoom_level / (LAYER_STEP / 2));
          ui.print(style, x, y, z, `Layer #${layer_idx}:`);
          y += ui.font_height + 2;
          let key = `layer${layer_idx}`;
          if (params[key]) {
            ui.print(style, x, y, z, `Noise Freq: ${params[key].noise_freq}`);
            y += ui.font_height;
            params[key].noise_freq = round4(slider(params[key].noise_freq,
              { x, y, z, min: 0.1, max: 100 * pow(2, layer_idx) }));
            y += button_spacing;

            ui.print(style, x, y, z, `Noise Weight: ${params[key].noise_weight}`);
            y += ui.font_height;
            params[key].noise_weight = round4(slider(params[key].noise_weight, { x, y, z, min: 0, max: 4 }));
            y += button_spacing;
          }
        }
      }

      ui.panel({
        x: x - 4, y: 0, w: ui.button_width + 8, h: y, z: z - 1,
      });
    } else {
      if (!engine.defines.ATTRACT && ui.buttonText({ x, y, text: '>>', w: ui.button_height }) ||
        input.keyDownEdge(KEYS.ESC)
      ) {
        show_panel = !show_panel;
        local_storage.setJSON('panel', show_panel);
      }
      y += button_spacing;
    }

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
    let new_zoom = roundZoom(slider(target_zoom_level + solar_view,
      { x, y, z, w: SLIDER_W, min: 0, max: MAX_ZOOM + 1 }));
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
    if (input.click({ button: 2 })) {
      mouse_wheel-=1;
    }
    if (mouse_wheel) {
      use_mouse_pos = true;
      input.mousePos(mouse_pos);
      if (mouse_wheel < 0 && eff_solar_view_unsmooth && !solar_view) {
        // ignore
      } else {
        doZoom((mouse_pos[0] - map_x0) / w, (mouse_pos[1] - map_y0) / w, mouse_wheel);
      }
    }

    zoomTick(max_okay_zoom);
    let zoom = pow(2, zoom_level);
    let zoom_text_y = floor(y + (ui.button_height - ui.font_height)/2);
    let zoom_text_w = ui.print(null, x, zoom_text_y, z,
      solar_view ? 'Solar' : `${zoom.toFixed(0)}X`);
    ui.drawRect(x - 2, zoom_text_y, x + zoom_text_w + 2, zoom_text_y + ui.font_height, z - 1, color_text_backdrop);

    x = game_width - w;
    // y -= ui.font_height;
    // ui.print(null, x+2, y, z, `Offset: ${round4(zoom_offs[0])},${round4(zoom_offs[1])}`);

    let legend_scale = 0.25;
    let legend_x0 = game_width - w*legend_scale - 2;
    let legend_x1 = game_width - 4;
    let legend_color = solar_view ? color_legend_fade : unit_vec;
    y = w;

    ui.drawLine(legend_x0, y - 4.5, legend_x1, y - 4.5, z, 1, 1, legend_color);
    ui.drawLine(legend_x0 - 0.5, y - 7, legend_x0 - 0.5, y - 2, z, 1, 1, legend_color);
    ui.drawLine(legend_x1 + 0.5, y - 7, legend_x1 + 0.5, y - 2, z, 1, 1, legend_color);
    let ly = legend_scale * params.width_ly / zoom;
    let legend_y = y - 6 - ui.font_height;
    font.drawSizedAligned(solar_view ? font_style_fade : null,
      legend_x0, legend_y, z, ui.font_height, font.ALIGN.HCENTER, legend_x1 - legend_x0, 0,
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
    if (solar_view) {
      v2set(drag_temp, 0, 0);
    }
    if (drag_temp[0] || drag_temp[1]) {
      zoom_offs[0] -= drag_temp[0] / w / zoom;
      zoom_offs[1] -= drag_temp[1] / w / zoom;
      local_storage.setJSON('offsx', zoom_offs[0]);
      local_storage.setJSON('offsy', zoom_offs[1]);
    }
    if (engine.defines.ATTRACT) {
      zoom_offs[0] = clamp(zoom_offs[0], 0, 1 - 1/zoom);
      zoom_offs[1] = clamp(zoom_offs[1], 0, 1 - 1/zoom);
    } else {
      zoom_offs[0] = clamp(zoom_offs[0], -1/zoom, 1);
      zoom_offs[1] = clamp(zoom_offs[1], -1/zoom, 1);
    }

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
    let overlay_x = show_panel ? map_x0 + 2 : ui.button_height * 2;
    let overlay_w = 0;
    function overlayText(line) {
      if (engine.defines.ATTRACT) {
        return;
      }
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
      let dither = lerp(clamp(zoom_level - 12.5, 0, 1), params.dither, 0);
      draw_param.shader_params = {
        params: [alpha ? buf_dim : buf_dim / LAYER_STEP, dither],
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
      let star;
      const SELECT_DIST = 40;
      if (!solar_override_system) {
        if ((solar_view || eff_solar_view) && selected_star_id !== null) {
          // keep it
          star = galaxy.getStar(selected_star_id);
        } else {
          let closest = galaxy.starsNear(mouse_pos[0], mouse_pos[1], 1);
          let star_id = closest.length ? closest[0] : null;
          star = star_id !== null && galaxy.getStar(star_id);
          if (star && sqrt(distSq(star.x, star.y, mouse_pos[0], mouse_pos[1])) * zoom * w > SELECT_DIST) {
            star = null;
          }
          if (star) {
            selected_star_id = star_id;
          } else {
            selected_star_id = null;
          }
        }
      }
      let xp = x + w/2;
      let yp = y + w/2;
      if (star) {
        let max_zoom = pow(2, MAX_ZOOM);
        xp = floor(star.x * max_zoom * buf_dim);
        yp = floor(star.y * max_zoom * buf_dim);
        xp = x + (xp*zoom/max_zoom/buf_dim - zoom_offs[0] * zoom) * w;
        yp = y + (yp*zoom/max_zoom/buf_dim - zoom_offs[1] * zoom) * w;
        if (view === 1) {
          xp = round(xp);
          yp = round(yp);
        }
        let r = 4 / (1 + MAX_ZOOM - zoom_level);
        if (!solar_view) {
          ui.drawHollowCircle(xp + 0.5, yp + 0.5, Z.UI - 5, r, 0.5, [1,1,0,1], BLEND_ADDITIVE);
          if (input.click({
            x: xp - SELECT_DIST,
            y: yp - SELECT_DIST,
            w: SELECT_DIST * 2,
            h: SELECT_DIST * 2,
          })) {
            if (zoom_level < MAX_ZOOM) {
              doZoom((xp - map_x0) / w, (yp - map_y0) / w, MAX_ZOOM - zoom_level);
            }
            solarZoom(1);
          }
        }

        galaxy.getStarData(star);
      }
      let solar_system = solar_override_system || star && star.solar_system;
      if (solar_system) {
        let { planets, star_data, name } = solar_system;
        overlayText(`${name || (star && star.id ? `Star #${star.id}` : '') || 'Override Star'}` +
          `, Type: ${star_data.label}`);
        for (let ii = 0; ii < planets.length; ++ii) {
          let planet = planets[ii];
          overlayText(`  Planet #${ii+1}: Class ${planet.type.name}`);
        }
        let do_view = eff_solar_view ? eff_solar_view : engine.defines.AUTOSOLAR && zoom_level > 15.5 ? 1 : 0;
        if (do_view) {
          drawSolarSystem(solar_system, map_x0, map_y0, Z.UI - 1, w, w, xp, yp, do_view);
        }
      } else if (star) {
        overlayText(`Star #${star.id}`);
      }
    }

    if (input.click()) {
      use_mouse_pos = true;
      input.mousePos(mouse_pos);
      doZoom((mouse_pos[0] - map_x0) / w, (mouse_pos[1] - map_y0) / w, solar_view ? -1 : 1);
    }

    ui.drawRect(overlay_x - 2, 0, overlay_x + overlay_w + 2, overlay_y, z - 1, color_text_backdrop);

    if (engine.defines.ATTRACT && !netDisconnected()) {
      engine.postRender(saveSnapshot);
    }
  }

  function testInit(dt) {
    engine.setState(test);
    test(dt);
  }

  engine.setState(testInit);
}
