// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

exports.create = editBoxCreate; // eslint-disable-line @typescript-eslint/no-use-before-define

import assert from 'assert';
import {
  clamp,
  trimEnd,
} from 'glov/common/util';
import * as verify from 'glov/common/verify';
import { v2same } from 'glov/common/vmath';
import * as camera2d from './camera2d';
import * as engine from './engine';
import {
  KEYS,
  eatAllKeyboardInput,
  inputClick,
  inputTouchMode,
  keyDownEdge,
  keyUpEdge,
  mouseConsumeClicks,
  pointerLockEnter,
  pointerLockExit,
  pointerLocked,
} from './input';
import { getStringIfLocalizable } from './localization';
import {
  spotFocusCheck,
  spotFocusSteal,
  spotSuppressKBNav,
  spotUnfocus,
  spotlog,
} from './spot';
import {
  drawLine,
  drawRect,
  getUIElemData,
  uiButtonWidth,
  uiGetDOMElem,
  uiGetDOMTabIndex,
  uiGetFont,
  uiTextHeight,
} from './ui';

const { round } = Math;

let form_hook_registered = false;
let active_edit_box;
let active_edit_box_frame;

let this_frame_edit_boxes = [];
let last_frame_edit_boxes = [];

export function editBoxTick() {
  let expected_last_frame = engine.frame_index - 1;
  for (let ii = 0; ii < last_frame_edit_boxes.length; ++ii) {
    let edit_box = last_frame_edit_boxes[ii];
    if (edit_box.last_frame < expected_last_frame) {
      edit_box.unrun();
    }
  }
  last_frame_edit_boxes = this_frame_edit_boxes;
  this_frame_edit_boxes = [];
}

function setActive(edit_box) {
  active_edit_box = edit_box;
  active_edit_box_frame = engine.frame_index;
  let virt = [0,0];
  const REQ_PAD = 20;
  camera2d.domDeltaToVirtual(virt, [0, REQ_PAD]);
  let padding = camera2d.y1() - (edit_box.y + edit_box.h);
  if (padding < virt[1]) {
    engine.setEditBoxNearBottom(REQ_PAD);
  }
}

export function editBoxAnyActive() {
  return active_edit_box && active_edit_box_frame >= engine.frame_index - 1;
}

let osk_elem;
let osk_timeout;
function showOnscreenKeyboardCleanup() {
  if (osk_timeout) {
    clearTimeout(osk_timeout);
    osk_timeout = null;
    document.body.removeChild(osk_elem);
    osk_elem = null;
  }
}
function showOnscreenKeyboardInEvent() {
  // Derived from: https://stackoverflow.com/questions/71826145/show-keyboard-on-input-focus-without-user-action
  if (!osk_elem) {
    osk_elem = document.createElement('input');
    osk_elem.setAttribute('type', 'search');
    osk_elem.setAttribute('style', 'position: fixed; top: -100px; left: -100px;');
    document.body.appendChild(osk_elem);
    osk_timeout = setTimeout(showOnscreenKeyboardCleanup, 1000);
  }
  osk_elem.focus();
}

export function showOnscreenKeyboard() {
  return inputTouchMode() || true ? showOnscreenKeyboardInEvent : undefined;
}

function formHook(ev) {
  ev.preventDefault();

  if (!editBoxAnyActive()) {
    return;
  }
  active_edit_box.submitted = true;
  active_edit_box.updateText();
  if (active_edit_box.pointer_lock && !active_edit_box.text) {
    pointerLockEnter('edit_box_submit');
  }
}

function charIdxToXY(text, offset) {
  offset = clamp(offset, 0, text.length); // IE returns selectionStart/end out of bounds
  let lines = text.split('\n');
  let linenum = 0;
  while (linenum < lines.length) {
    let line = lines[linenum];
    if (offset <= line.length) {
      return [offset, linenum];
    }
    offset -= line.length;
    assert(offset > 0);
    offset--; // newline
    linenum++;
  }
  verify(false);
  return [0, linenum];
}

let last_key_id = 0;

