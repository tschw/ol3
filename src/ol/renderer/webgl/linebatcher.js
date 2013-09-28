goog.provide('ol.renderer.webgl.LineBatcher');

goog.require('goog.math');

goog.require('ol.renderer.webgl.VectorBatcher');
goog.require('ol.renderer.webgl.gpuData');



/**
 * @class
 * @extends {ol.renderer.webgl.VectorBatcher}
 * @constructor
 */
ol.renderer.webgl.LineBatcher = function() {

  goog.base(this);
};
goog.inherits(ol.renderer.webgl.LineBatcher, ol.renderer.webgl.VectorBatcher);


/**
 * Sets the style for line rendering.
 *
 * @param {number} width Width of the line.
 * @param {ol.Color} color Fill color and alpha.
 * @param {number=} opt_strokeWidth Fractional stroke width.
 * @param {ol.Color=} opt_strokeColor Stroke color (alpha is ignored
 *    instead the opacity specified by the fill color is used).
 */
ol.renderer.webgl.LineBatcher.prototype.encodeStyle =
    function(width, color, opt_strokeWidth, opt_strokeColor) {

  var strokeWidth = goog.math.clamp(opt_strokeWidth || 0, 0, 0.9999);
  var strokeColor = opt_strokeColor || color;

  var style = this.styleData;
  style[0] = width * 0.5;
  style[1] = ol.renderer.webgl.gpuData.encodeRGB(color);
  style[2] = Math.floor(color.a * 255) + strokeWidth;
  style[3] = ol.renderer.webgl.gpuData.encodeRGB(strokeColor);
};


/**
 * Add a line string to the current batch.
 *
 * The string will be closed (that is, be a ring) if the first and the
 * last coordinate in the range are equal.
 *
 * @param {Array.<number>} coords Array of packed input coordinates.
 * @param {number} offset Start index in input array.
 * @param {number} end End index (exclusive).
 */
ol.renderer.webgl.LineBatcher.prototype.encodeGeometry =
    function(coords, offset, end) {

  // Vertex pattern used for lines:
  // ------------------------------
  //
  // L1  R1  U1   L0  R0  U0   L0  R0  U0   L1  R1  B1   L2  R2  B2
  // ~~~~~~~~~~   ==========   ----------
  //
  //
  // \____________|_____________/      <-| info visible in the
  //     \____________|_____________/  <-| shader at vertices
  //                                     | (prev, current, next)
  //
  //     [...]    LM  RM  BM   LN  RN  UN   LN  RN  UN   LM  RM  UM
  //                           ----------   ==========   ~~~~~~~~~~
  //                           \____________|_____________/
  //                               \____________|_____________/
  //
  // Legend:
  //     ~ Sentinel vertex (never dereferenced only for lookaside)
  //     = Terminal vertex, outer
  //     - Terminal vertex, inner
  //     - L: Left, R: Right, B: Bevel, U: Unused (lookaside only)
  //     - N: Last index, M: Second last index
  //
  // Terminal vertices:
  //     - one of the two adjacent edges is zero
  //     - sum is the negated actual edge
  //     - 1st nonzero => start of line
  //     - 2nd nonzero => end of line
  //     - difference 1st minus 2nd gives outside direction

  var last = end - 2;

  // Call separate routine for rings (those do not have ends).
  if (coords[offset] == coords[last] &&
      coords[offset + 1] == coords[last + 1]) {

    this.expandLinearRing(coords, offset, 2, last);
    return;
  }

  var vertices = this.context.vertices, indices = this.context.indices,
      nextIndex = this.context.nextVertexIndex;

  // The first three vertices are used for lookbehind when dereferencing
  // the next vertex, only.
  // In the case of a line we use the second coordinate, so the edge
  // tangent can be determined (the lookahead input gives a redundant
  // first coordinate).

  ol.renderer.webgl.gpuData.emitTripleVertex(
      vertices, coords[offset + 2], coords[offset + 3],
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED,
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED,
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED);

  // The next two vertices resemble the cap of the line; there is an
  // additional extrusion in tangential direction (along the line)
  // at the caps to allow line smoothing and outlining to happen,
  // as the last segment is artificial and always resembles a
  // straight line with the next segment, only two of three vertices
  // are ever dereferenced.
  // Indexing starts here because of the attribute array offset for
  // the main coordinate

  ol.renderer.webgl.gpuData.emitTripleVertex(
      vertices, coords[offset], coords[offset + 1],
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.NE_IN_EDGE_LEFT |
          ol.renderer.webgl.VectorBatcher.SurfaceFlags.TE_LINE_END,
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.NE_IN_EDGE_RIGHT |
          ol.renderer.webgl.VectorBatcher.SurfaceFlags.TE_LINE_END,
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED);

  // Indexing always happens towards the next (not yet emitted) vertex

  ol.renderer.webgl.gpuData.emitQuadIndices(
      indices, nextIndex, nextIndex + 1, nextIndex + 3, nextIndex + 4);

  nextIndex += 3;

  ol.renderer.webgl.gpuData.emitTripleVertex(
      vertices, coords[offset], coords[offset + 1],
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.NE_OUT_EDGE_LEFT,
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.NE_OUT_EDGE_RIGHT,
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED);

  ol.renderer.webgl.gpuData.emitQuadIndices(
      indices, nextIndex, nextIndex + 1, nextIndex + 3, nextIndex + 4);

  nextIndex += 3;

  // The special, first vertex and indexing towards the second are in
  // place, here - now create the line junctions until the predecessor
  // of the last

  nextIndex = this.emitLineJunctions(
      coords, offset + 2, 2, last, offset, last, nextIndex);

  // Now terminal vertices for end of line cap (analog to start of line,
  // see above)

  ol.renderer.webgl.gpuData.emitTripleVertex(
      vertices, coords[last], coords[last + 1],
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.NE_IN_EDGE_LEFT,
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.NE_IN_EDGE_RIGHT,
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED);

  ol.renderer.webgl.gpuData.emitQuadIndices(
      indices, nextIndex, nextIndex + 1, nextIndex + 3, nextIndex + 4);

  ol.renderer.webgl.gpuData.emitTripleVertex(
      vertices, coords[last], coords[last + 1],
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.NE_OUT_EDGE_LEFT |
          ol.renderer.webgl.VectorBatcher.SurfaceFlags.TE_LINE_END,
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.NE_OUT_EDGE_RIGHT |
          ol.renderer.webgl.VectorBatcher.SurfaceFlags.TE_LINE_END,
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED);

  // Sentinel for lookahead when the previous vertex is dereferenced

  ol.renderer.webgl.gpuData.emitTripleVertex(
      vertices, coords[last - 2], coords[last - 1],
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED,
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED,
      ol.renderer.webgl.VectorBatcher.SurfaceFlags.UNREFERENCED);

  // Adjust by 4 triples: Undercounted two (nextIndex points to one
  // before the last connected vertex) + two sentinels (precisely
  // end sentinel offset by size of start sentinel).
  this.context.nextVertexIndex = nextIndex + 12;
};
