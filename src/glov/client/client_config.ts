import assert from 'assert';
import { Platform, isValidPlatform } from 'glov/common/enums';

// Platform
assert(isValidPlatform(window.conf_platform));
export const PLATFORM = window.conf_platform as Platform;
export const PLATFORM_WEB = PLATFORM === Platform.Web;
export const PLATFORM_FBINSTANT = PLATFORM === Platform.FBInstant;
export const PLATFORM_ANDROID = PLATFORM === Platform.Android;
export const PLATFORM_IOS = PLATFORM === Platform.IOS;
export const PLATFORM_YANDEX = PLATFORM === Platform.Yandex;
export const PLATFORM_MSSTART = PLATFORM === Platform.MSStart;
export const PLATFORM_MOBILE = PLATFORM_ANDROID || PLATFORM_IOS;

assert(PLATFORM_WEB || PLATFORM_FBINSTANT || PLATFORM_ANDROID || PLATFORM_IOS || PLATFORM_YANDEX || PLATFORM_MSSTART);

// Type
// TODO: Allow other platforms to set MODE_DEVELOPMENT through a parameter
export const MODE_DEVELOPMENT = (PLATFORM_WEB || PLATFORM_FBINSTANT) &&
  Boolean(String(document.location).match(/^https?:\/\/localhost/));
export const MODE_PRODUCTION = !MODE_DEVELOPMENT;

if (MODE_DEVELOPMENT) {
  assert(PLATFORM_WEB || !window.FB);
  assert(PLATFORM_FBINSTANT || !window.FBInstant);
  assert(PLATFORM_ANDROID === Boolean(window.androidwrapper));
  assert(PLATFORM_IOS === Boolean(window.webkit?.messageHandlers?.iosWrapper));
}

// Abilities
const ability_reload = PLATFORM_WEB || PLATFORM_MSSTART;
let override_ability_reload = ability_reload;
export function getAbilityReload(): boolean {
  return override_ability_reload;
}
export function setAbilityReload(value: boolean): void {
  override_ability_reload = ability_reload && value;
}

let ability_chat = true;
export function getAbilityChat(): boolean {
  return ability_chat;
}
export function setAbilityChat(value: boolean): void {
  ability_chat = value;
}
