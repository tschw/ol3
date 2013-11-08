goog.provide('ol.renderer.replay.webgl.geom.LineStringsBatcher');

goog.require('goog.vec.Vec2');
goog.require('ol.renderer.replay.input');
goog.require('ol.renderer.replay.webgl.Batcher');
goog.require('ol.renderer.replay.webgl.geom.gpuData');



/**
 * @constructor
 * @extends {ol.renderer.replay.webgl.Batcher}
 */
ol.renderer.replay.webgl.geom.LineStringsBatcher = function() {
  goog.base(this);

  /**
   * @type {Array.<number>}
   * @private
   */
  this.style_ = [];
};
goog.inherits(
    ol.renderer.replay.webgl.geom.LineStringsBatcher,
    ol.renderer.replay.webgl.Batcher);


/**
 * Maximum square length of line segments.
 *
 * @type {number}
 * @const
 * @private
 */
ol.renderer.replay.webgl.geom.LineStringsBatcher.MAX_SQR_LEN_ = 10e13;


/**
 * Index where to reconfigure the vertex buffer.
 * Value leaves some space so we do not have to check at line ends.
 *
 * @type {number}
 * @const
 * @private
 */
ol.renderer.replay.webgl.geom.LineStringsBatcher.HIGH_INDEX_ = 65500;


/**
 * @override
 */
ol.renderer.replay.webgl.geom.LineStringsBatcher.prototype.encodeGeometries =
    function(geometries) {

  var lineStrings = /** @type {ol.renderer.replay.input.LineStrings} */
      (geometries);

  ol.renderer.replay.webgl.geom.LineStringsBatcher.encodeStyle_(this.style_,
      lineStrings.color, lineStrings.width, lineStrings.miterLimit);
  this.context.requestStyle(this.style_);

  var coords = lineStrings.coords,
      offsets = lineStrings.offsets,

      j, n, offset = 0, end, last, nCoords,
      vertices = this.context.vertices,
      indices = this.context.indices,
      i = this.context.nextVertexIndex,

      terminal =
      ol.renderer.replay.webgl.geom.LineStringsBatcher.FLAGS_TERMINAL_,
      segment =
      ol.renderer.replay.webgl.geom.LineStringsBatcher.FLAGS_SEGMENT_;

  for (j = 0, n = offsets.length; j < n; ++j, offset = end) {

    end = offsets[j];
    last = end - 2;
    nCoords = (end - offset) / 2;

    // Call separate routine for rings (those do not have ends).
    if (coords[offset] == coords[last] &&
        coords[offset + 1] == coords[last + 1]) {

      this.context.nextVertexIndex = i;

      ol.renderer.replay.webgl.geom.
          LineStringsBatcher.linearRing(this.context, coords, offset, last);

      i = this.context.nextVertexIndex;
      continue;
    }

    // Vertices, line start:
    //
    //   (B) |A| [A]  B   C   D ... for line start
    //
    // Notation: ( ) Sentinel   | | Terminal   [ ] Start/end
    //
    //   (B) |A|
    ol.renderer.replay.webgl.geom.LineStringsBatcher.
        emitSentinel_(vertices, coords, offset, offset + 2);
    ol.renderer.replay.webgl.geom.gpuData.emitVertexGroup(
        vertices, terminal, coords, offset);
    // Indices, line start:
    //   |A|=[A]
    ol.renderer.replay.webgl.geom.gpuData.emitQuad(
        indices, i, i + 1, i + 8, i + 9);

    // Vertices & indices, segments:
    //   [A]==B==C=...=X==Y==
    i = ol.renderer.replay.webgl.geom.LineStringsBatcher.emitLineSegments_(
        this.context, coords, offset, 2, last, i + 5);
    //   [Z]
    ol.renderer.replay.webgl.geom.gpuData.emitVertexGroup(
        vertices, segment, coords, last);

    // Vertices, line ending:
    //
    //   ... W   X   Y  [Z] |Z| (Y) for line end
    //
    //  |Z| (Y)
    ol.renderer.replay.webgl.geom.gpuData.emitVertexGroup(
        vertices, terminal, coords, last);
    ol.renderer.replay.webgl.geom.LineStringsBatcher.
        emitSentinel_(vertices, coords, last, last - 2);
    // Indices, line ending:
    //
    //   [Z]=|Z|
    ol.renderer.replay.webgl.geom.gpuData.emitQuad(
        indices, i, i + 1, i + 8, i + 9);

    i += 4 * 5;
  } // for

  this.context.nextVertexIndex = i;
};


/**
 * Temporary to store encoded style when invoked externally.
 *
 * @type {Array.<number>}
 * @private
 */
ol.renderer.replay.webgl.geom.LineStringsBatcher.tmpStyle_ = new Array(4);


/**
 * Prepare the given context for line rendering.
 * This method is intended to be used from other Batchers.
 * @param {ol.renderer.replay.webgl.BatchBuilder} context
 * @param {ol.Color} color
 * @param {number} width
 * @param {number} miterLimit
 */
