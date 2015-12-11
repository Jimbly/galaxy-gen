#pragma WebGL2

precision lowp float;

uniform sampler2D tex0;
uniform sampler2D tex1;
uniform lowp vec4 color1;

varying lowp vec4 interp_color;
varying vec2 interp_texcoord;

void main(void) {
  vec3 tex0 = texture2D(tex0,interp_texcoord).rgb;
  float tex1 = texture2D(tex1,interp_texcoord).r;
  float alpha = tex0.r - tex1 + 1.0;
  // TODO: (perf?) (quality?) better to output pre-multiplied alpha (tex0) and change state?
  vec3 orig_rgb = tex0 / max(0.01, alpha);
  gl_FragColor = vec4(orig_rgb, alpha * interp_color.a);
}
