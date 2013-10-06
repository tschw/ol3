goog.provide('ol.renderer.replay.spi.BatchBuilder');

goog.require('goog.asserts');
goog.require('goog.log');
goog.require('goog.object');
goog.require('ol.array');

goog.require('ol.renderer.replay.api.Batch');
goog.require('ol.renderer.replay.api.BatchBuilder');

goog.require('ol.renderer.replay.spi.Batcher');
goog.require('ol.renderer.replay.spi.ControlStream');
goog.require('ol.renderer.replay.spi.GeometriesHandler');
goog.require('ol.renderer.replay.spi.GeometriesHandlerCtors');
goog.require('ol.renderer.replay.spi.MutableControlStream');

goog.require('ol.typeInfo.EnumerableType');



/**
 * Abstract BatchBuilder.
 *
 * @constructor
 * @implements {ol.renderer.replay.api.BatchBuilder}
 * @implements {ol.typeInfo.EnumerableType}
 * @param {ol.renderer.replay.spi.GeometriesHandlerCtors} batcherCtors
 * @param {goog.log.Logger} logger
 */
ol.renderer.replay.spi.BatchBuilder = function(batcherCtors, logger) {

  /**
   * @type {Object.<number, ol.renderer.replay.spi.Batcher>}
   * @private
   */
  this.batchers_ =
      /** @type {Object.<number, ol.renderer.replay.spi.Batcher>} */
      (ol.renderer.replay.spi.GeometriesHandler.bulkCreate(batcherCtors, this));

  /**
   * @type {goog.log.Logger}
   */
  this.logger = logger;

  this.reset();

  /**
   * @type {Object.<number, Array.<number>>}
   * @private
   */
  this.styles_ = goog.object.map(this.batchers_, function() {
    // Prefix every style vector with the SET_STYLE instruction so we
    // can use a single push
    return [ol.renderer.replay.spi.ControlStream.Instruction.SET_STYLE];
  });
};


/**
 * @type {?number}
 */
ol.renderer.replay.spi.BatchBuilder.prototype.typeId = null;


/**
 * Initialize the internal state for a new batch.
 * @protected
 */
ol.renderer.replay.spi.BatchBuilder.prototype.reset = function() {

  /**
   * @type {ol.renderer.replay.spi.MutableControlStream}
   * @protected
   */
  this.controlStream = [];

  /**
   * Configuration set at current position of the control stream.
   * @type {?number}
   * @private
   */
  this.currentType_ = null;

  /**
   * @type {ol.renderer.replay.api.Batch.ErrorState}
   * @protected
   */
  this.batchErrorState = ol.renderer.replay.api.Batch.ErrorState.OK;
};


/**
 * @inheritDoc
 */
ol.renderer.replay.spi.BatchBuilder.prototype.releaseBatch =
    goog.abstractMethod;


/**
 * @inheritDoc
 */
ol.renderer.replay.spi.BatchBuilder.prototype.addGeometries =
    function(geometries) {

  var typeId = geometries.typeId;
  goog.asserts.assert(goog.isDef(typeId), 'Type of geometries unknown');

  var batcher = this.batchers_[typeId];
  goog.asserts.assert(goog.isDef(batcher),
      'No Batcher registered for given geometries');

  try {

    batcher.encodeStyle(geometries);
    this.encodeState(typeId, batcher.styleData);
    batcher.encodeGeometries(geometries);

  } catch (e) {

    goog.log.error(this.logger, e);
    this.batchErrorState =
        ol.renderer.replay.api.Batch.ErrorState.INTERNAL_ERROR;
    throw e;
  }
};


/**
 * Encode an instruction sequence that ensures a certain state.
 *
 * Requests reconfiguration when called without arguments. An explicit
 * null argument for the type id will emit eventually pending render
 * calls but not configure the render - 'encodeState(null)' should be
 * called before releasing a batch.
 *
 * @param {?number=} opt_typeId Type ID.
 * @param {Array.<number>=} opt_styleData Style data.
 * @protected
 */
ol.renderer.replay.spi.BatchBuilder.prototype.encodeState =
    function(opt_typeId, opt_styleData) {

  var typeId = opt_typeId || this.currentType_,
      control = this.controlStream,
      dstStyleVec = null,
      styleChanged = false;

  var emitConfig = typeId != this.currentType_ || ! goog.isDef(opt_typeId);

  if (! goog.isNull(typeId)) {

    dstStyleVec = this.styles_[typeId];
    styleChanged = goog.isDefAndNotNull(opt_styleData) &&
        !! ol.array.rangeCopyCountNotSame(
            dstStyleVec, 1, opt_styleData, 0, opt_styleData.length);
  }

  // Emit pending RENDER
  if ((emitConfig || styleChanged || goog.isNull(opt_typeId)) &&
      ! goog.isNull(this.currentType_)) {

    control.push(
        ol.renderer.replay.spi.ControlStream.Instruction.RENDER);
    this.batchers_[this.currentType_].encodeRender();
  }

  // Emit CONFIGURE
  if (emitConfig && goog.isDefAndNotNull(typeId)) {

    control.push(
        ol.renderer.replay.spi.ControlStream.Instruction.CONFIGURE,
        typeId);
    this.batchers_[typeId].encodeConfiguration();
    this.currentType_ = typeId;

    styleChanged = true; // force setting the style
  }

  // Emit SET_STYLE
  if (styleChanged) {
    control.push.apply(control, dstStyleVec);
  }
};
