// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT
/*eslint no-bitwise:off */

const glov_engine = require('./engine.js');
const glov_font = require('./font.js');
const glov_ui = require('./ui.js');
const glov_input = require('./input.js');

window.Z = window.Z || {};
Z.BACKGROUND = Z.BACKGROUND || 1;

const { KEYS } = glov_input;
const { abs, floor, max, min } = Math;
const { clamp, vec4 } = require('./vmath.js');

const mode_regex1 = /^((?:\d+;)*\d+m)/u;
const mode_regex2 = /(\d+)[;m]/gu;
const ESC = '\u001b';
const ansi_to_unicode = [
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,199,252,233,226,228,224,229,231,234,235,232,239,238,236,
  196,197,201,230,198,244,246,242,251,249,255,214,220,162,163,165,8359,402,225,
  237,243,250,241,209,170,186,191,8976,172,189,188,161,171,187,9617,9618,9619,
  9474,9508,9569,9570,9558,9557,9571,9553,9559,9565,9564,9563,9488,9492,9524,
  9516,9500,9472,9532,9566,9567,9562,9556,9577,9574,9568,9552,9580,9575,9576,
  9572,9573,9561,9560,9554,9555,9579,9578,9496,9484,9608,9604,9612,9616,9600,
  945,223,915,960,931,963,181,964,934,920,937,948,8734,966,949,8745,8801,177,
  8805,8804,8992,8993,247,8776,176,8729,183,8730,8319,178,9632,160
];

const MOD_CH = 1;
const MOD_SCROLL = 2;
const MOD_CLEAR = 3;
const MOD_CLEAREOL = 4;

const ansi_to_vga = [
  0, // black
  4, // red
  2, // green
  6, // yellow
  1, // blue
  5, // magenta
  3, // cyan
  7, // white
];

function toch(ch) {
  if (typeof ch === 'string') {
    ch = ch.charCodeAt(0);
  }
  if (typeof ch === 'number') {
    return String.fromCharCode(ansi_to_unicode[ch] || ch);
  } else {
    return String(ch)[0] || ' ';
  }
}
const ATTR = {
  BLINK: 1,
  UNDERLINE: 2, // unimplemented
  REVERSE: 4, // unimplemented
  NUM_BITS: 3,
};

class CharInfo {
  constructor(fg, bg, attr) {
    this.ch = ' ';
    this.fg = fg;
    this.bg = bg;
    this.attr = attr;
  }
}

class GlovTerminal {
  constructor(params) {
    params = params || {};
    this.baud = params.baud || 9600;
    this.frame = 0;
    // screen buffer
    this.w = params.w || 80;
    this.h = params.h || 25;
    // cursor
    this.x = 0;
    this.y = 0;
    this.fg = 7;
    this.bg = 0;
    this.attr = 0;
    this.saved_x = 0;
    this.saved_y = 0;
    this.playback = {
      x: 0,
      y: 0,
      fg: 7,
      bg: 0,
      attr: 0,
    };
    this.mod_head = null;
    this.mod_tail = null;
    this.mod_countdown = 0;

    this.palette = params.palette || [
      vec4(0/64,0/64,0/63,1),
      vec4(0/64,0/64,42/63,1),
      vec4(0/64,42/64,0/63,1),
      vec4(0/64,42/64,42/63,1),
      vec4(42/64,0/64,0/63,1),
      vec4(42/64,0/64,42/63,1),
      vec4(42/64,21/64,0/63,1),
      vec4(42/64,42/64,42/63,1),
      vec4(21/64,21/64,21/63,1),
      vec4(21/64,21/64,63/63,1),
      vec4(21/64,63/64,21/63,1),
      vec4(21/64,63/64,63/63,1),
      vec4(63/64,21/64,21/63,1),
      vec4(63/64,21/64,63/63,1),
      vec4(63/64,63/64,21/63,1),
      vec4(63/64,63/64,63/63,1),
    ];
    this.font_styles = [];
    for (let ii = 0; ii < this.palette.length; ++ii) {
      this.font_styles.push(glov_font.style(null, {
        color: glov_font.intColorFromVec4Color(this.palette[ii]),
      }));
    }
    this.char_height = params.char_height || 16;
    this.char_width = params.char_width || 9;
    this.font = params.font || glov_engine.font;
    this.auto_scroll = true;
    this.buffer = new Array(this.h);
    this.prebuffer = new Array(this.h); // before applying the mods
    for (let ii = 0; ii < this.h; ++ii) {
      this.buffer[ii] = new Array(this.w);
      this.prebuffer[ii] = new Array(this.w);
      for (let jj = 0; jj < this.w; ++jj) {
        this.buffer[ii][jj] = new CharInfo(this.fg, this.bg, this.attr);
        this.prebuffer[ii][jj] = new CharInfo(this.fg, this.bg, this.attr);
      }
    }
  }

