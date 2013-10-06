goog.provide('ol.renderer.replay.api.Batch');
goog.require('ol.renderer.replay.api.WebWorkerSupport');



/**
 * Encapsulation of replayable rendering instructions and associated data.
 *
 * @interface
 * @extends {ol.renderer.replay.api.WebWorkerSupport}
 */
ol.renderer.replay.api.Batch = function() {};


/**
 * Provide information about problems processing the input.
 *
 * @return {ol.renderer.replay.api.Batch.ErrorState}
 */
ol.renderer.replay.api.Batch.prototype.getErrorState =
    goog.abstractMethod;


/**
 * @enum {number}
 */
ol.renderer.replay.api.Batch.ErrorState = {
  OK: 0,
  INVALID_INPUT_WARNING: 1,
  INTERNAL_ERROR: 100,
  INVALID_INPUT_ERROR: 101
};


/**
 * @param {ol.renderer.replay.api.Batch.ErrorState} errorState
 * @return {boolean}
 */
ol.renderer.replay.api.Batch.isFatal = function(errorState) {
  return errorState >= 100;
};
