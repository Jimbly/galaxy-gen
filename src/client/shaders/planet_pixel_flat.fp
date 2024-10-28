#pragma WebGL2

precision lowp float;

uniform sampler2D tex0; // planet generated
uniform sampler2D tex1; // palette
uniform vec4 params; // [ rotation, border, sun_dir, unused]
uniform vec4 scale;

varying lowp vec4 interp_color;
varying vec2 interp_texcoord;

void main(void) {
  float longitude = interp_texcoord.x;
  float latitude = interp_texcoord.y;
  vec4 plantex = texture2D(tex0, vec2(longitude, latitude));
  plantex = texture2D(tex1, vec2(plantex.r, 0.0));
  gl_FragColor = vec4(plantex.rgb, interp_color.a);
  //gl_FragColor = vec4(longitude, 0.0, 0.0, interp_color.a * v);
}