  domod(buffer, mod) {
    let mod_playback = buffer === this.buffer;
    switch (mod.type) { // eslint-disable-line default-case
      case MOD_CH:
        buffer[mod.y][mod.x].ch = mod.ch;
        buffer[mod.y][mod.x].attr = mod.attr;
        buffer[mod.y][mod.x].fg = mod.fg;
        buffer[mod.y][mod.x].bg = mod.bg;
        if (mod_playback) {
          this.playback.x = mod.x + 1;
          this.playback.y = mod.y;
        }
        break;
      case MOD_SCROLL: {
        let row = buffer[0];
        buffer.splice(0, 1);
        buffer.push(row);
        for (let ii = 0; ii < row.length; ++ii) {
          row[ii].fg = mod.fg;
          row[ii].bg = mod.bg;
          row[ii].ch = ' ';
          row[ii].attr = 0;
        }
      } break;
      case MOD_CLEAR:
        for (let ii = 0; ii < this.h; ++ii) {
          let line = buffer[ii];
          for (let jj = 0; jj < this.w; ++jj) {
            line[jj].attr = mod.attr;
            line[jj].fg = mod.fg;
            line[jj].bg = mod.bg;
            line[jj].ch = ' ';
          }
        }
        if (mod_playback) {
          this.playback.x = this.playback.y = 0;
        }
        break;
      case MOD_CLEAREOL: {
        let line = buffer[mod.y];
        for (let jj = mod.x; jj < this.w; ++jj) {
          line[jj].ch = ' ';
          line[jj].attr = 0;
          line[jj].fg = mod.fg;
          line[jj].bg = mod.bg;
        }
        if (mod_playback) {
          this.playback.x = this.w;
          this.playback.y = mod.y;
        }
      } break;
    }
    if (mod_playback) {
      if (this.playback.x >= this.w) {
        this.playback.x = 0;
        this.playback.y++;
      }
      if (this.playback.y >= this.h) {
        this.playback.y = this.h - 1;
      }
    }
  }

  mod(type, ch) {
    let mod = {
      type,
      ch,
      x: this.x,
      y: this.y,
      fg: this.fg,
      bg: this.bg,
      attr: this.attr,
    };
    if (type === MOD_CH) {
      let char_info = this.prebuffer[mod.y][mod.x];
      if (char_info.ch === ch &&
        char_info.fg === mod.fg &&
        char_info.bg === mod.bg &&
        char_info.attr === mod.attr
      ) {
        // no change, discard mod
        return;
      }
    }
    this.domod(this.prebuffer, mod);
    if (!this.baud) {
      this.domod(this.buffer, mod);
      return;
    }
    if (this.mod_tail) {
      this.mod_tail.next = mod;
      this.mod_tail = mod;
    } else {
      this.mod_head = this.mod_tail = mod;
    }
  }

  normal() {
    this.color(7, 0);
    this.attr = 0;
  }

