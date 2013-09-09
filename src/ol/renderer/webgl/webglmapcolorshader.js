// This file is automatically generated, do not edit
goog.provide('ol.renderer.webgl.map.shader.Color');
goog.require('ol.webgl.shader');
/**
 * @constructor
 * @extends {ol.webgl.shader.Fragment}
 * @param {WebGLRenderingContext=} opt_gl GL.
 */
ol.renderer.webgl.map.shader.ColorFragment = function(opt_gl) {
  var source = ol.renderer.webgl.map.shader.ColorFragment.SOURCE;
  if (goog.isDef(opt_gl)) {
    source = ol.renderer.webgl.map.shader.Color.sourcePreamble_(opt_gl) + source;
  }
  goog.base(this, source);
};
goog.inherits(ol.renderer.webgl.map.shader.ColorFragment, ol.webgl.shader.Fragment);
goog.addSingletonGetter(ol.renderer.webgl.map.shader.ColorFragment);
/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.map.shader.ColorFragment.DEBUG_SOURCE = '//! NAMESPACE=ol.renderer.webgl.map.shader.Color\n//! CLASS=ol.renderer.webgl.map.shader.Color\n\n\n//! COMMON\n\nprecision mediump float;\n\nvarying vec2 v_texCoord;\n\n//! FRAGMENT\n// @see https://svn.webkit.org/repository/webkit/trunk/Source/WebCore/platform/graphics/filters/skia/SkiaImageFilterBuilder.cpp\nuniform mat4 u_colorMatrix;\nuniform float u_opacity;\nuniform sampler2D u_texture;\n\nvoid main(void) {\n  vec4 texColor = texture2D(u_texture, v_texCoord);\n  gl_FragColor.rgb = (u_colorMatrix * vec4(texColor.rgb, 1.)).rgb;\n  gl_FragColor.a = texColor.a * u_opacity;\n}\n\n';
/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.map.shader.ColorFragment.OPTIMIZED_SOURCE = 'precision mediump float;varying vec2 a;uniform mat4 d;uniform float e;uniform sampler2D f;void main(){vec4 g=texture2D(f,a);gl_FragColor.rgb=(d*vec4(g.rgb,1)).rgb;gl_FragColor.a=g.a*e;}';
/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.map.shader.ColorFragment.SOURCE = goog.DEBUG ?
    ol.renderer.webgl.map.shader.ColorFragment.DEBUG_SOURCE :
    ol.renderer.webgl.map.shader.ColorFragment.OPTIMIZED_SOURCE;
/**
 * @constructor
 * @extends {ol.webgl.shader.Vertex}
 * @param {WebGLRenderingContext=} opt_gl GL.
 */
ol.renderer.webgl.map.shader.ColorVertex = function(opt_gl) {
  var source = ol.renderer.webgl.map.shader.ColorVertex.SOURCE;
  if (goog.isDef(opt_gl)) {
    source = ol.renderer.webgl.map.shader.Color.sourcePreamble_(opt_gl) + source;
  }
  goog.base(this, source);
};
goog.inherits(ol.renderer.webgl.map.shader.ColorVertex, ol.webgl.shader.Vertex);
goog.addSingletonGetter(ol.renderer.webgl.map.shader.ColorVertex);
/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.map.shader.ColorVertex.DEBUG_SOURCE = '//! NAMESPACE=ol.renderer.webgl.map.shader.Color\n//! CLASS=ol.renderer.webgl.map.shader.Color\n\n\n//! COMMON\n\nprecision mediump float;\n\nvarying vec2 v_texCoord;\n\n//! VERTEX\nattribute vec2 a_position;\nattribute vec2 a_texCoord;\n\nuniform mat4 u_texCoordMatrix;\nuniform mat4 u_projectionMatrix;\n\nvoid main(void) {\n  gl_Position = u_projectionMatrix * vec4(a_position, 0., 1.);\n  v_texCoord = (u_texCoordMatrix * vec4(a_texCoord, 0., 1.)).st;\n}\n\n\n';
/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.map.shader.ColorVertex.OPTIMIZED_SOURCE = 'precision mediump float;varying vec2 a;attribute vec2 d,e;uniform mat4 b,c;void main(){gl_Position=c*vec4(d,0,1);a=(b*vec4(e,0,1)).st;}';
/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.map.shader.ColorVertex.SOURCE = goog.DEBUG ?
    ol.renderer.webgl.map.shader.ColorVertex.DEBUG_SOURCE :
    ol.renderer.webgl.map.shader.ColorVertex.OPTIMIZED_SOURCE;
/**
 * @constructor
 * @param {WebGLRenderingContext} gl GL.
 * @param {WebGLProgram} program Program.
 */
ol.renderer.webgl.map.shader.Color.Locations = function(gl, program) {
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
  this.u_colorMatrix = gl.getUniformLocation(
      program, goog.DEBUG ? 'u_colorMatrix' : 'd');
  /**
   * @type {WebGLUniformLocation}
   */
  this.u_opacity = gl.getUniformLocation(
      program, goog.DEBUG ? 'u_opacity' : 'e');
  /**
   * @type {WebGLUniformLocation}
   */
  this.u_texture = gl.getUniformLocation(
      program, goog.DEBUG ? 'u_texture' : 'f');
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
ol.renderer.webgl.map.shader.Color.sourcePreamble_ = function(gl) {
  return (
'\n');
};
