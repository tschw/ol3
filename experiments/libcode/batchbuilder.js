goog.provide('ol.renderer.webgl.BatchBuilder');

goog.require('ol.renderer.webgl.RenderType');


/**
 * Create a BatchBuilder.
 *
 * @constructor
 */
ol.renderer.webgl.BatchBuilder = function() {

  /**
   * @type {Array.<ol.renderer.webgl.batching.Batcher>}
   * @private
   */
  this.batchers_ = [];

  this.batchers_[ol.renderer.webgl.RenderType.LINES] =
      new ol.renderer.webgl.LineBatcher();

  this.batchers_[ol.renderer.webgl.RenderType.POLYGONS] =
      new ol.renderer.webgl.PolygonBatcher();

  // -- Assembly of public interface (this class is a facade)

  /**
   * Add a line string to the current batch.
   *
   * The string will be closed (that is, be a ring) if the first and the
   * last coordinate in the range are equal.
   *
   * @param {!Array.<number>} coords Array of packed input coordinates.
   * @param {number} offset Start index in input array.
   * @param {number} end End index (exclusive).
   */
  this.lineString = goog.bind(
      this.geometry_, this, ol.renderer.webgl.RenderType.LINES);

  /**
   * Sets the style for line rendering.
   *
   * @param {number} width Width of the line.
   * @param {ol.Color} color Fill color and alpha.
   * @param {number=} opt_strokeWidth Fractional stroke width.
   * @param {ol.Color=} opt_strokeColor Stroke color (alpha is ignored
   *    instead the opacity specified by the fill color is used).
   */
  this.setLineStyle = goog.bind(
      this.setStyle_, this, ol.renderer.webgl.RenderType.LINES);

  /**
   * Add a polygon to the current batch.
   *
   * The first contour given defines the outside of the polygon
   * further contours define holes.
   *
   * @param {!Array.<!Array.<number>>} contours Contours in CCW winding.
   */
  this.polygon = goog.bind(
      this.geometry_, this, ol.renderer.webgl.RenderType.POLYGONS);

  /**
   * Set the style for polygon rendering.
   *
   * @param {ol.Color} color Fill color and alpha.
   * @param {number} antiAliasing Anti-Aliasing width used by the renderer.
   * @param {number=} opt_strokeWidth Stroke width in pixels.
   * @param {ol.Color=} opt_strokeColor Stroke color (alpha is ignored
   *    instead the opacity specified by the fill color is used).
   */
  this.setPolygonStyle = goog.bind(
      this.setStyle_, this, ol.renderer.webgl.RenderType.POLYGONS);

  // -- End of public interface assembly

  /**
   * @type {ol.renderer.webgl.batching.Context}
   * @private
   */
  this.context_ = { };

  /**
   * @type {ol.renderer.webgl.batching.Parameters}
   * @private
   */
  this.parameters_ = goog.array.clone(
      ol.renderer.webgl.BatchBuilder.DEFAULT_PARAM_VECTOR_);


  this.reset_();

  /**
   * @type {Array.<Array.<number>>}
   * @private
   */
  this.styles_ = [];

  for (var renderType in this.batchers_) {
    var batcher = this.batchers_[renderType];
    batcher.context = this.context_;
    batcher.setParameters(this.parameters_);
    this.styles_[renderType] = goog.array.clone(batcher.styleData);
  }
};


/**
 * Set a parameter.
 *
 * @param {!ol.renderer.webgl.batching.Parameter} which Parameter to set.
 * @param {!(number|Array.<number>)} state State to set.
 */
ol.renderer.webgl.BatchBuilder.prototype.setParameter =
    function(which, state) {

  var params = this.parameters_;
  if (ol.renderer.webgl.common.setParameter(params, which, state)) {
    for (var renderType in this.batchers_) {
      this.batchers_[renderType].setParameters(params);
    }
  }
};

/**
 * Default global parameterization.
 *
 * @type {!ol.renderer.webgl.batching.Parameters}
 * @const
 * @private
 */
ol.renderer.webgl.BatchBuilder.DEFAULT_PARAM_VECTOR_ = [

    // MAX_STRAIGHT_ANGLE
    30, 
    // MAX_BEVEL_ANGLE
    160
];



/**
 * Get the resulting batch data from this builder.
 *
 * @return {!ol.renderer.webgl.batching.Blueprint} All data for rendering
 *     prior to upload to the GPU.
 */
