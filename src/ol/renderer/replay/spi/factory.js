goog.provide('ol.renderer.replay.spi.Factory');

goog.require('goog.array');
goog.require('goog.functions');

goog.require('ol.renderer.replay.api.Geometries');
goog.require('ol.renderer.replay.spi.GeometriesHandler');
goog.require('ol.typeInfo.TypeIdProvider');



/**
 * @constructor
 * @template T
 * @extends {ol.typeInfo.TypeIdProvider.<
 *    ol.renderer.replay.api.Geometries>}
 * @param {function(new:T, Object.<number, function(
 *    new:ol.renderer.replay.spi.GeometriesHandler.<T>)>, ...)} ctorFacility
 */
ol.renderer.replay.spi.Factory = function(ctorFacility) {

  goog.base(this);

  /**
   * @type {function(new:T, Object.<number, function(
   *    new:ol.renderer.replay.spi.GeometriesHandler.<T>)>, ...)}
   * @private
   */
  this.ctor_ = ctorFacility;

  /**
   * @type {Object.<number,
   *    function(new:ol.renderer.replay.spi.GeometriesHandler.<T>)>}
   * @private
   */
  this.geometriesHandlers_ = {};
};
goog.inherits(
    ol.renderer.replay.spi.Factory, ol.typeInfo.TypeIdProvider);


/**
 * @param {function(new:ol.renderer.replay.api.Geometries, ...)}
 *      geometriesCtor Concrete Geometries class, represented by its
 *      constructor.
 * @param {function(new:ol.renderer.replay.spi.GeometriesHandler.<T>)}
 *      geometriesHandlerCtor Constructor of concrete GeometriesHandler
        class to be registered, represeneted by its constructor.
 * @protected
 */
ol.renderer.replay.spi.Factory.prototype.registerGeometriesHandler =
    function(geometriesCtor, geometriesHandlerCtor) {

  this.geometriesHandlers_[this.getOrAssignId(geometriesCtor)] =
      geometriesHandlerCtor;
};


/**
 * @param {...} var_args Specified by interface implemented.
 * @return {T}
 */
ol.renderer.replay.spi.Factory.prototype.create =
    function(var_args) {

  // REVISIT: For some odd reason just binding goog.functions.create
  // to define this method did not work in ADVANCED mode.
  var args = goog.array.clone(arguments);
  args.unshift(this.ctor_, this.geometriesHandlers_);
  return /** type{T} */ (goog.functions.create.apply(this, args));

};
