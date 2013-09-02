
goog.provide('ol.renderer.webgl.vectorBatchBuilder');

goog.require('libtess.GluTesselator');
goog.require('libtess.errorType');
goog.require('libtess.gluEnum');
goog.require('libtess.primitiveType');
goog.require('libtess.windingRule');


ol.renderer.webgl.vectorBatchBuilder = function(maxStraightAngle, maxBevelAngle) {

  this.vertices_ = [];
  this.indices_ = [];

  this.tmpVecs_ = [[0, 0, 0], [0, 0], [0, 0]];

  this.cosBevelThld_ = Math.cos(goog.math.toRadians(maxStraightAngle) * 0.5);
  this.cosBreakThld_ = Math.cos(goog.math.toRadians(maxBevelAngle) * 0.5);

  var tess = this.gluTesselator_ = new libtess.GluTesselator();
  tess.gluTessCallback(libtess.gluEnum.GLU_TESS_VERTEX_DATA,
                       ol.renderer.webgl.vectorBatchBuilder.tessVertexCallback_);
  tess.gluTessCallback(libtess.gluEnum.GLU_TESS_BEGIN_DATA,
                       ol.renderer.webgl.vectorBatchBuilder.tessBeginCallback_);
  tess.gluTessCallback(libtess.gluEnum.GLU_TESS_ERROR_DATA,
                       ol.renderer.webgl.vectorBatchBuilder.tessErrorCallback_);
  tess.gluTessCallback(libtess.gluEnum.GLU_TESS_EDGE_FLAG_DATA,
                       ol.renderer.webgl.vectorBatchBuilder.tessEdgeCallback_);

  tess.gluTessProperty(libtess.gluEnum.GLU_TESS_WINDING_RULE,
                       libtess.windingRule.GLU_TESS_WINDING_POSITIVE);

  tess.gluTessNormal(0, 0, 1);
};


ol.renderer.webgl.vectorBatchBuilder.prototype.releaseBatch = function() {
    var result =  { vertices: this.vertices_, indices: this.indices_ };
    this.vertices_ = [];
    this.indices_ = [];
    return result;
};

/**
 * Generate a line string from a range of input coordinates stored in
 * a flat array range.
 * The string will be closed (that is, be a ring) if the first and the
 * last coordinate in the range are equal.
 *
 * @param {Array.<number>} coords Array of packed input coordinates.
 * @param {number} offset Start index in input array.
 * @param {number} end End index (exclusive).
 */
ol.renderer.webgl.vectorBatchBuilder.prototype.expandLineString = function(coords, offset, end) {

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

  if (coords[offset] == coords[last] && 
        coords[offset + 1] == coords[last + 1]) {

    this.expandLinearRing_(coords, offset, 2, last);
    return;
  }

  var vertices = this.vertices_, indices = this.indices_;
  var iBase = vertices.length / 3;

  // The first three vertices are only used in the lookbehind array 
  // and never dereferenced directly; actually the second coordinate
  // is used here so it is accessible at both end triples

  ol.renderer.webgl.vectorBatchBuilder.emitTripleVertex_(
        vertices, coords[offset + 2], coords[offset + 3],
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED,
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED,
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED);

  // The next two vertices resemble the cap of the line; there is an
  // additional extrusion in tangential direction (along the line)
  // at the caps to allow line smoothing and outlining to happen,
  // as the last segment is artificial and always resembles a 
  // straight line with the next segment, only two of three vertices
  // are ever dereferenced

  ol.renderer.webgl.vectorBatchBuilder.emitTripleVertex_(
        vertices, coords[offset], coords[offset + 1],
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_IN_EDGE_LEFT |
            ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.TE_LINE_END,
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_IN_EDGE_RIGHT |
            ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.TE_LINE_END,
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED);

  ol.renderer.webgl.vectorBatchBuilder.indexQuad_(
      indices, iBase, iBase + 1, iBase + 3, iBase + 4);

  iBase += 3;

  ol.renderer.webgl.vectorBatchBuilder.emitTripleVertex_(
        vertices, coords[offset], coords[offset + 1],
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_OUT_EDGE_LEFT,
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_OUT_EDGE_RIGHT,
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED);

  ol.renderer.webgl.vectorBatchBuilder.indexQuad_(
      indices, iBase, iBase + 1, iBase + 3, iBase + 4);

  iBase += 3;

  iBase = this.emitLineJunctions_(
        coords, offset + 2, 2, last, offset, last, iBase);

  // connected terminal vertices

  ol.renderer.webgl.vectorBatchBuilder.emitTripleVertex_(
        vertices, coords[last], coords[last + 1],
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_IN_EDGE_LEFT,
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_IN_EDGE_RIGHT,
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED);

  ol.renderer.webgl.vectorBatchBuilder.indexQuad_(
      indices, iBase, iBase + 1, iBase + 3, iBase + 4);

  ol.renderer.webgl.vectorBatchBuilder.emitTripleVertex_(
        vertices, coords[last], coords[last + 1],
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_OUT_EDGE_LEFT |
            ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.TE_LINE_END,
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_OUT_EDGE_RIGHT |
            ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.TE_LINE_END,
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED);

  // Sentinel for lookahead

  ol.renderer.webgl.vectorBatchBuilder.emitTripleVertex_(
        vertices, coords[last - 2], coords[last - 1],
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED,
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED,
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED);
};


