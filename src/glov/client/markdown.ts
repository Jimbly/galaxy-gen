import assert from 'assert';
import type { TSMap, WithRequired } from 'glov/common/types';
import { has } from 'glov/common/util';
import verify from 'glov/common/verify';
import {
  unit_vec,
  vec4,
} from 'glov/common/vmath';
import * as engine from './engine';
import {
  ALIGN,
  EPSILON,
  Font,
  FontStyle,
  fontStyleAlpha,
  fontStyleBold,
  fontStyleHash,
  Text,
} from './font';
import { Box } from './geom_types';
import { mousePos } from './input';
import { getStringFromLocalizable } from './localization';
import {
  MDASTNode,
  mdParse,
  mdParseSetValidRenderables,
  RenderableContent,
} from './markdown_parse';
import {
  markdown_default_font_styles,
  markdown_default_renderables,
  markdownLayoutFit,
  MarkdownRenderable,
} from './markdown_renderables';
import {
  spot,
  SPOT_DEFAULT_LABEL,
  spotPadMode,
} from './spot';
import {
  spriteClipPause,
  spriteClipped,
  spriteClippedViewport,
  spriteClipResume,
} from './sprites';
import {
  drawElipse,
  drawRect2,
  getUIElemData,
  LabelBaseOptions,
  uiFontStyleNormal,
  uiGetFont,
  uiTextHeight,
} from './ui';

const { ceil, floor, max, min } = Math;

// Exported opaque types
export type MarkdownCache = Record<string, never>;
export type MarkdownStateParam = { // Allocate as just `{ cache: {} }`
  cache?: MarkdownCache; // Allocate as just `cache: {}` if the caller wants to own the caching
};
export type MarkdownStateCached = WithRequired<MarkdownStateParam, 'cache'>;

export type MarkdownCustomRenderable = {
  type: string;
  data: unknown;
};
export type MarkdownParseParam = {
  text: Text;
  custom?: TSMap<MarkdownCustomRenderable>;
  renderables?: TSMap<MarkdownRenderable>;
};

export type MarkdownLayoutParam = {
  font?: Font;
  font_style?: FontStyle | null;
  // font style keys are the style_idx or with a `.bold` suffix
  //   Example: `A[c=1]B*C*[/c]*D*` will use def, 1, 1.bold, def.bold
  font_styles?: TSMap<FontStyle>;
  font_style_idx?: number | string; // default: 'def'
  w?: number;
  h?: number;
  // TODO: also need line_height here!  Get alignment/etc respecting that
  text_height?: number;
  line_height?: number;
  indent?: number;
  align?: ALIGN;
};

export type MarkdownDrawParam = {
  x: number;
  y: number;
  z?: number;
  alpha?: number;
  viewport?: Box | null;
};


// Internal, non-exported types
type MDCache = {
  parsed?: MDLayoutBlock[];
  layout?: {
    blocks: MDDrawBlock[]; // sorted by y
    dims: MarkdownDims;
    max_block_h: number;
  };
};
type MDState = {
  cache: MDCache;
};

export function markdownParseInvalidate(param: MarkdownStateParam): void {
  if (param.cache) {
    let state = param as MDState;
    if (state.cache.parsed) {
      delete state.cache.parsed;
    }
  }
}

export function markdownLayoutInvalidate(param: MarkdownStateParam): void {
  if (param.cache) {
    let state = param as MDState;
    if (state.cache.layout) {
      delete state.cache.layout;
    }
  }
}

type FontStylesWithDefault = TSMap<FontStyle> & { def: FontStyle };
export type MDLayoutCalcParam = Required<MarkdownLayoutParam> & {
  font_style: FontStyle; // not `null`
  font_styles: FontStylesWithDefault;
  font_style_stack?: (string | number)[];
  cursor: {
    line_x0: number;
    line_y1: number;
    x: number;
    y: number;
  };
};

export type MDDrawParam = {
  x: number;
  y: number;
  z: number;
  alpha: number;
};

export interface MDDrawBlock {
  dims: Box;
  draw(param: MDDrawParam): void;
}

export interface MDLayoutBlock {
  layout(param: MDLayoutCalcParam): MDDrawBlock[];
}

