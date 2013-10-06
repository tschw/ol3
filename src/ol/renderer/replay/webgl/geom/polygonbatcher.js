goog.provide('ol.renderer.replay.webgl.geom.PolygonBatcher');

goog.require('goog.math');

goog.require('libtess');
goog.require('libtess.GluTesselator');

goog.require('ol.renderer.replay.webgl.Batcher');



/**
 * @constructor
 * @extends {ol.renderer.replay.webgl.Batcher}
 */
ol.renderer.replay.webgl.geom.PolygonBatcher = function() {

  goog.base(this);

  this.gluTesselator_ = new libtess.GluTesselator();
  var tess = this.gluTesselator_;
  tess.gluTessCallback(
      libtess.gluEnum.GLU_TESS_VERTEX_DATA,
      ol.renderer.replay.webgl.geom.PolygonBatcher.tessVertexCallback_);
  // A no-op edge flag callback is required to make the tesselator visit
  // triangles only (no strips, no fans)
  tess.gluTessCallback(
      libtess.gluEnum.GLU_TESS_EDGE_FLAG_DATA, goog.nullFunction);
  tess.gluTessCallback(
      libtess.gluEnum.GLU_TESS_ERROR_DATA,
      ol.renderer.replay.webgl.geom.PolygonBatcher.tessErrorCallback_);
  tess.gluTessProperty(
      libtess.gluEnum.GLU_TESS_WINDING_RULE,
      libtess.windingRule.GLU_TESS_WINDING_ODD);
  tess.gluTessNormal(0, 0, 1);
  // TODO add combine callback and raise warning state on batch
};
goog.inherits(
    ol.renderer.replay.webgl.geom.PolygonBatcher,
    ol.renderer.replay.webgl.Batcher);


/**
 * @override
 */
ol.renderer.replay.webgl.geom.PolygonBatcher.prototype.encodeStyle =
    function(geometries) {

  //var polygons = /** @type {ol.renderer.replay.input.Polygons} */
  //    (geometries);

  // TODO paste
};


/**
 * @override
 */
ol.renderer.replay.webgl.geom.PolygonBatcher.prototype.encodeGeometries =
    function(geometries) {

  //var polygons = /** @type {ol.renderer.replay.input.Polygons} */
  //    (geometries);

  // TODO paste
};


// ---------------- GluTesselator callbacks


/**
 * Record indexes from the tesselator.
 *
 * @param {number} index - Vertex index (second argument to gluTessVertex).
 * @param {Array.<number>} indices - Destination array for vertex indices.
 * @private
 */
ol.renderer.replay.webgl.geom.PolygonBatcher.tessVertexCallback_ =
    function(index, indices) {
  // Data element is the index, record it
  indices.push(index);
};


/**
 * Log errors from the tesselator.
 *
 * @param {Number} errno Error number.
 * @private
 */
ol.renderer.replay.webgl.geom.PolygonBatcher.tessErrorCallback_ =
    function(errno) {

  // TODO set error state in current batch

  var name = '';

  if (goog.DEBUG) {
    // Attempt to find symbol in debug mode.
    // At higher optimization levels, this code is stripped by
    // dead-code-elimination and this (internal) error is only
    // reported in its numeric form.
    for (var key in libtess.errorType) {
      if (libtess.errorType[key] == errno) {
        name = key;
        break;
      }
    }
    if (! name) {
      // Not found yet? See whether we got a generic GLU error
      for (var key in {GLU_INVALID_ENUM: 1, GLU_INVALID_VALUE: 1}) {
        if (libtess.gluEnum[key] == errno) {
          name = key;
          break;
        }
      }
    }
  }
  throw 'GluTesselator error #' + errno + ' ' + name;
};
