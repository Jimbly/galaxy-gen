// Portions Copyright 2025 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

import { WithRequired } from 'glov/common/types';
import { clamp } from 'glov/common/util';
import {
  rovec4,
  v3copy,
  Vec2,
  Vec3,
  vec3,
  Vec4,
  vec4,
} from 'glov/common/vmath';
import * as camera2d from './camera2d';
import { hsvToRGB, rgbToHSV } from './hsv';
import {
  inputClick,
  inputDrag,
  mouseDownAnywhere,
  mouseOver,
} from './input';
import {
  Sprite,
  spriteClipPause,
  spriteClipped,
  spriteClipResume,
  spriteCreate,
} from './sprites';
import { TEXTURE_FORMAT } from './textures';
import {
  buttonImage,
  buttonWasFocused,
  drawLine,
  getUIElemData,
  LINE_CAP_SQUARE,
  panel,
  sprites as ui_sprites,
  UIBox,
  uiButtonHeight,
} from './ui';

const { min } = Math;

const color_black = rovec4(0,0,0,1);

type ColorPickerState = {
  open: boolean;
  rgba: Vec4;
  color_hs?: Vec4;
  color_v?: Vec4;
  hsv?: Vec3;
};

type ColorPickerStateOpen = WithRequired<ColorPickerState, 'hsv' | 'color_hs' | 'color_v'>;

function colorPickerOpen(state: ColorPickerState): asserts state is ColorPickerStateOpen {
  state.open = true;
  if (!state.color_hs) {
    state.color_hs = vec4(0,0,0,1);
    state.color_v = vec4(0,0,0,1);
    state.hsv = vec3();
  }

  rgbToHSV(state.hsv, state.rgba);
}

function colorPickerIsOpen(state: ColorPickerState): state is ColorPickerStateOpen {
  return state.open;
}

function colorPickerAlloc(param: ColorPickerParam): ColorPickerState {
  let state: ColorPickerState = {
    open: false,
    rgba: vec4(0,0,0,1),
  };
  v3copy(state.rgba, param.color);
  return state;
}

let picker_sprite_hue_sat: Sprite;
let picker_sprite_val: Sprite;
function initTextures(): void {
  const HS_SIZE = 32;
  let data = new Uint8Array(HS_SIZE * HS_SIZE * 3);
  let rgb = vec3();
  let idx = 0;
  for (let j = 0; j < HS_SIZE; j++) {
    let sat = 1 - j / (HS_SIZE - 1);
    for (let i = 0; i < HS_SIZE; i++) {
      let hue = i * 360 / (HS_SIZE - 1);
      hsvToRGB(rgb, hue, sat, 1);
      data[idx++] = rgb[0] * 255;
      data[idx++] = rgb[1] * 255;
      data[idx++] = rgb[2] * 255;
    }
  }
  picker_sprite_hue_sat = spriteCreate({
    url: 'cpicker_hs',
    width: HS_SIZE, height: HS_SIZE,
    format: TEXTURE_FORMAT.RGB8,
    data,
    filter_min: gl.LINEAR,
    filter_mag: gl.LINEAR,
    wrap_s: gl.CLAMP_TO_EDGE,
    wrap_t: gl.CLAMP_TO_EDGE,
  });

  data = new Uint8Array(32);
  for (let ii = 0; ii < data.length; ++ii) {
    data[ii] = 255 - ii * 255 / (data.length - 1);
  }
  picker_sprite_val = spriteCreate({
    url: 'cpicker_v',
    width: 1, height: data.length,
    format: TEXTURE_FORMAT.R8,
    data,
    filter_min: gl.LINEAR,
    filter_mag: gl.LINEAR,
    wrap_s: gl.CLAMP_TO_EDGE,
    wrap_t: gl.CLAMP_TO_EDGE,
  });
}

export type ColorPickerParam = {
  color: Vec3;
  x: number;
  y: number;
  z: number;
  icon_w?: number;
  icon_h?: number;
  picker_h?: number;
  pad?: number;
};