class MDBlockParagraph implements MDLayoutBlock {
  private content: MDLayoutBlock[];
  constructor(content: MDASTNode[], param: MarkdownParseParam) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    this.content = mdASTToBlock(content, param);
  }
  layout(param: MDLayoutCalcParam): MDDrawBlock[] {
    let ret: MDDrawBlock[][] = [];
    for (let ii = 0; ii < this.content.length; ++ii) {
      ret.push(this.content[ii].layout(param));
    }
    if (param.align & ALIGN.HWRAP) {
      if (param.cursor.x !== param.cursor.line_x0) {
        param.cursor.line_x0 = param.cursor.x = param.indent;
        param.cursor.y += param.line_height;
      }
      param.cursor.y += ceil(param.line_height * 0.5);
    } else {
      param.cursor.x += ceil(param.text_height * 0.25);
    }

    return Array.prototype.concat.apply([], ret);
  }
}
function createParagraph(content: MDASTNode[], param: MarkdownParseParam): MDBlockParagraph {
  return new MDBlockParagraph(content, param);
}

class MDBlockBold implements MDLayoutBlock {
  private content: MDLayoutBlock[];
  constructor(content: MDASTNode[], param: MarkdownParseParam) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    this.content = mdASTToBlock(content, param);
  }
  layout(param: MDLayoutCalcParam): MDDrawBlock[] {
    // TODO (later, maybe): migrate to UIStyle and use a named "bold" style instead?
    let old_style = param.font_style;
    let key = `${param.font_style_idx}.bold`;
    let { font_styles } = param;
    let bold_style = font_styles[key];
    if (!bold_style) {
      let base_style = font_styles[param.font_style_idx] ||
        markdown_default_font_styles[param.font_style_idx] ||
        font_styles.def;
      bold_style = font_styles[key] = fontStyleBold(base_style, 0.5);
    }
    param.font_style = bold_style;

    let ret: MDDrawBlock[][] = [];
    for (let ii = 0; ii < this.content.length; ++ii) {
      ret.push(this.content[ii].layout(param));
    }
    param.font_style = old_style;
    return Array.prototype.concat.apply([], ret);
  }
}
function createBold(content: MDASTNode[], param: MarkdownParseParam): MDBlockBold {
  return new MDBlockBold(content, param);
}

type MDBlockTextLayout = {
  font: Font;
  font_style: FontStyle;
  x: number;
  y: number;
  w: number;
  h: number;
  // text_height: number; //  Any reason we'd have a h !== text_height?
  align: ALIGN;
  text: string;
};
const debug_color = vec4(0,0,0,0.5);
const NO_HALIGN = ALIGN.VTOP|ALIGN.VCENTER|ALIGN.VBOTTOM|ALIGN.HFIT;
class MDDrawBlockText implements MDDrawBlock {
  constructor(public dims: MDBlockTextLayout) {
  }
  alpha_font_style_cache?: FontStyle;
  alpha_font_style_cache_value?: number;
  draw(param: MDDrawParam): void {
    profilerStart('MDDrawBlockText::draw');
    let lp = this.dims;
    let style = lp.font_style;
    if (param.alpha !== 1) {
      if (this.alpha_font_style_cache_value !== param.alpha) {
        this.alpha_font_style_cache_value = param.alpha;
        this.alpha_font_style_cache = fontStyleAlpha(style, param.alpha);
      }
      style = this.alpha_font_style_cache!;
    }
    lp.font.drawSizedAligned(style,
      param.x + lp.x, param.y + lp.y, param.z,
      lp.h, lp.align & NO_HALIGN, lp.w, lp.h, lp.text);
    profilerStop();
  }
}

