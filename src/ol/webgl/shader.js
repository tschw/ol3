goog.provide('ol.webgl.shader');

goog.require('goog.functions');
goog.require('goog.webgl');
goog.require('ol.typeInfo.EnumerableType');
goog.require('ol.webgl');



/**
 * @constructor
 * @implements {ol.typeInfo.EnumerableType}
 * @param {string} source Source.
 */
ol.webgl.Shader = function(source) {

  /**
   * @private
   * @type {string}
   */
  this.source_ = source;
};


/**
 * Used to identify the concrete subclass.
 * @override
 */
ol.webgl.Shader.prototype.typeId = 0;


/**
 * WebGL type (VERTEX_SHADER or FRAGMENT_SHADER).
 * @return {number} Type.
 */
ol.webgl.Shader.prototype.getType = goog.abstractMethod;


/**
 * @return {string} Source.
 */
ol.webgl.Shader.prototype.getSource = function() {
  return this.source_;
};


/**
 * @return {boolean} Is animated?
 */
ol.webgl.Shader.prototype.isAnimated = goog.functions.FALSE;



/**
 * @constructor
 * @extends {ol.webgl.Shader}
 * @param {string} source Source.
 */
ol.webgl.shader.Fragment = function(source) {
  goog.base(this, 'precision mediump float;\n' + source);
};
goog.inherits(ol.webgl.shader.Fragment, ol.webgl.Shader);


/**
 * @inheritDoc
 */
ol.webgl.shader.Fragment.prototype.getType = function() {
  return goog.webgl.FRAGMENT_SHADER;
};



/**
 * @constructor
 * @extends {ol.webgl.Shader}
 * @param {string} source Source.
 */
ol.webgl.shader.Vertex = function(source) {
  goog.base(this, 'precision highp float;\n' + source);
};
goog.inherits(ol.webgl.shader.Vertex, ol.webgl.Shader);


/**
 * @inheritDoc
 */
ol.webgl.shader.Vertex.prototype.getType = function() {
  return goog.webgl.VERTEX_SHADER;
};