class GlovUIEditBox {
  constructor(params) {
    this.key = `eb${++last_key_id}`;
    this.x = 0;
    this.y = 0;
    this.z = Z.UI; // actually in DOM, so above everything!
    this.w = uiButtonWidth();
    this.type = 'text';
    // this.h = uiButtonHeight();
    this.font_height = uiTextHeight();
    this.last_set_text = '';
    this.text = '';
    this.placeholder = '';
    this.max_len = 0;
    this.max_visual_size = null;
    this.zindex = null;
    this.uppercase = false;
    this.initial_focus = false;
    this.onetime_focus = false;
    this.auto_unfocus = true;
    this.focus_steal = false;
    this.initial_select = false;
    this.spellcheck = true;
    this.esc_clears = true;
    this.esc_unfocuses = true;
    this.multiline = 0;
    this.enforce_multiline = true;
    this.suppress_up_down = false;
    this.autocomplete = false;
    this.center = false;
    this.sticky_focus = true;
    this.canvas_render = null;
    this.applyParams(params);
    assert.equal(typeof this.text, 'string');

    this.last_autocomplete = null;
    this.last_placeholder = null;
    this.is_focused = false;
    this.elem = null;
    this.input = null;
    this.submitted = false;
    this.pointer_lock = false;
    this.last_frame = 0;
    this.out = {}; // Used by spotFocusCheck
    this.last_valid_state = {
      sel_start: 0,
      sel_end: 0,
    };
    this.resetCSSCaching();
    this.had_overflow = false;
  }
  resetCSSCaching() {
    this.last_tab_index = -1;
    this.last_font_size = '';
    this.last_clip_path = '';
  }
  applyParams(params) {
    if (!params) {
      return;
    }
    for (let f in params) {
      if (f !== 'text') {
        this[f] = params[f];
      }
    }
    if (params.text && params.text !== this.last_set_text) {
      this.setText(params.text);
    }
    this.h = (this.multiline || 1) * this.font_height;
  }
  getSelection() {
    return [charIdxToXY(this.text, this.input.selectionStart), charIdxToXY(this.text, this.input.selectionEnd)];
  }
  setSelectionRange(sel_start, sel_end) {
    // if (this.type === 'number') {
    //   this.input.type = 'text';
    // }
    this.input.setSelectionRange(sel_start, sel_end);
    // if (this.type === 'number') {
    //   this.input.type = 'number';
    // }
  }

