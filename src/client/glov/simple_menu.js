// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT
/* eslint complexity:off */

//////////////////////////////////////////////////////////////////////////
// GlovSimpleMenu is just a GlovSelectionBox plus some logic to activate
// callbacks/etc upon selecting of elements.

const assert = require('assert');
const camera2d = require('./camera2d.js');
const glov_engine = require('./engine.js');
const glov_input = require('./input.js');
const selection_box = require('./selection_box.js');
const glov_ui = require('./ui.js');
const { clamp, vec4 } = require('./vmath.js');

const { KEYS, PAD } = glov_input;

const color101010C8 = vec4(0x10/255, 0x10/255, 0x10/255, 0xC8/255);

class GlovSimpleMenu {
  constructor(params) {
    params = params || {};
    this.sel_box = selection_box.create(params);
    this.edit_index = -1;

    // Output members
    this.selected = -1; // actually selected/acted on, not just current highlight, like this.sel_box.selected
  }

  focus() {
    glov_ui.focusSteal(this.sel_box);
  }

  execItem(index, delta) {
    let { items } = this.sel_box;
    assert(index >= 0 && index < items.length);
    let menu_item = items[index];
    let force = false;
    if (delta === 2) {
      delta = 1;
      force = true;
    }
    if (menu_item.cb) {
      menu_item.cb();
    }
    if (!menu_item.state) {
      if (menu_item.value !== null && (menu_item.prompt_int || menu_item.prompt_string)) {
        // Open an edit box
        // menu.internal.mte = GlovModalTextEntry::createInt(simpleMenuFieldName(menu_item.name), *menu_item.value);
        this.internal.edit_index = index;
        // glovInputReleaseAll();
      } else if (menu_item.value !== null) {
        if (glov_input.keyDown(KEYS.SHIFT) && !force) {
          delta = -1;
        }
        menu_item.value += delta * menu_item.value_inc;
        if (menu_item.slider || menu_item.plus_minus) {
          // implicitly no wrapping, maybe make a separate flag for this?
          menu_item.value = clamp(menu_item.value, menu_item.value_min, menu_item.value_max);
        } else {
          if (menu_item.value < menu_item.value_min) {
            menu_item.value = menu_item.value_max;
          }
          if (menu_item.value > menu_item.value_max) {
            menu_item.value = menu_item.value_min;
          }
        }
        // TODO: some kind of callback on value change
      } else {
        // presumably tag or externally operated on, probably want to skip key repeat here too?
        // glovInputReleaseAll();
      }
    } else {
      glov_engine.setState(menu_item.state);
      // glovInputReleaseAll();
    }
  }

