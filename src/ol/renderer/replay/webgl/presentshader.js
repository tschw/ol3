// This file is automatically generated, do not edit
goog.provide('ol.renderer.replay.webgl.PresentShader');
goog.require('ol.webgl.shader');
/**
 * @constructor
 * @extends {ol.webgl.shader.Fragment}
 * @param {WebGLRenderingContext} gl GL.
 */
ol.renderer.replay.webgl.PresentShaderFragment = function(gl) {
  goog.base(this,
    ol.renderer.replay.webgl.PresentShader.sourcePreamble_(gl) + ol.renderer.replay.webgl.PresentShaderFragment.SOURCE);
};
goog.inherits(ol.renderer.replay.webgl.PresentShaderFragment, ol.webgl.shader.Fragment);
/**
 * @const
 * @type {string}
 */
ol.renderer.replay.webgl.PresentShaderFragment.DEBUG_SOURCE =
    '//! NAMESPACE=ol.renderer.replay.webgl.PresentShader\n//! CLASS=ol.renderer.replay.webgl.PresentShader\n\n//! COMMON\n\nvarying vec2 TexCoord;\n\n\n//! FRAGMENT\n\nuniform vec2 Params;\nfloat reciprocalGamma = Params.x;\nfloat opacity = Params.y;\n\nuniform sampler2D Sampler0;\nuniform sampler2D Sampler1;\n\nvoid main(void) {\n\n    vec4 bottom = texture2D(Sampler0, TexCoord);\n    vec4 top = texture2D(Sampler1, TexCoord);\n    top.a *= opacity;\n\n    gl_FragColor = vec4(\n        pow(mix(bottom.rgb, top.rgb, top.a), vec3(reciprocalGamma)),\n        mix(bottom.a, 1., top.a)\n        );\n}\n\n';
/**
 * @const
 * @type {string}
 */
ol.renderer.replay.webgl.PresentShaderFragment.OPTIMIZED_SOURCE =
    'varying vec2 a;uniform vec2 b;float e=b.x;float f=b.y;uniform sampler2D c,d;void main(){vec4 g,h;g=texture2D(c,a);h=texture2D(d,a);h.a*=f;gl_FragColor=vec4(pow(mix(g.rgb,h.rgb,h.a),vec3(e)),mix(g.a,1.,h.a));}';
/**
 * @const
 * @type {string}
 */
ol.renderer.replay.webgl.PresentShaderFragment.SOURCE = goog.DEBUG ?
    ol.renderer.replay.webgl.PresentShaderFragment.DEBUG_SOURCE :
    ol.renderer.replay.webgl.PresentShaderFragment.OPTIMIZED_SOURCE;
/**
 * @constructor
 * @extends {ol.webgl.shader.Vertex}
 * @param {WebGLRenderingContext} gl GL.
 */
ol.renderer.replay.webgl.PresentShaderVertex = function(gl) {
  goog.base(this,
    ol.renderer.replay.webgl.PresentShader.sourcePreamble_(gl) + ol.renderer.replay.webgl.PresentShaderVertex.SOURCE);
};
goog.inherits(ol.renderer.replay.webgl.PresentShaderVertex, ol.webgl.shader.Vertex);
/**
 * @const
 * @type {string}
 */
ol.renderer.replay.webgl.PresentShaderVertex.DEBUG_SOURCE =
    '//! NAMESPACE=ol.renderer.replay.webgl.PresentShader\n//! CLASS=ol.renderer.replay.webgl.PresentShader\n\n//! COMMON\n\nvarying vec2 TexCoord;\n\n\n//! VERTEX\n\nattribute vec4 Position;\n\nvoid main(void) {\n    gl_Position = Position;\n    TexCoord = (abs(Position.xy) + Position.xy) * 0.5;\n}\n\n\n';
/**
 * @const
 * @type {string}
 */
ol.renderer.replay.webgl.PresentShaderVertex.OPTIMIZED_SOURCE =
    'varying vec2 a;attribute vec4 b;void main(){gl_Position=b;a=(abs(b.xy)+b.xy)*.5;}';
/**
 * @const
 * @type {string}
 */
ol.renderer.replay.webgl.PresentShaderVertex.SOURCE = goog.DEBUG ?
    ol.renderer.replay.webgl.PresentShaderVertex.DEBUG_SOURCE :
    ol.renderer.replay.webgl.PresentShaderVertex.OPTIMIZED_SOURCE;
/**
 * @constructor
 * @param {WebGLRenderingContext} gl GL.
 * @param {WebGLProgram} program Program.
 */
ol.renderer.replay.webgl.PresentShader.Locations = function(gl, program) {
  /**
   * @type {WebGLUniformLocation}
   */
  this.Params = gl.getUniformLocation(
      program, goog.DEBUG ? 'Params' : 'b');
  /**
   * @type {WebGLUniformLocation}
   */
  this.Sampler0 = gl.getUniformLocation(
      program, goog.DEBUG ? 'Sampler0' : 'c');
  /**
   * @type {WebGLUniformLocation}
   */
  this.Sampler1 = gl.getUniformLocation(
      program, goog.DEBUG ? 'Sampler1' : 'd');
  /**
   * @type {number}
   */
  this.Position = gl.getAttribLocation(
      program, goog.DEBUG ? 'Position' : 'b');
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
ol.renderer.replay.webgl.PresentShader.sourcePreamble_ = function(gl) {
  return ('' +
'\n');
};