ol.renderer.replay.webgl.geom.LineStringsBatcher.prepareSetStyle =
    function(context, color, width, miterLimit) {

  context.selectType(/** @type {?} */(
      ol.renderer.replay.input.LineStrings.prototype.typeId));

  var style = ol.renderer.replay.webgl.geom.LineStringsBatcher.tmpStyle_;
  ol.renderer.replay.webgl.geom.
      LineStringsBatcher.encodeStyle_(style, color, width, miterLimit);
  context.requestStyle(style);
};


/**
 * Render a ring to an appropriately prepared context.
 * This method is intended to be used from other Batchers.
 *
 * @param {ol.renderer.replay.webgl.BatchBuilder} context
 * @param {ol.renderer.replay.api.Numbers} coords
 * @param {number} offset
 * @param {number} end
 */
ol.renderer.replay.webgl.geom.LineStringsBatcher.linearRing =
    function(context, coords, offset, end) {

  var segment =
      ol.renderer.replay.webgl.geom.LineStringsBatcher.FLAGS_SEGMENT_;
  var last = end - 2;
  var i = context.nextVertexIndex;

  // Vertex data: (>last, all, first, >second)

  ol.renderer.replay.webgl.geom.LineStringsBatcher.
      emitSentinel_(context.vertices, coords, offset, last);

  i = ol.renderer.replay.webgl.geom.LineStringsBatcher.emitLineSegments_(
      context, coords, offset, 2, last, i);
  i = ol.renderer.replay.webgl.geom.LineStringsBatcher.emitLineSegments_(
      context, coords, last, offset - last, offset, i);

  ol.renderer.replay.webgl.geom.gpuData.emitVertexGroup(
      context.vertices, segment, coords, offset);

  ol.renderer.replay.webgl.geom.LineStringsBatcher.
      emitSentinel_(context.vertices, coords, offset, offset + 2);

  context.nextVertexIndex = 15 + i;
};


/**
 * @param {Array.<number>} styleData Destination array.
 * @param {ol.Color} color
 * @param {number} width
 * @param {number} miterLimit
 * @private
 */
ol.renderer.replay.webgl.geom.LineStringsBatcher.encodeStyle_ =
    function(styleData, color, width, miterLimit) {

  styleData[0] = width * 0.5;
  styleData[1] = ol.renderer.replay.webgl.geom.gpuData.encodeRGB(color);
  styleData[2] = color.a;
  styleData[3] = miterLimit;
};


/**
 * Edge control flags as processed by the vertex shader.
 * @enum {number}
 */
ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags = {

  OUTGOING: 1,
  RIGHT: 2,
  TERMINAL: 4,
  CENTER: 8,

  IN_LEFT: 0,
  IN_RIGHT: 2,
  OUT_LEFT: 1,
  OUT_RIGHT: 3,

  UNREFERENCED: -1
};


/**
 * Surface flags for a regular line segment.
 *
 * @type {Array.<
 *      ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags>}
 * @private
 * @const
 */
ol.renderer.replay.webgl.geom.LineStringsBatcher.FLAGS_SEGMENT_ = [
  ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags.IN_LEFT,
  ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags.IN_RIGHT,
  ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags.CENTER,
  ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags.OUT_LEFT,
  ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags.OUT_RIGHT
];


/**
 * Surface flags at line ends.
 *
 * @type {Array.<
 *      ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags>}
 * @private
 * @const
 */
ol.renderer.replay.webgl.geom.LineStringsBatcher.FLAGS_TERMINAL_ = [
  ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags.TERMINAL |
      ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags.IN_LEFT,

  ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags.TERMINAL |
      ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags.IN_RIGHT,

  ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags.UNREFERENCED,

  ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags.TERMINAL |
      ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags.OUT_LEFT,

  ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags.TERMINAL |
      ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags.OUT_RIGHT
];


/**
 * Fetch a coordinate vector from an input array.
 *
 * @param {Array.<number>} dst Array number.
 * @param {ol.renderer.replay.api.Numbers} coords
 *    Flat array of 2D input coordinates.
 * @param {number} offset Coordinate offset.
 * @private
 */
ol.renderer.replay.webgl.geom.LineStringsBatcher.fetchCoord_ =
    function(dst, coords, offset) {

  goog.vec.Vec2.setFromValues(dst, coords[offset], coords[offset + 1]);
};


/**
 * Determine the number of segments to use for a line segment between
 * two input vectors.
 *
 * @param {Array.<number>} a First 2D vector.
 * @param {Array.<number>} b Second 2D vector.
 * @return {number} Integer >= 1.
 * @private
 */
ol.renderer.replay.webgl.geom.LineStringsBatcher.numberOfSegments_ =
    function(a, b) {

  return Math.ceil(
      Math.sqrt(goog.vec.Vec2.distanceSquared(a, b) /
      ol.renderer.replay.webgl.geom.LineStringsBatcher.MAX_SQR_LEN_)) || 1;
};


/**
 * Temporary vector registers.
 * @type {Array.<Array.<number>>}
 * @private
 */
