
goog.provide('ol.renderer.webgl.VectorRender');
goog.require('ol.renderer.webgl.Render');

// TODO Make abstract and create subclasses for lines and polygons
// TODO Factor related batch construction routines in here

/**
 * @constructor
 * @param {WebGLProgram} program GL program.
 * @param {Object} locations Program locations. TODO Tighten type
 */
ol.renderer.webgl.VectorRender = function(type, program, locations) {

  goog.base(this, type, program, [
      [locations.PositionP, 2, goog.webgl.FLOAT, false, 12,  0 * 4],
      [locations.Position0, 2, goog.webgl.FLOAT, false, 12,  9 * 4],
      [locations.PositionN, 2, goog.webgl.FLOAT, false, 12, 18 * 4],
      [locations.Control,   1, goog.webgl.FLOAT, false, 12, 11 * 4]
  ]);
  this.locations_ = locations;
};
goog.inherits(ol.renderer.webgl.VectorRender, ol.renderer.webgl.Render);


/**
 * @inheritDoc
 */
ol.renderer.webgl.VectorRender.prototype.setStyle =
    function(gl, controlStream, offset) {

  gl.vertexAttrib4f(
      this.locations_.Style,
      controlStream[offset + 0],
      controlStream[offset + 1],
      controlStream[offset + 2],
      controlStream[offset + 3]);

  return offset + 3;
};


/**
 * @inheritDoc
 */
ol.renderer.webgl.VectorRender.prototype.setUniforms =
    function(gl, params) {

  gl.uniformMatrix4fv(this.locations_.Transform, false,
      params[ol.renderer.webgl.Render.Parameter.COORDINATE_TRANSFORM]);

  gl.uniform2fv(this.locations_.PixelScale,
      params[ol.renderer.webgl.Render.Parameter.NDC_PIXEL_SIZE]);

  gl.uniform3f(this.locations_.RenderParams,
      params[ol.renderer.webgl.Render.Parameter.SMOOTHING_PIXELS],
      params[ol.renderer.webgl.Render.Parameter.GAMMA],
      1 / params[ol.renderer.webgl.Render.Parameter.GAMMA]);
/*
  var pretranslate =
      params[ol.renderer.webgl.Render.Parameter.RTE_PRETRANSLATE]);
  gl.uniform3f(this.locations_.PretranslateCoarse, 
      pretranslate[0], pretranslate[2], pretranslate[4]);
  gl.uniform3f(this.locations_.PretranslateFine,
      pretranslate[1], pretranslate[3], pretranslate[5]);
*/
};

