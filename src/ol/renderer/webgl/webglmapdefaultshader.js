// This file is automatically generated, do not edit
goog.provide('ol.renderer.webgl.map.shader.Default');
goog.require('ol.webgl.shader');
/**
 * @constructor
 * @extends {ol.webgl.shader.Fragment}
 * @param {WebGLRenderingContext} gl GL.
 */
ol.renderer.webgl.map.shader.DefaultFragment = function(gl) {
  goog.base(this,
    ol.renderer.webgl.map.shader.Default.sourcePreamble_(gl) + ol.renderer.webgl.map.shader.DefaultFragment.SOURCE);
};
goog.inherits(ol.renderer.webgl.map.shader.DefaultFragment, ol.webgl.shader.Fragment);
/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.map.shader.DefaultFragment.DEBUG_SOURCE =
    '//! NAMESPACE=ol.renderer.webgl.map.shader.Default\n//! CLASS=ol.renderer.webgl.map.shader.Default\n\n//! COMMON\n\nvarying vec2 v_texCoord;\n\n\n//! FRAGMENT\n\nuniform float u_opacity;\nuniform sampler2D u_texture;\n\nvoid main(void) {\n  vec4 texColor = texture2D(u_texture, v_texCoord);\n  gl_FragColor.rgb = texColor.rgb;\n  gl_FragColor.a = texColor.a * u_opacity;\n}\n\n';
/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.map.shader.DefaultFragment.OPTIMIZED_SOURCE =
    'varying vec2 a;uniform float d;uniform sampler2D e;void main(){vec4 f=texture2D(e,a);gl_FragColor.rgb=f.rgb;gl_FragColor.a=f.a*d;}';
/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.map.shader.DefaultFragment.SOURCE = goog.DEBUG ?
    ol.renderer.webgl.map.shader.DefaultFragment.DEBUG_SOURCE :
    ol.renderer.webgl.map.shader.DefaultFragment.OPTIMIZED_SOURCE;
/**
 * @constructor
 * @extends {ol.webgl.shader.Vertex}
 * @param {WebGLRenderingContext} gl GL.
 */
ol.renderer.webgl.map.shader.DefaultVertex = function(gl) {
  goog.base(this,
    ol.renderer.webgl.map.shader.Default.sourcePreamble_(gl) + ol.renderer.webgl.map.shader.DefaultVertex.SOURCE);
};
goog.inherits(ol.renderer.webgl.map.shader.DefaultVertex, ol.webgl.shader.Vertex);
/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.map.shader.DefaultVertex.DEBUG_SOURCE =
    '//! NAMESPACE=ol.renderer.webgl.map.shader.Default\n//! CLASS=ol.renderer.webgl.map.shader.Default\n\n//! COMMON\n\nvarying vec2 v_texCoord;\n\n\n//! VERTEX\n\nattribute vec2 a_position;\nattribute vec2 a_texCoord;\n\nuniform mat4 u_texCoordMatrix;\nuniform mat4 u_projectionMatrix;\n\nvoid main(void) {\n  gl_Position = u_projectionMatrix * vec4(a_position, 0., 1.);\n  v_texCoord = (u_texCoordMatrix * vec4(a_texCoord, 0., 1.)).st;\n}\n\n\n';
/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.map.shader.DefaultVertex.OPTIMIZED_SOURCE =
    'varying vec2 a;attribute vec2 d,e;uniform mat4 b,c;void main(){gl_Position=c*vec4(d,0,1);a=(b*vec4(e,0,1)).st;}';
/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.map.shader.DefaultVertex.SOURCE = goog.DEBUG ?
    ol.renderer.webgl.map.shader.DefaultVertex.DEBUG_SOURCE :
    ol.renderer.webgl.map.shader.DefaultVertex.OPTIMIZED_SOURCE;
/**
 * @constructor
 * @param {WebGLRenderingContext} gl GL.
 * @param {WebGLProgram} program Program.
 */
ol.renderer.webgl.map.shader.Default.Locations = function(gl, program) {
  /**
   * @type {WebGLUniformLocation}
   */
  this.u_texCoordMatrix = gl.getUniformLocation(
      program, goog.DEBUG ? 'u_texCoordMatrix' : 'b');
  /**
   * @type {WebGLUniformLocation}
   */
  this.u_projectionMatrix = gl.getUniformLocation(
      program, goog.DEBUG ? 'u_projectionMatrix' : 'c');
  /**
   * @type {WebGLUniformLocation}
   */
  this.u_opacity = gl.getUniformLocation(
      program, goog.DEBUG ? 'u_opacity' : 'd');
  /**
   * @type {WebGLUniformLocation}
   */
  this.u_texture = gl.getUniformLocation(
      program, goog.DEBUG ? 'u_texture' : 'e');
  /**
   * @type {number}
   */
  this.a_position = gl.getAttribLocation(
      program, goog.DEBUG ? 'a_position' : 'd');
  /**
   * @type {number}
   */
  this.a_texCoord = gl.getAttribLocation(
      program, goog.DEBUG ? 'a_texCoord' : 'e');
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
ol.renderer.webgl.map.shader.Default.sourcePreamble_ = function(gl) {
  return ('' +
'\n');
};
