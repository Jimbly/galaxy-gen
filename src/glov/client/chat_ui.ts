// Portions Copyright 2020 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

import assert from 'assert';
import type { CmdRespFunc } from 'glov/common/cmd_parse';
import {
  CHAT_FLAG_EMOTE,
  CHAT_FLAG_USERCHAT,
  CHAT_USER_FLAGS,
} from 'glov/common/enums';
import type {
  ChatHistoryData,
  ChatMessageDataBroadcast,
  ChatMessageDataSaved,
  ClientIDs,
  DataObject,
  Optional,
  Roles,
  TSMap,
  WithRequired,
} from 'glov/common/types';
import {
  clamp,
  cloneShallow,
  dateToSafeLocaleString,
  defaults,
  deprecate,
} from 'glov/common/util';
import {
  v3copy,
  vec4,
} from 'glov/common/vmath';
import { asyncParallel } from 'glov-async';
import * as camera2d from './camera2d';
import { getAbilityChat } from './client_config';
import { cmdAutoComplete } from './cmd_auto_complete';
import { cmd_parse } from './cmds';
import {
  EditBox,
  editBoxCreate,
} from './edit_box';
import * as engine from './engine';
import {
  ALIGN,
  Font,
  fontStyle,
  FontStyle,
  fontStyleAlpha,
  fontStyleColored,
  Text,
} from './font';
import type { Box } from './geom_types';
import * as input from './input';
import {
  getStoragePrefix,
  localStorageGetJSON,
  localStorageSetJSON,
} from './local_storage';
import { getStringIfLocalizable } from './localization';
import {
  markdownAuto,
  MarkdownCache,
  markdownDims,
  markdownDraw,
  MarkdownDrawCachedParam,
  markdownIsAllWhitespace,
  markdownLayoutInvalidate,
  markdownPrep,
  MarkdownPrepParam,
  MDDrawBlock,
  MDDrawParam,
  MDLayoutBlock,
  MDLayoutCalcParam,
} from './markdown';
import {
  mdEscape,
  RenderableContent,
} from './markdown_parse';
import {
  markdownLayoutFit,
  MarkdownRenderable,
} from './markdown_renderables';
import {
  ClientChannelWorker,
  ClientChannelWorkerData,
  netClient,
  netClientId,
  netSubs,
  netUserId,
} from './net';
import { ScrollArea, scrollAreaCreate } from './scroll_area';
import * as settings from './settings';
import { settingsRegister } from './settings';
import { isFriend } from './social';
import {
  spot,
  SPOT_DEFAULT_BUTTON,
  spotUnfocus,
} from './spot';
import {
  drawRect,
  drawRect2,
  drawTooltip,
  isMenuUp,
  ModalDialogButtons,
  panel,
  playUISound,
  provideUserString,
  uiGetFont,
  uiGetPanelColor,
  uiGetTooltipPad,
  uiGetTooltipPanelPixelScale,
  uiTextHeight,
} from './ui';
import {
  UIStyle,
  uiStyleCurrent,
} from './uistyle';
import {
  profanityFilter,
  profanityStartup,
} from './words/profanity';

const { ceil, floor, max, min, round } = Math;

deprecate(exports, 'create', 'chatUICreate');

Z.CHAT = Z.CHAT || 500;
Z.CHAT_FOCUSED = Z.CHAT_FOCUSED || Z.CHAT;

const color_user_rollover = vec4(1, 1, 1, 0.5);
const color_same_user_rollover = vec4(1, 1, 1, 0.25);

const MAX_PER_STYLE: TSMap<number> = {
  join_leave: 3,
};

interface ChatMessage extends ChatMessageDataBroadcast {
  style: string;
  msg_text: string;
  timestamp: number;
  flags: number;
  // calculated/run-time:
  hidden?: boolean;
  err_echo?: boolean;
  msg_h: number;
  msg_w: number;
  chatsrc_tag: string;
  chatsrc_tooltip?: string;
  cache: MarkdownCache;
}
export type ChatMessageUser = WithRequired<ChatMessageDataBroadcast, 'display_name'> & {
  chatsrc_tooltip?: Text; // optionally set by decorators
};

function messageFromUser(msg: ChatMessage): boolean {
  return msg.style !== 'error' && msg.style !== 'system';
}

declare module 'glov/client/settings' {
  let chat_auto_unfocus: number;
  let chat_show_join_leave: number;
  let profanity_filter: number;
}

settingsRegister({
  chat_auto_unfocus: {
    default_value: 0,
    type: cmd_parse.TYPE_INT,
    range: [0,1],
    help: 'Automatically unfocus chat after sending a message',
  },
  chat_show_join_leave: {
    default_value: 1,
    type: cmd_parse.TYPE_INT,
    range: [0,1],
    label: 'Show join/leave messages',
    help: 'Show join/leave messages',
  },
  profanity_filter: {
    default_value: 1,
    type: cmd_parse.TYPE_INT,
    range: [0,1],
    help: 'Filter profanity in chat',
  },
});

class CmdHistory {
  entries: Array<string | undefined>;
  idx: number;
  hist_idx!: number;
  edit_line!: string;
  constructor() {
    assert(getStoragePrefix() !== 'demo'); // wrong initialization order
    this.entries = new Array(50);
    let idx = localStorageGetJSON<number | undefined>('console_idx'); // where we will next insert
    if (typeof idx !== 'number' || idx < 0 || idx >= this.entries.length) {
      this.idx = 0;
    } else {
      this.idx = idx;
      for (let ii = 0; ii < this.entries.length; ++ii) {
        this.entries[ii] = localStorageGetJSON(`console_e${ii}`);
      }
    }
    this.resetPos();
  }
  setHist(idx: number, text: string): void {
    this.entries[idx] = text;
    localStorageSetJSON(`console_e${idx}`, text);
  }
  add(text: string): void {
    if (!text) {
      return;
    }
    let idx = this.entries.indexOf(text);
    if (idx !== -1) {
      // already in there, just re-order
      let target = (this.idx - 1 + this.entries.length) % this.entries.length;
      while (idx !== target) {
        let next = (idx + 1) % this.entries.length;
        this.setHist(idx, this.entries[next]!);
        idx = next;
      }
      this.setHist(target, text);
      return;
    }
    this.setHist(this.idx, text);
    this.idx = (this.idx + 1) % this.entries.length;
    localStorageSetJSON('console_idx', this.idx);
    this.resetPos();
  }
  unadd(text: string): void {
    // upon error, do not store this string in our history
    let idx = (this.idx - 1 + this.entries.length) % this.entries.length;
    if (this.entries[idx] !== text) {
      return;
    }
    this.idx = idx;
    localStorageSetJSON('console_idx', this.idx);
    this.resetPos();
  }
  resetPos() : void {
    this.hist_idx = this.idx;
    this.edit_line = '';
  }
  prev(cur_text: string): string {
    if (this.hist_idx === this.idx) {
      // if first time goine backwards, stash the current edit line
      this.edit_line = cur_text;
    }
    let idx = (this.hist_idx - 1 + this.entries.length) % this.entries.length;
    let text = this.entries[idx];
    if (idx === this.idx || !text) {
      // wrapped around, or got to empty
      return this.entries[this.hist_idx] || '';
    }
    this.hist_idx = idx;
    return text || '';
  }
  next(cur_text: string): string {
    if (this.hist_idx === this.idx) {
      return cur_text || '';
    }
    let idx = (this.hist_idx + 1) % this.entries.length;
    this.hist_idx = idx;
    if (this.hist_idx === this.idx) {
      // just got back to head
      let ret = this.edit_line;
      this.edit_line = '';
      return ret || '';
    }
    return this.entries[idx] || '';
  }
}

function defaultGetRoles(): Roles {
  let user_public_data;
  if (netSubs() && netUserId() && netClient().connected) {
    let user_channel = netSubs().getMyUserChannel();
    assert(user_channel);
    user_public_data = user_channel.data && user_channel.data.public;
    if (((user_public_data as DataObject)?.permissions as DataObject)?.sysadmin) {
      return { sysadmin: 1, csr: 1 };
    }
  }
  return {};
}

function filterIdentity(str: string): string {
  return str;
}

export function decorateUserDefault(msg: ChatMessageUser): string {
  let display_name_md: string = msg.display_name;
  // recommended: escape markdown
  display_name_md = mdEscape(display_name_md);
  // recommended: different prefix for emotes
  if (!(msg.flags && (msg.flags & CHAT_FLAG_EMOTE))) {
    display_name_md = `\\[${display_name_md}]`;
  }
  return display_name_md;
}

