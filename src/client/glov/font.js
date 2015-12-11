// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT
/* eslint no-bitwise:off, complexity:off, no-shadow:off */

const assert = require('assert');
const camera2d = require('./camera2d.js');
const { floor, max, round } = Math;
// const settings = require('./settings.js');
const shaders = require('./shaders.js');
const sprites = require('./sprites.js');
const textures = require('./textures.js');
const { clamp } = require('../../common/util.js');
const { vec4, v4clone, v4scale } = require('./vmath.js');

/*

font_style = glov_font.style(null, {
  color: 0xFFFFFFff,
  outline_width: 0,
  outline_color: 0x00000000,
  glow_xoffs: 0,
  glow_yoffs: 0,
  glow_inner: 0,
  glow_outer: 0,
  glow_color: 0x000000ff,
});

 */

// typedef struct FontCharInfo {
//   int c;
//   float x0;
//   float y0;
//   int w;
//   int h;
//   int imgIdx;
// } FontCharInfo;

// typedef struct FontInfo {
//   AS_NAME(CharInfo) FontCharInfo **char_infos;
//   int font_size;
//   float x0;
//   float y0;
//   int imageW;
//   int imageH;
//   int spread;
// } FontInfo;

export const COLOR_MODE = {
  SINGLE: 0,
  GRADIENT: 1,
};

export const ALIGN = {
  HLEFT: 0,
  HCENTER: 1,
  HRIGHT: 2,
  HMASK: 3,

  VTOP: 0 << 2,
  VCENTER: 1 << 2,
  VBOTTOM: 2 << 2,
  VMASK: 3 << 2,

  HFIT: 1 << 4,
  HWRAP: 1 << 5, // only for glovMarkup*, not drawSizedAligned below, use drawSizedWrapped below instead

  HCENTERFIT: 1 | (1 << 4),
  HVCENTER: 1 | (1 << 2), // to avoid doing bitwise ops elsewhere
  HVCENTERFIT: 1 | (1 << 2) | (1 << 4), // to avoid doing bitwise ops elsewhere
};


// typedef struct GlovFontStyle
// {
//   // These members will never be changed (safe to initialize with GlovFontStyle foo = {1.0, 0xfff, etc};
//   float outline_width;
//   U32 outline_color;
//   // Glow: can be used for a dropshadow as well
//   //   inner can be negative to have the glow be less opaque (can also just change the alpha of the glow color)
//   //   a glow would be e.g. (0, 0, -1, 5)
//   //   a dropshadow would be e.g. (3.25, 3.25, -2.5, 5)
//   float glow_xoffs;
//   float glow_yoffs;
//   float glow_inner;
//   float glow_outer;
//   U32 glow_color;
//   U32 color; // upper left, or single color
//   U32 colorUR; // upper right
//   U32 colorLR; // lower right
//   U32 colorLL; // lower left
//   GlovFontColorMode color_mode;
// } GlovFontStyle;

/* Default GlovFontStyle:
  font_style = {
    outline_width: 0, outline_color: 0x00000000,
    glow_xoffs: 0, glow_yoffs: 0, glow_inner: 0, glow_outer: 0, glow_color: 0x00000000,
    color: 0xFFFFFFff
  };

  font_style = {
    outline_width: 0, outline_color: 0x00000000,
    glow_xoffs: 0, glow_yoffs: 0, glow_inner: 0, glow_outer: 0, glow_color: 0x00000000,
    // Color gradient: UL, UR, LR, LL
    color: 0xFFFFFFff, colorUR: 0xFFFFFFff, colorLR: 0x000000ff, colorLL: 0x000000ff,
    color_mode: glov_font.COLOR_MODE.GRADIENT,
  };
*/

