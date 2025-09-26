// Portions Copyright 2020 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

/* eslint-disable import/order */
const verify = require('glov/common/verify');
const { platformParameterGet } = require('./client_config');
const engine = require('./engine.js');
const { fontStyle } = require('./font.js');
const camera2d = require('./camera2d.js');
const in_event = require('./in_event.js');
const input = require('./input.js');
const { abs } = Math;
const {
  uiGetDOMElem,
} = require('./ui.js');
const ui = require('./ui.js');
const { uiStyleCurrent } = require('./uistyle.js');
const settings = require('./settings.js');
const { SPOT_DEFAULT_BUTTON, spot, spotKey } = require('./spot.js');

const { max, min } = Math;

let style_link_default = fontStyle(null, {
  color: 0x5040FFff,
  outline_width: 1.0,
  outline_color: 0x00000020,
});
let style_link_hover_default = fontStyle(null, {
  color: 0x0000FFff,
  outline_width: 1.0,
  outline_color: 0x00000020,
});

export function linkGetDefaultStyle() {
  return style_link_default;
}

export function linkSetDefaultStyle(style_link, style_link_hover) {
  style_link_default = style_link;
  style_link_hover_default = style_link_hover;
}

let link_blocks = [];
export function linkObscureRect(box) {
  if (!box.dom_pos) {
    box.dom_pos = {};
  }
  camera2d.virtualToDomPosParam(box.dom_pos, box);
  link_blocks.push(box.dom_pos);
}

const STRICT_CHECKING = true; // if strict, we collapse the box if there's *any* overlap, not just complete
// e.g. this shape of visible link:  will become this shape:  with no-strict it would be full:
//         ..                             ..                        ..
//         X.                             ..                        XX
//         XX                             XX                        XX
// Strict checking prevents _any_ accidental link clicks, at the expense of
//  smaller A elements - should perhaps only be used for `internal`-flagged
//  links that are doing their own (properly event-filter) non-link handling?
function overlaps(x0, x1, x, w) {
  if (STRICT_CHECKING) {
    return x < x1 && x + w > x0;
  } else {
    return x <= x0 && x + w >= x1;
  }
}
function linkClipRect(rect) {
  if (!rect.dom_pos) {
    rect.dom_pos = {};
  }
  camera2d.virtualToDomPosParam(rect.dom_pos, rect);
  let dom_pos = rect.dom_pos;
  let ox0 = dom_pos.x;
  let ox1 = ox0 + dom_pos.w;
  let oy0 = dom_pos.y;
  let oy1 = oy0 + dom_pos.h;
  let x0 = ox0;
  let x1 = ox1;
  let y0 = oy0;
  let y1 = oy1;
  for (let ii = 0; ii < link_blocks.length; ++ii) {
    let check = link_blocks[ii];
    if (overlaps(x0, x1, check.x, check.w)) {
      if (check.y <= y0) {
        y0 = max(y0, check.y + check.h);
      }
      if (check.y + check.h >= y1) {
        y1 = min(y1, check.y);
      }
    }
    if (overlaps(y0, y1, check.y, check.h)) {
      if (check.x <= x0) {
        x0 = max(x0, check.x + check.w);
      }
      if (check.x + check.w >= x1) {
        x1 = min(x1, check.x);
      }
    }
  }
  if (x1 <= x0 || y1 <= y0) {
    return false;
  }
  if (x0 !== ox0 || x1 !== ox1) {
    let ow = dom_pos.w;
    let offs = (x0 - ox0) / ow;
    let wscale = (x1 - x0) / ow;
    rect.x += offs * rect.w;
    rect.w *= wscale;
  }
  if (y0 !== oy0 || y1 !== oy1) {
    let oh = dom_pos.h;
    let offs = (y0 - oy0) / oh;
    let hscale = (y1 - y0) / oh;
    rect.y += offs * rect.h;
    rect.h *= hscale;
  }
  return true;
}

let state_cache = {};
let good_url = /https?:\/\//;

function preventFocus(evt) {
  evt.preventDefault();
  if (evt.relatedTarget) {
    // Revert focus back to previous blurring element (canvas or edit box)
    evt.relatedTarget.focus();
  } else {
    // No previous focus target, blur instead
    evt.currentTarget.blur();
  }
}

