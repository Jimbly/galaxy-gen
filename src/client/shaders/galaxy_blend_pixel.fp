#pragma WebGL2

precision lowp float;

uniform sampler2D tex0; // cell tex
uniform sampler2D tex1; // parent tex
uniform sampler2D tex2; // palette
uniform vec4 params;
uniform vec4 scale;

varying lowp vec4 interp_color;
varying vec2 interp_texcoord;

void main(void) {
  vec4 tex_fg = texture2D(tex0, interp_texcoord);
  vec4 tex_bg = texture2D(tex1, interp_texcoord * scale.z + scale.xy);
  vec4 tex = mix(tex_bg, tex_fg, scale.w);
  float value = tex.r;

  float weight_bg = (1.0 - scale.w) * tex_bg.r;
  float weight_fg = scale.w * tex_fg.r;
  float total_weight = max(0.001, weight_bg + weight_fg);

  // blend hue index, sample once (more pixel-art accurate)
  // float hueidx = (tex_bg.g * weight_bg + tex_fg.g * weight_fg) / total_weight;
  // float hue = 0.0625 + 0.125 * hueidx*255.0;
  // vec4 palettized = texture2D(tex2, vec2(value, hue));

  // sample twice, blend resulting color (better blending)
  float hue_fg = 0.0625 + 0.125 * tex_fg.g*255.0;
  vec4 palettized_fg = texture2D(tex2, vec2(value, hue_fg));
  float hue_bg = 0.0625 + 0.125 * tex_bg.g*255.0;
  vec4 palettized_bg = texture2D(tex2, vec2(value, hue_bg));
  vec4 palettized = (palettized_bg * weight_bg + palettized_fg * weight_fg) / total_weight;

  // vec2 int_coord = floor(interp_texcoord * params.x);
  vec2 int_coord = gl_FragCoord.xy;
  float odd = floor(fract((int_coord.r + int_coord.g) / 2.0) + 0.5);
  if (palettized_bg.a < params.y && odd > 0.5) {
    // offset color by 16px
    palettized = texture2D(tex2, vec2(value + 0.0625, hue_bg));
  }
  gl_FragColor = vec4(palettized.rgb, interp_color.a);
}