function notHidden(msg: ChatMessage): boolean {
  return !msg.hidden;
}

function toStr(val: unknown): string {
  val = getStringIfLocalizable(val);
  return typeof val === 'string' ? val : mdEscape(JSON.stringify(val));
}

let access_dummy = {
  access: null as Roles | null,
};

// function pad2(str) {
//   return `0${str}`.slice(-2);
// }
const DATE_FORMAT_OLD = {
  year: 'numeric',
  month: 'numeric',
  day: '2-digit',
  hour: '2-digit',
  minute: 'numeric',
  second: undefined,
} as const;
const DATE_FORMAT_RECENT = {
  year: undefined,
  month: 'numeric',
  day: '2-digit',
  hour: '2-digit',
  minute: 'numeric',
  second: '2-digit',
} as const;
function conciseDate(dt: Date): string {
  let age = Date.now() - dt.getTime();
  let is_old = age > 6*30*24*60*60*1000;
  return dateToSafeLocaleString(dt, false, is_old ? DATE_FORMAT_OLD : DATE_FORMAT_RECENT);
  // return `${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())} ${pad2(dt.getHours())
  // }:${pad2(dt.getMinutes())}:${pad2(dt.getSeconds())}`;
}

let help_font_style = fontStyleColored(null, 0x000000ff);
let help_font_style_cmd = fontStyle(help_font_style, {
  outline_width: 0.5,
  outline_color: 0x000000FF,
});
let help_rollover_color = vec4(0, 0, 0, 0.25);
let help_rollover_color2 = vec4(0, 0, 0, 0.125);
const TOOLTIP_MIN_PAGE_SIZE = 20;
let tooltip_page = 0;
let tooltip_last = '';
let tooltip_panel_color = vec4();
function drawHelpTooltip(param: {
  x: number;
  y: number;
  z?: number;
  tooltip: string[];
  tooltip_width: number;
  font_height: number;
  do_selection: boolean;
  wrap: boolean;
}): string | null {
  let font = uiGetFont();
  assert(Array.isArray(param.tooltip));
  let tooltip = param.tooltip;
  let num_pages = 1;
  let h = param.font_height;
  let eff_tooltip_pad = floor(uiGetTooltipPad() * 0.5);
  let num_per_page = min(TOOLTIP_MIN_PAGE_SIZE, max(1, floor((param.y - camera2d.y0() - eff_tooltip_pad) / h) - 1));
  if (tooltip.length > 20) {
    let text = tooltip.join('\n');
    if (text !== tooltip_last) {
      tooltip_page = 0;
      tooltip_last = text;
    }
    num_pages = ceil(tooltip.length / num_per_page);
    tooltip = tooltip.slice(tooltip_page * num_per_page, (tooltip_page + 1) * num_per_page);
  } else {
    tooltip_page = 0;
    tooltip_last = '';
  }
  let w = param.tooltip_width;
  let x = param.x;
  let z = param.z || (Z.TOOLTIP + 5);
  let text_x = x + eff_tooltip_pad;
  let text_w = w - eff_tooltip_pad * 2;
  let tooltip_y1 = param.y;

  let alpha = 1;
  let vis_h = eff_tooltip_pad * 2 + h * tooltip.length;
  if (!param.do_selection && num_pages === 1 && input.mouseOver({
    x,
    y: tooltip_y1 - vis_h,
    w,
    h: vis_h,
  })) {
    alpha = 0.15;
  }
  let style = help_font_style;
  if (alpha !== 1) {
    style = fontStyleAlpha(style, alpha);
  }

  let y = tooltip_y1 - eff_tooltip_pad;
  let ret = null;
  if (num_pages > 1) {
    y -= h;
    font.drawSizedAligned(help_font_style,
      text_x, y, z+1, h, ALIGN.HCENTER,
      text_w, 0,
      `Page ${tooltip_page + 1} / ${num_pages}`);
    let pos = { x, y, w, h };
    if (input.mouseUpEdge(pos)) { // up instead of down to prevent canvas capturing focus
      tooltip_page = (tooltip_page + 1) % num_pages;
    } else if (input.mouseOver(pos)) {
      drawRect(x, y, x + w, y + h, z + 0.5, help_rollover_color);
    }
  }
  for (let ii = tooltip.length - 1; ii >= 0; --ii) {
    let line = tooltip[ii];
    if (param.wrap) {
      y -= h * font.numLines(style, text_w, 0, h, line);
    } else {
      y -= h;
    }
    let idx = line.indexOf(' ');
    if (line[0] === '/' && idx !== -1 && param.do_selection) {
      // is a command
      let cmd = line.slice(0, idx);
      let help = line.slice(idx);
      let cmd_w = font.drawSized(help_font_style_cmd,
        text_x, y, z+1, h, cmd);
      markdownAuto({
        font_style: help_font_style,
        x: text_x + cmd_w,
        y,
        z: z+2,
        text_height: h,
        align: ALIGN.HFIT,
        w: text_w - cmd_w,
        text: help
      });
      let pos = { x, y, w, h };
      if (input.mouseUpEdge(pos)) { // up instead of down to prevent canvas capturing focus
        ret = cmd.slice(1);
      } else if (input.mouseOver(pos)) {
        drawRect(x, y, text_x + cmd_w + 4, y + h, z + 0.5, help_rollover_color);
        drawRect(text_x + cmd_w + 4, y, x + w, y + h, z + 0.5, help_rollover_color2);
      }
    } else {
      markdownAuto({
        font_style: style,
        x: text_x,
        y, z: z+1,
        text_height: h,
        align: param.wrap ? ALIGN.HWRAP : ALIGN.HFIT,
        w: text_w,
        text: line
      });
    }
  }
  y -= eff_tooltip_pad;
  let pixel_scale = uiGetTooltipPanelPixelScale() * 0.5;

  v3copy(tooltip_panel_color, uiGetPanelColor());
  tooltip_panel_color[3] = alpha;
  panel({
    x, y, z, w,
    h: tooltip_y1 - y,
    pixel_scale,
    color: tooltip_panel_color,
  });
  return ret;
}

function urlKeyEscape(str: string): string {
  str = str.replace(/]/g, ')').replace(/ /g, '%20');
  return str;
}

const NOT_WRAP = ~ALIGN.HWRAP;
class MDRChatURL implements MDLayoutBlock, MDDrawBlock {
  msg_url: string;
  constructor(
    private url_label: string,
    private style_link: FontStyle,
    private style_link_hover: FontStyle,
    private parent: ChatUI,
  ) {
    this.dims = this;
    this.msg_url = `${parent.url_base}${url_label}`;
  }
  // assigned during layout
  dims: Box;
  x!: number;
  y!: number;
  w!: number;
  h!: number;
  font!: Font;
  parent_font_style!: FontStyle;
  align!: ALIGN;
  layout(param: MDLayoutCalcParam): MDDrawBlock[] {
    let { text_height, font, align, font_style } = param;
    this.parent_font_style = font_style;
    this.font = font;
    this.align = align;
    this.h = text_height;
    this.w = font.getStringWidth(this.style_link, text_height, this.url_label);
    markdownLayoutFit(param, this);
    return [this];
  }
  alpha_font_style_cache?: FontStyle;
  alpha_font_style_cache_value?: number;
  draw(param: MDDrawParam): void {
    profilerStart('MDRChatURL::draw');
    const { parent, dims } = this;
    const { chat_interactive } = parent;
    let style: FontStyle;
    let x = param.x + dims.x;
    let y = param.y + dims.y;
    if (chat_interactive) {
      let spot_ret = spot({
        x, y,
        w: dims.w, h: dims.h,
        sound_rollover: null,
        def: SPOT_DEFAULT_BUTTON,
        url: this.msg_url,
        internal: true,
      });
      style = spot_ret.focused ? this.style_link_hover : this.style_link;
      if (spot_ret.focused || spot_ret.ret) {
        parent.handled_rightclick = true; // link will eat it
        parent.focus_tooltip = `Click to open ${this.url_label}`;
      }
      if (spot_ret.ret) {
        parent.cmdParseInternal(`url ${this.url_label}`);
      }
    } else {
      style = this.parent_font_style;
      if (param.alpha !== 1) {
        if (this.alpha_font_style_cache_value !== param.alpha) {
          this.alpha_font_style_cache_value = param.alpha;
          this.alpha_font_style_cache = fontStyleAlpha(style, param.alpha);
        }
        style = this.alpha_font_style_cache!;
      }
    }
    this.font.drawSizedAligned(style,
      param.x + dims.x, param.y + dims.y, param.z,
      dims.h, this.align & NOT_WRAP | ALIGN.HFIT, dims.w, dims.h, this.url_label);
    profilerStop();
  }
}

