import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { TextVisualLimit, WithRequired } from 'glov/common/types';

const { unicode_replacement_chars } = require('glov/common/replacement_chars');

type CharInfoJSON = {
  c: number;
  x0?: number;
  y0?: number;
  xpad?: number;
  yoffs?: number;
  w?: number;
  h?: number;
  sc?: number;
};
type FontInfo = {
  font_size: number;
  imageW: number;
  imageH: number;
  spread: number;
  noFilter: number;
  channels: number;
};
type FontInfoJSON = FontInfo & {
  char_infos: CharInfoJSON[];
};
type CharInfo = WithRequired<CharInfoJSON, 'w' | 'xpad' | 'yoffs'> & {
  scale: number;
  w_pad_scale: number;
};

class ServerFont {
  font_info: FontInfo;
  font_size: number;
  inv_font_size: number;
  char_infos: Partial<Record<number, CharInfo>>;
  replacement_character: CharInfo;
  whitespace_character: CharInfo;
  constructor(font_info: FontInfoJSON) {
    assert(font_info.font_size !== 0); // Got lost somewhere

    this.font_info = font_info as FontInfo;
    this.font_size = font_info.font_size;
    this.inv_font_size = 1 / font_info.font_size;
    // this.tex_w = font_info.imageW;
    // this.tex_h = font_info.imageH;

    // Calculate inverse scale, fixup 0s
    for (let ii = 0; ii < font_info.char_infos.length; ++ii) {
      let char_info = font_info.char_infos[ii] as CharInfo;
      char_info.scale = 1 / (char_info.sc || 1);
      char_info.w = char_info.w || 0;
      char_info.xpad = char_info.xpad || 0;
      char_info.yoffs = char_info.yoffs || 0;
      char_info.w_pad_scale = (char_info.w + char_info.xpad) * char_info.scale;
    }

    // build lookup
    this.char_infos = [];
    for (let ii = 0; ii < font_info.char_infos.length; ++ii) {
      let char_info = font_info.char_infos[ii] as CharInfo;
      this.char_infos[char_info.c] = char_info;
    }
    this.replacement_character = this.infoFromChar(0xFFFD);
    if (!this.replacement_character) {
      this.replacement_character = this.infoFromChar(63); // '?'
    }
    this.whitespace_character = this.infoFromChar(13);
  }

  // Technically can return `undefined` during the constructor, but never after
  infoFromChar(c: number): CharInfo {
    let ret = this.char_infos[c];
    if (ret) {
      return ret;
    }
    if (c >= 9 && c <= 13) { // characters that String.trim() strip
      return this.whitespace_character;
    }
    if (unicode_replacement_chars) {
      let ascii = unicode_replacement_chars[c];
      if (ascii) {
        ret = this.char_infos[ascii];
        if (ret) {
          return ret;
        }
      }
    }
    // no char info, not whitespace, show replacement even if ascii, control code
    return this.replacement_character;
  }

  calcXAdvance(xsc: number): number {
    // Client does logic with styles/outlines/glows here
    return 0;
  }

  getStringWidth(x_size: number, text: string): number {
    let ret=0;
    let xsc = x_size * this.inv_font_size;
    let x_advance = this.calcXAdvance(xsc);
    for (let ii = 0; ii < text.length; ++ii) {
      let c = text.charCodeAt(ii);
      let char_info = this.infoFromChar(c);
      if (char_info) {
        ret += char_info.w_pad_scale * xsc + x_advance;
      }
    }
    return ret;
  }
}


let font: ServerFont;

export function serverFontInit(font_file: string): void {
  let raw_data = fs.readFileSync(path.join(__dirname, `../../client/img/font/${font_file}.json`), 'utf8');
  font = new ServerFont(JSON.parse(raw_data));
}

export function serverFontStringWidth(text: string, font_height: number): number {
  assert(font);
  return font.getStringWidth(font_height, text);
}

export function serverFontValidWidth(text: string, max_visual_size: TextVisualLimit): boolean {
  return font.getStringWidth(max_visual_size.font_height, text) <= max_visual_size.width;
}