  updateText() {
    const { input } = this;
    if (!input) {
      return;
    }
    let new_text = input.value;
    let saved_new_text = new_text;
    let sel_start = input.selectionStart;
    let sel_end = input.selectionEnd;
    if (new_text === this.text) {
      this.last_valid_state.sel_start = sel_start;
      this.last_valid_state.sel_end = sel_end;
      return;
    }
    const { multiline, enforce_multiline, max_len, max_visual_size } = this;
    // text has changed, validate
    let valid = true;

    let old_text = this.text;
    function debug(msg) {
      if (engine.defines.EDITBOX) {
        console.log(`Editbox (multiline=${multiline}, max_len=${max_len}: ${engine.frame_index}: ${msg}`);
        console.log(`  Old sel range = [${sel_start},${sel_end}]`);
        console.log(`  New sel range = [${input.selectionStart},${input.selectionEnd}]`);
        console.log(`  Old text         = ${JSON.stringify(old_text)}`);
        console.log(`  Desired new text = ${JSON.stringify(saved_new_text)}`);
        console.log(`  New text         = ${JSON.stringify(new_text)}`);
      }
    }

    if (enforce_multiline && multiline && new_text.split('\n').length > multiline) {
      // If trimming would help, trim the text, and update, preserving current selection
      // Otherwise, will revert to last good state
      // does trimming help?
      if (trimEnd(new_text).split('\n').length <= multiline) {
        while (new_text.split('\n').length > multiline) {
          if (new_text[new_text.length-1].match(/\s/)) {
            new_text = new_text.slice(0, -1);
          }
        }
        if (this.text === new_text) {
          // we presumably just trimmed off what they inserted, treat as error
          // Except, if the new selection point is valid, they probably inserted
          //   a blank line at the end (and a *different* one got trimmed), so
          //   let that through
          if (sel_end <= new_text.length) {
            input.value = new_text;
            this.setSelectionRange(sel_start, sel_end);
            debug('trimming helped to keep selection');
          } else {
            valid = false;
            debug('trimmed equal orig');
          }
        } else {
          input.value = new_text;
          this.setSelectionRange(sel_start, sel_end);
          debug('trimming helped');
        }
      } else {
        valid = false;
        debug('trimmed too long');
      }
    }

    if (max_len > 0 || max_visual_size) {
      // If just max_visual_size, use infinite max_len
      let eff_max_len = max_len || Infinity;
      let lines = multiline ? new_text.split('\n') : [new_text];
      for (let ii = 0; ii < lines.length; ++ii) {
        let line = lines[ii];
        let over = line.length > eff_max_len;
        let font = max_visual_size ? uiGetFont() : null;
        if (max_visual_size && !over) {
          over = font.getStringWidth(null, max_visual_size.font_height, line) > max_visual_size.width;
        }
        let trimmed = trimEnd(line);
        let trim_over = over && trimmed.length > eff_max_len;
        if (max_visual_size && over && !trim_over) {
          trim_over = font.getStringWidth(null,
            max_visual_size.font_height, trimmed) > max_visual_size.width;
        }
        if (max_visual_size && over && trim_over &&
          // was it over by 2 or more characters?  Probably just pasted, do a truncate instead of reject
          font.getStringWidth(null,
            max_visual_size.font_height, line.slice(0, -2)) > max_visual_size.width
        ) {
          while (trimmed.length && font.getStringWidth(null,
            max_visual_size.font_height, trimmed) > max_visual_size.width
          ) {
            trimmed = trimmed.slice(0, -1);
            trim_over = false;
          }
        }

        if (over) {
          if (!trim_over) {
            let old_line_end_pos = lines.slice(0, ii+1).join('\n').length;
            lines[ii] = trimmed;
            let new_line_end_pos = lines.slice(0, ii+1).join('\n').length;
            new_text = lines.join('\n');
            let shift = old_line_end_pos - new_line_end_pos;
            if (sel_start > old_line_end_pos) {
              sel_start -= shift;
            } else if (sel_start > new_line_end_pos) {
              sel_start = new_line_end_pos;
            }
            if (sel_end >= old_line_end_pos) {
              sel_end -= shift;
            } else if (sel_end > new_line_end_pos) {
              sel_end = new_line_end_pos;
            }
            input.value = new_text;
            this.setSelectionRange(sel_start, sel_end);
            debug('over but not trim_over; updating text and sel');
          } else {
            valid = false;
            debug('invalid: over');
          }
        }
      }
    }
    if (!valid) {
      let old_was_invalid = false;
      if (max_len > 0 || max_visual_size) {
        let eff_max_len = max_len || Infinity;
        let lines = multiline ? this.text.split('\n') : [this.text];
        for (let ii = 0; ii < lines.length; ++ii) {
          let line = lines[ii];
          if (line.length > eff_max_len) {
            old_was_invalid = true;
          }
          if (max_visual_size && !old_was_invalid) {
            old_was_invalid = uiGetFont().getStringWidth(null, max_visual_size.font_height, line) >
              max_visual_size.width;
          }
        }
      }
      if (old_was_invalid) {
        // we're invalid, but it was also invalid to start!  let edit through if shorter
        if (new_text.length < this.text.length) {
          valid = true;
        }
      }
    }
    if (!valid) {
      // revert!
      this.had_overflow = true;
      input.value = this.text;
      this.setSelectionRange(this.last_valid_state.sel_start, this.last_valid_state.sel_end);
      debug(`invalid: reset sel range to [${this.last_valid_state.sel_start}, ${this.last_valid_state.sel_end}]`);
    } else {
      this.text = new_text;
      this.last_valid_state.sel_start = sel_start;
      this.last_valid_state.sel_end = sel_end;
    }
  }
  getText() {
    return this.text;
  }
  hadOverflow() {
    let ret = this.had_overflow;
    this.had_overflow = false;
    return ret;
  }
  setText(new_text) {
    new_text = String(new_text);

    // sanitize if appropriate
    const { max_len, max_visual_size, multiline } = this;
    let font = max_visual_size ? uiGetFont() : null;
    if (max_len > 0 && max_visual_size) {
      let lines = multiline ? new_text.split('\n') : [new_text];
      for (let ii = 0; ii < lines.length; ++ii) {
        let line = lines[ii];
        if (max_len > 0) {
          if (line.length > max_len) {
            line = trimEnd(line);
          }
          if (line.length > max_len) {
            line = line.slice(0, max_len);
          }
        }
        if (max_visual_size) {
          while (line.length && font.getStringWidth(null, max_visual_size.font_height, line) > max_visual_size.width) {
            line = line.slice(0, line.length - 1);
          }
        }
        lines[ii] = line;
      }
      new_text = lines.join('\n');
    }

    let input = this.input;
    if (input && input.value !== new_text) {
      if (engine.defines.EDITBOX) {
        console.log(`Editbox (multiline=${multiline}, max_len=${max_len}: ${engine.frame_index}: setText()`);
        console.log(`  Sel range = [${input.selectionStart},${input.selectionEnd}]`);
        console.log(`  Old text         = ${JSON.stringify(input.value)}`);
        console.log(`  New text         = ${JSON.stringify(new_text)}`);
      }
      input.value = new_text;
    }
    this.text = new_text;
    this.last_set_text = new_text;
  }
  focus() {
    if (this.input) {
      this.input.focus();
      showOnscreenKeyboardCleanup();
      if (this.select_on_focus) {
        this.input.select();
      }
      setActive(this);
    } else {
      this.onetime_focus = true;
    }
    spotFocusSteal(this);
    this.is_focused = true;
    if (this.pointer_lock && pointerLocked()) {
      pointerLockExit();
    }
  }
  unfocus() {
    spotUnfocus();
  }
  isFocused() { // call after .run()
    return this.is_focused;
  }

