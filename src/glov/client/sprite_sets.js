const assert = require('assert');

const sprite_sets = {
  stone: {
    button: { atlas: 'stone' },
    button_rollover: { atlas: 'stone' },
    button_down: { atlas: 'stone' },
    button_disabled: { atlas: 'stone' },
  },
  pixely: {
    color_set_shades: [0.8, 1, 1],
    slider_params: [1, 1, 0.3],

    button: { atlas: 'pixely' },
    button_rollover: { atlas: 'pixely' },
    button_down: { atlas: 'pixely' },
    button_disabled: { atlas: 'pixely' },
    panel: { atlas: 'pixely' },
    menu_entry: { atlas: 'pixely' },
    menu_selected: { atlas: 'pixely' },
    menu_down: { atlas: 'pixely' },
    menu_header: { atlas: 'pixely' },
    slider: { atlas: 'pixely' },
    // slider_notch: { atlas: 'pixely' },
    slider_handle: { atlas: 'pixely' },

    checked: { atlas: 'pixely' },
    unchecked: { atlas: 'pixely' },

    scrollbar_bottom: { atlas: 'pixely' },
    scrollbar_trough: { atlas: 'pixely' },
    scrollbar_top: { atlas: 'pixely' },
    scrollbar_handle_grabber: { atlas: 'pixely' },
    scrollbar_handle: { atlas: 'pixely' },
    progress_bar: { atlas: 'pixely' },
    progress_bar_trough: { atlas: 'pixely' },

    collapsagories: { atlas: 'pixely' },
    collapsagories_rollover: { atlas: 'pixely' },
    collapsagories_shadow_down: { atlas: 'pixely' },
  },
};

export function spriteSetGet(key) {
  assert(sprite_sets[key]);
  return sprite_sets[key];
}
