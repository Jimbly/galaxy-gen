#pragma WebGL2

precision lowp float;

varying highp vec2 interp_texcoord;
varying lowp vec4 interp_color;
vec4 _ret_0;
uniform sampler2D tex0;
uniform vec4 param0;
uniform vec4 outlineColor;
void main()
{
  float texture0=texture2D(tex0,interp_texcoord).r;
  // Outline
  vec4 outcolor = vec4(outlineColor.xyz, 0);
  outcolor.w = clamp(texture0 * param0.x + param0.z, 0.0, 1.0);
  outcolor.w = outcolor.w * outlineColor.w;
  // outcolor = mix(outcolor, outlineColor, outcolor.w); // Makes a blackish border
  // Main body
  float t = clamp(texture0 * param0.x + param0.y, 0.0, 1.0);
  gl_FragColor = mix(outcolor, interp_color, t);
}
