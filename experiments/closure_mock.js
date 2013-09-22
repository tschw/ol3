
goog.provide('goog.asserts');
goog.provide('goog.array');
goog.provide('goog.math');
goog.provide('goog.object');
goog.provide('goog.webgl');
goog.provide('goog.vec.Mat4');
goog.provide('goog.vec.Vec3');

goog.asserts.assert = function(cond, msg) {
    if (! cond) throw msg;
}

goog.array.clone = function(arr) {
    return arr.slice(0, arr.length);
}

goog.array.equals = function(arr1, arr2, opt_equalsFn) {
  if (!goog.isArrayLike(arr1) || !goog.isArrayLike(arr2) ||
      arr1.length != arr2.length) {
    return false;
  }
  var l = arr1.length;
  var equalsFn = opt_equalsFn || goog.array.defaultCompareEquality;
  for (var i = 0; i < l; i++) {
    if (!equalsFn(arr1[i], arr2[i])) {
      return false;
    }
  }
  return true;
};

goog.array.defaultCompareEquality = function(a, b) {
  return a === b;
};

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

goog.vec.Mat4.invert = function(mat, resultMat) {
  var m00 = mat[0], m10 = mat[1], m20 = mat[2], m30 = mat[3];
  var m01 = mat[4], m11 = mat[5], m21 = mat[6], m31 = mat[7];
  var m02 = mat[8], m12 = mat[9], m22 = mat[10], m32 = mat[11];
  var m03 = mat[12], m13 = mat[13], m23 = mat[14], m33 = mat[15];

  var a0 = m00 * m11 - m10 * m01;
  var a1 = m00 * m21 - m20 * m01;
  var a2 = m00 * m31 - m30 * m01;
  var a3 = m10 * m21 - m20 * m11;
  var a4 = m10 * m31 - m30 * m11;
  var a5 = m20 * m31 - m30 * m21;
  var b0 = m02 * m13 - m12 * m03;
  var b1 = m02 * m23 - m22 * m03;
  var b2 = m02 * m33 - m32 * m03;
  var b3 = m12 * m23 - m22 * m13;
  var b4 = m12 * m33 - m32 * m13;
  var b5 = m22 * m33 - m32 * m23;

  var det = a0 * b5 - a1 * b4 + a2 * b3 + a3 * b2 - a4 * b1 + a5 * b0;
  if (det == 0) {
    return false;
  }

  var idet = 1.0 / det;
  resultMat[0] = (m11 * b5 - m21 * b4 + m31 * b3) * idet;
  resultMat[1] = (-m10 * b5 + m20 * b4 - m30 * b3) * idet;
  resultMat[2] = (m13 * a5 - m23 * a4 + m33 * a3) * idet;
  resultMat[3] = (-m12 * a5 + m22 * a4 - m32 * a3) * idet;
  resultMat[4] = (-m01 * b5 + m21 * b2 - m31 * b1) * idet;
  resultMat[5] = (m00 * b5 - m20 * b2 + m30 * b1) * idet;
  resultMat[6] = (-m03 * a5 + m23 * a2 - m33 * a1) * idet;
  resultMat[7] = (m02 * a5 - m22 * a2 + m32 * a1) * idet;
  resultMat[8] = (m01 * b4 - m11 * b2 + m31 * b0) * idet;
  resultMat[9] = (-m00 * b4 + m10 * b2 - m30 * b0) * idet;
  resultMat[10] = (m03 * a4 - m13 * a2 + m33 * a0) * idet;
  resultMat[11] = (-m02 * a4 + m12 * a2 - m32 * a0) * idet;
  resultMat[12] = (-m01 * b3 + m11 * b1 - m21 * b0) * idet;
  resultMat[13] = (m00 * b3 - m10 * b1 + m20 * b0) * idet;
  resultMat[14] = (-m03 * a3 + m13 * a1 - m23 * a0) * idet;
  resultMat[15] = (m02 * a3 - m12 * a1 + m22 * a0) * idet;
  return true;
};

