import {
  DataError,
  dataErrorEx,
  dataErrorQueueClear,
  dataErrorQueueGet,
} from 'glov/common/data_error';
import { TSMap } from 'glov/common/types';
import { plural } from 'glov/common/util';
import { vec4 } from 'glov/common/vmath';
import * as camera2d from './camera2d';
import * as engine from './engine';
import { renderNeeded } from './engine';
import { fontStyleColored } from './font';
import {
  netClient,
  netSubs,
} from './net';
import { ScrollArea, scrollAreaCreate } from './scroll_area';
import {
  buttonText,
  drawLine,
  panel,
  uiGetFont,
  uiGetTitleFont,
  uiTextHeight,
} from './ui';

const { min } = Math;

type GBStateTask = {
  err?: string;
  jobs?: TSMap<{
    errors?: string[];
    warnings?: string[];
  }>;
};
type GBState = {
  error_count?: number;
  warning_count?: number;
  tasks?: TSMap<GBStateTask>;
};
let gbstate: GBState | null = null;
let server_error: string | null = null;

Z.BUILD_ERRORS = Z.BUILD_ERRORS || 9900;

function onGBState(state: GBState): void {
  gbstate = state;
  renderNeeded();
}

function onServerError(err: string | null): void {
  server_error = err;
  renderNeeded();
}

function onDataErrors(err_list: DataError[]): void {
  for (let ii = 0; ii < err_list.length; ++ii) {
    dataErrorEx(err_list[ii]);
  }
  renderNeeded();
}

const PAD = 4;
const color_panel = vec4(0,0,0,1);
const style_title = fontStyleColored(null, 0xFF2020ff);
const style = fontStyleColored(null, 0xDDDDDDff);
const style_task = fontStyleColored(null, 0x00DDDDff);
const style_job = fontStyleColored(null, 0x2020FFff);
const color_line = vec4(1,1,1,1);
// eslint-disable-next-line no-control-regex
const strip_ansi = /\u001b\[(?:[0-9;]*)[0-9A-ORZcf-nqry=><]/g;
let scroll_area: ScrollArea;
function buildUITick(): void {
  let data_errors = dataErrorQueueGet();
  if (!gbstate && !server_error && !data_errors.length) {
    return;
  }
  const x0 = camera2d.x0() + PAD;
  const y0 = camera2d.y0() + PAD;
  let z = Z.BUILD_ERRORS;
  const w = camera2d.w() * 0.75;
  const font_height = uiTextHeight();
  const font = uiGetFont();
  const title_font = uiGetTitleFont();
  let x = x0;
  let y = y0;

  let error_count = (gbstate?.error_count || 0) + (server_error ? 1 : 0) + data_errors.length;
  let warning_count = gbstate?.warning_count || 0;
  title_font.drawSizedAligned(style_title, x, y, z, font_height, font.ALIGN.HCENTERFIT, w, 0,
    `${error_count} ${plural(error_count, 'error')}, ` +
    `${warning_count} ${plural(warning_count, 'warning')}`);
  y += font_height + 1;
  drawLine(x0 + w * 0.3, y, x0 + w * 0.7, y, z, 0.5, 1, color_line);
  y += PAD;

  if (!scroll_area) {
    scroll_area = scrollAreaCreate({
      z,
      background_color: null,
      auto_hide: true,
    });
  }

  const max_h = camera2d.y1() - PAD - y;
  let scroll_y_start = y;
  scroll_area.begin({
    x, y, w, h: max_h,
  });
  const sub_w = w - PAD - scroll_area.barWidth();
  y = 0;
  z = Z.UI;
  let indent = 0;

  function printLine(type: string, str: string): void {
    str = str.replace(strip_ansi, '');
    y += font.drawSizedWrapped(style, x + indent, y, z, sub_w - indent, 0, font_height,
      `${type}: ${str}`);
  }

  if (gbstate) {
    for (let task_name in gbstate.tasks) {
      let task = gbstate.tasks[task_name]!;
      x = 0;
      indent = 0;
      font.drawSizedAligned(style_task, x, y, z, font_height, font.ALIGN.HLEFT, sub_w, 0,
        `${task_name}:`);
      y += font_height;
      indent += font_height;
      let printed_any = false;
      for (let job_name in task.jobs) {
        let job = task.jobs[job_name]!;
        let { warnings, errors } = job;
        if (job_name !== 'all') {
          if (job_name.startsWith('source:')) {
            job_name = job_name.slice(7);
          }
          y += font.drawSizedWrapped(style_job, indent, y, z, sub_w, 0, font_height,
            job_name);
        }
        if (warnings) {
          for (let ii = 0; ii < warnings.length; ++ii) {
            printLine('Warning', warnings[ii]);
            printed_any = true;
          }
        }
        if (errors) {
          for (let ii = 0; ii < errors.length; ++ii) {
            printLine('Error', errors[ii]);
            printed_any = true;
          }
        }
      }
      if (!printed_any && task.err) {
        printLine('Error', task.err);
      }
      y += PAD;
    }
  }

  if (server_error) {
    x = indent = 0;
    font.drawSizedAligned(style_task, x, y, z, font_height, font.ALIGN.HLEFT, sub_w, 0,
      'Server Error:');
    y += font_height;
    x += font_height;
    printLine('Server error', server_error);
  }

  for (let ii = 0; ii < data_errors.length; ++ii) {
    let { msg } = data_errors[ii];
    x = 0;
    printLine('Data error', msg);
  }

  scroll_area.end(y);
  y = scroll_y_start + min(max_h, y);

  let button_h = font_height * 1.5;
  if (buttonText({
    x: x0 + w - button_h,
    y: y0, z: Z.BUILD_ERRORS + 1,
    w: button_h, h: button_h,
    text: 'X',
  })) {
    gbstate = null;
    server_error = null;
    dataErrorQueueClear();
  }

  panel({
    x: x0 - PAD, y: y0 - PAD, z: Z.BUILD_ERRORS - 1,
    w: w + PAD * 2, h: y - y0 + PAD * 2,
    color: color_panel,
  });

}

export function buildUIStartup(): void {
  if (netClient() && engine.DEBUG) {
    netClient().onMsg('gbstate', onGBState);
    netClient().onMsg('server_error', onServerError);
    netClient().onMsg('data_errors', onDataErrors);
    netSubs().on('connect', function () {
      let pak = netClient().pak('gbstate_enable');
      pak.writeBool(true);
      pak.send();
    });
    engine.addTickFunc(buildUITick);
  }
}
