goog.provide('ol.renderer.replay.webgl.geom.LineBatcher');

goog.require('ol.renderer.replay.input');
goog.require('ol.renderer.replay.webgl.Batcher');
goog.require('ol.renderer.replay.webgl.geom.gpuData');



/**
 * @constructor
 * @extends {ol.renderer.replay.webgl.Batcher}
 */
ol.renderer.replay.webgl.geom.LineBatcher = function() {
  goog.base(this);

  /**
   * @type {Array.<number>}
   * @private
   */
  this.style_ = [];
};
goog.inherits(
    ol.renderer.replay.webgl.geom.LineBatcher,
    ol.renderer.replay.webgl.Batcher);


/**
 * Generate vertex data for a linear ring from a range of input coordinates
 * stored in a flat array.
 *
 * @param {ol.renderer.replay.api.Numbers} coords
 *    Flat array of 2D input coordinates.
 * @param {number} offset Start index in input array.
 * @param {number} end End index (exclusive).
 * @param {number=} opt_iBase Index of next vertex.
 * @return {number} Index of next vertex.
 */
ol.renderer.replay.webgl.geom.LineBatcher.prototype.
    linearRing = function(coords, offset, end, opt_iBase) {

  var vertices = this.context.vertices,
      segment =
      ol.renderer.replay.webgl.geom.LineBatcher.FLAGS_SEGMENT_;
  var iStride = segment.length;

  // Vertex data (last, all, first)
  ol.renderer.replay.webgl.geom.gpuData.emitVertexGroup(
      vertices, segment, coords, end - 2);
  ol.renderer.replay.webgl.geom.gpuData.emitVertexGroups(
      vertices, segment, coords, offset, 2, end);
  ol.renderer.replay.webgl.geom.gpuData.emitVertexGroup(
      vertices, segment, coords, offset);

  // Index data
  var i = opt_iBase || this.context.nextVertexIndex,
      nCoords = (end - offset) / 2;
  this.emitLineSegmentsIndices(i, nCoords, iStride, i);

  // Advance by nCoords coordinates plus two sentinels
  i += (nCoords + 2) * iStride;
  this.context.nextVertexIndex = i;
  return i;
};


/**
 * @override
 */
ol.renderer.replay.webgl.geom.LineBatcher.prototype.encodeGeometries =
    function(geometries) {

  var lineStrings = /** @type {ol.renderer.replay.input.LineStrings} */
      (geometries);

  ol.renderer.replay.webgl.geom.LineBatcher.encodeStyle_(
      this.style_, lineStrings.color, lineStrings.width);
  this.context.requestStyle(this.style_);

  var coords = lineStrings.coords,
      offsets = lineStrings.offsets,

      j, n, offset = 0, end, last, nCoords,
      vertices = this.context.vertices,
      indices = this.context.indices,
      i = this.context.nextVertexIndex,

      terminal =
      ol.renderer.replay.webgl.geom.LineBatcher.FLAGS_TERMINAL_,
      segment =
      ol.renderer.replay.webgl.geom.LineBatcher.FLAGS_SEGMENT_;

  for (j = 0, n = offsets.length; j < n; ++j) {

    end = offsets[j];
    last = end - 2;
    nCoords = (end - offset) / 2;

    // Call separate routine for rings (those do not have ends).
    if (coords[offset] == coords[last] &&
        coords[offset + 1] == coords[last + 1]) {

      i = this.linearRing(coords, offset, last, i);
      continue;
    }

    // Vertex data
    //   (B) |A| [A]  B   C   D ... for line start
    //
    // Notation: ( ) Sentinel   | | Terminal   [ ] Start/end
    ol.renderer.replay.webgl.geom.gpuData.emitVertexGroup(
        vertices, terminal, coords, offset + 2);
    ol.renderer.replay.webgl.geom.gpuData.emitVertexGroup(
        vertices, terminal, coords, offset);
    //   ...
    ol.renderer.replay.webgl.geom.gpuData.emitVertexGroups(
        vertices, segment, coords, offset, 2, end);
    //   ... W   X   Y  [Z] |Z| (Y) for line end
    ol.renderer.replay.webgl.geom.gpuData.emitVertexGroup(
        vertices, terminal, coords, last);
    ol.renderer.replay.webgl.geom.gpuData.emitVertexGroup(
        vertices, terminal, coords, last - 2);

    // Index data
    //   |A|=[A]=
    ol.renderer.replay.webgl.geom.gpuData.emitQuadIndices(
        indices, i, i + 1, i + 8, i + 9);
    ol.renderer.replay.webgl.geom.gpuData.emitQuadIndices(
        indices, i + 8, i + 9, i + 10, i + 11);
    //  B==C==...==X==Y==
    i = this.emitLineSegmentsIndices(i + 10, nCoords - 2, 5);
    //  [Z]=|Z|
    ol.renderer.replay.webgl.geom.gpuData.emitQuadIndices(
        indices, i, i + 1, i + 8, i + 9);

    i += 4 * 5;

    offset = end;
  } // for

  this.context.nextVertexIndex = i;
};