class MDRChatSource implements MDLayoutBlock, MDDrawBlock {
  constructor(
    private msg: ChatMessageUser,
    private parent: ChatUI,
  ) {
    this.dims = this;
  }
  // assigned during layout
  dims: Box;
  x!: number;
  y!: number;
  w!: number;
  h!: number;
  submd_cache = {};
  draw_param!: MarkdownDrawCachedParam;
  layout(param: MDLayoutCalcParam): MDDrawBlock[] {
    const { parent } = this;
    let user_name_md = parent.decorate_user_cb(this.msg);
    let submd_param: MarkdownPrepParam = {
      font: param.font,
      font_style: param.font_style,
      w: param.w,
      h: param.h,
      text_height: param.text_height,
      indent: param.indent,
      align: ALIGN.HFIT, // we definitely don't handle wrapping here!
      cache: this.submd_cache,
      text: user_name_md,
    };
    // If this layout() function is being called, the parent's layout must have been invalidated, so do the same for us
    markdownLayoutInvalidate(submd_param);
    markdownPrep(submd_param);
    let submd_dims = markdownDims(submd_param);
    this.w = submd_dims.w;
    this.h = submd_dims.h;
    this.draw_param = {
      x: 0, y: 0, z: 0, alpha: 0,
      cache: this.submd_cache,
    };
    markdownLayoutFit(param, this);
    return [this];
  }
  alpha_font_style_cache?: FontStyle;
  alpha_font_style_cache_value?: number;
  draw(param: MDDrawParam): void {
    profilerStart('MDRChatSource::draw');
    let x = param.x + this.x;
    let y = param.y + this.y;
    let z = param.z;
    const { parent, draw_param, msg, dims } = this;
    const { chat_interactive, user_context_cb } = parent;
    if (chat_interactive) {
      assert(user_context_cb);
      assert(msg.id);
      assert(msg.display_name);
      let pos_param = {
        x, y, w: dims.w, h: dims.h, button: 0,
        z: z + 0.5,
        peek: false,
        color: color_user_rollover,
      };
      if (input.click(pos_param)) {
        user_context_cb({
          user_id: msg.id,
        });
      } else {
        pos_param.peek = true; // don't block right-click, etc
        let user_mouseover = input.mouseOver(pos_param);
        if (parent.user_id_mouseover === msg.id) {
          drawRect2({
            ...pos_param,
            color: color_same_user_rollover,
          });
        }
        if (user_mouseover) {
          parent.focus_tooltip = 'Click to view user info';
          if (msg.chatsrc_tooltip) {
            parent.focus_tooltip = `${msg.chatsrc_tooltip}\n${parent.focus_tooltip}`;
          }
          drawRect2(pos_param);
          parent.user_id_mouseover = msg.id;
          parent.did_user_id_mouseover = true;
        }
      }
    }
    draw_param.x = x;
    draw_param.y = y;
    draw_param.z = z;
    draw_param.alpha = param.alpha;
    markdownDraw(draw_param);
    profilerStop();
  }
}

export type SystemStyles = 'def' | 'error' | 'link' | 'link_hover' | 'system';
export type ChatUIParamStyles = Partial<Record<SystemStyles | string, FontStyle>>;

export type ExtraButtonsPreState = {
  // state from chat_ui:
  button_h: number;
  has_channel: boolean; // chat UI is currently in a channel that can send/receive chat (not just debug console)
  hide_input: boolean; // no text input element will be shown (e.g. pointer locked)
  input_focused: boolean; // text input is focused (but hasn't run, don't do keybinds!)
  // to be filled by pre_cb:
  total_w: number;
};

export type ExtraButtonsState = ExtraButtonsPreState & {
  x: number;
  y: number;
  z: number;
};

export type ChatUIExtraButtons = {
  pre_cb: (state: ExtraButtonsPreState) => void;
  cb: (state: ExtraButtonsState) => void;
};

export type ChatUIParam = {
  w?: number;
  h?: number; // excluding text entry
  max_len: number;
  max_lines?: number; // Max shown when chat not active (default: 8)
  max_messages?: number; // Size of history kept (default: 1000)
  font_height?: number;
  emote_cb?: (emote: string) => void;
  style?: UIStyle;
  styles?: ChatUIParamStyles;
  renderables?: TSMap<MarkdownRenderable>;
  hide_disconnected_message?: boolean;
  disconnected_message_top?: boolean;
  label_while_hidden?: Text;

  inner_width_adjust?: number;
  border?: number;
  volume_join_leave?: number;
  volume_in?: number;
  volume_out?: number;
  msg_out_err_delay?: number; // Delay when playing msg_out_err after msg_out.
  get_roles?: () => Roles; // returns object for testing cmd access permissions
  url_match?: RegExp; // runs `/url match[1]` if clicked
  url_info?: RegExp; // Optional for grabbing the interesting portion of the URL for tooltip and /url
  url_base?: string; // To prefix on URLs when creating HREFs for them
  user_context_cb?: (param: { user_id: string }) => void; // Cb called with { user_id } on click

  fade_start_time?: [number, number]; // [normal, hidden]; default [10000, 1000]
  fade_time?: [number, number]; // [normal, hidden]; default [1000, 500];

  outline_width?: number;

  classifyRole?: (roles: Roles | undefined, always_true: true) => string; // Roles -> key to index `styles`
  cmdLogFilter?: (cmd: string) => string;
  decorate_user_cb?: (msg: ChatMessageUser) => string;
  message_pre_send_cb?: (flags: number, text: string, cb: (text: string | null) => void) => void;
  extra_buttons?: ChatUIExtraButtons;
};

export type ChatUIRunParam = Partial<{
  x: number;
  y: number;
  hide: boolean;
  border: number;
  scroll_grow: number;
  pointerlock: boolean;
  always_scroll: boolean;
  cuddly_scroll: boolean;
}>;

class ChatUI {
  private w: number;
  readonly h: number;
  private edit_text_entry: EditBox;
  channel: ClientChannelWorker | null = null;
  private on_chat_cb: ((msg: ChatMessageDataBroadcast) => void) | null = null;
  private max_lines: number;
  private max_messages: number;
  private max_len: number;
  private font_height: number;
  private hide_disconnected_message: boolean;
  private disconnected_message_top: boolean;
  private label_while_hidden: Text;
  private inner_width_adjust: number;
  private border?: number;
  private volume_join_leave: number;
  private volume_in: number;
  private volume_out: number;
  private msg_out_err_delay: number;
  private get_roles: () => Roles;
  private url_match?: RegExp;
  private url_info?: RegExp;
  private fade_start_time: [number, number];
  private fade_time: [number, number];
  private styles: Record<SystemStyles, FontStyle> & TSMap<FontStyle>;
  private classifyRole?: (roles: Roles | undefined, always_true: true) => string;
  private cmdLogFilter: (cmd: string) => string;

  private history: CmdHistory;
  private scroll_area: ScrollArea;
  private font: Font;

  private on_join: ChatUI['onMsgJoin']; // bound method
  private on_leave: ChatUI['onMsgLeave']; // bound method
  private on_chat: ChatUI['onMsgChat']; // bound method
  handle_cmd_parse: ChatUI['handleCmdParse'];
  handle_cmd_parse_error: ChatUI['handleCmdParseError'];
  private z_override: number | null = null; // 1-frame Z override
  renderables: TSMap<MarkdownRenderable> = {}; // by default, no renderables in chat (e.g. images)

  user_id_mouseover: string | null = null; // internal, for MDChatSource
  did_user_id_mouseover = false; // internal, for MDChatSource
  user_context_cb?: (param: { user_id: string }) => void; // internal, for MDChatSource
  decorate_user_cb: (msg: ChatMessageUser) => string; // internal, for MDRChatSource
  private message_pre_send_cb?: (flags: number, text: string, cb: (text: string | null) => void) => void;
  private extra_buttons?: ChatUIExtraButtons;
  chat_interactive = false; // internal, for MDRChatURL
  url_base: string; // internal, for MDRChatURL
  // focuse_handled gets set if MDRChatURL handles focus/click/right-click/etc,
  // maybe need more general solution for MD Renderables that handle focus?
  handled_rightclick = false; // internal, for MDRChat*
  focus_tooltip: string = ''; // internal, for MDRChat*