  color(fg, bg) {
    if (typeof fg === 'number') {
      this.fg = fg;
    }
    if (typeof bg === 'number') {
      this.bg = bg;
    }
  }

  moveto(x, y) {
    if (typeof x === 'number') {
      this.x = x;
    }
    if (typeof y === 'number') {
      this.y = y;
    }
    this.checkwrap();
  }
  offset(x, y) {
    if (typeof x === 'number') {
      this.x += x;
    }
    if (typeof y === 'number') {
      this.y += y;
    }
    this.checkwrap();
  }
  autoScroll(b) {
    this.auto_scroll = b;
  }
  checkwrap() {
    if (this.x < 0) {
      this.x = 0;
    }
    if (this.x >= this.w) {
      this.x = 0;
      this.y++;
    }
    if (this.y >= this.h) {
      this.y = this.h - 1;
      if (this.auto_scroll) {
        this.mod(MOD_SCROLL);
      }
    }
  }
  cr() {
    this.x = 0;
    this.checkwrap();
  }
  lf() {
    this.y++;
    this.checkwrap();
  }
  crlf() {
    this.x = 0;
    this.y++;
    this.checkwrap();
  }
  clear() {
    this.moveto(0, 0);
    this.mod(MOD_CLEAR);
  }
  cleareol() {
    this.mod(MOD_CLEAREOL);
    this.x = this.w; // probably?
    this.checkwrap();
  }

  print(params) {
    this.moveto(params.x, params.y);
    this.color(params.fg, params.bg);
    let text = params.text || '';
    if (text && !text.length) {
      text = [text];
    }
    if (typeof text === 'string') {
      text = text.split('');
    }
    text = text.map(toch).join('');
    for (let ii = 0; ii < text.length;) {
      let ch = text[ii];
      let handled = false;
      if (ch === ESC && text[ii + 1] === '[') {
        // ANSI escape code
        handled = true;
        let code = text.slice(ii + 2, ii + 12);
        let m;
        if (code.match(/^\?7h/u)) {
          // screen mode, ignore
          ii += 5;
        } else if (code.match(/^2J/u)) {
          // clear screen and home cursor
          this.clear();
          ii += 4;
        } else if (code.match(/^s/u)) {
          // save pos
          this.saved_x = this.x;
          this.saved_y = this.y;
          ii += 3;
        } else if (code.match(/^u/u)) {
          // restore pos
          this.moveto(this.saved_x, this.saved_y);
          ii += 3;
        } else if (code.match(/^K/u)) {
          // clear to EOL
          this.cleareol();
          ii += 3;
        } else if ((m = code.match(/^(\d*)A/u))) {
          // move up
          this.offset(null, -Number(m[1] || '1'));
          ii += m[0].length + 2;
        } else if ((m = code.match(/^(\d*)B/u))) {
          // move down
          this.offset(null, Number(m[1] || '1'));
          ii += m[0].length + 2;
        } else if ((m = code.match(/^(\d*)C/u))) {
          // move right
          this.offset(Number(m[1] || '1'), null);
          ii += m[0].length + 2;
        } else if ((m = code.match(/^(\d*)D/u))) {
          // move left
          this.offset(-Number(m[1] || '1'), null);
          ii += m[0].length + 2;
        } else if ((m = code.match(/^(\d+)(?:;(\d+))?(H|f)/u))) {
          this.moveto(Number(m[2] || '1') - 1, Number(m[1]) - 1);
          ii += m[0].length + 2;
        } else if ((m = code.match(mode_regex1))) {
          let ii_save = ii;
          ii += m[0].length + 2;
          let sub_str = m[1];
          m = mode_regex2.exec(sub_str);
          do {
            let sub_code = Number(m[1]);
            if (sub_code >= 40) {
              this.color(null, ansi_to_vga[sub_code - 40]);
            } else if (sub_code >= 30) {
              this.color(ansi_to_vga[sub_code - 30] + (this.fg >= 8 ? 8 : 0), null);
            } else if (sub_code === 1) {
              if (this.fg < 8) {
                this.fg += 8;
              }
            } else if (sub_code === 0) {
              this.normal();
            } else if (sub_code === 4) {
              this.attr |= ATTR.UNDERLINE;
            } else if (sub_code === 5) {
              this.attr |= ATTR.BLINK;
            } else if (sub_code === 7) {
              this.attr |= ATTR.REVERSE;
            } else {
              // unhandled
              handled = false;
              ii = ii_save;
            }
            m = mode_regex2.exec(sub_str);
          } while (m);
        } else {
          // unhandled, advance past escape and print
          handled = false;
        }
      } else if (ch === '\n') {
        handled = true;
        ++ii;
        this.lf();
      } else if (ch === '\r') {
        handled = true;
        ++ii;
        this.cr();
      }
      if (!handled) {
        if (this.x >= 0 && this.x < this.w && this.y >= 0 && this.y < this.h) {
          this.mod(MOD_CH, ch);
        }
        ++this.x;
        this.checkwrap();
        ++ii;
      }
    }
  }
  fill(params) {
    let x = params.x || 0;
    let y = params.y || 0;
    let w = params.w || this.w;
    let h = params.h || this.h;
    let x0 = clamp(x, 0, this.w);
    let x1 = clamp(x + w, 0, this.w);
    let y0 = clamp(y, 0, this.h);
    let y1 = clamp(y + h, 0, this.h);
    let ch = toch(params.ch || ' ');
    for (let ii = y0; ii < y1; ++ii) {
      this.moveto(x0, ii);
      for (let jj = x0; jj < x1; ++jj) {
        this.mod(MOD_CH, ch);
        this.x++;
      }
    }
  }

