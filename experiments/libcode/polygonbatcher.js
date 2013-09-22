goog.provide('ol.renderer.webgl.PolygonBatcher');

goog.require('ol.renderer.webgl.VectorBatcher');
goog.require('ol.renderer.webgl.gpuData');


ol.renderer.webgl.PolygonBatcher = function() {

  goog.base(this);

  this.gluTesselator_ = new libtess.GluTesselator();
  var tess = this.gluTesselator_;
  tess.gluTessCallback(
      libtess.gluEnum.GLU_TESS_VERTEX_DATA,
      ol.renderer.webgl.PolygonBatcher.tessVertexCallback_);
  // A no-op edge flag callback is required to make the tesselator visit
  // triangles only (no strips, no fans)
  tess.gluTessCallback(
      libtess.gluEnum.GLU_TESS_EDGE_FLAG_DATA, goog.nullFunction);
  tess.gluTessCallback(
      libtess.gluEnum.GLU_TESS_ERROR_DATA,
      ol.renderer.webgl.PolygonBatcher.tessErrorCallback_);
  // Positive winding materializes (that is CCW in the XY-plane when the
  // Z-axis is sticking out of the screen)
  tess.gluTessProperty(
      libtess.gluEnum.GLU_TESS_WINDING_RULE,
      libtess.windingRule.GLU_TESS_WINDING_POSITIVE);
  tess.gluTessNormal(0, 0, 1);
};

goog.inherits(ol.renderer.webgl.PolygonBatcher, ol.renderer.webgl.VectorBatcher);


/**
 * Set the style for polygon rendering.
 *
 * @param {ol.Color} color Fill color and alpha.
 * @param {number} antiAliasing Anti-Aliasing width used by the renderer.
 * @param {number=} opt_strokeWidth Stroke width in pixels.
 * @param {ol.Color=} opt_strokeColor Stroke color (alpha is ignored
 *    instead the opacity specified by the fill color is used).
 */
ol.renderer.webgl.PolygonBatcher.prototype.encodeStyle =
    function(color, antiAliasing, opt_strokeWidth, opt_strokeColor) {

  var extrude,
      outlineWidth,
      strokeColor;
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
  var style = this.styleData;
  style[0] = extrude;
  style[1] = ol.renderer.webgl.gpuData.encodeRGB(color);
  style[2] = -(Math.floor(color.a * 255) + outlineWidth);
  style[3] = ol.renderer.webgl.gpuData.encodeRGB(strokeColor);
};


/**
 * Add a polygon to the current batch.
 *
 * The first contour given defines the outside of the polygon
 * further contours define holes.
 *
 * @param {!Array.<!Array.<number>>} contours Contours in CCW winding.
 */
ol.renderer.webgl.PolygonBatcher.prototype.encodeGeometry = function(contours) {

  var vertices = this.context.vertices, indices = this.context.indices,
      tess = this.gluTesselator_;

  tess.gluTessBeginPolygon(indices);

  var contour = contours[0],
      startOffset = vertices.length, startIndex = this.context.nextVertexIndex;
  this.expandLinearRing(contour, 0, 2, contour.length);
  this.tesseLeftEdge_(startOffset, startIndex);

  for (var k = 1; k < contours.length; ++k) {
    contour = contours[k];
    startOffset = vertices.length, startIndex = this.context.nextVertexIndex;
    this.expandLinearRing(contour, contour.length - 2, -2, -2);
    this.tesseLeftEdge_(startOffset, startIndex);
  }

  tess.gluTessEndPolygon();
};

/**
 * Scan along the left edge of a line and feed the coordinates to the
 * tesselator, disambiguating redundant vertices.
 *
 * @param {number} startOffset Vertex buffer start offset.
 * @param {number} startIndex Index of the first vertex in the buffer.
 * @private
 */
