goog.provide('ol.webgl.TextureCache');

goog.require('goog.asserts');
goog.require('goog.disposable.IDisposable');

goog.require('ol.ImageProvider');
goog.require('ol.structs.LRUCache');



/**
 * @constructor
 * @implements {goog.disposable.IDisposable}
 * @param {WebGLRenderingContext} gl
 * @param {number} memoryHighWaterMark
 *    Sought maximum memory usage in megabytes.
 */
ol.webgl.TextureCache = function(gl, memoryHighWaterMark) {

  /**
   * @type {WebGLRenderingContext}
   * @private
   */
  this.gl_ = gl;

  /**
   * @type {ol.structs.LRUCache}
   * @private
   */
  this.textureCache_ = new ol.structs.LRUCache();

  /**
   * @type {number}
   * @private
   */
  this.memoryHighWaterMark_ = memoryHighWaterMark * 1048576;

  /**
   * @type {number}
   * @private
   */
  this.memoryUsed_ = 0;

  /**
   * @type {number}
   * @private
   */
  this.lastMarker_ = -1;
};


/**
 * @typedef {{texture: WebGLTexture,
 *    magFilter: number, minFilter: number, wrapMode: number}}
 */
ol.webgl.TextureCache.Entry_;


/**
 * Bind a texture, either from cache or initiating an upload.
 *
 * @param {ol.ImageProvider} imageProvider
 * @param {number=} opt_magFilter Magnification filter, defaults to LINEAR.
 * @param {number=} opt_minFilter Minification filter, defaults to LINEAR.
 * @param {number=} opt_wrapMode Wrap mode, default to CLAMP_TO_EDGE.
 */
ol.webgl.TextureCache.prototype.bindTexture = function(
    imageProvider, opt_magFilter, opt_minFilter, opt_wrapMode) {

  var gl = this.gl_;

  opt_magFilter = opt_magFilter || goog.webgl.LINEAR;
  opt_minFilter = opt_minFilter || goog.webgl.LINEAR;
  opt_wrapMode = opt_wrapMode || goog.webgl.CLAMP_TO_EDGE;

  // Attempt lookup, create (empty) entry on miss
  var key = imageProvider.getKey(), cacheEntry;
  if (this.textureCache_.containsKey(key)) {

    cacheEntry = /** @type {ol.webgl.TextureCache.Entry_} */ (
        this.textureCache_.get(key));

  } else {

    cacheEntry = /** @type {ol.webgl.TextureCache.Entry_} */ ({
      texture: null,
      magFilter: null,
      minFilter: null,
      wrapMode: null,
      size: 0
    });
    this.textureCache_.set(key, cacheEntry);
  }

  // Upload (initially or when invalidated due to context loss) or bind
  if (! gl.isTexture(cacheEntry.texture)) {

    var image = imageProvider.getImage();
    if (! goog.isNull(image)) {
      var dSize = image.width * image.height * 4 - cacheEntry.size;
      var texture = gl.createTexture();
      gl.bindTexture(goog.webgl.TEXTURE_2D, texture);

      gl.texImage2D(goog.webgl.TEXTURE_2D, 0,
          goog.webgl.RGBA, goog.webgl.RGBA, goog.webgl.UNSIGNED_BYTE, image);

      cacheEntry.texture = texture;
      cacheEntry.size += dSize;
      this.memoryUsed_ += dSize;
    }
  }
  gl.bindTexture(goog.webgl.TEXTURE_2D, cacheEntry.texture);

  if (! goog.isNull(cacheEntry.texture)) {
    // Update parameters
    if (cacheEntry.magFilter != opt_magFilter) {
      gl.texParameteri(
          goog.webgl.TEXTURE_2D, goog.webgl.TEXTURE_MAG_FILTER, opt_magFilter);
      cacheEntry.magFilter = opt_magFilter;
    }
    if (cacheEntry.minFilter != opt_minFilter) {
      gl.texParameteri(
          goog.webgl.TEXTURE_2D, goog.webgl.TEXTURE_MIN_FILTER, opt_minFilter);
      cacheEntry.minFilter = opt_minFilter;
    }
    if (cacheEntry.wrapMode != opt_wrapMode) {
      gl.texParameteri(goog.webgl.TEXTURE_2D, goog.webgl.TEXTURE_WRAP_S,
          opt_wrapMode);
      gl.texParameteri(goog.webgl.TEXTURE_2D, goog.webgl.TEXTURE_WRAP_T,
          opt_wrapMode);
      cacheEntry.wrapMode = opt_wrapMode;
    }

    // Expire some entries when maximum amount of memory is exceeded
    while (this.memoryUsed_ > this.memoryHighWaterMark_) {

      cacheEntry = /** @type {ol.webgl.TextureCache.Entry_} */
          (this.textureCache_.peekLast());

      if (! goog.isNull(cacheEntry)) {

        gl.deleteTexture(cacheEntry.texture);

      } else if (+this.textureCache_.peekLastKey() == this.lastMarker_) {

        break;
      }

      this.textureCache_.pop();
      this.memoryUsed_ -= cacheEntry.size;
    }
  }
};


/**
 * Unbind the current texture - provided for completeness.
 * Also, unlike a direct call to gl.bindTexture - this method's name
 * can be minified.
 */
ol.webgl.TextureCache.prototype.unbindTexture = function() {
  this.gl_.bindTexture(goog.webgl.TEXTURE_2D, null);
};


/**
 * @param {ol.ImageProvider} imageProvider
 * @return {boolean} Whether an image was cached before.
 */
ol.webgl.TextureCache.prototype.imageAvailable = function(imageProvider) {
  var key = imageProvider.getKey();
  return this.textureCache_.containsKey(key) &&
      /** @type {ol.webgl.TextureCache.Entry_} */ (
      this.textureCache_.get(key)).size > 0;
};


/**
 * Protect all texture objects bound after this call from expiry.
 * When called multiple times, the last call determines the protection
 * boundary.
 */
ol.webgl.TextureCache.prototype.protectFromHere = function() {
  --this.lastMarker_;
  this.textureCache_.set(this.lastMarker_.toString(), null);
};


/**
 * Remove all cached shaders and programs.
 */
ol.webgl.TextureCache.prototype.clear = function() {

  var gl = this.gl_;
  this.textureCache_.forEach(function(cacheEntry) {
    if (! goog.isNull(cacheEntry) && gl.isTexture(cacheEntry.texture)) {
      gl.deleteTexture(cacheEntry.texture);
    }
  });
  this.textureCache_.clear();
  this.lastMarker_ = -1;
};


/**
 * @inheritDoc
 */
ol.webgl.TextureCache.prototype.dispose = function() {
  this.clear();
  this.textureCache_ = null;
};


/**
 * @inheritDoc
 */
ol.webgl.TextureCache.prototype.isDisposed = function() {
  return this.textureCache_ == null;
};
