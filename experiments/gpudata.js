
goog.provide('ol.renderer.webgl.gpuData');

goog.require('libtess.GluTesselator');
goog.require('libtess.errorType');
goog.require('libtess.gluEnum');
goog.require('libtess.primitiveType');
goog.require('libtess.windingRule');


/**
 * Generate vertex data for a line string from a range of input
 * coordinates stored in a flat array.
 * The string will be closed (that is, be a ring) if the first
 * and the last coordinate in the range are equal.
 *
 * @param {Array.<number>} vertices Destination array for vertex data.
 * @param {Array.<number>} coords Array of packed input coordinates.
 * @param {number} offset Start index in input array.
 * @param {number} end End index (exclusive).
 * @param {number} nDimensions Number of dimensions per coordinate.
 */
ol.renderer.webgl.gpuData.expandLineString = function(
    vertices, coords, offset, end, nDimensions) {

  var last = end - nDimensions;
  var i, j, e = offset + nDimensions;

  // Assume ring when coordinates of first and last vertex match
  var isRing = true;
  for (i = offset, j = last; i != e; ++i, ++j) {
    if (coords[i] != coords[j]) {
      isRing = false;
      break;
    }
  }
  if (isRing) {
    end -= nDimensions;
    ol.renderer.webgl.gpuData.expandLinearRing_(
        vertices, coords, offset, end, nDimensions, nDimensions);
    return;
  }

  // Vertex pattern used for lines:
  // ------------------------------
  //
  // L1  R1   L0  R0   L0  R0   L1  R1
  // ~~~~~~   ======   ------
  //
  // LM  RM   LN  RN   LN  RN   LM  RM
  //          ------   ======   ~~~~~~
  //
  // \________|_________/             <- info visible in the
  //     \________|_________/              shader at specific
  //          \________|_________/         vertices
  //               \________|_________/
  //
  // Legend:
  //     ~ Sentinel vertex
  //     = Terminal vertex, outer
  //     - Terminal vertex, inner
  //     - N: Last index, M: Second last index
  //
  // Terminal vertices:
  //     - one of the two adjacent edges is zero
  //     - sum is the negated actual edge
  //     - 1st nonzero => start of line
  //     - 2nd nonzero => end of line
  //     - difference 1st minus 2nd gives outside direction

  j = offset + nDimensions;
  e = j + nDimensions;
  for (i = j; i != e; ++i) vertices.push(coords[i]);
  vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.NO_RENDER);
  for (i = j; i != e; ++i) vertices.push(coords[i]);
  vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.NO_RENDER);

  j = offset;
  e = j + nDimensions;
  for (i = j; i != e; ++i) vertices.push(coords[i]);
  vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.EDGE_LEFT |
                ol.renderer.webgl.gpuData.surfaceFlags_.LAST_OUTER);
  for (i = j; i != e; ++i) vertices.push(coords[i]);
  vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.EDGE_RIGHT |
                ol.renderer.webgl.gpuData.surfaceFlags_.LAST_OUTER);
  for (i = j; i != e; ++i) vertices.push(coords[i]);
  vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.EDGE_LEFT |
                ol.renderer.webgl.gpuData.surfaceFlags_.LAST_INNER);
  for (i = j; i != e; ++i) vertices.push(coords[i]);
  vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.EDGE_RIGHT |
                ol.renderer.webgl.gpuData.surfaceFlags_.LAST_INNER);

  for (j = offset + nDimensions; j != last; j = e) {

    e = j + nDimensions;
    for (i = j; i != e; ++i) vertices.push(coords[i]);
    vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.EDGE_LEFT);
    for (i = j; i != e; ++i) vertices.push(coords[i]);
    vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.EDGE_RIGHT);
  }

  e = j + nDimensions;
  for (i = j; i != e; ++i) vertices.push(coords[i]);
  vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.EDGE_LEFT |
                ol.renderer.webgl.gpuData.surfaceFlags_.LAST_INNER);
  for (i = j; i != e; ++i) vertices.push(coords[i]);
  vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.EDGE_RIGHT |
                ol.renderer.webgl.gpuData.surfaceFlags_.LAST_INNER);
  for (i = j; i != e; ++i) vertices.push(coords[i]);
  vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.EDGE_LEFT |
                ol.renderer.webgl.gpuData.surfaceFlags_.LAST_OUTER);
  for (i = j; i != e; ++i) vertices.push(coords[i]);
  vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.EDGE_RIGHT |
                ol.renderer.webgl.gpuData.surfaceFlags_.LAST_OUTER);

  j = last - nDimensions;
  e = last;
  for (i = j; i != e; ++i) vertices.push(coords[i]);
  vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.NO_RENDER);
  for (i = j; i != e; ++i) vertices.push(coords[i]);
  vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.NO_RENDER);
};


