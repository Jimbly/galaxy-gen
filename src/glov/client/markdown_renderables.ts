export let markdown_default_renderables: TSMap<MarkdownRenderable> = {};
export let markdown_default_font_styles: TSMap<FontStyle> = {};

import assert from 'assert';
import verify from 'glov/common/verify';
import {
  ROVec4,
  Vec4,
  unit_vec,
  vec4,
} from 'glov/common/vmath';
import {
  ALIGN,
  EPSILON,
  FontStyle,
  fontStyleColored,
} from './font';
import {
  MDDrawBlock,
  MDDrawParam,
  MDLayoutBlock,
  MDLayoutCalcParam,
} from './markdown';
import { RenderableContent } from './markdown_parse';
import { Sprite } from './sprites';
import {
  sprites as ui_sprites,
} from './ui';

import type { Box } from './geom_types';
import type { SpriteSheet } from './spritesheet';
import type { Optional, TSMap } from 'glov/common/types';

const { floor, max } = Math;

export function markdownRenderableAddDefault(key: string, renderable: MarkdownRenderable): void {
  markdown_default_renderables[key] = renderable;
}

export function markdownSetColorStyle(idx: string | number, style: FontStyle): void {
  markdown_default_font_styles[idx] = style;
}
export function markdownSetColorStyles(styles: FontStyle[]): void {
  for (let ii = 0; ii < styles.length; ++ii) {
    markdown_default_font_styles[ii] = styles[ii];
  }
}
const default_palette = [0x000000ff, 0xff2020ff, 0x20ff20ff, 0x2020ffff, 0xffffffff];
markdownSetColorStyles(default_palette.map((c) => fontStyleColored(null, c)));

// Note: renderable can return null (at parse time) and will be replaced with the original text
export type MarkdownRenderable = (content: RenderableContent, data?: unknown) => (MDLayoutBlock | null);

export function markdownLayoutFit(param: MDLayoutCalcParam, dims: Optional<Box, 'x' | 'y'>): dims is Box {
  let { cursor, line_height } = param;
  if (cursor.x + dims.w > param.w + EPSILON && cursor.x !== cursor.line_x0 && (param.align & ALIGN.HWRAP)) {
    cursor.x = cursor.line_x0 = param.indent;
    cursor.y += line_height; // TODO: = cursor.line_y1 instead?
    cursor.line_y1 = cursor.y;
  }
  if (cursor.x + dims.w > param.w + EPSILON && (param.align & ALIGN.HWRAP)) {
    // still over, doesn't fit on a whole line, modify w (if caller listens to that)
    dims.w = param.w - cursor.line_x0;
  }
  dims.x = cursor.x;
  if (dims.h !== line_height) {
    // always vertically center within the specified line height
    dims.y = cursor.y + (line_height - dims.h)/2;
    if (param.font.integral) {
      dims.y = floor(dims.y);
    }
    cursor.line_y1 = max(cursor.line_y1, cursor.y + line_height, dims.y + dims.h);
  } else {
    dims.y = cursor.y;
    cursor.line_y1 = max(cursor.line_y1, cursor.y + line_height);
  }
  cursor.x += dims.w;
  // TODO: if height > line_height, track this line's height on the cursor?
  return true;
}

export type MarkdownImageParam = {
  sprite: Sprite;
  frame?: number | string;
  color?: ROVec4;
  override?: boolean;
};
let allowed_images: TSMap<MarkdownImageParam> = Object.create(null);
export function markdownImageRegister(img_name: string, param: MarkdownImageParam): void {
  assert(param.sprite);
  assert(!allowed_images[img_name] || param.override);
  allowed_images[img_name] = param;
}

export function markdownImageRegisterSpriteSheet(spritesheet: SpriteSheet): void {
  let sprite = spritesheet.sprite;
  for (let key in spritesheet.tiles) {
    markdownImageRegister(key, {
      sprite,
      frame: spritesheet.tiles[key],
    });
  }
}

function getImageData(key: string): MarkdownImageParam {
  return allowed_images[key] || { sprite: ui_sprites.white };
}

