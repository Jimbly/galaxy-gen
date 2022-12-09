/* eslint-env browser */
declare module 'glov/client/global' {
  global {
    interface Window {
      // GLOV injected variables
      conf_platform?: string;
      conf_env?: string;

      // External injected variables
      FB?: unknown;
      FBInstant?: unknown;
      androidwrapper?: unknown;
      webkit?: { messageHandlers?: { iosWrapper?: unknown } };

      // GLOV bootstrap
      debugmsg: (msg: string, clear: boolean) => void;

    }

    // GLOV ui.js
    let Z: Record<string, number>;
    // GL context
    let gl: WebGLRenderingContext | WebGL2RenderingContext;
    // GLOV profiler
    const profilerStart: (name: string) => void;
    const profilerStop: (name?: string) => void;
    const profilerStopStart: (name: string) => void;
    const profilerStartFunc: () => void;
    const profilerStopFunc: () => void;
  }
}