class MDBlockText implements MDLayoutBlock {
  constructor(private content: string, param: MarkdownParseParam) {
  }
  layout(param: MDLayoutCalcParam): MDDrawBlock[] {
    let { cursor, line_height, text_height } = param;
    let ret: MDDrawBlock[] = [];
    let text = this.content;
    if (!(param.align & ALIGN.HWRAP)) {
      text = text.replace(/\n/g, ' ');
    }
    if (param.align & ALIGN.HWRAP) {
      let line_x0 = cursor.x;
      // Adjust in case we're mid-line, or already inset
      let inset = cursor.x;
      let w = param.w - inset;
      let indent = param.indent - inset;
      let yoffs = (line_height - text_height)/2;
      if (param.font.integral) {
        yoffs = floor(yoffs);
      }
      param.font.wrapLines(
        param.font_style, w, indent, text_height, text, param.align,
        (x0: number, linenum: number, line: string, x1: number) => {
          if (linenum > 0) {
            cursor.y += line_height; // TODO: = cursor.line_y1 instead?
            cursor.line_x0 = param.indent;
            cursor.line_y1 = cursor.y;
          }
          let layout_param: MDBlockTextLayout = {
            font: param.font,
            font_style: param.font_style,
            x: line_x0 + x0,
            y: cursor.y + yoffs,
            h: text_height,
            w: min(x1, w) - x0,
            align: param.align,
            text: line,
          };
          cursor.line_y1 = max(cursor.line_y1, cursor.y + line_height);
          ret.push(new MDDrawBlockText(layout_param));
        }
      );
      if (ret.length) {
        let tail = ret[ret.length - 1];
        cursor.x = tail.dims.x + tail.dims.w;
      } else {
        // all whitespace, just advance cursor
        cursor.x += param.font.getStringWidth(param.font_style, text_height, text);
      }
    } else {
      let str_w = param.font.getStringWidth(param.font_style, text_height, text);
      let layout_param: MDBlockTextLayout = {
        x: -1, // filled below
        y: -1, // filled below
        font: param.font,
        font_style: param.font_style,
        h: text_height,
        w: str_w,
        align: param.align,
        text,
      };
      markdownLayoutFit(param, layout_param);
      ret.push(new MDDrawBlockText(layout_param));
    }
    return ret;
  }
}
function createText(content: string, param: MarkdownParseParam): MDBlockText {
  return new MDBlockText(content, param);
}

function createRenderable(content: RenderableContent, param: MarkdownParseParam): MDLayoutBlock {
  let custom = param.custom || {};
  let renderables = param.renderables || markdown_default_renderables;
  let type = content.type;
  let data: unknown | undefined;
  if (has(custom, type)) {
    let parameterized = custom[type]!;
    type = parameterized.type;
    data = parameterized.data;
  }
  assert(has(renderables, type)); // should have been filtered out during parsing otherwise
  let block = renderables[type]!(content, data);
  if (block) {
    return block;
  }
  return createText(content.orig_text, param);
}

let block_factories = {
  paragraph: createParagraph,
  text: createText,
  strong: createBold,
  em: createBold,
  renderable: createRenderable,
};

function mdASTToBlock(tree: MDASTNode[], param: MarkdownParseParam): MDLayoutBlock[] {
  let blocks: MDLayoutBlock[] = [];
  let skip = 0;
  for (let ii = 0; ii < tree.length; ++ii) {
    if (skip) {
      --skip;
      continue;
    }
    let elem = tree[ii];
    if (elem.type === 'text') {
      // if this element type is text and the next type(s) are text, combine them
      let next_elem;
      while ((next_elem = tree[ii + skip + 1]) && next_elem.type === 'text') {
        elem.content += next_elem.content;
        ++skip;
      }
    }
    let factory = block_factories[elem.type];
    // @ts-expect-error elem.content is an intersection of types, but generic constructor expects a union of types
    blocks.push(factory(elem.content, param));
  }
  return blocks;
}

// Convert from text into a tree of blocks
function markdownParse(param: MarkdownStateCached & MarkdownParseParam): void {
  let state = param as MDState;
  let { cache } = state;
  if (cache.parsed) {
    return;
  }
  profilerStartFunc();
  let valid_renderables: TSMap<unknown> = (param.renderables ? param.renderables : markdown_default_renderables) || {};
  if (param.custom) {
    valid_renderables = {
      ...valid_renderables,
    };
    for (let key in param.custom) {
      valid_renderables[key] = true;
    }
  }
  mdParseSetValidRenderables(valid_renderables);
  let tree: MDASTNode[] = mdParse(getStringFromLocalizable(param.text));
  cache.parsed = mdASTToBlock(tree, param);
  profilerStopFunc();
}

