goog.provide('ol.renderer.replay.webgl.BatchBuilderFactory');
goog.require('ol.renderer.replay.api.BatchBuilderFactory');
goog.require('ol.renderer.replay.input');
goog.require('ol.renderer.replay.spi.Factory');
goog.require('ol.renderer.replay.webgl.BatchBuilder');
goog.require('ol.renderer.replay.webgl.geom.LineStringsBatcher');
goog.require('ol.renderer.replay.webgl.geom.PointsBatcher');
goog.require('ol.renderer.replay.webgl.geom.PolygonsBatcher');
goog.require('ol.renderer.replay.webgl.geom.SimilarPointsBatcher');



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
      ol.renderer.replay.webgl.geom.LineStringsBatcher);

  this.registerGeometriesHandler(
      ol.renderer.replay.input.Polygons,
      ol.renderer.replay.webgl.geom.PolygonsBatcher);

  this.registerGeometriesHandler(
      ol.renderer.replay.input.Points,
      ol.renderer.replay.webgl.geom.PointsBatcher);

  this.registerGeometriesHandler(
      ol.renderer.replay.input.SimilarPoints,
      ol.renderer.replay.webgl.geom.SimilarPointsBatcher);

};
goog.inherits(
    ol.renderer.replay.webgl.BatchBuilderFactory,
    ol.renderer.replay.spi.Factory);
goog.addSingletonGetter(
    ol.renderer.replay.webgl.BatchBuilderFactory);
