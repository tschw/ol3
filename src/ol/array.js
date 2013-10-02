goog.provide('ol.array');

goog.require('goog.array');
goog.require('goog.asserts');


/**
 * @param {Array.<number>} arr Array.
 * @param {number} target Target.
 * @return {number} Index.
 */
ol.array.binaryFindNearest = function(arr, target) {
  var index = goog.array.binarySearch(arr, target,
      /**
       * @param {number} a A.
       * @param {number} b B.
       * @return {number} b minus a.
       */
      function(a, b) {
        return b - a;
      });
  if (index >= 0) {
    return index;
  } else if (index == -1) {
    return 0;
  } else if (index == -arr.length - 1) {
    return arr.length - 1;
  } else {
    var left = -index - 2;
    var right = -index - 1;
    if (arr[left] - target < target - arr[right]) {
      return left;
    } else {
      return right;
    }
  }
};


/**
 * @param {Array.<number>} arr Array.
 * @param {number} target Target.
 * @param {number} direction 0 means return the nearest, > 0
 *    means return the largest nearest, < 0 means return the
 *    smallest nearest.
 * @return {number} Index.
 */
ol.array.linearFindNearest = function(arr, target, direction) {
  var n = arr.length;
  if (arr[0] <= target) {
    return 0;
  } else if (target <= arr[n - 1]) {
    return n - 1;
  } else {
    var i;
    if (direction > 0) {
      for (i = 1; i < n; ++i) {
        if (arr[i] < target) {
          return i - 1;
        }
      }
    } else if (direction < 0) {
      for (i = 1; i < n; ++i) {
        if (arr[i] <= target) {
          return i;
        }
      }
    } else {
      for (i = 1; i < n; ++i) {
        if (arr[i] == target) {
          return i;
        } else if (arr[i] < target) {
          if (arr[i - 1] - target < target - arr[i]) {
            return i - 1;
          } else {
            return i;
          }
        }
      }
    }
    // We should never get here, but the compiler complains
    // if it finds a path for which no number is returned.
    goog.asserts.fail();
    return n - 1;
  }
};


/**
 * Copies array elements when a predicate yields 'false'.
 * The source array is entirely copied to the destination at the
 * specified offset.
 *
 * @param {Array} dst Destination array.
 * @param {number} dstOffset Destination offset.
 * @param {Array} src Source array.
 * @param {Function=} opt_predicate Optional predicate, called
 *     with corresponding elements from source and destination
 *     arrays. Defaults to goog.array.defaultCompareEquality.
 * @return {number} Number of elements copied.
 */
ol.array.copyIfNot = function(dst, dstOffset, src, opt_predicate) {
  var i, n, e, result = 0, predicate =
      opt_predicate || goog.array.defaultCompareEquality;
  for (i = 0, n = src.length; i < n; ++i) {
    e = src[i];
    if (! predicate(e, dst[i])) {
      dst[i + dstOffset] = e;
      ++result;
    }
  }
  return result;
};
