goog.provide('ol.renderer.replay.spi.Geometries');

goog.require('ol.renderer.replay.api.Geometries');
goog.require('ol.renderer.replay.api.WebWorkerSupport');

goog.require('ol.typeInfo.EnumerableType');



/**
 * Abstract Geometries.
 *
 * @constructor
 * @implements {ol.renderer.replay.api.Geometries}
 * @implements {ol.renderer.replay.api.WebWorkerSupport}
 * @implements {ol.typeInfo.EnumerableType}
 */
ol.renderer.replay.spi.Geometries = function() {

  /**
   * @inheritDoc
   * @type {ol.renderer.replay.api.WebWorkerSupport.Transferables}
   */
  this.transferables = [];
};


/**
 * Add the argument to the array of transferable objects, if it is transferable.
 * Intended to be used during property initialization - there is no checking
 * whether the object is already contained in the array of transferables.
 *
 * @template T
 * @param {T} obj
 * @return {T} Same as argument.
 * @protected
 */
ol.renderer.replay.spi.Geometries.prototype.trackTransferable =
    function(obj) {

  // Check whether we have a typed array and if so add to transferables
  var isTypedArray = false;
  if ('ArrayBufferView' in goog.global) {
    isTypedArray =
        obj instanceof ArrayBufferView || obj instanceof ArrayBuffer;
  } else if ('ArrayBuffer' in goog.global) {
    // TODO Check whether ArrayBufferView is required by web worker spec
    // if so, we can remove this mess
    isTypedArray = obj instanceof ArrayBuffer;
    if (! isTypedArray) {
      var ctor = obj.constructor;
      isTypedArray =
          ctor === goog.global.Float64Array ||
          ctor === goog.global.Float32Array ||
          ctor === goog.global.Int32Array ||
          ctor === goog.global.Uint32Array ||
          ctor === goog.global.Int16Array ||
          ctor === goog.global.Uint16Array ||
          ctor === goog.global.Int8Array ||
          ctor === goog.global.Uint8Array;
    }
  }
  if (isTypedArray) {
    this.transferables.push(obj);
  }
  return obj;
};


/**
 * @inheritDoc
 */
ol.renderer.replay.spi.Geometries.prototype.typeId = null;
