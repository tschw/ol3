goog.provide('ol.renderer.ImageManager');

goog.require('goog.asserts');
goog.require('ol.ImageProvider');
goog.require('ol.renderer.replay.webgl.geom.gpuData');



/**
 * Incomplete image manager.
 *
 * This implementation is for testing only and provides a single texture
 * atlas.
 *
 * @constructor
 */
ol.renderer.ImageManager = function() {

  /**
   * @type {?ol.renderer.ImageManager.ImageInfo}
   * @private
   */
  this.imgInfo_ = null;

  /**
   * @type {Array.<ol.ImageProvider>}
   * @private
   */
  this.atlasImages_ = [];
};
goog.addSingletonGetter(ol.renderer.ImageManager);


/**
 * Load an atlas image.
 *
 * @param {string} url URL of the image to use.
 * @param {number} imageWidth Width of individual images in the atlas.
 * @param {number} imageHeight Height of individual images in the atlas.
 * @param {string=} opt_crossOrigin
 */
ol.renderer.ImageManager.prototype.loadAtlasImage =
    function(url, imageWidth, imageHeight, opt_crossOrigin) {

  goog.asserts.assert(
      this.atlasImages_.length == 0,
      'Handling of multiple atlas images not yet implemented');

  this.atlasImages_.push(
      new ol.renderer.SimpleImageProvider(url, opt_crossOrigin));

  this.imgInfo_ = {
    size: [imageWidth, imageHeight],
    anchor: [imageWidth / 2, imageHeight / 2],
    position: null
  };
  this.imageWidth_ = imageWidth;
  this.imageHeight_ = imageHeight;
};


/**
 * @return {Array.<ol.ImageProvider>}
 */
ol.renderer.ImageManager.prototype.getAtlasImages = function() {
  return this.atlasImages_;
};


/**
 * Ensure all images in the input set are accessible at one time.
 * The image set specified by the parameter is updated and a mapping to update
 * data is returned.
 *
 * @param {Object.<number,number>} images Mapping of imageId to atlas position.
 * @return {?Object.<number,number>} Mapping of old atlas position to new atlas
 *    position or null if no changes were found.
 */
ol.renderer.ImageManager.prototype.requireImageSet = function(images) {

  var result = null;
  for (var imageId in images) {
    if (images.hasOwnProperty(imageId)) {
      imageId = +imageId;
      var posCodeUsed = images[imageId];

      var posCodeNow = this.calcPositionCode_(imageId);
      if (posCodeUsed != posCodeNow) {

        images[imageId] = posCodeNow;
        if (goog.isNull(result)) {
          result = {};
        }
        result[posCodeUsed] = posCodeNow;
      }
    }
  }
  return result;
};


/**
 * @typedef {{size: Array.<number>, anchor: Array.<number>, position: ?number}}
 */
ol.renderer.ImageManager.ImageInfo;


/**
 * @param {number} imageId
 * @return {number}
 * @private
 */
ol.renderer.ImageManager.prototype.calcPositionCode_ = function(imageId) {

  if (this.atlasImages_.length > 0) {
    var image = this.atlasImages_[0].getImage();

    if (! goog.isNull(image)) {
      var imagesPerRow = Math.floor(image.width / this.imageWidth_);
      var x = (imageId % imagesPerRow) * this.imageWidth_;
      var y = Math.floor(imageId / imagesPerRow) * this.imageHeight_;

      // TODO odd dependency... but the encoding makes sense - even for the
      // final implementation (efficient storage in JS objects, easy to derive
      // both integral and normalized representations of texture coordinates)
      return ol.renderer.replay.webgl.geom.gpuData.encode2U12(x, y);
    }
  }
  return -1 - imageId;
};


/**
 * Returns a data structure that describes an image.
 *
 * The result is owned and reused by the image manager - use it right away or
 * create a copy if you need it to persist beyond further calls.
 *
 * @param {number} imageId
 * @return {?ol.renderer.ImageManager.ImageInfo}
 */
ol.renderer.ImageManager.prototype.getImageInfo = function(imageId) {

  goog.asserts.assert(goog.isDef(this.imageWidth_), 'No image loaded');
  this.imgInfo_.position = this.calcPositionCode_(imageId);
  return this.imgInfo_;
};



/**
 * @constructor
 * @implements {ol.ImageProvider}
 * @param {string} src
 * @param {string=} opt_crossOrigin
 */
ol.renderer.SimpleImageProvider = function(src, opt_crossOrigin) {

  var image = new Image();
  if (goog.isDef(opt_crossOrigin)) {
    image.crossOrigin = opt_crossOrigin;
  }
  image.onload = goog.bind(this.onLoad_, this);
  this.src_ = src;
  this.image_ = image;
  this.loaded_ = false;
  image.src = src;
};


/**
 * @inheritDoc
 */
ol.renderer.SimpleImageProvider.prototype.getImage = function() {
  return this.loaded_ ? this.image_ : null;
};


/**
 * @inheritDoc
 */
ol.renderer.SimpleImageProvider.prototype.getKey = function() {
  return this.src_;
};


/**
 * @private
 */
ol.renderer.SimpleImageProvider.prototype.onLoad_ = function() {
  this.loaded_ = true;
};
