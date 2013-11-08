goog.provide('ol.renderer.replay.webgl.geom.PointsBatcher');

goog.require('ol.renderer.ImageManager');
goog.require('ol.renderer.replay.input');
goog.require('ol.renderer.replay.webgl.Batcher');
goog.require('ol.renderer.replay.webgl.geom.gpuData');



/**
 * @constructor
 * @extends {ol.renderer.replay.webgl.Batcher}
 */
ol.renderer.replay.webgl.geom.PointsBatcher = function() {
  goog.base(this);

  this.discriminators_ = new Array(4);
  this.style_ = new Array(3);

  // mixed styles mode
  //
  // xc yc xf yf dwxy0 axy rot opacity
  // xc yc xf yf dwxy1 axy rot opacity
  // xc yc xf yf dwxy2 axy rot opacity
  // xc yc xf yf dwxy3 axy rot opacity
  // ...
  // pxy0 pxy0 pxy0 pxy0
  // pxy1 pxy1 pxy1 pxy1
  // ...
};
goog.inherits(
    ol.renderer.replay.webgl.geom.PointsBatcher,
    ol.renderer.replay.webgl.Batcher);


/**
 * @type {number}
 * @const
 * @private
 */
ol.renderer.replay.webgl.geom.PointsBatcher.HIGH_INDEX_ = 65532;


/**
 * Encode style data.
 *
 * @param {Array.<number>} style Destination array.
 * @param {Array.<number>} anchor Image anchorpoint.
 * @param {number} rotation
 * @param {number} opacity
 */
ol.renderer.replay.webgl.geom.PointsBatcher.encodeStyle =
    function(style, anchor, rotation, opacity) {

  style[0] = ol.renderer.replay.webgl.geom.gpuData.encodeVec2I12(anchor);
  style[1] = rotation;
  style[2] = opacity;
};


/**
 * Build discriminators from image extents.
 *
 * @param {Array.<number>} discriminators Destination array.
 * @param {Array.<number>} imageSize Vector of image width / height.
 */
ol.renderer.replay.webgl.geom.PointsBatcher.encodeDiscriminators =
    function(discriminators, imageSize) {

  var extX = imageSize[0] * 0.5,
      extY = imageSize[1] * 0.5;

  discriminators[0] =
      ol.renderer.replay.webgl.geom.gpuData.encode2I12(-extX, -extY);
  discriminators[1] =
      ol.renderer.replay.webgl.geom.gpuData.encode2I12(+extX, -extY);
  discriminators[2] =
      ol.renderer.replay.webgl.geom.gpuData.encode2I12(+extX, +extY);
  discriminators[3] =
      ol.renderer.replay.webgl.geom.gpuData.encode2I12(-extX, +extY);
};


/**
 * @override
 */
ol.renderer.replay.webgl.geom.PointsBatcher.prototype.encodeGeometries =
    function(geometries) {

  var points = /** @type {ol.renderer.replay.input.Points} */
      (geometries);

  var context = this.context;

  var vertices = context.vertices,
      indices = context.indices,
      data = points.data,
      imageManager = ol.renderer.ImageManager.getInstance(),
      style = this.style_,
      discriminators = this.discriminators_,
      imageId, imageInfo, rotation, opacity, texRef;

  var m = data.length / 5, i = 0, n, e;

  for (;;) {

    n = Math.min(Math.floor(
        (ol.renderer.replay.webgl.geom.PointsBatcher.HIGH_INDEX_ -
        context.nextVertexIndex) / 4), m);

    context.nextVertexIndex = ol.renderer.replay.webgl.geom.
        gpuData.emitQuads(context.indices, context.nextVertexIndex, n);

    for (e = i + n * 5; i != e; i += 5) {

      imageId = data[i + 2];
      rotation = data[i + 3];
      opacity = data[i + 4];

      imageInfo = imageManager.getImageInfo(imageId);

      ol.renderer.replay.webgl.geom.
          PointsBatcher.encodeStyle(style, imageInfo.anchor, rotation, opacity);
      ol.renderer.replay.webgl.geom.
          PointsBatcher.encodeDiscriminators(discriminators, imageInfo.size);

      context.addImageReferences(imageId, imageInfo.position, 4);

      ol.renderer.replay.webgl.geom.gpuData.emitVertexGroup(
          vertices, discriminators, data, i, style);
    }

    m -= n;
    if (m == 0) {
      break;
    }
    context.forceReconfigure();
  }
};
