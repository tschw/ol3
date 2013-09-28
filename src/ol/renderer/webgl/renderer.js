goog.provide('ol.renderer.webgl.Renderer');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.webgl');

goog.require('ol.renderer.webgl.batching');
goog.require('ol.renderer.webgl.common');
goog.require('ol.renderer.webgl.rendering');



/**
 * @class
 * Generic OpenGL batch renderer.
 *
 * @constructor
 * Create a batch renderer instance.
 */
ol.renderer.webgl.Renderer = function() {

  /**
   * @type {ol.renderer.webgl.rendering.Parameters}
   * @private
   */
  this.parameters_ = goog.array.clone(
      ol.renderer.webgl.Renderer.DEFAULT_PARAM_VECTOR_);

  this.renders_ = [];
};


/**
* @type {?ol.renderer.webgl.rendering.Render}
* @private
*/
ol.renderer.webgl.Renderer.prototype.currentRender_ = null;


/**
* @type {?WebGLProgram}
* @private
*/
ol.renderer.webgl.Renderer.prototype.currentProgram_ = null;


/**
 * @type {boolean}
 * @private
 */
ol.renderer.webgl.Renderer.prototype.setUniforms_ = true;


/**
 * Register a Render with this renderer.
 * @param {ol.renderer.webgl.rendering.Render} render
 *     Render instance to register.
 */
ol.renderer.webgl.Renderer.prototype.registerRender =
    function(render) {

  this.renders_[render.type] = render;
};


/**
 * Resets the state of the renderer.
 *
 * Calling this method informs the renderer that the GL has been
 * used outside of it and that it cannot make assumptions about
 * its state.
 *
 * Should be called when done rendering so all previsouly enabled
 * vertex attribute arrays are disabled again.
 *
 * @param {WebGLRenderingContext} gl GL.
 */
ol.renderer.webgl.Renderer.prototype.reset = function(gl) {

  this.disableVertexAttribArrays_(gl);
  this.currentRender_ = null;
  this.currentProgram_ = null;
};


/**
 * Set a parameter.
 *
 * @param {ol.renderer.webgl.rendering.Parameter} which Parameter to set.
 * @param {number|Array.<number>} state State to set.
 */
ol.renderer.webgl.Renderer.prototype.setParameter = function(which, state) {

  this.setUniforms_ |=
      ol.renderer.webgl.common.setParameter(this.parameters_, which, state);
};


/**
 * Default global parameterization.
 *
 * @type {ol.renderer.webgl.rendering.Parameters}
 * @const
 * @private
 */
ol.renderer.webgl.Renderer.DEFAULT_PARAM_VECTOR_ = [
  // NDC_PIXEL_SIZE
  [1 / 256, 1 / 256],
  // COORDINATE_TRANSFORM
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  // RTE_PRETRANSLATION
  [0, 0, 0, 0, 0, 0],
  // SMOOTHING_PIXELS
  1.75,
  // GAMMA
  2.3
];


/**
 * Render a batch.
 *
 * @param {WebGLRenderingContext} gl GL.
 * @param {ol.renderer.webgl.Batch} batch The batch to render.
 */
ol.renderer.webgl.Renderer.prototype.render = function(gl, batch) {

  var indexOffset = 0, vertexBufferOffset = 0, initBatch = true,
      controlStream = batch.controlStream;

  var i = -1, n = controlStream.length, instr, arg0, arg1, arg2, arg3;
  goog.asserts.assert(!! n, 'Attempt to render empty / unloaded batch.');

  while (++i < n) {
    switch (controlStream[i]) {

      case ol.renderer.webgl.batching.Instruction.DRAW_ELEMENTS:

        arg0 = controlStream[++i];
        gl.drawElements(
            goog.webgl.TRIANGLES, arg0,
            goog.webgl.UNSIGNED_SHORT, indexOffset);
        indexOffset += arg0 * 2;
        break;

      case ol.renderer.webgl.batching.Instruction.SET_STYLE:

        i = this.currentRender_.setStyle(gl, controlStream, ++i);
        break;

      case ol.renderer.webgl.batching.Instruction.CONFIGURE:

        arg0 = controlStream[++i];
        arg1 = controlStream[++i];

        // Lookup render object and activate unless alread active
        goog.asserts.assert(arg0 in this.renders_,
            'No Render registered for type ID in batch.');
        arg0 = this.renders_[arg0];
        if (arg0 !== this.currentRender_) {
          this.activateRender_(gl, arg0);
          // Force vertex format to be set for a new render
          vertexBufferOffset = null;
        }
        // Set buffers, vertex format, or offset unless set already
        if (initBatch) {
          initBatch = false;
          gl.bindBuffer(
              goog.webgl.ELEMENT_ARRAY_BUFFER, batch.indexBuffer);
          gl.bindBuffer(
              goog.webgl.ARRAY_BUFFER, batch.vertexBuffer);
        } else if (arg1 == vertexBufferOffset) {
          break;
        }
        ol.renderer.webgl.Renderer.setVertexBufferFormat_(
            gl, this.currentRender_.vertexBufferFormat,
            (vertexBufferOffset = arg1));
    }
  }
};


/**
 * @param {WebGLRenderingContext} gl GL.
 * @param {ol.renderer.webgl.rendering.Render} render
 * @private
 */
ol.renderer.webgl.Renderer.prototype.activateRender_ = function(gl, render) {

  // Deactivate previously active vertex arrays
  this.disableVertexAttribArrays_(gl);

  // Activate program unless active already
  var prog = render.program;
  if (prog !== this.currentProgram_) {
    gl.useProgram(prog);
    this.currentProgram_ = prog;
    this.setUniforms_ = true;
  }

  // Set uniforms when parameterization or program has changed
  if (this.setUniforms_) {
    render.setUniforms(gl, this.parameters_);
  }

  // Enable required vertex arrays
  var vertexBufferFormat = render.vertexBufferFormat;
  for (var i = 0, n = vertexBufferFormat.length; i < n; ++i) {
    gl.enableVertexAttribArray(vertexBufferFormat[i][0]);
  }

  // Now using a new render
  this.currentRender_ = render;
};


/**
 * Disables all vertex attribute arrays used by the currently active
 * render.
 *
 * @param {WebGLRenderingContext} gl GL.
 * @private
 */
ol.renderer.webgl.Renderer.prototype.disableVertexAttribArrays_ =
    function(gl) {

  if (goog.isDefAndNotNull(this.currentRender_)) {
    var fmt = this.currentRender_.vertexBufferFormat;
    for (var i = 0, n = fmt.length; i < n; ++i) {
      gl.disableVertexAttribArray(fmt[i][0]);
    }
  }
};


/**
 * Configure the layout of a vertex buffer.
 *
 * @param {WebGLRenderingContext} gl GL.
 * @param {ol.renderer.webgl.rendering.VertexBufferFormat} fmt Buffer format.
 * @param {number} offset Byte offset within the vertex buffer.
 * @private
 */
ol.renderer.webgl.Renderer.setVertexBufferFormat_ = function(gl, fmt, offset) {

  for (var args, i = 0, n = fmt.length; i < n; ++i) {
    args = fmt[i];
    gl.vertexAttribPointer(
        args[0], args[1], args[2], args[3], args[4], args[5] + offset);
  }
};
