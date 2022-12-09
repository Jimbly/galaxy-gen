export type EditBoxResult = null | 'submit' | 'cancel';

export interface EditBoxOptsAll {
  key: string;
  x: number;
  y: number;
  z: number;
  w: number;
  type: 'text' | 'number' | 'password' | 'email';
  font_height: number;
  text: string | number;
  placeholder: string;
  max_len: number;
  zindex: null | number;
  uppercase: boolean;
  initial_focus: boolean;
  onetime_focus: boolean;
  auto_unfocus: boolean;
  initial_select: boolean;
  spellcheck: boolean;
  esc_clears: boolean;
  multiline: number;
  autocomplete: boolean;
  custom_nav: Partial<Record<number, null>>;
}

export type EditBoxOpts = Partial<EditBoxOptsAll>;

export interface EditBox extends Readonly<EditBoxOptsAll> {
  run(params?: EditBoxOpts): EditBoxResult;
  getText(): string;
  setText(new_text: string | number): void;
  isFocused(): boolean;

  readonly SUBMIT: 'submit';
  readonly CANCEL: 'cancel';
}

export function editBoxCreate(params?: EditBoxOpts): EditBox;
