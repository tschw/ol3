goog.provide('ol.renderer.replay.input');

goog.require('ol.Color');

goog.require('ol.renderer.replay.api.Numbers');
goog.require('ol.renderer.replay.spi.Geometries');



/**
 * @constructor
 * @extends {ol.renderer.replay.spi.Geometries}
 * @param {ol.renderer.replay.api.Numbers} coords
 *    Flat array of 2D coordinates.
 * @param {number} imageId Identifies the image and its dimensions.
 * @param {number} centerX X component of the image center.
 * @param {number} centerY Y component of the image center.
 * @param {number} rotation Amount of rotation, negative values
 *      describe absolute rotation.
 * @param {number} opacity Opacity.
 */
ol.renderer.replay.input.SimilarPoints =
    function(coords, imageId, centerX, centerY, rotation, opacity) {

  /** @type {ol.renderer.replay.api.Numbers} */
  this.coords = this.trackTransferable(coords);
  /** @type {number} */
  this.imageId = imageId;
  /** @type {number} */
  this.centerX = centerX;
  /** @type {number} */
  this.centerY = centerY;
  /** @type {number} */
  this.rotation = rotation;
  /** @type {number} */
  this.opacity = opacity;
};
goog.inherits(
    ol.renderer.replay.input.SimilarPoints,
    ol.renderer.replay.spi.Geometries);



/**
 * @constructor
 * @extends {ol.renderer.replay.spi.Geometries}
 * @param {ol.renderer.replay.api.Numbers} data
 *    Flat array of 2D coordinates interleaved with style parameters
 *    as passed to the constructor of 'SimilarPoints'.
 */
ol.renderer.replay.input.Points = function(data) {

  /** @type {ol.renderer.replay.api.Numbers} */
  this.data = this.trackTransferable(data);
};
goog.inherits(
    ol.renderer.replay.input.Points,
    ol.renderer.replay.spi.Geometries);

// ----------------------------------------------------------------------------



/**
 * @constructor
 * @extends {ol.renderer.replay.spi.Geometries}
 * @param {ol.renderer.replay.api.Numbers} coords
 *    Array of packed 2D coordinates.
 * @param {ol.renderer.replay.api.Numbers} offsets Array of offsets.
 * @param {number} width Line width.
 * @param {ol.Color} color Line color.
 */
ol.renderer.replay.input.LineStrings =
    function(coords, offsets, width, color) {

  goog.base(this);
  /** @type {ol.renderer.replay.api.Numbers} */
  this.coords = this.trackTransferable(coords);
  /** @type {ol.renderer.replay.api.Numbers} */
  this.offsets = this.trackTransferable(offsets);
  /** @type {number} */
  this.width = width;
  /** @type {ol.Color} */
  this.color = color;
};
goog.inherits(
    ol.renderer.replay.input.LineStrings,
    ol.renderer.replay.spi.Geometries);

// ----------------------------------------------------------------------------



/**
 * @constructor
 * @extends {ol.renderer.replay.spi.Geometries}
 * @param {ol.renderer.replay.api.Numbers} coords
 *    Array of packed 2D coordinates.
 * @param {ol.renderer.replay.api.Numbers} offsets
 *    Array of contour offsets, negated values indicate holes.
 * @param {ol.Color} fillColor Fill color.
 * @param {number} strokeWidth Stroke width.
 * @param {ol.Color} strokeColor Stroke color.
 */
ol.renderer.replay.input.Polygons =
    function(coords, offsets, fillColor, strokeWidth, strokeColor) {

  /** @type {ol.renderer.replay.api.Numbers} */
  this.coords = this.trackTransferable(coords);
  /** @type {ol.renderer.replay.api.Numbers} */
  this.offsets = this.trackTransferable(offsets);
  /** @type {ol.Color} */
  this.fillColor = fillColor;
  /** @type {number} */
  this.strokeWidth = strokeWidth;
  /** @type {ol.Color} */
  this.strokeColor = strokeColor;
};
goog.inherits(
    ol.renderer.replay.input.Polygons,
    ol.renderer.replay.spi.Geometries);
