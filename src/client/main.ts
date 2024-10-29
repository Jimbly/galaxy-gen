/*eslint global-require:off*/
// Before requiring anything else that might load from this
require('glov/client/local_storage.js').setStoragePrefix('galaxy-gen'); // eslint-disable-line import/order

import assert from 'assert';
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
  unit_vec,
  v2add,
  v2addScale,
  v2copy,
  v2distSq,
  v2floor,
  v2set,
  vec2,
  vec4,
} from 'glov/common/vmath';
import {
  Galaxy,
  GalaxyCellAlloced,
  GenGalaxyParams,
  LAYER_STEP,
  createGalaxy,
  distSq,
} from './galaxy';
import {
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
  resetZoom(zoom_level: number): void {
    console.log('!!!!!!!!', new Error().stack);
    this.queued_zooms = [];
    this.zoom_level = this.target_zoom_level = zoom_level;
    v2set(this.zoom_offs, 0, 0); // TODO: get from caller?
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
      let new_progress = min(1, zm.progress + dt/zoomTime(zm.delta));
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
  let white_tex = textureWhite();

  const MAX_ZOOM = 16;
  const MAX_SOLAR_VIEW = 1;
  const MAX_PLANET_VIEW = 2;
  const MAX_PLANET_ZOOM = 6;
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
  function zoomTick(max_okay_zoom: number): void {
    let dt = getFrameDt();
    gal_zoomer.zoomTick(max_okay_zoom, dt);
    planet_zoomer.zoomTick(MAX_PLANET_ZOOM, dt);
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
      planet_zoomer.resetZoom(0);
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

  const ORBIT_RATE = 0.0002;
  const ROTATION_RATE = 0.0003*0.5;
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
    rot = mod(rot, 1);

    x0 = lerp(fade, selected_planet.x, x0);
    y0 = lerp(fade, selected_planet.y, y0);
    w *= fade;
    h *= fade;
    const FULL_SIZE = 128;
    let sprite_size = lerp(fade, planet.size, FULL_SIZE);

    if (planet_flatmap) {
      // note: w/h happen to be 256 here, which makes this pixel-perfect
      let pmtex = planetMapFlatTexture();
      let planet_shader_params = {
        params: [0, 0, mod(2 - theta / PI + rot*2, 2), 0],
      };
      spriteQueueRaw([pmtex, planet.getTexture(1, FULL_SIZE), tex_palette_planets],
        x0, y0 + h / 2 - w / 4, z, w, w /2, 0, 0, 1, 1,
        [1,1,1,min(fade * 8, 1)], shader_planet_pixel, planet_shader_params);
    } else {
      let pmtex = planetMapTexture(true);
      let xmid = x0 + w/2;
      let ymid = y0 + h/2;
      let planet_shader_params = {
        params: [rot, pmtex.width / (sprite_size)*1.5 / 255, 2 - theta / PI, 0],
      };
      let x = xmid;
      let y = ymid;
      spriteQueueRaw([pmtex, planet.getTexture(1, FULL_SIZE), tex_palette_planets],
        x - sprite_size, y - sprite_size, z, sprite_size*2, sprite_size*2, 0, 0, 1, 1,
        [1,1,1,min(fade * 8, 1)], shader_planet_pixel, planet_shader_params);
    }
  }

  function planetMapMode(
    planet: Planet,
    x: number,
    y: number,
    z: number,
    h: number,
    alpha: number,
  ): void {
    const MAP_FULL_SIZE = 256;
    let planet_shader_params = {};
    spriteQueueRaw([planet.getTexture(2, MAP_FULL_SIZE), tex_palette_planets],
      x, y, z, h * 2, h, 0, 0, 1, 1,
      [1,1,1,alpha], shader_planet_pixel_flat, planet_shader_params);
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
      spriteQueueRaw([pmtex, planet.getTexture(0, sprite_size*2/2), tex_palette_planets],
        x - sprite_size, y - sprite_size, zz, sprite_size*2, sprite_size*2, 0, 0, 1, 1,
        [1,1,1,fade], shader_planet_pixel, planet_shader_params);
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

    if (keyDown(KEYS.CTRL) && keyDownEdge(KEYS.C)) {
      copyCanvasToClipboard();
    }

    let hide_solar = eff_planet_view >= 2;
    if (eff_planet_view < 1 && planet_zoomer.target_zoom_level) {
      planet_zoomer.resetZoom(0);
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
          solar_override ? solar_params.seed : galaxy.params.seed,
          last_solar_system && last_solar_system.star_id || 0,
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
      { x, y, z, w: SLIDER_W, min: 0, max: MAX_ZOOM + MAX_PLANET_VIEW + MAX_PLANET_ZOOM }));
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
    if (debugDefineIsSet('ATTRACT')) {
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
            planet_zoomer.resetZoom(0);
          }
        } else {
          let ww = planet_zoom * w;
          planetMapMode(planet,
            map_x0 + (0 - planet_zoomer.zoom_offs[0]) * ww,
            map_y0 + (0 - planet_zoomer.zoom_offs[1]) * ww,
            Z.PLANET_MAP,
            ww,
            clamp(eff_planet_view - 1, 0, 1));
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
      doZoom((mouse_pos[0] - map_x0) / w, (mouse_pos[1] - map_y0) / w,
        solar_view && (selected_planet_index === null || planet_view) ? -1 :
        1);
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
