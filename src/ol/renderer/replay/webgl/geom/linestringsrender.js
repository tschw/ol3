goog.provide('ol.renderer.replay.webgl.geom.LineStringsRender');

goog.require('goog.webgl');

goog.require('ol.renderer.replay.input');
goog.require('ol.renderer.replay.webgl.Render');
goog.require('ol.renderer.replay.webgl.geom.LineStringsRenderShader');



/**
 * @constructor
 * @extends {ol.renderer.replay.webgl.Render}
 */
ol.renderer.replay.webgl.geom.LineStringsRender = function() {
  goog.base(this);
};
goog.inherits(
    ol.renderer.replay.webgl.geom.LineStringsRender,
    ol.renderer.replay.webgl.Render);


/**
 * @type {ol.renderer.replay.webgl.geom.LineStringsRenderShader.Locations}
 * @private
 */
ol.renderer.replay.webgl.geom.LineStringsRender.prototype.
    glLocations_ = null;


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.LineStringsRender.prototype.glSetReady =
    function(gl) {

  var program = this.context.createGlProgram(
      ol.renderer.replay.webgl.geom.LineStringsRenderShaderVertex,
      ol.renderer.replay.webgl.geom.LineStringsRenderShaderFragment);

  var locations = new ol.renderer.replay.webgl.geom.
      LineStringsRenderShader.Locations(gl, program);

  this.glProgram = program;
  this.glLocations_ = locations;

  this.glVertexBufferFormat = [
    [locations.PositionP, 4, goog.webgl.FLOAT, false, 20, 0 * 5 * 4],
    [locations.Position0, 4, goog.webgl.FLOAT, false, 20, 5 * 5 * 4],
    [locations.PositionN, 4, goog.webgl.FLOAT, false, 20, 10 * 5 * 4],
    [locations.Control, 1, goog.webgl.FLOAT, false, 20, (5 * 5 + 4) * 4]
  ];

};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.LineStringsRender.prototype.glActivate =
    function(gl) {

  goog.base(this, 'glActivate', gl);
  gl.enable(goog.webgl.CULL_FACE);
};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.LineStringsRender.prototype.glDeactivate =
    function(gl) {

  gl.disable(goog.webgl.CULL_FACE);
  goog.base(this, 'glDeactivate', gl);
};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.LineStringsRender.prototype.setStyle =
    function(batch, offset) {

  var controlStream = batch.controlStream;

  this.context.gl.vertexAttrib4f(
      this.glLocations_.Style,
      controlStream[offset + 0],
      controlStream[offset + 1],
      controlStream[offset + 2],
      1.0 / controlStream[offset + 3]);

  return offset + 4;
};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.LineStringsRender.prototype.
    glApplyParameters = function(gl, params) {

  var locations = this.glLocations_;

  this.context.setCommonUniforms(
      locations.Transform, locations.Pretranslation, locations.PixelScale);

  gl.uniform3f(locations.RenderParams,
      /** @type {number} */ (params[ol.renderer.replay.
          api.Renderer.ParameterIndex.HINT_SMOOTH_PIXELS]),
      /** @type {number} */ (params[ol.renderer.replay.
          webgl.Renderer.ExtraParameterIndex.RECIPROCAL_COLOR_INPUT_GAMMA]),
      /** @type {number} */ (params[ol.renderer.replay.
          webgl.Renderer.ExtraParameterIndex.RECIPROCAL_OUTPUT_GAMMA]));

};
