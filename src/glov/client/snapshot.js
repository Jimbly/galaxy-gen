// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT
/* eslint no-bitwise:off */

import assert from 'assert';
import * as mat4Copy from 'gl-mat4/copy';
import * as mat4LookAt from 'gl-mat4/lookAt';
import {
  mat4,
  v3addScale,
  v3copy,
  v4copy,
  vec3,
  vec4,
  zaxis,
} from 'glov/common/vmath';
import * as camera2d from './camera2d';
import {
  alphaDraw,
  alphaDrawListSize,
  alphaListPop,
  alphaListPush,
} from './draw_list';
import * as effects from './effects';
import * as engine from './engine';
import { getFrameIndex } from './engine';
import { framebufferCapture } from './framebuffer';
import * as geom from './geom';
import {
  qRotateZ,
  qTransformVec3,
  quat,
  unit_quat
} from './quat';
import { shaderCreate, shadersPrelink } from './shaders';
import * as sprites from './sprites';
import {
  BLEND_ALPHA,
  blendModeSet,
  clipCoordsScissor,
  scissorPop,
  scissorPushIntersection,
  spriteCreate,
  spriteQueueFn,
} from './sprites';
import { textureCreateForCapture } from './textures';
const { max, PI, tan } = Math;

export let OFFSET_GOLDEN = vec3(-1 / 1.618, -1, 1 / 1.618 / 1.618);
let snapshot_shader;

let viewport_save = vec4();
let projection_save = mat4();
let mat_view_save = mat4();

export function viewportRenderPrepare(param) {
  const { pre, viewport } = param;
  v4copy(viewport_save, engine.viewport);
  mat4Copy(projection_save, engine.mat_projection);
  mat4Copy(mat_view_save, engine.mat_view);
  alphaListPush();
  sprites.spriteQueuePush();
  camera2d.push();
  if (pre) {
    pre();
  }

  blendModeSet(BLEND_ALPHA);
  gl.enable(gl.BLEND);
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
  gl.enable(gl.CULL_FACE);

  engine.setViewport(viewport);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  camera2d.setNormalized();
  scissorPushIntersection(viewport);
}

export function viewportRenderFinish(param) {
  const { post } = param;
  gl.disable(gl.SCISSOR_TEST);
  if (post) {
    post();
  }
  alphaListPop();
  camera2d.pop();
  sprites.spriteQueuePop();
  engine.setProjection(projection_save);
  engine.setViewport(viewport_save);
  engine.setGlobalMatrices(mat_view_save);
  engine.startSpriteRendering();
  scissorPop();
}


let view_mat = mat4();
let target_pos = vec3();
let camera_pos = vec3();
let camera_offset_rot = vec3();
let quat_rot = quat();
let capture_uvs = vec4(0, 1, 1, 0);
const FOV = 15 / 180 * PI;
const DIST_SCALE = 0.5 / tan(FOV / 2) * 1.1;
let last_snapshot_idx = 0;

function snapshotSetupMats(param) {
  let camera_offset = param.camera_offset || OFFSET_GOLDEN;
  let max_dim = max(param.size[0], param.size[2]);
  let dist = max_dim * DIST_SCALE + param.size[1] / 2;
  engine.setupProjection(FOV, param.w, param.h, 0.1, dist * 2);
  if (param.mat) {
    mat4Copy(view_mat, param.mat);
  } else {
    v3addScale(target_pos, param.pos, param.size, 0.5);
    if (param.rot) {
      qRotateZ(quat_rot, unit_quat, param.rot);
      qTransformVec3(camera_offset_rot, camera_offset, quat_rot);
    } else {
      v3copy(camera_offset_rot, camera_offset);
    }
    v3addScale(camera_pos, target_pos, camera_offset_rot, dist);
    mat4LookAt(view_mat, camera_pos, target_pos, zaxis);
  }
  engine.setGlobalMatrices(view_mat);
}

const vert_flip = {
  copy_uv_scale: vec4(1, -1, 0, 0),
};

// returns sprite
// { w, h, pos, size, draw(), [rot], [sprite], [snapshot_backdrop] }
export function snapshot(param) {
  assert(!engine.had_3d_this_frame); // must be before general 3D init

  let name = param.name || `snapshot_${++last_snapshot_idx}`;
  let auto_unload = param.on_unload;
  let texs = param.sprite && param.sprite.texs || [
    textureCreateForCapture(`${name}(0)`, auto_unload),
    textureCreateForCapture(`${name}(1)`, auto_unload)
  ];

  param.viewport = [0, 0, param.w, param.h];
  viewportRenderPrepare(param);

  snapshotSetupMats(param);

  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (param.snapshot_backdrop) {
    gl.depthMask(false);
    effects.applyCopy({ source: param.snapshot_backdrop.texs, no_framebuffer: true, params: vert_flip });
    gl.depthMask(true);
  }
  param.draw();
  if (alphaDrawListSize()) {
    alphaDraw();
    gl.depthMask(true);
  }
  // TODO: use new framebuffer API here
  framebufferCapture(texs[0], param.w, param.h, true, false);

  gl.clearColor(1, 1, 1, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  if (param.snapshot_backdrop) {
    gl.depthMask(false);
    effects.applyCopy({ source: param.snapshot_backdrop.texs, no_framebuffer: true, params: vert_flip });
    gl.depthMask(true);
  }
  param.draw();
  if (alphaDrawListSize()) {
    alphaDraw();
    gl.depthMask(true);
  }
  // PERFTODO: we only need to capture the red channel, does that speed things up and use less mem?
  framebufferCapture(texs[1], param.w, param.h, true, false);

  viewportRenderFinish(param);

  if (!param.sprite) {
    param.sprite = spriteCreate({
      texs,
      shader: snapshot_shader,
      uvs: capture_uvs,
    });
  }
  return param.sprite;
}

export function snapshotDrawDynamic(param) {
  let { x, y, z, w, h } = param;
  if (param.snapshot_backdrop) {
    param.snapshot_backdrop.draw({
      x, y, w, h, z: z - 0.01,
    });
  }
  let viewport = clipCoordsScissor(x, y, w, h);
  // camera2d.virtualToCanvas(snapshot_dynamic_ul, [x, y]);
  // camera2d.virtualToCanvas(snapshot_dynamic_lr, [x + w, y + h]);
  // w = snapshot_dynamic_lr[0] - snapshot_dynamic_ul[0];
  // h = snapshot_dynamic_lr[1] - snapshot_dynamic_ul[1];
  // param.viewport = [snapshot_dynamic_ul[0], engine.height - snapshot_dynamic_lr[1], w, h];
  param.viewport = viewport;

  spriteQueueFn(z, function () {

    let tris_start = geom.stats.tris;
    viewportRenderPrepare(param);

    snapshotSetupMats(param);

    param.draw();
    if (alphaDrawListSize()) {
      alphaDraw();
      gl.depthMask(true);
    }

    viewportRenderFinish(param);

    if (param.perf_container) {
      param.perf_container.tris = geom.stats.tris - tris_start;
      param.perf_container.frame = getFrameIndex();
    }
  });
}


export function snapshotStartup() {
  snapshot_shader = shaderCreate('shaders/snapshot.fp');
  shadersPrelink(sprites.sprite_vshader, snapshot_shader);
}