  constructor(params: ChatUIParam) {
    assert.equal(typeof params, 'object');
    assert.equal(typeof params.max_len, 'number');
    this.font = uiGetFont();
    this.edit_text_entry = editBoxCreate({
      placeholder: 'Chat',
      initial_focus: false,
      auto_unfocus: true,
      spatial_focus: false,
      max_len: params.max_len,
      text: '',
      suppress_up_down: true,
    });

    let style = params.style || uiStyleCurrent();

    this.on_join = this.onMsgJoin.bind(this);
    this.on_leave = this.onMsgLeave.bind(this);
    this.on_chat = this.onMsgChat.bind(this);
    this.handle_cmd_parse = this.handleCmdParse.bind(this);
    this.handle_cmd_parse_error = this.handleCmdParseError.bind(this);
    cmd_parse.setDefaultHandler(this.handle_cmd_parse_error);
    this.clearChat();
    this.max_lines = params.max_lines || 8;
    this.max_messages = params.max_messages || 1000;
    this.max_len = params.max_len;
    this.font_height = params.font_height || style.text_height;
    this.hide_disconnected_message = params.hide_disconnected_message || false;
    this.disconnected_message_top = params.disconnected_message_top || false;
    this.label_while_hidden = params.label_while_hidden || '<Press Enter to chat>';
    this.scroll_area = scrollAreaCreate({
      background_color: null,
      auto_scroll: true,
    });
    this.w = params.w || engine.game_width / 2;
    this.h = params.h || engine.game_height / 2;
    this.inner_width_adjust = params.inner_width_adjust || 0;
    this.border = params.border || undefined;
    this.volume_join_leave = params.volume_join_leave || 0.15;
    this.volume_in = params.volume_in || 0.5;
    this.volume_out = params.volume_out || 0.5;
    this.msg_out_err_delay = params.msg_out_err_delay || 0;
    this.history = new CmdHistory();
    this.get_roles = defaultGetRoles;
    this.url_match = params.url_match;
    this.url_info = params.url_info;
    this.url_base = params.url_base || '';
    if (this.url_info) {
      assert(this.url_base);
    }
    this.user_context_cb = params.user_context_cb;

    this.fade_start_time = params.fade_start_time || [10000, 1000];
    this.fade_time = params.fade_time || [1000, 500];

    this.setActiveSize(this.font_height, this.w);
    let outline_width = params.outline_width || 1;
    this.styles = defaults(params.styles || {}, {
      def: fontStyle(null, {
        color: 0xEEEEEEff,
        outline_width,
        outline_color: 0x000000ff,
      }),
      error: fontStyle(null, {
        color: 0xDD0000ff,
        outline_width,
        outline_color: 0x000000ff,
      }),
      link: fontStyle(null, {
        color: 0x5040FFff,
        outline_width,
        outline_color: 0x000000ff,
      }),
      link_hover: fontStyle(null, {
        color: 0x0000FFff,
        outline_width,
        outline_color: 0x000000ff,
      }),
      system: fontStyle(null, {
        color: 0xAAAAAAff,
        outline_width,
        outline_color: 0x000000ff,
      }),
    });
    this.styles.join_leave = this.styles.join_leave || this.styles.system;
    this.classifyRole = params.classifyRole;
    this.cmdLogFilter = params.cmdLogFilter || filterIdentity;
    this.decorate_user_cb = params.decorate_user_cb || decorateUserDefault;
    this.message_pre_send_cb = params.message_pre_send_cb;
    this.extra_buttons = params.extra_buttons;

    if (params.renderables) {
      this.renderables = cloneShallow(params.renderables);
    }
    if (this.url_match) {
      this.renderables.chaturl = this.createMDRChatURL.bind(this);
    }
    this.renderables.chatsrc = this.createMDRChatSource.bind(this);

    if (netSubs()) {
      netSubs().on('chat_broadcast', this.onChatBroadcast.bind(this));
    }

    // for console debugging, overrides general (not forwarded to server, not access checked) version
    (window as unknown as DataObject).cmd = this.cmdParse.bind(this);
  }

  createMDRChatURL(
    content: RenderableContent
  ): MDLayoutBlock | null {
    let { key } = content;
    if (!key) {
      return null;
    }
    let { url_info } = this;
    if (url_info) {
      let m = key.match(url_info);
      if (!m || m[0] !== key) {
        return null;
      }
    }
    return new MDRChatURL(key, this.styles.link, this.styles.link_hover, this);
  }

  createMDRChatSource(
    content: RenderableContent,
    data: unknown
  ): MDLayoutBlock | null {
    if (!data) {
      return null;
    }
    return new MDRChatSource(data as ChatMessageUser, this);
  }

  private calcMsgHeight(elem: ChatMessage): void {
    let mdstate: MarkdownPrepParam = {
      font_style: this.styles[elem.style] || this.styles.def,
      w: this.wrap_w,
      indent: this.indent,
      text_height: this.active_font_height,
      cache: elem.cache,
      align: ALIGN.HWRAP,
      text: elem.msg_text,
      renderables: this.renderables,
    };
    if (elem.chatsrc_tag) {
      mdstate.custom = {
        [elem.chatsrc_tag]: {
          type: 'chatsrc',
          data: elem,
        }
      };
    }
    markdownPrep(mdstate);
    let dims = markdownDims(mdstate);
    elem.msg_h = dims.h;
    elem.msg_w = dims.w;
    this.total_h += elem.msg_h;
  }

  private active_font_height!: number;
  private wrap_w!: number;
  private indent!: number;
  setActiveSize(font_height: number, w: number): void {
    let wrap_w = w - this.scroll_area.barWidth();
    if (this.active_font_height !== font_height || this.wrap_w !== wrap_w) {
      this.active_font_height = font_height;
      this.indent = round(this.active_font_height/24 * 40);
      this.wrap_w = wrap_w;
      // recalc msg_h
      this.total_h = 0;
      for (let ii = 0; ii < this.msgs.length; ++ii) {
        let elem = this.msgs[ii];
        if (!elem.hidden) {
          markdownLayoutInvalidate(elem);
          this.calcMsgHeight(elem);
        }
      }
    }
  }

  private msgs!: ChatMessage[];
  private total_h!: number;
  clearChat(): void {
    this.msgs = [];
    this.total_h = 0;
  }

  addMsgInternal(elem_in: Optional<ChatMessageDataBroadcast, 'flags'> & { timestamp?: number }): void {
    let elem = elem_in as ChatMessage;
    elem.cache = {};
    elem.flags = elem.flags || 0;
    elem.timestamp = elem.timestamp || Date.now();
    if (elem.flags && (elem.flags & CHAT_FLAG_USERCHAT)) {
      assert(elem.display_name);
      if (this.user_context_cb && elem.id) {
        let chatsrc_tag = 'csrc1';
        while (elem.msg.includes(chatsrc_tag) || elem.display_name.includes(chatsrc_tag)) {
          chatsrc_tag = `csrc${String(Math.random()).slice(2)}`;
        }
        elem.chatsrc_tag = chatsrc_tag;
        elem.msg_text = `[${chatsrc_tag}=] ${elem.msg}`;
      } else {
        elem.msg_text = `${this.decorate_user_cb(elem as ChatMessageUser)} ${elem.msg}`;
      }
    } else {
      elem.msg_text = elem.msg;
    }
    this.calcMsgHeight(elem);
    this.msgs.push(elem);
    let max_msgs = MAX_PER_STYLE[elem.style];
    if (max_msgs) {
      // Remove any more than max
      // Also remove any for the same ID (want for 'join_leave', maybe not others?)
      for (let ii = this.msgs.length - 2; ii >= 0; --ii) {
        let elem2 = this.msgs[ii];
        if (elem2.style === elem.style && !elem2.hidden) {
          if (elem.id && elem2.id === elem.id) {
            elem2.hidden = true;
            this.total_h -= elem2.msg_h;
            elem2.msg_h = 0;
          } else {
            --max_msgs;
            if (max_msgs <= 0) {
              elem2.hidden = true;
              this.total_h -= elem2.msg_h;
              elem2.msg_h = 0;
              break;
            }
          }
        }
      }
    }
    if (this.msgs.length > this.max_messages * 1.25) {
      this.msgs = this.msgs.filter(notHidden);
      if (this.msgs.length > this.max_messages * 1.25) {
        this.msgs.splice(0, this.msgs.length - this.max_messages);
        this.total_h = 0;
        for (let ii = 0; ii < this.msgs.length; ++ii) {
          this.total_h += this.msgs[ii].msg_h;
        }
      }
    }
  }

