#pragma WebGL2

precision lowp float;

uniform sampler2D tex0;
uniform sampler2D tex1;
uniform sampler2D tex2;
uniform vec4 params;
uniform vec4 scale;

varying lowp vec4 interp_color;
varying vec2 interp_texcoord;

void main(void) {
  vec4 tex_fg = texture2D(tex0, interp_texcoord);
  vec4 tex_bg = texture2D(tex1, interp_texcoord * scale.z + scale.xy);
  vec4 tex = mix(tex_bg, tex_fg, scale.w);
  float total_weight = max(0.001, tex_bg.r * (1.0 - scale.w) + tex_fg.r * scale.w);
  float hueidx = (tex_bg.r * (1.0 - scale.w) * tex_bg.g + tex_fg.r * scale.w * tex_fg.g) / total_weight;
  float hue = 0.0625 + 0.125 * hueidx*255.0;
  vec4 palettized = texture2D(tex2, vec2(0.35, hue)) * 1.23;
  // vec2 int_coord = floor(interp_texcoord * params.x);
  // float odd = floor(fract((int_coord.r + int_coord.g) / 2.0) + 0.5);
  // if (palettized.a < params.y && odd > 0.5) {
  //   // offset color by 16px
  //   palettized = texture2D(tex2, vec2(tex.r + 0.0625, 0.5));
  // }
  gl_FragColor = vec4(palettized.rgb * tex.r, interp_color.a);
  // gl_FragColor = vec4(tex.rgb, interp_color.a);
}