ol.renderer.webgl.PolygonBatcher.prototype.tesseLeftEdge_ =
    function(startOffset, startIndex) {

  var vertices = this.context.vertices, tess = this.gluTesselator_,
      coord = this.tmpVecs_[0], index, i, e;

  tess.gluTessBeginContour();

  for (i = startOffset +
          ol.renderer.webgl.VectorBatcher.Offset.NEXT_TRIPLE,
       e = vertices.length -
          ol.renderer.webgl.VectorBatcher.Offset.NEXT_TRIPLE,
       index = startIndex; i != e;
       i += ol.renderer.webgl.VectorBatcher.Offset.NEXT_TRIPLE,
       index += 3) {

    // REVISIT: Better to not move vertex when unique?
    // REVISIT: Also add normal displacement?

    if (! (vertices[i + ol.renderer.webgl.VectorBatcher.Offset.FLAGS_C] &
            ol.renderer.webgl.VectorBatcher.SurfaceFlags.NE_RIGHT)) {
      // Two left edge vertices in triple

      // Disambiguate redundant coordinates for the tesselator looking
      // at surrounding coordinates (otherwise won't use it)

      ol.renderer.webgl.PolygonBatcher.lerpVertexCoord_(coord, vertices,
          i, i - ol.renderer.webgl.VectorBatcher.Offset.NEXT_TRIPLE,
          ol.renderer.webgl.PolygonBatcher.EPSILON_DISAMBIG_);
      tess.gluTessVertex(coord, /**@type{?}*/(index));

      ol.renderer.webgl.PolygonBatcher.lerpVertexCoord_(coord, vertices,
          i, i + ol.renderer.webgl.VectorBatcher.Offset.NEXT_TRIPLE,
          ol.renderer.webgl.PolygonBatcher.EPSILON_DISAMBIG_);
      tess.gluTessVertex(coord, /**@type{?}*/(index + 2));

    } else {
      // One left edge vertex in triple

      coord[0] = vertices[i] + vertices[i +
          ol.renderer.webgl.VectorBatcher.Offset.FINE_COORD];
      coord[1] = vertices[i + 1] + vertices[i + 1 +
          ol.renderer.webgl.VectorBatcher.Offset.FINE_COORD];

      tess.gluTessVertex(coord, /**@type{?}*/(index));

      if (vertices[i + ol.renderer.webgl.VectorBatcher.Offset.FLAGS_A] ==
              ol.renderer.webgl.VectorBatcher.SurfaceFlags.NE_IN_EDGE_LEFT &&
          vertices[i + ol.renderer.webgl.VectorBatcher.Offset.FLAGS_B] ==
              ol.renderer.webgl.VectorBatcher.SurfaceFlags.NE_IN_EDGE_RIGHT) {
        // Broken edge: Skip 5 triples
        // REVISIT: Just skipping here - could consider two vertices.
        i += 5 * ol.renderer.webgl.VectorBatcher.Offset.NEXT_TRIPLE;
        index += 15;
      }
    }
  }

  tess.gluTessEndContour();
};


/**
 * Tiny displacement used to disambiguate redundant vertices for
 * tesselation.
 * @type {number}
 * @const
 * @private
 */
ol.renderer.webgl.PolygonBatcher.EPSILON_DISAMBIG_ = 0.0009765625;

/**
 * Linearly interpolate two vertex coordinate vectors.
 *
 * @param {!Array.<number>} dst Destination array.
 * @param {!Array.<number>} vertices Flat array of input coordinates.
 * @param {number} offsFirst Index offset of first coordinate vector.
 * @param {number} offsSecond Index offset of second coordinate vector.
 * @param {number} x Interpolation parameter.
 * @private
 */
ol.renderer.webgl.PolygonBatcher.lerpVertexCoord_ =
    function(dst, vertices, offsFirst, offsSecond, x) {

  dst[0] = goog.math.lerp(
      vertices[offsFirst] + vertices[offsFirst +
          ol.renderer.webgl.VectorBatcher.Offset.FINE_COORD],
      vertices[offsSecond] + vertices[offsSecond +
          ol.renderer.webgl.VectorBatcher.Offset.FINE_COORD],
      x);
  dst[1] = goog.math.lerp(
      vertices[offsFirst + 1] + vertices[offsFirst + 1 +
          ol.renderer.webgl.VectorBatcher.Offset.FINE_COORD],
      vertices[offsSecond + 1] + vertices[offsSecond + 1 +
          ol.renderer.webgl.VectorBatcher.Offset.FINE_COORD],
      x);
};


// ---------------- GluTesselator callbacks


/**
 * Record indexes from the tesselator.
 *
 * @param {number} index - Vertex index (second argument to gluTessVertex).
 * @param {!Array.<number>} indices - Destination array for vertex indices.
 * @private
 */
ol.renderer.webgl.PolygonBatcher.tessVertexCallback_ = function(index, indices) {
  // Data element is the index, record it
  indices.push(index);
};


/**
 * Log errors from the tesselator.
 *
 * @param {!Number} errno Error number.
 * @private
 */
ol.renderer.webgl.PolygonBatcher.tessErrorCallback_ = function(errno) {

  var name = '';
  if (goog.DEBUG) {
    // Only attempt to find symbol in debug mode.
    // FIXME this does not work in ADVANCED mode

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
  // TODO Use some logging facility?
  throw 'libtess.GluTesselator error #' + errno + ' ' + name;
};



