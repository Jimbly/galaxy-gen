// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

const camera2d = require('./camera2d.js');
const engine = require('./engine.js');
const glov_input = require('./input.js');
const glov_ui = require('./ui.js');

const { focuslog } = glov_ui;

class GlovUIEditBox {
  constructor(params) {
    this.x = 0;
    this.y = 0;
    this.z = Z.UI; // actually in DOM, so above everything!
    this.w = glov_ui.button_width;
    this.type = 'text';
    this.allow_modal = false;
    // this.h = glov_ui.button_height;
    this.font_height = glov_ui.font_height;
    this.text = '';
    this.placeholder = '';
    this.max_len = 0;
    this.zindex = null;
    this.initial_focus = false;
    this.onetime_focus = false;
    this.auto_unfocus = false;
    this.initial_select = false;
    this.spellcheck = true;
    this.esc_clears = true;
    this.multiline = 0;
    this.applyParams(params);

    this.is_focused = false;
    this.elem = null;
    this.input = null;
    this.submitted = false;
    this.pointer_lock = false;
    this.last_frame = 0;
  }
  applyParams(params) {
    if (!params) {
      return;
    }
    for (let f in params) {
      this[f] = params[f];
    }
  }
  getText() {
    return this.text;
  }
  setText(new_text) {
    if (this.input) {
      this.input.value = new_text;
    }
    this.text = new_text;
  }
  focus() {
    if (this.input) {
      this.input.focus();
    } else {
      this.onetime_focus = true;
    }
    glov_ui.focusSteal(this);
    this.is_focused = true;
    if (this.pointer_lock && glov_input.pointerLocked()) {
      glov_input.pointerLockExit();
    }
  }
  unfocus() {
    glov_ui.focusNext(this);
  }
  isFocused() { // call after .run()
    return this.is_focused;
  }

  updateFocus() {
    let was_glov_focused = this.is_focused;
    let glov_focused = glov_ui.focusCheck(this);
    let dom_focused = this.input && document.activeElement === this.input;
    if (was_glov_focused !== glov_focused) {
      // something external (from clicks/keys in GLOV) changed, apply it if it doesn't match
      if (glov_focused && !dom_focused && this.input) {
        focuslog('GLOV focused, DOM not, focusing', this);
        this.input.focus();
      }
      if (!glov_focused && dom_focused) {
        focuslog('DOM focused, GLOV not, and changed, blurring', this);
        this.input.blur();
      }
    } else if (dom_focused && !glov_focused) {
      focuslog('DOM focused, GLOV not, stealing', this);
      glov_ui.focusSteal(this);
      glov_focused = true;
    } else if (!dom_focused && glov_focused) {
      // Leave it alone, it may be a browser pop-up such as for passwords
    }
    let focused = glov_focused;

    if (focused) {
      let key_opt = (this.pointer_lock && !this.text) ? { in_event_cb: glov_input.pointerLockEnter } : null;
      if (glov_input.keyUpEdge(glov_input.KEYS.ESC, key_opt)) {
        if (this.text && this.esc_clears) {
          this.setText('');
        } else {
          glov_ui.focusCanvas();
          if (this.input) {
            this.input.blur();
          }
          focused = false;
          this.canceled = true;
        }
      }
    }
    this.is_focused = focused;
    return focused;
  }

  run(params) {
    this.applyParams(params);

    if (this.last_frame !== engine.frame_index - 1) {
      // it's been more than a frame, we must have not been running, discard async events
      this.submitted = false;
    }
    this.last_frame = engine.frame_index;

    this.canceled = false;
    let focused = this.updateFocus();

    glov_ui.this_frame_edit_boxes.push(this);
    let elem = glov_ui.getElem(this.allow_modal, this.elem);
    if (elem !== this.elem) {
      if (elem) {
        // new DOM element, initialize
        elem.textContent = '';
        let form = document.createElement('form');
        form.setAttribute('autocomplete', 'off');
        let input = document.createElement(this.multiline ? 'textarea' : 'input');
        input.setAttribute('autocomplete', `auto_off_${Math.random()}`);
        input.setAttribute('type', this.type);
        input.setAttribute('placeholder', this.placeholder);
        if (this.max_len) {
          input.setAttribute('maxLength', this.max_len);
        }
        if (this.multiline) {
          input.setAttribute('rows', this.multiline);
        }
        input.setAttribute('tabindex', 2);
        form.addEventListener('submit', (ev) => {
          ev.preventDefault();
          this.submitted = true;
          this.text = this.input.value;
          if (this.pointer_lock && !this.text) {
            glov_input.pointerLockEnter('edit_box_submit');
          }
        }, true);
        form.appendChild(input);
        let span = document.createElement('span');
        span.setAttribute('tabindex', 3);
        form.appendChild(span);
        elem.appendChild(form);
        input.value = this.text;
        this.input = input;
        if (this.initial_focus || this.onetime_focus) {
          input.focus();
          this.onetime_focus = false;
        }
        if (this.initial_select) {
          input.select();
        }
      } else {
        this.input = null;
      }
      this.submitted = false;
      this.elem = elem;
    } else {
      if (this.input) {
        this.text = this.input.value;
      }
    }
    if (elem) {
      let pos = camera2d.htmlPos(this.x, this.y);
      if (!this.spellcheck) {
        elem.spellcheck = false;
      }
      elem.style.left = `${pos[0]}%`;
      elem.style.top = `${pos[1]}%`;
      let size = camera2d.htmlSize(this.w, 0);
      elem.style.width = `${size[0]}%`;
      let old_fontsize = elem.style.fontSize || '?px';
      let new_fontsize = `${camera2d.virtualToFontSize(this.font_height).toFixed(0)}px`;
      if (new_fontsize !== old_fontsize) {
        elem.style.fontSize = new_fontsize;
      }
      if (this.zindex) {
        elem.style['z-index'] = this.zindex;
      }
    }

    if (focused) {
      if (this.auto_unfocus) {
        if (glov_input.click({ peek: true })) {
          glov_ui.focusSteal('canvas');
        }
      }
      // keyboard input is handled by the INPUT element, but allow mouse events to trickle
      glov_input.eatAllKeyboardInput();
    }
    // Eat mouse events going to the edit box
    glov_input.mouseConsumeClicks({ x: this.x, y: this.y, w: this.w, h: this.font_height });

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

export function create(params) {
  return new GlovUIEditBox(params);
}
