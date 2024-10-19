/*
  An example of how to add and declare a setting:

  import * as settings from 'glov/client/settings';
  import { settingsRegister } from 'glov/client/settings';

  settingsRegister({
    my_setting: {
      default_value: -1,
      type: cmd_parse.TYPE_INT,
      range: [-1,1],
    }
  });
  declare module 'glov/client/settings' {
    let my_setting: -1 | 0 | 1;
  }

  console.log(settings.my_setting);
*/

import type { CmdValueDef } from 'glov/common/cmd_parse';
import type { TSMap } from 'glov/common/types';

export function settingsGet(key: string): string | number;
export function settingsSet(key: string, value: string | number): void;

export function settingsSetAsync(key: string, value: string | number): void;
export function settingsRunTimeDefault(key: string, new_default: string | number): void;
export function settingsPush(pairs: Partial<Record<string, string | number>>): void;
export function settingsPop(): void;
export function settingsRegister(defs: TSMap<CmdValueDef>): void;

export function settingIsModified(key: string): boolean;
