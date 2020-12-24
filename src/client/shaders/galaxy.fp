#pragma WebGL2

precision lowp float;

uniform sampler2D tex0;
uniform sampler2D tex1;
uniform vec4 params;

varying lowp vec4 interp_color;
varying vec2 interp_texcoord;

void main(void) {
  vec4 tex = texture2D(tex0, interp_texcoord);
  vec4 palettized = texture2D(tex1, vec2(tex.r, 0.5));
  vec2 int_coord = floor(interp_texcoord * params.x);
  float odd = floor(fract((int_coord.r + int_coord.g) / 2.0) + 0.5);
  if (palettized.a < params.y && odd > 0.5) {
    // offset color by 16px
    palettized = texture2D(tex1, vec2(tex.r + 0.0625, 0.5));
  }

  gl_FragColor = vec4(palettized.rgb, interp_color.a);
}
