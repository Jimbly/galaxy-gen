import type { CmdParse } from 'glov/common/cmd_parse';
import type { Packet } from 'glov/common/packet';
import type {
  ChannelDataClients,
  DataObject,
  ErrorCallback,
  NetErrorCallback,
  NetResponseCallback,
  NetResponseCallbackCalledBySystem,
  PresenceEntry,
  TSMap,
  VoidFunc,
  WithRequired,
} from 'glov/common/types';

export type LoginCredentials = {
  provider?: string;
  external_login_data?: Record<string, unknown>;
  user_id?: string;
  password?: string;
  creation_display_name?: string;
  do_creation?: boolean;
};

export type UserCreateParam = {
  user_id: string;
  password: string;
  password_confirm?: string;
  email?: string;
  display_name?: string;
};

export type LoginEmailPassParam = {
  email: string;
  password: string;
  do_creation: boolean;
  creation_display_name?: string | null;
};

export type LoginExternalParam = WithRequired<LoginCredentials, 'provider' | 'external_login_data'>;

// Note: Partial definition, needs more filled in
export type SubscriptionManager = {
  readonly auto_create_user: boolean;
  readonly no_auto_login: boolean;
  readonly allow_anon: boolean;
  readonly logged_in_email: string | null;
  readonly logging_in: boolean;
  readonly logging_out: boolean;
  readonly auto_login_error?: string;
  readonly restarting: boolean;
  readonly was_logged_in: boolean;
  loggedIn(): string | null;
  getUserId(): string | null;
  getDisplayName(): string | null;
  getLoginResponseData(): DataObject;

  on(key: 'chat_broadcast', cb: (data: { src: string; msg: string })=> void): void;
  on(key: 'restarting', cb: (data: boolean)=> void): void;
  on(key: 'disconnect', cb: VoidFunc): void;
  on(key: 'connect', cb: (is_reconnect: boolean) => void): void;
  on(key: 'login', cb: VoidFunc): void;
  on(key: 'logout', cb: VoidFunc): void;
  on(key: 'prelogout', cb: VoidFunc): void;
  on(key: 'login_fail', cb: (err: string) => void): void;
  //on(key: string, cb: (data: unknown)=> void): void;

  onLogin(cb: VoidFunc): void; // like `.on('login', cb)`, but also fires immediately if appropriate
  onceLoggedIn(cb: VoidFunc): void; // like `.once('login', cb)`, but also fires immediately if appropriate
  onceConnected(cb: VoidFunc): void; // like `.once('connect', cb), but also fires immediately if appropriate

  getCackAppData(): DataObject | null;

  getChannel(channel_id: string, do_subscribe?: boolean): ClientChannelWorker;
  getChannelImmediate(channel_id: string, timeout?: number): ClientChannelWorker;
  getMyUserChannel(): ClientChannelWorker | null;
  unsubscribe(channel_id: string): void;
  sendCmdParse<T=never>(cmd: string, resp_func: NetResponseCallbackCalledBySystem<T>): void;
  serverLog(type: string, data: string | DataObject): void;
  serverLogSetExtraData(data: null | DataObject): void;

  onChannelMsg<T=unknown>(channel_type: string | null,
    msg: string, cb: (data: T, resp_func: NetResponseCallback) => void): void;
  // TODO: more specific channel event handler types (also for `ClientChannelWorker::on` below)
  onChannelEvent<T=unknown>(channel_type: string | null, msg: string, cb: (data: T) => void): void;

  getLastLoginCredentials(): LoginCredentials;
  userCreate(credentials: UserCreateParam, resp_func: ErrorCallback): void;
  loginEmailPass(credentials: LoginEmailPassParam, resp_func: ErrorCallback): void;
  loginExternal(credentials: LoginExternalParam, resp_func: ErrorCallback): void;
  login(user_id: string, password: string, resp_func: ErrorCallback): void;
  logout(): void;
  loginRetry(resp_func: ErrorCallback): void;
  sessionHashedPassword(): string;
  sendActivationEmail(email: string, resp_func: ErrorCallback): void;

  quietMessagesSet(msgs: string[]): void;

  uploadGetFile(file_id: string): { err: string } | ChunkedSendFileData;
  uploadFreeFile(file_data: ChunkedSendFileData): void;
  onUploadProgress(mime_type: string, cb: (progress: number, total: number) => void): void;
};

