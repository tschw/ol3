goog.provide('ol.renderer.webgl.VectorBatcher');

goog.require('goog.math');
goog.require('libtess');
goog.require('libtess.GluTesselator');
//goog.require('ol.Color');
goog.require('ol.renderer.webgl.batching');
goog.require('ol.renderer.webgl.highPrecision');


ol.renderer.webgl.VectorBatcher = function() {

  goog.base(this);

  this.tmpVecs_ = [[0, 0, 0], [0, 0], [0, 0]];

  // TODO unhack
};

goog.inherits(
    ol.renderer.webgl.VectorBatcher, ol.renderer.webgl.batching.Batcher);


ol.renderer.webgl.VectorBatcher.prototype.setParameters =
    function(parameters) {

  var maxStraightAngle = parameters[
      ol.renderer.webgl.batching.Parameter.MAX_STRAIGHT_ANGLE];
  var maxBevelAngle = parameters[
      ol.renderer.webgl.batching.Parameter.MAX_BEVEL_ANGLE];

  maxStraightAngle = goog.math.clamp(maxStraightAngle * 0.5, 0, 90);
  maxBevelAngle = goog.math.clamp(
      maxBevelAngle * 0.5, maxStraightAngle, 90);

  /**
   * @type {number}
   * @private
   */
  this.cosBevelThld_ = Math.cos(goog.math.toRadians(maxStraightAngle));

  /**
   * @type {number}
   * @private
   */
  this.cosBreakThld_ = Math.cos(goog.math.toRadians(maxBevelAngle));
};

/**
 * Offsets within vertex layout.
 *
 * @enum {number}
 * @protected
 */
ol.renderer.webgl.VectorBatcher.Offset = {
  NEXT_VERTEX: 5,
  COORD: 0,
  FLAGS: 4,
  NEXT_TRIPLE: 15,
  COORD_A: 0,
  FLAGS_A: 4,
  COORD_B: 5,
  FLAGS_B: 9,
  COORD_C: 10,
  FLAGS_C: 14,
  FINE_COORD: 2
};


/**
 * Edge control flags as processed by the vertex shader.
 * @enum {number}
 * @protected
 */
ol.renderer.webgl.VectorBatcher.SurfaceFlags = {

  // normal extrusion
  NE_IN_EDGE_LEFT: 0,
  NE_VERTEX_INSIDE_LEFT: 1,
  NE_OUT_EDGE_LEFT: 2,
  NE_VERTEX_OUTSIDE_LEFT: 3,
  NE_IN_EDGE_RIGHT: 4,
  NE_VERTEX_INSIDE_RIGHT: 5,
  NE_OUT_EDGE_RIGHT: 6,
  NE_VERTEX_OUTSIDE_RIGHT: 7,

  NE_RIGHT: 4,

  // tangential extrusion
  TE_LINE_END: 8,

  // bypass all displacement
  PASSTHROUGH: 16,
  // Note: Using 'NE_RIGHT' flag in here to omit an extra check
  // when stepping along the left edge for polygon outlines,
  // see 'tesseLeftEdge_'.
  UNREFERENCED: 36
};

/**
 * Generate vertex data for a linear ring from a range of input
 * coordinates stored in a flat array. A stride can be given that
 * may be negative to adjust the winding on the fly.
 *
 * @param {!Array.<number>} coords Array of packed input coordinates.
 * @param {number} offset Start index in input array.
 * @param {number} stride Distance of coordinates in the array.
 * @param {number} end End index (exclusive).
 * @protected
 */
ol.renderer.webgl.VectorBatcher.prototype.expandLinearRing =
    function(coords, offset, stride, end) {

  var vertices = this.context.vertices, indices = this.context.indices,
      last = end - stride, firstIndex = this.context.nextVertexIndex,
      lastIndex;

  // Last coordinate on start sentinel
  ol.renderer.webgl.gpuData.emitTripleVertex(
      vertices, coords[last], coords[last + 1],
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED,
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED,
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED);

  // Line string from coordinates, wrap around
  lastIndex = this.emitLineJunctions(
      coords, offset, stride, last,
      last, last, firstIndex);

  this.emitLineJunctions(
      coords, last, offset - last, offset,
      last - stride, offset, lastIndex, firstIndex);

  // First coordinate on end sentinel
  ol.renderer.webgl.gpuData.emitTripleVertex(
      vertices, coords[offset], coords[offset + 1],
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED,
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED,
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED);

  // Adjust by 3 triples: Undercounted one (nextIndex points to the
  // last connected vertex) + two sentinels (precisely end sentinel
  // offset by size of start sentinel).
  this.context.nextVertexIndex = lastIndex + 9;
};


