// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

const camera2d = require('./camera2d.js');
const { cmd_parse } = require('./cmds.js');
const engine = require('./engine.js');
const glov_font = require('./font.js');
const input = require('./input.js');
const { max } = Math;
const settings = require('./settings.js');
const ui = require('./ui.js');
const { vec4, v3copy } = require('./vmath.js');

let metrics = [];

const METRIC_PAD = 2;

let bg_default = vec4(0,0,0,0.5);
let bg_mouse_over = vec4(0,0,0,0.75);
let bg_fade = vec4();

// referenced in engine.js
settings.register({
  show_metrics: {
    default_value: 1,
    type: cmd_parse.TYPE_INT,
    range: [0,1],
  },
  show_fps: {
    label: 'Show FPS',
    default_value: 1,
    type: cmd_parse.TYPE_INT,
    range: [0,3],
  },
  fps_graph: {
    label: 'FPS Graph',
    default_value: 0,
    type: cmd_parse.TYPE_INT,
    range: [0,1],
  },
  fps_window: {
    label: 'FPS Time Window (seconds)',
    default_value: 1,
    type: cmd_parse.TYPE_FLOAT,
    range: [0.001, 120],
  },
});

cmd_parse.register({
  cmd: 'fps',
  help: 'Toggles FPS display',
  func: function (str, resp_func) {
    if (settings.show_fps && settings.show_metrics || str === '0') {
      settings.set('show_fps', 0);
    } else {
      settings.set('show_fps', 1);
      settings.set('show_metrics', 1);
    }
    resp_func();
  },
});

let fps_style = glov_font.style({
  outline_width: 2, outline_color: 0x00000080,
  color: 0xFFFFFFff,
});

export function addMetric(metric) {
  if (metric.show_graph) {
    metric.num_lines = metric.colors.length;
    metric.history_size = metric.data.history.length / metric.num_lines;
  }
  metric.num_labels = Object.keys(metric.labels).length;
  if (metric.interactable === undefined) {
    metric.interactable = engine.DEBUG && (metric.num_labels > 1 || metric.show_graph);
  }
  metrics.push(metric);
}

function showMetric(y, metric) {
  let font = engine.font;
  let pad = METRIC_PAD;
  let line_height = ui.font_height / settings.render_scale_all;
  let METRIC_VALUE_WIDTH = line_height * (metric.width || 2.5);
  let x = camera2d.x1Real() - METRIC_VALUE_WIDTH - pad;
  let y0 = y;
  y += pad;
  let max_label_w = 0;
  let max_labels = settings[metric.show_stat];
  let drew_any = false;
  let alpha = 1;
  for (let label in metric.labels) {
    let value = metric.labels[label]();
    if (value) {
      let style = fps_style;
      if (value.alpha) {
        alpha = value.alpha;
        value = value.value;
        style = glov_font.styleAlpha(fps_style, alpha);
      }
      let label_w = font.drawSizedAligned(style, x, y, Z.FPSMETER + 1, line_height,
        glov_font.ALIGN.HRIGHT, 0, 0, label);
      max_label_w = max(max_label_w, label_w);
      font.drawSizedAligned(style, x, y, Z.FPSMETER + 1, line_height,
        glov_font.ALIGN.HFIT, METRIC_VALUE_WIDTH, 0, value);
      y += line_height;
      drew_any = true;
    }
    if (!--max_labels) {
      break;
    }
  }
  let w = METRIC_VALUE_WIDTH + max_label_w + METRIC_PAD;
  x -= max_label_w + METRIC_PAD;

  if (!drew_any) {
    return y - pad;
  }

  y += pad;
  let bg = bg_default;
  let pos_param = {
    x: x - pad,
    y: y0,
    w: w + pad * 2,
    h: y - y0,
  };
  if (metric.interactable) {
    if (input.mouseUpEdge(pos_param)) {
      if (metric.num_labels > 1 && settings[metric.show_stat] <= 1) {
        settings.set(metric.show_stat, metric.num_labels);
      } else if (metric.show_graph && !settings[metric.show_graph]) {
        settings.set(metric.show_graph, 1);
      } else {
        if (metric.show_graph) {
          settings.set(metric.show_graph, 0);
        }
        settings.set(metric.show_stat, 1);
      }
    }
    if (input.mouseOver(pos_param)) {
      bg = bg_mouse_over;
    }
  }
  if (alpha !== 1) {
    bg_fade[3] = bg[3] * alpha;
    bg = v3copy(bg_fade, bg);
  }
  ui.drawRect(pos_param.x, pos_param.y, pos_param.x + pos_param.w, y, Z.FPSMETER, bg);
  return y;
}

function showMetricGraph(y, metric) {
  const small = engine.game_height < 300;
  const LINE_WIDTH = small ? 1 : 3;
  const LINE_PAD = small ? 0 : 1;
  const LINE_HEIGHT = small ? 64 : 128;
  const NUM_LINES = metric.history_size - 1;
  let w = (LINE_WIDTH + LINE_PAD) * NUM_LINES;
  let x = camera2d.x1Real() - w;
  let h = LINE_HEIGHT + LINE_PAD * 2;
  let z = Z.FPSMETER;
  ui.drawRect(x, y - h, x + w, y, z++, bg_default);
  x += LINE_PAD;
  y -= LINE_PAD;
  let history_index = metric.data.index;
  let line_scale = LINE_HEIGHT / metric.line_scale_top;
  for (let ii = 0; ii < NUM_LINES; ii++) {
    let line_index = ((ii + history_index + 1) % metric.history_size) * metric.num_lines;
    let data = metric.data.history;
    let bar_max = 0;
    for (let jj = 0; jj < metric.num_lines; jj++) {
      let line_jj = data[line_index + jj];
      let bar_min;
      if (metric.bars_stack) {
        bar_min = bar_max;
        bar_max += line_jj;
      } else {
        // bars overlap, figure out how big this bar should be relative to next smallest
        let lesser = 0;
        for (let kk = 0; kk < metric.num_lines; kk++) {
          if (kk === jj) {
            continue;
          }
          let line_kk = data[line_index + kk];
          if ((line_kk < line_jj || line_kk === line_jj && kk < jj) && line_kk > lesser) {
            lesser = line_kk;
          }
        }
        bar_min = lesser;
        bar_max = line_jj;
      }
      let color = metric.colors[jj];
      ui.drawRect(x, y - bar_max * line_scale, x + LINE_WIDTH, y - bar_min * line_scale, z, color);
    }
    x += LINE_WIDTH + LINE_PAD;
  }
  z += NUM_LINES;
  y -= LINE_HEIGHT + LINE_PAD;
  return y;
}

export function draw() {
  camera2d.setAspectFixed(engine.game_width, engine.game_height);
  let y = camera2d.y0Real();
  let y_graph = camera2d.y1Real();
  for (let ii = 0; ii < metrics.length; ++ii) {
    let metric = metrics[ii];
    if (settings[metric.show_stat]) {
      y = showMetric(y, metric);
      y += METRIC_PAD;
    }
    if (settings[metric.show_graph]) {
      y_graph = showMetricGraph(y_graph, metric);
      y_graph -= METRIC_PAD;
    }
  }
}
