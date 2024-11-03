/*eslint global-require:off*/
// Before requiring anything else that might load from this
require('glov/client/local_storage.js').setStoragePrefix('galaxy-gen'); // eslint-disable-line import/order

import assert from 'assert';
import { autoAtlas } from 'glov/client/autoatlas';
import * as camera2d from 'glov/client/camera2d';
import * as engine from 'glov/client/engine';
import {
  debugDefineIsSet,
  getFrameDt,
  getFrameTimestamp,
} from 'glov/client/engine';
import { copyCanvasToClipboard } from 'glov/client/framebuffer';
import {
  KEYS,
  inputClick,
  inputDrag,
  keyDown,
  keyDownEdge,
  mouseMoved,
  mousePos,
  mouseWheel,
} from 'glov/client/input';
import {
  localStorageGetJSON,
  localStorageSetJSON,
} from 'glov/client/local_storage';
import {
  netClient,
  netDisconnected,
  netInit,
} from 'glov/client/net';
import { addMetric } from 'glov/client/perf';
import { shaderCreate } from 'glov/client/shaders';
import { slider } from 'glov/client/slider';
import { spotSuppressPad } from 'glov/client/spot';
import { spriteSetGet } from 'glov/client/sprite_sets.js';
import {
  BLEND_ADDITIVE,
  ShaderParams,
  Sprite,
  Texture,
  spriteCreate,
  spriteQueueRaw,
} from 'glov/client/sprites';
import {
  textureLoad,
  textureWhite,
} from 'glov/client/textures';
import {
  LINE_CAP_ROUND,
  LINE_NO_AA,
  buttonText,
  drawCircle,
  drawElipse,
  drawHollowCircle,
  drawHollowRect2,
  drawLine,
  drawRect,
  panel,
  print,
  scaleSizes,
  setFontHeight,
  uiButtonHeight,
  uiButtonWidth,
  uiTextHeight,
} from 'glov/client/ui';
import walltime from 'glov/client/walltime';
import {
  clamp,
  clone,
  deepEqual,
  easeInOut,
  easeOut,
  lerp,
  merge,
  mod,
} from 'glov/common/util';
import {
  JSVec2,
  ROVec4,
  Vec2,
  rovec4,
  unit_vec,
  v2add,
  v2addScale,
  v2copy,
  v2dist,
  v2distSq,
  v2floor,
  v2set,
  vec2,
  vec4,
} from 'glov/common/vmath';
import {
  BIOMES,
  Biome,
} from './biomes';
import {
  Galaxy,
  GalaxyCellAlloced,
  GenGalaxyParams,
  LAYER_STEP,
  createGalaxy,
  distSq,
} from './galaxy';
import {
  BIT_DETAIL_IDX_SHIFT,
  BIT_RARITY_MASK,
  BIT_SAME_LOOSE,
  PLANET_TYPE_NAMES,
  Planet,
  PlanetOverrideParams,
  SolarSystem,
  planetCreate,
  planetMapFlatTexture,
  planetMapTexture,
  solarSystemCreate,
} from './solar_system';

const { abs, ceil, cos, floor, max, min, pow, round, sin, sqrt, PI } = Math;

window.Z = window.Z || {};
Z.BACKGROUND = 1;
Z.SPRITES = 10;
Z.PARTICLES = 20;
Z.SOLAR = 60;
Z.PLANET = 70;
Z.PLANET_MAP = 80;
Z.UI = 100;

// let app = exports;
// Virtual viewport for our game logic
const game_width = 256 + 90;
const game_height = 256;

function zoomTime(amount: number): number {
  return abs(amount) * 500;
}

class Zoomer {
  zoom_level: number;
  zoom_offs = vec2();
  target_zoom_level: number;
  queued_zooms: {
    x: number;
    y: number;
    progress: number;
    delta: number;
  }[] = [];

  constructor(
    public zoom_level_key: string,
    public zoom_offs_key: string,
    public max_zoom: number,
    public auto_recenter: boolean
  ) {
    this.zoom_level = localStorageGetJSON(this.zoom_level_key, 0);
    v2set(this.zoom_offs,
      localStorageGetJSON(`${this.zoom_offs_key}x`, 0),
      localStorageGetJSON(`${this.zoom_offs_key}y`, 0));
    this.target_zoom_level = this.zoom_level;
  }
  resetZoom(zoom_level: number, offsx: number, offsy: number): void {
    this.queued_zooms = [];
    this.zoom_level = this.target_zoom_level = zoom_level;
    v2set(this.zoom_offs, offsx, offsy);
    localStorageSetJSON(this.zoom_level_key, zoom_level);
  }
  doZoomActual(x: number, y: number, delta: number): void {
    const { zoom_offs } = this;
    let { zoom_level } = this;
    let cur_zoom = pow(2, zoom_level);
    let new_zoom_level = max(0, min(zoom_level + delta, this.max_zoom));
    let new_zoom = pow(2, new_zoom_level);
    // Calc actual coords at [x,y]
    let point_x = zoom_offs[0] + x / cur_zoom;
    let point_y = zoom_offs[1] + y / cur_zoom;
    // Calc new x0 at new zoom relative to these coords
    zoom_offs[0] = point_x - x / new_zoom;
    zoom_offs[1] = point_y - y / new_zoom;
    zoom_level = new_zoom_level;

    if (zoom_level === 0 && this.auto_recenter) {
      // recenter
      zoom_offs[0] = zoom_offs[1] = 0;
    }
    this.zoom_level = zoom_level;
    localStorageSetJSON(`${this.zoom_offs_key}x`, zoom_offs[0]);
    localStorageSetJSON(`${this.zoom_offs_key}y`, zoom_offs[1]);
    localStorageSetJSON(this.zoom_level_key, zoom_level);
  }
  zoomTick(max_okay_zoom: number, dt: number): void {
    const { queued_zooms } = this;
    for (let ii = 0; ii < queued_zooms.length; ++ii) {
      let zm = queued_zooms[ii];
      let is_last = ii === queued_zooms.length - 1;
      let new_progress = min(1, zm.progress + dt/zoomTime(is_last ? zm.delta : 1));
      let dp;
      if (debugDefineIsSet('ATTRACT')) {
        dp = new_progress - zm.progress;
      } else {
        // manual mode, smooth the application of zooming
        dp = easeOut(new_progress, 2) - easeOut(zm.progress, 2);
      }
      let new_zoom_level = min(this.zoom_level + zm.delta * dp, this.max_zoom);
      // not limiting zoom, just feels worse?
      if (zm.delta > 0 && new_zoom_level > max_okay_zoom && false) {
        continue;
      }
      zm.progress = new_progress;
      this.doZoomActual(zm.x, zm.y, zm.delta * dp);
      if (new_progress === 1) {
        queued_zooms.splice(ii, 1);
      }
    }
    if (!queued_zooms.length) {
      // recover from floating point issues
      this.zoom_level = this.target_zoom_level;
    }
  }
  doZoom(x: number, y: number, delta: number): void {
    this.target_zoom_level = max(0, min(this.target_zoom_level + delta, this.max_zoom));
    this.queued_zooms.push({
      x, y, delta,
      progress: 0,
    });
  }
  drag(delta: Vec2, w: number): void {
    let zoom = pow(2, this.zoom_level);
    this.zoom_offs[0] -= delta[0] / w / zoom;
    this.zoom_offs[1] -= delta[1] / w / zoom;
    localStorageSetJSON(`${this.zoom_offs_key}x`, this.zoom_offs[0]);
    localStorageSetJSON(`${this.zoom_offs_key}y`, this.zoom_offs[1]);
  }
}


