goog.provide('ol.renderer.replay.spi.GeometriesHandler');
goog.provide('ol.renderer.replay.spi.GeometriesHandlerCtors');
goog.provide('ol.renderer.replay.spi.GeometriesHandlers');

goog.require('goog.object');



/**
 * @template Context
 * @interface
 */
ol.renderer.replay.spi.GeometriesHandler = function() {};


/**
 * @type {Context}
 */
ol.renderer.replay.spi.GeometriesHandler.prototype.context;


/**
 * @param {ol.renderer.replay.spi.GeometriesHandlerCtors} geometriesHandlers
 * @param {Object} context
 * @return {ol.renderer.replay.spi.GeometriesHandlers}
 */
ol.renderer.replay.spi.GeometriesHandler.bulkCreate =
    function(geometriesHandlers, context) {

  var result = /** @type {Object.<number, ol.renderer.replay.
      spi.GeometriesHandler>} */ (
      goog.object.map(geometriesHandlers, function(ctor) {

        var instance = new ctor();
        instance.context = this;
        return instance;

      }, context));

  return result;
};


/**
 * @typedef {Object.<number, ol.renderer.replay.spi.GeometriesHandler>}
 */
ol.renderer.replay.spi.GeometriesHandlers;


/**
 * @typedef {Object.<number,
 *    function(new:ol.renderer.replay.spi.GeometriesHandler)>}
 */
ol.renderer.replay.spi.GeometriesHandlerCtors;
