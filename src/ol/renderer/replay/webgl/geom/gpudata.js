goog.provide('ol.renderer.replay.webgl.geom.gpuData');

goog.require('ol.renderer.replay.webgl.highPrecision');


/**
 * Encode a color (without alpha) within a single floatingpoint value.
 * Each component is encoded in eight bits.
 *
 * @param {ol.Color} color Color to encode.
 * @return {number} Encoded value.
 */
ol.renderer.replay.webgl.geom.gpuData.encodeRGB = function(color) {
  return (
      Math.floor(color.r) * 256 +
      Math.floor(color.g) +
      color.b / 256);
};


/**
 * Encode two unisnged normalized values (range zero to one) within a
 * single floatingpoint value. Each component is encoded in twelve bits.
 *
 * @param {number} u
 * @param {number} v
 * @return {number} Encoded value.
 */
ol.renderer.replay.webgl.geom.gpuData.encodeUV = function(u, v) {
  return Math.floor(u * 4095) + v * 4095 / 4096;
};


/**
 * Encode twp unsigned 12-bit integers (0..4095) within a single 32-bit
 * floatingpoint value.
 *
 * @param {number} a Value in range 0..4095.
 * @param {number} b Value in range 0..4095.
 * @return {number} Floatinpoint representation.
 */
ol.renderer.replay.webgl.geom.gpuData.encode2U12 = function(a, b) {
  return Math.floor(a) + b / 4096;
};


/**
 * Encode two signed 12-bit integers (-2048..2047) within a single 32-bit
 * floatingpint value.
 *
 * @param {number} a Value in range -2048..2047.
 * @param {number} b Value in range -2048..2047.
 * @return {number} Floatinpoint representation.
 */
ol.renderer.replay.webgl.geom.gpuData.encode2I12 = function(a, b) {
  return Math.floor(a + 2048) + (b + 2048) / 4096;
};


/**
 * Encode a two-vector of unsigned 12-bit integers (0..4095) within a
 * single 32-bit floatinpoint value.
 * @param {Array.<number>} vec2
 * @return {number} Floatinpoint representation.
 */
ol.renderer.replay.webgl.geom.gpuData.encodeVec2U12 =
    /** @type {function(Array.<number>) : number} */ (
    goog.bind(Function.prototype.apply,
    ol.renderer.replay.webgl.geom.gpuData.encode2U12, null));


/**
 * Encode a two-vector of signed 12-bit integers (-2048..2047) within a
 * single 32-bit floatinpoint value.
 * @param {Array.<number>} vec2
 * @return {number} Floatinpoint representation.
 */
ol.renderer.replay.webgl.geom.gpuData.encodeVec2I12 =
    /** @type {function(Array.<number>) : number} */ (
    goog.bind(Function.prototype.apply,
    ol.renderer.replay.webgl.geom.gpuData.encode2I12, null));


/**
 * Emit a high precision 2D vertex coordinate.
 *
 * @param {Array.<number>} vertices Destination array to append to.
 * @param {number} x X-component of the coordinate.
 * @param {number} y Y-component of the coordinate.
 */
ol.renderer.replay.webgl.geom.gpuData.emitVertexCoord =
    function(vertices, x, y) {

  var xc = ol.renderer.replay.webgl.highPrecision.coarseFloat(x),
      yc = ol.renderer.replay.webgl.highPrecision.coarseFloat(y);
  x -= xc;
  y -= yc;
  vertices.push(xc, yc, x, y);
};


/**
 * Emit vertices for a coordinate. Each vertex consists of a high
 * precision 2D coordinate followed by a discriminator.
 * One vertex is generated per discriminator.
 *
 * @param {Array.<number>} vertices Destination array to append to.
 * @param {Array.<number>} discriminators Array of discriminators.
 * @param {ol.renderer.replay.api.Numbers} coords
 *    Flat array of 2D input coordinates.
 * @param {number} offset Start index in input array.
 * @param {number} stride Distance of coordinates in the array.
 * @param {number} end End index (exclusive).
 */
ol.renderer.replay.webgl.geom.gpuData.emitVertexGroups =
    function(vertices, discriminators, coords, offset, stride, end) {

  var i, j, xc, yc, xf, yf, n = discriminators.length;

  for (i = offset; i != end; i += stride) {

    // Split coordinate into coarse and fine part (high precision support)
    xf = coords[i], yf = coords[i + 1];
    xc = ol.renderer.replay.webgl.highPrecision.coarseFloat(xf),
    yc = ol.renderer.replay.webgl.highPrecision.coarseFloat(yf);
    xf -= xc;
    yf -= yc;

    // Push vertex data
    for (j = 0; j < n; ++j) {
      vertices.push(xc, yc, xf, yf, discriminators[j]);
    }
  }
};


/**
 * Emit vertices for coordinates. Each vertex consists of a high
 * precision 2D coordinate followed by a discriminator. For every
 * input coordinate one vertex is generated per discriminator.
 *
 * @param {Array.<number>} vertices Destination array to append to.
 * @param {Array.<number>} discriminators Array of discriminators.
 * @param {ol.renderer.replay.api.Numbers} coords
 *    Flat array of 2D input coordinates.
 * @param {number} i Index of x component in input array.
 * @param {Array.<number>=} opt_extra Extra data at end of vertex.
 */
ol.renderer.replay.webgl.geom.gpuData.emitVertexGroup =
    function(vertices, discriminators, coords, i, opt_extra) {

  var j, xc, yc, xf, yf, n = discriminators.length;
  opt_extra = opt_extra || ol.array.EMPTY;

  // Split coordinate into coarse and fine part (high precision support)
  xf = coords[i], yf = coords[i + 1];
  xc = ol.renderer.replay.webgl.highPrecision.coarseFloat(xf),
  yc = ol.renderer.replay.webgl.highPrecision.coarseFloat(yf);
  xf -= xc;
  yf -= yc;

  // Push vertex data
  for (j = 0; j < n; ++j) {
    vertices.push(xc, yc, xf, yf, discriminators[j]);
    vertices.push.apply(vertices, opt_extra);
  }
};


/**
 * Emit index pattern for multiple quads built from triangles.
 * The winding of the corresponding coordinates is preserved.
 *
 * @param {Array.<number>} indices Destination array.
 * @param {number} i First vertex index to use.
 * @param {number} n Number of quads.
 * @return {number} Last index written + 1.
 */
ol.renderer.replay.webgl.geom.gpuData.emitQuads =
    function(indices, i, n) {

  for (n = i + n * 4; i < n; i += 4) {
    indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  return i;
};


/**
 * Emit index pattern for a single quad built from two triangles.
 * The naming of the parameters is based on counterclockwise
 * winding.
 *
 * @param {Array.<number>} indices Destination array to append to.
 * @param {number} iInL Incoming "left edge" index.
 * @param {number} iInR Incoming "right edge" index.
 * @param {number} iOutL Outgoing "left edge" index.
 * @param {number} iOutR Outgoing "right edge" index.
 */
ol.renderer.replay.webgl.geom.gpuData.emitQuad =
    function(indices, iInL, iInR, iOutL, iOutR) {

  indices.push(iInL, iInR, iOutL, iInR, iOutR, iOutL);
};
