goog.provide('ol.renderer.replay.spi.Render');
goog.require('ol');
goog.require('ol.renderer.replay.spi.GeometriesHandler');



/**
 * Render implementations define how individual Geometries are rendered.
 *
 * @template Renderer
 * @constructor
 * @implements {ol.renderer.replay.spi.GeometriesHandler.<Renderer>}
 */
ol.renderer.replay.spi.Render = function() {};


/**
 * @type {?Renderer}
 */
ol.renderer.replay.spi.Render.prototype.context = null;


/**
 * Configure or reconfigure the rendering context for using this render.
 *
 * @param {ol.renderer.replay.spi.Batch} batch Batch.
 * @param {number} offset Offset in the control stream.
 * @return {number} Control stream offset after consumed arguments.
 */
ol.renderer.replay.spi.Render.prototype.configure =
    ol.emptyMethod;


/**
 * Set the rendering state for a specific style. This method is empty
 * if geometries are styled individually, in this case the style must
 * be apply during rendering.
 *
 * @param {ol.renderer.replay.spi.Batch} batch Batch.
 * @param {number} offset Offset in the control stream.
 * @return {number} Control stream offset after consumed arguments.
 */
ol.renderer.replay.spi.Render.prototype.setStyle =
    ol.emptyMethod;


/**
 * Perform rendering.
 *
 * @param {ol.renderer.replay.spi.Batch} batch Batch.
 * @param {number} offset Offset in the control stream.
 * @return {number} Control stream offset after consumed arguments.
 */
ol.renderer.replay.spi.Render.prototype.render =
    goog.abstractMethod;
