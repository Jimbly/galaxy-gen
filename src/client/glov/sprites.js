// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT
// Some code from Turbulenz: Copyright (c) 2012-2013 Turbulenz Limited
// Released under MIT License: https://opensource.org/licenses/MIT

const assert = require('assert');
const camera2d = require('./camera2d.js');
const engine = require('./engine.js');
const geom = require('./geom.js');
const { cos, max, min, round, sin } = Math;
const textures = require('./textures.js');
const shaders = require('./shaders.js');
const { nextHighestPowerOfTwo } = require('../../common/util.js');
const { vec2, vec4 } = require('./vmath.js');

export const BLEND_ALPHA = 0;
export const BLEND_ADDITIVE = 1;

let sprite_vshader;
let sprite_fshader;
let sprite_dual_fshader;
let clip_space = vec4();
let sprite_shader_params = {
  clip_space
};
let last_uid = 0;

let sprite_queue = [];

let sprite_freelist = [];

let sprite_queue_stack = [];
export function spriteQueuePush(new_list) {
  assert(sprite_queue_stack.length < 10); // probably leaking
  sprite_queue_stack.push(sprite_queue);
  sprite_queue = new_list || [];
}
export function spriteQueuePop(for_pause) {
  assert(sprite_queue_stack.length);
  assert(for_pause || !sprite_queue.length);
  sprite_queue = sprite_queue_stack.pop();
}

function SpriteData() {
  // x1 y1 x2 y2 x3 y3 x4 y4 - vertices [0,8)
  // cr cg cb ca u1 v1 u2 v2 - normalized color + texture [8,16)
  // data for GL queuing
  this.data = new Float32Array(16);
  // data for sorting/binding/etc
  this.texs = null;
  this.shader = null;
  this.shader_params = null;
  this.x = 0;
  this.y = 0;
  this.z = 0;
  this.blend = 0; // BLEND_ALPHA
  this.uid = 0;
}

function spriteDataAlloc() {
  if (sprite_freelist.length) {
    return sprite_freelist.pop();
  }
  return new SpriteData();
}

function cmpSprite(a, b) {
  if (a.z !== b.z) {
    return a.z - b.z;
  }
  if (a.y !== b.y) {
    return a.y - b.y;
  }
  if (a.x !== b.x) {
    return a.x - b.x;
  }
  return a.uid - b.uid;
}

export function queuefn(z, fn) {
  assert(isFinite(z));
  sprite_queue.push({
    fn,
    x: 0,
    y: 0,
    z,
    uid: ++last_uid,
  });
}

// coordinates must be in counter-clockwise winding order
export function queueraw4(
  texs, x0, y0, x1, y1, x2, y2, x3, y3, z,
  u0, v0, u1, v1,
  color, shader, shader_params, blend
) {
  assert(isFinite(z));
  let elem = spriteDataAlloc();
  let data = elem.data;
  // x1 y1 x2 y2 x3 y3 x4 y4 - vertices [0,8)
  // cr cg cb ca u1 v1 u2 v2 - normalized color + texture [8,16)
  // Minor perf improvement: convert by clip_space here (still just a single MAD
  //   if pre-calculated in the camera) and remove it from the shader.
  data[0] = (x0 - camera2d.data[0]) * camera2d.data[4];
  data[1] = (y0 - camera2d.data[1]) * camera2d.data[5];
  data[2] = (x1 - camera2d.data[0]) * camera2d.data[4];
  data[3] = (y1 - camera2d.data[1]) * camera2d.data[5];
  data[4] = (x2 - camera2d.data[0]) * camera2d.data[4];
  data[5] = (y2 - camera2d.data[1]) * camera2d.data[5];
  data[6] = (x3 - camera2d.data[0]) * camera2d.data[4];
  data[7] = (y3 - camera2d.data[1]) * camera2d.data[5];
  data[8] = color[0];
  data[9] = color[1];
  data[10] = color[2];
  data[11] = color[3];
  data[12] = u0;
  data[13] = v0;
  data[14] = u1;
  data[15] = v1;

  elem.texs = texs;
  elem.x = data[0];
  elem.y = data[1];
  elem.z = z;
  elem.shader = shader || null;
  if (shader_params) {
    shader_params.clip_space = sprite_shader_params.clip_space;
    elem.shader_params = shader_params;
  } else {
    elem.shader_params = null;
  }
  elem.blend = blend || 0; // BLEND_ALPHA
  //elem.bucket = bucket || this.default_bucket;
  //elem.tech_params = tech_params || null;
  elem.uid = ++last_uid;
  sprite_queue.push(elem);
  return elem;
}

