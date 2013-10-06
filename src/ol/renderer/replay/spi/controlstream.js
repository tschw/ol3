goog.provide('ol.renderer.replay.spi.ControlStream');
goog.provide('ol.renderer.replay.spi.MutableControlStream');


/**
 * @typedef {Float32Array|Array.<number>}
 */
ol.renderer.replay.spi.ControlStream = {};


/**
 * @typedef {Array.<number>}
 */
ol.renderer.replay.spi.MutableControlStream = {};


/**
 * @enum
 */
ol.renderer.replay.spi.ControlStream.Instruction = {

  /**
   * Selects the rendering configuration. This instruction is
   * always followed by a geometry id that selects the Render.
   * The Render may process further arguments.
   */
  CONFIGURE: 0,

  /**
   * Sets the style for the primitives to be rendered.
   * Argument processing is the responsibiliy of the selected
   * Render.
   */
  SET_STYLE: 1,

  /**
   * Invoke rendering.
   * Argument processing is the responsibiliy of the selected
   * Render.
   */
  RENDER: 2
};