  run(params) {
    let { sel_box } = this;
    sel_box.applyParams(params); // Apply new list of items, positions, etc

    const { items, x, z } = sel_box;
    const y0 = sel_box.y;
    let exit_index = -1;
    for (let i = 0; i < items.length; ++i) {
      if (items[i].exit) {
        exit_index = i;
      }
    }

    // Check to see if any selection has an editBox open first
    let selbox_enabled = true;
    if (this.edit_index >= 0 && this.edit_index < items.length) {
      selbox_enabled = false;
      glov_ui.drawRect(camera2d.x0(), camera2d.y0(), camera2d.x1(), camera2d.y1(),
        z + 2, color101010C8);
      // TODO: Need modal text entry dialog
      // let ret = this.internal.mte.run(z + 3);

      // if (ret == 'ok') {
      //   if (items[this.edit_index].prompt_int) {
      //     items[this.edit_index].value = this.internal.mte.getInt();
      //   } else {
      //     items[this.edit_index].svalue = this.internal.mte.getString();
      //   }
      //   this.edit_index = -1;
      // } else if (ret == 'cancel') {
      //   this.edit_index = -1;
      // }
    }
    sel_box.disabled = !selbox_enabled;

    // Do all sliders, plus-minus-es - needs
    let display = sel_box.display;
    for (let ii = 0; ii < items.length; ii++) {
      let menu_item = items[ii];
      if (menu_item.slider) {
        let slider = menu_item.internal.slider;
        if (!slider) {
          // slider = menu_item.internal.slider = glov_slider.create();
        }
        slider.no_notches = true;
        // slider.sound_release = this.sound_accept;
        slider.disabled = menu_item.disabled;
        let slider_width = 160;
        let slider_x = x + sel_box.width - slider_width - 12;
        let v = menu_item.value - menu_item.value_min;
        let color = display.style_default.color;
        // if (display.style_default.color_mode == glov_font.COLOR_MODE.GRADIENT) {
        //   color = colorIntLerp(display.style_default.color, display.style_default.colorLR, 0.5);
        // }
        if (slider.disabled) {
          color = display.style_disabled.color;
        }
        v = slider.run({
          x: slider_x,
          y: y0 + ii * 24 + 2,
          z: z + 3,
          w: slider_width,
          // scale: 1,
          color,
          value: v,
          max: menu_item.value_max - menu_item.value_min
        });
        menu_item.value = v + menu_item.value_min;
        if (slider.rollover || slider.grabbed) {
          // expect our row to be selected
          if (sel_box.selected !== ii) {
            sel_box.selected = ii;
            glov_ui.playUISound('select');
          }
        }
      } else if (menu_item.plus_minus) {
        assert(typeof menu_item.value === 'number', 'plus_minus items require a numerical value');
        assert(menu_item.value_inc, 'plus_minus items require a value increment');
        let buttons_width = 60;
        let pad = 6;
        let button_width = (buttons_width - pad) / 2;
        let button_x = x + sel_box.width - buttons_width;
        let delta = 0;
        // if (!glovMasterControllerActive()) { // Don't show buttons if using a controller / no mouse
        if (glov_ui.buttonText({
          no_focus: true,
          x: button_x,
          y: y0 + ii * 24 + 2,
          z: z + 3,
          w: button_width,
          h: glov_ui.button_height * 0.66,
          text: '-'
        })) {
          delta = -1;
        }
        let minus_over = glov_ui.button_mouseover;
        if (glov_ui.buttonText({
          no_focus: true,
          x: button_x + pad + button_width,
          y: y0 + ii * 24 + 2,
          z: z + 3,
          w: button_width,
          h: glov_ui.button_height * 0.66,
          text: '+'
        })) {
          delta = 1;
        }
        let plus_over = glov_ui.button_mouseover;
        // } end if (!glovMasterControllerActive())
        if (delta) {
          menu_item.value += delta * menu_item.value_inc;
          menu_item.value = clamp(menu_item.value, menu_item.value_min, menu_item.value_max);
        }
        if (minus_over || plus_over) {
          // expect our row to be selected
          if (sel_box.selected !== ii) {
            sel_box.selected = ii;
            glov_ui.playUISound('select');
          }
        }
      }
    }

    let y = y0;
    y += sel_box.run();

    let selected=-1;
    if (exit_index !== -1 && (
      glov_input.keyDownEdge(KEYS.ESC) ||
      !items[exit_index].no_controller_exit && glov_input.padButtonDownEdge(PAD.CANCEL)
    )) {
      this.execItem(exit_index, 1);
      selected = exit_index;
    }
    // Only allow left/right to "select" a menu option if it's a toggle/increment
    // kind of menu option, otherwise this just feels weird
    let allow_left_right = items[sel_box.selected].value !== null;
    if (sel_box.was_clicked || sel_box.is_focused && (
      glov_input.keyDownEdge(KEYS.SPACE) ||
      glov_input.keyDownEdge(KEYS.ENTER) ||
      glov_input.padButtonDownEdge(PAD.SELECT))
    ) {
      this.execItem(sel_box.selected, 1);
      selected = sel_box.selected;
    }
    if (sel_box.is_focused && allow_left_right && (
      glov_input.keyDownEdge(KEYS.RIGHT) ||
      glov_input.keyDownEdge(KEYS.D) ||
      glov_input.padButtonDownEdge(PAD.RIGHT))
    ) {
      this.execItem(sel_box.selected, 2);
      selected = sel_box.selected;
    }
    if (sel_box.wasRightClicked || sel_box.is_focused && allow_left_right && (
      // This was UpHit before, some problem with it triggering an up on the next screen?  Should supress the next up
      // events after eating a down for UI?
      glov_input.keyDownEdge(KEYS.LEFT) ||
      glov_input.keyDownEdge(KEYS.A) ||
      glov_input.padButtonDownEdge(PAD.LEFT))
    ) {
      this.execItem(sel_box.selected, -1);
      selected = sel_box.selected;
    }
    this.selected = selected;
    if (selected !== -1 && !items[selected].no_sound) {
      if (items[selected].exit) {
        glov_ui.playUISound('cancel');
      } else {
        glov_ui.playUISound('select');
      }
    }

    return y - y0;
  }

  isSelected(tag_or_index) {
    if (this.selected === -1) {
      return false;
    }
    if (tag_or_index === undefined) {
      return this.sel_box.items[this.selected].tag || true;
    }
    return this.sel_box.isSelected(tag_or_index);
  }

  getSelectedIndex() {
    return this.selected;
  }

  getSelectedItem() {
    return this.sel_box.items[this.selected];
  }
}

export function create(params) {
  return new GlovSimpleMenu(params);
}
