goog.provide('ol.renderer.replay.spi.Renderer');

goog.require('goog.asserts');
goog.require('goog.object');

goog.require('ol');
goog.require('ol.array');

goog.require('ol.renderer.replay.api.Renderer');

goog.require('ol.renderer.replay.spi.ControlStream');
goog.require('ol.renderer.replay.spi.GeometriesHandler');
goog.require('ol.renderer.replay.spi.GeometriesHandlerCtors');
goog.require('ol.renderer.replay.spi.Render');

goog.require('ol.typeInfo.EnumerableType');



/**
 * @constructor
 * @implements {ol.renderer.replay.api.Renderer}
 * @implements {ol.typeInfo.EnumerableType}
 * @param {ol.renderer.replay.spi.GeometriesHandlerCtors} renderCtors
 */
ol.renderer.replay.spi.Renderer = function(renderCtors) {

  /**
   * @type {Object.<number, ol.renderer.replay.spi.Render>}
   * @private
   */
  this.renders_ =
      /** @type {Object.<number, ol.renderer.replay.spi.Render>} */
      (ol.renderer.replay.spi.GeometriesHandler.bulkCreate(renderCtors, this));

  /**
   * Parameter vector exposed on the implementation side.
   *
   * @type {ol.renderer.replay.api.Renderer.ParameterVector}
   */
  this.parameters =
      /** @type {ol.renderer.replay.api.Renderer.ParameterVector} */
      (goog.object.unsafeClone(
          ol.renderer.replay.api.Renderer.DEFAULT_PARAMETERS));
};


/**
 * @type {?number}
 */
ol.renderer.replay.spi.Renderer.prototype.typeId = null;


/**
 * Currently active render.
 *
 * @type {ol.renderer.replay.spi.Render}
 */
ol.renderer.replay.spi.Renderer.prototype.currentRender = null;


/**
 * Flag set when parameters are changed.
 * To be cleared by the subclass or render base class that reacts.
 *
 * @type {boolean}
 */
ol.renderer.replay.spi.Renderer.prototype.parametersChanged = true;


/**
 * @inheritDoc
 */
ol.renderer.replay.spi.Renderer.prototype.setParameter =
    function(index, value) {

  var changed = false,
      param = this.parameters[index];
  goog.asserts.assert(goog.isDef(param), 'Unknown parameter');
  if (goog.isArray(param)) {
    goog.asserts.assert(goog.isArray(value), 'Expected Array');
    goog.asserts.assert(value.length >= param.length,
        'Array length does not match prototype');
    changed = !!
        ol.array.rangeCopyCountNotSame(param, 0, value, 0, value.length);
  } else {
    goog.asserts.assert(goog.isNumber(value), 'Expected number');
    changed = value != param;
    this.parameters[index] = value;
  }
  this.parametersChanged |= changed;
};


/**
 * @inheritDoc
 */
ol.renderer.replay.spi.Renderer.prototype.render =
    function(batch) {

  batch = /** @type {ol.renderer.replay.spi.Batch} */ (batch);

  var render = this.currentRender,
      controlStream = batch.controlStream;

  for (var i = 0, n = controlStream.length; i < n;) {
    switch (controlStream[i++]) {

      case ol.renderer.replay.spi.ControlStream.Instruction.RENDER:

        i = render.render(batch, i) || i;
        break;

      case ol.renderer.replay.spi.ControlStream.Instruction.SET_STYLE:

        i = render.setStyle(batch, i) || i;
        break;

      case ol.renderer.replay.spi.ControlStream.Instruction.CONFIGURE:

        render = this.renders_[controlStream[i++]];

        goog.asserts.assert(goog.isDef(render),
            'No geometriesHandler registered to handle encoded geometry');
        i = render.configure(batch, i) || i;
        this.currentRender = render;
    } // switch
  }
};


/**
 * @inheritDoc
 */
ol.renderer.replay.spi.Renderer.prototype.flush = ol.emptyMethod;


/**
 * @inheritDoc
 */
ol.renderer.replay.spi.Renderer.prototype.unloadBatch = ol.emptyMethod;