goog.vec.Mat4.getColumn = function(mat, column, vec) {
  var i = column * 4;
  vec[0] = mat[i];
  vec[1] = mat[i + 1];
  vec[2] = mat[i + 2];
  vec[3] = mat[i + 3];
  return vec;
};

goog.vec.Mat4.setColumnValues = function(mat, column, v0, v1, v2, v3) {
  var i = column * 4;
  mat[i] = v0;
  mat[i + 1] = v1;
  mat[i + 2] = v2;
  mat[i + 3] = v3;
  return mat;
};

goog.vec.Mat4.setColumn = function(mat, column, vec) {
  var i = column * 4;
  mat[i] = vec[0];
  mat[i + 1] = vec[1];
  mat[i + 2] = vec[2];
  mat[i + 3] = vec[3];
  return mat;
};


goog.vec.Mat4.makeIdentity = function(mat) {
  mat[0] = 1;
  mat[1] = 0;
  mat[2] = 0;
  mat[3] = 0;
  mat[4] = 0;
  mat[5] = 1;
  mat[6] = 0;
  mat[7] = 0;
  mat[8] = 0;
  mat[9] = 0;
  mat[10] = 1;
  mat[11] = 0;
  mat[12] = 0;
  mat[13] = 0;
  mat[14] = 0;
  mat[15] = 1;
  return mat;
};

goog.vec.Mat4.makeTranslate = function(mat, x, y, z) {
  goog.vec.Mat4.makeIdentity(mat);
  return goog.vec.Mat4.setColumnValues(mat, 3, x, y, z, 1);
};

goog.vec.Mat4.multMat = function(mat0, mat1, resultMat) {
  var a00 = mat0[0], a10 = mat0[1], a20 = mat0[2], a30 = mat0[3];
  var a01 = mat0[4], a11 = mat0[5], a21 = mat0[6], a31 = mat0[7];
  var a02 = mat0[8], a12 = mat0[9], a22 = mat0[10], a32 = mat0[11];
  var a03 = mat0[12], a13 = mat0[13], a23 = mat0[14], a33 = mat0[15];

  var b00 = mat1[0], b10 = mat1[1], b20 = mat1[2], b30 = mat1[3];
  var b01 = mat1[4], b11 = mat1[5], b21 = mat1[6], b31 = mat1[7];
  var b02 = mat1[8], b12 = mat1[9], b22 = mat1[10], b32 = mat1[11];
  var b03 = mat1[12], b13 = mat1[13], b23 = mat1[14], b33 = mat1[15];

  resultMat[0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
  resultMat[1] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
  resultMat[2] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
  resultMat[3] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;

  resultMat[4] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
  resultMat[5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
  resultMat[6] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
  resultMat[7] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;

  resultMat[8] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
  resultMat[9] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
  resultMat[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
  resultMat[11] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;

  resultMat[12] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
  resultMat[13] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
  resultMat[14] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
  resultMat[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;
  return resultMat;
};

goog.vec.Mat4.multScalar = function(mat, scalar, resultMat) {
  resultMat[0] = mat[0] * scalar;
  resultMat[1] = mat[1] * scalar;
  resultMat[2] = mat[2] * scalar;
  resultMat[3] = mat[3] * scalar;
  resultMat[4] = mat[4] * scalar;
  resultMat[5] = mat[5] * scalar;
  resultMat[6] = mat[6] * scalar;
  resultMat[7] = mat[7] * scalar;
  resultMat[8] = mat[8] * scalar;
  resultMat[9] = mat[9] * scalar;
  resultMat[10] = mat[10] * scalar;
  resultMat[11] = mat[11] * scalar;
  resultMat[12] = mat[12] * scalar;
  resultMat[13] = mat[13] * scalar;
  resultMat[14] = mat[14] * scalar;
  resultMat[15] = mat[15] * scalar;
  return resultMat;
};

goog.vec.Vec3.negate = function(vec0, resultVec) {
  resultVec[0] = -vec0[0];
  resultVec[1] = -vec0[1];
  resultVec[2] = -vec0[2];
  return resultVec;
};

