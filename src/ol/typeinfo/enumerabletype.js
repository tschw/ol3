goog.provide('ol.typeInfo.EnumerableType');



/**
 * Implementing classes may have a unique numeric type identifier
 * attached to their prototypes.
 * @interface
 */
ol.typeInfo.EnumerableType = function() {};


/**
 * Numeric type identifier managed by framework. Prior to recognition
 * by the target facility should be null.
 *
 * @type {number}
 */
ol.typeInfo.EnumerableType.prototype.typeId;