export type ChunkedSendFileData = {
  dv: DataView;
  mime_type: string;
  buffer: Uint8Array;
};
export function isChunkedSendFileData(data: { err: string } | ChunkedSendFileData): data is ChunkedSendFileData;

// Note: Partial definition, needs more filled in
export type WSClient = {
  send<R=never, P=null>(msg: string, data: P, msg_debug_name: string | null, resp_func: NetErrorCallback<R>): void;
  send(msg: string, data?: unknown, msg_debug_name?: string | null, resp_func?: NetErrorCallback): void;
  pak(msg: string): Packet;
  readonly connected: boolean;
  readonly disconnected: boolean;
  readonly connect_error: string | null;
  readonly update_available: boolean;
  timeSinceDisconnect(): number;
  onMsg<T=unknown, R=never>(msg: string, cb: (data: T, resp_func: NetResponseCallback<R>) => void): void;
};

export type NetInitParam = Partial<{
  ver: number | string;
  no_packet_debug: boolean;
  path: string;
  client_app: string;
  cmd_parse: CmdParse;
  engine: unknown;
  auto_create_user: boolean;
  no_auto_login: boolean;
  allow_anon: boolean;
}>;

export function netBuildString(): string;
export function netInit(param?: NetInitParam): string;
export function netPostInit(cb: VoidFunc): void;
export function netDisconnectedRaw(): boolean;
export function netDisconnected(): boolean;
export function netForceDisconnect(): void;
export function netClient(): WSClient;
export function netClientId(): string;
export function netUserId(): string | null;
export function netSubs(): SubscriptionManager;

export type ClientChannelWorkerData = {
  public?: unknown & {
    clients?: ChannelDataClients;
  };
};

export interface ClientChannelWorker<DataType extends ClientChannelWorkerData=ClientChannelWorkerData> {
  // Note: type of `cb` here is incorrect (only correct for some `channel_data` events but should be optional key/value)
  on(key: string, cb: (data: DataObject, key: string, value: DataObject) => void): void;
  removeListener(key: string, cb: (data: DataObject, key: string, value: DataObject) => void): void;
  onSubscribe(cb: (data: unknown) => void): void;
  onceSubscribe(cb: ((data: DataObject) => void) | VoidFunc): void;
  numSubscriptions(): number;
  isFullySubscribed(): boolean;
  unsubscribe(): void;
  getChannelData<T>(key: string, default_value: T): T;
  getChannelData(key: string): unknown;
  getChannelID(): string;
  setChannelData(key: string, value: unknown, skip_predict?: boolean, resp_func?: NetErrorCallback): void;
  predictSetChannelData(key: string, value: unknown): void;
  onMsg<T=unknown>(msg: string, cb: (data: T, resp_func: ErrorCallback) => void): void;
  removeMsgHandler<T=unknown>(msg: string, cb: (data: T, resp_func: ErrorCallback) => void): void;
  pak(msg: string): Packet;
  send<P=null>(msg: string, data: P): void;
  send<R=never, P=null>(msg: string, data: P, resp_func: NetErrorCallback<R>): void;
  send(msg: string, data?: unknown, resp_func?: NetErrorCallback): void;
  cmdParse<T=string>(cmd: string, resp_func: NetErrorCallback<T>): void;
  readonly data: DataType;
  readonly channel_id: string;
  readonly channel_type: string;
  readonly channel_subid: string;
  readonly channel_data_ver: number;
}

export interface UserChannel extends ClientChannelWorker {
  presence_data: TSMap<PresenceEntry>;
}
