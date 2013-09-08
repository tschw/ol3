
goog.provide('ol.renderer.webgl.highPrecision');

goog.require('goog.vec.Mat4');

// TODO Get this code under test!!!


/**
 * Determine a coarse value to encode high precision data in
 * two 32-bit floats.
 * Subtracting this value from the input yields the fine value.
 *
 * @param {number} v High precision floatingpoint value.
 * @return {number} Low precision, coarse part of the input.
 */
ol.renderer.webgl.highPrecision.coarseFloat = function(v) {

  return ol.renderer.webgl.highPrecision.POW2_16_ * (v > 0 ?
      Math.floor(v / ol.renderer.webgl.highPrecision.POW2_16_) :
      Math.ceil(v / ol.renderer.webgl.highPrecision.POW2_16_));
};


/**
 * Extracts and cancels the translation in a matrix transform
 * so that it can be applied as the first step using two 32-bit
 * floats per coordinate component. The sum of the translated
 * coarse and fine positons yields the final coordinate, where
 * the coarse part will more and more cancel out at increasing
 * zoom.
 * @param {!Array.<number>} dstPretranslation Destination array
 *     of coarse and fine coordinate vectors for pretranslation.
 * @param {!Array.<number>} dstMatrix Destination array for
 *     4x4 transformation matrix with removed translation.
 * @param {!Array.<number>} srcMatrix Input 4x4 transformation
 *     matrix.
 */
ol.renderer.webgl.highPrecision.detachTranslation =
    function(dstPretranslation, dstMatrix, srcMatrix) {

  // TODO Tighten up and avoid heavy goog.vec.Mat4 dependencies?

  var tmpMatrix = ol.renderer.webgl.highPrecision.tmpMatrix_;

  // Invert the transform, extract translation, and apply projective
  // division to get the viewer position in world space.
  goog.vec.Mat4.invert(srcMatrix, tmpMatrix);
  var negW = -tmpMatrix[15];
  dstPretranslation[1] = tmpMatrix[12] / negW;
  dstPretranslation[3] = tmpMatrix[13] / negW;
  dstPretranslation[5] = tmpMatrix[14] / negW;

  // Cancel out translation in the source matrix keeping its
  // projection intact
  goog.vec.Mat4.multScalar(srcMatrix, -1 / negW, dstMatrix);
  goog.vec.Mat4.makeTranslate(tmpMatrix,
      dstPretranslation[1], dstPretranslation[3], dstPretranslation[5]);
  goog.vec.Mat4.multMat(tmpMatrix, dstMatrix, dstMatrix);

  // Split up floats
  dstPretranslation[1] -= (dstPretranslation[0] =
      ol.renderer.webgl.highPrecision.coarseFloat(dstPretranslation[1]));
  dstPretranslation[3] -= (dstPretranslation[2] =
      ol.renderer.webgl.highPrecision.coarseFloat(dstPretranslation[3]));
  dstPretranslation[5] -= (dstPretranslation[4] =
      ol.renderer.webgl.highPrecision.coarseFloat(dstPretranslation[5]));
};


/**
 * Sixteenth power of two.
 * @type {number}
 * @const
 * @private
 */
ol.renderer.webgl.highPrecision.POW2_16_ = 65536;


/**
 * Temporary matrix.
 *
 * @type {Array.<number>}
 * @private
 */
ol.renderer.webgl.highPrecision.tmpMatrix_ = new Array(16);