/**
 * Encode style information for line strings.
 *
 * @param {Array.<number>} dstData Output array (4 values).
 * @param {number} width Width of the line.
 * @param {ol.Color} color Fill color and alpha.
 * @param {number=} opt_strokeWidth Fractional stroke width.
 * @param {ol.Color=} opt_strokeColor Stroke color (alpha is ignored
 *    instead the opacity specified by the fill color is used).
 */
ol.renderer.webgl.vectorBatchBuilder.encodeLineStyle =
    function(dstData, width, color, opt_strokeWidth, opt_strokeColor) {

  dstData[0] = width * 0.5;
  dstData[1] = ol.renderer.webgl.vectorBatchBuilder.encodeRGB_(color);
  var strokeWidth = goog.math.clamp(opt_strokeWidth || 0, 0, 0.9999);
  var strokeColor = opt_strokeColor || color;
  dstData[2] = Math.floor(color.a * 255) + strokeWidth;
  dstData[3] = ol.renderer.webgl.vectorBatchBuilder.encodeRGB_(strokeColor);
};


/**
 * Generate vertex and index data for a polygon from given contours.
 *
 * @param {Array.<Array.<number>>} contours Contours in CCW winding.
 */
ol.renderer.webgl.vectorBatchBuilder.prototype.expandPolygon = function(contours) {

  var vertices = this.vertices_, indices = this.indices_,
      tess = this.gluTesselator_;

  tess.gluTessBeginPolygon(indices);

  var contour = contours[0], startOffset = vertices.length;
  this.expandLinearRing_(contour, 0, 2, contour.length);
  this.tesseLeftEdge_(startOffset);

  for (var k = 1; k < contours.length; ++k) {
    contour = contours[k], startOffset = vertices.length;
    this.expandLinearRing_(contour, contour.length - 2, -2, -2);
    this.tesseLeftEdge_(startOffset);
  }

  tess.gluTessEndPolygon();
};


/**
 * Encode the style information for polygons.
 *
 * @param {Array.<number>} dstData Output array (4 values).
 * @param {ol.Color} color Fill color and alpha.
 * @param {number} antiAliasing Anti-Aliasing width used by the renderer.
 * @param {number=} opt_strokeWidth Stroke width in pixels.
 * @param {ol.Color=} opt_strokeColor Stroke color (alpha is ignored
 *    instead the opacity specified by the fill color is used).
 */