export function main(): void {
  if (engine.DEBUG) {
    // Enable auto-reload, etc
    netInit({ engine });
  }

  let view = localStorageGetJSON('view', 1);
  let show_panel = Boolean(localStorageGetJSON('panel', false));

  const font_info_04b03x2 = require('./img/font/04b03_8x2.json');
  const font_info_04b03x1 = require('./img/font/04b03_8x1.json');
  const font_info_palanquin32 = require('./img/font/palanquin32.json');
  let pixely = view === 1 ? 'strict' : 'on';
  let font_init;
  let ui_sprites;
  if (pixely === 'strict' || true) {
    font_init = { info: font_info_04b03x1, texture: 'font/04b03_8x1' };
    ui_sprites = spriteSetGet('pixely');
  } else if (pixely && pixely !== 'off') {
    font_init = { info: font_info_04b03x2, texture: 'font/04b03_8x2' };
    ui_sprites = spriteSetGet('pixely');
  } else {
    font_init = { info: font_info_palanquin32, texture: 'font/palanquin32' };
  }

  if (!engine.startup({
    game_width,
    game_height,
    pixely,
    font: font_init,
    viewport_postprocess: false,
    antialias: false,
    do_borders: false,
    show_fps: debugDefineIsSet('ATTRACT') ? false : undefined,
    ui_sprites,
    // force_webgl2: true,
    pixel_perfect: 0.8,
  })) {
    return;
  }
  let font = engine.font;

  scaleSizes(13 / 32);
  setFontHeight(8);

  let tex_palette = textureLoad({
    url: 'palette/pal2.png',
    filter_min: gl.NEAREST,
    filter_mag: gl.NEAREST,
    wrap_s: gl.CLAMP_TO_EDGE,
    wrap_t: gl.CLAMP_TO_EDGE,
  });

  let tex_palette_planets = textureLoad({
    url: 'palette/pal_planets.png',
    filter_min: gl.NEAREST,
    filter_mag: gl.NEAREST,
    wrap_s: gl.CLAMP_TO_EDGE,
    wrap_t: gl.CLAMP_TO_EDGE,
  });

  let shader_galaxy_pixel = shaderCreate('shaders/galaxy_blend_pixel.fp');
  let shader_galaxy_blend = shaderCreate('shaders/galaxy_blend.fp');
  let shader_planet_pixel = shaderCreate('shaders/planet_pixel.fp');
  let shader_planet_pixel_flat = shaderCreate('shaders/planet_pixel_flat.fp');
  let shader_pixelart = shaderCreate('shaders/pixelart.fp');
  let white_tex = textureWhite();

  let sprites = {
    grass0: autoAtlas('grass', 'def'), // 16x20
    grass1: autoAtlas('grass-l1', 'def'), // 16x20
    grass2: autoAtlas('grass-l2', 'def'), // 16x20
    lava0: autoAtlas('lava', 'def'), // 16x20
    lava1: autoAtlas('lava-l1', 'def'), // 16x20
    lava2: autoAtlas('lava-l2', 'def'), // 16x20
    ice0: autoAtlas('ice', 'def'), // 16x20
    ice1: autoAtlas('ice-l1', 'def'), // 16x20
    ice2: autoAtlas('ice-l2', 'def'), // 16x20
    sand0: autoAtlas('sand', 'def'), // 16x20
    sand1: autoAtlas('sand-l1', 'def'), // 16x20
    sand2: autoAtlas('sand-l2', 'def'), // 16x20
    parched0: autoAtlas('parched', 'def'), // 16x20
    parched1: autoAtlas('parched-l1', 'def'), // 16x20
    parched2: autoAtlas('parched-l2', 'def'), // 16x20
    treesmountains0: autoAtlas('trees-mountains', 'def'), // 52x31
    treesmountains1: autoAtlas('trees-mountains-l1', 'def'), // 52x31
    treesmountains2: autoAtlas('trees-mountains-l2', 'def'), // 52x31
    mountains0: autoAtlas('mountains', 'def'), // 26x5
    mountains1: autoAtlas('mountains-l1', 'def'), // 26x5
    mountains2: autoAtlas('mountains-l2', 'def'), // 26x5
    ocean0: autoAtlas('ocean-animated', 'def'), // 8x21
    ocean1: autoAtlas('ocean-animated-l1', 'def'), // 8x21
    ocean2: autoAtlas('ocean-animated-l2', 'def'), // 8x21
    dirt0: autoAtlas('dirt', 'def'), // 16x20
    dirt1: autoAtlas('dirt-l1', 'def'), // 16x20
    dirt2: autoAtlas('dirt-l2', 'def'), // 16x20
    gasgiant0: autoAtlas('gas-giant', 'def'), // 8x21
    gasgiant1: autoAtlas('gas-giant', 'def'), // 8x21
    gasgiant2: autoAtlas('gas-giant', 'def'), // 8x21
  };
  for (let key in sprites) {
    sprites[key as keyof typeof sprites].texs.push(tex_palette_planets);
  }

  const MAX_ZOOM = 16;
  const MAX_SOLAR_VIEW = 1;
  const MAX_PLANET_VIEW = 2;
  const MAX_PLANET_ZOOM = 7;
  const PLANET_PIXELART_LEVEL = 3;
  const buf_dim = 256;
  let params: GenGalaxyParams & {
    dither: number;
    width_ly: number;
  } = {
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
  let solar_params = merge({
    seed: 80,
    star_id: 55,
  }, localStorageGetJSON('solar_params', {}));
  let planet_params: Required<PlanetOverrideParams> = merge({
    name: 'M' as const,
    size: 12,
    seed: 50,
  }, localStorageGetJSON('planet_params', {}));
  let planet_view_params: {
    orbit: number;
    rot: number;
  } = merge({
    orbit: 0,
    rot: 0,
  }, localStorageGetJSON('planet_view_params', {}));
  let gen_params: typeof params;
  let gen_solar_params: typeof solar_params;
  let gen_planet_params: typeof planet_params;
  let debug_sprite: Sprite;
  let galaxy: Galaxy;
  function allocSprite(): void {
    if (!debug_sprite) {
      let tex = galaxy.getCellTextured(0, 0).tex;
      assert(tex);
      debug_sprite = spriteCreate({
        texs: [tex, tex, tex],
      });
    }
  }

  function round4(v: number): number {
    return round(v * 1000)/1000;
  }
  function roundZoom(v: number): number {
    return view === 1 ? round(v) : v;
  }

  function format(v: number): string {
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
  addMetric({
    name: 'cells',
    show_stat: 'false',
    labels: {
      'cells: ': () => cells_drawn.toString(),
    },
  });

  let gal_zoomer = new Zoomer('zoom', 'offs', MAX_ZOOM, true);
  let solar_view = localStorageGetJSON('solar_view', 0);
  let solar_override = localStorageGetJSON('solar_override', false);
  let solar_override_system: null | SolarSystem = null;
  let selected_star_id: number | null = localStorageGetJSON('selected_star', null);
  let planet_view = localStorageGetJSON('planet_view', 0);
  let planet_override = localStorageGetJSON('planet_override', false);
  let planet_flatmap = localStorageGetJSON('planet_flatmap', false);
  let planet_override_planet: null | Planet = null;
  let selected_planet_index: null | number = localStorageGetJSON('selected_planet', null);
  let planet_zoomer = new Zoomer('planet_zoom', 'planet_offs', MAX_PLANET_ZOOM, false);
  let style = font.styleColored(null, 0x000000ff);
  let mouse_pos = vec2();
  let use_mouse_pos = false;
  const font_style_fade = font.styleColored(null, 0xFFFFFF40);
  const color_legend_fade = vec4(1,1,1,0.25);
  const color_highlight = vec4(1,1,0,0.75);
  const color_text_backdrop = vec4(0,0,0,0.5);
  let eff_solar_view = solar_view;
  let eff_solar_view_unsmooth = solar_view;
  let eff_planet_view = planet_view;
  let eff_planet_view_unsmooth = planet_view;
  let last_planet_rot = 0;
  function zoomTick(max_okay_zoom: number): void {
    let dt = getFrameDt();
    gal_zoomer.zoomTick(max_okay_zoom, dt);
    planet_zoomer.zoomTick(planet_zoomer.max_zoom, dt);
    let dsolar = dt * 0.003;
    if (eff_solar_view_unsmooth < solar_view) {
      eff_solar_view_unsmooth = min(solar_view, eff_solar_view_unsmooth + dsolar);
    } else if (eff_solar_view_unsmooth > solar_view) {
      eff_solar_view_unsmooth = max(solar_view, eff_solar_view_unsmooth - dsolar);
    }
    let iesvu = floor(eff_solar_view_unsmooth);
    eff_solar_view = round4(iesvu + easeInOut(eff_solar_view_unsmooth - iesvu, 2));

    let dplanet = dt * 0.003;
    if (eff_planet_view_unsmooth < planet_view) {
      eff_planet_view_unsmooth = min(planet_view, eff_planet_view_unsmooth + dplanet);
    } else if (eff_planet_view_unsmooth > planet_view) {
      eff_planet_view_unsmooth = max(planet_view, eff_planet_view_unsmooth - dplanet);
    }
    let iepvu = floor(eff_planet_view_unsmooth);
    eff_planet_view = round4(iepvu + easeInOut(eff_planet_view_unsmooth - iepvu, 2));
  }
  function solarZoom(delta: number): void {
    solar_view = clamp(solar_view + delta, 0, MAX_SOLAR_VIEW);
    localStorageSetJSON('solar_view', solar_view);
    localStorageSetJSON('selected_star', solar_view ? selected_star_id : null);
  }
  function planetZoom(x: number, y: number, delta: number): void {
    if (planet_view === MAX_PLANET_VIEW && delta > 0) {
      return planet_zoomer.doZoom(x, y, delta);
    } else if (planet_view === MAX_PLANET_VIEW && delta < 0) {
      if (planet_zoomer.target_zoom_level > 0) {
        return planet_zoomer.doZoom(x, y, delta);
      }
    }
    planet_view = clamp(planet_view + delta, 0, MAX_PLANET_VIEW);
    localStorageSetJSON('planet_view', planet_view);
    localStorageSetJSON('selected_planet', planet_view ? selected_planet_index : null);
    if (planet_view === 2) {
      planet_zoomer.resetZoom(0, last_planet_rot * 2, 0);
    }
  }
  function doZoom(x: number, y: number, delta: number): void {
    if (gal_zoomer.target_zoom_level === MAX_ZOOM && delta > 0) {
      if (selected_star_id !== null) {
        if (solar_view && selected_planet_index !== null) {
          planetZoom(x, y, delta);
        } else {
          solarZoom(1);
        }
      }
      return;
    }
    if (solar_view && delta < 0) {
      if (planet_view) {
        planetZoom(x, y, delta);
      } else {
        solarZoom(-1);
      }
      return;
    }
    gal_zoomer.doZoom(x, y, delta);
  }

  let last_img: string;
  let img_id = 0;
  function saveSnapshot(): void {
    let src = engine.canvas;
    let viewport = engine.viewport;

    let canvas_full = document.createElement('canvas');
    canvas_full.width = game_width * 4;
    canvas_full.height = game_height * 4;
    let ctx = canvas_full.getContext('2d');
    assert(ctx);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, viewport[0], src.height - viewport[3] + viewport[1], viewport[2], viewport[3],
      0, 0, canvas_full.width, canvas_full.height);
    let data_full = canvas_full.toDataURL('image/png');
    //let data_full = canvas_full.toDataURL('image/jpeg', 0.92);
    if (data_full === last_img) {
      return;
    }
    last_img = data_full;

    if (netClient()) {

      let pak = netClient().pak('img');
      pak.writeInt(img_id++);
      pak.writeString(data_full);
      pak.send();
    } else {
      let win = window.open('', 'img_preview');
      assert(win);
      let elems = win.document.getElementsByTagName('img');
      if (elems && elems.length) {
        elems[0].remove();
      }
      win.document.write(`<html><body><img src="${data_full}"/></body></html>`);
    }
  }

  const VSCALE = 0.5;
  function drawHollowElipse(x: number, y: number, z: number, r0: number, r1: number, color: ROVec4): void {
    let segments = max(20, r0 - 10);
    let last_pos: JSVec2 = [0,0];
    let cur_pos: JSVec2 = [0,0];
    for (let ii = 0; ii <= segments + 1; ++ii) {
      v2copy(last_pos, cur_pos);
      let theta = ii / segments * PI * 2 + 0.1;
      v2set(cur_pos, x + cos(theta) * r0, y + sin(theta) * r1);
      if (view === 1) {
        v2floor(cur_pos, cur_pos);
        v2addScale(cur_pos, cur_pos, unit_vec, 0.5);
      }
      if (ii) {
        drawLine(last_pos[0], last_pos[1], cur_pos[0], cur_pos[1], z, 1, 1, color, LINE_NO_AA|LINE_CAP_ROUND);
      }
    }
  }

  const PLANET_FULL_RADIUS = 128;
  const ORBIT_RATE = 0.0002;
  const ROTATION_RATE = 0.0003*0.5;
  let temp_fade = vec4(1, 1, 1, 1);
  function drawPlanet(
    solar_system: SolarSystem,
    selected_planet: SelectedPlanet,
    x0: number,
    y0: number,
    z: number,
    w: number,
    h: number,
    fade: number,
  ): void {
    let { planets } = solar_system;
    let planet = planets[selected_planet.idx];
    let theta = planet.orbit + planet.orbit_speed * walltime()*ORBIT_RATE;
    theta %= 2 * PI;
    let rot = getFrameTimestamp() * ROTATION_RATE;
    if (planet_override && planet_override_planet) {
      planet = planet_override_planet;
      if (planet_view_params.orbit) {
        theta = planet_view_params.orbit / 360 * 2 * PI;
      }
      if (planet_view_params.rot) {
        rot = planet_view_params.rot / 360;
      }
    }
    last_planet_rot = rot = mod(rot, 1);

    x0 = lerp(fade, selected_planet.x, x0);
    y0 = lerp(fade, selected_planet.y, y0);
    w *= fade;
    h *= fade;
    let sprite_size = lerp(fade, planet.size, PLANET_FULL_RADIUS);

    if (planet_flatmap) {
      // note: w/h happen to be 256 here, which makes this pixel-perfect
      let pmtex = planetMapFlatTexture();
      let planet_shader_params = {
        params: [0, 0, mod(2 - theta / PI + rot*2, 2), 0],
      };
      let planet_tex = planet.getTexture(1, PLANET_FULL_RADIUS, 0, 0, 0, false);
      if (planet_tex) {
        spriteQueueRaw([pmtex, planet_tex, tex_palette_planets],
          x0, y0 + h / 2 - w / 4, z, w, w /2, 0, 0, 1, 1,
          [1,1,1,min(fade * 8, 1)], shader_planet_pixel, planet_shader_params);
      }
    } else {
      let pmtex = planetMapTexture(true);
      let xmid = x0 + w/2;
      let ymid = y0 + h/2;
      let planet_shader_params = {
        params: [rot, pmtex.width / (sprite_size)*1.5 / 255, 2 - theta / PI, 0],
      };
      let x = xmid;
      let y = ymid;
      temp_fade[3] = min(fade * 8, 1);
      let planet_tex = planet.getTexture(1, PLANET_FULL_RADIUS, 0, 0, 0, false);
      if (planet_tex) {
        spriteQueueRaw([pmtex, planet_tex, tex_palette_planets],
          x - sprite_size, y - sprite_size, z, sprite_size*2, sprite_size*2, 0, 0, 1, 1,
          temp_fade, shader_planet_pixel, planet_shader_params);
      }
    }
  }

  const MAP_FULL_SIZE = 256;
  const MAP_SUBDIVIDE = 2; // how many extra steps to subdivide the top layer
  const MAP_SUB_SIZE = MAP_FULL_SIZE / pow(2, MAP_SUBDIVIDE);
  const EMPTY_RAW_DATA = new Uint8Array(MAP_SUB_SIZE * MAP_SUB_SIZE);
  const NULL_ROWPAIR = [EMPTY_RAW_DATA, EMPTY_RAW_DATA];

  function frameListToBitmask(list: Record<string, number|number[]>): Record<number, number[]> {
    let ret: Record<number, number[]> = {};
    for (let key in list) {
      let offs = list[key];
      let qs = [];
      let v = 0;
      let len = key.length;
      for (let ii = 0; ii < len; ++ii) {
        let bit = 1 << (len - 1 - ii);
        if (key[ii] === '?') {
          qs.push(bit);
        } else if (key[ii] === '1') {
          v |= bit;
        }
      }
      let maxval = (1<<qs.length);
      for (let ii = 0; ii < maxval; ++ii) {
        for (let jj = 0; jj < qs.length; ++jj) {
          if (ii & (1 << jj)) {
            v |= qs[jj];
          } else {
            v &=~qs[jj];
          }
        }
        let v0 = ret[v];
        if (v0 === undefined) {
          v0 = ret[v] = [];
        }
        if (Array.isArray(offs)) {
          for (let kk = 0; kk < offs.length; ++kk) {
            v0.push(offs[kk]);
          }
        } else {
          v0.push(offs);
        }
      }
    }
    return ret;
  }

  let frame_offs_regular = frameListToBitmask({
    '????00?01': 2,
    '???000?1?': 3,
    '???00?10?': 4,
    '?1?100?0?': 5,
    '?1?001?0?': 7,
    //'001000100': 16,
    //'100000001': 17,
    '?0??01?0?': 18,
    '?0?10??0?': 20,
    '?01?00???': 34,
    '?1?000???': 35,
    '10?00????': 36,
    '?0?100?1?': 37,
    '?0?001?1?': 39,
    '?1?101?0?': [5,18], // top U
    '?1?10??1?': [37,35], // left U
    '?1??01?1?': [7,3], // right U
    '?0?101?1?': [39,20], // bottom U
  });

  let frame_offs_cliffs = frameListToBitmask({
    '????00?01': 2,
    '???000?1?': 3,
    '???00?10?': 4,
    '?1?100?0?': 22,
    '?1?001?0?': 23,
    '?0??01?0?': 18,
    '?0?10??0?': 20,
    '?01?00???': 34,
    '?1?000???': 35,
    '10?00????': 36,
    '?0?100?1?': 38,
    '?0?001?1?': 39,
    '?1?101?0?': 21, //[22,18], // top U
    '?1?10??1?': 6,// [38,35], // left U
    '?1??01?1?': 7, // right U
    '?0?101?1?': 21+16, // [39,20], // bottom U
  });

  let frame_offs_water = frameListToBitmask({
    '000000001': 11*8,
    '000000?1?': 5*8,
    '000000100': 15*8,
    '?1?100?00': 0*8,
    '?1?00100?': 7*8,

    '001000100': 10*8,
    '100000001': 6*8,
    '00?00100?': 8*8,
    '?00100?00': 1*8,

    '001000000': 12*8,
    '?1?000000': 3*8,
    '100000000': 16*8,
    '?00100?1?': 2*8,
    '00?001?1?': 9*8,
  });

  let frame_offs_gasgiant = frameListToBitmask({
    '?1?100?00': 0*16,
    '?00100?00': 1*16,
    '?00100?1?': 2*16,
    '?1?000000': 3*16,
    '000000?1?': 4*16,
    '100000001': 5*16,
    '?1?00100?': 6*16,
    '00?00100?': 7*16,
    '00?001?1?': 8*16,
    '001000100': 9*16,
    '000000001': 10*16,
    '001000000': 11*16,
    '000000100': 12*16,
    '100000000': 13*16,
  });

  let frame_offs_tree = frameListToBitmask({
    '0001': 1,
    '0010': 3,
    '0011': 2,
    '0100': 1 + 52*2,
    '0101': 1 + 52,
    '0110': 4 + 52*2,
    '0111': 4,
    '1000': 3 + 52*2,
    '1001': 5 + 52*2,
    '1010': 3 + 52,
    '1011': 5,
    '1100': 2 + 52*2,
    '1101': 4 + 52,
    '1110': 5 + 52,
    '1111': 2 + 52,
  });

  let frame_offs_mountain_tint = frameListToBitmask({
    '0001': 1,
    '0010': 3,
    '0011': 2,
    '0100': 1 + 26*2,
    '0101': 1 + 26,
    '0110': 4 + 26*2,
    '0111': 4,
    '1000': 3 + 26*2,
    '1001': 5 + 26*2,
    '1010': 3 + 26,
    '1011': 5,
    '1100': 2 + 26*2,
    '1101': 4 + 26,
    '1110': 5 + 26,
    '1111': 2 + 26,
  });

  type SpriteName = 'grass' | 'dirt' | 'lava' | 'ocean' | 'gasgiant' | 'sand' |
    'parched' | 'ice' | 'mountains' | 'treesmountains';
  type SubBiome = {
    sprite: SpriteName;
    frame: number;
    anim: number;
    ovr_idx?: number;
    ord: number;
    color_biome?: Biome;
    shader_param: ROVec4;
    frame_offs?: Record<number, number[]>;
    extra_overlay?: {
      ovr_idx: number;
      anim: number;
    };
  };
  function gas1(biome: Biome): SubBiome {
    return {
      sprite: 'gasgiant',
      frame: 1*16 + 15*16,
      anim: 2,
      ovr_idx: 2*16 + 15*16,
      frame_offs: frame_offs_gasgiant,
      color_biome: biome,
      extra_overlay: {
        ovr_idx: 2*16,
        anim: 3,
      },
    } as SubBiome;
  }
  function gas2(biome: Biome): SubBiome {
    return {
      sprite: 'gasgiant',
      frame: 1*16,
      anim: 3,
      ovr_idx: -15*16,
      frame_offs: frame_offs_gasgiant,
      color_biome: biome,
    } as SubBiome;
  }
  const BASE = {
    NULL: { // lowest ord
      sprite: 'grass',
      frame: 1,
    } as SubBiome,
    WATER_DEEP: {
      sprite: 'ocean',
      frame: 6*8,
      anim: 1,
      color_biome: BIOMES.WATER_DEEP,
    } as SubBiome,
    WATER_SHALLOW: {
      sprite: 'ocean',
      frame: 1*8,
      anim: 1,
      ovr_idx: 2*8,
      frame_offs: frame_offs_water,
      color_biome: BIOMES.WATER_SHALLOW,
    } as SubBiome,

    GAS_ORANGE_LIGHTa: gas1(BIOMES.GAS_ORANGE_LIGHT),
    GAS_ORANGE_LIGHTb: gas2(BIOMES.GAS_ORANGE_LIGHT),
    GAS_ORANGE_DARKa: gas1(BIOMES.GAS_ORANGE_DARK),
    GAS_ORANGE_DARKb: gas2(BIOMES.GAS_ORANGE_DARK),
    GAS_GRAYa: gas1(BIOMES.GAS_GRAY),
    GAS_GRAYb: gas2(BIOMES.GAS_GRAY),
    GAS_BLUE_DARKa: gas1(BIOMES.GAS_BLUE_DARK),
    GAS_BLUE_DARKb: gas2(BIOMES.GAS_BLUE_DARK),
    GAS_BLUE_MEDa: gas1(BIOMES.GAS_BLUE_MED),
    GAS_BLUE_MEDb: gas2(BIOMES.GAS_BLUE_MED),
    GAS_BLUE_LIGHTa: gas1(BIOMES.GAS_BLUE_LIGHT),
    GAS_BLUE_LIGHTb: gas2(BIOMES.GAS_BLUE_LIGHT),
    GAS_YELLOWa: gas1(BIOMES.GAS_YELLOW),
    GAS_YELLOWb: gas2(BIOMES.GAS_YELLOW),
    GAS_YELLOW_REDa: gas1(BIOMES.GAS_YELLOW_RED),
    GAS_YELLOW_REDb: gas2(BIOMES.GAS_YELLOW_RED),
    GAS_REDa: gas1(BIOMES.GAS_RED),
    GAS_REDb: gas2(BIOMES.GAS_RED),
    GAS_PURPLE_LIGHTa: gas1(BIOMES.GAS_PURPLE_LIGHT),
    GAS_PURPLE_LIGHTb: gas2(BIOMES.GAS_PURPLE_LIGHT),
    GAS_PURPLE_DARKa: gas1(BIOMES.GAS_PURPLE_DARK),
    GAS_PURPLE_DARKb: gas2(BIOMES.GAS_PURPLE_DARK),

    LAVAFLOW: {
      sprite: 'ocean',
      frame: 1*8,
      anim: 1,
      // ovr_idx: 2*8,
      // frame_offs: frame_offs_water,
      color_biome: BIOMES.MOLTEN_LAVAFLOW,
    } as SubBiome,
    SANDa: {
      sprite: 'sand',
      frame: 1,
      ovr_idx: (14+3) * 16 + 8,
      frame_offs: frame_offs_regular,
      color_biome: BIOMES.DESERT,
    } as SubBiome,
    SANDb: {
      sprite: 'sand',
      frame: 17,
      ovr_idx: 14 * 16 + 8,
      frame_offs: frame_offs_regular,
      color_biome: BIOMES.DESERT,
    } as SubBiome,
    GRASSa: {
      sprite: 'grass',
      frame: 1,
      ovr_idx: (14+3) * 16 + 8 - 8,
      frame_offs: frame_offs_regular,
      color_biome: BIOMES.GREEN_PLAINS,
    } as SubBiome,
    GRASSb: {
      sprite: 'grass',
      frame: 17,
      ovr_idx: 14 * 16 + 8,
      frame_offs: frame_offs_regular,
      color_biome: BIOMES.GREEN_PLAINS,
    } as SubBiome,
    MOONROCK1: {
      sprite: 'dirt',
      frame: 17,
      ovr_idx: 14 * 16 + 8,
      frame_offs: frame_offs_regular,
      color_biome: BIOMES.MOONROCK1,
    } as SubBiome,
    MOONROCK2: {
      sprite: 'dirt',
      frame: 17,
      ovr_idx: 6*16 + 7, // (14+3) * 16 + 8,
      frame_offs: frame_offs_cliffs,
      color_biome: BIOMES.MOONROCK2,
    } as SubBiome,
    MOONROCK3: {
      sprite: 'dirt',
      frame: 17,
      ovr_idx: 6*16 + 7, // (14+3) * 16 + 8,
      frame_offs: frame_offs_cliffs,
      color_biome: BIOMES.MOONROCK3,
    } as SubBiome,
    DIRT_DARKa: {
      sprite: 'dirt',
      frame: 1,
      ovr_idx: (14+3) * 16 + 8,
      frame_offs: frame_offs_regular,
      color_biome: BIOMES.DIRT_DARK,
    } as SubBiome,
    DIRT_DARKb: {
      sprite: 'dirt',
      frame: 17,
      ovr_idx: 14 * 16 + 8,
      frame_offs: frame_offs_regular,
      color_biome: BIOMES.DIRT_DARK,
    } as SubBiome,
    DIRTa: {
      sprite: 'sand',
      frame: 1,
      ovr_idx: 2*16 + 7, // (14+3) * 16 + 8,
      frame_offs: frame_offs_cliffs,
      color_biome: BIOMES.DIRT,
    } as SubBiome,
    DIRTb: {
      sprite: 'sand',
      frame: 17,
      ovr_idx: 14 * 16 + 8,
      frame_offs: frame_offs_regular,
      color_biome: BIOMES.DIRT,
    } as SubBiome,
    DIRT_REDa: {
      sprite: 'dirt',
      frame: 1,
      ovr_idx: (14+3) * 16 + 8,
      frame_offs: frame_offs_regular,
      color_biome: BIOMES.DIRT_RED,
    } as SubBiome,
    DIRT_REDb: {
      sprite: 'dirt',
      frame: 17,
      ovr_idx: 14 * 16 + 8,
      frame_offs: frame_offs_regular,
      color_biome: BIOMES.DIRT_RED,
    } as SubBiome,
    DIRT_REDc: {
      sprite: 'dirt',
      frame: 17,
      ovr_idx: 14 * 16 + 8,
      frame_offs: frame_offs_regular,
      color_biome: BIOMES.DEAD_FOREST,
    } as SubBiome,
    ICE_DARKa: {
      sprite: 'dirt',
      frame: 1,
      ovr_idx: (14+3) * 16 + 8,
      frame_offs: frame_offs_regular,
      color_biome: BIOMES.FROZEN_OCEAN,
    } as SubBiome,
    ICE_DARKb: {
      sprite: 'dirt',
      frame: 17,
      ovr_idx: 14 * 16 + 8,
      frame_offs: frame_offs_regular,
      color_biome: BIOMES.FROZEN_OCEAN,
    } as SubBiome,
    ICEa: {
      sprite: 'ice',
      frame: 1,
      ovr_idx: (14+3) * 16 + 8,
      frame_offs: frame_offs_regular,
      color_biome: BIOMES.FROZEN_PLAINS,
    } as SubBiome,
    ICEb: {
      sprite: 'ice',
      frame: 17,
      ovr_idx: 14 * 16 + 8,
      frame_offs: frame_offs_regular,
      color_biome: BIOMES.FROZEN_PLAINS,
    } as SubBiome,
    // MOUNTAIN_BASE: {
    //   sprite: 'lava',
    //   frame: 1,
    //   ovr_idx: (14+3) * 16 + 8,
    //   frame_offs: frame_offs_regular,
    //   color_biome: BIOMES.DIRT_DARK,
    // } as SubBiome,
    MOLTEN: {
      sprite: 'lava',
      frame: 17,
      ovr_idx: (14+3) * 16 + 8,
      frame_offs: frame_offs_regular,
      color_biome: BIOMES.MOLTEN_PLAINS,
    } as SubBiome,

    // overlay details
    DETAIL_TREES1: {
      sprite: 'treesmountains',
      frame: 1,
      frame_offs: frame_offs_tree,
    } as SubBiome,
    DETAIL_TREES_DEAD: {
      sprite: 'treesmountains',
      frame: 18*52 + 14,
      frame_offs: frame_offs_tree,
    } as SubBiome,
    DETAIL_MOUNTAINS1: {
      sprite: 'mountains',
      frame: 1,
      frame_offs: frame_offs_mountain_tint,
      color_biome: BIOMES.MOUNTAINS,
    } as SubBiome,
    DETAIL_MOUNTAINS_MOONROCK4: {
      sprite: 'mountains',
      frame: 1,
      frame_offs: frame_offs_mountain_tint,
      color_biome: BIOMES.MOONROCK4,
    } as SubBiome,
    DETAIL_MOUNTAINS_SNOW: {
      sprite: 'mountains',
      frame: 14,
      frame_offs: frame_offs_mountain_tint,
      color_biome: BIOMES.MOUNTAINS,
    } as SubBiome,
    DETAIL_MOLTEN_MOUNTAINS: {
      sprite: 'mountains',
      frame: 1,
      frame_offs: frame_offs_mountain_tint,
      color_biome: BIOMES.MOLTEN_MOUNTAINS,
    } as SubBiome,
  };
  type BaseType = keyof typeof BASE;
  let ord = 0;
  function colorFromBiome(color_biome: Biome): ROVec4 {
    return rovec4(color_biome / 256 + 1/512, 0, 0, 1);
  }
  for (let key in BASE) {
    let bb = BASE[key as BaseType];
    bb.anim = bb.anim || 0;
    bb.ord = ord++;
    let color_biome = bb.color_biome || BIOMES.GREEN_PLAINS;
    bb.shader_param = colorFromBiome(color_biome);
  }

  type DetailDef = [SpriteName, number[], ROVec4];
  const BIOME_TO_BASE: Record<Biome, [SubBiome, SubBiome, SubBiome?]> = {
    [BIOMES.WATER_DEEP]: [BASE.WATER_DEEP, BASE.WATER_DEEP],
    [BIOMES.WATER_SHALLOW]: [BASE.WATER_SHALLOW, BASE.WATER_SHALLOW],
    [BIOMES.MOLTEN_LAVAFLOW]: [BASE.LAVAFLOW, BASE.LAVAFLOW],
    [BIOMES.MOLTEN_PLAINS]: [BASE.MOLTEN, BASE.MOLTEN],
    [BIOMES.GREEN_FOREST]: [BASE.GRASSa, BASE.GRASSb, BASE.DETAIL_TREES1],
    [BIOMES.MOUNTAINS]: [BASE.GRASSa, BASE.GRASSb, BASE.DETAIL_MOUNTAINS1],
    [BIOMES.GREEN_PLAINS]: [BASE.GRASSa, BASE.GRASSb],
    [BIOMES.MOUNTAINS_SNOW]: [BASE.ICEb, BASE.ICEb, BASE.DETAIL_MOUNTAINS_SNOW],
    [BIOMES.FROZEN_PLAINS]: [BASE.ICEa, BASE.ICEb],
    [BIOMES.FROZEN_OCEAN]: [BASE.ICE_DARKa, BASE.ICE_DARKb],
    [BIOMES.FROZEN_MOUNTAINS]: [BASE.ICEa, BASE.ICEa, BASE.DETAIL_MOUNTAINS_SNOW],
    [BIOMES.MOLTEN_MOUNTAINS]: [BASE.MOLTEN, BASE.MOLTEN, BASE.DETAIL_MOLTEN_MOUNTAINS],
    [BIOMES.DESERT]: [BASE.SANDa, BASE.SANDb],
    [BIOMES.DIRT_DARK]: [BASE.DIRT_DARKa, BASE.DIRT_DARKb],
    [BIOMES.DIRT]: [BASE.DIRTa, BASE.DIRTb],
    [BIOMES.DIRT_RED]: [BASE.DIRT_REDa, BASE.DIRT_REDb],
    [BIOMES.DEAD_FOREST]: [BASE.DIRT_REDc, BASE.DIRT_REDc, BASE.DETAIL_TREES_DEAD],
    [BIOMES.MOONROCK1]: [BASE.MOONROCK1, BASE.MOONROCK1],
    [BIOMES.MOONROCK2]: [BASE.MOONROCK2, BASE.MOONROCK2],
    [BIOMES.MOONROCK3]: [BASE.MOONROCK3, BASE.MOONROCK3],
    [BIOMES.MOONROCK4]: [BASE.MOONROCK3, BASE.MOONROCK3, BASE.DETAIL_MOUNTAINS_MOONROCK4],

    [BIOMES.WATER_DEEP]: [BASE.WATER_DEEP, BASE.WATER_DEEP],

    [BIOMES.GAS_ORANGE_LIGHT]: [BASE.GAS_ORANGE_LIGHTa, BASE.GAS_ORANGE_LIGHTa],
    [BIOMES.GAS_ORANGE_DARK]: [BASE.GAS_ORANGE_DARKa, BASE.GAS_ORANGE_DARKa],
    [BIOMES.GAS_GRAY]: [BASE.GAS_GRAYa, BASE.GAS_GRAYa],
    [BIOMES.GAS_BLUE_DARK]: [BASE.GAS_BLUE_DARKa, BASE.GAS_BLUE_DARKa],
    [BIOMES.GAS_BLUE_MED]: [BASE.GAS_BLUE_MEDa, BASE.GAS_BLUE_MEDa],
    [BIOMES.GAS_BLUE_LIGHT]: [BASE.GAS_BLUE_LIGHTa, BASE.GAS_BLUE_LIGHTa],
    [BIOMES.GAS_YELLOW]: [BASE.GAS_YELLOWa, BASE.GAS_YELLOWa],
    [BIOMES.GAS_YELLOW_RED]: [BASE.GAS_YELLOW_REDa, BASE.GAS_YELLOW_REDa],
    [BIOMES.GAS_RED]: [BASE.GAS_REDa, BASE.GAS_REDa],
    [BIOMES.GAS_PURPLE_LIGHT]: [BASE.GAS_PURPLE_LIGHTa, BASE.GAS_PURPLE_LIGHTa],
    [BIOMES.GAS_PURPLE_DARK]: [BASE.GAS_PURPLE_DARKa, BASE.GAS_PURPLE_DARKa],
  };

  type BiomeDetailsRarity = SubBiome[];
  type BiomeDetails = [BiomeDetailsRarity, BiomeDetailsRarity, BiomeDetailsRarity];
  function detailRarityToSubBiome(sprite: SpriteName, frames: number[], colorfrom: Biome): BiomeDetailsRarity {
    let ret: SubBiome[] = [];
    for (let ii = 0; ii < frames.length; ++ii) {
      ret.push({
        sprite,
        frame: frames[ii],
        anim: 0,
        ord: 999,
        shader_param: colorFromBiome(colorfrom),
      });
    }
    return ret;
  }
  type BiomeDetailsFrames = [number[], number[], number[]];
  function detailFramesToSubBiome(sprite: SpriteName, frameset: BiomeDetailsFrames, colorfrom: Biome): BiomeDetails {
    return [
      detailRarityToSubBiome(sprite, frameset[0], colorfrom),
      detailRarityToSubBiome(sprite, frameset[1], colorfrom),
      detailRarityToSubBiome(sprite, frameset[2], colorfrom),
    ];
  }
  const BIOME_DETAILS_STANDARD: BiomeDetailsFrames = [
    [4,5,6,7,20,21,22,23],
    [2,3,8,9,18,19,24,25,28],
    [10,11,12,13,26,27,29],
  ];
  const BIOME_DETAILS_NO_LIFE_SAND: BiomeDetailsFrames = [
    [4,5,6,7,20,21,22,23],
    [2,3,8,9,18,19,24,25,28],
    [12,13,29],
  ];
  const BIOME_DETAILS_DEAD_DIRT: BiomeDetailsFrames = [
    [4,5,6,7,20,21,22,23],
    [6,7,8,9,24,25],
    [13,28,29],
  ];
  const BIOME_DETAILS_NO_LIFE_DIRT: BiomeDetailsFrames = [
    [4,5,6,7,20,21,22,22,23],
    [6,7,22,23],
    [13,29],
  ];
  const BIOME_DETAILS_MOLTEN: BiomeDetailsFrames = [
    [6,7,13,13,13,22,23],
    [4,5,10,11,20,21,26,27,28,29],
    [2,3,8,9,12,18,19,24,25],
  ];
  const BIOME_DETAILS: Record<Biome, BiomeDetails> = {
    [BIOMES.GREEN_PLAINS]: detailFramesToSubBiome('grass', BIOME_DETAILS_STANDARD, BIOMES.GREEN_PLAINS),
    [BIOMES.GREEN_FOREST]: detailFramesToSubBiome('grass', BIOME_DETAILS_STANDARD, BIOMES.GREEN_PLAINS),
    [BIOMES.DESERT]: detailFramesToSubBiome('sand', BIOME_DETAILS_STANDARD, BIOMES.DESERT),
    [BIOMES.FROZEN_PLAINS]: detailFramesToSubBiome('ice', BIOME_DETAILS_STANDARD, BIOMES.FROZEN_PLAINS),
    [BIOMES.FROZEN_OCEAN]: detailFramesToSubBiome('ice', BIOME_DETAILS_STANDARD, BIOMES.FROZEN_OCEAN),
    [BIOMES.DIRT]: detailFramesToSubBiome('sand', BIOME_DETAILS_NO_LIFE_SAND, BIOMES.DIRT),
    [BIOMES.DIRT_DARK]: detailFramesToSubBiome('dirt', BIOME_DETAILS_DEAD_DIRT, BIOMES.DIRT_DARK),
    [BIOMES.MOLTEN_PLAINS]: detailFramesToSubBiome('lava', BIOME_DETAILS_MOLTEN, BIOMES.MOLTEN_PLAINS),
    [BIOMES.DIRT_RED]: detailFramesToSubBiome('dirt', BIOME_DETAILS_STANDARD, BIOMES.DIRT_RED),
    [BIOMES.DEAD_FOREST]: detailFramesToSubBiome('dirt', BIOME_DETAILS_STANDARD, BIOMES.DEAD_FOREST),
    [BIOMES.MOONROCK1]: detailFramesToSubBiome('dirt', BIOME_DETAILS_NO_LIFE_DIRT, BIOMES.MOONROCK1),
    [BIOMES.MOONROCK2]: detailFramesToSubBiome('dirt', BIOME_DETAILS_NO_LIFE_DIRT, BIOMES.MOONROCK2),
    [BIOMES.MOONROCK3]: detailFramesToSubBiome('dirt', BIOME_DETAILS_NO_LIFE_DIRT, BIOMES.MOONROCK3),
  };

  let anim_frame = [0,0,0,0];
  function overlayFor(base: SubBiome, mask: number): null | DetailDef {
    if (!base.frame_offs) {
      return null;
    }
    let offs = base.frame_offs[mask];
    if (offs === undefined) {
      return null;
    }
    let r = [];
    for (let ii = 0; ii < offs.length; ++ii) {
      r.push(base.ovr_idx! + offs[ii] + anim_frame[base.anim]);
    }
    if (base.extra_overlay) {
      for (let ii = 0; ii < offs.length; ++ii) {
        r.push(base.extra_overlay.ovr_idx + offs[ii] + anim_frame[base.extra_overlay.anim]);
      }
    }
    return [base.sprite, r, base.shader_param];
  }
  function detailFor(detail: SubBiome, mask: number): number[] {
    let add = anim_frame[detail.anim];
    if (!detail.frame_offs) {
      return [detail.frame + add];
    }
    let ul = (mask & 0b110110000) === 0b110110000 ? 0b1000 : 0;
    let ur = (mask & 0b011011000) === 0b011011000 ? 0b0100 : 0;
    let ll = (mask & 0b000110110) === 0b000110110 ? 0b0010 : 0;
    let lr = (mask & 0b000011011) === 0b000011011 ? 0b0001 : 0;
    // alternative formulation:
    // ul = mask & 0b110110000;
    // ul &= ul >> 3;
    // ul &= ul >> 1;
    // ul >>= 1;
    mask = ul | ur | ll | lr;
    let offs = detail.frame_offs[mask];
    if (offs === undefined) {
      return [detail.frame + add];
    }
    let r = [];
    for (let ii = 0; ii < offs.length; ++ii) {
      r.push(detail.frame + offs[ii] + add);
    }
    return r;
  }

  function planetMapMode(
    planet: Planet,
    x: number, // origin of the world in screen coords
    y: number,
    z_base: number,
    h: number, // height of the world in screen coords
    alpha: number,
    zoom_level: number,
  ): void {
    let planet_shader_params = {};
    temp_fade[3] = alpha;
    let z0 = z_base;
    function drawSubLayer(sublayer: number, z: number, no_draw: boolean): boolean {
      let all_good = true;
      if (sublayer === 0) {
        // special: single texture, just fill the screen
        let layer0 = planet.getTexture(2, MAP_FULL_SIZE, 0, 0, 0, false);
        if (layer0 && !no_draw) {
          spriteQueueRaw([layer0, tex_palette_planets],
            camera2d.x0Real(), y, z, camera2d.wReal(), h,
            (camera2d.x0Real() - x) / (h * 2), 0, (camera2d.x1Real() - x) / (h * 2), 1,
            temp_fade, shader_planet_pixel_flat, planet_shader_params);
        } else {
          all_good = false;
        }
      } else {
        // draw in parts
        let zoom = pow(2, sublayer + MAP_SUBDIVIDE);
        let sub_dim = h / zoom;
        let sub_num_horiz = zoom * 2;
        let sub_num_vert = zoom;
        let sub_x0 = floor((camera2d.x0Real() - x) / sub_dim);
        let sub_x1 = floor((camera2d.x1Real() - x) / sub_dim);
        let sub_y0 = floor((camera2d.y0Real() - y) / sub_dim);
        let sub_y1 = floor((camera2d.y1Real() - y) / sub_dim);
        for (let yy = sub_y0; yy <= sub_y1; ++yy) {
          for (let xx = sub_x0; xx <= sub_x1; ++xx) {
            let layer = planet.getTexture(2, MAP_SUB_SIZE, sublayer + MAP_SUBDIVIDE,
              mod(xx, sub_num_horiz), mod(yy, sub_num_vert), false);
            if (layer && !no_draw) {
              spriteQueueRaw([layer, tex_palette_planets],
                x + xx * sub_dim,
                y + yy * sub_dim, z, sub_dim, sub_dim,
                0, 0, 1, 1,
                temp_fade, shader_planet_pixel_flat, planet_shader_params);
            } else {
              all_good = false;
            }
          }
        }
        // also preload off the sides
        let pad = game_height / 4;
        sub_x0 = floor((camera2d.x0Real() - pad - x) / sub_dim);
        sub_x1 = floor((camera2d.x1Real() + pad - x) / sub_dim);
        sub_y0 = floor((camera2d.y0Real() - pad - y) / sub_dim);
        sub_y1 = floor((camera2d.y1Real() + pad - y) / sub_dim);
        for (let yy = sub_y0; yy <= sub_y1; ++yy) {
          for (let xx = sub_x0; xx <= sub_x1; ++xx) {
            planet.getTexture(2, MAP_SUB_SIZE, sublayer + MAP_SUBDIVIDE,
              mod(xx, sub_num_horiz), mod(yy, sub_num_vert), false);
          }
        }
      }
      return all_good;
    }
    let sublayer = round(zoom_level);
    let filled = false;
    for (let ii = min(PLANET_PIXELART_LEVEL, sublayer); ii >= 0; --ii) {
      if (drawSubLayer(ii, z_base, filled)) {
        filled = true;
      }
      --z_base;
    }
    if (sublayer >= PLANET_PIXELART_LEVEL + 2 && view) {
      // also draw pixel art
      let lod = clamp(MAX_PLANET_ZOOM - sublayer, 0, 2) as 0|1|2;
      sublayer = PLANET_PIXELART_LEVEL;
      let zoom = pow(2, sublayer + MAP_SUBDIVIDE);
      let sub_dim = h / zoom; // in screen pixels
      let sub_num_horiz = zoom * 2;
      let sub_num_vert = zoom;
      const tile_h = h / MAP_SUB_SIZE / zoom;
      let sub_x0 = floor((camera2d.x0Real() - x - tile_h) / sub_dim);
      let sub_x1 = floor((camera2d.x1Real() - x + tile_h) / sub_dim);
      let sub_y0 = floor((camera2d.y0Real() - y - tile_h) / sub_dim);
      let sub_y1 = floor((camera2d.y1Real() - y + tile_h) / sub_dim);
      let raw_datas: Partial<Record<number, Partial<Record<number, [Uint8Array, Uint8Array?]>>>> = {};
      for (let yy = sub_y0; yy <= sub_y1; ++yy) {
        let row = raw_datas[yy] = {} as Partial<Record<number, [Uint8Array, Uint8Array?]>>;
        for (let xx = sub_x0; xx <= sub_x1; ++xx) {
          let eff_xx = mod(xx, sub_num_horiz);
          let layer = planet.getTexture(2, MAP_SUB_SIZE, sublayer + MAP_SUBDIVIDE,
            eff_xx, mod(yy, sub_num_vert), true);
          if (layer) {
            row[eff_xx] = [layer.raw_data, layer.details && layer.details.valid ? layer.details : undefined];
          }
        }
      }
      anim_frame[1] = floor(getFrameTimestamp() * 0.0086) % 8;
      anim_frame[2] = floor(getFrameTimestamp() * 0.0086*0.25) % 16;
      anim_frame[3] = floor(getFrameTimestamp() * 0.0086*0.7) % 16;
      let map_num_vert = MAP_SUB_SIZE * zoom;
      let map_num_horiz = map_num_vert * 2;
      let tile_x0 = floor((camera2d.x0Real() - x) / tile_h);
      let tile_x1 = floor((camera2d.x1Real() - x) / tile_h);
      let tile_y0 = floor((camera2d.y0Real() - y) / tile_h);
      let tile_y1 = floor((camera2d.y1Real() - y) / tile_h);
      let draw_param = {
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        z: 0,
        frame: 0,
        shader: shader_pixelart,
        nozoom: true,
        color: unit_vec,
      };
      type TileInfo = {
        base: SubBiome;
        detail?: SubBiome;
      };
      function bget(out: TileInfo, xx: number, yy: number): void {
        let eff_yy = mod(yy, map_num_vert);
        let sub_y = floor(eff_yy / MAP_SUB_SIZE);
        let row = raw_datas[sub_y];
        let tile_y_offs = (eff_yy % MAP_SUB_SIZE) * MAP_SUB_SIZE;
        let eff_xx = mod(xx, map_num_horiz);
        let sub_x = floor(eff_xx / MAP_SUB_SIZE);
        let tile_x_offs = eff_xx % MAP_SUB_SIZE;
        let rowpair = row && row[sub_x] || NULL_ROWPAIR;
        let v = rowpair[0][tile_y_offs + tile_x_offs] || 0;
        let details = rowpair[1];
        let detailv = details && details[tile_y_offs + tile_x_offs] || 0;

        let pair = BIOME_TO_BASE[v];
        if (pair) {
          let same = detailv & BIT_SAME_LOOSE;
          out.base = pair[same ? 1 : 0];
          out.detail = pair[2];
          let detail_rarity = detailv & BIT_RARITY_MASK;
          if (detail_rarity && same) {
            let detailrarityset = BIOME_DETAILS[v];
            if (detailrarityset) {
              let detailset = detailrarityset[detail_rarity - 1];
              let detail_idx = detailv >> BIT_DETAIL_IDX_SHIFT;
              out.detail = detailset[detail_idx % detailset.length];
            }
          }

        } else {
          out.base = BASE.NULL;
          out.detail = undefined;
        }
      }
      let ndata: TileInfo[] = [];
      for (let ii = 0; ii < 9; ++ii) {
        ndata.push({ base: BASE.NULL, detail: undefined });
      }
      for (let yy = tile_y0; yy <= tile_y1; ++yy) {
        for (let jj = 0; jj < 3; ++jj) {
          for (let ii = 0; ii < 2; ++ii) {
            bget(ndata[jj * 3 + ii + 1], tile_x0 - 1 + ii, yy - 1 + jj);
          }
        }
        let pixy = round(y + yy * tile_h);
        let next_pixy = round(y + (yy +1) * tile_h);
        draw_param.y = pixy;
        draw_param.h = next_pixy - pixy;
        for (let xx = tile_x0; xx <= tile_x1; ++xx) {
          for (let jj = 0; jj < 3; ++jj) {
            // shift known data
            let t = ndata[jj*3];
            ndata[jj*3] = ndata[jj*3+1];
            ndata[jj*3+1] = ndata[jj*3+2];
            // get new data
            bget(t, xx + 1, yy - 1 + jj);
            ndata[jj*3+2] = t;
          }
          let my_info = ndata[4];
          if (!my_info.base.ord) {
            continue;
          }

          let pixx = round(x + xx * tile_h);
          let next_pixx = round(x + (xx +1) * tile_h);
          let extra = my_info.detail;
          draw_param.x = pixx;
          draw_param.w = next_pixx - pixx;

          let base = my_info.base;
          draw_param.z = z0 + 1;
          draw_param.frame = base.frame + anim_frame[base.anim];
          draw_param.color = base.shader_param;
          sprites[`${base.sprite}${lod}`].draw(draw_param);
          if (base.extra_overlay) {
            draw_param.z++;
            draw_param.frame = base.frame + base.extra_overlay.ovr_idx - base.ovr_idx! +
              anim_frame[base.extra_overlay.anim];
            sprites[`${base.sprite}${lod}`].draw(draw_param);
          }

          // Get BASE (and details) of neighbors and draw overlays
          let masks: Record<number, number> = {};
          let dmask = 0;
          let overlays = [];
          for (let jj = 0, idx = 8; jj < 3; ++jj) {
            for (let ii = 0; ii < 3; ++ii, --idx) {
              let n = ndata[jj * 3 + ii];
              let nb = n.base;
              if (nb.ord > base.ord) {
                if (!masks[nb.ord]) {
                  overlays.push(nb);
                  masks[nb.ord] = (1 << idx);
                } else {
                  masks[nb.ord] |= (1 << idx);
                }
              }
              if (n.detail === my_info.detail) {
                dmask |= (1 << idx);
              }
            }
          }
          overlays.sort((a, b) => a.ord - b.ord);
          let last_overlay;
          for (let ii = 0; ii < overlays.length; ++ii) {
            let n = overlays[ii];
            let ovr = overlayFor(n, masks[n.ord]);
            if (ovr) {
              last_overlay = ovr;
              draw_param.color = ovr[2];
              for (let jj = 0; jj < ovr[1].length; ++jj) {
                draw_param.z++;
                draw_param.frame = ovr[1][jj];
                sprites[`${ovr[0]}${lod}`].draw(draw_param);
              }
            }
          }

          if (extra) {
            if (extra.ovr_idx) {
              if (last_overlay) {
                let ovr = last_overlay[1];
                for (let jj = 0; jj < ovr.length; ++jj) {
                  draw_param.z++;
                  draw_param.frame = extra.ovr_idx + ovr[jj];
                  sprites[`${last_overlay[0]}${lod}`].draw(draw_param);
                }
              }
            } else {
              let ovr = detailFor(extra, dmask);
              draw_param.color = extra.shader_param;
              for (let jj = 0; jj < ovr.length; ++jj) {
                draw_param.z++;
                draw_param.frame = ovr[jj];
                sprites[`${extra.sprite}${lod}`].draw(draw_param);
              }
            }
          }
        }
      }
    }
  }

  let solar_mouse_pos = vec2();
  type SelectedPlanet = {
    idx: number;
    x: number;
    y: number;
    z: number;
  };
  function drawSolarSystem(
    solar_system: SolarSystem,
    x0: number,
    y0: number,
    z: number,
    w: number,
    h: number,
    star_xp: number,
    star_yp: number,
    fade: number
  ): null | SelectedPlanet {
    mousePos(solar_mouse_pos);
    let pmtex = planetMapTexture(false);
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
    drawCircle(xmid, ymid, z, sun_radius + 2, 0.25, [c[0], c[1], c[2], fade], BLEND_ADDITIVE);
    drawCircle(xmid, ymid, z + 0.005, sun_radius, 0.95, [c[0], c[1], c[2], fade]);
    let rstep = (w/2 - sun_pad) / (planets.length + 2);
    let r0 = sun_pad + rstep;
    let closest_planet: null | SelectedPlanet = null;
    let closest_dist = Infinity;
    let allow_planet_select = !planet_view && !eff_planet_view;
    for (let ii = 0; ii < planets.length; ++ii) {
      let r = r0 + rstep * ii;
      let planet = planets[ii];
      let theta = planet.orbit + planet.orbit_speed * walltime()*ORBIT_RATE;
      theta %= 2 * PI;
      let x = xmid + cos(theta) * r;
      let y = ymid + sin(theta) * r * VSCALE;
      // if (view === 1) {
      //   x = round(x);
      //   y = round(y);
      // }

      let zz = z + (y - ymid)/h;
      let dist = v2distSq(solar_mouse_pos, [x, y]);
      if (dist < closest_dist && dist < 30*30 && allow_planet_select ||
        !allow_planet_select && ii === selected_planet_index
      ) {
        closest_dist = dist;
        closest_planet = {
          idx: ii,
          x, y,
          z: zz,
        };
      }

      // drawCircle(x, y, zz, planet.size + 2, 0.99, [0,0,0,fade]);
      // c = planet.type.color;
      // drawCircle(x, y, zz + 0.00001, planet.size, 0.99, [c[0], c[1], c[2], fade]);
      drawHollowElipse(xmid, ymid, z - 2, r, r * VSCALE, [0.5, 0.5, 0, fade]);

      let sprite_size = planet.size;
      let planet_shader_params = {
        params: [getFrameTimestamp() * ROTATION_RATE, pmtex.width / (sprite_size)*1.5 / 255, 2 - theta / PI, 0],
      };
      // with pixely view, looks a lot better with a /2 on the texture resolution
      let planet_tex = planet.getTexture(0, sprite_size*2/2, 0, 0, 0, false);
      if (planet_tex) {
        spriteQueueRaw([pmtex, planet_tex, tex_palette_planets],
          x - sprite_size, y - sprite_size, zz, sprite_size*2, sprite_size*2, 0, 0, 1, 1,
          [1,1,1,fade], shader_planet_pixel, planet_shader_params);
      }
    }

    // draw selected planet
    if (closest_planet) {
      let planet = planets[closest_planet.idx];
      drawCircle(closest_planet.x, closest_planet.y, closest_planet.z - 0.01,
        planet.size + 2, 0.85, [0.5, 1, 1, fade], BLEND_ADDITIVE);
      selected_planet_index = closest_planet.idx;
    } else {
      selected_planet_index = null;
    }

    // draw backdrop
    let br0 = w/2 * 1.5;
    let br1 = h/2*VSCALE * 1.5;
    drawElipse(xmid - br0, ymid - br1, xmid + br0, ymid + br1, z - 2.1, 0, [0,0,0,fade]);
    return closest_planet;
  }

  let last_solar_system: SolarSystem | null = null;
  let last_selected_planet: SelectedPlanet | null = null;
  let drag_temp = vec2();
  function test(dt: number): void {

    gl.clearColor(0, 0, 0, 1);
    let z = Z.UI;
    const button_height = uiButtonHeight();
    const button_width = uiButtonWidth();
    const font_height = uiTextHeight();

    let x = 4;
    let button_spacing = button_height + 6;
    let y = 4;

    let w = min(game_width, game_height);
    let map_x0 = show_panel ? game_width - w : (game_width - w)/2;
    let map_y0 = 0;

    spotSuppressPad();

    function checkLevel(check_zoom_level: number): boolean {
      const { zoom_level, zoom_offs } = gal_zoomer;
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
    let max_okay_zoom = gal_zoomer.zoom_level;
    if (galaxy) {
      let zlis = [
        (LAYER_STEP/2) * ceil(gal_zoomer.zoom_level / (LAYER_STEP/2)),
        (LAYER_STEP/2) * ceil((gal_zoomer.zoom_level + 1) / (LAYER_STEP/2)),
      ];
      // print(font.styleColored(null, 0x808080ff), 10, 20, 1000, `${zlis[0]} (${gal_zoomer.zoom_level})`);
      for (let ii = 0; ii < zlis.length; ++ii) {
        let r = checkLevel(zlis[ii]);
        if (r) {
          max_okay_zoom = zlis[ii];
        }
        // print(font.styleColored(null, 0x808080ff), 10, 30 + ii * font_height, 1000, `${zlis[ii]}: ${r}`);
      }
    }

    if (galaxy && !debugDefineIsSet('ATTRACT')) {
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
      galaxy.loading = first || debugDefineIsSet('ATTRACT');
      allocSprite();
    }

    if (keyDownEdge(KEYS.C) && keyDown(KEYS.CTRL)) {
      copyCanvasToClipboard();
    }

    let hide_solar = eff_planet_view >= 2;
    if (eff_planet_view < 1 && planet_zoomer.target_zoom_level) {
      planet_zoomer.resetZoom(0, 0, 0);
    }

    if (show_panel) {
      if (buttonText({ x, y, text: `View: ${view ? 'Pixely' : 'Raw'}`, w: button_width * 0.75 }) ||
        keyDownEdge(KEYS.V)
      ) {
        view = (view + 1) % 2;
        localStorageSetJSON('view', view);
        setTimeout(() => engine.setPixelyStrict(view === 1), 0);
        //engine.reloadSafe();
      }

      if (buttonText({ x: x + button_width - button_height, y, text: '<<', w: button_height }) ||
        keyDownEdge(KEYS.ESC)
      ) {
        show_panel = !show_panel;
        localStorageSetJSON('panel', show_panel);
      }

      y += button_spacing;

      // if (view === 1) {
      //   print(style, x, y, z, `Dither: ${params.dither}`);
      //   y += font_height;
      //   params.dither = round4(slider(params.dither, { x, y, z, min: 0, max: 1 }));
      //   y += button_spacing;
      // }

      if (planet_view) {
        if (buttonText({ x, y, z, text: planet_override ? 'Override' : 'Generated' })) {
          planet_override = !planet_override;
          localStorageSetJSON('planet_override', planet_override);
          planet_override_planet = null;
        }
        y += button_spacing;
        if (!hide_solar) {
          if (buttonText({ x, y, z, text: planet_flatmap ? 'Flatmap' : 'Globe' })) {
            planet_flatmap = !planet_flatmap;
            localStorageSetJSON('planet_flatmap', planet_flatmap);
          }
          y += button_spacing;
        }
        let solar_system = last_solar_system;
        if (solar_system) {
          print(style, x, y, z, `StarID: ${solar_system.star_id}`);
          y += font_height;

          if (planet_override) {
            print(style, x, y, z, `Type: ${planet_params.name}`);
            y += font_height;
            let name_idx = (PLANET_TYPE_NAMES.indexOf(planet_params.name) + 1) || 1;
            name_idx = round(slider(name_idx, { x, y, z, min: 1, max: PLANET_TYPE_NAMES.length }));
            planet_params.name = PLANET_TYPE_NAMES[name_idx - 1];
            y += button_spacing;

            // print(style, x, y, z, `Size: ${round4(planet_params.size)}`);
            // y += font_height;
            // planet_params.size = round(slider(planet_params.size, { x, y, z, min: 4, max: 128 }));
            // y += button_spacing;

            if (!hide_solar) {
              let orbit = planet_view_params.orbit;
              print(style, x, y, z, `Orbit: ${round(orbit)}`);
              y += font_height;
              planet_view_params.orbit = round(slider(orbit, { x, y, z, min: 0, max: 360 }));
              y += button_spacing;
              if (planet_view_params.orbit !== orbit) {
                localStorageSetJSON('planet_view_params', planet_view_params);
              }

              let rot = planet_view_params.rot;
              print(style, x, y, z, `Rotation: ${round(rot)}`);
              y += font_height;
              planet_view_params.rot = round(slider(rot, { x, y, z, min: 0, max: 360 }));
              y += button_spacing;
              if (planet_view_params.rot !== rot) {
                localStorageSetJSON('planet_view_params', planet_view_params);
              }
            }

            print(style, x, y, z, `Seed: ${planet_params.seed}`);
            y += font_height;
            planet_params.seed = round(slider(planet_params.seed, { x, y, z, min: 1, max: 99 }));
            y += button_spacing;


          } else if (last_selected_planet) {
            let planet = solar_system.planets[last_selected_planet.idx];
            print(style, x, y, z, `Type: ${planet.type.name}`);
            y += font_height;

            print(style, x, y, z, `Size: ${round4(planet.size)}`);
            y += font_height;

            print(style, x, y, z, `Seed: ${planet.seed}`);
            y += font_height;

            y += button_spacing;
          }

        }

      } else if (solar_view) {
        if (buttonText({ x, y, z, text: solar_override ? 'Override' : 'Generated' })) {
          solar_override = !solar_override;
          localStorageSetJSON('solar_override', solar_override);
          solar_override_system = null;
        }
        y += button_spacing;
        if (solar_override) {
          print(style, x, y, z, `StarID: ${solar_params.star_id}`);
          y += font_height;
          solar_params.star_id = round(slider(solar_params.star_id, { x, y, z, min: 1, max: 99 }));
          y += button_spacing;

          print(style, x, y, z, `Seed: ${solar_params.seed}`);
          y += font_height;
          solar_params.seed = round(slider(solar_params.seed, { x, y, z, min: 1, max: 99 }));
          y += button_spacing;
        }
      } else {
        print(style, x, y, z, `Seed: ${params.seed}`);
        y += font_height;
        params.seed = round(slider(params.seed, { x, y, z, min: 1, max: 9999 }));
        y += button_spacing;

        if (gal_zoomer.zoom_level < 1.9) { // Galaxy
          print(style, x, y, z, `Arms: ${params.arms}`);
          y += font_height;
          params.arms = round(slider(params.arms, { x, y, z, min: 1, max: 16 }));
          y += button_spacing;

          print(style, x, y, z, `Arm Mods: ${params.len_mods}`);
          y += font_height;
          params.len_mods = round(slider(params.len_mods, { x, y, z, min: 1, max: 32 }));
          y += button_spacing;

          print(style, x, y, z, `Twirl: ${params.twirl}`);
          y += font_height;
          params.twirl = round4(slider(params.twirl, { x, y, z, min: 0, max: 8 }));
          y += button_spacing;

          print(style, x, y, z, `Center: ${params.center}`);
          y += font_height;
          params.center = round4(slider(params.center, { x, y, z, min: 0, max: 0.3 }));
          y += button_spacing;

          print(style, x, y, z, `Noise Freq: ${params.noise_freq}`);
          y += font_height;
          params.noise_freq = round4(slider(params.noise_freq, { x, y, z, min: 0.1, max: 10 }));
          y += button_spacing;

          print(style, x, y, z, `Noise Weight: ${params.noise_weight}`);
          y += font_height;
          params.noise_weight = round4(slider(params.noise_weight, { x, y, z, min: 0, max: 4 }));
          y += button_spacing;

          print(style, x, y, z, `Lone Clusters: ${params.poi_count}`);
          y += font_height;
          params.poi_count = round(slider(params.poi_count, { x, y, z, min: 0, max: 1000 }));
          y += button_spacing;
        } else {
          let layer_idx = round(gal_zoomer.zoom_level / (LAYER_STEP / 2));
          print(style, x, y, z, `Layer #${layer_idx}:`);
          y += font_height + 2;
          let key = `layer${layer_idx}` as 'layer1' | 'layer2'; // etc
          let param = params[key];
          if (param) {
            print(style, x, y, z, `Noise Freq: ${param.noise_freq}`);
            y += font_height;
            param.noise_freq = round4(slider(param.noise_freq,
              { x, y, z, min: 0.1, max: 100 * pow(2, layer_idx) }));
            y += button_spacing;

            print(style, x, y, z, `Noise Weight: ${param.noise_weight}`);
            y += font_height;
            param.noise_weight = round4(slider(param.noise_weight, { x, y, z, min: 0, max: 4 }));
            y += button_spacing;
          }
        }
      }

      panel({
        x: x - 4, y: 0, w: button_width + 8, h: y, z: z - 1,
      });
    } else {
      if (!debugDefineIsSet('ATTRACT') && buttonText({ x, y, text: '>>', w: button_height }) ||
        keyDownEdge(KEYS.ESC)
      ) {
        show_panel = !show_panel;
        localStorageSetJSON('panel', show_panel);
      }
      y += button_spacing;
    }

    if (solar_view && solar_override) {
      if (!solar_override_system || !deepEqual(solar_params, gen_solar_params)) {
        gen_solar_params = clone(solar_params);
        localStorageSetJSON('solar_params', solar_params);
        solar_override_system = solarSystemCreate(solar_params.seed, {
          // Fake Star structure
          id: solar_params.star_id,
        });
        planet_override_planet = null;
      }
    }
    if (planet_view && planet_override) {
      if (!planet_override_planet || !deepEqual(planet_params, gen_planet_params)) {
        gen_planet_params = clone(planet_params);
        localStorageSetJSON('planet_params', planet_params);
        planet_override_planet = planetCreate(
          (solar_override ? solar_params.seed : galaxy.params.seed) + planet_params.seed,
          solar_override ? solar_params.star_id : (last_solar_system && last_solar_system.star_id || 0),
          planet_params
        );
      }
    }

    x = game_width - w + 4;
    y = w - button_height;

    if (buttonText({ x, y, z, w: button_height, text: '-' }) ||
      keyDownEdge(KEYS.MINUS) || keyDownEdge(KEYS.Q)
    ) {
      use_mouse_pos = false;
      doZoom(0.5, 0.5, -1);
    }
    x += button_height + 2;
    const SLIDER_W = 110;
    let eff_zoom = gal_zoomer.target_zoom_level + solar_view + planet_view + planet_zoomer.target_zoom_level;
    let new_zoom = roundZoom(slider(eff_zoom,
      { x, y, z, w: SLIDER_W, min: 0, max: MAX_ZOOM + MAX_PLANET_VIEW + planet_zoomer.max_zoom + 1 }));
    if (abs(new_zoom - eff_zoom) > 0.000001) {
      doZoom(0.5, 0.5, new_zoom - eff_zoom);
    }
    x += SLIDER_W + 2;
    if (buttonText({ x, y, z, w: button_height, text: '+' }) ||
      keyDownEdge(KEYS.EQUALS) ||
      keyDownEdge(KEYS.E)
    ) {
      use_mouse_pos = false;
      doZoom(0.5, 0.5, 1);
    }
    x += button_height + 2;
    let mouse_wheel = mouseWheel();
    if (inputClick({ button: 2 })) {
      mouse_wheel-=1;
    }
    if (mouse_wheel) {
      use_mouse_pos = true;
      mousePos(mouse_pos);
      if (mouse_wheel < 0 && eff_solar_view_unsmooth && !solar_view ||
        mouse_wheel < 0 && eff_planet_view_unsmooth && !planet_view ||
        mouse_wheel < 0 && planet_view && planet_zoomer.zoom_level && !planet_zoomer.target_zoom_level ||
        mouse_wheel < 0 && planet_view && eff_planet_view_unsmooth > planet_view ||
        mouse_wheel > 0 && planet_view && eff_planet_view_unsmooth < planet_view ||
        mouse_wheel > 0 && solar_view && eff_solar_view_unsmooth < solar_view
      ) {
        // ignore
      } else {
        doZoom((mouse_pos[0] - map_x0) / w, (mouse_pos[1] - map_y0) / w, mouse_wheel);
      }
    }

    zoomTick(max_okay_zoom);
    let zoom = pow(2, gal_zoomer.zoom_level);
    let zoom_text_y = floor(y + (button_height - font_height)/2);
    let zoom_text_w = print(null, x, zoom_text_y, z,
      solar_view ? planet_view ? planet_view > 1 ? 'Atmos' : 'Orbit ' : 'Solar' : `${zoom.toFixed(0)}X`);
    drawRect(x - 2, zoom_text_y, x + zoom_text_w + 2, zoom_text_y + font_height, z - 1, color_text_backdrop);
    let planet_zoom = pow(2, planet_zoomer.zoom_level);

    x = game_width - w;
    // y -= font_height;
    // print(null, x+2, y, z, `Offset: ${round4(zoom_offs[0])},${round4(zoom_offs[1])}`);

    if (!solar_view) {
      let legend_scale = 0.25;
      let legend_x0 = game_width - w*legend_scale - 2;
      let legend_x1 = game_width - 4;
      let legend_color = solar_view ? color_legend_fade : unit_vec;
      y = w;

      drawLine(legend_x0, y - 4.5, legend_x1, y - 4.5, z, 1, 1, legend_color);
      drawLine(legend_x0 - 0.5, y - 7, legend_x0 - 0.5, y - 2, z, 1, 1, legend_color);
      drawLine(legend_x1 + 0.5, y - 7, legend_x1 + 0.5, y - 2, z, 1, 1, legend_color);
      let ly = legend_scale * params.width_ly / zoom;
      let legend_y = y - 6 - font_height;
      font.drawSizedAligned(solar_view ? font_style_fade : null,
        legend_x0, legend_y, z, font_height, font.ALIGN.HCENTER, legend_x1 - legend_x0, 0,
        `${format(ly)}ly`);
      drawRect(legend_x0 - 2, legend_y, legend_x1 + 2, y, z - 1, color_text_backdrop);
    }

    x = map_x0;
    y = map_y0;

    v2set(drag_temp, 0, 0);
    let kb_scale = keyDown(KEYS.SHIFT) ? 0.5 : 0.125;
    drag_temp[0] += keyDown(KEYS.A) * kb_scale;
    drag_temp[0] -= keyDown(KEYS.D) * kb_scale;
    drag_temp[1] += keyDown(KEYS.W) * kb_scale;
    drag_temp[1] -= keyDown(KEYS.S) * kb_scale;
    let drag = inputDrag();
    if (drag && drag.delta) {
      v2add(drag_temp, drag_temp, drag.delta);
      use_mouse_pos = true;
    }
    if (drag_temp[0] || drag_temp[1]) {
      if (solar_view) {
        if (eff_planet_view > 1) {
          planet_zoomer.drag(drag_temp, w);
        }
      } else {
        gal_zoomer.drag(drag_temp, w);
      }
    }
    if (debugDefineIsSet('ATTRACT') || true) {
      gal_zoomer.zoom_offs[0] = clamp(gal_zoomer.zoom_offs[0], 0, 1 - 1/zoom);
      gal_zoomer.zoom_offs[1] = clamp(gal_zoomer.zoom_offs[1], 0, 1 - 1/zoom);
    } else {
      gal_zoomer.zoom_offs[0] = clamp(gal_zoomer.zoom_offs[0], -1/zoom, 1);
      gal_zoomer.zoom_offs[1] = clamp(gal_zoomer.zoom_offs[1], -1/zoom, 1);
    }
    if (eff_planet_view > 1) {
      if (planet_zoomer.zoom_offs[0] < -1) {
        planet_zoomer.zoom_offs[0] += 2;
      }
      if (planet_zoomer.zoom_offs[0] > 1) {
        planet_zoomer.zoom_offs[0] -= 2;
      }
      planet_zoomer.zoom_offs[1] = clamp(planet_zoomer.zoom_offs[1], 0, 1 - 1/planet_zoom);
    }

    if (mouseMoved()) {
      use_mouse_pos = true;
    }
    if (use_mouse_pos) {
      mousePos(mouse_pos);
    } else {
      mouse_pos[0] = map_x0 + w/2;
      mouse_pos[1] = map_y0 + w/2;
    }
    mouse_pos[0] = gal_zoomer.zoom_offs[0] + (mouse_pos[0] - map_x0) / w / zoom;
    mouse_pos[1] = gal_zoomer.zoom_offs[1] + (mouse_pos[1] - map_y0) / w / zoom;

    let overlay_y = 0;
    let overlay_x = show_panel ? map_x0 + 2 : button_height * 2;
    let overlay_w = 0;
    function overlayText(line: string): void {
      if (debugDefineIsSet('ATTRACT')) {
        return;
      }
      let textw = print(null, overlay_x, overlay_y, z, line);
      overlay_w = max(overlay_w, textw);
      overlay_y += font_height;
    }
    if (0) {
      overlayText(`${use_mouse_pos?'Mouse':'Target'}: ${mouse_pos[0].toFixed(9)},${mouse_pos[1].toFixed(9)}`);
    }
    function highlightCell(cell: GalaxyCellAlloced): void {
      const { zoom_offs } = gal_zoomer;
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
      if (debugDefineIsSet('CELL')) {
        drawHollowRect2({
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

      if (debugDefineIsSet('CURSOR')) {
        let dx = floor((mouse_pos[0] - cell.x0) / cell.w * galaxy.buf_dim);
        let dy = floor((mouse_pos[1] - cell.y0) / cell.w * galaxy.buf_dim);
        if (cell.data) {
          let dd = cell.data[dy * galaxy.buf_dim + dx];
          overlayText(`Value: ${dd.toFixed(5)}`);
        }
      }
    }

    let did_highlight = false;
    function checkCellHighlight(cell: GalaxyCellAlloced): void {
      if (cell.ready && !did_highlight &&
        mouse_pos[0] >= cell.x0 && mouse_pos[0] < cell.x0 + cell.w &&
        mouse_pos[1] >= cell.y0 && mouse_pos[1] < cell.y0 + cell.h
      ) {
        did_highlight = true;
        highlightCell(cell);
      }
    }

    cells_drawn = 0;
    type GalaxyCellTexCache = GalaxyCellAlloced & {
      texs?: Texture[];
    };
    function drawCell(alpha: number, parent: GalaxyCellAlloced, cell: GalaxyCellTexCache): void {
      const { zoom_level, zoom_offs } = gal_zoomer;
      ++cells_drawn;
      let qx = cell.cx - parent.cx * LAYER_STEP;
      let qy = cell.cy - parent.cy * LAYER_STEP;
      let draw_param = {
        x: x + (cell.x0 - zoom_offs[0]) * zoom * w,
        y: y + (cell.y0 - zoom_offs[1]) * zoom * w,
        w: w * zoom * cell.w,
        h: w * zoom * cell.h,
        z: Z.BACKGROUND,
        nozoom: true,
        shader: view === 1 ? shader_galaxy_pixel : shader_galaxy_blend,
        shader_params: undefined! as ShaderParams,
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
    function drawLevel(layer_idx: number, alpha: number, do_highlight: boolean): void {
      const { zoom_offs } = gal_zoomer;
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
    let draw_level = max(0, (gal_zoomer.zoom_level - 1) / (LAYER_STEP/2) + blend_range/2);
    let level0 = floor(draw_level);
    let extra = min((draw_level - level0) / blend_range, 1);
    if (!extra && level0) {
      level0--;
      extra = 1;
    }
    drawLevel(level0 + 1, extra, Boolean(extra));

    let globe_view: undefined | { pos: Vec2; r: number };

    if (gal_zoomer.zoom_level >= 12) {
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
        if (debugDefineIsSet('STAR')) {
          overlayText(`star.x: ${star.x.toFixed(10)}`);
          overlayText(`star.y: ${star.y.toFixed(10)}`);
        }

        let max_zoom = pow(2, gal_zoomer.max_zoom);
        xp = star.x * max_zoom * buf_dim;
        yp = star.y * max_zoom * buf_dim;
        if (debugDefineIsSet('STAR')) {
          overlayText(`rel star.x: ${xp.toFixed(2)}`);
          overlayText(`rel star.y: ${yp.toFixed(2)}`);
        }
        if (view === 1) {
          xp = floor(xp);
          yp = floor(yp);
        }
        xp = x + (xp*zoom/max_zoom/buf_dim - gal_zoomer.zoom_offs[0] * zoom) * w;
        yp = y + (yp*zoom/max_zoom/buf_dim - gal_zoomer.zoom_offs[1] * zoom) * w;
        if (view === 1) {
          xp = round(xp);
          yp = round(yp);
        }
        let r = 4 / (1 + gal_zoomer.max_zoom - gal_zoomer.zoom_level);
        if (!solar_view) {
          drawHollowCircle(xp + 0.5, yp + 0.5, Z.UI - 5, r, 0.5, [1,1,0,1], BLEND_ADDITIVE);
          if (inputClick({
            x: xp - SELECT_DIST,
            y: yp - SELECT_DIST,
            w: SELECT_DIST * 2,
            h: SELECT_DIST * 2,
          })) {
            if (gal_zoomer.zoom_level < gal_zoomer.max_zoom) {
              doZoom((xp - map_x0) / w, (yp - map_y0) / w,
                gal_zoomer.max_zoom - gal_zoomer.zoom_level);
            }
            solarZoom(1);
          }
        }

        galaxy.getStarData(star);
      }
      let solar_system = solar_override_system || star && star.solar_system;
      last_solar_system = solar_system || null;
      if (solar_system) {
        let { planets, star_data, name } = solar_system;
        if (!hide_solar) {
          overlayText(`${name || (star && star.id ? `Star #${star.id}` : '') || 'Override Star'}` +
            `, Type: ${star_data.label}`);

          for (let ii = 0; ii < planets.length; ++ii) {
            let planet = planets[ii];
            if (!planet_view || selected_planet_index === ii) {
              overlayText(`${!planet_view && selected_planet_index === ii ? '*' : ' '}` +
                ` Planet #${ii+1}: Class ${planet.type.name}`);
            }
          }
        }
        let do_solar_view = eff_solar_view ? eff_solar_view :
          debugDefineIsSet('AUTOSOLAR') && gal_zoomer.zoom_level > 15.5 ? 1 : 0;
        if (hide_solar) {
          do_solar_view = 0;
        }
        if (do_solar_view) {
          let selected_planet = drawSolarSystem(solar_system, map_x0, map_y0, Z.SOLAR, w, w, xp, yp, do_solar_view);
          last_selected_planet = selected_planet;
          if (solar_view) {
            let do_planet_view = eff_planet_view ? min(eff_planet_view, 1) : 0;
            if (do_planet_view && selected_planet_index !== null && (
              selected_planet || planet_override && planet_override_planet
            )) {
              globe_view = {
                pos: [map_x0 + w/2, map_y0 + w/2],
                r: PLANET_FULL_RADIUS * do_planet_view * 0.87,
              };
              drawPlanet(solar_system,
                selected_planet || {
                  idx: 0,
                  x: 0, y: 0, z: Z.SOLAR,
                },
                map_x0,
                map_y0,
                Z.PLANET,
                w, w,
                do_planet_view);

            } else {
              if (!selected_planet) {
                selected_planet_index = null;
                planet_view = 0;
              }
            }
          }
        }
      } else if (star) {
        overlayText(`Star #${star.id}`);
      }

      if (eff_planet_view > 1) {
        assert(solar_system);
        assert(selected_planet_index !== null);
        let { planets } = solar_system;
        let planet = planet_override ? planet_override_planet : planets[selected_planet_index];
        if (!planet) {
          planet_view = 0;
          if (planet_zoomer.target_zoom_level) {
            planet_zoomer.resetZoom(0, 0, 0);
          }
        } else {
          let ww = planet_zoom * w;
          planetMapMode(planet,
            map_x0 + (0 - planet_zoomer.zoom_offs[0]) * ww,
            map_y0 + (0 - planet_zoomer.zoom_offs[1]) * ww,
            Z.PLANET_MAP,
            ww,
            clamp(eff_planet_view - 1, 0, 1),
            planet_zoomer.zoom_level);
        }
      }
    }

    if (inputClick({
      x: -Infinity,
      y: -Infinity,
      w: Infinity,
      h: Infinity,
    })) {
      use_mouse_pos = true;
      mousePos(mouse_pos);

      let zoom_dir = solar_view && selected_planet_index === null ? -1 : 1;
      if (globe_view) {
        zoom_dir = v2dist(mouse_pos, globe_view.pos) < globe_view.r ? 1 : -1;
      }

      doZoom((mouse_pos[0] - map_x0) / w, (mouse_pos[1] - map_y0) / w,
        zoom_dir);
    }

    drawRect(overlay_x - 2, 0, overlay_x + overlay_w + 2, overlay_y, z - 1, color_text_backdrop);

    if (debugDefineIsSet('ATTRACT') && !netDisconnected()) {
      engine.postRender(saveSnapshot);
    }
  }

  function testInit(dt: number): void {
    engine.setState(test);
    test(dt);
  }

  engine.setState(testInit);
}
