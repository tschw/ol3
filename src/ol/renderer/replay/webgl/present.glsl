//! NAMESPACE=ol.renderer.replay.webgl.PresentShader
//! CLASS=ol.renderer.replay.webgl.PresentShader

//! COMMON

varying vec2 TexCoord;


//! VERTEX

attribute vec4 Position;

void main(void) {
    gl_Position = Position;
    TexCoord = (abs(Position.xy) + Position.xy) * 0.5;
}


//! FRAGMENT

uniform vec2 Params;
float reciprocalGamma = Params.x;
float opacity = Params.y;

uniform sampler2D Sampler0;
uniform sampler2D Sampler1;

void main(void) {

    vec4 bottom = texture2D(Sampler0, TexCoord);
    vec4 top = texture2D(Sampler1, TexCoord);
    top.a *= opacity;

    gl_FragColor = vec4(
        pow(mix(bottom.rgb, top.rgb, top.a), vec3(reciprocalGamma)),
        mix(bottom.a, 1., top.a)
        );
}
