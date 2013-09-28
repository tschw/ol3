goog.provide('ol.renderer.webgl.batching');



/**
 * @class
 * Abstract base, batching SPI.
 *
 * Subclasses define batch preparation for a specific render.
 * @see {ol.renderer.webgl.Render}
 *
 * @constructor
 */
ol.renderer.webgl.batching.Batcher = function() {

  /**
   * Current style vector. Subclasses should encode a usable default
   * style within their constructors.
   *
   * @type {Array.<number>}
   */
  this.styleData = [];
};


/**
 * Batching context.
 *
 * @type {?ol.renderer.webgl.batching.Context}
 * @protected
 */
ol.renderer.webgl.batching.Batcher.prototype.context = null;


/**
 * Called whenever the parameter vector changes and upon initialization.
 *
 * @param {ol.renderer.webgl.batching.Parameters} parameters Parameter vector.
 */
ol.renderer.webgl.batching.Batcher.prototype.setParameters =
    goog.nullFunction;


/**
 * Encode style vector.
 *
 * @param {...?} var_args Arguments as defined in the derived class.
 */
ol.renderer.webgl.batching.Batcher.prototype.encodeStyle =
    goog.abstractMethod;


/**
 * Encode geometry data.
 *
 * @param {...?} var_args Arguments as defined in the derived class.
 */
ol.renderer.webgl.batching.Batcher.prototype.encodeGeometry =
    goog.abstractMethod;


/**
 * Structure that encapsulates the environment that Batchers operate on.
 *
 * @typedef {{
 *   indices: Array.<number>,
 *   vertices: Array.<number>,
 *   nextVertexIndex: number
 * }}
 */
ol.renderer.webgl.batching.Context;


/**
 * Global parameters to control behavioral details of Batchers.
 *
 * @typedef {Array}
 */
ol.renderer.webgl.batching.Parameters;


/**
 * Semantic indices of the elements in the paramter vector.
 *
 * @enum {number}
 * @see {ol.renderer.webgl.batching.Parameters}
 */
ol.renderer.webgl.batching.Parameter = {

  /**
   * Maximum angle of lines that are considered straight and connected
   * using a simple miter.
   */
  MAX_STRAIGHT_ANGLE: 0,

  /**
   * Maximum angle for beveled line junctions.
   */
  MAX_BEVEL_ANGLE: 1

};


/**
 * Host-side representation of a batch.
 *
 * @typedef {{
 *   controlStream: ol.renderer.webgl.batching.ControlStream,
 *   indexData: Uint16Array,
 *   vertexData: Float32Array
 * }}
 */
ol.renderer.webgl.batching.Blueprint;


/**
 * A flat array of numbers that represent rendering instructions
 * each followed by its arguments.
 * A typed array is used to reduce the host-side memory footprint.
 *
 * @typedef {(Array|Float32Array)}
 * @see {ol.renderer.webgl.batching.Instruction}
 */
ol.renderer.webgl.batching.ControlStream;


/**
 * Control stream instruction.
 *
 * @enum {number}
 */
ol.renderer.webgl.batching.Instruction = {
  /**
   * Selects the rendering configuration. Followed by two
   * arguments; the render type and the byte offset to use
   * for the vertex buffer.
   *
   * @see {ol.renderer.webgl.geometries.RenderType}
   */
  CONFIGURE: 0,
  /**
   * Sets the style for the primitives to be rendered.
   * Followed by four arguments that encode the style.
   */
  SET_STYLE: 1,
  /**
   * Dereferences a range within the index buffer.
   * The single argument specifies the number of indices to
   * be dereferenced.
   * Ranges are assumed to be tightly packed, so the offset
   * is determined from instructions in the control stream,
   * where a 'DRAW_ELEMENTS' instructions sets the offset
   * behind the last element dereferenced and selection of
   * a new index buffer resets the offset to zero.
   */
  DRAW_ELEMENTS: 2
};
