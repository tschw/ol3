goog.provide('ol.renderer.replay.webgl.Batcher');

goog.require('ol.renderer.replay.spi.Batcher');

goog.require('ol.renderer.replay.webgl.BatchBuilder');



/**
 * @constructor
 * @extends {ol.renderer.replay.spi.Batcher.<
 *    ol.renderer.replay.webgl.BatchBuilder>}
 */
ol.renderer.replay.webgl.Batcher = function() {
  goog.base(this);
};
goog.inherits(
    ol.renderer.replay.webgl.Batcher,
    ol.renderer.replay.spi.Batcher);


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.Batcher.prototype.encodeConfiguration =
    function() {

  this.context.pushConfig();
};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.Batcher.prototype.encodeRender =
    function() {

  this.context.pushIndices();
};