function GlovFontStyle() {
  this.color_vec4 = vec4(1,1,1,1); // Matches GlovFontStyle.prototype.color below
}
GlovFontStyle.prototype.outline_width = 0;
GlovFontStyle.prototype.outline_color = 0x00000000;
GlovFontStyle.prototype.glow_xoffs = 0;
GlovFontStyle.prototype.glow_yoffs = 0;
GlovFontStyle.prototype.glow_inner = 0;
GlovFontStyle.prototype.glow_outer = 0;
GlovFontStyle.prototype.glow_color = 0x00000000;
GlovFontStyle.prototype.color = 0xFFFFFFff;
GlovFontStyle.prototype.colorUR = 0;
GlovFontStyle.prototype.colorLR = 0;
GlovFontStyle.prototype.colorLL = 0;
GlovFontStyle.prototype.color_mode = COLOR_MODE.SINGLE;

export const font_shaders = {};

export function intColorFromVec4Color(v) {
  return ((v[0] * 255 | 0) << 24) |
    ((v[1] * 255 | 0) << 16) |
    ((v[2] * 255 | 0) << 8) |
    ((v[3] * 255 | 0));
}

export function vec4ColorFromIntColor(v, c) {
  v[0] = ((c >> 24) & 0xFF) / 255;
  v[1] = ((c >> 16) & 0xFF) / 255;
  v[2] = ((c >> 8) & 0xFF) / 255;
  v[3] = (c & 0xFF) / 255;
}

export const glov_font_default_style = new GlovFontStyle();

export function style(font_style, fields) {
  let ret = new GlovFontStyle();
  let { color_vec4 } = ret;
  if (font_style) {
    for (let f in font_style) {
      ret[f] = font_style[f];
    }
  }
  for (let f in fields) {
    ret[f] = fields[f];
  }
  ret.color_vec4 = color_vec4; // Restore
  vec4ColorFromIntColor(ret.color_vec4, ret.color);
  return ret;
}

export function styleColored(font_style, color) {
  return style(font_style, {
    color
  });
}

function colorAlpha(color, alpha) {
  alpha = clamp(round((color & 0xFF) * alpha), 0, 255);
  return color & 0xFFFFFF00 | alpha;
}

export function styleAlpha(font_style, alpha) {
  return style(font_style, {
    color: colorAlpha((font_style || glov_font_default_style).color, alpha),
    outline_color: colorAlpha((font_style || glov_font_default_style).outline_color, alpha),
    glow_color: colorAlpha((font_style || glov_font_default_style).glow_color, alpha),
  });
}

let tech_params = null;
let tech_params_dirty = false;
let temp_color = null;

function createTechniqueParameters() {
  if (tech_params) {
    return;
  }

  tech_params = {
    param0: vec4(),
    outlineColor: vec4(),
    glowColor: vec4(),
    glowParams: vec4(),
    tex0: null
  };
  if (!temp_color) {
    temp_color = vec4();
  }
}

function techParamsSet(param, value) {
  let tpv = tech_params[param];
  // not dirty, if anything changes, we need a new object!
  if (!tech_params_dirty) {
    if (tpv[0] !== value[0] || tpv[1] !== value[1] || tpv[2] !== value[2] || tpv[3] !== value[3]) {
      // clone
      tech_params = {
        param0: v4clone(tech_params.param0),
        outlineColor: v4clone(tech_params.outlineColor),
        glowColor: v4clone(tech_params.glowColor),
        glowParams: v4clone(tech_params.glowParams),
      };
      tech_params_dirty = true;
      tpv = tech_params[param];
    } else {
      // identical, do nothing
      return;
    }
  }
  if (tech_params_dirty) {
    // just set
    tpv[0] = value[0];
    tpv[1] = value[1];
    tpv[2] = value[2];
    tpv[3] = value[3];
    // return;
  }
}

function techParamsGet() {
  tech_params_dirty = false;
  return tech_params;
}