/**
 * Process a range of 2D input coordinates and generate vertices and
 * indices for a partial line string.
 *
 * @param {!Array.<number>} coords Input coordinates.
 * @param {number} offset Start offset into the input array.
 * @param {number} stride Distance between adjacent coordinates.
 * @param {number} end Exclusive end posision in input array.
 * @param {number} offsetOfPrevious Offset of the coordinate before
 *     the first.
 * @param {number} offsetOfNext Offset of the coordinate after the
 *     last.
 * @param {number} index Index of first vertex to be emitted.
 * @param {number=} opt_forceIndex Index used to close rings.
 * @return {number} The next vertex index unless 'opt_forceIndex'
 *     is given - equal to 'opt_forceIndex' in this case.
 * @protected
 */
ol.renderer.webgl.VectorBatcher.prototype.emitLineJunctions =
    function(coords, offset, stride, end,
        offsetOfPrevious, offsetOfNext, index, opt_forceIndex) {

  var vertices = this.context.vertices, indices = this.context.indices,
      i, swapTmp, cosAngle, sinAngle,
      iInL, iInR, flagsA, flagsB, flagsC,
      tgIn = this.tmpVecs_[0], tgOut = this.tmpVecs_[1],
      tgVtx = this.tmpVecs_[2];


  ol.renderer.webgl.VectorBatcher.determineEdgeTangent_(
      tgIn, coords, offsetOfPrevious, offset);

  for (i = offset; i != end; i += stride) {

    // Calculate tangents and derive (co)sine of winding angle

    ol.renderer.webgl.VectorBatcher.determineEdgeTangent_(
        tgOut, coords, i, i + stride);

    ol.renderer.webgl.VectorBatcher.halfwayDirection_(tgVtx, tgIn, tgOut);

    cosAngle = tgIn[0] * tgVtx[0] + tgIn[1] * tgVtx[1];
    sinAngle = tgIn[0] * tgVtx[1] - tgIn[1] * tgVtx[0];

    // Now decide how to handle this junction

    iInL = index;
    iInR = index + 1;
    if (cosAngle >= this.cosBreakThld_) {

      if (cosAngle < this.cosBevelThld_) {
        // Bevel? Build junction triangle and set flags accordingly

        indices.push(iInL);
        indices.push(iInR);
        indices.push(index + 2);

        if (sinAngle > 0) {

          // left turn
          //
          //   E   C
          //         p
          //   D   A   B

          flagsA = ol.renderer.webgl.
              VectorBatcher.SurfaceFlags.NE_VERTEX_INSIDE_LEFT;
          flagsB = ol.renderer.webgl.
              VectorBatcher.SurfaceFlags.NE_IN_EDGE_RIGHT;
          flagsC = ol.renderer.webgl.
              VectorBatcher.SurfaceFlags.NE_OUT_EDGE_RIGHT;

          iInR = index + 2;

        } else {

          // right turn
          //
          //       C   D
          //     p
          //   A   B   E

          flagsA = ol.renderer.webgl.
              VectorBatcher.SurfaceFlags.NE_IN_EDGE_LEFT;
          flagsB = ol.renderer.webgl.
              VectorBatcher.SurfaceFlags.NE_VERTEX_INSIDE_RIGHT;
          flagsC = ol.renderer.webgl.
              VectorBatcher.SurfaceFlags.NE_OUT_EDGE_LEFT;

          iInL = index + 2;
        }

      } else {

        flagsC = ol.renderer.webgl.
            VectorBatcher.SurfaceFlags.UNREFERENCED;

        if (sinAngle > 0) {

          // classic 2-junction: extrude along vertex normal
          flagsA = ol.renderer.webgl.
              VectorBatcher.SurfaceFlags.NE_VERTEX_INSIDE_LEFT;
          flagsB = ol.renderer.webgl.
              VectorBatcher.SurfaceFlags.NE_VERTEX_OUTSIDE_RIGHT;

        } else if (sinAngle < 0) {

          // classic 2-junction: extrude along vertex normal
          flagsA = ol.renderer.webgl.
              VectorBatcher.SurfaceFlags.NE_VERTEX_OUTSIDE_LEFT;
          flagsB = ol.renderer.webgl.
              VectorBatcher.SurfaceFlags.NE_VERTEX_INSIDE_RIGHT;

        } else {

          // Straight line -> either edge normal will do
          flagsA = ol.renderer.webgl.
              VectorBatcher.SurfaceFlags.NE_OUT_EDGE_LEFT;
          flagsB = ol.renderer.webgl.
              VectorBatcher.SurfaceFlags.NE_OUT_EDGE_RIGHT;
        }

      }

    } else {

      // Extremely troublesome? Break the line
      //
      //          bl
      //            \
      //   al      ar
      //   :       :  \
      //   :br     :
      //   :  \    :    \
      //   :       :

      // Note: Using a unique and characteristic flag combination here
      // on the first vertex triple, so we can detect this case when
      // scanning polygon edges, see 'tesseLeftEdge_'
      ol.renderer.webgl.gpuData.emitTripleVertex(
          vertices, coords[i], coords[i + 1],
          ol.renderer.webgl.VectorBatcher.SurfaceFlags.NE_IN_EDGE_LEFT,
          ol.renderer.webgl.VectorBatcher.SurfaceFlags.NE_IN_EDGE_RIGHT,
          ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED);

      ol.renderer.webgl.gpuData.emitQuadIndices(
          indices, index, index + 1, index + 3, index + 4);

      ol.renderer.webgl.gpuData.emitTripleVertex(
          vertices, coords[i], coords[i + 1],
          ol.renderer.webgl.VectorBatcher.SurfaceFlags.NE_OUT_EDGE_LEFT |
              ol.renderer.webgl.VectorBatcher.SurfaceFlags.TE_LINE_END,
          ol.renderer.webgl.VectorBatcher.SurfaceFlags.NE_OUT_EDGE_RIGHT |
              ol.renderer.webgl.VectorBatcher.SurfaceFlags.TE_LINE_END,
          ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED);

      var prev = i != offset ? i - stride : offsetOfPrevious;
      ol.renderer.webgl.gpuData.emitTripleVertex(
          vertices, coords[prev], coords[prev + 1],
          ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED,
          ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED,
          ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED);

      var next = i != end - stride ? i + stride : offsetOfNext;
      ol.renderer.webgl.gpuData.emitTripleVertex(
          vertices, coords[next], coords[next + 1],
          ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED,
          ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED,
          ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED);

      ol.renderer.webgl.gpuData.emitTripleVertex(
          vertices, coords[i], coords[i + 1],
          ol.renderer.webgl.VectorBatcher.SurfaceFlags.NE_IN_EDGE_LEFT |
              ol.renderer.webgl.VectorBatcher.SurfaceFlags.TE_LINE_END,
          ol.renderer.webgl.VectorBatcher.SurfaceFlags.NE_IN_EDGE_RIGHT |
              ol.renderer.webgl.VectorBatcher.SurfaceFlags.TE_LINE_END,
          ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED);

      ol.renderer.webgl.gpuData.emitQuadIndices(
          indices, index + 12, index + 13, index + 15, index + 16);

      flagsA = ol.renderer.webgl.VectorBatcher.SurfaceFlags.NE_OUT_EDGE_LEFT;
      flagsB = ol.renderer.webgl.VectorBatcher.SurfaceFlags.NE_OUT_EDGE_RIGHT;
      flagsC = ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED;

      // Advance - we just emitted 5 extra triples
      iInL = index += 15;
      iInR = index + 1;
    }

    ol.renderer.webgl.gpuData.emitTripleVertex(
        vertices, coords[i], coords[i + 1], flagsA, flagsB, flagsC);

    index += 3;
    if (goog.isDef(opt_forceIndex)) {
      index = opt_forceIndex;
    }
    ol.renderer.webgl.gpuData.emitQuadIndices(
        indices, iInL, iInR, index, index + 1);

    // Outgoing tangent of this vertex is incoming tangent of the next
    // swap to reuse memory
    swapTmp = tgIn;
    tgIn = tgOut;
    tgOut = swapTmp;
  }

  return index;
};


