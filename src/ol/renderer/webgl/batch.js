goog.provide('ol.renderer.webgl.Batch');



/**
 * @class
 * Replayable rendering instructions with associated data on the GPU.
 *
 * @constructor
 * Create a batch by uploading its data to the GPU.
 *
 * @param {WebGLRenderingContext} gl GL.
 * @param {ol.renderer.webgl.batching.Blueprint} blueprint Blueprint as
 *     returned from 'BatchBuilder.releaseBlueprint'.
 * @see {ol.renderer.webgl.BatchBuilder}
 */
ol.renderer.webgl.Batch = function(gl, blueprint) {

  /**
   * @type {WebGLBuffer}
   */
  this.indexBuffer = ol.renderer.webgl.Batch.glBuffer_(
      gl, goog.webgl.ELEMENT_ARRAY_BUFFER, blueprint.indexData);

  /**
   * @type {WebGLBuffer}
   */
  this.vertexBuffer = ol.renderer.webgl.Batch.glBuffer_(
      gl, goog.webgl.ARRAY_BUFFER, blueprint.vertexData);

  /**
   * @type {ol.renderer.webgl.batching.ControlStream}
   */
  this.controlStream = blueprint.controlStream;
};


/**
 * Remove this batch and free its data on the GPU.
 *
 * @param {WebGLRenderingContext} gl GL.
 */
ol.renderer.webgl.Batch.prototype.dispose = function(gl) {

  this.controlStream = ol.renderer.webgl.Batch.EMPTY_ARRAY_;
  gl.deleteBuffer(this.indexBuffer);
  gl.deleteBuffer(this.vertexBuffer);
};


/**
 * Create and populate WebGL buffer.
 *
 * @param {WebGLRenderingContext} gl GL.
 * @param {number} target GL target descriptor.
 * @param {Float32Array|Uint16Array} data Data as typed array.
 * @return {WebGLBuffer} GL buffer object.
 * @private
 */
ol.renderer.webgl.Batch.glBuffer_ = function(gl, target, data) {
  var result = gl.createBuffer();
  gl.bindBuffer(target, result);
  gl.bufferData(target, data, goog.webgl.STATIC_DRAW);
  return result;
};


/**
 * Empty array.
 *
 * @type {Array}
 * @const
 * @private
 */
ol.renderer.webgl.Batch.EMPTY_ARRAY_ = [];