export function queueraw(
  texs, x, y, z, w, h,
  u0, v0, u1, v1,
  color, shader, shader_params, blend
) {
  return queueraw4(texs,
    x, y,
    x, y + h,
    x + w, y + h,
    x + w, y,
    z,
    u0, v0, u1, v1,
    color, shader, shader_params, blend);
}

export function queuesprite(sprite, x, y, z, w, h, rot, uvs, color, shader, shader_params, nozoom, pixel_perfect) {
  assert(isFinite(z));
  let elem = spriteDataAlloc();
  elem.texs = sprite.texs;
  x = (x - camera2d.data[0]) * camera2d.data[4];
  y = (y - camera2d.data[1]) * camera2d.data[5];
  elem.z = z;
  w *= camera2d.data[4];
  h *= camera2d.data[5];
  if (pixel_perfect) {
    x |= 0;
    y |= 0;
    w |= 0;
    h |= 0;
  }
  elem.x = x;
  elem.y = y;
  color = color || sprite.color;
  let data = elem.data;
  if (!rot) {
    let x1 = x - sprite.origin[0] * w;
    let y1 = y - sprite.origin[1] * h;
    let x2 = x1 + w;
    let y2 = y1 + h;
    data[0] = x1;
    data[1] = y1;
    data[2] = x1;
    data[3] = y2;
    data[4] = x2;
    data[5] = y2;
    data[6] = x2;
    data[7] = y1;
  } else {
    let dx = sprite.origin[0] * w;
    let dy = sprite.origin[1] * h;

    let cosr = cos(rot);
    let sinr = sin(rot);

    let x1 = x - cosr * dx + sinr * dy;
    let y1 = y - sinr * dx - cosr * dy;
    let ch = cosr * h;
    let cw = cosr * w;
    let sh = sinr * h;
    let sw = sinr * w;

    data[0] = x1;
    data[1] = y1;
    data[2] = x1 - sh;
    data[3] = y1 + ch;
    data[4] = x1 + cw - sh;
    data[5] = y1 + sw + ch;
    data[6] = x1 + cw;
    data[7] = y1 + sw;
  }

  data[8] = color[0];
  data[9] = color[1];
  data[10] = color[2];
  data[11] = color[3];

  let ubias = 0;
  let vbias = 0;
  let tex = elem.texs[0];
  if (!nozoom && !tex.nozoom) {
    // Bias the texture coordinates depending on the minification/magnification
    //   level so we do not get pixels from neighboring frames bleeding in
    // Use min here (was max in libGlov), to solve tooltip edges being wrong in strict pixely
    // Use max here to solve box buttons not lining up, but instead using nozoom in drawBox/drawHBox,
    //   but, that only works for magnification - need the max here for minification!
    let zoom_level = max(
      (uvs[2] - uvs[0]) * tex.width / w,
      (uvs[3] - uvs[1]) * tex.height / h,
    ); // in texels per pixel
    if (zoom_level < 1) { // magnification
      if (tex.filter_mag === gl.LINEAR) {
        // Need to bias by half a texel, so we're doing absolutely no blending with the neighboring texel
        ubias = vbias = 0.5;
      } else if (tex.filter_mag === gl.NEAREST && engine.antialias) {
        // When antialiasing is on, even nearest sampling samples from adjacent texels, do slight bias
        // Want to bias by one *pixel's* worth
        ubias = vbias = zoom_level / 2;
      }
    } else if (zoom_level > 1) { // minification
      // need to apply this bias even with nearest filtering, not exactly sure why
      let mipped_texels = zoom_level / 2;
      ubias = vbias = 0.5 + mipped_texels;

    }
    if (uvs[0] > uvs[2]) {
      ubias *= -1;
    }
    if (uvs[1] > uvs[3]) {
      vbias *= -1;
    }
  }

  data[12] = uvs[0] + ubias / tex.width;
  data[13] = uvs[1] + vbias / tex.height;
  data[14] = uvs[2] - ubias / tex.width;
  data[15] = uvs[3] - vbias / tex.height;

  elem.uid = ++last_uid;
  elem.shader = shader || null;
  elem.blend = 0; // BLEND_ALPHA

  if (shader_params) {
    shader_params.clip_space = sprite_shader_params.clip_space;
    elem.shader_params = shader_params;
  } else {
    elem.shader_params = null;
  }
  sprite_queue.push(elem);
}


