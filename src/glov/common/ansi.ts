const ESC = '\u001b';

export type SFunc = (s: string) => string;
export type AnsiColors = 'black' |
  'red' |
  'green' |
  'yellow' |
  'blue' |
  'magenta' |
  'cyan' |
  'white';
export type SFuncBright = SFunc & { bright: SFunc };

// Convenience functions for generating ANSI strings from named colors
export const ansi = { bg: {} } as (Record<AnsiColors, SFuncBright> & {
  bg: Record<AnsiColors, SFunc>;
  normal: SFunc;
  blink: SFunc;
});
([
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
] as const).forEach(function (color, idx) {
  let fn = function (str: string): string {
    return `${ESC}[${30 + idx}m${str}${ESC}[0m`;
  } as SFuncBright;
  fn.bright = function (str: string): string {
    return `${ESC}[${30 + idx};1m${str}${ESC}[0m`;
  };
  ansi[color] = fn;
  ansi.bg[color] = function (str) {
    return `${ESC}[${40 + idx}m${str}${ESC}[0m`;
  };
});
ansi.normal = function (str) {
  return `${ESC}[0m${str}`;
};
ansi.blink = function (str) {
  return `${ESC}[5m${str}${ESC}[0m`;
};

// eslint-disable-next-line no-control-regex
const strip_ansi = /\u001b\[(?:[0-9;]*)[0-9A-ORZcf-nqry=><]/g;
export function padRight(str: string, width: number): string {
  let len = str.replace(strip_ansi, '').length;
  if (len < width) {
    str += new Array(width - len + 1).join(' ');
  }
  return str;
}

export function padLeft(str: string, width: number): string {
  let len = str.replace(strip_ansi, '').length;
  if (len < width) {
    str = new Array(width - len + 1).join(' ') + str;
  }
  return str;
}

// eslint-disable-next-line no-control-regex
const match_ansi = /^\u001b\[(?:[0-9;]*)[0-9A-ORZcf-nqry=><]/;
// Word wrapping assuming `auto_crlf` and `ignore_newline_after_wrap`
export function wordWrap(text: string, w: number): string {
  let ret = [];
  let idx = 0;
  let line_len = 0;
  let in_control = false;
  let control_ends = 0;
  let line_start = 0;
  let last_word_end = line_start;
  let last_word_end_len = line_len;
  for (; idx < text.length; ++idx) {
    let c = text[idx];
    if (c === '\u001b') {
      let code = text.slice(idx).match(match_ansi);
      if (code) {
        in_control = true;
        control_ends = idx + code[0].length;
      }
    } else if (in_control && idx === control_ends) {
      in_control = false;
    }
    if (!in_control) {
      if (c === '\n') {
        ret.push(text.slice(line_start, idx));
        line_start = idx + 1;
        line_len = 0;
        last_word_end = line_start;
        last_word_end_len = line_len;
      } else {
        if (c === ' ') {
          last_word_end = idx;
          last_word_end_len = line_len;
        }
        ++line_len;
        if (line_len > w) {
          ret.push(text.slice(line_start, last_word_end));
          line_start = last_word_end;
          while (text[line_start] === ' ') {
            ++line_start;
          }
          line_len = line_len - last_word_end_len + 1;
          last_word_end = line_start;
          last_word_end_len = line_len;
        }
      }
    }
  }
  if (text.length !== line_start) {
    ret.push(text.slice(line_start));
  }
  return ret.join('\n');
}
