goog.provide('ol.renderer.replay.webgl.Batch');

goog.require('ol.renderer.replay.spi.Batch');
goog.require('ol.renderer.replay.spi.ControlStream');



/**
 * @constructor
 * @implements {ol.renderer.replay.spi.Batch}
 * @param {ol.renderer.replay.spi.ControlStream} controlStream
 * @param {Array.<number>} indices Index data.
 * @param {Array.<number>} vertices Vertex data.
 * @param {ol.renderer.replay.api.Batch.ErrorState} errorState
 */
ol.renderer.replay.webgl.Batch =
    function(controlStream, indices, vertices, errorState) {

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
