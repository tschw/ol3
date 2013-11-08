goog.provide('ol.ImageProvider');



/**
 * @interface
 */
ol.ImageProvider = function() {};


/**
 * Provide the image object.
 *
 * @return {HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} Image.
 */
ol.ImageProvider.prototype.getImage = goog.abstractMethod;


/**
 * Provide a unique identifier for referencing the image.
 * The stfing returned shall not resemble a negative integer.
 *
 * @return {string} Key.
 */
ol.ImageProvider.prototype.getKey = goog.abstractMethod;
