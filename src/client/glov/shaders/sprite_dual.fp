#pragma WebGL2

precision lowp float;

uniform sampler2D tex0;
uniform sampler2D tex1;
uniform lowp vec4 color1;

varying lowp vec4 interp_color;
varying vec2 interp_texcoord;

void main(void) {
  vec4 tex0 = texture2D(tex0,interp_texcoord);
  vec2 tex1 = texture2D(tex1,interp_texcoord).rg;
  float value = dot(tex0.rgb, vec3(0.2, 0.5, 0.3));
  vec3 valueR = value * interp_color.rgb;
  vec3 valueG = value * color1.rgb;
  vec3 value3 = mix(tex0.rgb, valueG, tex1.g);
  value3 = mix(value3, valueR, tex1.r);
  gl_FragColor = vec4(value3, tex0.a * interp_color.a);
}
