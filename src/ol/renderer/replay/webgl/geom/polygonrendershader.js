// This file is automatically generated, do not edit
goog.provide('ol.renderer.replay.webgl.geom.PolygonRenderShader');
goog.require('ol.webgl.shader');
/**
 * @constructor
 * @extends {ol.webgl.shader.Fragment}
 * @param {WebGLRenderingContext} gl GL.
 */
ol.renderer.replay.webgl.geom.PolygonRenderShaderFragment = function(gl) {
  goog.base(this,
    ol.renderer.replay.webgl.geom.PolygonRenderShader.sourcePreamble_(gl) + ol.renderer.replay.webgl.geom.PolygonRenderShaderFragment.SOURCE);
};
goog.inherits(ol.renderer.replay.webgl.geom.PolygonRenderShaderFragment, ol.webgl.shader.Fragment);
/**
 * @const
 * @type {string}
 */
ol.renderer.replay.webgl.geom.PolygonRenderShaderFragment.DEBUG_SOURCE =
    '//! NAMESPACE=ol.renderer.replay.webgl.geom.PolygonRenderShader\n//! CLASS=ol.renderer.replay.webgl.geom.PolygonRenderShader\n\n//! COMMON\n\nvarying vec4 Color;\n\n\nvec3 decodeRGB(float v) {\n\n    const float downshift16 = 1. / 65536.;\n    const float downshift8  = 1. /   256.;\n\n    return vec3(v * downshift16, fract(v * downshift8), fract(v));\n}\n\nvec4 rteDecode(vec4 highPrecCoord, vec4 highPrecOffset) {\n\n    vec4 v = highPrecCoord + highPrecOffset;\n    v.xy += v.zw;\n    v.zw = vec2(0.0, 1.0);\n    return v;\n}\n\n\n//! FRAGMENT\n\nvoid main(void) {\n\n  gl_FragColor = Color;\n}\n\n';
/**
 * @const
 * @type {string}
 */
ol.renderer.replay.webgl.geom.PolygonRenderShaderFragment.OPTIMIZED_SOURCE =
    'varying vec4 a;void main(){gl_FragColor=a;}';
/**
 * @const
 * @type {string}
 */
ol.renderer.replay.webgl.geom.PolygonRenderShaderFragment.SOURCE = goog.DEBUG ?
    ol.renderer.replay.webgl.geom.PolygonRenderShaderFragment.DEBUG_SOURCE :
    ol.renderer.replay.webgl.geom.PolygonRenderShaderFragment.OPTIMIZED_SOURCE;
/**
 * @constructor
 * @extends {ol.webgl.shader.Vertex}
 * @param {WebGLRenderingContext} gl GL.
 */
ol.renderer.replay.webgl.geom.PolygonRenderShaderVertex = function(gl) {
  goog.base(this,
    ol.renderer.replay.webgl.geom.PolygonRenderShader.sourcePreamble_(gl) + ol.renderer.replay.webgl.geom.PolygonRenderShaderVertex.SOURCE);
};
goog.inherits(ol.renderer.replay.webgl.geom.PolygonRenderShaderVertex, ol.webgl.shader.Vertex);
/**
 * @const
 * @type {string}
 */
ol.renderer.replay.webgl.geom.PolygonRenderShaderVertex.DEBUG_SOURCE =
    '//! NAMESPACE=ol.renderer.replay.webgl.geom.PolygonRenderShader\n//! CLASS=ol.renderer.replay.webgl.geom.PolygonRenderShader\n\n//! COMMON\n\nvarying vec4 Color;\n\n\n//! VERTEX\n\n//! INCLUDE gpudata_lib.glsl\nvec3 decodeRGB(float v) {\n\n    const float downshift16 = 1. / 65536.;\n    const float downshift8  = 1. /   256.;\n\n    return vec3(v * downshift16, fract(v * downshift8), fract(v));\n}\n\nvec4 rteDecode(vec4 highPrecCoord, vec4 highPrecOffset) {\n\n    vec4 v = highPrecCoord + highPrecOffset;\n    v.xy += v.zw;\n    v.zw = vec2(0.0, 1.0);\n    return v;\n}\n\n\n\nattribute vec4 Position;\nattribute vec2 Style;\n\nuniform vec4 Pretranslation;\nuniform mat4 Transform;\n\n\nvoid main(void) {\n\n    gl_Position = Transform * rteDecode(Position, Pretranslation);\n\n    Color = vec4(decodeRGB(Style.x), Style.y);\n}\n\n\n';
/**
 * @const
 * @type {string}
 */
ol.renderer.replay.webgl.geom.PolygonRenderShaderVertex.OPTIMIZED_SOURCE =
    'varying vec4 a;vec3 i(float f){const float g=1./65536.;const float h=1./256.;return vec3(f*g,fract(f*h),fract(f));}vec4 j(vec4 f,vec4 g){vec4 h=f+g;h.xy+=h.zw;h.zw=vec2(0,1);return h;}attribute vec4 d;attribute vec2 e;uniform vec4 b;uniform mat4 c;void main(){gl_Position=c*j(d,b);a=vec4(i(e.x),e.y);}';
/**
 * @const
 * @type {string}
 */
ol.renderer.replay.webgl.geom.PolygonRenderShaderVertex.SOURCE = goog.DEBUG ?
    ol.renderer.replay.webgl.geom.PolygonRenderShaderVertex.DEBUG_SOURCE :
    ol.renderer.replay.webgl.geom.PolygonRenderShaderVertex.OPTIMIZED_SOURCE;
/**
 * @constructor
 * @param {WebGLRenderingContext} gl GL.
 * @param {WebGLProgram} program Program.
 */
ol.renderer.replay.webgl.geom.PolygonRenderShader.Locations = function(gl, program) {
  /**
   * @type {WebGLUniformLocation}
   */
  this.Pretranslation = gl.getUniformLocation(
      program, goog.DEBUG ? 'Pretranslation' : 'b');
  /**
   * @type {WebGLUniformLocation}
   */
  this.Transform = gl.getUniformLocation(
      program, goog.DEBUG ? 'Transform' : 'c');
  /**
   * @type {number}
   */
  this.Position = gl.getAttribLocation(
      program, goog.DEBUG ? 'Position' : 'd');
  /**
   * @type {number}
   */
  this.Style = gl.getAttribLocation(
      program, goog.DEBUG ? 'Style' : 'e');
};
/**
 * Generates a source preamble from the expressions in JSCONST
 * directives.
 * We have the rendering context passed in to allow querying
 * extensions and context attributes.
 *
 * @private
 * @param {WebGLRenderingContext} gl GL.
 * @return {string} Shader source preamble.
 */
ol.renderer.replay.webgl.geom.PolygonRenderShader.sourcePreamble_ = function(gl) {
  return ('' +
'\n');
};
