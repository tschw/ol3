goog.provide('ol.renderer.replay.api.BatchBuilder');
goog.provide('ol.renderer.replay.api.BatchBuilderFactory');



/**
 * Facility to create batches.
 *
 * @interface
 */
ol.renderer.replay.api.BatchBuilder = function() {};


/**
 * Add geometries to the batch currently under construction.
 *
 * @param {ol.renderer.replay.api.Geometries} geometries
 *    Geometries to add to the batch.
 */
ol.renderer.replay.api.BatchBuilder.prototype.addGeometries =
    goog.abstractMethod;


/**
 * Release the built batch from the builder and eventually start
 * building another.
 *
 * @return {ol.renderer.replay.api.Batch}
 */
ol.renderer.replay.api.BatchBuilder.prototype.releaseBatch =
    goog.abstractMethod;



/**
 * @interface
 */
ol.renderer.replay.api.BatchBuilderFactory = function() {};


/**
 * @return {ol.renderer.replay.api.BatchBuilder}
 */
ol.renderer.replay.api.BatchBuilderFactory.prototype.create =
    goog.abstractMethod;
