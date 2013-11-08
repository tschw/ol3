//! NAMESPACE=ol.renderer.replay.webgl.geom.PointsRenderShader
//! CLASS=ol.renderer.replay.webgl.geom.PointsRenderShader

//! COMMON

//! INCLUDE common_lib.glsl

varying vec2 TexCoord;
varying float Opacity;


//! VERTEX

//! INCLUDE gpudata_lib.glsl

attribute vec4 Position;
attribute vec4 Style;
// extent (sign-adjusted per vertex)
// anchorpoint
// rotation
// opacity

attribute float AltExtent;

attribute float EncTexPos;

uniform vec4 Pretranslation;
uniform mat4 Transform;
uniform vec2 PixelScale;

const float TEXTURE_SCALE = 1. / 256.;

void main(void) {

    gl_Position = Transform * rteDecode(Position, Pretranslation);
    vec2 extent = decodeVec2I12(AltExtent + Style.x);
    vec2 anchor = decodeVec2I12(Style.y);

    float angle = abs(Style.z) +
        max(0., sign(Style.z)) * atan(Transform[0].y, Transform[0].x);
    Opacity = Style.w;

    vec2 corner = abs(extent) + extent;

    vec2 csRot = vec2(cos(angle), sin(angle));
    vec2 extrusion = mat2(csRot, rotatedCw(csRot)) * (corner - anchor);

    TexCoord = (decodeVec2U12(EncTexPos) + corner) * TEXTURE_SCALE;
    gl_Position.xy += extrusion * gl_Position.w * PixelScale;
}


//! FRAGMENT

uniform float RcpGammaIn;

uniform sampler2D Sampler0;
uniform sampler2D Sampler1;
uniform sampler2D Sampler2;
uniform sampler2D Sampler3;
uniform sampler2D Sampler4;
uniform sampler2D Sampler5;
uniform sampler2D Sampler6;
uniform sampler2D Sampler7;

void main(void) {

  vec4 color = texture2D(Sampler0, TexCoord);
  gl_FragColor = vec4(applyGamma(color.rgb, RcpGammaIn),
                      sqrt(color.a * Opacity));
}
