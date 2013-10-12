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
 * Indicates that coordinates have been emitted that still need an
 * invocation.
 * @return {boolean}
 * @protected
 */
ol.renderer.replay.spi.BatchBuilder.prototype.renderPending =
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

  this.selectType(typeId);

  try {

    batcher.encodeGeometries(geometries);

  } catch (e) {

    goog.log.error(this.logger, e);
    this.batchErrorState =
        ol.renderer.replay.api.Batch.ErrorState.INTERNAL_ERROR;
    throw e;
  }
};


/**
 * @param {number} typeId
 * @private
 */
ol.renderer.replay.spi.BatchBuilder.prototype.emitConfigure_ =
    function(typeId) {

  goog.asserts.assert(goog.isDefAndNotNull(typeId));

  this.flushRender();

  this.controlStream.push(
      ol.renderer.replay.spi.ControlStream.Instruction.CONFIGURE,
      typeId);

  this.batchers_[typeId].encodeConfiguration();
  this.currentType_ = typeId;
};


/**
 * Cause a CONFIGURE instruction to be emitted for the requested
 * type, unless configured already.
 *
 * @param {number} typeId
 */
ol.renderer.replay.spi.BatchBuilder.prototype.selectType =
    function(typeId) {

  goog.asserts.assert(goog.isDefAndNotNull(typeId));

  if (typeId !== this.currentType_) {
    if (! goog.isNull(this.currentType_)) {
      // Invalidate style
      this.styles_[this.currentType_][1] = Number.NaN;
    }
    this.emitConfigure_(typeId);
  }
};


/**
 * Enforce a CONFIGURE instruction to be emitted for the current
 * type.
 */
ol.renderer.replay.spi.BatchBuilder.prototype.forceReconfigure =
    function() {

  goog.asserts.assert(! goog.isNull(this.currentType_));
  this.emitConfigure_(this.currentType_);
};


/**
 * Cause a SET_STYLE instruction to be emitted unless the style
 * data is already set.
 *
 * @param {Array.<number>} styleData
 */
ol.renderer.replay.spi.BatchBuilder.prototype.requestStyle =
    function(styleData) {

  var typeId = this.currentType_;
  goog.asserts.assert(! goog.isNull(typeId));
  var dstStyleVec = this.styles_[typeId];

  if (!! ol.array.rangeCopyCountNotSame(
      dstStyleVec, 1, styleData, 0, styleData.length)) {

    this.flushRender();
    Array.prototype.push.apply(this.controlStream, dstStyleVec);
  }

};


/**
 * Encode a RENDER instruction when {@link #renderPending} returns
 * true.
 */
ol.renderer.replay.spi.BatchBuilder.prototype.flushRender =
    function() {

  if (! goog.isNull(this.currentType_) && this.renderPending()) {
    this.controlStream.push(
        ol.renderer.replay.spi.ControlStream.Instruction.RENDER);
    this.batchers_[this.currentType_].encodeRender();
  }
};