class MDRImg implements MDLayoutBlock, MDDrawBlock, Box {
  key: string;
  scale: number;
  aspect: number;
  constructor(content: RenderableContent) {
    this.key = content.key;
    this.dims = this;
    let scale = content.param && content.param.scale;
    this.scale = (scale && typeof scale === 'number') ? scale : 1;
    let aspect = content.param && content.param.aspect;
    this.aspect = (aspect && typeof aspect === 'number') ? aspect : 0;
  }
  // assigned during layout
  dims: Box;
  x!: number;
  y!: number;
  w!: number;
  h!: number;
  layout(param: MDLayoutCalcParam): MDDrawBlock[] {
    let { line_height } = param;
    let h = this.h = line_height * this.scale;
    let img_data = getImageData(this.key);
    let { sprite, frame } = img_data;
    let aspect = 1;
    if (typeof frame === 'number' && sprite.uidata) {
      if (sprite.uidata.aspect) {
        aspect = sprite.uidata.aspect[frame];
      }
    } else {
      if (sprite.isLazyLoad()) {
        // lazy-loaded images must have a in-markdown specified aspect ratio
        verify(this.aspect);
        aspect = this.aspect || 1;
      } else if (this.aspect) {
        aspect = this.aspect;
      } else {
        let tex = sprite.texs[0];
        aspect = tex.width / tex.height;
        if (sprite.uvs) {
          aspect *= (sprite.uvs[2] - sprite.uvs[0]) / (sprite.uvs[3] - sprite.uvs[1]);
        }
      }
    }
    this.w = h * aspect;
    markdownLayoutFit(param, this);
    return [this];
  }
  alpha_color_cache?: Vec4;
  alpha_color_cache_value?: number;
  draw(param: MDDrawParam): void {
    profilerStart('MDRImg::draw');
    let x = this.x + param.x;
    let y = this.y + param.y;
    let img_data = getImageData(this.key);
    let color = img_data.color;
    if (param.alpha !== 1) {
      if (param.alpha !== this.alpha_color_cache_value) {
        this.alpha_color_cache_value = param.alpha;
        color = color || unit_vec;
        this.alpha_color_cache = vec4(color[0], color[1], color[2], color[3] * param.alpha);
      }
      color = this.alpha_color_cache!;
    }
    img_data.sprite.draw({
      x, y,
      z: param.z,
      w: this.w,
      h: this.h,
      frame: img_data.frame,
      color,
    });
    profilerStop();
  }
}
function createMDRImg(content: RenderableContent): MDRImg {
  return new MDRImg(content);
}
markdownRenderableAddDefault('img', createMDRImg);

class MDRColorStart implements MDLayoutBlock {
  key: string;
  constructor(content: RenderableContent) {
    this.key = content.key;
  }
  layout(param: MDLayoutCalcParam): MDDrawBlock[] {
    let { font_styles, font_style_idx, font_style_stack } = param;
    if (!font_style_stack) {
      font_style_stack = param.font_style_stack = [];
    }
    font_style_stack.push(font_style_idx);
    if (font_style_idx === this.key) {
      // no change
    } else {
      let new_style = font_styles[this.key] || markdown_default_font_styles[this.key];
      if (new_style) {
        param.font_style_idx = this.key;
        param.font_style = new_style;
      }
    }

    return [];
  }
}
markdownRenderableAddDefault('c', (content: RenderableContent) => new MDRColorStart(content));

class MDRColorEnd implements MDLayoutBlock {
  layout(param: MDLayoutCalcParam): MDDrawBlock[] {
    let { font_styles, font_style_idx, font_style_stack } = param;
    if (!font_style_stack || !font_style_stack.length) {
      // stack underflow
    } else {
      let key = font_style_stack.pop()!;
      if (font_style_idx === key) {
        // nothing
      } else {
        let new_style = font_styles[key] || markdown_default_font_styles[key];
        if (new_style) {
          param.font_style_idx = key;
          param.font_style = new_style;
        }
      }
    }

    return [];
  }
}
markdownRenderableAddDefault('/c', (content: RenderableContent) => new MDRColorEnd());