  ansiCharsTo(mod) {
    // Adjust attributes
    let count = 0;
    let m = false;
    if (mod.fg !== this.playback.fg) {
      this.playback.fg = mod.fg;
      m = true;
      count += 3;
    }
    if (mod.bg !== this.playback.bg) {
      this.playback.bg = mod.bg;
      m = true;
      count += 3;
    }
    if (mod.attr !== this.playback.attr) {
      m = true;
      let clear = 0;
      let add = 0;
      for (let ii = 0; ii < ATTR.NUM_BITS; ++ii) {
        let bit = (1 << ii);
        if ((this.playback.attr & bit) !== (mod.attr & bit)) {
          if (mod.attr & bit) {
            add++;
          } else {
            clear = 1;
          }
        }
      }
      count += (add + clear) * 2;
    }
    if (m) {
      count += 2;
    }

    switch (mod.type) { // eslint-disable-line default-case
      case MOD_SCROLL:
        // Happens as a result of other actions, instant
        return count;
      case MOD_CLEAR:
        // ESC[2J
        return count + 4;
    }
    // Get to location
    let dx = mod.x - this.playback.x;
    let dy = mod.y - this.playback.y;
    if (dx || dy) {
      let horiz = dx ? (3 + (dx === 1 ? 0 : ((abs(dx) >= 10 ? 2 : 1) + (dx < 0 ? 1 : 0)))) : 0;
      let vert = dy ? (3 + (dy === 1 ? 0 : ((abs(dy) >= 10 ? 2 : 1) + (dy < 0 ? 1 : 0)))) : 0;
      let setpos = 4 + (mod.x ? mod.x > 10 ? 2 : 1 : 0) + (mod.y ? mod.y > 10 ? 2 : 1 : 0);
      count += min(horiz + vert, setpos);
    }
    switch (mod.type) { // eslint-disable-line default-case
      case MOD_CH:
        return count + 1;
      case MOD_CLEAREOL:
        // ESC[K
        return count + 3;
    }
    return count;
  }