function dragOrClickPos(box: UIBox): null | Vec2 {
  let drag = inputDrag(box) || inputClick(box);
  if (!drag) {
    return null;
  }
  return (drag as ReturnType<typeof inputDrag>)!.cur_pos ||
    (drag as ReturnType<typeof inputClick>)!.pos;
}

export function colorPicker(param: ColorPickerParam): void {
  let state = getUIElemData('colorpicker', param, colorPickerAlloc);
  let icon_h = param.icon_h || uiButtonHeight();
  let icon_w = param.icon_w || icon_h;
  let picker_h = param.picker_h || uiButtonHeight() * 4;
  let pad = param.pad || 3;
  let { x, y, z } = param;

  if (!state.open) {
    v3copy(state.rgba, param.color);
  }

  if (buttonImage({
    x, y, z,
    w: icon_w, h: icon_h,
    img: ui_sprites.white,
    color: state.rgba,
  })) {
    if (!state.open) {
      colorPickerOpen(state);
    } else {
      state.open = false;
    }
  }
  let handled = buttonWasFocused();

  if (colorPickerIsOpen(state)) {
    let clip_pause = spriteClipped();
    if (clip_pause) {
      spriteClipPause();
    }

    if (!picker_sprite_hue_sat) {
      initTextures();
    }

    y = min(y, camera2d.y1() - picker_h);
    z+=2;
    x += icon_w + pad;
    let x0 = x;
    let y0 = y;

    let { hsv } = state;
    let hue_sat_w = picker_h;
    let val_w = picker_h * 0.1;
    hsvToRGB(state.color_v, 0, 0, hsv[2]);
    let hue_sat_param = {
      x, y, z,
      w: hue_sat_w, h: picker_h,
      color: state.color_v,
      max_dist: Infinity,
    };
    picker_sprite_hue_sat.draw(hue_sat_param);
    let drag_pos = dragOrClickPos(hue_sat_param);
    if (drag_pos) {
      handled = true;
      hsv[0] = clamp((drag_pos[0] - x) / hue_sat_param.w * 360, 0, 360);
      hsv[1] = clamp(1 - (drag_pos[1] - y) / hue_sat_param.h, 0, 1);
    }
    let hs_x = x + hsv[0]*hue_sat_w/360;
    let hs_y = y + (1-hsv[1])*picker_h;
    drawLine(hs_x - pad, hs_y, hs_x + pad, hs_y, z + 1, 1, 1, color_black, LINE_CAP_SQUARE);
    drawLine(hs_x, hs_y - pad, hs_x, hs_y + pad, z + 1, 1, 1, color_black, LINE_CAP_SQUARE);
    x += hue_sat_w + pad;

    hsvToRGB(state.color_hs, hsv[0], hsv[1], 1);
    let val_param = {
      x, y, z,
      w: val_w, h: picker_h,
      color: state.color_hs,
      max_dist: Infinity,
    };
    picker_sprite_val.draw(val_param);
    drag_pos = dragOrClickPos(val_param);
    if (drag_pos) {
      handled = true;
      hsv[2] = clamp(1 - (drag_pos[1] - y) / val_param.h, 0, 1);
    }
    let v_y = y + (1-hsv[2])*picker_h;
    drawLine(x, v_y, x + val_w, v_y, z + 1, 1, 1, color_black, LINE_CAP_SQUARE);
    x += val_w;

    hsvToRGB(state.rgba, state.hsv[0], state.hsv[1], state.hsv[2]);

    // eat mouseover/clicks/drags
    let panel_param = { x: x0 - pad, y: y0 - pad, w: x - x0 + pad * 2, h: picker_h + pad * 2, z: z-1 };
    if (mouseOver(panel_param)) {
      handled = true;
    }
    inputDrag(panel_param);
    panel(panel_param);

    if (clip_pause) {
      spriteClipResume();
    }

    if (inputClick({ peek: true }) || !handled && mouseDownAnywhere()) {
      state.open = false;
    }
  }

  v3copy(param.color, state.rgba);

  // return state; Maybe useful for getting at HSV, open, etc?
}
