// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

export const PRESENCE_OFFLINE = 0; // for invisible, etc
export const PRESENCE_ACTIVE = 1;
export const PRESENCE_INACTIVE = 2;
// when invisible *and* idle; client -> server only, other clients should never see
export const PRESENCE_OFFLINE_INACTIVE = 3;
export function presenceActive(presence_value: number): boolean {
  return !(presence_value === PRESENCE_INACTIVE || presence_value === PRESENCE_OFFLINE_INACTIVE);
}
export function presenceVisible(presence_value: number): boolean {
  return !(presence_value === PRESENCE_OFFLINE || presence_value === PRESENCE_OFFLINE_INACTIVE);
}

export type NumberEnum<K extends string, V extends number> = Record<K, V> & Partial<Record<string, V | string>>;
export type StringEnum<K extends string, V extends string> = Record<K, V>;

export function getStringEnumValues<K extends string, V extends string>(e: StringEnum<K, V>): V[] {
  return Object.values(e);
}
export function isValidNumberEnumKey<K extends string, V extends number>(e: NumberEnum<K, V>, k: string): k is K {
  return typeof e[k] === 'number';
}
export function isValidStringEnumKey<K extends string, V extends string>(e: StringEnum<K, V>, k: string): k is K {
  return k in e;
}
export function isValidStringEnumValue<K extends string, V extends string>(
  e: StringEnum<K, V>,
  v: string | undefined | null,
): v is V {
  for (let key in e) {
    if (e[key] === v) {
      return true;
    }
  }
  return false;
}

export const CHAT_FLAG_EMOTE = 1;
export const CHAT_FLAG_USERCHAT = 2; // Only used on client, not communicated
export const CHAT_USER_FLAGS = CHAT_FLAG_EMOTE|CHAT_FLAG_USERCHAT;

export const CHAT_FLAG_DO_ECHO = 1<<31; // Only used on server, not communicated; do ERR_ECHO checks even if system msg