export function markdownIsAllWhitespace(param: Omit<MarkdownParseParam, 'custom'>): boolean {
  let valid_renderables: TSMap<unknown> = (param.renderables ? param.renderables : markdown_default_renderables) || {};
  mdParseSetValidRenderables(valid_renderables);
  function treeContainsNonWhitespace(tree: MDASTNode[]): boolean {
    for (let ii = 0; ii < tree.length; ++ii) {
      let node = tree[ii];
      if (node.type === 'text') {
        if (node.content.trim()) {
          return true;
        }
      } else if (node.type === 'paragraph' || node.type === 'em' || node.type === 'strong') {
        if (treeContainsNonWhitespace(node.content)) {
          return true;
        }
      } else if (node.type === 'renderable') {
        return true;
      } else {
        verify.unreachable(node);
      }
    }
    return false;
  }
  let tree: MDASTNode[] = mdParse(getStringFromLocalizable(param.text));
  return !treeContainsNonWhitespace(tree);
}

function cmpDimsY(a: MDDrawBlock, b: MDDrawBlock): number {
  let d = a.dims.y - b.dims.y;
  if (d !== 0) {
    return d;
  }
  d = a.dims.x - b.dims.x;
  if (d !== 0) {
    return d;
  }
  return 0;
}

// let each block determine their bounds and x/y/w/h values
function markdownLayout(param: MarkdownStateCached & MarkdownLayoutParam): void {
  let state = param as MDState;
  let { cache } = state;
  if (cache.layout) {
    return;
  }
  profilerStartFunc();
  let font_style = param.font_style || uiFontStyleNormal();
  let font_styles: FontStylesWithDefault;
  if (param.font_styles) {
    if (param.font_styles.def) {
      font_styles = param.font_styles as FontStylesWithDefault;
    } else {
      font_styles = {
        def: font_style,
        ...param.font_styles,
      };
    }
  } else {
    font_styles = { def: font_style };
  }
  let text_height = param.text_height || uiTextHeight();
  let line_height = param.line_height || text_height;
  let calc_param: MDLayoutCalcParam = {
    w: param.w || 0,
    h: param.h || 0,
    text_height,
    line_height,
    indent: param.indent || 0,
    align: param.align || 0,
    font: param.font || uiGetFont(),
    font_style,
    font_styles,
    font_style_idx: param.font_style_idx || 'def',
    cursor: {
      line_x0: 0,
      line_y1: 0,
      x: 0,
      y: 0,
    },
  };
  let blocks = cache.parsed;
  assert(blocks);
  let draw_blocks: MDDrawBlock[] = [];
  let maxx = 0;
  let miny = Infinity;
  let maxy = 0;
  for (let ii = 0; ii < blocks.length; ++ii) {
    let arr = blocks[ii].layout(calc_param);
    for (let jj = 0; jj < arr.length; ++jj) {
      let block = arr[jj];
      let dims = block.dims;
      maxx = max(maxx, dims.x + dims.w);
      maxy = max(maxy, dims.y + dims.h);
      miny = min(miny, dims.y);
      draw_blocks.push(block);
    }
  }
  let bottom_pad = max(0, calc_param.cursor.line_y1 - maxy);
  if ((calc_param.align & (ALIGN.HRIGHT | ALIGN.HCENTER)) && draw_blocks.length) {
    // Find rightmost block for every row
    let row_h_est = calc_param.line_height / 2;
    let row_start_idx = 0;
    let last_dims = draw_blocks[0].dims;
    for (let ii = 1; ii < draw_blocks.length + 1; ++ii) {
      let is_last = ii === draw_blocks.length;
      let do_wrap = is_last;
      if (!is_last) {
        let dims = draw_blocks[ii].dims;
        let ymid = dims.y + dims.h / 2;
        if (ymid > last_dims.y + last_dims.h / 2 + row_h_est &&
          dims.x < last_dims.x + last_dims.w / 2
        ) {
          do_wrap = true;
        }
      }
      if (do_wrap) {
        // detected a wrap, do alignment
        let xoffs = calc_param.w - (last_dims.x + last_dims.w);
        if (calc_param.align & ALIGN.HCENTER) {
          xoffs *= 0.5;
          if (calc_param.font.integral) {
            xoffs = floor(xoffs);
          }
        }
        if (xoffs > 0) {
          for (let jj = row_start_idx; jj < ii; ++jj) {
            let block = draw_blocks[jj];
            block.dims.x += xoffs;
          }
        }
        row_start_idx = ii;
      }
      if (!is_last) {
        last_dims = draw_blocks[ii].dims;
      }
    }
  }
  if ((calc_param.align & ALIGN.HFIT) && maxx > calc_param.w + EPSILON) {
    // Note: this will only get hit for HFIT w/out HWRAP - the combo case should be covered in markdownLayoutFit
    let xscale = calc_param.w / maxx;
    for (let ii = 0; ii < draw_blocks.length; ++ii) {
      let block = draw_blocks[ii];
      let x0 = block.dims.x;
      let x1 = x0 + block.dims.w;
      block.dims.x = x0 * xscale;
      block.dims.w = (x1 - x0) * xscale;
    }
  }
  if (draw_blocks.length && (calc_param.align & (ALIGN.VCENTER | ALIGN.VBOTTOM))) {
    if (verify(calc_param.h)) {
      let yoffs = calc_param.h - maxy;
      if (calc_param.align & ALIGN.VCENTER) {
        yoffs -= miny;
        yoffs *= 0.5;
        if (calc_param.font.integral) {
          yoffs = floor(yoffs);
        }
      }
      for (let ii = 0; ii < draw_blocks.length; ++ii) {
        let block = draw_blocks[ii];
        block.dims.y += yoffs;
      }
    }
  }
  maxx = 0;
  maxy = 0;
  let max_block_h = 0;
  for (let ii = 0; ii < draw_blocks.length; ++ii) {
    let block = draw_blocks[ii];
    maxx = max(maxx, block.dims.x + block.dims.w);
    maxy = max(maxy, block.dims.y + block.dims.h);
    max_block_h = max(max_block_h, block.dims.h);
  }
  maxy += bottom_pad;
  draw_blocks.sort(cmpDimsY);
  cache.layout = {
    blocks: draw_blocks,
    dims: {
      w: maxx,
      h: maxy,
    },
    max_block_h,
  };
  profilerStopFunc();
}