function GlovFont(font_info, texture_name) {
  assert(font_info.font_size !== 0); // Got lost somewhere

  this.texture = textures.load({
    url: `img/${texture_name}.png`,
    filter_min: font_info.noFilter ? gl.NEAREST : gl.LINEAR,
    filter_mag: font_info.noFilter ? gl.NEAREST : gl.LINEAR,
    wrap_s: gl.CLAMP_TO_EDGE,
    wrap_t: gl.CLAMP_TO_EDGE,
  });
  this.textures = [this.texture];

  this.font_info = font_info;
  this.shader = font_shaders.font_aa;
  this.tex_w = font_info.imageW;
  this.tex_h = font_info.imageH;

  // Calculate inverse scale, fixup 0s
  for (let ii = 0; ii < font_info.char_infos.length; ++ii) {
    let char_info = font_info.char_infos[ii];
    char_info.scale = 1 / (char_info.sc || 1);
    char_info.w = char_info.w || 0;
  }

  // build lookup
  this.char_infos = [];
  for (let ii = 0; ii < font_info.char_infos.length; ++ii) {
    let char_info = font_info.char_infos[ii];
    this.char_infos[font_info.char_infos[ii].c] = char_info;
    char_info.xpad = char_info.xpad || 0;
    char_info.yoffs = char_info.yoffs || 0;
  }
  this.replacement_character = this.infoFromChar(0xFFFD);
  if (!this.replacement_character) {
    this.replacement_character = this.infoFromChar(63); // '?'
  }

  this.default_style = new GlovFontStyle();
  this.applied_style = new GlovFontStyle();

  createTechniqueParameters();
}

// General draw functions return width
// Pass NULL for style to use default style
// If the function takes a color, this overrides the color on the style
GlovFont.prototype.drawSizedColor = function (style, x, y, z, size, color, text) {
  return this.drawSized(styleColored(style, color), x, y, z, size, text);
};
GlovFont.prototype.drawSized = function (style, x, y, z, size, text) {
  return this.drawScaled(style, x, y, z, size / this.font_info.font_size, size / this.font_info.font_size, text);
};

GlovFont.prototype.drawSizedAligned = function (style, _x, _y, z, size, align, w, h, text) {
  let x_size = size;
  let y_size = size;
  let width = this.getStringWidth(style, x_size, text);
  if ((align & ALIGN.HFIT) && width > w) {
    let scale = w / width;
    x_size *= scale;
    width = w;
    // Additionally, if we're really squishing things horizontally, shrink the font size
    // and offset to be centered.
    if (scale < 0.5) {
      if ((align & ALIGN.VMASK) !== ALIGN.VCENTER && (align & ALIGN.VMASK) !== ALIGN.VBOTTOM) {
        // Offset to be roughly centered in the original line bounds
        _y += (y_size - (y_size * scale * 2)) / 2;
      }
      y_size *= scale * 2;
    }
  }
  let height = y_size;
  let x;
  let y;
  switch (align & ALIGN.HMASK) {
    case ALIGN.HCENTER:
      x = _x + (w - width) / 2;
      if (this.font_info.noFilter) {
        x |= 0; // ensure integral
      }
      break;
    case ALIGN.HRIGHT:
      x = _x + w - width;
      break;
    case ALIGN.HLEFT:
      x = _x;
      break;
    default:
      x = _x;
  }
  switch (align & ALIGN.VMASK) {
    case ALIGN.VCENTER:
      y = _y + (h - height) / 2;
      if (this.font_info.noFilter) {
        y |= 0; // ensure integral
      }
      break;
    case ALIGN.VBOTTOM:
      y = _y + h - height;
      break;
    case ALIGN.VTOP:
      y = _y;
      break;
    default:
      y = _y;
  }

  return this.drawScaled(style, x, y, z, x_size / this.font_info.font_size, y_size / this.font_info.font_size, text);
};

// returns height
GlovFont.prototype.drawSizedColorWrapped = function (style, x, y, z, w, indent, size, color, text) {
  return this.drawScaledWrapped(styleColored(style, color), x, y, z, w,
    indent, size / this.font_info.font_size, size / this.font_info.font_size, text);
};
GlovFont.prototype.drawSizedWrapped = function (style, x, y, z, w, indent, size, text) {
  return this.drawScaledWrapped(style, x, y, z, w,
    indent, size / this.font_info.font_size, size / this.font_info.font_size, text);
};

