
goog.provide('ol.renderer.webgl.common');

goog.require('goog.asserts');
goog.require('ol.array');


/**
 * Sets a parameter in a parameter vector over numbers and arrays of
 * numbers.
 *
 * @param {Array.<number|Array.<number>>} params Parameter vector.
 * @param {number} which Parameter index to set.
 * @param {number|Array.<number>} state Parameter value.
 * @return {boolean} Boolean value indicating change.
 */
ol.renderer.webgl.common.setParameter = function(params, which, state) {

  goog.asserts.assert(which in params, 'Unknown render parameter.');
  var changed = false, param = params[which];
  if (goog.isArray(param)) {
    goog.asserts.assert(goog.isArray(state), 'Array expected.');
    goog.asserts.assert(state.length >= param.length, 'Not enough data.');
    changed = !! ol.array.copyIfNot(param, state);
  } else {
    goog.asserts.assert(goog.isNumber(state), 'Number expected.');
    changed = state != param;
    params[which] = state;
  }
  return changed;
};