let clip_temp_xy = vec2();
let clip_temp_wh = vec2();
function clipCoordsScissor(x, y, w, h) {
  camera2d.virtualToCanvas(clip_temp_xy, [x, y]);
  clip_temp_xy[0] = round(clip_temp_xy[0]);
  clip_temp_xy[1] = round(clip_temp_xy[1]);
  camera2d.virtualToCanvas(clip_temp_wh, [x + w, y + h]);
  clip_temp_wh[0] = round(clip_temp_wh[0]) - clip_temp_xy[0];
  clip_temp_wh[1] = round(clip_temp_wh[1]) - clip_temp_xy[1];

  // let gd_w = engine.render_width || engine.width;
  let gd_h = engine.render_height || engine.height;
  return [clip_temp_xy[0], gd_h - (clip_temp_xy[1] + clip_temp_wh[1]), clip_temp_wh[0], clip_temp_wh[1]];
}

function clipCoordsDom(x, y, w, h) {
  let xywh = vec4();
  camera2d.virtualToDom(xywh, [x + w, y + h]);
  xywh[2] = xywh[0];
  xywh[3] = xywh[1];
  camera2d.virtualToDom(xywh, [x, y]);
  xywh[0] = round(xywh[0]);
  xywh[1] = round(xywh[1]);
  xywh[2] = round(xywh[2]) - xywh[0];
  xywh[3] = round(xywh[3]) - xywh[1];

  return xywh;
}

export function clip(z_start, z_end, x, y, w, h) {
  let scissor = clipCoordsScissor(x, y, w, h);
  queuefn(z_start - 0.01, () => {
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(scissor[0], scissor[1], scissor[2], scissor[3]);
  });
  queuefn(z_end - 0.01, () => {
    gl.disable(gl.SCISSOR_TEST);
  });
}

let clip_stack = [];
export function clipped() {
  return clip_stack.length > 0;
}

export function clipPush(z, x, y, w, h) {
  assert(clip_stack.length < 10); // probably leaking
  let scissor = clipCoordsScissor(x, y, w, h);
  let dom_clip = clipCoordsDom(x, y, w, h);
  camera2d.setInputClipping(dom_clip);
  spriteQueuePush();
  clip_stack.push({
    z, scissor, dom_clip,
  });
}

export function clipPop() {
  assert(clipped());
  queuefn(Z.TOOLTIP - 0.1, () => {
    gl.disable(gl.SCISSOR_TEST);
  });
  let { z, scissor } = clip_stack.pop();
  let sprites = sprite_queue;
  spriteQueuePop(true);
  if (clip_stack.length) {
    let { dom_clip } = clip_stack[clip_stack.length - 1];
    camera2d.setInputClipping(dom_clip);
  } else {
    camera2d.setInputClipping(null);
  }
  queuefn(z, () => {
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(scissor[0], scissor[1], scissor[2], scissor[3]);
    spriteQueuePush();
    sprite_queue = sprites;
    exports.draw();
    spriteQueuePop();
    // done at Z.TOOLTIP: gl.disable(gl.SCISSOR_TEST);
  });
}