  updateFocus(is_reset) {
    let was_glov_focused = this.is_focused;
    let spot_ret = spotFocusCheck(this);
    let { focused } = spot_ret;
    let dom_focused = this.input && document.activeElement === this.input;
    if (was_glov_focused !== focused) {
      // something external (from clicks/keys in GLOV) changed, apply it if it doesn't match
      if (focused && !dom_focused) {
        spotlog('GLOV focused, DOM not, focusing', this);
        if (this.input) {
          this.input.focus();
          showOnscreenKeyboardCleanup();
          if (this.select_on_focus) {
            this.input.select();
          }
        } else {
          this.onetime_focus = true;
        }
      }
      if (!focused && dom_focused) {
        spotlog('DOM focused, GLOV not, and changed, blurring', this);
        this.input.blur();
      }
    } else if (dom_focused && !focused) {
      spotlog('DOM focused, GLOV not, stealing', this);
      spotFocusSteal(this);
      if (this.input && this.select_on_focus) {
        this.input.select();
      }
      focused = true;
    } else if (!dom_focused && focused) {
      if (is_reset) {
        // Just appeared this frame, steal DOM focus
        this.onetime_focus = true;
        spotlog('GLOV focused, DOM not, new edit box, focusing', this);
      } else if (document.activeElement === engine.canvas || document.activeElement === this.postspan) {
        // focus explicitly on canvas or left our input element, lose focus
        spotlog('GLOV focused, DOM canvas focused, unfocusing', this);
        spotUnfocus();
      } else {
        // Leave it alone, it may be a browser pop-up such as for passwords
      }
    }

    if (focused) {
      setActive(this);
      let key_opt = (this.pointer_lock && !this.text) ? { in_event_cb: pointerLockEnter } : null;
      if ((this.esc_clears || this.esc_unfocuses) && keyUpEdge(KEYS.ESC, key_opt)) {
        if (this.text && this.esc_clears) {
          this.setText('');
        } else {
          spotUnfocus();
          if (this.input) {
            this.input.blur();
          }
          focused = false;
          this.canceled = true;
        }
      }
    }
    this.is_focused = focused;
    return spot_ret;
  }