/**
 * Generate vertex and index data for a polygon from given contours.
 *
 * @param {Array.<number>} vertices Destination array for vertex data.
 * @param {Array.<number>} indices Destination array for index data.
 * @param {Array.<Array.<number>>} contours Contours in CCW winding.
 * @param {number} nDimensions Number of dimensions per coordinate.
 */
ol.renderer.webgl.gpuData.expandPolygon =
    function(vertices, indices, contours, nDimensions) {

  var tessy = ol.renderer.webgl.gpuData.expandPolyTesselator_;
  if (! tessy) {
    ol.renderer.webgl.gpuData.expandPolyTesselator_ =
        tessy = ol.renderer.webgl.gpuData.gluTesselator_();
  }

  tessy.gluTessBeginPolygon(indices);

  var vStride = 3;
  var vStride2 = vStride * 2;
  var vStride4 = vStride * 4;

  var contour = contours[0];
  tessy.gluTessBeginContour();

  var startOffset = vertices.length;
  ol.renderer.webgl.gpuData.expandLinearRing_(
      vertices, contour, 0, contour.length, nDimensions, nDimensions, true);

  ol.renderer.webgl.gpuData.circularQuadStripIndices_(
      indices, startOffset / vStride, contour.length / nDimensions);

  var coords = [0, 0, 0];
  for (var i = startOffset,
           e = vertices.length - vStride4; i != e; i += vStride2) {
    for (var j = 0; j < nDimensions; ++j) {
      coords[j] = vertices[i + j + vStride2];
    }
    tessy.gluTessVertex(coords, i / vStride);
  }

  tessy.gluTessEndContour();

  for (var k = 1; k < contours.length; ++k) {
    contour = contours[k];

    tessy.gluTessBeginContour();

    startOffset = vertices.length;
    ol.renderer.webgl.gpuData.expandLinearRing_(
        vertices, contour, contour.length - 2, -2, -2, nDimensions, true);
    ol.renderer.webgl.gpuData.circularQuadStripIndices_(
        indices, startOffset / vStride, contour.length / nDimensions);

    for (var i = startOffset,
             e = vertices.length - vStride4; i != e; i += vStride2) {

      for (var j = 0; j < nDimensions; ++j) {
        coords[j] = vertices[i + j + vStride2];
      }
      tessy.gluTessVertex(coords, i / vStride);
    }

    tessy.gluTessEndContour();
  }

  tessy.gluTessEndPolygon();
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
ol.renderer.webgl.gpuData.encodeLineStyle =
    function(dstData, width, color, opt_strokeWidth, opt_strokeColor) {

  dstData[0] = width * 0.5;
  dstData[1] = ol.renderer.webgl.gpuData.encodeRGB_(color);
  var strokeWidth = goog.math.clamp(opt_strokeWidth || 0, 0, 0.9999);
  var strokeColor = opt_strokeColor || color;
  dstData[2] = Math.floor(color.a * 255) + strokeWidth;
  dstData[3] = ol.renderer.webgl.gpuData.encodeRGB_(strokeColor);
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
ol.renderer.webgl.gpuData.encodePolygonStyle =
    function(dstData, color, antiAliasing, opt_strokeWidth, opt_strokeColor) {

  var extrude, outlineWidth, strokeColor;
  if (! opt_strokeWidth || ! goog.isDef(opt_strokeColor)) {
    extrude = antiAliasing * 0.5;
    outlineWidth = 0.0;
    strokeColor = color;
  } else {
    extrude = opt_strokeWidth + antiAliasing * 0.5;
    outlineWidth = (extrude + antiAliasing * 0.5) /
                   (extrude + antiAliasing * 1.5);
    strokeColor = opt_strokeColor;
  }
  dstData[0] = extrude;
  dstData[1] = ol.renderer.webgl.gpuData.encodeRGB_(color);
  dstData[2] = Math.floor(color.a * 255) + outlineWidth;
  dstData[3] = ol.renderer.webgl.gpuData.encodeRGB_(strokeColor);
};


/**
 * Encode a color (without alpha) in a 32-bit floatingpoint value.
 *
 * @param {ol.Color} color Color to encode.
 * @return {number} Encoded red, green and blue component (8 bit each).
 * @private
 */
ol.renderer.webgl.gpuData.encodeRGB_ = function(color) {
  return Math.floor(color.r) * 256 +
         Math.floor(color.g) +
         Math.floor(color.b) / 256;
};


/**
 * Edge control flags as processed by the vertex shader.
 * @enum {number}
 * @private
 */
ol.renderer.webgl.gpuData.surfaceFlags_ = {
  NOT_AT_EDGE: 0,
  EDGE_LEFT: 1,
  EDGE_RIGHT: 2,
  LAST_INNER: 4,
  LAST_OUTER: 8,
  NO_RENDER: 12
};


/**
 * Generate vertex data for a linear ring from a range of input
 * coordinates stored in a flat array. A stride can be given that
 * may be negative to adjust the winding on the fly.
 *
 * @param {Array.<number>} vertices Destination array for vertex data.
 * @param {Array.<number>} coords Array of packed input coordinates.
 * @param {number} offset Start index in input array.
 * @param {number} end End index (exclusive).
 * @param {number} stride Index distance of input coordinates.
 * @param {number} nDimensions Number of dimensions per coordinate.
 * @param {boolean=} opt_forPolygon When set, will use not create a
 *     left edge and not emit a redundant vertex for direct rendering
 *     of triangle strips. Off by default.
 * @private
 */
ol.renderer.webgl.gpuData.expandLinearRing_ = function(
    vertices, coords, offset, end, stride, nDimensions, opt_forPolygon) {

  // Won't need a left edge when using CCW winding for the
  // outside contours and CW winding for inside contours of
  // polygons
  var leftEdge = ! opt_forPolygon ?
          ol.renderer.webgl.gpuData.surfaceFlags_.EDGE_LEFT :
          ol.renderer.webgl.gpuData.surfaceFlags_.NOT_AT_EDGE;

  var i, j = end - stride;
  var e = j + nDimensions;

  // Last coord on start sentinel (for proper miters)
  for (i = j; i != e; ++i) vertices.push(coords[i]);
  vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.NO_RENDER);
  for (i = j; i != e; ++i) vertices.push(coords[i]);
  vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.NO_RENDER);

  // Line string from coordinates
  for (j = offset; j != end; j += stride) {

    e = j + nDimensions;
    for (i = j; i != e; ++i) vertices.push(coords[i]);
    vertices.push(leftEdge);
    for (i = j; i != e; ++i) vertices.push(coords[i]);
    vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.EDGE_RIGHT);
  }

  // Wrap around
  j = offset;
  if (! opt_forPolygon) {
    // Have the wrapped vertex be valid (not a sentinel yet)
    // in order to close the ring when rendering a strip
    e = j + nDimensions;
    for (i = j; i != e; ++i) vertices.push(coords[i]);
    vertices.push(leftEdge);
    for (i = j; i != e; ++i) vertices.push(coords[i]);
    vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.EDGE_RIGHT);
    j += stride;
  }
  // Next (first or second) on end sentinel
  e = j + nDimensions;
  for (i = j; i != e; ++i) vertices.push(coords[i]);
  vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.NO_RENDER);
  for (i = j; i != e; ++i) vertices.push(coords[i]);
  vertices.push(ol.renderer.webgl.gpuData.surfaceFlags_.NO_RENDER);
};


