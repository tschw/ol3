goog.provide('ol.renderer.replay.webgl.geom.SimilarPointsBatcher');

goog.require('ol.renderer.ImageManager');
goog.require('ol.renderer.replay.input');
goog.require('ol.renderer.replay.webgl.Batcher');
goog.require('ol.renderer.replay.webgl.geom.PointsBatcher');
goog.require('ol.renderer.replay.webgl.geom.gpuData');



/**
 * @constructor
 * @extends {ol.renderer.replay.webgl.Batcher}
 */
ol.renderer.replay.webgl.geom.SimilarPointsBatcher = function() {
  goog.base(this);

  this.style_ = new Array(3);
  this.discriminators_ = new Array(4);

  // shared style mode
  //
  // set fixed: dwxy=0 axy rot opacity
  // set fixed: pxy (set from vertex data)
  //
  // xc yc xf yf dwxy0
  // xc yc xf yf dwxy1
  // xc yc xf yf dwxy2
  // xc yc xf yf dwxy3
  // ...
};
goog.inherits(
    ol.renderer.replay.webgl.geom.SimilarPointsBatcher,
    ol.renderer.replay.webgl.Batcher);


/**
 * @type {number}
 * @const
 * @private
 */
ol.renderer.replay.webgl.geom.SimilarPointsBatcher.HIGH_INDEX_ = 65532;


/**
 * @override
 */
ol.renderer.replay.webgl.geom.SimilarPointsBatcher.prototype.encodeGeometries =
    function(geometries) {

  var points = /** @type {ol.renderer.replay.input.SimilarPoints} */
      (geometries);

  var context = this.context,
      m = points.coords.length / 2, i = 0, n, e;

  if (n == 0) {
    return; // otherwise image reference will not be consumed
  }

  for (;;) {

    n = Math.min(Math.floor(
        (ol.renderer.replay.webgl.geom.SimilarPointsBatcher.HIGH_INDEX_ -
        context.nextVertexIndex) / 4), m);

    e = i + n * 2;

    context.nextVertexIndex = ol.renderer.replay.webgl.geom.
        gpuData.emitQuads(context.indices, context.nextVertexIndex, n);


    var imageInfo =
        ol.renderer.ImageManager.getInstance().getImageInfo(points.imageId);

    ol.renderer.replay.webgl.geom.PointsBatcher.encodeStyle(
        this.style_, imageInfo.anchor, points.rotation, points.opacity);
    context.requestStyle(this.style_);

    context.addImageReferences(points.imageId, imageInfo.position, 1);

    ol.renderer.replay.webgl.geom.PointsBatcher.
        encodeDiscriminators(this.discriminators_, imageInfo.size);

    ol.renderer.replay.webgl.geom.gpuData.emitVertexGroups(
        context.vertices, this.discriminators_, points.coords, i, 2, e);

    m -= n;
    if (m == 0) {
      break;
    }

    context.forceReconfigure();
    i = e;
  }

  context.flushRender(); // do not coalesce
};
