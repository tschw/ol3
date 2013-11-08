//! NAMESPACE=ol.renderer.replay.webgl.BlendShader
//! CLASS=ol.renderer.replay.webgl.BlendShader

//! COMMON

varying vec2 TexCoord;


//! VERTEX

attribute vec4 Position;

void main(void) {

    gl_Position = Position;
    TexCoord = (abs(Position.xy) + Position.xy) * 0.5;
}


//! FRAGMENT

uniform float Opacity;
uniform sampler2D Sampler0;

void main(void) {

    vec4 color = texture2D(Sampler0, TexCoord);
    color.a *= Opacity;

    const float invisible = 1. / 256.;
    if (color.a < invisible) {
      discard;
    }
    gl_FragColor = color;
}
