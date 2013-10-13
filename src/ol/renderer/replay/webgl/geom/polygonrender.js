goog.provide('ol.renderer.replay.webgl.geom.PolygonRender');

goog.require('goog.webgl');

goog.require('ol.renderer.replay.input');
goog.require('ol.renderer.replay.webgl.Render');
goog.require('ol.renderer.replay.webgl.geom.PolygonRenderShader');



/**
 * @constructor
 * @extends {ol.renderer.replay.webgl.Render}
 */
ol.renderer.replay.webgl.geom.PolygonRender = function() {
  goog.base(this);
};
goog.inherits(
    ol.renderer.replay.webgl.geom.PolygonRender,
    ol.renderer.replay.webgl.Render);


/**
 * @type {ol.renderer.replay.webgl.geom.PolygonRenderShader.Locations}
 * @private
 */
ol.renderer.replay.webgl.geom.PolygonRender.prototype.
    glLocations_ = null;


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.PolygonRender.prototype.glSetReady =
    function(gl) {

  var program = this.context.createGlProgram(
      ol.renderer.replay.webgl.geom.PolygonRenderShaderVertex,
      ol.renderer.replay.webgl.geom.PolygonRenderShaderFragment);

  var locations = new ol.renderer.replay.webgl.geom.
      PolygonRenderShader.Locations(gl, program);

  this.glProgram = program;
  this.glLocations_ = locations;

  this.glVertexBufferFormat = [
    [locations.Position, 4, goog.webgl.FLOAT, false, 16, 0]
  ];

};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.PolygonRender.prototype.setStyle =
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
ol.renderer.replay.webgl.geom.PolygonRender.prototype.
    glApplyParameters = function(gl, params) {

  var locations = this.glLocations_;

  gl.uniformMatrix4fv(locations.Transform, false,
      /** @type {Array.<number>} */ (params[ol.renderer.replay.
          webgl.Renderer.ExtraParameterIndex.RTE_COORDINATE_TRANSFORM]));

  var tmp = /** @type {Array.<number>} */ (params[ol.renderer.replay.
          webgl.Renderer.ExtraParameterIndex.RTE_PRETRANSLATION]);
  gl.uniform4f(
      locations.Pretranslation, tmp[0], tmp[1], tmp[3], tmp[4]);
};
