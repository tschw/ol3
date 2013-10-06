goog.provide('ol.renderer.replay.webgl.geom.gpuData');

goog.require('ol.renderer.replay.webgl.highPrecision');


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
 */
ol.renderer.replay.webgl.geom.gpuData.emitVertexGroup =
    function(vertices, discriminators, coords, i) {

  var j, xc, yc, xf, yf, n = discriminators.length;

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
};


/**
 * Emit three vertices with redundant coordinates distinguished by
 * their control flags.
 *
 * @param {Array.<number>} vertices Destination array.
 * @param {number} x X-component of coordinate.
 * @param {number} y Y-component of coordinate.
 * @param {number} flagsA Flags for first vertex in triple.
 * @param {number} flagsB Flags for second vertex in triple.
 * @param {number} flagsC Flags for third vertex in triple.
 */
ol.renderer.replay.webgl.geom.gpuData.emitTripleVertex =
    function(vertices, x, y, flagsA, flagsB, flagsC) {

  var xCoarse = ol.renderer.replay.webgl.highPrecision.coarseFloat(x),
      yCoarse = ol.renderer.replay.webgl.highPrecision.coarseFloat(y);

  x -= xCoarse;
  y -= yCoarse;

  vertices.push(
      xCoarse, yCoarse, x, y, flagsA,
      xCoarse, yCoarse, x, y, flagsB,
      xCoarse, yCoarse, x, y, flagsC);
};


/**
 * Emit triangle indexes for a quad.
 *
 * @param {Array.<number>} indices Destination array to append to.
 * @param {number} iInL Incoming "left edge" index.
 * @param {number} iInR Incoming "right edge" index.
 * @param {number} iOutL Outgoing "left edge" index.
 * @param {number} iOutR Outgoing "right edge" index.
 */
ol.renderer.replay.webgl.geom.gpuData.emitQuadIndices =
    function(indices, iInL, iInR, iOutL, iOutR) {

  indices.push(
      iInL, iInR, iOutL,
      iInR, iOutR, iOutL);
};


/**
 * Encode a color (without alpha) in a floatingpoint value.
 *
 * @param {ol.Color} color Color to encode.
 * @return {number} Encoded red, green and blue component (8 bit each).
 */
ol.renderer.replay.webgl.geom.gpuData.encodeRGB = function(color) {
  return (
      Math.floor(color.r) * 256 +
      Math.floor(color.g) +
      Math.floor(color.b) / 256);
};
