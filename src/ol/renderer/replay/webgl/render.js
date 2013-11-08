goog.provide('ol.renderer.replay.webgl.Render');

goog.require('ol.renderer.replay.api.Renderer');
goog.require('ol.renderer.replay.spi.Render');

goog.require('ol.renderer.replay.webgl.Renderer');



/**
 * @constructor
 * @extends {ol.renderer.replay.spi.Render.<
 *    ol.renderer.replay.webgl.Renderer>}
 */
ol.renderer.replay.webgl.Render = function() {
  goog.base(this);
};
goog.inherits(
    ol.renderer.replay.webgl.Render,
    ol.renderer.replay.spi.Render);


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.Render.prototype.configure =
    function(batch, offset) {

  batch = /** @type {ol.renderer.replay.webgl.Batch} */ (batch);

  var context = this.context,
      paramsValid = ! this.context.parametersChanged;

  var gl = context.gl,
      prevRender = /** @type {ol.renderer.replay.webgl.Render} */
      (context.currentRender);

  if (prevRender != this || goog.isNull(batch)) {

    if (! goog.isNull(prevRender)) {
      prevRender.glDeactivate(gl);
    }

    if (! goog.isNull(batch)) {

      if (! gl.isProgram(this.glProgram)) {
        this.glSetReady(gl);
      }

      this.glActivate(gl);
      paramsValid = false;
    }
  }

  if (! goog.isNull(batch)) {

    if (! paramsValid) {
      this.glApplyParameters(gl, context.parameters);
      context.parametersChanged = false;
    }

    offset = this.glConfigure(gl, batch, offset) || offset;
  }

  return offset;
};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.Render.prototype.render =
    function(batch, offset) {

  var context = this.context,
      nElements = batch.controlStream[offset];

  context.gl.drawElements(
      goog.webgl.TRIANGLES, nElements,
      goog.webgl.UNSIGNED_SHORT, context.indexBufferOffset);
  context.indexBufferOffset += nElements * 2;

  return offset + 1;
};


/**
 * WebGL program handle.
 *
 * @type {WebGLProgram}
 * @protected
 */
ol.renderer.replay.webgl.
    Render.prototype.glProgram = null;


/**
 * Array of vertexAttribPointer arguments describing the vertex buffer
 * format.
 *
 * @type {Array.<Array.<number|boolean>>}
 * @protected
 */
ol.renderer.replay.webgl.
    Render.prototype.glVertexBufferFormat = null;


/**
 * Initialization with rendering context. Sets 'glProgram' and
 * 'glVertexBufferFormat'.
 *
 * @param {WebGLRenderingContext} gl GL.
 * @protected
 */
ol.renderer.replay.webgl.Render.prototype.glSetReady =
    goog.abstractMethod;


/**
 * Prepare rendering state for using this render.
 *
 * @param {WebGLRenderingContext} gl GL.
 * @protected
 */
ol.renderer.replay.webgl.Render.prototype.glActivate =
    function(gl) {

  this.context.setProgram(this.glProgram);

  var fmt = this.glVertexBufferFormat;
  for (var i = 0, n = fmt.length; i < n; ++i) {
    gl.enableVertexAttribArray(/** @type {number} */ (fmt[i][0]));
  }
};


/**
 * Configure or rendering of a specific batch.
 *
 * @param {WebGLRenderingContext} gl GL.
 * @param {ol.renderer.replay.webgl.Batch} batch Batch.
 * @param {number} offset Control stream offset.
 * @return {number|undefined}
 *    Control stream offset after consumed data.
 * @protected
 */
ol.renderer.replay.webgl.Render.prototype.glConfigure =
    function(gl, batch, offset) {

  var fmt = this.glVertexBufferFormat,
      vertexBufferOffset = batch.controlStream[offset];
  for (var args, i = 0, n = fmt.length; i < n; ++i) {
    args = /** @type {Array.<?>} */ (fmt[i]);
    gl.vertexAttribPointer(
        args[0], args[1], args[2], args[3], args[4],
        args[5] + vertexBufferOffset);
  }
  return offset + 1;
};


/**
 * Apply this Renderer's parameters to the rendering state.
 *
 * @param {WebGLRenderingContext} gl GL.
 * @param {ol.renderer.replay.api.Renderer.ParameterVector} params
 *    Renderer's parameter vector.
 * @protected
 */
ol.renderer.replay.webgl.Render.prototype.glApplyParameters =
    goog.abstractMethod;


/**
 * Tidy up rendering state after this render.
 *
 * @param {WebGLRenderingContext} gl GL.
 * @protected
 */
ol.renderer.replay.webgl.Render.prototype.glDeactivate =
    function(gl) {

  var fmt = this.glVertexBufferFormat;
  for (var i = 0, n = fmt.length; i < n; ++i) {
    gl.disableVertexAttribArray(/** @type {number} */ (fmt[i][0]));
  }
};
