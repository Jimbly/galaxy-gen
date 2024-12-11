/* globals HTMLCanvasElement, HTMLImageElement */

// TODO: move when converted to TypeScript
import type { BUCKET_ALPHA, BUCKET_DECAL, BUCKET_OPAQUE } from './dyn_geom';
import type { Box } from './geom_types';
// TODO: move when converted to TypeScript
import type { shaderCreate } from 'glov/client/shaders';
type Shader = ReturnType<typeof shaderCreate>;
import type { TSMap, UnimplementedData, VoidFunc } from 'glov/common/types';
import type { ROVec1, ROVec2, ROVec3, ROVec4 } from 'glov/common/vmath';

export enum BlendMode {
  BLEND_ALPHA = 0,
  BLEND_ADDITIVE = 1,
  BLEND_PREMULALPHA = 2,
}
export const BLEND_ALPHA = 0;
export const BLEND_ADDITIVE = 1;
export const BLEND_PREMULALPHA = 2;

export type HTMLImage = HTMLCanvasElement | HTMLImageElement;
export interface Texture {
  width: number;
  height: number;
  src_width: number;
  src_height: number;
  loaded: boolean;
  err?: string;
  destroy(): void;
  wrap_s: number;
  wrap_t: number;
  updateData(
    w: number, h: number,
    data: Uint8Array | Uint8ClampedArray | HTMLImage,
    per_mipmap_data?: HTMLImage[]
  ): void;
}

export type ShaderParams = TSMap<number[]|ROVec1|ROVec2|ROVec3|ROVec4>;

/**
 * Client Sprite class
 */
export interface SpriteUIData {
  widths: number[]; heights: number[];
  wh: number[]; hw: number[];
  rects: ROVec4[] | TSMap<ROVec4>; // [u0, v0, u1, v1]
  aspect: number[] | null;
  total_w: number; total_h: number;
  padh?: number[];
  padv?: number[];
}
export interface SpriteDrawParams {
  x: number; y: number; z?: number;
  w?: number; h?: number;
  frame?: number | string;
  rot?: number;
  uvs?: ROVec4; // [u0, v0, u1, v1]
  blend?: BlendMode;
  color?: ROVec4;
  shader?: Shader;
  shader_params?: ShaderParams;
  nozoom?: boolean;
}
export type BucketType = typeof BUCKET_OPAQUE | typeof BUCKET_DECAL | typeof BUCKET_ALPHA;
export interface SpriteDraw3DParams {
  frame?: number | string;
  pos: ROVec3; // 3D world position
  offs?: ROVec2; // 2D offset (-x/-y is upper left), in world scale
  size: ROVec2; // 2D w;h; in world scale
  uvs?: ROVec4;
  blend?: BlendMode;
  color?: ROVec4;
  doublesided?: boolean;
  shader?: Shader;
  shader_params?: ShaderParams;
  bucket?: BucketType;
  facing?: number;
  face_right?: ROVec3;
  face_down?: ROVec3;
  vshader?: Shader;
}
export interface Sprite {
  uidata?: SpriteUIData;
  uvs: ROVec4;
  origin: ROVec2;
  draw(params: SpriteDrawParams): void;
  drawDualTint(params: SpriteDrawParams & { color1: ROVec4 }): void;
  draw4Color(params: SpriteDrawParams & {
    color_ul: ROVec4;
    color_ll: ROVec4;
    color_lr: ROVec4;
    color_ur: ROVec4;
  }): void;
  draw3D(params: SpriteDraw3DParams): void;
  texs: Texture[];
  isLazyLoad(): boolean;
  lazyLoad(): number;
  getAspect(): number;
  withOrigin(new_origin: ROVec2): Sprite;
  onReInit(cb: VoidFunc): void;
  doReInit(): void;
}
export interface UISprite extends Sprite {
  uidata: SpriteUIData;
}
/**
 * Client Sprite creation parameters
 */
