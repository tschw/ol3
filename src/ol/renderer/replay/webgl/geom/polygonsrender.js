goog.provide('ol.renderer.replay.webgl.geom.PolygonsRender');

goog.require('goog.webgl');

goog.require('ol.renderer.replay.input');
goog.require('ol.renderer.replay.webgl.Render');
goog.require('ol.renderer.replay.webgl.geom.PolygonsRenderShader');



/**
 * @constructor
 * @extends {ol.renderer.replay.webgl.Render}
 */
ol.renderer.replay.webgl.geom.PolygonsRender = function() {
  goog.base(this);
};
goog.inherits(
    ol.renderer.replay.webgl.geom.PolygonsRender,
    ol.renderer.replay.webgl.Render);


/**
 * @type {ol.renderer.replay.webgl.geom.PolygonsRenderShader.Locations}
 * @private
 */
ol.renderer.replay.webgl.geom.PolygonsRender.prototype.
    glLocations_ = null;


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.PolygonsRender.prototype.glSetReady =
    function(gl) {

  var program = this.context.createGlProgram(
      ol.renderer.replay.webgl.geom.PolygonsRenderShaderVertex,
      ol.renderer.replay.webgl.geom.PolygonsRenderShaderFragment);

  var locations = new ol.renderer.replay.webgl.geom.
      PolygonsRenderShader.Locations(gl, program);

  this.glProgram = program;
  this.glLocations_ = locations;

  this.glVertexBufferFormat = [
    [locations.Position, 4, goog.webgl.FLOAT, false, 16, 0]
  ];

};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.PolygonsRender.prototype.setStyle =
    function(batch, offset) {

  var controlStream = batch.controlStream;

  this.context.gl.vertexAttrib2f(
      this.glLocations_.Style,
      controlStream[offset],
      controlStream[offset + 1]);

  return offset + 2;
};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.PolygonsRender.prototype.
    glApplyParameters = function(gl, params) {

  var locations = this.glLocations_;

  this.context.setCommonUniforms(
      locations.Transform, locations.Pretranslation);

};
