goog.provide('ol.renderer.replay.webgl.geom.SimilarPointsRender');

goog.require('goog.webgl');

goog.require('ol.renderer.replay.input');
goog.require('ol.renderer.replay.webgl.Render');
goog.require('ol.renderer.replay.webgl.geom.PointsRenderShader');



/**
 * @constructor
 * @extends {ol.renderer.replay.webgl.Render}
 */
ol.renderer.replay.webgl.geom.SimilarPointsRender = function() {
  goog.base(this);
};
goog.inherits(
    ol.renderer.replay.webgl.geom.SimilarPointsRender,
    ol.renderer.replay.webgl.Render);


/**
 * @type {ol.renderer.replay.webgl.geom.PointsRenderShader.Locations}
 * @private
 */
ol.renderer.replay.webgl.geom.SimilarPointsRender.prototype.
    glLocations_ = null;


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.SimilarPointsRender.prototype.glSetReady =
    function(gl) {

  var program = this.context.createGlProgram(
      ol.renderer.replay.webgl.geom.PointsRenderShaderVertex,
      ol.renderer.replay.webgl.geom.PointsRenderShaderFragment);

  var locations = new ol.renderer.replay.webgl.geom.
      PointsRenderShader.Locations(gl, program);

  this.glProgram = program;
  this.glLocations_ = locations;

  this.glVertexBufferFormat = [
    [locations.Position, 4, goog.webgl.FLOAT, false, 20, 0],
    [locations.AltExtent, 1, goog.webgl.FLOAT, false, 20, 16]
  ];
};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.SimilarPointsRender.prototype.glActivate =
    function(gl) {

  goog.base(this, 'glActivate', gl);
  var locations = this.glLocations_;
  this.context.configureAtlasTextures(
      locations.Sampler0, locations.Sampler1, locations.Sampler2,
      locations.Sampler3, locations.Sampler4, locations.Sampler5,
      locations.Sampler6, locations.Sampler7);
};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.SimilarPointsRender.prototype.render =
    function(batch, offset) {

  var context = this.context;
  context.gl.vertexAttrib1f(this.glLocations_.EncTexPos,
      batch.vertices[context.texRefReadOffset / 4]);
  context.texRefReadOffset += 4;

  return goog.base(this, 'render', batch, offset);
};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.SimilarPointsRender.prototype.setStyle =
    function(batch, offset) {

  var controlStream = batch.controlStream;

  this.context.gl.vertexAttrib4f(this.glLocations_.Style,
      0, // <-- extent, set via AltExtent attribute
      controlStream[offset + 0],
      controlStream[offset + 1],
      controlStream[offset + 2]);

  return offset + 3;
};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.SimilarPointsRender.prototype.
    glApplyParameters = function(gl, params) {

  var locations = this.glLocations_;

  this.context.setCommonUniforms(
      locations.Transform, locations.Pretranslation, locations.PixelScale);

  gl.uniform1f(locations.RcpGammaIn,
      /** @type {number} */ (params[ol.renderer.replay.
          webgl.Renderer.ExtraParameterIndex.RECIPROCAL_IMAGE_INPUT_GAMMA]));
};