/**
 * Determine the (normalized) edge tangent between two vectors in
 * a coordinate array.
 *
 * @param {!Array.<number>} dst Destination array.
 * @param {!Array.<number>} coords Flat array of input coordinates.
 * @param {number} iFrom Index of first vector.
 * @param {number} iTo Index of second vector.
 * @private
 */
ol.renderer.webgl.VectorBatcher.determineEdgeTangent_ =
    function(dst, coords, iFrom, iTo) {

  var x = coords[iTo] - coords[iFrom];
  var y = coords[iTo + 1] - coords[iFrom + 1];
  var f = 1 / Math.sqrt(x * x + y * y);
  dst[0] = x * f;
  dst[1] = y * f;
};


/**
 * Determine the two-dimensional normal halfway vector between two
 * two-dimensional normal input vectors.
 *
 * @param {!Array.<number>} dst Destination array.
 * @param {!Array.<number>} a Array holding the first vector.
 * @param {!Array.<number>} b Array holding the second vector.
 * @private
 */
ol.renderer.webgl.VectorBatcher.halfwayDirection_ = function(dst, a, b) {

  var x = a[0] + b[0];
  var y = a[1] + b[1];
  var f = 1 / Math.sqrt(x * x + y * y);
  dst[0] = x * f;
  dst[1] = y * f;
};