let clip_paused;
export function clipPause() {
  // Queue back into the root sprite queue
  assert(clipped());
  assert(!clip_paused);
  clip_paused = true;
  spriteQueuePush(sprite_queue_stack[0]);
  camera2d.setInputClipping(null);
  // push onto the clip stack so if there's another clip push/pop we get back to
  // escaped when it pops.
  clip_stack.push({ dom_clip: null });
}
export function clipResume() {
  assert(clipped());
  assert(clip_paused);
  clip_stack.pop(); // remove us
  clip_paused = false;
  assert(clipped());
  let { dom_clip } = clip_stack[clip_stack.length - 1];
  spriteQueuePop(true);
  camera2d.setInputClipping(dom_clip);
}

function diffTextures(texsa, texsb) {
  if (texsa.length !== texsb.length) {
    return true;
  }
  for (let ii = 0; ii < texsa.length; ++ii) {
    if (texsa[ii] !== texsb[ii]) {
      return true;
    }
  }
  return false;
}

let batch_state;
let sprite_geom;
let sprite_buffer; // Float32Array with 8 entries per vert
let sprite_buffer_len = 0; // in verts
let sprite_buffer_batch_start = 0;
let sprite_buffer_idx = 0; // in verts
let last_blend_mode;
let last_bound_shader;
const MAX_VERT_COUNT = 65536;
let batches = [];

function commit() {
  if (sprite_buffer_idx === sprite_buffer_batch_start) {
    return;
  }
  batches.push({
    state: batch_state,
    start: sprite_buffer_batch_start,
    end: sprite_buffer_idx,
  });
  sprite_buffer_batch_start = sprite_buffer_idx;
}

function commitAndFlush() {
  commit();
  if (!batches.length) {
    return;
  }
  assert(sprite_buffer_idx);
  sprite_geom.update(sprite_buffer, sprite_buffer_idx);
  sprite_geom.bind();

  for (let ii = 0; ii < batches.length; ++ii) {
    let batch = batches[ii];
    let { state, start, end } = batch;
    if (last_bound_shader !== state.shader || state.shader_params) {
      shaders.bind(sprite_vshader,
        state.shader || sprite_fshader,
        state.shader_params || sprite_shader_params);
      last_bound_shader = state.shader;
    }
    if (last_blend_mode !== state.blend) {
      last_blend_mode = state.blend;
      if (last_blend_mode === BLEND_ADDITIVE) {
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      } else {
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      }
    }
    textures.bindArray(state.texs);
    gl.drawElements(sprite_geom.mode, (end - start) * 3 / 2, gl.UNSIGNED_SHORT, start * 3);
  }

  batches.length = 0;
  sprite_buffer_idx = 0;
  sprite_buffer_batch_start = 0;
}