  cells(params) {
    let { x, y, ws, hs, header } = params;
    let charset = [
      '│─┌┬┐└┴┘├┼┤',
      '║═╔╦╗╚╩╝╠╬╣',
      '│═╒╤╕╘╧╛╞╪╡',
      '║─╓╥╖╙╨╜╟╫╢',
    ][params.charset || 0];

    // draw top
    let terminal = this;
    function drawHorizLine(base, text_list) {
      let line = [charset[base]];
      if (!Array.isArray(text_list)) {
        text_list = [text_list];
      }
      for (let jj = 0; jj < ws.length; ++jj) {
        let w = ws[jj];
        let text = text_list[jj];
        if (text) {
          let extra = w - text.length;
          let left = floor(extra / 2);
          let right = extra - left;
          for (let kk = 0; kk < left; ++kk) {
            line.push(charset[1]);
          }
          if (params.header_format) {
            line.push(params.header_format);
          }
          line.push(text);
          if (params.header_format) {
            line.push('[0m');
          }
          for (let kk = 0; kk < right; ++kk) {
            line.push(charset[1]);
          }
        } else {
          for (let kk = 0; kk < w; ++kk) {
            line.push(charset[1]);
          }
        }
        if (jj !== ws.length - 1) {
          line.push(charset[base + 1]);
        } else {
          line.push(charset[base + 2]);
        }
      }
      terminal.print({ x, y, text: line.join('') });
      y++;
    }
    drawHorizLine(2, header);
    for (let ii = 0; ii < hs.length; ++ii) {
      // draw rows
      let h = hs[ii];
      for (let jj = 0; jj < h; ++jj) {
        let xx = x + 1;
        this.print({ x, y, text: charset[0] });
        for (let kk = 0; kk < ws.length; ++kk) {
          xx += ws[kk];
          this.print({ x: xx, y, text: charset[0] });
          xx++;
        }
        y++;
      }
      // draw separator
      if (ii !== hs.length - 1) {
        drawHorizLine(8);
      } else {
        drawHorizLine(5);
      }
    }
  }

  menu(params) {
    let { x, y, items } = params;
    let color_sel = params.color_sel || { fg: 15, bg: 8 };
    let color_unsel = params.color_unsel || { fg: 7, bg: 0 };
    let color_execute = params.color_execute || { fg: 8, bg: 0 };
    let pre_sel = params.pre_sel || '■ ';
    let pre_unsel = params.pre_unsel || '  ';
    let menu_key = `${x}_${y}_${items.join()}`;
    if (this.last_menu_frame !== this.frame - 1 || this.last_menu_key !== menu_key) {
      // reset
      this.menu_idx = params.def_idx || 0;
    }
    this.last_menu_frame = this.frame;
    this.last_menu_key = menu_key;

    if (glov_input.keyDownEdge(KEYS.DOWN) || glov_input.keyDownEdge(KEYS.S)) {
      this.menu_idx++;
    }
    if (glov_input.keyDownEdge(KEYS.UP) || glov_input.keyDownEdge(KEYS.W)) {
      this.menu_idx--;
    }
    if (glov_input.keyDownEdge(KEYS.HOME)) {
      this.menu_idx = 0;
    }
    if (glov_input.keyDownEdge(KEYS.END)) {
      this.menu_idx = items.length - 1;
    }

    this.menu_idx = (this.menu_idx + items.length) % items.length;
    let max_w = 0;
    for (let ii = 0; ii < items.length; ++ii) {
      max_w = max(max_w, items[ii].length);
    }
    max_w += pre_sel.length;

    let ret = -1;

    if (glov_input.keyDownEdge(KEYS.SPACE) ||
      glov_input.keyDownEdge(KEYS.ENTER)
    ) {
      ret = this.menu_idx;
    }

    for (let ii = 0; ii < items.length; ++ii) {
      let param = {
        x,
        y: y + ii,
        w: max_w,
        h: 1,
      };
      if (glov_input.click(param)) {
        this.menu_idx = ii;
        ret = ii;
      } else if (glov_input.mouseMoved() && glov_input.mouseOver(param)) {
        this.menu_idx = ii;
      }
      let hotkey = items[ii].match(/\[([A-Z0-9])\]/u);
      if (hotkey && glov_input.keyDownEdge(KEYS.A + hotkey[1].charCodeAt(0) - 'A'.charCodeAt(0))) {
        this.menu_idx = ii;
        ret = ii;
      }
      let selected = ii === this.menu_idx;
      let executing = ii === ret;
      let colors = executing ? color_execute : selected ? color_sel : color_unsel;
      param.fg = colors.fg;
      param.bg = colors.bg;
      param.text = `${selected ? pre_sel : pre_unsel}${items[ii]}`;
      this.print(param);
    }

    this.color(color_unsel.fg, color_unsel.bg);

    return ret;
  }

