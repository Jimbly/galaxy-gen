#pragma WebGL2

precision lowp float;

uniform sampler2D tex0; // pmtex
uniform sampler2D tex1; // planet generated
uniform sampler2D tex2; // palette
uniform vec4 params; // [ rotation, border, sun_dir, unused]
uniform vec4 scale;

varying lowp vec4 interp_color;
varying vec2 interp_texcoord;

void main(void) {
  vec4 pmtex = texture2D(tex0, interp_texcoord);
  float v = pmtex.b < 0.5 + params.y ? 1.0 : 0.0;
  float raw_longitude = pmtex.x;
  float longitude = raw_longitude + params.x;
  float latitude = pmtex.y;
  vec4 plantex = texture2D(tex1, vec2(longitude, latitude));
  float long_dist = abs(raw_longitude*2.0 - params.z);
  if (long_dist > 1.0) {
    long_dist = 2.0 - long_dist;
  }
  // float vv = long_dist > 0.45 ? long_dist > 0.65 ? 0.625 : 0.375 : 0.125;
  float vv = 0.25 + 0.25 * (long_dist - 0.45) * (1.0 / 0.2);
  plantex = texture2D(tex2, vec2(plantex.r, vv));
  if (pmtex.b >= 0.5) {
    plantex.rgb = vec3(0.0);
  }
  gl_FragColor = vec4(plantex.rgb, interp_color.a * v);
  //gl_FragColor = vec4(longitude, 0.0, 0.0, interp_color.a * v);
}