// Create an invisible A elem in the DOM so we get all of the good browsery
// behavior for a link area.
export function link(param) {
  let { x, y, w, h, url, internal, allow_modal } = param;
  if (!url.match(good_url)) {
    url = `${document.location.protocol}//${url}`;
  }
  let key = spotKey(param);
  let state = state_cache[key];
  if (!state) {
    state = state_cache[key] = { clicked: false };
  }
  verify(state.frame !== engine.frame_index); // two links with the same key on the same frame
  state.frame = engine.frame_index;

  let rect = { x, y, w, h };

  // TODO: use spot_ret.allow_focus instead of all of this?
  if (camera2d.clipTestRect(rect) && linkClipRect(rect) && !(
    settings.shader_debug || settings.show_profiler || platformParameterGet('linkHandler')
  )) {
    // at least some is not clipped
    let elem = uiGetDOMElem(state.elem, allow_modal);
    if (elem !== state.elem) {
      state.elem = elem;
      if (elem) {
        // new DOM element, initialize
        elem.textContent = '';
        let a_elem = document.createElement('a');
        a_elem.setAttribute('draggable', false);
        a_elem.textContent = ' ';
        a_elem.className = 'glovui_link noglov';
        a_elem.setAttribute('target', '_blank');
        a_elem.setAttribute('href', url);
        if (param.download) {
          a_elem.setAttribute('download', param.download);
        }
        // Make the element unfocusable, so that pressing enter at some point
        //   after clicking a link does not re-activate the link, additionally
        //   pressing tab should not (in the browser) focus these links.
        a_elem.setAttribute('tabindex', '-1');
        a_elem.addEventListener('focus', preventFocus);
        state.url = url;
        if (internal) {
          let down_x;
          let down_y;
          input.handleTouches(a_elem);
          a_elem.onmousedown = function (ev) {
            down_x = ev.pageX;
            down_y = ev.pageY;
          };
          a_elem.onclick = function (ev) {
            ev.preventDefault();
            if (down_x) {
              let dist = abs(ev.pageX - down_x) + abs(ev.pageY - down_y);
              if (dist > 50) {
                return;
              }
            }
            state.clicked = true;
            in_event.handle('mouseup', ev);
          };
        }
        elem.appendChild(a_elem);
        state.a_elem = a_elem;
      }
    }
    if (elem) {
      if (url !== state.url) {
        state.a_elem.setAttribute('href', url);
        state.url = url;
      }

      let pos = camera2d.htmlPos(rect.x, rect.y);
      elem.style.left = `${pos[0]}%`;
      elem.style.top = `${pos[1]}%`;
      let size = camera2d.htmlSize(rect.w, rect.h);
      elem.style.width = `${size[0]}%`;
      elem.style.height = `${size[1]}%`;
    }
  }
  let clicked = state.clicked;
  state.clicked = false;
  return clicked;
}

export function linkText(param) {
  let { style_link, style_link_hover, x, y, z, style, font_size, text, url } = param;
  text = text || url;
  z = z || Z.UI;
  style = style || uiStyleCurrent();
  font_size = font_size || style.text_height;
  // Also: any parameter to link(), e.g. url
  let w = ui.font.getStringWidth(style_link || style_link_default, font_size, text);
  let h = font_size;
  param.w = w;
  param.h = h;
  param.def = SPOT_DEFAULT_BUTTON;
  let spot_ret = spot(param);
  let style_use = spot_ret.focused ?
    (style_link_hover || style_link_hover_default) :
    (style_link || style_link_default);
  ui.font.drawSized(style_use, x, y, z, font_size, text);
  let underline_w = 1;
  ui.drawLine(x, y + h - underline_w, x + w, y + h - underline_w, z - 0.5, underline_w, 1, style_use.color_vec4);
  return spot_ret.ret;
}

export function linkActivate(spot_key) {
  let state = state_cache[spot_key];
  if (verify(state) && state.a_elem) {
    state.a_elem.click();
  }
}

export function linkTick() {
  for (let key in state_cache) {
    let state = state_cache[key];
    if (state.frame !== engine.frame_index - 1) {
      delete state_cache[key];
    }
  }
  link_blocks.length = 0;
}