  run(params) {
    this.applyParams(params);
    const {
      canvas_render,
      font_height,
      multiline,
      enforce_multiline,
      max_len,
    } = this;
    if (this.focus_steal) {
      this.focus_steal = false;
      this.focus();
      showOnscreenKeyboardCleanup();
    }

    let is_reset = false;
    if (!verify(this.last_frame !== engine.frame_index)) {
      // two calls on one frame (asserts in dev, silently do nothing otherwise?)
      return null;
    }
    if (this.last_frame !== engine.frame_index - 1) {
      // it's been more than a frame, we must have not been running, discard async events
      this.submitted = false;
      is_reset = true;
    }
    this.last_frame = engine.frame_index;

    this.canceled = false;
    let { allow_focus, focused } = this.updateFocus(is_reset);

    if (focused) {
      spotSuppressKBNav(true, Boolean(multiline || this.suppress_up_down));
    }

    const { text, x, y, z, w, h } = this;

    let clipped_rect = {
      x, y, w, h
    };
    if (allow_focus && !camera2d.clipTestRect(clipped_rect)) {
      allow_focus = false;
    }

    this_frame_edit_boxes.push(this);
    let elem = allow_focus && uiGetDOMElem(this.elem, true);
    if (elem !== this.elem) {
      this.resetCSSCaching();
      if (elem) {
        // new DOM element, initialize
        if (!form_hook_registered) {
          form_hook_registered = true;
          let form = document.getElementById('dynform');
          if (form) {
            form.addEventListener('submit', formHook, true);
          }
        }
        elem.textContent = '';
        let input = document.createElement(multiline ? 'textarea' : 'input');
        let classes = [];
        if (canvas_render) {
          classes.push('canvas_render');
        }
        if (multiline && max_len) {
          classes.push('fixed');
        }
        if (this.center) {
          classes.push('center');
        }
        input.className = classes.join(' ');
        // Use 'tel' instead of 'number', as it supports changing the selection
        let eff_type = this.type === 'number' ? 'tel' :
          // Using 'search' gets around Android Chrome bug showing the password box all the time on regular inputs
          this.type === 'text' && !this.autocomplete ? 'search' :
          this.type;
        input.setAttribute('type', eff_type);
        if (eff_type === 'search' && this.type !== 'search') {
          input.style['-webkit-appearance'] = 'none';
        }
        let placeholder = getStringIfLocalizable(this.placeholder);
        input.setAttribute('placeholder', placeholder);
        this.last_placeholder = placeholder;
        if (max_len) {
          if (multiline) {
            input.setAttribute('cols', max_len);
          } else {
            input.setAttribute('maxLength', max_len);
          }
        }
        if (multiline) {
          input.setAttribute('rows', multiline);
        }
        elem.appendChild(input);
        let span = document.createElement('span');
        this.postspan = span;
        elem.appendChild(span);
        input.value = this.text;
        if (this.uppercase) {
          input.style['text-transform'] = 'uppercase';
        }
        this.input = input;
        if (this.initial_focus || this.onetime_focus) {
          input.focus();
          showOnscreenKeyboardCleanup();
          setActive(this);
          this.onetime_focus = false;
        }
        if (this.initial_select) {
          input.select();
        }

        if (multiline && enforce_multiline || max_len) {
          // Do update _immediately_ so the DOM doesn't draw the invalid text, if possible
          const onChange = (e) => {
            this.updateText();
            return true;
          };
          input.addEventListener('keyup', onChange);
          input.addEventListener('keydown', onChange);
          input.addEventListener('change', onChange);
        }

      } else {
        this.input = null;
      }
      this.last_autocomplete = null;
      this.last_placeholder = null;
      this.submitted = false;
      this.elem = elem;
    } else {
      if (this.input) {
        this.updateText();
        this.last_set_text = this.text;
      }
    }
    if (elem) {
      let pos = camera2d.htmlPos(x, y);
      if (!this.spellcheck) {
        elem.spellcheck = false;
      }
      elem.style.left = `${pos[0]}%`;
      elem.style.top = `${pos[1]}%`;
      let size = camera2d.htmlSize(w, h);
      elem.style.width = `${size[0]}%`;
      elem.style.height = `${size[1]}%`;

      let clip_path = '';
      if (clipped_rect.x !== x ||
        clipped_rect.y !== y ||
        clipped_rect.w !== w ||
        clipped_rect.h !== h
      ) {
        // partially clipped
        let x0 = `${(clipped_rect.x - x)/w*100}%`;
        let x1 = `${(clipped_rect.x + clipped_rect.w - x)/w*100}%`;
        let y0 = `${(clipped_rect.y - y)/h*100}%`;
        let y1 = `${(clipped_rect.y + clipped_rect.w - y)/h*100}%`;
        clip_path = `polygon(${x0} ${y0}, ${x1} ${y0}, ${x1} ${y1}, ${x0} ${y1})`;
      } else {
        clip_path = '';
      }
      if (clip_path !== this.last_clip_path) {
        elem.style.clipPath = this.last_clip_path = clip_path;
      }

      let new_fontsize = `${camera2d.virtualToFontSize(font_height).toFixed(8)}px`;
      if (new_fontsize !== this.last_font_size) {
        this.last_font_size = new_fontsize;
        // elem.style.fontSize = new_fontsize;
        // Try slightly better smooth scaling from https://medium.com/autodesk-tlv/smooth-text-scaling-in-javascript-css-a817ae8cc4c9
        const preciseFontSize = camera2d.virtualToFontSize(font_height);  // Desired font size
        const roundedSize = Math.floor(preciseFontSize);
        const s = preciseFontSize / roundedSize; // Remaining scale
        elem.style.fontSize = `${roundedSize}px`;
        //const translate = `translate(${pos.x}px, ${pos.y}px)`;
        const scale = `translate(-50%, -50%)
                       scale(${s})
                       translate(50%, 50%)`;
        this.input.style.width = `${(1/s*100).toFixed(8)}%`;
        elem.style.transform = scale;
      }


      if (this.zindex) {
        elem.style['z-index'] = this.zindex;
      }
      if (this.last_autocomplete !== this.autocomplete) {
        this.last_autocomplete = this.autocomplete;
        this.input.setAttribute('autocomplete', this.autocomplete || `auto_off_${Math.random()}`);
      }
      let placeholder = getStringIfLocalizable(this.placeholder);
      if (this.last_placeholder !== placeholder) {
        this.input.setAttribute('placeholder', placeholder);
        this.last_placeholder = placeholder;
      }


      let tab_index1 = uiGetDOMTabIndex();
      let tab_index2 = uiGetDOMTabIndex();
      if (tab_index1 !== this.last_tab_index) {
        this.last_tab_index = tab_index1;
        this.input.setAttribute('tabindex', tab_index1);
        this.postspan.setAttribute('tabindex', tab_index2);
      }
    } else {
      this.resetCSSCaching();
    }

    if (focused) {
      if (this.auto_unfocus) {
        if (inputClick({ peek: true })) {
          spotUnfocus();
        }
      }
      // For IFRAMEs with `sandbox` not including `allow-form`, catch Enter ourselves
      if (keyDownEdge(KEYS.ENTER)) {
        this.submitted = true;
      }
      // keyboard input is handled by the INPUT element, but allow mouse events to trickle
      eatAllKeyboardInput();
    }
    // Eat mouse events going to the edit box
    mouseConsumeClicks({ x, y, w, h });

    if (canvas_render) {
      const { center } = this;
      const { char_width, char_height, color_selection, color_caret, style_text } = canvas_render;
      let font = uiGetFont();
      let lines = text.split('\n');
      // draw text
      // TODO: maybe apply clipper here?  caller necessarily needs to set max_len and multiline appropriately, though.
      let line_width = [];
      for (let ii = 0; ii < lines.length; ++ii) {
        let line = lines[ii];
        let line_w = font.draw({
          style: style_text,
          height: font_height,
          x, y: y + ii * char_height, z: z + 0.8,
          w,
          text: line,
          align: center ? font.ALIGN.HCENTER : undefined,
        });
        line_width.push(line_w);
      }
      if (focused) {
        // draw selection
        let selection = this.getSelection();
        if (!v2same(selection[0], selection[1])) {
          let first_row = selection[0][1];
          let last_row = selection[1][1];
          for (let jj = first_row; jj <= last_row; ++jj) {
            let line = lines[jj];
            let selx0 = jj === first_row ? selection[0][0] : 0;
            let selx1 = jj === last_row ? selection[1][0] : line && line.length || 1;
            let xoffs = center ? round((w - line_width[jj])/2) : 0;
            drawRect(x + char_width*selx0-1 + xoffs, y + jj * char_height,
              x + char_width*selx1 + xoffs, y + (jj + 1) * char_height, z + 0.75, color_selection);
          }
        } else {
          // draw caret
          let jj = selection[1][1];
          let caret_x = x + char_width*selection[1][0] - 1;
          if (center) {
            caret_x += round((w - line_width[jj])/2);
          }
          drawLine(caret_x, y + char_height*jj,
            caret_x, y + char_height*(jj + 1) - 1, z + 0.5, 1, 1, color_caret);
        }
      }
    }

    if (this.submitted) {
      this.submitted = false;
      return this.SUBMIT;
    }
    if (this.canceled) {
      this.canceled = false;
      return this.CANCEL;
    }
    return null;
  }
  unrun() {
    // remove from DOM or hide
    this.elem = null;
    this.input = null;
  }
}
GlovUIEditBox.prototype.SUBMIT = 'submit';
GlovUIEditBox.prototype.CANCEL = 'cancel';

export function editBoxCreate(params) {
  if (params.glov_initial_text !== undefined) {
    params.text = params.glov_initial_text;
  }
  return new GlovUIEditBox(params);
}

export function editBox(params, current) {
  params.glov_initial_text = current;
  let edit_box = getUIElemData('edit_box', params, editBoxCreate);
  let result = edit_box.run(params);

  return {
    result,
    text: edit_box.getText(),
    edit_box,
  };
}