export type SpriteParamBase = {
  origin?: ROVec2;
  size?: ROVec2;
  color?: ROVec4;
  uvs?: ROVec4;
  ws?: number | number[]; // (relative) widths/heights for calculating frames within a sprite sheet / atlas
  hs?: number | number[];//   or just number of equal-sized frames
  shader?: Shader;
};
export type TextureOptions = {
  filter_min?: number;
  filter_mag?: number;
  wrap_s?: number;
  wrap_t?: number;
  force_mipmaps?: boolean;
};
export type SpriteParam = SpriteParamBase & ({
  texs: Texture[];
} | {
  tex: Texture;
} | (TextureOptions & ({
  layers: number;
  name: string;
  ext?: string;
} | {
  name: string;
  ext?: string;
  lazy_load?: boolean;
} | {
  url: string;
  lazy_load?: boolean;
  soft_error?: boolean;
  load_filter?: (tex: Texture, img: HTMLImage) => HTMLImage;
} | {
  width: number;
  height: number;
  data: Uint8Array;
  format: UnimplementedData; // TEXTURE_FORMAT enum
})));

export function spriteQueuePush(): void;
export function spriteQueuePop(): void;
export function spriteChainedStart(): void;
export function spriteChainedStop(): void;
export function spriteQueueFn(z: number, fn: () => void): void;
export function spriteClip(z_start: number, z_end: number, x: number, y: number, w: number, h: number): void;
export function spriteClipped(including_paused?: boolean): boolean;
export function spriteClippedViewport(): Box;
export function spriteClipPush(z: number, x: number, y: number, w: number, h: number): void;
export function spriteClipPop(): void;
export function spriteClipPause(): void;
export function spriteClipResume(): void;
export function spriteDraw(): void;
export function spriteDrawPartial(z: number): void;
export function spriteCreate(param: SpriteParam): Sprite;
export function spriteStartup(): void;

export function spriteFlippedUVsApplyHFlip(spr: Sprite): void;
export function spriteFlippedUVsRestore(spr: Sprite): void;

export type SpriteData = { _opaque: 'SpriteData' }; // Maybe doesn't need to be opaque?

// 4 arbitrary positions, colors, uvs
// coordinates must be in counter-clockwise winding order
export function spriteQueueRaw4Color(
  texs: Texture[],
  x0: number, y0: number, c0: ROVec4, u0: number, v0: number,
  x1: number, y1: number, c1: ROVec4, u1: number, v1: number,
  x2: number, y2: number, c2: ROVec4, u2: number, v2: number,
  x3: number, y3: number, c3: ROVec4, u3: number, v3: number,
  z: number,
  shader?: Shader, shader_params?: ShaderParams, blend?: BlendMode
): SpriteData;

// Expects a buffer in the form of:
//   x, y, r, g, b, a, u, v, (x4)
export function spriteQueueRaw4ColorBuffer(
  texs: Texture[],
  buf: Float32Array/* length: 32*/,
  z: number,
  shader?: Shader, shader_params?: ShaderParams, blend?: BlendMode
): SpriteData;

// 4 arbitrary positions, 2 uvs
// coordinates must be in counter-clockwise winding order
export function spriteQueueRaw4(
  texs: Texture[],
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  z: number,
  u0: number, v0: number, u1: number, v1: number,
  color: ROVec4,
  shader?: Shader, shader_params?: ShaderParams, blend?: BlendMode
): SpriteData;

export function spriteQueueRaw(
  texs: Texture[],
  x: number, y: number, z: number, w: number, h: number,
  u0: number, v0: number, u1: number, v1: number,
  color: ROVec4,
  shader?: Shader, shader_params?: ShaderParams, blend?: BlendMode
): SpriteData;

export function spriteQueueSprite(
  sprite: Sprite,
  x: number, y: number, z: number,
  w: number, h: number, rot: number,
  uvs: ROVec4,
  color: ROVec4,
  shader?: Shader,
  shader_params?: ShaderParams,
  nozoom?: boolean,
  pixel_perfect?: boolean,
  blend?: BlendMode,
): SpriteData;

// TODO: export with appropriate types
// export type Shader = { _opaque: 'Shader' };
// export function spriteDataAlloc(texs: Texture[], shader: Shader, shader_params:ShaderParams, blend: BlendMode): void;
// export function queueSpriteData(elem, z): void;

// TODO: migrate to internal only?
export function blendModeSet(blend: BlendMode): void;
export function blendModeReset(force: boolean): void;
// export function buildRects(ws, hs, tex): void;
