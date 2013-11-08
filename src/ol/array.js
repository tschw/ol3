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
 * @typedef {Array|Arguments|ArrayBufferView}
 */
ol.array.ArrayLike;


/**
 * Copy and count array elements that are unidentical from one array range
 * to another.
 * Source and destination shall not be overlapping ranges in the same array.
 *
 * @param {ol.array.ArrayLike} dst Destination array.
 * @param {number} dstOffs Offset of the range in the destination array.
 * @param {ol.array.ArrayLike} src Source array.
 * @param {number} srcOffs Offset of the range in the source array.
 * @param {number} n Length of the range.
 * @return {number} Number of different elements.
 */
ol.array.rangeCopyCountNotSame = function(dst, dstOffs, src, srcOffs, n) {
  goog.asserts.assert(
      src !== dst || srcOffs + n <= dstOffs || srcOffs >= dstOffs + n,
      'Overlapping array ranges are not supported');
  var v, c = 0;
  while (--n >= 0) {
    v = src[n + srcOffs];
    if (v !== dst[n + dstOffs]) {
      dst[n + dstOffs] = v;
      ++c;
    }
  }
  return c;
};


/**
 * Empty array.
 * @type {Array.<*>}
 * @const
 */
ol.array.EMPTY = [];
