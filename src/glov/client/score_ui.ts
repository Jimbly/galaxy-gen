import assert from 'assert';
import { clamp, plural } from 'glov/common/util';
import {
  ROVec4,
  unit_vec,
} from 'glov/common/vmath';
import { autoResetEachFrame } from './auto_reset';
import { clipTestRect } from './camera2d';
import { EditBox, editBoxCreate } from './edit_box';
import { debugDefineIsSet, getFrameTimestamp } from './engine';
import {
  ALIGN,
  Font,
  FontStyle,
} from './font';
import {
  FRIEND_CAT_GLOBAL,
  HighScoreListEntry,
  HighScoreListRaw,
  scoreCanUpdatePlayerName,
  scoreFormatName,
  scoreGetPlayerName,
  ScoreSystem,
  scoreUpdatePlayerName,
} from './score';
import {
  ScrollArea,
  scrollAreaCreate,
} from './scroll_area';
import { spriteClipPop, spriteClipPush } from './sprites';
import * as ui from './ui';
import {
  ButtonTextParam,
  getUIElemData,
  uiButtonHeight,
} from './ui';

const { max, min, round } = Math;

export type ColumnDef = {
  name: string;
  width: number;
  align?: number;
  draw?: (param: DrawCellParam) => void;
};

let font: Font;

let scores_edit_box: EditBox;
function getName(a: ColumnDef): string {
  return a.name;
}

export type DrawCellParam = {
  value: unknown;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  size: number;
  column: ColumnDef;
  use_style: FontStyle;
  header: boolean;
};

export function drawCellDefault({
  value,
  x, y, z, w, h,
  size, column,
  use_style, header,
}: DrawCellParam): void {
  let { align } = column;
  if (align === undefined) {
    align = ALIGN.HVCENTERFIT;
  }

  let str = String(value);
  font.drawSizedAligned(use_style, x, y, z, size, align, w, h, str);
}

let scroll_origin = 0;
const SCROLL_PAUSE = 1500;
const SCROLL_TIME = 1000;
const SCROLL_TIME_TOTAL = SCROLL_PAUSE * 2 + SCROLL_TIME;
function drawCellScrolling({
  value,
  x, y, z, w, h,
  size, column,
  use_style, header,
}: DrawCellParam): void {
  let { align } = column;
  if (align === undefined) {
    align = ALIGN.VCENTER;
  }
  // ignore HFIT
  align &= ~ALIGN.HFIT;

  let str = String(value);

  let str_w = font.getStringWidth(use_style, size, str);
  if (str_w <= w) {
    font.drawSizedAligned(use_style, x, y, z, size, align, w, h, str);
  } else {
    let scroll_dt = getFrameTimestamp() - scroll_origin;
    let scroll_t = clamp((scroll_dt - SCROLL_PAUSE) / SCROLL_TIME, 0, 1);
    let over_width = str_w - w;
    let xoffs = scroll_t * over_width;
    let rect = { x, y, w, h };
    if (clipTestRect(rect)) {
      spriteClipPush(z, rect.x, rect.y, rect.w, rect.h);
      if (font.integral) {
        xoffs = round(xoffs);
      }
      let xx = x - xoffs;
      font.drawSizedAligned(use_style, xx, y, z, size, align, w, h, str);
      spriteClipPop();
    }
  }
}

export type ScoreToRowFunc<ScoreType> = (row: unknown[], score: ScoreType) => void;

export type ScoresDrawParam<ScoreType> = {
  score_system: ScoreSystem<ScoreType>;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  level_index: number;
  size: number;
  line_height: number;
  columns: ColumnDef[];
  scoreToRow: ScoreToRowFunc<ScoreType>;
  style_score: FontStyle;
  style_me: FontStyle;
  style_header: FontStyle;
  color_me_background: ROVec4;
  color_line?: ROVec4;
  allow_rename: boolean;
  no_header?: boolean;
  scroll_key?: string;
  rename_edit_width?: number; // default width / 2
  rename_button_size?: number; // default 10 (in text height units)
  rename_button_offset?: number; // default -0.25 (in fraction of `size`)
  friend_cat?: string;
  override_scores?: HighScoreListRaw;
};

const skipped_rank_column_def: ColumnDef = {
  name: '',
  width: 1,
  align: ALIGN.HVCENTER,
};

