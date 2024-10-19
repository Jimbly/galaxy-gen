import assert from 'assert';
import {
  PlatformDef,
  PlatformID,
  platformIsValid,
  platformOverrideParameter,
  platformParameter,
} from 'glov/common/platform';

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

let ability_chat = true;
export function getAbilityChat(): boolean {
  return ability_chat;
}
export function setAbilityChat(value: boolean): void {
  ability_chat = value;
}