  render(params) {
    let dt = glov_engine.getFrameDt();
    this.frame++;

    while (dt >= this.mod_countdown && this.mod_head) {
      dt -= this.mod_countdown;
      let mod = this.mod_head;
      this.mod_head = mod.next;
      if (!mod.next) {
        this.mod_tail = null;
      }
      this.domod(this.buffer, mod);
      let next = mod.next;
      if (next) {
        let ms_per_char = 1000 / (this.baud / 10); // 10 bits per byte
        if (!isFinite(ms_per_char)) {
          ms_per_char = 0;
        }
        this.mod_countdown = ms_per_char * this.ansiCharsTo(next);
      } else {
        this.mod_countdown = 0;
      }
    }
    this.mod_countdown = max(0, this.mod_countdown - dt);

    const { w, h, buffer, char_width, char_height, palette } = this;
    const blink = glov_engine.getFrameTimestamp() % 1000 > 500;
    params = params || {};
    let x = params.x || 0;
    let y = params.y || 0;
    let z = params.z || Z.BACKGROUND;
    // Draw foreground text
    for (let ii = 0; ii < h; ++ii) {
      let jj = 0;
      let line = buffer[ii];
      while (jj < w) {
        while (jj < w && line[jj].ch === ' ') {
          ++jj;
        }
        if (jj === w) {
          continue;
        }
        // found first non-empty character
        let jj0 = jj;
        let fg = line[jj].fg;
        let text = [];
        while (jj < w && (line[jj].fg === fg || line[jj].ch === ' ')) {
          let ch = line[jj].ch;
          if (blink && (line[jj].attr & ATTR.BLINK)) {
            ch = ' ';
          }
          text.push(ch);
          ++jj;
        }
        text = text.join('');
        glov_engine.font.drawSized(this.font_styles[fg],
          x + jj0 * char_width, y + ii * char_height, z + 0.5,
          char_height, text);
      }
    }
    // Draw background rects
    // This could be made more efficient when the pattern is like:
    //   ABBA
    //   ABBA
    // Right now it draws 6 rects, could be done in 3
    let box_x0 = 0;
    let box_y0 = 0;
    let last_x;
    let last_y;
    let box_color = buffer[0][0].bg;
    function flush() {
      glov_ui.drawRect(box_x0 * char_width, box_y0 * char_height,
        (last_x + 1) * char_width, (last_y + 1) * char_height, z, palette[box_color]);
      if (box_y0 !== last_y && last_y !== w - 1) {
        // A was draw, draw B:
        // AAABB
        // AAA..
        glov_ui.drawRect(x + (last_x + 1) * char_width, y + box_y0 * char_height,
          x + w * char_width, y + last_y * char_height, z, palette[box_color]);
      }
    }
    for (let ii = 0; ii < h; ++ii) {
      let line = buffer[ii];
      for (let jj = 0; jj < w; ++jj) {
        let color = line[jj].bg;
        if (color !== box_color || box_x0 > jj) {
          flush();
          box_color = color;
          box_x0 = jj;
          box_y0 = ii;
        }
        last_x = jj;
        last_y = ii;
      }
    }
    flush();
  }
}

export function create(params) {
  return new GlovTerminal(params);
}
