precision mediump float;

varying vec2 v_tex_coord;
uniform vec4 u_colour;
uniform sampler2D u_texture;

uniform bool u_use_texture;

void main() {
    if (u_use_texture) {
        gl_FragColor = texture2D(u_texture, v_tex_coord);
    } else {
        gl_FragColor = u_colour;
    }
}