/**
 * Generate indices for a circular quad strip built from triangles.
 *
 * @param {Array.<number>} indices Destination index data.
 * @param {number} indexOffset First vertex referenced by the strip.
 * @param {number} nQuads Number of quads.
 * @private
 */
ol.renderer.webgl.gpuData.circularQuadStripIndices_ =
    function(indices, indexOffset, nQuads) {

  // Exemplary scheme:
  //
  //  4 - 5     0, 1, 2,
  //  |2\3|     2, 1, 3,
  //  2 - 3     2, 3, 4,
  //  |0\1|     4, 3, 5,
  //  0 - 1     ...

  var e = indexOffset + (nQuads - 1) * 2;
  for (var i = indexOffset; i != e; i += 2) {
    indices.push(i);
    indices.push(i + 1);
    indices.push(i + 2);
    indices.push(i + 2);
    indices.push(i + 1);
    indices.push(i + 3);
  }

  //  0 - 1     4, 5, 0,
  //  |4\5|     0, 5, 1
  //  4 - 5

  indices.push(e);
  indices.push(e + 1);
  indices.push(indexOffset);
  indices.push(indexOffset);
  indices.push(e + 1);
  indices.push(indexOffset + 1);
};


/**
 * Variable to store the tesselator instance used by 'expandPolygon'.
 * @private
 */
