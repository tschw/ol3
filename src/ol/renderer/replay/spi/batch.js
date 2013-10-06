goog.provide('ol.renderer.replay.spi.Batch');

goog.require('ol.renderer.replay.api.Batch');

goog.require('ol.renderer.replay.spi.ControlStream');



/**
 * Batch as seen from the implementors side - control stream exposed.
 *
 * @interface
 * @extends {ol.renderer.replay.api.Batch}
 */
ol.renderer.replay.spi.Batch = function() {};


/**
 * @type {ol.renderer.replay.spi.ControlStream}
 */
ol.renderer.replay.spi.Batch.prototype.controlStream;
