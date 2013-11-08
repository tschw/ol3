goog.provide('ol.renderer.replay.api.Renderer');
goog.provide('ol.renderer.replay.api.RendererFactory');

goog.require('goog.vec.Mat4');
goog.require('ol.renderer.replay.api.Batch');



/**
 * Renderer.
 *
 * @interface
 */
ol.renderer.replay.api.Renderer = function() {};


/**
 * Set a parameter.
 *
 * @param {ol.renderer.replay.api.Renderer.ParameterIndex} index
 *    Parameter to set.
 * @param {ol.renderer.replay.api.Renderer.ParameterValue} value
 *    State to set.
 */
ol.renderer.replay.api.Renderer.prototype.setParameter =
    goog.abstractMethod;


/**
 * Indicate the start of a layer with given opacity.
 *
 * @param {number=} opt_opacity Opacity.
 */
ol.renderer.replay.api.Renderer.prototype.beginLayer =
    goog.abstractMethod;


/**
 * Render a batch.
 * Prepares the batch for rendering if not done so, already.
 *
 * @param {ol.renderer.replay.api.Batch} batch Batch.
 */
ol.renderer.replay.api.Renderer.prototype.render =
    goog.abstractMethod;


/**
 * Finalize rendering and reset state tracking.
 *
 * The context of the underlying rendering API may be used externally
 * after this call until the first call to 'render'.
 */
ol.renderer.replay.api.Renderer.prototype.flush =
    goog.abstractMethod;


/**
 * Free external resources that were allocated when preparing the batch.
 *
 * @param {ol.renderer.replay.api.Batch} batch Batch.
 */
ol.renderer.replay.api.Renderer.prototype.unloadBatch =
    goog.abstractMethod;


/**
 * @enum {number}
 */
ol.renderer.replay.api.Renderer.ParameterIndex = {
  /**
   * Width and height of screen.
   */
  RESOLUTION: 0,

  /**
   * Transformation matrix (16 values for a 4x4 in column major order).
   */
  COORDINATE_TRANSFORM: 1,

  /**
   * Real-valued number of pixels to use for edge smoothing.
   */
  HINT_SMOOTH_PIXELS: 2,

  /**
   * Gamma correction for input colors from images.
   */
  HINT_IMAGE_INPUT_GAMMA: 3,

  /**
   * Gamma correction for input colors from color values (specified by
   * the client, rather than extracted from an image).
   */
  HINT_COLOR_INPUT_GAMMA: 4,

  /**
   * Gamma correction for output colors.
   */
  HINT_OUTPUT_GAMMA: 5
};


/**
 * @typedef {number|Array.<number>}
 */
ol.renderer.replay.api.Renderer.ParameterValue;


/**
 * @typedef {Array.<ol.renderer.replay.api.Renderer.ParameterValue>}
 */
ol.renderer.replay.api.Renderer.ParameterVector;


/**
 * @type {ol.renderer.replay.api.Renderer.ParameterVector}
 * @const
 */
ol.renderer.replay.api.Renderer.DEFAULT_PARAMETERS = [
  // RESOLUTION
  [256, 256],
  // COORDINATE_TRANSFORM
  goog.vec.Mat4.makeIdentity(new Array(16)),
  // HINT_SMOOTH_PIXELS
  1.75,
  // HINT_*_INPUT_GAMMA
  1 / 2.3,
  1 / 2.3,
  // HINT_OUTPUT_GAMMA
  2.3
];



/**
 * @interface
 */
ol.renderer.replay.api.RendererFactory = function() {};


// TODO tighten type on param once we take the DOM element
/**
 * @param {?} context
 * @return {ol.renderer.replay.api.Renderer}
 */
ol.renderer.replay.api.RendererFactory.prototype.create =
    goog.abstractMethod;
