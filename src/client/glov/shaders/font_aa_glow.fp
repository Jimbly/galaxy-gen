#pragma WebGL2

precision lowp float;

varying vec2 interp_texcoord;
varying lowp vec4 interp_color;
vec4 _ret_0;
uniform sampler2D tex0;
uniform vec4 param0;
uniform vec4 glowColor;
uniform vec4 glowParams;
void main()
{
  float texture0=texture2D(tex0,interp_texcoord).r;
  // Glow
  vec2 glowCoord = interp_texcoord + glowParams.xy;
  float textureGlow = texture2D(tex0, glowCoord).r;
  float t = clamp(textureGlow * glowParams.z + glowParams.w, 0.0, 1.0);
  vec4 outcolor = vec4(glowColor.xyz, t * glowColor.w);
  // Main body
  t = clamp(texture0 * param0.x + param0.y, 0.0, 1.0);
  gl_FragColor = mix(outcolor, interp_color, t);
}
