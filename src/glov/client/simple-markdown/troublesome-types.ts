export type Capture =
  | (Array<string> & {
    index: number;
  })
  | (Array<string> & {
    index?: number;
  });

export type State = {
  key?: string | number | undefined;
  inline?: boolean | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export type MatchFunction = {
  regex?: RegExp;
} & ((
  source: string,
  state: State,
  prevCapture: string,
) => Capture | null | undefined);