// Probably no reason to ever do parse & layout separately, so combine into one external call
// In theory, could allow invalidating just the layout cache though!
export type MarkdownPrepParam = MarkdownStateCached & MarkdownParseParam & MarkdownLayoutParam;
export function markdownPrep(param: MarkdownPrepParam): void {
  markdownParse(param);
  markdownLayout(param);
}

export type MarkdownDims = {
  w: number;
  h: number;
};
export function markdownDims(param: MarkdownStateCached): MarkdownDims {
  let state = param as MDState;
  let { cache } = state;
  let { layout } = cache;
  assert(layout);
  return layout.dims;
}

// Find the index of the first block whose y is after the specified value
function bsearch(blocks: MDDrawBlock[], y: number): number {
  let start = 0;
  let end = blocks.length - 1;

  while (start < end) {
    let mid = floor((start + end) / 2);

    if (blocks[mid].dims.y <= y) {
      // mid is not eligible, exclude it, look later
      start = mid + 1;
    } else {
      // mid is eligible, include it, look earlier
      end = mid;
    }
  }

  return end;
}

export type MarkdownDrawCachedParam = MarkdownStateCached & MarkdownDrawParam;
export function markdownDraw(param: MarkdownDrawCachedParam): void {
  profilerStartFunc();
  let state = param as MDState;
  let { cache } = state;
  let { layout } = cache;
  assert(layout);
  let { x, y, alpha } = param;
  if (alpha === undefined) {
    alpha = 1;
  }
  let draw_param: MDDrawParam = {
    x,
    y,
    z: param.z || Z.UI,
    alpha,
  };
  let { viewport } = param;
  if (!viewport && spriteClipped()) {
    viewport = spriteClippedViewport();
  }
  let { blocks, max_block_h } = layout;
  let idx0 = 0;
  let idx1 = blocks.length - 1;
  if (viewport) {
    // TODO: need to expand viewport (just vertically?) and "draw" any elements
    //   that might receive focus despite being scrolled out of view.
    // Also probably need a little padding for things like dropshadows on
    //   fonts that extend past bounds?
    idx0 = bsearch(blocks, viewport.y - y - max_block_h);
    idx1 = bsearch(blocks, viewport.y + viewport.h - y);
  }

  let mouse_pos: [number, number];
  if (engine.defines.MD) {
    mouse_pos = mousePos();
  }

  for (let ii = idx0; ii <= idx1; ++ii) {
    let block = blocks[ii];
    let { dims } = block;
    if (!viewport || (
      // exact viewport check (in case block h is smaller than max_block_h)
      x + dims.x + dims.w >= viewport.x && x + dims.x < viewport.x + viewport.w &&
      y + dims.y + dims.h >= viewport.y && y + dims.y < viewport.y + viewport.h
    )) {
      block.draw(draw_param);

      if (engine.defines.MD) {
        let rect = {
          x: draw_param.x + dims.x,
          y: draw_param.y + dims.y,
          z: Z.TOOLTIP,
          w: dims.w, h: dims.h,
          color: debug_color,
        };
        // mouseOver, but ignoring anything capturing it
        if (mouse_pos![0] >= rect.x && mouse_pos![0] <= rect.x + rect.w &&
          mouse_pos![1] >= rect.y && mouse_pos![1] <= rect.y + rect.h
        ) {
          let clip_pause = spriteClipped();
          if (clip_pause) {
            spriteClipPause();
          }
          drawRect2(rect);
          if (clip_pause) {
            spriteClipResume();
          }
        }
      }

    }
  }
  profilerStopFunc();
}

