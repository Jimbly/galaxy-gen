import {
  KeysMatching,
  NumberBoolean,
} from 'glov/common/types';
import * as settings from './settings';

export type SettingsNumericalKeys = KeysMatching<typeof settings, number>;
export type SettingsStringKeys = KeysMatching<typeof settings, string>;
// export type SettingsValueKeys = KeysMatching<typeof settings, string | number>;

declare module 'glov/client/settings' {
  // Engine settings declared in settings.js:
  let max_fps: number;
  let use_animation_frame: number;
  let render_scale: number;
  let render_scale_mode: 0 | 1 | 2;
  let render_scale_all: number;
  let render_scale_clear: NumberBoolean;
  let fov: number;
  let double_click_time: number;

  // Extend settings.d.ts with typed versions of get/set
  function settingsGet(key: SettingsNumericalKeys): number;
  function settingsGet(key: SettingsStringKeys): string;

  function settingsSet(key: SettingsNumericalKeys, value: number): void;
  function settingsSet(key: SettingsStringKeys, value: string): void;
}