GlovFont.prototype.wrapLines = function (w, indent, size, text, word_cb /*(x, int linenum, const char *word)*/) {
  return this.wrapLinesScaled(w, indent, size / this.font_info.font_size, text, word_cb);
};

GlovFont.prototype.numLines = function (style, w, indent, size, text) {
  this.applyStyle(style);
  let numlines = 0;
  function wordCallback(ignored, linenum, word) {
    numlines = max(numlines, linenum);
  }
  this.wrapLines(w, indent, size, text, wordCallback);
  return numlines + 1;
};

GlovFont.prototype.infoFromChar = function (c) {
  let ret = this.char_infos[c];
  if (ret) {
    return ret;
  }
  if (c > 127) {
    // no char info, and non-ascii, non-control code
    return this.replacement_character;
  }
  return null;
};

GlovFont.prototype.getCharacterWidth = function (style, x_size, c) {
  assert.equal(typeof c, 'number');
  this.applyStyle(style);
  let char_info = this.infoFromChar(c);
  let xsc = x_size / this.font_info.font_size;
  let x_advance = this.calcXAdvance(xsc);
  if (char_info) {
    return (char_info.w + char_info.xpad) * xsc * char_info.scale + x_advance;
  }
  return 0;
};

GlovFont.prototype.getStringWidth = function (style, x_size, text) {
  this.applyStyle(style);
  let ret=0;
  let xsc = x_size / this.font_info.font_size;
  let x_advance = this.calcXAdvance(xsc);
  for (let ii = 0; ii < text.length; ++ii) {
    let c = text.charCodeAt(ii);
    let char_info = this.infoFromChar(c);
    if (!char_info) {
      char_info = this.infoFromChar(13);
    }
    if (char_info) {
      ret += (char_info.w + char_info.xpad) * xsc * char_info.scale + x_advance;
    }
  }
  return ret;
};

// word_cb(x, int linenum, const char *word)
GlovFont.prototype.wrapLinesScaled = function (w, indent, xsc, text, word_cb) {
  let len = text.length;
  let s = 0;
  let word_start = 0;
  let word_x0 = 0;
  let x = word_x0;
  let linenum = 0;
  let space_info = this.infoFromChar(32); // ' '
  let space_size = (space_info ? space_info.w + space_info.xpad : this.font_info.font_size) * xsc;
  let hard_wrap = false;
  let x_advance = this.calcXAdvance(xsc);

  do {
    let c = s < len ? text.charCodeAt(s) || 0xFFFD : 0;
    let newx = x;
    let char_w;
    let char_info = this.infoFromChar(c);
    if (!char_info) {
      char_info = this.infoFromChar(10);
    }
    if (char_info) {
      char_w = (char_info.w + char_info.xpad) * xsc * char_info.scale + x_advance;
      newx = x + char_w;
    }
    if (newx >= w && hard_wrap) {
      // flush the word so far!
      if (word_cb) {
        word_cb(word_x0, linenum, text.slice(word_start, s));
      }
      word_start = s;
      word_x0 = indent;
      x = word_x0 + char_w;
      linenum++;
    } else {
      x = newx;
    }
    if (!(c === 32 /*' '*/ || c === 0 || c === 10 /*'\n'*/ || c === 9)) {
      s++;
      c = s < len ? text.charCodeAt(s) || 0xFFFD : 0;
    }
    if (c === 32 /*' '*/ || c === 0 || c === 10 /*'\n'*/ || c === 9) {
      hard_wrap = false;
      // draw word until s
      if (x > w) {
        // maybe wrap
        let word_width = x - word_x0;
        if (word_width > w - indent) {
          // not going to fit, split it up!
          hard_wrap = true;
          // recover and restart at word start
          s = word_start;
          x = word_x0;
          continue;
        } else {
          word_x0 = indent;
          x = word_x0 + word_width;
          linenum++;
        }
      }
      if (word_cb) {
        word_cb(word_x0, linenum, text.slice(word_start, s));
      }
      word_start = s+1;
      if (c === 10 /*'\n'*/) {
        x = indent;
        linenum++;
      } else if (c === 9 /*'\t'*/) {
        let tabsize = xsc * this.font_info.font_size * 2;
        x = (floor(x / tabsize) + 1) * tabsize;
      } else {
        x += space_size;
      }
      word_x0 = x;
      if (c === 32 /*' '*/ || c === 10 /*'\n'*/ || c === 9) {
        s++; // advance past space
      }
    }
  } while (s < len);
  ++linenum;
  return linenum;
};