  addChat(msg: string, style?: string): void {
    msg = toStr(msg);
    console.log(msg);
    this.addMsgInternal({ msg, style });
  }
  addChatFiltered(data: Optional<ChatMessageDataBroadcast, 'flags'> & { timestamp?: number }): void {
    data.msg = toStr(data.msg);
    console.log(`Chat from ${data.id}: ${data.msg}`);
    if (settings.profanity_filter && data.id !== (netUserId() || netClientId())) {
      data.msg = profanityFilter(data.msg);
    }
    data.msg = this.linkFilter(data.msg);
    this.addMsgInternal(data);
  }

  linkFilter(msg: string): string {
    let { url_match, url_info } = this;
    if (!url_match) {
      return msg;
    }
    return msg.replace(url_match, (match: string, msg_url: string): string => {
      let url_label = msg_url;
      if (url_info) {
        let m = msg_url.match(url_info);
        if (m) {
          url_label = m[1];
        }
      }
      // Replace only the captured group with the filtered link
      return match.replace(msg_url, `[chaturl=${urlKeyEscape(url_label)}]`);
    });
  }
  linkUnFilter(msg: string): string {
    // simplified version of `renderable_regex`
    return msg.replace(/\[chaturl=([^\s\]]+)]/, (match, url) => {
      return `${this.url_base}${url}`;
    });
  }

  onMsgJoin(data: ClientIDs): void {
    if (!settings.chat_show_join_leave) {
      return;
    }
    if (data.client_id !== netClientId()) {
      if (this.volume_join_leave) {
        playUISound('user_join', this.volume_join_leave);
      }
      this.addChatFiltered({
        id: data.user_id || data.client_id,
        display_name: data.display_name || data.client_id,
        flags: CHAT_FLAG_EMOTE|CHAT_FLAG_USERCHAT,
        msg: 'joined the channel',
        style: 'join_leave',
      });
    }
  }
  onMsgLeave(data: ClientIDs): void {
    if (!settings.chat_show_join_leave) {
      return;
    }
    if (this.volume_join_leave) {
      playUISound('user_leave', this.volume_join_leave);
    }
    this.addChatFiltered({
      id: data.user_id || data.client_id,
      display_name: data.display_name || data.client_id,
      flags: CHAT_FLAG_EMOTE|CHAT_FLAG_USERCHAT,
      msg: 'left the channel',
      style: 'join_leave',
    });
  }

  registerOnMsgChatCB(cb: (data: ChatMessageDataBroadcast) => void): void {
    assert(!this.on_chat_cb);
    this.on_chat_cb = cb;
  }

  onMsgChat(data: ChatMessageDataBroadcast | ChatMessageDataSaved): void {
    let { msg, style, id, display_name, flags } = data;
    let { client_id, ent_id, ts, quiet, err_echo } = data as Partial<ChatMessageDataBroadcast & ChatMessageDataSaved>;
    if (!quiet && client_id !== netClientId()) {
      if (this.volume_in) {
        playUISound('msg_in', this.volume_in);
      }
    }
    display_name = display_name || id;
    flags = (flags || 0) | CHAT_FLAG_USERCHAT;
    let data_filtered = {
      client_id,
      ent_id,
      id,
      display_name,
      msg,
      style,
      flags,
      timestamp: ts,
      quiet,
      err_echo,
    };
    this.addChatFiltered(data_filtered);
    if (this.on_chat_cb) {
      this.on_chat_cb(data_filtered);
    }
  }
  onChatBroadcast(data: {
    src: string;
    msg: string;
  }): void {
    let { msg, src } = data;
    playUISound('msg_err');
    this.addChatFiltered({
      msg: `[${src}] ${msg}`,
      style: 'error',
    });
  }

  focus(): void {
    this.edit_text_entry.focus();
  }

  did_run_late = false;
  runLate(): void {
    this.did_run_late = true;
    if (getAbilityChat() && input.keyDownEdge(input.KEYS.RETURN)) {
      this.focus();
    }
    if (input.keyDownEdge(input.KEYS.SLASH) ||
      input.keyDownEdge(input.KEYS.NUMPAD_DIVIDE)
    ) {
      this.focus();
      this.edit_text_entry.setText('/');
    }
  }

  addChatError(err: unknown): void {
    this.addChat(`[error] ${toStr(err)}`, 'error');
  }

  handleCmdParseError(err: unknown, resp?: unknown): void {
    if (err) {
      this.addChatError(err);
    }
  }

  handleCmdParse(err: unknown, resp: unknown): void {
    if (err) {
      this.addChatError(err);
    } else if (resp) {
      this.addChat(`[system] ${toStr(resp)}`, 'system');
    }
  }

  setGetRoles(fn: () => Roles): void {
    this.get_roles = fn;
  }

  getAccessObj(): { access: Roles | null } {
    access_dummy.access = this.get_roles();
    return access_dummy;
  }

  cmdParse(str: string, cb?: CmdRespFunc): void {
    let handleResult: CmdRespFunc = cb ?
      (err, resp) => {
        this.handle_cmd_parse(err, resp);
        if (cb) {
          cb(err, resp);
        }
      } :
      this.handle_cmd_parse;
    cmd_parse.handle(this.getAccessObj(), str, function (err?: string | null, resp?: unknown) {
      if (err && cmd_parse.was_not_found) {
        // forward to server
        netSubs().sendCmdParse(str, handleResult);
      } else {
        handleResult(err, resp);
      }
    });
  }

  cmdParseLogged(text: string, cb?: CmdRespFunc): void {
    this.cmdParse(text, cb);
    if (netSubs()) {
      let last_cmd_data = cmd_parse.getLastSuccessfulCmdData();
      let param: DataObject = {
        text: this.cmdLogFilter(text),
        cs: last_cmd_data ? 1 : 0, // client success
      };
      if (last_cmd_data) {
        param.n = last_cmd_data.name;
        param.ar = last_cmd_data.access_run;
      }
      netSubs().serverLog('cmd', param);
    }
  }

  cmdParseInternal(str: string): void {
    cmd_parse.handle(this.getAccessObj(), str, this.handle_cmd_parse_error);
  }

  isFocused(): boolean {
    return this.edit_text_entry.isFocused();
  }

  sendChat(flags: number, text_in: string): void {
    let do_send = (text: string | null): void => {
      if (!text) {
        return;
      }
      if (!netClient() || !netClient().connected) {
        return this.addChatError('Cannot chat: Disconnected');
      } else if (!this.channel) {
        return this.addChatError('Cannot chat: Must be in a channel');
      } else if (!netSubs().loggedIn() && !netSubs().allow_anon) {
        return this.addChatError('Cannot chat: Must be logged in');
      } else if (text.length > this.max_len) {
        return this.addChatError('Chat message too long');
      }
      let pak = this.channel.pak('chat');
      pak.writeInt(flags);
      pak.writeString(text);
      pak.send((err: null | string, data: unknown) => {
        if (err) {
          if (err === 'ERR_ECHO') {
            let clients = this.channel?.data?.public?.clients;
            let roles = clients?.[netClientId()]?.ids?.roles;
            let style = this.classifyRole && this.classifyRole(roles, true);
            this.onMsgChat({
              msg: text,
              style: style,
              id: netUserId() || undefined,
              client_id: netClientId(),
              display_name: netSubs().getDisplayName() || undefined,
              flags,
              err_echo: true,
            });
          } else {
            this.addChatError(err);
            if (!this.edit_text_entry.getText()) {
              this.edit_text_entry.setText(text);
            }
          }
        }
      });
    };
    if (this.message_pre_send_cb) {
      this.message_pre_send_cb(flags, text_in, do_send);
    } else {
      do_send(text_in);
    }
  }

  setZOverride(z: number): void {
    this.z_override = z;
  }

  private copyMessage(msg: ChatMessage): void {
    let base_text = this.linkUnFilter(msg.msg_text);
    if (msg.flags && (msg.flags & CHAT_FLAG_USERCHAT) && msg.id) {
      let display_name = msg.display_name || msg.id;
      // Since there's a "User ID" button anyway, this isn't needed, just makes it messy?
      // if (display_name.toLowerCase() !== msg.id.toLowerCase()) {
      //   display_name = `${msg.id} (${display_name})`;
      // }
      if (msg.flags && (msg.flags & CHAT_FLAG_EMOTE)) {
        base_text = `${display_name} ${this.linkUnFilter(msg.msg)}`;
      } else {
        base_text = `[${display_name}] ${this.linkUnFilter(msg.msg)}`;
      }
    }
    let just_message = this.linkUnFilter(msg.msg);
    let buttons: ModalDialogButtons = {};
    if ((msg.flags & CHAT_FLAG_USERCHAT) && msg.id) {
      let msg_id = msg.id;
      buttons['User ID'] = {
        cb: function () {
          provideUserString('User ID', msg_id);
        },
      };
    }
    if (just_message !== base_text) {
      buttons['Just message'] = {
        cb: function () {
          provideUserString('Chat Text', just_message);
        },
      };
    }
    provideUserString('Chat Text', base_text, buttons);
  }

  run(opts?: ChatUIRunParam): void {
    const UI_SCALE = uiTextHeight() / 24;
    opts = opts || {};
    if (!getAbilityChat()) {
      opts.hide = true;
    }
    const border = opts.border || this.border || (8 * UI_SCALE);
    const SPACE_ABOVE_ENTRY = border;
    const scroll_grow = opts.scroll_grow || 0;
    const { font } = this;
    if (netClient() && netClient().disconnected && !this.hide_disconnected_message) {
      font.drawSizedAligned(
        fontStyle(null, {
          outline_width: 2,
          outline_color: 0x000000ff,
          color: 0xDD2020ff
        }),
        camera2d.x0(),
        this.disconnected_message_top ? engine.game_height * 0.80 : camera2d.y0(),
        Z.DEBUG,
        uiTextHeight(),
        this.disconnected_message_top ? ALIGN.HCENTER : ALIGN.HVCENTER,
        camera2d.w(), camera2d.h() * 0.20,
        `Connection lost, attempting to reconnect (${(netClient().timeSinceDisconnect()/1000).toFixed(0)})...`);
    }

    // Test sending a stream of chat
    // if (engine.defines.CHATTER) {
    //   this.chatter_countdown = (this.chatter_countdown || 0) - engine.frame_dt;
    //   if (this.chatter_countdown < 0) {
    //     this.sendChat(0, `Something random ${Math.random()}`);
    //     this.chatter_countdown = 1000 * Math.random();
    //   }
    // }

    if (!this.did_run_late) {
      this.runLate();
    }
    this.did_run_late = false;
    const x0 = opts.x === undefined ? camera2d.x0() : opts.x;
    const y0 = opts.y === undefined ? camera2d.y1() - this.h : opts.y;
    const y1 = y0 + this.h;
    let x = x0 + border;
    let y = y1;
    let outer_w = this.w;
    let was_focused = this.isFocused();
    let z = this.z_override || (was_focused ? Z.CHAT_FOCUSED : Z.CHAT);
    this.z_override = null;
    let is_focused = false;
    let font_height = this.font_height;
    let anything_visible = false;
    let hide_light = (opts.hide || engine.defines.NOUI || !netSubs().loggedIn()) &&
      !was_focused ?
      1 : // must be numerical, used to index fade values
      0;
    let hide_text_input = isMenuUp() || hide_light;
    if (!hide_text_input && was_focused && input.touch_mode) {
      // expand chat when focused on touch devices
      outer_w = camera2d.x1() - x0 - 24 * UI_SCALE;
      let font_scale = 4;
      let aspect = camera2d.screenAspect();
      if (aspect > 2) { // scale up to font scale of 8
        font_scale = 4 + 4 * min((aspect - 2) / 8, 1);
      }
      font_height *= font_scale;
    }
    const inner_w = outer_w - border + this.inner_width_adjust;
    this.setActiveSize(font_height, inner_w); // may recalc msg_h on each elem; updates wrap_w
    if (hide_text_input) {
      if (this.extra_buttons) {
        // Allow responding to hotkeys/etc, but should not show any buttons
        // there is no visible place for this.
        let extra_button_pre_state: ExtraButtonsPreState = {
          button_h: 0,
          has_channel: Boolean(this.channel),
          hide_input: true,
          input_focused: was_focused,
          total_w: 0,
        };
        this.extra_buttons.pre_cb(extra_button_pre_state);
        assert(!extra_button_pre_state.total_w);
        let extra_button_state: ExtraButtonsState = {
          ...extra_button_pre_state,
          x: 0,
          y: 0,
          z: z + 1,
        };
        this.extra_buttons.cb(extra_button_state);
      }
    } else {
      anything_visible = true;
      y -= border;

      let input_width = inner_w - (opts.cuddly_scroll ? this.scroll_area.barWidth() + 1 + border : border);
      let input_height = font_height;
      let big_touch_chat_entry = input.touch_mode && !was_focused;
      if (big_touch_chat_entry) {
        input_height = font_height * 3;
      }
      y -= input_height + 1;

      let hide_input = Boolean(!was_focused && opts.pointerlock && input.pointerLocked());
      let extra_button_pre_state: ExtraButtonsPreState = {
        button_h: input_height + 2,
        has_channel: Boolean(this.channel),
        hide_input,
        input_focused: was_focused,

        // filled by callback:
        total_w: 0,
      };
      if (this.extra_buttons) {
        this.extra_buttons.pre_cb(extra_button_pre_state);
      }

      // TODO: also add a "send chat" button here?

      if (extra_button_pre_state.total_w) {
        input_width -= extra_button_pre_state.total_w;
      }
      let extra_button_state: ExtraButtonsState = {
        ...extra_button_pre_state,
        x: x + input_width,
        y,
        z: z + 1,
      };
      if (this.extra_buttons) {
        this.extra_buttons.cb(extra_button_state);
        if (extra_button_state.total_w) {
          input_width -= 4;
        }
      }

      if (big_touch_chat_entry) {
        input_width = min(input_width, font_height * 7);
      }

      if (hide_input) {
        // do not show edit box
        font.drawSizedAligned(this.styles.def, x, y, z + 1, font_height, ALIGN.HFIT, input_width, 0,
          this.label_while_hidden);
      } else {
        if (was_focused) {
          // Do auto-complete logic *before* edit box, so we can eat TAB without changing focus
          // Eat tab even if there's nothing to complete, for consistency
          let pressed_tab = !input.keyDown(input.KEYS.SHIFT) && input.keyDownEdge(input.KEYS.TAB);
          if (pressed_tab) {
            this.focus();
          }
          let cur_text = this.edit_text_entry.getText();
          if (cur_text) {
            if (cur_text[0] === '/') {
              // do auto-complete
              let autocomplete = cmdAutoComplete(cur_text.slice(1), this.getAccessObj().access);
              if (autocomplete && autocomplete.length) {
                let first = autocomplete[0];
                let auto_text = [];
                let wrap = false;
                for (let ii = 0; ii < autocomplete.length; ++ii) {
                  let elem = autocomplete[ii];
                  auto_text.push(`/${elem.cmd} - ${elem.help}`);
                }
                let do_selection = false; // should we allow clicking in the tooltip?
                if (autocomplete.length === 1 &&
                  first.cname &&
                  cmd_parse.canonical(cur_text.slice(1)).slice(0, first.cname.length) === first.cname
                ) {
                  // we've typed something that matches the first one
                  if (first.usage) {
                    auto_text = first.usage.split('\n');
                  } else {
                    auto_text = [first.help];
                  }
                  wrap = true;
                } else {
                  do_selection = true;
                }
                let tooltip_y = y;
                // check if last message is an error, if so, tooltip above that.
                let last_msg = this.msgs[this.msgs.length - 1];
                if (last_msg) {
                  let msg = last_msg.msg;
                  if (msg && !(last_msg.flags & CHAT_FLAG_USERCHAT) && msg.slice(0, 7) === '[error]') {
                    tooltip_y -= last_msg.msg_h + SPACE_ABOVE_ENTRY;
                  }
                }

                let selected = drawHelpTooltip({
                  x, y: tooltip_y,
                  tooltip_width: max(inner_w, engine.game_width * 0.8),
                  tooltip: auto_text,
                  do_selection,
                  font_height: min(font_height, camera2d.w() / 30),
                  wrap,
                });
                if (do_selection) {
                  // auto-completes to something different than we have typed
                  // Do not use ENTER as well, because sometimes a hidden command is a sub-string of a shown command?
                  if (pressed_tab || selected) {
                    this.edit_text_entry.setText(`/${selected || first.cmd} `);
                  }
                }
              }
            }
          } else {
            this.history.resetPos();
          }
          if (input.keyDownEdge(input.KEYS.UP)) {
            this.edit_text_entry.setText(this.history.prev(cur_text));
          }
          if (input.keyDownEdge(input.KEYS.DOWN)) {
            this.edit_text_entry.setText(this.history.next(cur_text));
          }
          this.scroll_area.keyboardScroll();
        }
        let res = this.edit_text_entry.run({
          x, y, w: input_width, font_height: input_height, pointer_lock: opts.pointerlock
        });
        is_focused = this.isFocused();
        if (res === this.edit_text_entry.SUBMIT) {
          this.scroll_area.scrollToEnd();
          let text = this.edit_text_entry.getText().trim();
          if (text && !markdownIsAllWhitespace({ text, renderables: this.renderables })) {
            let start_time = Date.now();
            this.edit_text_entry.setText('');
            if (text[0] === '/') {
              if (text[1] === '/') { // common error of starting with //foo because chat was already focused
                text = text.slice(1);
              }
              this.history.add(text);
              this.cmdParseLogged(text.slice(1), (err) => {
                if (!err) {
                  return;
                }
                if (this.volume_out) {
                  setTimeout(
                    () => playUISound('msg_out_err', this.volume_out),
                    max(0, this.msg_out_err_delay * 1000 - (Date.now() - start_time))
                  );
                }
                if (!this.edit_text_entry.getText()) {
                  // this.history.unadd(text);
                  this.edit_text_entry.setText(text);
                }
                if (!is_focused) { // was auto-unfocused
                  this.focus();
                }
              });
            } else {
              this.sendChat(0, text);
            }
            if (this.volume_out) {
              playUISound('msg_out', this.volume_out); // after cmdParse may have adjust volume
            }
            if (settings.chat_auto_unfocus) {
              is_focused = false;
              spotUnfocus();
            }
          } else {
            if (this.edit_text_entry.getText()) {
              // all whitespace, just clear
              this.edit_text_entry.setText('');
            } else {
              // already empty, close chat
              is_focused = false;
              spotUnfocus();
            }
          }
        }
      }
    }
    y -= SPACE_ABOVE_ENTRY;

    let { wrap_w } = this;
    let self = this;
    let do_scroll_area = is_focused || opts.always_scroll;
    this.chat_interactive = Boolean(do_scroll_area);
    this.did_user_id_mouseover = false;
    let viewport: Box;
    // Slightly hacky: uses `x` and `y` from the higher scope
    function drawChatLine(msg: ChatMessage, alpha: number): void {
      if (msg.hidden) {
        return;
      }
      let h = msg.msg_h;
      let do_mouseover = do_scroll_area && !input.mousePosIsTouch() && (!msg.style || messageFromUser(msg));
      let mouseover = false;
      if (do_mouseover) {
        mouseover = input.mouseOver({
          x, y,
          w: msg.msg_w,
          h,
          // mouseOver peek because we're doing it before checking for clicks
          peek: true,
        });
      }

      self.handled_rightclick = false;
      self.focus_tooltip = '';
      // Draw the actual text
      markdownDraw({
        x, y, z: z + 1,
        cache: msg.cache,
        viewport,
        alpha,
      });

      if (mouseover && (!do_scroll_area || y > self.scroll_area.getScrollPos() - font_height) &&
        // Only show tooltip for user messages or links
        (!msg.style || messageFromUser(msg) || self.focus_tooltip)
      ) {
        drawTooltip({
          x, y, z: Z.TOOLTIP,
          tooltip_above: true,
          tooltip_width: 450 * UI_SCALE,
          tooltip_pad: round(uiGetTooltipPad() * 0.5),
          tooltip: `Received${msg.id ? ` from "${msg.id}"` : ''} on ${conciseDate(new Date(msg.timestamp))}` +
            `${self.focus_tooltip ? `\n${self.focus_tooltip}` : ''}` +
            `${!self.handled_rightclick ? '\nRight-click to copy message' : ''}`,
          pixel_scale: uiGetTooltipPanelPixelScale() * 0.5,
        });
      }
      // Previously: mouseDownEdge because by the time the Up happens, the chat text might not be here anymore
      let longpress = !self.handled_rightclick && input.longPress({ x, y, w: wrap_w, h });
      let click = !self.handled_rightclick && input.click({ x, y, w: wrap_w, h, button: 2 });
      if (longpress || click) {
        self.copyMessage(msg);
      }
      anything_visible = true;
    }


    let now = Date.now();
    if (do_scroll_area) {
      // within scroll area, just draw visible parts
      let scroll_internal_h = this.total_h;
      if (opts.cuddly_scroll) {
        let new_y = y1 - border;
        scroll_internal_h += new_y - y;
        y = new_y;
      }
      scroll_internal_h += scroll_grow;
      y += scroll_grow;
      let scroll_y0 = opts.always_scroll ? y0 + border - scroll_grow : y - min(this.h, scroll_internal_h);
      let scroll_external_h = y - scroll_y0;
      let clip_offs = 1; // for font outline
      this.scroll_area.begin({
        x: x - clip_offs,
        y: scroll_y0, z,
        w: inner_w + clip_offs,
        h: scroll_external_h,
        focusable_elem: this.edit_text_entry,
        auto_hide: this.total_h <= 2 * font_height,
      });
      let x_save = x;
      let y_save = y;
      x = clip_offs;
      y = 0;
      let y_min = this.scroll_area.getScrollPos();
      let y_max = y_min + scroll_external_h;
      viewport = {
        x: clip_offs,
        y: y_min,
        w: inner_w,
        h: scroll_external_h,
      };
      for (let ii = 0; ii < this.msgs.length; ++ii) {
        let msg = this.msgs[ii];
        let h = msg.msg_h;
        if (y <= y_max && y + h >= y_min) {
          drawChatLine(msg, 1);
        }
        y += h;
      }
      this.scroll_area.end(scroll_internal_h);
      x = x_save;
      y = y_save - scroll_external_h + scroll_grow;
      // Eat mouse events (not handled by above) in the scroll area to prevent unfocusing
      input.mouseDownEdge({ x: x0, y: y - border, w: outer_w, h: y1 - y + border });
      // But a click should dismiss it (important on fullscreen touch UI!)
      if (input.mouseUpEdge({ x: x0, y: y - border, w: outer_w, h: y1 - y + border,
        in_event_cb: opts.pointerlock ? input.pointerLockEnter : null })
      ) {
        spotUnfocus();
        is_focused = false;
      }
      // Also prevent mouseover from going to anything beneat it
      input.mouseOver({ x: x0, y: y - border, w: outer_w, h: y1 - y + border });
      // Also a mouse down anywhere outside of the chat UI should dismiss it
      if (is_focused && input.mouseDownEdge({ peek: true })) {
        // On touch, tapping doesn't always remove focus from the edit box!
        // Maybe this logic should be in the editbox logic?
        spotUnfocus();
        is_focused = false;
      }
    } else {
      // Just recent entries, fade them out over time
      const { max_lines } = this;
      let max_h = max_lines * font_height;
      viewport = {
        x,
        y: y - max_h,
        w: this.w,
        h: max_h,
      };
      for (let ii = 0; ii < this.msgs.length; ++ii) {
        let msg = this.msgs[this.msgs.length - ii - 1];
        let age = now - msg.timestamp;
        let alpha = 1 - clamp((age - this.fade_start_time[hide_light]) / this.fade_time[hide_light], 0, 1);
        if (!alpha || msg.quiet) {
          break;
        }
        let msg_h = msg.msg_h;
        max_h -= msg_h;
        y -= msg_h;
        drawChatLine(msg, alpha);
        if (y <= viewport.y) {
          break;
        }
      }
      y = max(y, viewport.y);
    }

    if (!this.did_user_id_mouseover) {
      this.user_id_mouseover = null;
    }

    if (opts.pointerlock && is_focused && input.pointerLocked()) {
      // Gained focus undo pointerlock
      input.pointerLockExit();
    }

    if (!anything_visible && (isMenuUp() || hide_light)) {
      return;
    }
    drawRect(x0, y - border, x0 + outer_w, y1, z, [0.3,0.3,0.3,0.8]);
  }

  setChannel(channel: ClientChannelWorker | null): void {
    if (channel === this.channel) {
      return;
    }
    if (this.channel) {
      if (!channel) {
        this.addChat(`Left channel ${this.channel.channel_id}`);
      }
      this.channel.removeMsgHandler('chat', this.on_chat);
      this.channel.removeMsgHandler('join', this.on_join);
      this.channel.removeMsgHandler('leave', this.on_leave);
      netSubs().serverLogSetExtraData(null);
    }
    this.channel = channel;
    if (!channel) {
      return;
    }
    netSubs().serverLogSetExtraData({
      channel_id: channel.channel_id,
    });
    // joining a new one, clear first
    this.clearChat();
    channel.onMsg('chat', this.on_chat);
    channel.onMsg('join', this.on_join);
    channel.onMsg('leave', this.on_leave);
    let chat_history: ChatHistoryData | undefined;
    let here: string[] = [];
    let here_map: TSMap<string> = {};
    let friends: string[] = [];
    asyncParallel([
      (next) => {
        channel.send('chat_get', null, (err?: string | null, data?: ChatHistoryData | null) => {
          if (!err && data && data.msgs && data.msgs.length) {
            chat_history = data;
          }
          next();
        });
      },
      (next) => {
        channel.onceSubscribe((data: ClientChannelWorkerData) => {
          let clients = data && data.public && data.public.clients;
          if (clients) {
            for (let client_id in clients) {
              let client = clients[client_id]!;
              let user_id = client.ids && client.ids.user_id;
              let already_in_list = false;
              if (user_id && client.ids.display_name) {
                if (here_map[user_id]) {
                  already_in_list = true;
                } else {
                  here_map[user_id] = client.ids.display_name;
                }
              }
              if (client_id === netClientId() || already_in_list) {
                continue;
              }
              if (client.ids) {
                if (user_id && isFriend(user_id)) {
                  friends.push(client.ids.display_name || user_id || client_id);
                } else {
                  here.push(client.ids.display_name || user_id || client_id);
                }
              }
            }
          }
          next();
        });
      },
    ], () => {
      if (!this.channel) {
        // disconnected/left already
        return;
      }
      // First display chat history
      if (chat_history) {
        let messages_pre = this.msgs.slice(0);
        if (messages_pre.length) {
          this.msgs = [];
        }
        for (let ii = 0; ii < chat_history.msgs.length; ++ii) {
          let idx = (chat_history.idx + ii) % chat_history.msgs.length;
          let elem = chat_history.msgs[idx] as ChatMessageDataBroadcast;
          if (elem && elem.msg) {
            elem.quiet = true;
            if (elem.id && here_map[elem.id] && !(elem.flags & ~CHAT_USER_FLAGS)) {
              elem.display_name = here_map[elem.id];
            }
            this.onMsgChat(elem);
          }
        }
        if (messages_pre.length) {
          // Sort the history so it is before any other messages received in the meantime
          this.msgs = this.msgs.concat(messages_pre);
        }
      }

      // Then join message
      this.addChat(`Joined channel ${this.channel.channel_id}`, 'join_leave');
      // Then who's here now
      if (here.length || friends.length) {
        let msg = [];
        if (here.length) {
          here = here.map(mdEscape);
          if (here.length > 10) {
            msg.push(`Other users already here: ${here.slice(0, 10).join(', ')} (and ${here.length - 10} more...)`);
          } else {
            msg.push(`Other users already here: ${here.join(', ')}`);
          }
        }
        if (friends.length) {
          msg.push(`Friends already here: ${friends.map(mdEscape).join(', ')}`);
        }
        this.addChatFiltered({
          msg: msg.join('\n'),
          style: 'join_leave',
        });
      }
    });
  }

  registerCmdHandlers(): void {
    cmd_parse.registerValue('volume_chat_joinleave', {
      type: cmd_parse.TYPE_FLOAT,
      label: 'Join/Leave chat message volume',
      range: [0,1],
      get: () => this.volume_join_leave,
      set: (v: number) => (this.volume_join_leave = v),
      store: true,
    });
    cmd_parse.registerValue('volume_chat_in', {
      type: cmd_parse.TYPE_FLOAT,
      label: 'Incoming chat message volume',
      range: [0,1],
      get: () => this.volume_in,
      set: (v: number) => (this.volume_in = v),
      store: true,
    });
    cmd_parse.registerValue('volume_chat_out', {
      type: cmd_parse.TYPE_FLOAT,
      label: 'Outgoing chat message volume',
      range: [0,1],
      get: () => this.volume_out,
      set: (v: number) => (this.volume_out = v),
      store: true,
    });
  }
}
export type { ChatUI };

