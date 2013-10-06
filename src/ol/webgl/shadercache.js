goog.provide('ol.webgl.ShaderCache');

goog.require('goog.asserts');
goog.require('goog.disposable.IDisposable');
goog.require('goog.log');
goog.require('goog.object');

goog.require('ol.typeInfo.TypeIdProvider');
goog.require('ol.webgl.shader');



/**
 * @constructor
 * @extends {ol.typeInfo.TypeIdProvider.<ol.webgl.Shader>}
 * @implements {goog.disposable.IDisposable}
 * @param {WebGLRenderingContext} gl
 */
ol.webgl.ShaderCache = function(gl) {

  /**
   * @type {WebGLRenderingContext}
   * @private
   */
  this.gl_ = gl;

  /**
   * @type {Object.<number, WebGLProgram>}
   * @private
   */
  this.programMap_ = {};

  /**
   * @type {Object.<number, WebGLShader>}
   * @private
   */
  this.shaderMap_ = {};
};
goog.inherits(ol.webgl.ShaderCache, ol.typeInfo.TypeIdProvider);


/**
 * @param {function(new:ol.webgl.shader.Vertex, WebGLRenderingContext)}
 *    vertexShaderCtor Vertex shader class represented by its constructor.
 * @param {function(new:ol.webgl.shader.Fragment, WebGLRenderingContext)}
 *    fragmentShaderCtor Fragment shader class represented by its constructor.
 * @return {WebGLProgram}
 */
ol.webgl.ShaderCache.prototype.getProgram =
    function(vertexShaderCtor, fragmentShaderCtor) {

  var gl = this.gl_,
      programId =
      this.getOrAssignId(vertexShaderCtor) * 10000 +
      this.getOrAssignId(fragmentShaderCtor);

  var glProgram = this.programMap_[programId];

  if (! goog.isDefAndNotNull(glProgram) || ! gl.isProgram(glProgram)) {
    // Instantiate and cache program if nonexistent or invalidated,
    // get and instantiate / cache shaders on the fly.

    glProgram = gl.createProgram();
    gl.attachShader(glProgram, this.getShader(fragmentShaderCtor));
    gl.attachShader(glProgram, this.getShader(vertexShaderCtor));
    gl.linkProgram(glProgram);

    if (goog.DEBUG) {
      if (!gl.getProgramParameter(glProgram, goog.webgl.LINK_STATUS) &&
          !gl.isContextLost()) {
        goog.log.error(this.logger_, gl.getProgramInfoLog(glProgram));
      }
    }
    goog.asserts.assert(
        gl.getProgramParameter(glProgram, goog.webgl.LINK_STATUS) ||
        gl.isContextLost());

    this.programMap_[programId] = glProgram;
  }

  return glProgram;
};


/**
 * @param {function(new:ol.webgl.Shader, WebGLRenderingContext)} shaderCtor
 * @return {WebGLShader}
 */
ol.webgl.ShaderCache.prototype.getShader = function(shaderCtor) {

  var gl = this.gl_,
      shaderId = this.getOrAssignId(shaderCtor);
  var glShader = this.shaderMap_[shaderId];

  if (! goog.isDefAndNotNull(glShader) || ! gl.isShader(glShader)) {
    // Instantiate and cache shader if nonexistent or invalidated

    var shader = new shaderCtor(gl);
    glShader = gl.createShader(shader.getType());
    gl.shaderSource(glShader, shader.getSource());
    gl.compileShader(glShader);
    if (goog.DEBUG) {
      if (!gl.getShaderParameter(glShader, goog.webgl.COMPILE_STATUS) &&
          !gl.isContextLost()) {
        goog.log.error(this.logger_, gl.getShaderInfoLog(glShader));
        var ext = gl.getExtension('WEBGL_debug_shaders');
        if (goog.isDefAndNotNull(ext)) {
          // Chrome/Windows/Debug -> Also log ANGLE-translated HLSL
          goog.log.error(this.logger_, ext.getTranslatedShaderSource(glShader));
        }
      }
    }
    goog.asserts.assert(
        gl.getShaderParameter(glShader, goog.webgl.COMPILE_STATUS) ||
        gl.isContextLost());

    this.shaderMap_[shaderId] = glShader;
  }

  return glShader;
};


/**
 * Remove all cached shaders and programs.
 */
ol.webgl.ShaderCache.prototype.clear = function() {

  goog.object.forEach(this.programMap_, function(program) {
    this.gl_.deleteProgram(program);
  }, this);
  this.programMap_ = {};
  goog.object.forEach(this.shaderMap_, function(shader) {
    this.gl_.deleteShader(shader);
  }, this);
  this.shaderMap_ = {};
};


/**
 * @inheritDoc
 */
ol.webgl.ShaderCache.prototype.dispose = function() {
  this.clear();
  this.shaderMap_ = null;
};


/**
 * @inheritDoc
 */
ol.webgl.ShaderCache.prototype.isDisposed = function() {
  return this.shaderMap_ == null;
};


/**
 * @type {goog.log.Logger}
 * @private
 */
ol.webgl.ShaderCache.prototype.logger_ =
    goog.log.getLogger('ol.webgl.ShaderCache');
