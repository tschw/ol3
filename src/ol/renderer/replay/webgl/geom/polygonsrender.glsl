//! NAMESPACE=ol.renderer.replay.webgl.geom.PolygonsRenderShader
//! CLASS=ol.renderer.replay.webgl.geom.PolygonsRenderShader

//! COMMON

varying vec4 Color;


//! VERTEX

//! INCLUDE gpudata_lib.glsl

attribute vec4 Position;
attribute vec2 Style;

uniform vec4 Pretranslation;
uniform mat4 Transform;


void main(void) {

    gl_Position = Transform * rteDecode(Position, Pretranslation);

    Color = vec4(decodeRGB(Style.x), Style.y);
}


//! FRAGMENT

void main(void) {

  gl_FragColor = Color;
}
