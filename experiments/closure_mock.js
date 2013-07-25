
goog.provide('goog.math.clamp');
goog.provide('goog.math.lerp');
goog.provide('goog.object');
goog.provide('goog.webgl');

goog.math.clamp = function(value, min, max) {
    return Math.min(Math.max(value, min), max);
};

goog.math.lerp = function(a, b, x) {
    return (1.0 - x) * a + x * b;
};


goog.object.isEmpty = function(obj) {
  for (var key in obj) {
    return false;
  }
  return true;
};

goog.webgl = { 

    BYTE: 0x1400,
    UNSIGNED_BYTE: 0x1401,
    SHORT: 0x1402,
    UNSIGNED_SHORT: 0x1403,
    INT: 0x1404,
    UNSIGNED_INT: 0x1405,
    FLOAT: 0x1406
};
