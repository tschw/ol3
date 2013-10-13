goog.provide('ol.renderer.replay.webgl.RendererFactory');
goog.require('ol.renderer.replay.api.RendererFactory');
goog.require('ol.renderer.replay.input');
goog.require('ol.renderer.replay.spi.Factory');
goog.require('ol.renderer.replay.webgl.Renderer');
goog.require('ol.renderer.replay.webgl.geom.LineRender');
goog.require('ol.renderer.replay.webgl.geom.PolygonRender');



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
      ol.renderer.replay.webgl.geom.LineRender);

  this.registerGeometriesHandler(
      ol.renderer.replay.input.Polygons,
      ol.renderer.replay.webgl.geom.PolygonRender);

};
goog.inherits(
    ol.renderer.replay.webgl.RendererFactory,
    ol.renderer.replay.spi.Factory);
goog.addSingletonGetter(
    ol.renderer.replay.webgl.RendererFactory);