GlovFont.prototype.drawScaledWrapped = function (style, x, y, z, w, indent, xsc, ysc, text) {
  if (text === null || text === undefined) {
    text = '(null)';
  }
  this.applyStyle(style);
  this.last_width = 0;
  let num_lines = this.wrapLinesScaled(w, indent, xsc, text, (xoffs, linenum, word) => {
    let y2 = y + this.font_info.font_size * ysc * linenum;
    let x2 = x + xoffs;
    let word_w = this.drawScaled(style, x2, y2, z, xsc, ysc, word);
    this.last_width = max(this.last_width, xoffs + word_w);
  });
  return num_lines * this.font_info.font_size * ysc;
};

GlovFont.prototype.calcXAdvance = function (xsc) {
  // Assume called: applyStyle(style);

  // scale all supplied values by this so that if we swap in a font with twice the resolution (and twice the spread)
  //   things look almost identical, just crisper
  let font_texel_scale = this.font_info.font_size / 32;
  // As a compromise, -2 bias here seems to work well
  let x_advance = xsc * font_texel_scale * max(this.applied_style.outline_width - 2, 0);
  // As a compromise, there's a -3 bias in there, so it only kicks in under extreme circumstances
  x_advance = max(x_advance, xsc * font_texel_scale *
    max(this.applied_style.glow_outer - this.applied_style.glow_xoffs - 3, 0));
  return x_advance;
};

//////////////////////////////////////////////////////////////////////////
// Main implementation