ol.renderer.replay.webgl.geom.LineStringsBatcher.vecRegs_ = [
  [0, 0], [0, 0], [0, 0]
];


/**
 * Emit sentinel vertex.
 *
 * @param {Array.<number>} vertices
 * @param {ol.renderer.replay.api.Numbers} coords
 *    Flat array of 2D input coordinates.
 * @param {number} offset Start index in input array of near coordinate.
 * @param {number} offsTowards Start index in input array of far coordinate.
 * @private
 */
ol.renderer.replay.webgl.geom.LineStringsBatcher.emitSentinel_ =
    function(vertices, coords, offset, offsTowards) {

  var tmpRegs = ol.renderer.replay.webgl.geom.LineStringsBatcher.vecRegs_;
  var a = tmpRegs[0], b = tmpRegs[1], c = tmpRegs[2];

  ol.renderer.replay.webgl.geom.
      LineStringsBatcher.fetchCoord_(a, coords, offset);
  ol.renderer.replay.webgl.geom.
      LineStringsBatcher.fetchCoord_(b, coords, offsTowards);

  goog.vec.Vec2.lerp(a, b, 1 / ol.renderer.replay.webgl.geom.
      LineStringsBatcher.numberOfSegments_(a, b), c);

  ol.renderer.replay.webgl.geom.gpuData.emitVertexGroup(vertices,
      ol.renderer.replay.webgl.geom.LineStringsBatcher.FLAGS_SEGMENT_, c, 0);
};


/**
 * Emit vertices and indices for line segments, eventually subdividing or
 * resetting the index range.
 *
 * This routine assumes there are vertices before and after its output,
 * in particular:
 *
 * 1. The far end coordinate index must be properlydereferencable.
 * 2. At most one vertex must be present in the output array.
 * 3. The index returned is base index of the last referenced vertex
 *    group - these vertices must be written by the client.
 *
 * @param {ol.renderer.replay.webgl.BatchBuilder} context
 * @param {ol.renderer.replay.api.Numbers} coords
 *    Flat array of 2D input coordinates.
 * @param {number} offset Start index in input array.
 * @param {number} stride Coordinate stride.
 * @param {number} end End index (exclusive).
 * @param {number} iBase Index of next vertex.
 * @return {number} Index of next vertex.
 * @private
 */
ol.renderer.replay.webgl.geom.LineStringsBatcher.emitLineSegments_ =
    function(context, coords, offset, stride, end, iBase) {

  var tmpRegs = ol.renderer.replay.webgl.geom.LineStringsBatcher.vecRegs_,
      vertices = context.vertices, indices = context.indices,
      segment =
      ol.renderer.replay.webgl.geom.LineStringsBatcher.FLAGS_SEGMENT_;

  var a = tmpRegs[0], b = tmpRegs[1], c = tmpRegs[2];

  var nextOffs, nSegs, i, tmp;

  ol.renderer.replay.webgl.geom.
      LineStringsBatcher.fetchCoord_(a, coords, offset);

  while (offset != end) {
    nextOffs = offset + stride;

    ol.renderer.replay.webgl.geom.
        LineStringsBatcher.fetchCoord_(b, coords, nextOffs);

    // Determine number of vertex groups to write for this coordinate
    nSegs = ol.renderer.replay.webgl.geom.
        LineStringsBatcher.numberOfSegments_(a, b);

    for (i = 0; i < nSegs; ++i) {

      goog.vec.Vec2.lerp(a, b, i / nSegs, c);

      ol.renderer.replay.webgl.geom.
          gpuData.emitVertexGroup(vertices, segment, c, 0);

      if (iBase >=
          ol.renderer.replay.webgl.geom.LineStringsBatcher.HIGH_INDEX_) {
        // Index reset:
        //
        //    A=B=C [D]   vertices before reset
        //    [B] C=D=E   vertices after reset (C gets index 0)

        // Write [D]
        goog.vec.Vec2.lerp(a, b, (i + 1) / nSegs, c);
        ol.renderer.replay.webgl.geom.
            gpuData.emitVertexGroup(vertices, segment, c, 0);

        context.forceReconfigure();
        iBase = 0;

        // Repeat [B] and C
        Array.prototype.push.apply(vertices,
            vertices.slice(vertices.length - 75, vertices.length - 25));
      }

      // Write outgoing indices
      if (i == 0) {
        indices.push(
            iBase + 0, iBase + 2, iBase + 3,  // left triangle of bevel
            iBase + 2, iBase + 1, iBase + 4,  // right triangle of bevel
            iBase + 3, iBase + 4, iBase + 5,  // left triangle of quad
            iBase + 4, iBase + 6, iBase + 5); // right triangle of quad
      } else {
        indices.push(
            iBase + 3, iBase + 4, iBase + 5,  // left triangle of quad
            iBase + 4, iBase + 6, iBase + 5); // right triangle of quad
      }
      iBase += 5;
    }

    offset = nextOffs;

    tmp = a;
    a = b;
    b = tmp;
  }
  return iBase;
};
