goog.provide('ol.renderer.replay.webgl.BatchBuilder');

goog.require('goog.log');

goog.require('ol.renderer.replay.spi.BatchBuilder');
goog.require('ol.renderer.replay.spi.GeometriesHandlerCtors');

goog.require('ol.renderer.replay.webgl.Batch');



/**
 * @constructor
 * @extends {ol.renderer.replay.spi.BatchBuilder}
 * @param {ol.renderer.replay.spi.GeometriesHandlerCtors} batcherCtors
 */
ol.renderer.replay.webgl.BatchBuilder = function(batcherCtors) {
  goog.base(this, batcherCtors,
      ol.renderer.replay.webgl.BatchBuilder.logger_);
  this.reset();
};
goog.inherits(
    ol.renderer.replay.webgl.BatchBuilder,
    ol.renderer.replay.spi.BatchBuilder);


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.BatchBuilder.prototype.reset =
    function() {

  goog.base(this, 'reset');

  /**
   * @type {Array.<number>}
   */
  this.indices = [];

  /**
   * @type {Array.<number>}
   */
  this.vertices = [];

  /**
   * @type {number}
   */
  this.nextVertexIndex = 0;

  /**
   * @type {number}
   * @private
   */
  this.nIndicesFlushed_ = 0;
};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.BatchBuilder.prototype.releaseBatch =
    function() {

  this.flushRender();

  return new ol.renderer.replay.webgl.Batch(
      this.controlStream, this.indices, this.vertices, this.batchErrorState);
};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.BatchBuilder.prototype.renderPending =
    function() {

  return !! (this.indices.length - this.nIndicesFlushed_);
};


/**
 * Restart index counting and push current vertex buffer end as offset.
 */
ol.renderer.replay.webgl.BatchBuilder.prototype.pushConfig =
    function() {
  this.nextVertexIndex = 0;
  this.controlStream.push(this.vertices.length * 4);
};


/**
 * Push number of indices to render and mark those as flushed.
 */
ol.renderer.replay.webgl.BatchBuilder.prototype.pushIndices =
    function() {
  var n = this.indices.length - this.nIndicesFlushed_;
  this.controlStream.push(n);
  this.nIndicesFlushed_ = this.indices.length;
};


/**
 * @type {goog.log.Logger}
 * @private
 */
ol.renderer.replay.webgl.BatchBuilder.logger_ =
    goog.log.getLogger('ol.renderer.replay.webgl.BatchBuilder');
