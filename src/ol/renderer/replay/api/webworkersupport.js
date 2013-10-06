goog.provide('ol.renderer.replay.api.Numbers');
goog.provide('ol.renderer.replay.api.WebWorkerSupport');


/**
 * @typedef {Array.<number>|Float64Array}
 */
ol.renderer.replay.api.Numbers;



/**
 * Interface exposing transferrable objects part of its implementation.
 *
 * @interface
 */
ol.renderer.replay.api.WebWorkerSupport = function() {};


/**
 * @typedef {Array.<ArrayBuffer|ArrayBufferView>}
 */
ol.renderer.replay.api.WebWorkerSupport.Transferables;


/**
 * Array of transferable objects owned by this object.
 *
 * @type {ol.renderer.replay.api.WebWorkerSupport.Transferables}
 */
ol.renderer.replay.api.WebWorkerSupport.prototype.transferables;