function bufferSpriteData(data) {
  let index = sprite_buffer_idx * 8;
  sprite_buffer_idx += 4;

  let c1 = data[8];
  let c2 = data[9];
  let c3 = data[10];
  let c4 = data[11];
  let u1 = data[12];
  let v1 = data[13];
  let u2 = data[14];
  let v2 = data[15];

  sprite_buffer[index] = data[0];
  sprite_buffer[index + 1] = data[1];
  sprite_buffer[index + 2] = c1;
  sprite_buffer[index + 3] = c2;
  sprite_buffer[index + 4] = c3;
  sprite_buffer[index + 5] = c4;
  sprite_buffer[index + 6] = u1;
  sprite_buffer[index + 7] = v1;

  sprite_buffer[index + 8] = data[2];
  sprite_buffer[index + 9] = data[3];
  sprite_buffer[index + 10] = c1;
  sprite_buffer[index + 11] = c2;
  sprite_buffer[index + 12] = c3;
  sprite_buffer[index + 13] = c4;
  sprite_buffer[index + 14] = u1;
  sprite_buffer[index + 15] = v2;

  sprite_buffer[index + 16] = data[4];
  sprite_buffer[index + 17] = data[5];
  sprite_buffer[index + 18] = c1;
  sprite_buffer[index + 19] = c2;
  sprite_buffer[index + 20] = c3;
  sprite_buffer[index + 21] = c4;
  sprite_buffer[index + 22] = u2;
  sprite_buffer[index + 23] = v2;

  sprite_buffer[index + 24] = data[6];
  sprite_buffer[index + 25] = data[7];
  sprite_buffer[index + 26] = c1;
  sprite_buffer[index + 27] = c2;
  sprite_buffer[index + 28] = c3;
  sprite_buffer[index + 29] = c4;
  sprite_buffer[index + 30] = u2;
  sprite_buffer[index + 31] = v1;
}

