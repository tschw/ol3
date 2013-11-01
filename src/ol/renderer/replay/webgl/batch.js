goog.provide('ol.renderer.replay.webgl.Batch');

goog.require('ol.renderer.replay.spi.Batch');
goog.require('ol.renderer.replay.spi.ControlStream');



/**
 * @constructor
 * @implements {ol.renderer.replay.spi.Batch}
 * @param {ol.renderer.replay.spi.ControlStream} controlStream
 * @param {Array.<number>} indices Index data.
 * @param {Array.<number>} vertices Vertex data.
 * @param {number} texRefOffset Offset to the block of texture
 *    references at the end of the vertex data in bytes.
 * @param {Object.<number,number>} imageSet Images referenced by
 *    this batch.
 * @param {ol.renderer.replay.api.Batch.ErrorState} errorState
 */
ol.renderer.replay.webgl.Batch = function(
    controlStream, indices, vertices, texRefOffset, imageSet, errorState) {

  /**
   * @inheritDoc
   * @type {ol.renderer.replay.spi.ControlStream}
   */
  this.controlStream = new Float32Array(controlStream);

  /**
   * Index data.
   *
   * @type {Uint16Array}
   */
  this.indices = new Uint16Array(indices);

  /**
   * Vertex data.
   *
   * @type {Float32Array}
   */
  this.vertices = new Float32Array(vertices);

  /**
   * Offset to the region (at the end of the vertex buffer) storing texture
   * references in bytes.
   *
   * @type {number}
   */
  this.texRefOffset = texRefOffset;

  /**
   * Texture references used by this batch.
   *
   * @type {Object.<number, number>}
   */
  this.imageSet = imageSet;

  /**
   * @inheritDoc
   */
  this.transferables = [this.controlStream, this.indices, this.vertices];

  /**
   * @type {ol.renderer.replay.api.Batch.ErrorState}
   * @private
   */
  this.errorState_ = errorState;
};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.Batch.prototype.getErrorState = function() {
  return this.errorState_;
};


/**
 * @type {?WebGLBuffer}
 */
ol.renderer.replay.webgl.Batch.prototype.vertexBuffer = null;


/**
 * @type {?WebGLBuffer}
 */
ol.renderer.replay.webgl.Batch.prototype.indexBuffer = null;
