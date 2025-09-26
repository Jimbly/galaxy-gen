import assert from 'assert';
import {
  PlatformDef,
  PlatformID,
  platformIsValid,
  platformOverrideParameter,
  platformParameter,
} from 'glov/common/platform';
import type { TSMap } from 'glov/common/types';

// Platform
assert(platformIsValid(window.conf_platform));
export const PLATFORM = window.conf_platform as PlatformID;

let override_platform = PLATFORM;
export function platformOverrideID(id: PlatformID): void {
  override_platform = id;
}
export function platformGetID(): PlatformID {
  return override_platform;
}

export function platformParameterGet<T extends keyof PlatformDef>(parameter: T): PlatformDef[T] {
  return platformParameter(platformGetID(), parameter);
}

const platform_devmode = platformParameter(PLATFORM, 'devmode');
export const MODE_DEVELOPMENT = platform_devmode === 'on' || platform_devmode === 'auto' &&
  Boolean(String(document.location).match(/^https?:\/\/localhost/));
export const MODE_PRODUCTION = !MODE_DEVELOPMENT;

// Abilities
export function getAbilityReload(): boolean {
  return platformParameterGet('reload');
}
export function setAbilityReload(value: boolean): void {
  platformOverrideParameter('reload', platformParameterGet('reload') && value);
}

export function getAbilityReloadUpdates(): boolean {
  return platformParameterGet('reload_updates');
}
export function setAbilityReloadUpdates(value: boolean): void {
  platformOverrideParameter('reload_updates', platformParameterGet('reload_updates') && value);
}

export function getAbilityExit(): boolean {
  return platformParameterGet('exit');
}

let ability_chat = true;
export function getAbilityChat(): boolean {
  return ability_chat;
}
export function setAbilityChat(value: boolean): void {
  ability_chat = value;
}

let last_status: string | null = null;
let last_others: string;
let sent_to_platform = false;
export function platformSetRichPresence(status: string | null, others: TSMap<string> | null): void {
  let set_fn = platformParameterGet('setRichPresence');
  if (set_fn && !sent_to_platform) {
    last_status = null;
  }
  let others_string = JSON.stringify(others);
  if (status === last_status && others_string === last_others) {
    return;
  }
  last_status = status;
  last_others = others_string;
  // Don't require at startup, has huge dependencies that will mess up boostrapping
  const { errorReportSetDetails } = require('./error_report'); // eslint-disable-line n/global-require
  errorReportSetDetails('rich_status', status);
  errorReportSetDetails('rich_others', others ? others_string : null);
  if (set_fn) {
    set_fn(status, others);
    sent_to_platform = true;
  }
}