GlovFont.prototype.drawScaled = function (style, _x, y, z, xsc, ysc, text) {
  let x = _x;
  assert(isFinite(x));
  assert(isFinite(y));
  assert(isFinite(z));
  let font_info = this.font_info;
  // Debug: show expect area of glyphs
  // require('./ui.js').drawRect(_x, y,
  //   _x + xsc * font_info.font_size * 20, y + ysc * font_info.font_size,
  //   1000, [1, 0, 1, 0.5]);
  y += (font_info.y_offset || 0) * ysc;
  let texs = this.textures;
  if (text === null || text === undefined) {
    text = '(null)';
  }
  const len = text.length;
  if (xsc === 0 || ysc === 0) {
    return 0;
  }

  this.applyStyle(style);

  const avg_scale_font = (xsc + ysc) * 0.5;
  const camera_xscale = camera2d.data[4];
  const camera_yscale = camera2d.data[5];
  let avg_scale_combined = (xsc * camera_xscale + ysc * camera_yscale) * 0.5;
  // Not doing this here, because render_scale_all is not currently reflected in camera_x/yscale
  // avg_scale_combined *= settings.render_scale_all;

  // scale all supplied values by this so that if we swap in a font with twice the resolution (and twice the spread)
  //   things look almost identical, just crisper
  let x_advance = this.calcXAdvance(xsc);
  let font_texel_scale = font_info.font_size / 32;
  let tile_state = 0;

  let applied_style = this.applied_style;

  // Calculate anti-aliasing values
  let delta_per_source_pixel = 0.5 / font_info.spread;
  let delta_per_dest_pixel = delta_per_source_pixel / avg_scale_combined;
  let value = vec4(
    1 / delta_per_dest_pixel, // AA Mult and Outline Mult
    -0.5 / delta_per_dest_pixel + 0.5, // AA Add
    // Outline Add
    -0.5 / delta_per_dest_pixel + 0.5 + applied_style.outline_width*font_texel_scale*avg_scale_combined,
    0, // Unused
  );
  if (value[2] > 0) {
    value[2] = 0;
  }
  let padding1 = max(0, applied_style.outline_width*font_texel_scale*avg_scale_font);
  let padding4 = vec4();
  const outer_scaled = applied_style.glow_outer*font_texel_scale;
  padding4[0] = max(outer_scaled*xsc - applied_style.glow_xoffs*font_texel_scale*xsc, padding1);
  padding4[2] = max(outer_scaled*xsc + applied_style.glow_xoffs*font_texel_scale*xsc, padding1);
  padding4[1] = max(outer_scaled*ysc - applied_style.glow_yoffs*font_texel_scale*ysc, padding1);
  padding4[3] = max(outer_scaled*ysc + applied_style.glow_yoffs*font_texel_scale*ysc, padding1);

  techParamsSet('param0', value);
  let value2 = vec4(
    0, // filled later
    0, // filled later
    // Glow mult
    1 / ((applied_style.glow_outer - applied_style.glow_inner) * delta_per_source_pixel * font_texel_scale),
    -(0.5 - applied_style.glow_outer * delta_per_source_pixel * font_texel_scale) / ((applied_style.glow_outer -
      applied_style.glow_inner) * delta_per_source_pixel * font_texel_scale)
  );
  if (value2[3] > 0) {
    value2[3] = 0;
  }

  let padding_in_font_space = vec4();
  v4scale(padding_in_font_space, padding4, 1 / avg_scale_font);
  for (let ii = 0; ii < 4; ++ii) {
    if (padding_in_font_space[ii] > font_info.spread) {
      // Not enough buffer
      let sc = font_info.spread / padding_in_font_space[ii];
      padding4[ii] *= sc;
      padding_in_font_space[ii] *= sc;
    }
  }

  // Choose appropriate z advance so that character are drawn left to right (or RTL if the glow is on the other side)
  const z_advance = applied_style.glow_xoffs < 0 ? -0.0001 : 0.0001;


  // For non-1:1 aspect ration rendering, need to scale our coordinates' padding differently in each axis
  let rel_x_scale = xsc / avg_scale_font;
  let rel_y_scale = ysc / avg_scale_font;

  for (let i=0; i<len; i++) {
    const c = text.charCodeAt(i);
    if (c === 9) { // '\t'.charCodeAt(0)) {
      let tabsize = xsc * font_info.font_size * 4;
      x = ((((x - _x) / tabsize) | 0) + 1) * tabsize + _x;
    } else {
      let char_info = this.infoFromChar(c);
      if (!char_info) {
        char_info = this.infoFromChar(13);
      }
      if (char_info) {
        let char_scale = char_info.scale;
        let xsc2 = xsc * char_scale;
        if (char_info.w) {
          let ysc2 = ysc * char_scale;
          let pad_scale = 1 / char_scale;
          let tile_width = this.tex_w;
          let tile_height = this.tex_h;
          // Lazy update params here
          if (char_scale !== tile_state) {
            value2[0] = -applied_style.glow_xoffs * font_texel_scale * pad_scale / tile_width;
            value2[1] = -applied_style.glow_yoffs * font_texel_scale * pad_scale / tile_height;
            techParamsSet('glowParams', value2);
          }

          let u0 = (char_info.x0 - padding_in_font_space[0] * pad_scale) / tile_width;
          let u1 = (char_info.x0 + char_info.w + padding_in_font_space[2] * pad_scale) / tile_width;
          let v0 = (char_info.y0 - padding_in_font_space[1] * pad_scale) / tile_height;
          let v1 = (char_info.y0 + char_info.h + padding_in_font_space[3] * pad_scale) / tile_height;

          let w = char_info.w * xsc2 + (padding4[0] + padding4[2]) * rel_x_scale;
          let h = char_info.h * ysc2 + (padding4[1] + padding4[3]) * rel_y_scale;

          sprites.queueraw(
            texs,
            x - rel_x_scale * padding4[0], y - rel_y_scale * padding4[2] + char_info.yoffs * ysc2,
            z + z_advance * i, w, h,
            u0, v0, u1, v1,
            applied_style.color_vec4,
            this.shader, techParamsGet());

          // require('./ui.js').drawRect(x - rel_x_scale * padding4[0],
          //   y - rel_y_scale * padding4[2] + char_info.yoffs * ysc2,
          //   w + x - rel_x_scale * padding4[0],
          //   h + y - rel_y_scale * padding4[2] + char_info.yoffs * ysc2,
          //   1000, [i & 1, (i & 2)>>1, (i & 4)>>2, 0.5]);
        }

        x += (char_info.w + char_info.xpad) * xsc2 + x_advance;
      }
    }
  }
  return x - _x;
};