ol.renderer.webgl.gpuData.expandPolyTesselator_ = null;


/**
 * Create and configure a libtess.GluTesselator.
 *
 * @return {libtess.GluTesselator} GLU-Tesselator.
 * @private
 */
ol.renderer.webgl.gpuData.gluTesselator_ = function() {

  var tessy = ol.renderer.webgl.gpuData.gluTesselatorInstance_;

  tessy = new libtess.GluTesselator();

  tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_VERTEX_DATA,
                        ol.renderer.webgl.gpuData.tessVertexCallback_);
  tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_BEGIN_DATA,
                        ol.renderer.webgl.gpuData.tessBeginCallback_);
  tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_ERROR_DATA,
                        ol.renderer.webgl.gpuData.tessErrorCallback_);
  // tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_COMBINE_DATA,
  //                       ol.renderer.webgl.gpuData.tessCombineCallback_);
  tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_EDGE_FLAG_DATA,
                        ol.renderer.webgl.gpuData.tessEdgeCallback_);

  tessy.gluTessProperty(libtess.gluEnum.GLU_TESS_WINDING_RULE,
                        libtess.windingRule.GLU_TESS_WINDING_POSITIVE);

  tessy.gluTessNormal(0, 0, 1);
  return tessy;
};


/**
 * @param {number} index - Vertex index (second argument to gluTessVertex).
 * @param {Array.<number>} indices - Destination array for vertex indeices.
 * @private
 */
ol.renderer.webgl.gpuData.tessVertexCallback_ = function(index, indices) {
  // Data element is the index, record it
  indices.push(index);
};


/**
 * @param {number} flag 1 or 0 (not a boolean - no bool in ANSI-C).
 * @param {Tesselation-Context} ctx Context passed to gluTessBeginPolygon.
 * @private
 */
ol.renderer.webgl.gpuData.tessEdgeCallback_ = function(flag, ctx) {
  // Comment copied from libtess example code:
  //
  // don't really care about the flag, but need no-strip/no-fan
  // behavior console.log('edge flag: ' + flag);
};


/**
 * @param {number} type Must be libtess.primitiveType.GL_TRIANGLES.
 * @param {Tesselation-Context} ctx Context passed to gluTessBeginPolygon.
 * @private
 */
ol.renderer.webgl.gpuData.tessBeginCallback_ = function(type, ctx) {
  if (type !== libtess.primitiveType.GL_TRIANGLES) {
    console.error('libtess.GluTesselator not using TRIANGLES');
  }
};


/**
 * @param {Number} errno Error number.
 * @param {Tesselation-Context} ctx Context passed to gluTessBeginPolygon.
 * @private
 */
ol.renderer.webgl.gpuData.tessErrorCallback_ = function(errno, ctx) {

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


/* This code is only needed when contours overlap:

ol.renderer.webgl.gpuData.tessCombineCallback_ =
    function(coords, data, weight, ctx) {

  // Create a new vertex for the coordinate resulting
  // from the split and return its index

  //console.log('combine called');

  // Index map lookup to eventually reuse previous vertex
  var coordsKey = coords.join(';');
  var index = ctx.indexMap[coordsKey];
  if (index === undefined) {

    // Determine index of next vertex in buffer and store in map
    var nExtra = ctx.newVertexExtraElements.length;
    index = ctx.indexMap[coordsKey] =
          ctx.vertices.length / (nExtra + ctx.nDimensions);

    // Append new vertex from coordinates and extra elements
    for (var i = 0; i < ctx.nDimensions; ++i) {
      ctx.vertices.push(coords[i])
    }
    for (var i = 0; i < nExtra; ++i) {
      ctx.vertices.push(ctx.newVertexExtraElements[i]);
    }
  //} else {
  //  console.log('reused vertex #' + index);
  //}
  return index;
};

*/