ol.renderer.webgl.vectorBatchBuilder.encodePolygonStyle =
    function(dstData, color, antiAliasing, opt_strokeWidth, opt_strokeColor) {

  var extrude, outlineWidth, strokeColor;
  if (! opt_strokeWidth || ! goog.isDef(opt_strokeColor)) {
    extrude = antiAliasing;
    outlineWidth = 0.0;
    strokeColor = color;
  } else {
    extrude = opt_strokeWidth + antiAliasing * 0.5;
    outlineWidth = (extrude * 0.5 + antiAliasing * 0.5) /
                   (extrude * 0.5 + antiAliasing * 1.5);
    strokeColor = opt_strokeColor;
  }
  dstData[0] = extrude;
  dstData[1] = ol.renderer.webgl.vectorBatchBuilder.encodeRGB_(color);
  dstData[2] = -(Math.floor(color.a * 255) + outlineWidth);
  dstData[3] = ol.renderer.webgl.vectorBatchBuilder.encodeRGB_(strokeColor);
};


ol.renderer.webgl.vectorBatchBuilder.prototype.tesseLeftEdge_ = function(startOffset) {

  var vertices = this.vertices_, tess = this.gluTesselator_,
      coords = this.tmpVecs_[0], i, j, e;

  tess.gluTessBeginContour();

  for (i = startOffset + 9, j = startOffset / 3, 
       e = vertices.length - 9; i != e; i += 9, j += 3) {

    coords[0] = goog.math.lerp(vertices[i], vertices[i - 3], 0.0009765625);
    coords[1] = goog.math.lerp(vertices[i + 1], vertices[i - 2], 0.0009765625);
    tess.gluTessVertex(coords, j);

    if (! (vertices[i + 8] & 
            ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_RIGHT)) {

      // Disambiguate redundant coordinate for the tesselator
      // looking ahead to the next vertex (otherwise won't use it)
      coords[0] = goog.math.lerp(vertices[i + 6], vertices[i + 9], 0.0009765625);
      coords[1] = goog.math.lerp(vertices[i + 7], vertices[i + 10], 0.0009765625);
      tess.gluTessVertex(coords, j + 2);

    } else if (vertices[i + 2] == 
                    ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_IN_EDGE_LEFT &&
               vertices[i + 5] == 
                    ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_IN_EDGE_RIGHT) {

      // Broken edge: Skip 5 triples
      i += 45, j += 15;

      // Revisit: Just skipping here - probably should consider two vertices.
    }
  }

  tess.gluTessEndContour();
};


/**
 * Edge control flags as processed by the vertex shader.
 * @enum {number}
 * @private
 */
ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_ = {

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
  UNREFERENCED: 36 
};


/**
 * Encode a color (without alpha) in a 32-bit floatingpoint value.
 *
 * @param {ol.Color} color Color to encode.
 * @return {number} Encoded red, green and blue component (8 bit each).
 * @private
 */
ol.renderer.webgl.vectorBatchBuilder.encodeRGB_ = function(color) {
  return Math.floor(color.r) * 256 +
         Math.floor(color.g) +
         Math.floor(color.b) / 256;
};


/**
 * Generate vertex data for a linear ring from a range of input
 * coordinates stored in a flat array. A stride can be given that
 * may be negative to adjust the winding on the fly.
 *
 * @param {Array.<number>} coords Array of packed input coordinates.
 * @param {number} offset Start index in input array.
 * @param {number} stride Distance of coordinates in the array.
 * @param {number} end End index (exclusive).
 * @private
 */
ol.renderer.webgl.vectorBatchBuilder.prototype.expandLinearRing_ =
        function(coords, offset, stride, end) {

  var vertices = this.vertices_, indices = this.indices_;
  var last = end - stride, index = vertices.length / 3, iLast; 

  // Last coordinate on start sentinel
  ol.renderer.webgl.vectorBatchBuilder.emitTripleVertex_(
        vertices, coords[last], coords[last + 1],
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED,
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED,
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED);

  // Line string from coordinates, wrap around
  iLast = this.emitLineJunctions_(coords, offset, stride, last,
                                  last, last, index);

  this.emitLineJunctions_(coords, last, offset - last, offset, 
                          last - stride, offset, iLast, index);

  // First coordinate on end sentinel
  ol.renderer.webgl.vectorBatchBuilder.emitTripleVertex_(
        vertices, coords[offset], coords[offset + 1],
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED,
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED,
        ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED);
};