GlovFont.prototype.determineShader = function () {
  let outline = this.applied_style.outline_width && (this.applied_style.outline_color & 0xff);
  let glow = this.applied_style.glow_outer > 0 && (this.applied_style.glow_color & 0xff);
  if (outline) {
    if (glow) {
      this.shader = font_shaders.font_aa_outline_glow;
    } else {
      this.shader = font_shaders.font_aa_outline;
    }
  } else if (glow) {
    this.shader = font_shaders.font_aa_glow;
  } else {
    this.shader = font_shaders.font_aa;
  }
};

GlovFont.prototype.applyStyle = function (style) {
  if (!style) {
    style = this.default_style;
  }
  // outline
  vec4ColorFromIntColor(temp_color, style.outline_color);
  techParamsSet('outlineColor', temp_color);

  // glow
  vec4ColorFromIntColor(temp_color, style.glow_color);
  techParamsSet('glowColor', temp_color);

  // everything else
  this.applied_style.outline_width = style.outline_width;
  this.applied_style.outline_color = style.outline_color;
  this.applied_style.glow_xoffs = style.glow_xoffs;
  this.applied_style.glow_yoffs = style.glow_yoffs;
  this.applied_style.glow_inner = style.glow_inner;
  this.applied_style.glow_outer = style.glow_outer;
  this.applied_style.glow_color = style.glow_color;
  this.applied_style.color = style.color;
  this.applied_style.color_vec4 = style.color_vec4;
  this.applied_style.colorUR = style.colorUR;
  this.applied_style.colorLR = style.colorLR;
  this.applied_style.colorLL = style.colorLL;
  this.applied_style.color_mode = style.color_mode;

  if (this.applied_style.color_mode === COLOR_MODE.SINGLE) {
    this.applied_style.colorUR = this.applied_style.colorLL = this.applied_style.colorLR = this.applied_style.color;
  }

  this.determineShader();
};

// Replicate constants and utility functions on all font instances as well
GlovFont.prototype.COLOR_MODE = COLOR_MODE;
GlovFont.prototype.ALIGN = ALIGN;
GlovFont.prototype.style = style;
GlovFont.prototype.styleAlpha = styleAlpha;
GlovFont.prototype.styleColored = styleColored;

function fontShadersInit() {
  if (font_shaders.font_aa) {
    return;
  }
  font_shaders.font_aa = shaders.create('glov/shaders/font_aa.fp');
  font_shaders.font_aa_glow = shaders.create('glov/shaders/font_aa_glow.fp');
  font_shaders.font_aa_outline = shaders.create('glov/shaders/font_aa_outline.fp');
  font_shaders.font_aa_outline_glow = shaders.create('glov/shaders/font_aa_outline_glow.fp');
}

export function create(font_info, texture_name) {
  fontShadersInit();
  return new GlovFont(font_info, texture_name);
}
