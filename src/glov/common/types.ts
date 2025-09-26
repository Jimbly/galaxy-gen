import type { FriendData } from './friends_data';
import type { Packet } from './packet';

export type VoidFunc = () => void;

export type TSMap<T> = Partial<Record<string, T>>;

export type ERR = string | undefined | null;

/**
 * Data object type to be used when handling an object that contains some type of (possible unknown) information.
 * @template T - The type of information held by the object, defaults to unknown.
 */
export type DataObject = TSMap<unknown>;

export function isDataObject(value: unknown): value is DataObject {
  return value ? typeof value === 'object' && !Array.isArray(value) : false;
}

export type EmptyObject = Record<string, never>;

/**
 * Error callback accepting an error as the first parameter and a result as the second parameter.
 * Both parameters are optional.
 *
 * @template T - The result type, defaults to never (no result)
 * @template E - The error type, defaults to unknown
 * @param err - The error parameter
 * @param result - The result parameter
 */
export type ErrorCallback<T = never, E = unknown> = (
  err?: E | undefined | null,
  result?: T extends (never | void) ? never : (T | undefined | null)
) => void;

/**
 * Error callback accepting an (string) error as the first parameter and a result as the second parameter.
 * Will only be called as cb(string) or cb(null, result)
 *
 * @template T - The result type, defaults to never (no result)
 * @param err - The error parameter
 * @param result - The result parameter
 */
export type NetErrorCallback<T = never> = (
  err: string | null,
  result?: T
) => void;

type NetResponseCallbackCalledByUser<T = never> = (
  err?: ERR,
  result?: T extends (never | void) ? never : (T | undefined | null),
  resp_func?: NetResponseCallbackCalledBySystem
) => void;

// Type to use for parameters to system functions that only ever call with string | null
export type NetResponseCallbackCalledBySystem<T = never> = (
  err: string | null,
  result?: T extends (never | void) ? never : T,
  resp_func?: NetResponseCallback
) => void;

/**
 * Callback function type passed to any network message handlers: can use it to
 * send back a packet, an error, a result, as well as register a function to be
 * called in response to your response.
 */
export interface NetResponseCallback<T = never> extends NetResponseCallbackCalledByUser<T> {
  pak: () => Packet;
}

/**
 * Helper type to make a new type that has specific members marked as required.
 * Example: WithRequired<CmdDef, 'cmd' | 'help'>
 */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/**
 * Helper type to get the type of the value of entries in a Partial<Record<>>/dictionary,
 * excluding the value of `undefined` from the Partial<>
 */
export type DefinedValueOf<T> = Exclude<T[keyof T], undefined>;

/**
 * Helper type to mark only one field of a type as optional.
 */
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

/**
 * Helper type to filter only keys for values who exactly match a given type
 *
 * { a: string; b: string | number; c: number, d?: number; } yields:
 * string -> a
 * string | number -> b
 * number -> c
 * number | undefined -> d
 */
export type KeysMatching<T, V> = Exclude<{
  [K in keyof T]: [T[K]] extends [V] ? [V] extends [T[K]] ? K : never : never
}[keyof T], undefined>;

/**
 * Helper type to filter only keys for values which could be assigned to a variable of a given type
 *
 * { a: string; b: string | number; c: number; d?: number; } yields:
 * string -> a
 * string | number -> a | b | c
 * number -> c
 * number | undefined -> c | d
 */
export type KeysMatchingLoose<T, V> = Exclude<{
  [K in keyof T]: T[K] extends V ? K : never
}[keyof T], undefined>;

// TODO: Implement the types below and move them to the appropriate files

/**
 * Presence data
 */
export type PresenceEntry<T=unknown> = {
  active: number;
  state: string;
  id: number; // note: not sent from client -> server
  payload?: T;
};

export type EntityID = number;

/*
 * Chat message data
 */
export interface ChatMessageDataShared {
  id?: string; // user_id or client_id (or undefined if not from a user)
  msg: string;
  flags: number;
  display_name?: string;
  style?: string; // If added by the worker
}
export interface ChatMessageDataSaved extends ChatMessageDataShared {
  ts: number;
}
export interface ChatMessageDataBroadcast extends ChatMessageDataShared {
  client_id?: string;
  ent_id?: EntityID; // If from a worker with an EnityManager
  quiet?: boolean; // Added at run-time on client
  err_echo?: boolean; // Added at run-time on client
}
/*
 * Chat history data
 */
export interface ChatHistoryData {
  idx: number;
  msgs: ChatMessageDataSaved[];
}

/*
 * Friends command response
 */
export type FriendCmdResponse = { msg: string; friend: FriendData };

/**
 * Server worker handler callback
 */
export type HandlerCallback<T = never> = ErrorCallback<T, string>;

/**
 * Server worker handler source
 */
export interface HandlerSource {
  channel_id: string;
  id: string;
  type: string;
  direct?: true;
}

/**
 * Server client worker handler source
 */
export interface ClientHandlerSource extends HandlerSource {
  type: 'client';
  user_id?: string;
  display_name?: string;
  access?: true;
  direct?: true;
  sysadmin?: true;
  csr?: true;
  elevated?: number;
}
export function isClientHandlerSource(src: HandlerSource): src is ClientHandlerSource {
  return src.type === 'client';
}
export type LoggedInClientHandlerSource = WithRequired<ClientHandlerSource, 'user_id' | 'display_name'>;

export interface ChatIDs extends ClientHandlerSource {
  style?: string;
}

export type Roles = TSMap<1>;

export type ClientIDs = {
  client_id: string;
  user_id?: string;
  display_name?: string;
  roles?: Roles;
};
export type ChannelDataClient = {
  ids: ClientIDs;
} & DataObject;
export type ChannelDataClients = TSMap<ChannelDataClient>;

// TODO: Delete this type and all usages of it.
// It is being used as a placeholder for data types that are not yet implemented.
export type UnimplementedData = DataObject;

export type DeepPartial<T> = T extends DataObject ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export type NumberBoolean = 0 | 1;

export type TextVisualLimit = {
  font_height: number;
  width: number;
};
