goog.provide('ol.renderer.replay.webgl.geom.PolygonsBatcher');

goog.require('goog.math');

goog.require('libtess');
goog.require('libtess.GluTesselator');

goog.require('ol.renderer.replay.api.Batch');
goog.require('ol.renderer.replay.webgl.Batcher');
goog.require('ol.renderer.replay.webgl.geom.LineStringsBatcher');
goog.require('ol.renderer.replay.webgl.geom.gpuData');



/**
 * @constructor
 * @extends {ol.renderer.replay.webgl.Batcher}
 */
ol.renderer.replay.webgl.geom.PolygonsBatcher = function() {

  goog.base(this);

  /**
   * @type {Array.<number>}
   * @private
   */
  this.strokeStyle_ = [];

  /**
   * @type {Array.<number>}
   * @private
   */
  this.polygonStyle_ = [];

  /**
   * Preallocated temporary, tesselator vertex input coordinate.
   *
   * @type {Array.<number>}
   * @private
   */
  this.tmpCoord_ = [0, 0, 0];

  /**
   * @type {libtess.GluTesselator}
   * @private
   */
  this.gluTesselator_ = new libtess.GluTesselator();
  var tess = this.gluTesselator_;
  tess.gluTessProperty(
      libtess.gluEnum.GLU_TESS_WINDING_RULE,
      libtess.windingRule.GLU_TESS_WINDING_ODD);
  // Register the error callback here - otherwise we get a spurious error
  // in ADVANCED compilation mode: The compiler erroneously optimizes away
  // a 'return' from a nested 'switch' block in 'gluTessProperty' checking
  // the winding rule
  tess.gluTessCallback(
      libtess.gluEnum.GLU_TESS_ERROR,
      ol.renderer.replay.webgl.geom.PolygonsBatcher.tessErrorCallback_);
  tess.gluTessCallback(
      libtess.gluEnum.GLU_TESS_VERTEX_DATA,
      ol.renderer.replay.webgl.geom.PolygonsBatcher.tessVertexCallback_);
  tess.gluTessCallback(
      libtess.gluEnum.GLU_TESS_COMBINE,
      goog.bind(this.tessCombineCallback_, this));
  // A no-op edge flag callback is required to make the tesselator visit
  // triangles only (no strips, no fans)
  tess.gluTessCallback(
      libtess.gluEnum.GLU_TESS_EDGE_FLAG, goog.nullFunction);
  // Positive winding is counterclockwise (around the z-axis)
  tess.gluTessNormal(0, 0, 1);
};
goog.inherits(
    ol.renderer.replay.webgl.geom.PolygonsBatcher,
    ol.renderer.replay.webgl.Batcher);


/**
 * @override
 */
ol.renderer.replay.webgl.geom.PolygonsBatcher.prototype.encodeGeometries =
    function(geometries) {

  var context = this.context,
      polygons = /** @type {ol.renderer.replay.input.Polygons} */
      (geometries);

  this.polygonStyle_[0] =
      ol.renderer.replay.webgl.geom.gpuData.encodeRGB(polygons.fillColor);
  this.polygonStyle_[1] = polygons.fillColor.a;

  context.requestStyle(this.polygonStyle_);

  var vertices = context.vertices,
      coords = polygons.coords,
      offsets = polygons.offsets,
      tess = this.gluTesselator_,
      coord = this.tmpCoord_,
      j, n, k, e, offset, end;

  offset = 0;
  for (j = 0, n = offsets.length; j < n; ++j) {
    end = offsets[j];

    if (offset <= 0) {
      tess.gluTessBeginPolygon(this.context.indices);
      offset = -offset;
    }

    // Emit vertices and add contour to tesselator
    tess.gluTessBeginContour();
    for (k = offset, e = Math.abs(end); k < e; k += 2) {
      coord[0] = coords[k];
      coord[1] = coords[k + 1];

      ol.renderer.replay.webgl.geom.gpuData.
          emitVertexCoord(vertices, coord[0], coord[1]);

      tess.gluTessVertex(
          coord, /** @type {?} */ (context.nextVertexIndex++));
    }
    tess.gluTessEndContour();
    offset = -end;

    if (offset <= 0) {
      tess.gluTessEndPolygon();
    }
  }

  // Batch lines for polygon outlines or smoothing

  ol.renderer.replay.webgl.geom.LineStringsBatcher.prepareSetStyle(
      context, polygons.strokeColor, polygons.strokeWidth,
      polygons.miterLimit, this.strokeStyle_);

  for (offset = 0, j = 0, n = offsets.length; j < n; ++j, offset = end) {

    end = Math.abs(offsets[j]);

    ol.renderer.replay.webgl.geom.LineStringsBatcher.linearRing(
        context, coords, offset, end);
  }

};


// ---------------- GluTesselator callbacks


/**
 * Accept indices from the tesselator.
 *
 * @param {number} index - Vertex index (second argument to TessVertex).
 * @param {Array.<number>} indices - index data (argument to BeginPolygon).
 * @private
 */
ol.renderer.replay.webgl.geom.PolygonsBatcher.tessVertexCallback_ =
    function(index, indices) {

  indices.push(index);
};


/**
 * Create a new vertex from contour intersection.
 *
 * @param {Array.<number>} coord
 * @param {Array.<number>} indices
 * @param {Array.<number>} weights
 * @return {number} Index of new vertex.
 * @private
 */
ol.renderer.replay.webgl.geom.PolygonsBatcher.prototype.tessCombineCallback_ =
    function(coord, indices, weights) {

  // Contours that intersect each other or themselves may yield undesirable
  // output - tell the user it's not our fault.
  this.context.batchErrorState =
      ol.renderer.replay.api.Batch.ErrorState.INVALID_INPUT_WARNING;

  ol.renderer.replay.webgl.geom.gpuData.emitVertexCoord(
      this.context.vertices, coord[0], coord[1]);

  return this.context.nextVertexIndex++;
};


/**
 * Report errors from the tesselator.
 *
 * @param {Number} errno Error number.
 * @private
 */
ol.renderer.replay.webgl.geom.PolygonsBatcher.tessErrorCallback_ =
    function(errno) {

  var name = '';
  if (goog.DEBUG && !COMPILED) {
    // Attempt to find symbol in debug mode.
    // At higher optimization levels, this code is properly stripped by
    // dead-code-elimination and this (internal) error is only reported
    // in its numeric form
    for (var key in libtess.errorType) {
      if (libtess.errorType[key] == errno) {
        name = key;
        break;
      }
    }
    if (! name) {
      // Not found yet? Generic GLU errors live in another enum
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
