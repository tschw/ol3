goog.provide('ol.renderer.replay.webgl.RendererFactory');
goog.require('ol.renderer.replay.api.RendererFactory');
goog.require('ol.renderer.replay.input');
goog.require('ol.renderer.replay.spi.Factory');
goog.require('ol.renderer.replay.webgl.Renderer');
goog.require('ol.renderer.replay.webgl.geom.LineStringsRender');
goog.require('ol.renderer.replay.webgl.geom.PointsRender');
goog.require('ol.renderer.replay.webgl.geom.PolygonsRender');
goog.require('ol.renderer.replay.webgl.geom.SimilarPointsRender');



/**
 * @constructor
 * @implements {ol.renderer.replay.api.RendererFactory}
 * @extends {ol.renderer.replay.spi.Factory.<
 *    ol.renderer.replay.webgl.Renderer>}
 */
ol.renderer.replay.webgl.RendererFactory = function() {
  goog.base(this, ol.renderer.replay.webgl.Renderer);


  this.registerGeometriesHandler(
      ol.renderer.replay.input.LineStrings,
      ol.renderer.replay.webgl.geom.LineStringsRender);

  this.registerGeometriesHandler(
      ol.renderer.replay.input.Polygons,
      ol.renderer.replay.webgl.geom.PolygonsRender);

  this.registerGeometriesHandler(
      ol.renderer.replay.input.Points,
      ol.renderer.replay.webgl.geom.PointsRender);

  this.registerGeometriesHandler(
      ol.renderer.replay.input.SimilarPoints,
      ol.renderer.replay.webgl.geom.SimilarPointsRender);

};
goog.inherits(
    ol.renderer.replay.webgl.RendererFactory,
    ol.renderer.replay.spi.Factory);
goog.addSingletonGetter(
    ol.renderer.replay.webgl.RendererFactory);
