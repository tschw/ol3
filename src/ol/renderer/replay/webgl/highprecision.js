goog.provide('ol.renderer.replay.webgl.highPrecision');

goog.require('goog.vec.Mat4');
goog.require('goog.vec.Vec3');


/**
 * Determine a coarse value to encode high precision data in
 * two 32-bit floats.
 * Subtracting this value from the input yields the fine value.
 *
 * @param {number} v High precision floatingpoint value.
 * @return {number} Low precision, coarse part of the input.
 */
ol.renderer.replay.webgl.highPrecision.coarseFloat =
    function(v) {

  return ol.renderer.replay.webgl.highPrecision.POW2_16_ * (v > 0 ?
      Math.floor(v / ol.renderer.replay.webgl.highPrecision.POW2_16_) :
      Math.ceil(v / ol.renderer.replay.webgl.highPrecision.POW2_16_));
};


/**
 * Extracts and cancels the translation in a matrix transform
 * so that it can be applied as the first step using two 32-bit
 * floats per coordinate component. The sum of the translated
 * coarse and fine positons yields the final coordinate, where
 * the coarse part will more and more cancel out at increasing
 * zoom.
 * @param {Array.<number>} dstPretranslation Destination array
 *     of coarse and fine coordinate vectors for pretranslation.
 * @param {Array.<number>} dstMatrix Destination array for
 *     4x4 transformation matrix with removed translation.
 * @param {Array.<number>} srcMatrix Input 4x4 transformation
 *     matrix.
 */
ol.renderer.replay.webgl.highPrecision.detachTranslation =
    function(dstPretranslation, dstMatrix, srcMatrix) {

  // Determine translation in world space
  goog.vec.Mat4.invert(srcMatrix, dstMatrix);
  goog.vec.Mat4.getColumn(dstMatrix, 3, dstPretranslation);
  goog.vec.Vec3.negate(dstPretranslation, dstPretranslation);

  // Encode it
  for (var v, c, i = 0; i < 3; ++i) {
    v = dstPretranslation[i];
    c = ol.renderer.replay.webgl.highPrecision.coarseFloat(v);

    dstPretranslation[i] = c;
    dstPretranslation[i + 3] = v - c;
  }

  // Remove translation from matrix
  goog.vec.Mat4.makeTranslate(
      dstMatrix, -srcMatrix[12], -srcMatrix[13], -srcMatrix[14]);
  goog.vec.Mat4.multMat(dstMatrix, srcMatrix, dstMatrix);
};


/**
 * Sixteenth power of two.
 * @type {number}
 * @const
 * @private
 */
ol.renderer.replay.webgl.highPrecision.POW2_16_ = 65536;