let last_level_idx: number = -1;
let force_show_rename = false;
export function scoresDraw<ScoreType>({
  score_system,
  x, y, z,
  width, height,
  level_index,
  size, line_height,
  columns,
  scoreToRow,
  style_score,
  style_me,
  style_header,
  color_me_background,
  color_line,
  allow_rename,
  no_header,
  scroll_key,
  rename_edit_width,
  rename_button_size,
  rename_button_offset,
  friend_cat,
  override_scores,
}: ScoresDrawParam<ScoreType>): number {
  assert(color_me_background[3] === 1);
  if (!font) {
    ({ font } = ui);
  }
  let now = getFrameTimestamp();
  if (last_level_idx !== level_index) {
    scroll_origin = getFrameTimestamp();
    last_level_idx = level_index;
  }
  if (now - scroll_origin > SCROLL_TIME_TOTAL) {
    scroll_origin = now;
  }

  let my_name = scoreGetPlayerName();
  const pad = size;
  const hpad = pad/2;
  const button_height = uiButtonHeight();
  const scroll_max_y = y + height - (button_height + pad);

  scroll_key = scroll_key || 'default';
  type ScrollInfo = {
    scroll_h_this_frame: number;
    scroll_h_last_frame: number;
    scroll_area: ScrollArea;
  };
  let scroll_info = getUIElemData('scorescroll', { key: scroll_key }, function (): ScrollInfo {
    return {
      scroll_h_this_frame: 0,
      scroll_h_last_frame: 0,
      scroll_area: scrollAreaCreate({
        background_color: null,
        auto_hide: true,
      }),
    };
  });
  if (autoResetEachFrame(`score_ui_${scroll_key}`)) {
    scroll_info.scroll_h_last_frame = scroll_info.scroll_h_this_frame;
    scroll_info.scroll_h_this_frame = 0;
  }
  let scores_scroll = scroll_info.scroll_area;
  let vis_width = width - scores_scroll.barWidth();
  let widths_total = 0;
  for (let ii = 0; ii < columns.length; ++ii) {
    widths_total += columns[ii].width;
  }
  let use_widths: number[] = [];
  for (let ii = 0; ii < columns.length; ++ii) {
    let column_width = columns[ii].width;
    use_widths[ii] = column_width * (vis_width - hpad * (columns.length - 1)) / widths_total;
  }
  function drawSet(arr: unknown[], use_style: FontStyle, header: boolean): void {
    let xx = x;
    for (let ii = 0; ii < arr.length; ++ii) {
      let column = columns[ii];
      let fn = column.draw || (ii === 1 ? drawCellScrolling : drawCellDefault);
      fn({
        value: arr[ii],
        x: xx, y, z, w: use_widths[ii], h: line_height,
        size, column,
        use_style, header,
      });
      xx += use_widths[ii] + hpad;
    }
    y += line_height;
  }
  if (!no_header) {
    drawSet(columns.map(getName), style_header, true);
    y += 2;
    ui.drawLine(x, y, x+width, y, z, 1, 1, color_line || unit_vec);
    y += 1;
  }
  function drawScoreEntry(ii: number | null, s: HighScoreListEntry<ScoreType>, use_style: FontStyle): void {
    let row = [
      ii === null ? '--' : `#${s.rank}`,
      scoreFormatName(s),
    ];
    scoreToRow(row, s.score);
    drawSet(row, use_style, false);
  }

  let scores;
  if (override_scores) {
    scores = score_system.getHighScoresOverride(level_index, override_scores);
  } else {
    scores = score_system.getHighScores(level_index, friend_cat || FRIEND_CAT_GLOBAL);
  }
  if (!scores) {
    // Note: using scroll_max_y instead of (y + height) for better centering in
    //   QP2A, but not 100% sure this is the right solution.  Probably height is
    //   wrong on QP2A?
    let ymax = scroll_max_y;
    font.drawSizedAligned(style_score, x, y, z, size, ALIGN.HVCENTERFIT, width, ymax - y,
      'Loading...');

    // However, if we have a locally saved score, still show that at the bottom!
    let my_score = score_system.getScore(level_index);
    if (my_score) {
      let y_save2 = y;
      y = ymax - line_height;
      z += 20;
      ui.drawRect(x, y, x + width - 2, y + line_height - 1, z - 1, color_me_background);
      drawScoreEntry(null, { names_str: my_name, names: [my_name], score: my_score, rank: -1, count: 1 }, style_me);
      z -= 20;
      y = y_save2;
    }
    return ymax;
  }
  const scores_scroll_h = scroll_max_y - y;
  scores_scroll.begin({
    x, y,
    w: width,
    h: scores_scroll_h,
    rate_scroll_click: line_height,
  });
  let scroll_pos = round(scores_scroll.getScrollPos());
  let scroll_y0 = scroll_pos - line_height * 2;
  let scroll_y1 = scroll_pos + scores_scroll_h + line_height;
  let scroll_min_visible_y = scroll_pos;
  let scroll_max_visible_y = scroll_pos + scores_scroll_h - line_height + 1;
  let y_save = y;
  let x_save = x;
  x = 0;
  y = 0;
  // draw scores
  let found_me = false;
  let scores_list = scores.list;
  if (debugDefineIsSet('SCORES')) {
    scores_list = scores_list.concat(scores_list);
    scores_list = scores_list.concat(scores_list);
    scores_list = scores_list.concat(scores_list);
    scores_list = scores_list.concat(scores_list);
  }
  let next_rank = 1;
  for (let ii = 0; ii < scores_list.length; ++ii) {
    let s = scores_list[ii % scores_list.length];
    let skipped = s.rank - next_rank;
    if (skipped) {
      if (y >= scroll_y0 && y <= scroll_y1) {
        drawCellScrolling({
          value: `... ${skipped} ${plural(skipped, 'other')} ...`,
          x, y, z, w: vis_width, h: line_height,
          size, column: skipped_rank_column_def,
          use_style: style_score, header: false,
        });
      }
      y += line_height;
    }
    let use_style = style_score;
    let drawme = false;
    if (s.rank === scores.my_rank && !found_me) {
      use_style = style_me;
      found_me = true;
      drawme = true;
    }
    if (drawme) {
      let y_save2 = y;
      if (y < scroll_min_visible_y) {
        y = scroll_min_visible_y;
      } else if (y > scroll_max_visible_y) {
        y = scroll_max_visible_y;
      }
      z += 20;
      ui.drawRect(x, y, x + width + 1, y + line_height - 1, z - 1, color_me_background);
      drawScoreEntry(ii, s, use_style);
      z -= 20;
      y = y_save2 + line_height;
    } else if (y >= scroll_y0 && y <= scroll_y1) {
      drawScoreEntry(ii, s, use_style);
    } else {
      y += line_height;
    }
    next_rank = s.rank + s.count;
  }
  let extra_at_end = scores.total + 1 - next_rank;
  if (extra_at_end) {
    if (y >= scroll_y0 && y <= scroll_y1) {
      drawCellScrolling({
        value: `... ${extra_at_end} ${plural(extra_at_end, 'other')} ...`,
        x, y, z, w: vis_width, h: line_height,
        size, column: skipped_rank_column_def,
        use_style: style_score, header: false,
      });
    }
    y += line_height;
  }

  if (!found_me && score_system.getScore(level_index)) {
    let my_score = score_system.getScore(level_index)!;
    let y_save2 = y;
    if (y < scroll_min_visible_y) {
      y = scroll_min_visible_y;
    } else if (y > scroll_max_visible_y - line_height) {
      y = scroll_max_visible_y - line_height;
    }
    z += 20;
    ui.drawRect(x, y, x + width + 1, y + line_height*2 - 1, z - 1, color_me_background);
    font.draw({
      style: style_header,
      x, y, z,
      w: vis_width,
      h: line_height,
      align: ALIGN.HVCENTERFIT,
      text: 'Cannot submit scores - likely offline'
    });
    y += line_height;
    drawScoreEntry(null, { names_str: my_name, names: [my_name], score: my_score, rank: -1, count: 1 }, style_me);
    z -= 20;
    y = y_save2 + line_height * 2;
  } else if (scores.overloaded) {
    let y_save2 = y;
    if (y < scroll_min_visible_y) {
      y = scroll_min_visible_y;
    } else if (y > scroll_max_visible_y - line_height) {
      y = scroll_max_visible_y - line_height;
    }
    z += 20;
    ui.drawRect(x, y, x + width + 1, y + line_height - 1, z - 1, color_me_background);
    font.draw({
      style: style_header,
      x, y, z,
      w: vis_width,
      h: line_height,
      align: ALIGN.HVCENTERFIT,
      text: 'Leaderboards temporarily unavailable'
    });
    z -= 20;
    y = y_save2 + line_height * 2;
  }
  let set_pad = size / 2;
  y += set_pad/2;
  scroll_info.scroll_h_this_frame = max(scroll_info.scroll_h_this_frame, y);
  scores_scroll.end(max(scroll_info.scroll_h_last_frame, scroll_info.scroll_h_this_frame));
  x = x_save;
  y = y_save + min(scores_scroll_h, y);
  y += set_pad/2;
  if (found_me && allow_rename && scoreCanUpdatePlayerName()) {
    if (!scores_edit_box) {
      scores_edit_box = editBoxCreate({
        z,
        w: rename_edit_width || width / 2,
        placeholder: 'Anonymous',
        max_len: 40,
      });
      scores_edit_box.setText(my_name);
    }

    let show_rename = my_name.startsWith('Anonymous') || !my_name || force_show_rename;
    let button_size = show_rename && rename_button_size || 10;
    let button_param: ButtonTextParam = {
      x,
      y: y + size * (rename_button_offset === undefined ? -0.25 : rename_button_offset),
      z,
      w: size * button_size,
      h: button_height,
      text: force_show_rename && my_name === scores_edit_box.text ? 'Cancel' : my_name ? 'Update Name' : 'Set Name',
    };
    if (show_rename) {
      button_param.x += scores_edit_box.w + size;

      let submit = scores_edit_box.run({
        initial_focus: force_show_rename,
        x,
        y,
      }) === scores_edit_box.SUBMIT;
      button_param.disabled = !scores_edit_box.text;
      if (ui.buttonText(button_param) || submit) {
        if (scores_edit_box.text) {
          assert(typeof scores_edit_box.text === 'string');
          scoreUpdatePlayerName(scores_edit_box.text);
          force_show_rename = false;
        }
      }
    } else {
      button_param.text += '...';
      if (ui.buttonText(button_param)) {
        force_show_rename = true;
      }
    }
    y += size;
  }

  y += pad;
  return y;
}
