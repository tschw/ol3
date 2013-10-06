goog.provide('ol.typeInfo.TypeIdProvider');
goog.require('ol.typeInfo.EnumerableType');



/**
 * Generic facility to enumerate classes implementing EnumerableType.
 * @see {ol.typeInfo.EnumerableType}
 * @constructor
 * @template Base
 */
ol.typeInfo.TypeIdProvider = function() {};


/**
 * Get the unique numeric 'typeId' attached to the argument's prototype.
 *
 * @param {function(new:Base, ...)} enumerableCtor Type representation.
 * @return {number} Unique Id.
 * @protected
 */
ol.typeInfo.TypeIdProvider.prototype.getOrAssignId = function(enumerableCtor) {
  /** @type {ol.typeInfo.EnumerableType} */
  var p = /** @type {Base} */ (enumerableCtor.prototype);
  return p.typeId || (p.typeId = ++this.previousTypeId_);
};


/**
 * @type {number}
 * @private
 */
ol.typeInfo.TypeIdProvider.prototype.previousTypeId_ = 0;
