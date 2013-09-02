
goog.provide('goog.assert');
goog.provide('goog.array');
goog.provide('goog.math');
goog.provide('goog.object');
goog.provide('goog.webgl');


goog.assert = function(cond, msg) {
    if (! cond) throw msg;
}

goog.array.clone = function(arr) {
    var result = [];
    for (var i = 0, e = arr.length; i != e; ++i) result.push(arr[i]);
    return result;
}

goog.math.clamp = function(value, min, max) {
    return Math.min(Math.max(value, min), max);
};

goog.math.lerp = function(a, b, x) {
    return (1.0 - x) * a + x * b;
};

goog.math.toDegrees = function(a) {
    return a * (180 / Math.PI);
};

goog.math.toRadians = function(a) {
    return a * (Math.PI / 180);
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
