goog.provide('ol.renderer.replay.webgl.BatchBuilderFactory');
goog.require('ol.renderer.replay.api.BatchBuilderFactory');
goog.require('ol.renderer.replay.input');
goog.require('ol.renderer.replay.spi.Factory');
goog.require('ol.renderer.replay.webgl.BatchBuilder');
goog.require('ol.renderer.replay.webgl.geom.LineBatcher');
goog.require('ol.renderer.replay.webgl.geom.PolygonBatcher');



/**
 * @constructor
 * @implements {ol.renderer.replay.api.BatchBuilderFactory}
 * @extends {ol.renderer.replay.spi.Factory.<
 *    ol.renderer.replay.webgl.BatchBuilder>}
 */
ol.renderer.replay.webgl.BatchBuilderFactory = function() {
  goog.base(this, ol.renderer.replay.webgl.BatchBuilder);

  this.registerGeometriesHandler(
      ol.renderer.replay.input.LineStrings,
      ol.renderer.replay.webgl.geom.LineBatcher);


  this.registerGeometriesHandler(
      ol.renderer.replay.input.Polygons,
      ol.renderer.replay.webgl.geom.PolygonBatcher);

};
goog.inherits(
    ol.renderer.replay.webgl.BatchBuilderFactory,
    ol.renderer.replay.spi.Factory);
goog.addSingletonGetter(
    ol.renderer.replay.webgl.BatchBuilderFactory);