ol.renderer.webgl.vectorBatchBuilder.prototype.emitLineJunctions_ = 
        function(coords, offset, stride, end, 
                 offsetOfPrevious, offsetOfNext,
                 index, opt_forceIndex) {

  var vertices = this.vertices_, indices = this.indices_,
      i, swapTmp, cosAngle, sinAngle,
      iInL, iInR, flagsA, flagsB, flagsC,
      tgIn = this.tmpVecs_[0], tgOut = this.tmpVecs_[1],
      tgVtx = this.tmpVecs_[2]; 


  ol.renderer.webgl.vectorBatchBuilder.determineEdgeTangent_(tgIn, coords, 
                                                  offsetOfPrevious, offset);
  for (i = offset; i != end; i += stride) {

    // Calculate tangents and derive (co)sine of winding angle

    ol.renderer.webgl.vectorBatchBuilder.determineEdgeTangent_(tgOut, coords,
                                                    i, i + stride);

    ol.renderer.webgl.vectorBatchBuilder.halfwayDirection_(tgVtx, tgIn, tgOut); 

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

          flagsA = ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_VERTEX_INSIDE_LEFT;
          flagsB = ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_IN_EDGE_RIGHT;
          flagsC = ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_OUT_EDGE_RIGHT;

          iInR = index + 2;

        } else {

          // right turn
          //
          //       C   D
          //     p  
          //   A   B   E

          flagsA = ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_IN_EDGE_LEFT;
          flagsB = ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_VERTEX_INSIDE_RIGHT;
          flagsC = ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_OUT_EDGE_LEFT;

          iInL = index + 2;
        }

      } else {

        flagsC = ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED;

        if (sinAngle > 0) {

          // classic 2-junction: extrude along vertex normal
          flagsA = ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_VERTEX_INSIDE_LEFT;
          flagsB = ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_VERTEX_OUTSIDE_RIGHT;

        } else if (sinAngle < 0) {

          // classic 2-junction: extrude along vertex normal
          flagsA = ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_VERTEX_OUTSIDE_LEFT;
          flagsB = ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_VERTEX_INSIDE_RIGHT;

        } else {

          // Straight line -> either edge normal will do
          flagsA = ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_OUT_EDGE_LEFT;
          flagsB = ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_OUT_EDGE_RIGHT;
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

      ol.renderer.webgl.vectorBatchBuilder.emitTripleVertex_(
          vertices, coords[i], coords[i + 1], 
          ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_IN_EDGE_LEFT,
          ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_IN_EDGE_RIGHT,
          ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED);

      ol.renderer.webgl.vectorBatchBuilder.indexQuad_(
          indices, index, index + 1, index + 3, index + 4);

      ol.renderer.webgl.vectorBatchBuilder.emitTripleVertex_(
          vertices, coords[i], coords[i + 1],
          ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_OUT_EDGE_LEFT |
              ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.TE_LINE_END,
          ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_OUT_EDGE_RIGHT |
              ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.TE_LINE_END,
          ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED);
      
      var prev = i != offset ? i - stride : offsetOfPrevious;
      ol.renderer.webgl.vectorBatchBuilder.emitTripleVertex_(
          vertices, coords[prev], coords[prev + 1],
          ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED,
          ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED,
          ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED);

      var next = i != end - stride ? i + stride : offsetOfNext;
      ol.renderer.webgl.vectorBatchBuilder.emitTripleVertex_(
          vertices, coords[next], coords[next + 1],
          ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED,
          ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED,
          ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED);
 
      ol.renderer.webgl.vectorBatchBuilder.emitTripleVertex_(
          vertices, coords[i], coords[i + 1],
          ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_IN_EDGE_LEFT |
              ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.TE_LINE_END,
          ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_IN_EDGE_RIGHT |
              ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.TE_LINE_END,
          ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED);

      ol.renderer.webgl.vectorBatchBuilder.indexQuad_(
          indices, index + 12, index + 13, index + 15, index + 16);

      flagsA = ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_OUT_EDGE_LEFT;
      flagsB = ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.NE_OUT_EDGE_RIGHT;
      flagsC = ol.renderer.webgl.vectorBatchBuilder.surfaceFlags_.UNREFERENCED;

      // Advance - we just emitted 5 extra triples
      iInL = index += 15;
      iInR = index + 1;
    } 

    ol.renderer.webgl.vectorBatchBuilder.emitTripleVertex_(
        vertices, coords[i], coords[i + 1], flagsA, flagsB, flagsC);

    index += 3;
    if (goog.isDef(opt_forceIndex)) index = opt_forceIndex;
    ol.renderer.webgl.vectorBatchBuilder.indexQuad_(
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
 * @private
 * @inline
 */
ol.renderer.webgl.vectorBatchBuilder.emitTripleVertex_ =
        function(vertices, x, y, flagsA, flagsB, flagsC) {

  vertices.push(x);
  vertices.push(y);
  vertices.push(flagsA);
  vertices.push(x);
  vertices.push(y);
  vertices.push(flagsB);
  vertices.push(x);
  vertices.push(y);
  vertices.push(flagsC);
};


/**
 * @private
 * @inline
 */
ol.renderer.webgl.vectorBatchBuilder.indexQuad_ =
        function(indices, iInL, iInR, iOutL, iOutR) {

  indices.push(iInL);
  indices.push(iInR);
  indices.push(iOutL);
  indices.push(iInR);
  indices.push(iOutR);
  indices.push(iOutL);
};


/**
 * @private
 * @inline
 */
ol.renderer.webgl.vectorBatchBuilder.determineEdgeTangent_ =
        function(dst, coords, iFrom, iTo) {

  var x = coords[iTo] - coords[iFrom];
  var y = coords[iTo + 1] - coords[iFrom + 1];
  var f = 1 / Math.sqrt(x * x + y * y);
  dst[0] = x * f;
  dst[1] = y * f;
};


/**
 * @private
 * @inline
 */
ol.renderer.webgl.vectorBatchBuilder.halfwayDirection_ = function(dst, a, b) {

  var x = a[0] + b[0];
  var y = a[1] + b[1];
  var f = 1 / Math.sqrt(x * x + y * y);
  dst[0] = x * f;
  dst[1] = y * f;
};


/**
 * @param {number} index - Vertex index (second argument to gluTessVertex).
 * @param {Array.<number>} indices - Destination array for vertex indices.
 * @private
 */
ol.renderer.webgl.vectorBatchBuilder.tessVertexCallback_ = function(index, indices) {
  // Data element is the index, record it
  indices.push(index);
};


/**
 * @param {number} flag 1 or 0 (not a boolean - no bool in ANSI-C).
 * @param {Array.<number>} indices - Destination array for vertex indices.
 * @private
 */
ol.renderer.webgl.vectorBatchBuilder.tessEdgeCallback_ = function(flag, indices) {
  // Comment copied from libtess example code:
  //
  // don't really care about the flag, but need no-strip/no-fan
  // behavior 
};


/**
 * @param {number} type Must be libtess.primitiveType.GL_TRIANGLES.
 * @private
 */
ol.renderer.webgl.vectorBatchBuilder.tessBeginCallback_ = function(type) {

  goog.assert(type == libtess.primitiveType.GL_TRIANGLES, 
              'libtess.GluTesselator not using TRIANGLES');
};


/**
 * @param {Number} errno Error number.
 * @private
 */
ol.renderer.webgl.vectorBatchBuilder.tessErrorCallback_ = function(errno) {

  var name = null;
  for (var key in libtess.errorType) {
    if (libtess.errorType[key] == errno) {
      name = key;
      break;
    }
  }
  if (! name) {
    for (var key in {GLU_INVALID_ENUM: 1, GLU_INVALID_VALUE: 1}) {
      if (libtess.gluEnum[key] == errno) {
        name = key;
        break;
      }
    }
    if (! name) name = '<unknown>';
  }
  console.error('libtess.GluTesselator error #' + errno + ' ' + name);
};


