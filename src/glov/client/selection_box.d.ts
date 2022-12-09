import { Vec4 } from 'glov/common/vmath';
import { FontStyle } from './font';
import { Sprite } from './sprites';

export type EngineStateFunc = (dt: number) => void;

export interface MenuItem {
  name?: string; // name to display
  state?: EngineStateFunc; // state to set upon selection (SimpleMenu only)
  cb?: () => void; // callback to call upon selection (SimpleMenu only)
  value?: number | string;
  value_min?: number;
  value_max?: number;
  value_inc?: number;
  href?: string; // for links
  tag?: string; // for isSelected(tag)
  style?: FontStyle;
  exit?: boolean;
  prompt_int?: boolean;
  prompt_string?: boolean;
  no_sound?: boolean;
  slider?: boolean;
  no_controller_exit?: boolean;
  plus_minus?: boolean;
  disabled?: boolean;
  centered?: boolean;
  auto_focus?: boolean;
  selection_alpha?: number;
}

export type MenuItemEntry = string | MenuItem;

export interface SelectionBoxDrawItemParams {
  item_idx: number;
  item: MenuItem;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  display: SelectionBoxDisplay;
  font_height: number;
  style: FontStyle;
  image_set: Sprite;
  color: Vec4;
  image_set_extra?: Sprite;
  image_set_extra_alpha: number;
}

export type SelectionBoxDrawItemFunc = (params: SelectionBoxDrawItemParams) => void;

export interface SelectionBoxDisplay {
  style_default: FontStyle;
  style_selected: FontStyle;
  style_disabled: FontStyle;
  style_down: FontStyle;
  color_default: Vec4; // default: white
  color_selected: Vec4; // default: white
  color_disabled: Vec4; // default: white
  color_down: Vec4; // default: white
  draw_item_cb: SelectionBoxDrawItemFunc; // default: selboxDefaultDrawItem
  centered: boolean; // default: false
  bounce: boolean; // default: true; only affects non-dropdowns
  tab_stop: number; // default: 0
  xpad: number; // default: 8
  selection_fade: number; // alpha per millisecond; default: Infinity
}

export interface SelectionBoxOptsAll {
  key: string; // default: `dd${id}`
  x: number; // default: 0
  y: number; // default: 0
  z: number; // default: Z.UI
  width: number; // default: glov_ui.button_width
  items: MenuItemEntry[]; // default: []
  disabled: boolean; // default: false
  display: Partial<SelectionBoxDisplay>; // default: cloneShallow(default_display)
  scroll_height: number; // default: 0
  font_height: number; // default: glov_ui.font_height
  entry_height: number; // default: glov_ui.button_height
  auto_reset: boolean; // default: true
  reset_selection: boolean; // default: false
  initial_selection: number; // default: 0
  show_as_focused: number; // default: -1
}

export type SelectionBoxOpts = Partial<SelectionBoxOptsAll>;

export interface SelectionBox extends Readonly<SelectionBoxOptsAll> {
  readonly display: SelectionBoxDisplay; // always fully realized (non-Partial) after being applied

  run(params?: SelectionBoxOpts): number;

  isSelected(tag_or_index: string | number): boolean;
  getSelected(): MenuItem;
}

export function selectionBoxCreate(params?: SelectionBoxOpts): SelectionBox;
export function dropDownCreate(params?: SelectionBoxOpts): SelectionBox;
