#pragma WebGL2

precision lowp float;

uniform sampler2D tex0;
uniform sampler2D tex1; // palette

varying lowp vec4 interp_color;
varying vec2 interp_texcoord;

void main(void) {
  vec4 tex = texture2D(tex0, interp_texcoord);
  vec3 tex_lookup = texture2D(tex1, vec2(interp_color.r, 0.5 + tex.g * 0.5)).rgb;
  // if tex.r === 1.0, use tex_lookup instead
  tex.rgb = mix(tex.rgb, tex_lookup.rgb, clamp((tex.r - 0.9999) * 20000.0, 0.0, 1.0));
  gl_FragColor = vec4(tex.rgb, tex.a * interp_color.a);
}