export function draw() {
  if (engine.defines.NOSPRITES) {
    sprite_queue.length = 0;
  }
  if (!sprite_queue.length) {
    return;
  }

  clip_space[0] = 2 / engine.viewport[2];
  clip_space[1] = -2 / engine.viewport[3];

  last_blend_mode = -1;
  last_bound_shader = -1;

  if (!sprite_geom) {
    sprite_geom = geom.create([
      [shaders.semantic.POSITION, gl.FLOAT, 2, false],
      [shaders.semantic.COLOR, gl.FLOAT, 4, false],
      [shaders.semantic.TEXCOORD, gl.FLOAT, 2, false],
    ], [], null, geom.QUADS);
    sprite_buffer = new Float32Array(1024);
    sprite_buffer_len = sprite_buffer.length / 8;
  }

  sprite_queue.sort(cmpSprite);

  batch_state = null;
  assert.equal(sprite_buffer_idx, 0);
  assert.equal(sprite_buffer_batch_start, 0);
  assert.equal(batches.length, 0);
  for (let ii = 0; ii < sprite_queue.length; ++ii) {
    let elem = sprite_queue[ii];
    if (elem.fn) {
      commitAndFlush();
      batch_state = null;
      elem.fn();
      last_bound_shader = -1;
      last_blend_mode = -1;
      assert.equal(sprite_buffer_idx, 0);
      assert.equal(sprite_buffer_batch_start, 0);
      assert.equal(batches.length, 0);

      clip_space[0] = 2 / engine.viewport[2];
      clip_space[1] = -2 / engine.viewport[3];
    } else {
      if (!batch_state ||
        diffTextures(elem.texs, batch_state.texs) ||
        elem.shader !== batch_state.shader ||
        elem.shader_params !== batch_state.shader_params ||
        elem.blend !== batch_state.blend
      ) {
        commit();
        batch_state = elem;
      }
      if (sprite_buffer_idx + 4 > sprite_buffer_len) {
        commitAndFlush();
        // batch_state left alone
        if (sprite_buffer_len !== MAX_VERT_COUNT) {
          let new_length = min((sprite_buffer_len * 1.25 + 3) & ~3, MAX_VERT_COUNT); // eslint-disable-line no-bitwise
          sprite_buffer_len = new_length;
          sprite_buffer = new Float32Array(new_length * 8);
        }
      }

      bufferSpriteData(elem.data);
      sprite_freelist.push(elem);
    }
  }
  commitAndFlush();

  sprite_queue.length = 0;
  if (last_blend_mode !== BLEND_ALPHA) {
    // always reset to this
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
}

export function buildRects(ws, hs) {
  let rects = [];
  let total_w = 0;
  for (let ii = 0; ii < ws.length; ++ii) {
    total_w += ws[ii];
  }
  let total_h = 0;
  for (let ii = 0; ii < hs.length; ++ii) {
    total_h += hs[ii];
  }
  let tex_w = nextHighestPowerOfTwo(total_w);
  let tex_h = nextHighestPowerOfTwo(total_h);
  let wh = [];
  for (let ii = 0; ii < ws.length; ++ii) {
    wh.push(ws[ii] / total_h);
  }
  let hw = [];
  for (let ii = 0; ii < hs.length; ++ii) {
    hw.push(hs[ii] / total_w);
  }
  let aspect = [];
  let non_square = false;
  let y = 0;
  for (let jj = 0; jj < hs.length; ++jj) {
    let x = 0;
    for (let ii = 0; ii < ws.length; ++ii) {
      let r = vec4(x / tex_w, y / tex_h,
        (x + ws[ii]) / tex_w, (y + hs[jj]) / tex_h);
      rects.push(r);
      let asp = ws[ii] / hs[jj];
      if (asp !== 1) {
        non_square = true;
      }
      aspect.push(asp);
      x += ws[ii];
    }
    y += hs[jj];
  }
  return {
    widths: ws,
    heights: hs,
    wh,
    hw,
    rects,
    aspect: non_square ? aspect : null,
    total_w,
    total_h,
  };
}

function Sprite(params) {
  if (params.texs) {
    this.texs = params.texs;
  } else {
    let ext = params.ext || '.png';
    this.texs = [];
    if (params.tex) {
      this.texs.push(params.tex);
    } else if (params.layers) {
      assert(params.name);
      this.texs = [];
      for (let ii = 0; ii < params.layers; ++ii) {
        this.texs.push(textures.load({
          url: `img/${params.name}_${ii}${ext}`,
          filter_min: params.filter_min,
          filter_mag: params.filter_mag,
          wrap_s: params.wrap_s,
          wrap_t: params.wrap_t,
        }));
      }
    } else if (params.name) {
      this.texs.push(textures.load({
        url: `img/${params.name}${ext}`,
        filter_min: params.filter_min,
        filter_mag: params.filter_mag,
        wrap_s: params.wrap_s,
        wrap_t: params.wrap_t,
      }));
    } else {
      assert(params.url);
      this.texs.push(textures.load(params));
    }
  }

  this.origin = params.origin || vec2(0, 0); // [0,1] range
  this.size = params.size || vec2(1, 1);
  this.color = params.color || vec4(1,1,1,1);
  this.uvs = params.uvs || vec4(0, 0, 1, 1);
  if (!params.uvs) {
    // Fix up non-power-of-two textures
    this.texs[0].onLoad((tex) => {
      this.uvs[2] = tex.src_width / tex.width;
      this.uvs[3] = tex.src_height / tex.height;
    });
  }

  if (params.ws) {
    this.uidata = buildRects(params.ws, params.hs);
  }
  this.shader = params.shader || null;
}

// params:
//   required: x, y
//   optional: z, w, h, uvs, color, nozoom, pixel_perfect
Sprite.prototype.draw = function (params) {
  if (params.w === 0 || params.h === 0) {
    return;
  }
  let w = (params.w || 1) * this.size[0];
  let h = (params.h || 1) * this.size[1];
  let uvs = (typeof params.frame === 'number') ? this.uidata.rects[params.frame] : (params.uvs || this.uvs);
  queuesprite(this, params.x, params.y, params.z || Z.UI, w, h, params.rot, uvs, params.color || this.color,
    params.shader || this.shader, params.shader_params, params.nozoom, params.pixel_perfect);
};

Sprite.prototype.drawDualTint = function (params) {
  params.shader = sprite_dual_fshader;
  params.shader_params = {
    color1: params.color1,
  };
  this.draw(params);
};

export function create(params) {
  return new Sprite(params);
}

export function startup() {
  clip_space[2] = -1;
  clip_space[3] = 1;
  sprite_vshader = shaders.create('glov/shaders/sprite.vp');
  sprite_fshader = shaders.create('glov/shaders/sprite.fp');
  sprite_dual_fshader = shaders.create('glov/shaders/sprite_dual.fp');
}