type MarkdownAutoParamBase = MarkdownStateParam & MarkdownParseParam & MarkdownLayoutParam;
type MarkdownAutoParamDraw = MarkdownAutoParamBase & MarkdownDrawParam;
type MarkdownAutoParamNoDraw = MarkdownAutoParamBase & { no_draw: true };
export type MarkdownAutoParam = MarkdownAutoParamDraw | MarkdownAutoParamNoDraw;
function isAutoDrawParam(param: MarkdownAutoParam): param is MarkdownAutoParamDraw {
  return !(param as MarkdownAutoParamNoDraw).no_draw;
}

function mdcAlloc(): MDCache {
  return {};
}

export function markdownAuto(param: MarkdownAutoParam): MarkdownDims {
  profilerStartFunc();
  let state = param as MarkdownStateCached as MDState;
  assert(!param.custom || state.cache); // any advanced parameters require the caller handling the caching
  let auto_cache = !state.cache;
  if (auto_cache) {
    profilerStart('auto_cache');
    // If there's time in here, if the string is long, is primary just the object lookup
    // It can be completely alleviated just by not re-creating the same string each frame, though!
    let text = param.text = getStringFromLocalizable(param.text);
    let cache_key = [
      'mdc',
      param.w || 0,
      param.h || 0,
      param.text_height || uiTextHeight(),
      param.line_height || param.text_height || uiTextHeight(),
      param.indent || 0,
      param.align || 0,
      param.font_style ? fontStyleHash(param.font_style) : 0,
    ].join(':');
    state.cache = getUIElemData(cache_key, { key: text }, mdcAlloc);
    profilerStop();
  }
  let param2 = param as MarkdownAutoParam & MarkdownStateCached;

  markdownPrep(param2);
  let dims = markdownDims(param2);
  if (isAutoDrawParam(param2)) {
    markdownDraw(param2);
  }

  if (auto_cache) {
    delete param.cache;
  }
  profilerStopFunc();
  return dims;
}

export function markdownLabel(param: MarkdownAutoParam & LabelBaseOptions): MarkdownDims {
  let { tooltip } = param;
  let dims = markdownAuto(param);
  if (tooltip) {
    let {
      align,
      x,
      y,
      z,
      tooltip_above,
      tooltip_right,
    } = param;
    z = z || Z.UI;
    align = align || 0;
    let w = param.w || dims.w;
    let h = param.h || dims.h;
    let spot_ret = spot({
      x, y,
      w, h,
      tooltip: tooltip,
      tooltip_width: param.tooltip_width,
      tooltip_above,
      tooltip_right: Boolean(tooltip_right || align & ALIGN.HRIGHT),
      tooltip_center: Boolean(align & ALIGN.HCENTER),
      def: SPOT_DEFAULT_LABEL,
    });
    if (spot_ret.focused && spotPadMode()) {
      // No focused style support yet, do a generic glow instead?
      drawElipse(x - w*0.25, y-h*0.25, x + w*1.25, y + h*1.25, z - 0.001, 0.5, unit_vec);
    }
  }
  return dims;
}