export function chatUICreate(params: ChatUIParam): ChatUI {
  profanityStartup();
  let chat_ui = new ChatUI(params);
  function emote(str: string, resp_func: CmdRespFunc): void {
    if (!str) {
      return void resp_func(null, 'Usage: /me does something.');
    }

    if (params.emote_cb) {
      params.emote_cb(str);
    }

    chat_ui.sendChat(CHAT_FLAG_EMOTE, str);
  }
  chat_ui.registerCmdHandlers();
  cmd_parse.register({
    cmd: 'me',
    help: 'Sends a message emoting an action. Can also perform animated emotes.',
    usage: '$HELP\n  Example: /me jumps up and down!\n' +
    '    /me waves\n' +
    '    /me sits',
    func: emote,
  });
  // Also alias /em
  cmd_parse.register({
    access_show: ['hidden'],
    cmd: 'em',
    func: emote,
  });
  cmd_parse.register({
    cmd: 'echo',
    help: 'Echo text locally',
    func: (str: string, resp_func: CmdRespFunc) => {
      chat_ui.addChatFiltered({ msg: str });
      resp_func();
    },
  });
  cmd_parse.register({
    cmd: 'csr_all',
    access_run: ['sysadmin'],
    help: '(Admin) Run a command as all users in the current channel',
    prefix_usage_with_help: true,
    usage: '  /csr_all command\n' +
      'Example: /csr_all me bows down',
    func: function (str: string, resp_func: CmdRespFunc) {
      if (!(chat_ui.channel && chat_ui.channel.numSubscriptions())) {
        return void resp_func('Must be in a channel');
      }
      let clients = chat_ui.channel.data.public?.clients || {};
      let count = 0;
      for (let client_id in clients) {
        let ids = clients[client_id]!.ids;
        if (ids?.user_id) {
          let cmd = str;
          let pak = netSubs().getChannelImmediate(`user.${ids.user_id}`).pak('csr_admin_to_user');
          pak.writeJSON(cmd_parse.last_access);
          pak.writeString(cmd);
          pak.writeAnsiString(client_id);
          pak.send(chat_ui.handle_cmd_parse);
          ++count;
        }
      }
      resp_func(null, `Sent command to ${count} user(s)`);
    }
  });
  cmd_parse.register({
    cmd: 'csr',
    access_run: ['csr'],
    help: '(CSR) Run a command as another user',
    prefix_usage_with_help: true,
    usage: '  /csr UserID command\n' +
      'Example: /csr jimbly gems -100',
    func: function (str: string, resp_func: CmdRespFunc) {
      let idx = str.indexOf(' ');
      if (idx === -1) {
        return void resp_func('Invalid number of arguments');
      }
      let user_id = str.slice(0, idx);
      let desired_client_id = '';
      if (chat_ui.channel && chat_ui.channel.numSubscriptions()) {
        let clients = chat_ui.channel.data.public?.clients || {};
        for (let client_id in clients) {
          let ids = clients[client_id]!.ids;
          if (ids?.user_id === user_id) {
            desired_client_id = client_id;
          }
        }
      }

      let cmd = str.slice(idx + 1);
      let pak = netSubs().getChannelImmediate(`user.${user_id}`).pak('csr_admin_to_user');
      pak.writeJSON(cmd_parse.last_access);
      pak.writeString(cmd);
      pak.writeAnsiString(desired_client_id);
      pak.send(resp_func);
    }
  });

  return chat_ui;
}
