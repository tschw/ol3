goog.provide('ol.renderer.replay.webgl.geom.PointsRender');

goog.require('goog.webgl');

goog.require('ol.renderer.replay.input');
goog.require('ol.renderer.replay.webgl.Render');
goog.require('ol.renderer.replay.webgl.geom.PointsRenderShader');



/**
 * @constructor
 * @extends {ol.renderer.replay.webgl.Render}
 */
ol.renderer.replay.webgl.geom.PointsRender = function() {
  goog.base(this);
};
goog.inherits(
    ol.renderer.replay.webgl.geom.PointsRender,
    ol.renderer.replay.webgl.Render);


/**
 * @type {ol.renderer.replay.webgl.geom.PointsRenderShader.Locations}
 * @private
 */
ol.renderer.replay.webgl.geom.PointsRender.prototype.
    glLocations_ = null;


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.PointsRender.prototype.glSetReady =
    function(gl) {

  var program = this.context.createGlProgram(
      ol.renderer.replay.webgl.geom.PointsRenderShaderVertex,
      ol.renderer.replay.webgl.geom.PointsRenderShaderFragment);

  var locations = new ol.renderer.replay.webgl.geom.
      PointsRenderShader.Locations(gl, program);

  this.glProgram = program;
  this.glLocations_ = locations;

  this.glVertexBufferFormat = [
    [locations.Position, 4, goog.webgl.FLOAT, false, 32, 0],
    [locations.Style, 4, goog.webgl.FLOAT, false, 32, 16]
  ];

};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.PointsRender.prototype.glActivate =
    function(gl) {

  goog.base(this, 'glActivate', gl);
  var locations = this.glLocations_;
  gl.vertexAttrib1f(locations.AltExtent, 0);
  gl.enableVertexAttribArray(locations.EncTexPos);
  this.context.configureAtlasTextures(
      locations.Sampler0, locations.Sampler1, locations.Sampler2,
      locations.Sampler3, locations.Sampler4, locations.Sampler5,
      locations.Sampler6, locations.Sampler7);
};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.PointsRender.prototype.glDeactivate =
    function(gl) {

  gl.disableVertexAttribArray(this.glLocations_.EncTexPos);
  goog.base(this, 'glDeactivate', gl);
};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.PointsRender.prototype.glConfigure =
    function(gl, batch, offset) {

  gl.vertexAttribPointer(this.glLocations_.EncTexPos,
      1, goog.webgl.FLOAT, false, 4, this.context.texRefReadOffset);

  return goog.base(this, 'glConfigure', gl, batch, offset);
};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.PointsRender.prototype.render =
    function(batch, offset) {

  // Consume texture references;
  // four floats are referenced for a quad built from two triangles
  this.context.texRefReadOffset += batch.controlStream[offset] / 6 * 16;

  return goog.base(this, 'render', batch, offset);
};


/**
 * @inheritDoc
 */
ol.renderer.replay.webgl.geom.PointsRender.prototype.
    glApplyParameters = function(gl, params) {

  var locations = this.glLocations_;

  this.context.setCommonUniforms(
      locations.Transform, locations.Pretranslation, locations.PixelScale);

  gl.uniform1f(locations.RcpGammaIn,
      /** @type {number} */ (params[ol.renderer.replay.
          webgl.Renderer.ExtraParameterIndex.RECIPROCAL_IMAGE_INPUT_GAMMA]));
};
