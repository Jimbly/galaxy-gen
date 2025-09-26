import assert from 'assert';
import type { TSMap } from './types';

export type PlatformID = string;

export interface PlatformDef {
  // devmode: if `auto`, will enable MODE_DEVELOPMENT if the host starts with `localhost`
  devmode: 'auto' | 'on' | 'off';
  // reload: whether or not we can call document.reload() to reload the page
  reload: boolean;
  // reload_updates: whether or not calling document.reload() will cause us to get an updated version of the client
  reload_updates: boolean;
  // random_creation_name: new users get a randomly generated name by default
  random_creation_name: boolean;
  // exit: can exit the app / need an exit button
  exit: boolean;
  // linkHandler: for platforms where web links will not work
  linkHandler?(url: string): void;
  // setRichPresence: for platforms that support it
  //   note: due to startup ordering, probably needs to be set via platformOverrideParameter()
  setRichPresence?(status: string | null, others: TSMap<string> | null): void;
}
/*
Extend this like so:

  declare module 'glov/common/platform' {
    interface PlatformDef {
      some_feature: boolean;
    }
  }

And make sure to define all parameters for the `web` platform with:
  platformRegister('web', { ... });

*/

let platforms: Partial<Record<PlatformID, PlatformDef>> = Object.create(null);

let too_late_to_register = false;

export function platformRegister(id: PlatformID, def: PlatformDef): void {
  assert(!too_late_to_register);
  assert(!platforms[id] || id === 'web');
  platforms[id] = def;
}

export function platformGetValidIDs(): PlatformID[] {
  return Object.keys(platforms);
}
export function platformIsValid(v: string | undefined | null): boolean {
  too_late_to_register = true; // all registering must be done before the first querying
  return Boolean(typeof v === 'string' && platforms[v]);
}
let parameter_overrides: Partial<PlatformDef> = Object.create(null);
export function platformParameter<T extends keyof PlatformDef>(platform: PlatformID, parameter: T): PlatformDef[T];
export function platformParameter(platform: PlatformID, parameter: keyof PlatformDef): unknown {
  let override = parameter_overrides[parameter];
  if (override !== undefined) {
    return override;
  }
  let platdef = platforms[platform];
  assert(platdef);
  return platdef[parameter];
}

export function platformOverrideParameter<T extends keyof PlatformDef>(parameter: T, value: PlatformDef[T]): void {
  parameter_overrides[parameter] = value;
}

platformRegister('web', {
  devmode: 'auto',
  reload: true,
  reload_updates: true,
  random_creation_name: false,
  exit: false,
} as PlatformDef);
