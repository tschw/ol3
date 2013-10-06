goog.provide('ol.renderer.replay.spi.Batcher');
goog.require('ol');
goog.require('ol.renderer.replay.spi.GeometriesHandler');



/**
 * Batcher implementations define how individual Geometries are encoded.
 *
 * @template BatchBuilder
 * @constructor
 * @implements {ol.renderer.replay.spi.GeometriesHandler.<BatchBuilder>}
 */
ol.renderer.replay.spi.Batcher = function() {

  /**
   * @type {Array.<number>}
   */
  this.styleData = [];
};


/**
 * @type {?BatchBuilder}
 */
ol.renderer.replay.spi.Batcher.prototype.context = null;


/**
 * Encode the configuration for the corresponding render to the control
 * stream.
 */
ol.renderer.replay.spi.Batcher.prototype.encodeConfiguration =
    ol.emptyMethod;


/**
 * Encode the Geometries.
 *
 * @param {ol.renderer.replay.api.Geometries} geometries
 */
ol.renderer.replay.spi.Batcher.prototype.encodeGeometries =
    goog.abstractMethod;


/**
 * Encode the style of the Geometries to 'this.styleData'. This method is
 * empty if the Geometries are styled individually.
 *
 * @param {ol.renderer.replay.api.Geometries} geometries
 */
ol.renderer.replay.spi.Batcher.prototype.encodeStyle =
    ol.emptyMethod;


/**
 * Encode the rendering invocation.
 */
ol.renderer.replay.spi.Batcher.prototype.encodeRender =
    ol.emptyMethod;