ol.renderer.webgl.BatchBuilder.prototype.releaseBlueprint = function() {
  this.emitDraw_();
  var result = {
    vertexData: new Float32Array(this.context_.vertices),
    indexData: new Uint16Array(this.context_.indices),
    controlStream: new Float32Array(this.control_)
  };
  this.reset_();
  return result;
};


// ---------------- Method prototypes


/**
 * Batch geometry.
 *
 * @param {!ol.renderer.webgl.RenderType} render Type of render.
 * @param {...*} var_args Arguments as defined in the Batchers.
 * @private
 */
ol.renderer.webgl.BatchBuilder.prototype.geometry_ =
    function(render, var_args) {

  this.requestConfig_(render);

  var batcher = this.batchers_[render];
  batcher.encodeGeometry(
      arguments[1], arguments[2], arguments[3], arguments[4]);

  // TODO ensure Uint16 indices
};



/**
 * Request a style vector to be set for a specific configuration.
 *
 * @param {!ol.renderer.webgl.RenderType} render Type of render.
 * @param {...*} var_args Arguments as defined in the Batchers.
 * @private
 */
ol.renderer.webgl.BatchBuilder.prototype.setStyle_ =
    function(render, var_args) {

  var batcher = this.batchers_[render];

  batcher.encodeStyle(
      arguments[1], arguments[2], arguments[3], arguments[4]);
  if (!! ol.array.copyIfNot(this.styles_[render], batcher.styleData) &&
      render == this.currentRender_) {
    // Set style when render active - otherwise gets set later
    // when switching to this geometry
    this.emitSetStyle_();
  }
};


// ---------------- Batching infrastructure


/**
 * Initialize the internal state for a new batch.
 * @private
 */
ol.renderer.webgl.BatchBuilder.prototype.reset_ = function() {

  /**
   * Control stream data.
   * @type {!ol.renderer.webgl.batching.ControlStream}
   * @private
   */
  this.control_ = [];

  /**
   * Vertex buffer is bound at this offset.
   * @type {number}
   * @private
   */
  this.vertexBufferOffset_ = 0;

  /**
   * Indices covered by draw calls emitted to the control stream.
   * @type {number}
   * @private
   */
  this.nIndicesFlushed_ = 0;

  /**
   * Configuration set at current position of the control stream.
   * @type {?ol.renderer.webgl.RenderType}
   * @private
   */
  this.currentRender_ = null;


  this.context_.indices = [];
  this.context_.vertices = [];
  this.context_.nextVertexIndex = 0;
};


/**
 * Ensure a specific render is activated at the current position in
 * the control stream.
 *
 * @param {!ol.renderer.webgl.RenderType} render
 * @private
 */
ol.renderer.webgl.BatchBuilder.prototype.requestConfig_ =
    function(render) {

  if (render == this.currentRender_) {
    // Already active? Nothing to do.
    return;
  }

  // Remap vertex buffer to new offset, restart index counting
  this.vertexBufferOffset_ = this.context_.vertices.length;
  this.context_.nextVertexIndex = 0;

  // Emit control instructions for reconfiguration and do so with style
  this.currentRender_ = render;
  this.emitConfigure_();
  this.emitSetStyle_();
};



/**
 * Emit a DRAW_ELEMENTS instruction to the control stream.
 * @private
 */
ol.renderer.webgl.BatchBuilder.prototype.emitDraw_ = function() {

  var n = this.context_.indices.length - this.nIndicesFlushed_;
  if (n > 0) {
    // Any new indices? Have them drawn at this point
    this.control_.push(
        ol.renderer.webgl.batching.Instruction.DRAW_ELEMENTS, n);
    this.nIndicesFlushed_ = this.context_.indices.length;
  }
};


/**
 * Emit a SET_STYLE instruction to the control stream.
 * @private
 */
ol.renderer.webgl.BatchBuilder.prototype.emitSetStyle_ = function() {

  // Ensure everything is rendered until here
  this.emitDraw_();

  // Write instruction and style vector to control stream
  var control = this.control_;
  control.push(
      ol.renderer.webgl.batching.Instruction.SET_STYLE);
  control.push.apply(control, this.styles_[this.currentRender_]);
};


/**
 * Emit a CONFIGURE instruction to the control stream.
 * @private
 */
ol.renderer.webgl.BatchBuilder.prototype.emitConfigure_ = function() {

  // Ensure everything is rendered until here
  this.emitDraw_();

  // Write instruction, configuration index and vertex buffer
  // offset (in bytes) to the control stream
  this.control_.push(
      ol.renderer.webgl.batching.Instruction.CONFIGURE,
      this.currentRender_, this.vertexBufferOffset_ * 4);
};