/**
 * @param {Array.<number>} styleData Destination array.
 * @param {ol.Color} color
 * @param {number} width
 * @private
 */
ol.renderer.replay.webgl.geom.LineBatcher.encodeStyle_ =
    function(styleData, color, width) {

  // TODO tighten encoding / add miter limit

  styleData[0] = width * 0.5;
  styleData[1] = ol.renderer.replay.webgl.geom.gpuData.encodeRGB(color);
  styleData[2] = color.a;
};


/**
 * Edge control flags as processed by the vertex shader.
 * @enum {number}
 * @private
 */
ol.renderer.replay.webgl.geom.LineBatcher.SurfaceFlags_ = {

  // TODO tidy encoding

  CENTER: 16,

  IN_LEFT: 0,
  IN_RIGHT: 4,
  OUT_LEFT: 2,
  OUT_RIGHT: 6,

  TERMINAL: 8,
  TERMINAL_IN_LEFT: 8,
  TERMINAL_IN_RIGHT: 12,
  TERMINAL_OUT_LEFT: 10,
  TERMINAL_OUT_RIGHT: 14,

  UNREFERENCED: 36
};


/**
 * Surface flags for a regular line segment.
 *
 * @type {Array.<
 *      ol.renderer.replay.webgl.geom.LineBatcher.SurfaceFlags_>}
 * @private
 * @const
 */
ol.renderer.replay.webgl.geom.LineBatcher.FLAGS_SEGMENT_ = [
  ol.renderer.replay.
      webgl.geom.LineBatcher.SurfaceFlags_.IN_LEFT,
  ol.renderer.replay.
      webgl.geom.LineBatcher.SurfaceFlags_.IN_RIGHT,
  ol.renderer.replay.
      webgl.geom.LineBatcher.SurfaceFlags_.CENTER,
  ol.renderer.replay.
      webgl.geom.LineBatcher.SurfaceFlags_.OUT_LEFT,
  ol.renderer.replay.
      webgl.geom.LineBatcher.SurfaceFlags_.OUT_RIGHT
];


/**
 * Surface flags at line ends.
 *
 * @type {Array.<
 *      ol.renderer.replay.webgl.geom.LineBatcher.SurfaceFlags_>}
 * @private
 * @const
 */
ol.renderer.replay.webgl.geom.LineBatcher.FLAGS_TERMINAL_ = [
  ol.renderer.replay.
      webgl.geom.LineBatcher.SurfaceFlags_.TERMINAL_IN_LEFT,
  ol.renderer.replay.
      webgl.geom.LineBatcher.SurfaceFlags_.TERMINAL_IN_RIGHT,
  ol.renderer.replay.
      webgl.geom.LineBatcher.SurfaceFlags_.UNREFERENCED,
  ol.renderer.replay.
      webgl.geom.LineBatcher.SurfaceFlags_.TERMINAL_OUT_LEFT,
  ol.renderer.replay.
      webgl.geom.LineBatcher.SurfaceFlags_.TERMINAL_OUT_RIGHT
];


/**
 * Emit indices for n line segments.
 *
 * @param {number} i First index to use.
 * @param {number} n Number of segments to emit.
 * @param {number} iStride Index stride.
 * @param {number=} opt_iNext Outgoing base index of last segment.
 * @return {number} Outgoing base index of last segment.
 * @protected
 */
ol.renderer.replay.webgl.geom.LineBatcher.prototype.
    emitLineSegmentsIndices =
    function(i, n, iStride, opt_iNext) {

  var j, indices = this.context.indices;

  while (--n > 0) {

    j = i + iStride;

    // Push index data
    indices.push(
        i + 0, i + 2, i + 3,    // left triangle of bevel (one of those
        i + 2, i + 1, i + 4,    // right triangle of bevel   two gets culled)
        i + 3, i + 4, j,        // left triangle of quad
        i + 4, j + 1, j);       // right triangle of quad

    // Step to next
    i = j;
  }
  if (n == 0) {
    // Determine next base index
    // use 'iNext' as the last outgoing base index, if provided
    j = goog.isDefAndNotNull(opt_iNext) ? opt_iNext : i + iStride;

    // Push index data (same as above)
    indices.push(
        i + 0, i + 2, i + 3,    // left triangle of bevel (one of those
        i + 2, i + 1, i + 4,    // right triangle of bevel   two gets culled)
        i + 3, i + 4, j,        // left triangle of quad
        i + 4, j + 1, j);       // right triangle of quad

    i = j;
  }

  return i;
};
