goog.provide('ol.renderer.webgl.gpuData');


/**
 * Emit three vertices with redundant coordinates distinguished by
 * their control flags.
 *
 * @param {!Array.<number>} vertices Destination array.
 * @param {number} x X-component of coordinate.
 * @param {number} y Y-component of coordinate.
 * @param {number} flagsA Flags for first vertex in triple.
 * @param {number} flagsB Flags for second vertex in triple.
 * @param {number} flagsC Flags for third vertex in triple.
 */
ol.renderer.webgl.gpuData.emitTripleVertex =
    function(vertices, x, y, flagsA, flagsB, flagsC) {

  var xCoarse = ol.renderer.webgl.highPrecision.coarseFloat(x),
      yCoarse = ol.renderer.webgl.highPrecision.coarseFloat(y);

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
 * @param {!Array.<number>} indices Destination array to append to.
 * @param {number} iInL Incoming "left edge" index.
 * @param {number} iInR Incoming "right edge" index.
 * @param {number} iOutL Outgoing "left edge" index.
 * @param {number} iOutR Outgoing "right edge" index.
 */
ol.renderer.webgl.gpuData.emitQuadIndices =
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
ol.renderer.webgl.gpuData.encodeRGB = function(color) {
  return (
      Math.floor(color.r) * 256 +
      Math.floor(color.g) +
      Math.floor(color.b) / 256);
};


