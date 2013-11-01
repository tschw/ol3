goog.provide('ol.renderer.webgl.VectorLayer2');
goog.provide('ol.webglnew.geometry');

goog.require('goog.asserts');
goog.require('goog.object');
goog.require('goog.vec.Mat4');
goog.require('goog.webgl');
goog.require('ol.Color');
goog.require('ol.math');
goog.require('ol.renderer.replay.api.Batch');
goog.require('ol.renderer.replay.api.BatchBuilder');
goog.require('ol.renderer.replay.api.Renderer');
goog.require('ol.renderer.replay.input');
goog.require('ol.renderer.replay.webgl.BatchBuilderFactory');
goog.require('ol.renderer.replay.webgl.RendererFactory');
goog.require('ol.renderer.webgl.Layer');
goog.require('ol.renderer.webgl.testData');
goog.require('ol.renderer.webgl.vectorlayer2.shader.PointCollection');
goog.require('ol.style.LineLiteral');


/***
 * @typedef {{start: number,
 *            stop: number,
 *            style: ol.style.LineLiteral}}
 */
ol.LineStyleRange;



/**
 * @constructor
 * @extends {ol.renderer.webgl.Layer}
 * @param {ol.renderer.Map} mapRenderer Map renderer.
 * @param {ol.layer.Vector2} vectorLayer2 Vector layer.
 */
ol.renderer.webgl.VectorLayer2 = function(mapRenderer, vectorLayer2) {

  goog.base(this, mapRenderer, vectorLayer2);

  goog.vec.Mat4.makeIdentity(this.projectionMatrix);

  /**
   * @private
   * @type {!goog.vec.Mat4.Number}
   */
  this.modelViewMatrix_ = goog.vec.Mat4.createNumberIdentity();


  /**
   * @private
   * @type {?number}
   */
  this.framebufferDimension_ = null;

  /**
   * @private
   * @type {?ol.renderer.replay.api.Renderer}
   */
  this.batchRenderer_ = null;

  /**
   * @private
   * @type {ol.renderer.replay.api.BatchBuilder}
   */
  this.batchBuilder_ =
      ol.renderer.replay.webgl.BatchBuilderFactory.getInstance().create();


  /**
   * @private
   * @type {?ol.renderer.replay.api.Batch}
   */
  this.batch_ = null;

  /**
   * @private
   * @type {ol.renderer.webgl.vectorlayer2.shader.PointCollection.Locations}
   */
  this.pointCollectionLocations_ = null;

};
goog.inherits(ol.renderer.webgl.VectorLayer2, ol.renderer.webgl.Layer);


/**
 * @param {ol.geom2.LineStringCollection} lineStrings Line strings.
 * @param {Array.<ol.style.LineLiteral>} styles Styles.
 * @return {Array.<ol.LineStyleRange>} Line style ranges.
 * @private
 */
ol.renderer.webgl.VectorLayer2.getLineStyleRanges_ =
    function(lineStrings, styles) {
  var n = lineStrings.getCount();
  goog.asserts.assert(styles.length == n);
  var lineStyleRanges = [];
  if (n !== 0) {
    var start = 0;
    var style = styles[0];
    var i;
    for (i = 1; i < n; ++i) {
      if (!styles[i].equals(style)) {
        lineStyleRanges.push({
          start: start,
          stop: i,
          style: style
        });
        start = i;
        style = styles[i];
      }
    }
    lineStyleRanges.push({
      start: start,
      stop: n,
      style: style
    });
  }
  return lineStyleRanges;
};


/**
 * @return {ol.layer.Vector2} Vector layer.
 */
ol.renderer.webgl.VectorLayer2.prototype.getVectorLayer = function() {
  return /** @type {ol.layer.Vector2} */ (this.getLayer());
};


/**
 * @inheritDoc
 */
ol.renderer.webgl.VectorLayer2.prototype.handleWebGLContextLost = function() {
  goog.base(this, 'handleWebGLContextLost');
  this.pointCollectionLocations_ = null;
};


/**
 * @inheritDoc
 */
ol.renderer.webgl.VectorLayer2.prototype.renderFrame =
    function(frameState, layerState) {

  var mapRenderer = this.getWebGLMapRenderer();
  var gl = mapRenderer.getGL();

  var view2DState = frameState.view2DState;

  var vectorLayer = this.getVectorLayer();
  var vectorSource = vectorLayer.getVectorSource();

  var size = frameState.size;
  var framebufferDimension = ol.math.roundUpToPowerOfTwo(
      Math.max(size[0], size[1]));

  this.bindFramebuffer(frameState, framebufferDimension);
  gl.viewport(0, 0, framebufferDimension, framebufferDimension);
  this.framebufferDimension_ = framebufferDimension;

  gl.clearColor(0, 0, 0, 0);
  gl.clear(goog.webgl.COLOR_BUFFER_BIT);
  gl.enable(goog.webgl.BLEND);

  goog.vec.Mat4.makeIdentity(this.modelViewMatrix_);
  if (view2DState.rotation !== 0) {
    goog.vec.Mat4.rotateZ(this.modelViewMatrix_, -view2DState.rotation);
  }
  goog.vec.Mat4.scale(this.modelViewMatrix_,
      2 / (framebufferDimension * view2DState.resolution),
      2 / (framebufferDimension * view2DState.resolution),
      1);
  goog.vec.Mat4.translate(this.modelViewMatrix_,
      -view2DState.center[0],
      -view2DState.center[1],
      0);

  var pointCollections = vectorSource.getPointCollections();
  if (pointCollections.length > 0) {
    this.renderPointCollections(pointCollections);
  }

  var batchRenderer = this.prepareRenderer_();

  var batch = this.batch_;
  if (goog.isNull(batch)) {
    // TODO should also enter here when data has changed and...
    //
    // // Free resources of old version
    // if (! goog.isNull(this.batch_)) {
    //   batchRenderer.unload(this.batch_);
    // }

    var lineStrings = vectorSource.getLineStrings();
    this.batchLineStrings_(lineStrings);
    this.batchPolygons_();

    batch = this.batchBuilder_.releaseBatch();
    this.batch_ = batch;
  }

  // Render and forget the GL state (as there's rendering outside of it)
  batchRenderer.render(batch);
  batchRenderer.flush();

  goog.vec.Mat4.makeIdentity(this.texCoordMatrix);
  goog.vec.Mat4.translate(this.texCoordMatrix,
      0.5,
      0.5,
      0);
  goog.vec.Mat4.scale(this.texCoordMatrix,
      size[0] / framebufferDimension,
      size[1] / framebufferDimension,
      1);
  goog.vec.Mat4.translate(this.texCoordMatrix,
      -0.5,
      -0.5,
      0);
};


/**
 * @return {ol.renderer.replay.api.Renderer}
 * @private
 */
ol.renderer.webgl.VectorLayer2.prototype.prepareRenderer_ =
    function() {

  var mapRenderer = this.getWebGLMapRenderer();
  var gl = mapRenderer.getGL();

  // Eventually create batch renderer
  var batchRenderer = this.batchRenderer_;
  if (goog.isNull(batchRenderer)) {

    batchRenderer =
        ol.renderer.replay.webgl.RendererFactory.getInstance().create(gl);
    this.batchRenderer_ = batchRenderer;
  }

  // Set parameters
  var framebufDim = this.framebufferDimension_;
  batchRenderer.setParameter(ol.renderer.replay.api.
      Renderer.ParameterIndex.RESOLUTION, [framebufDim, framebufDim]);

  batchRenderer.setParameter(ol.renderer.replay.api.
      Renderer.ParameterIndex.COORDINATE_TRANSFORM, this.modelViewMatrix_);

  return batchRenderer;
};


/**
 * @private
 */
ol.renderer.webgl.VectorLayer2.prototype.batchPolygons_ =
    function() {

  // Set style
  // TODO Get style data and replace this hard-wired hack
  var fillColor = new ol.Color(0, 0, 255, 0.5);
  var strokeWidth = 4.0; // pixels
  var strokeColor = new ol.Color(255, 255, 0, 1);
  var miterLimit = 2.0;

  var coords = [];
  var offsets = [];
  Array.prototype.push.apply(coords,
      ol.renderer.webgl.testData.france(2850, 355242, 5921862));
  offsets.push(coords.length);
  Array.prototype.push.apply(coords,
      ol.renderer.webgl.testData.TRIANGLE);
  offsets.push(-coords.length);
  Array.prototype.push.apply(coords,
      ol.renderer.webgl.testData.SQUARE);
  offsets.push(coords.length);

  this.batchBuilder_.addGeometries(
      new ol.renderer.replay.input.Polygons(
          coords, offsets, fillColor, strokeWidth, strokeColor, miterLimit));
};


/**
 * @param {Array.<ol.StyledLineStringCollection>} lineStrings Line strings.
 * @private
 */
ol.renderer.webgl.VectorLayer2.prototype.batchLineStrings_ =
    function(lineStrings) {

  var batchBuilder = this.batchBuilder_;

  // Set style
  // TODO Get style data and replace this hard-wired hack
  var width = 15.0; // pixels
  var color = new ol.Color(255, 0, 0, 0.5);
  var miterLimit = 2.0;

  // Draw geometry to batch
  var i, collection, buffer;
  for (i = 0; i < lineStrings.length; ++i) {
    collection = lineStrings[i].lineStrings;
    goog.asserts.assert(collection.dim == 2);

    batchBuilder.addGeometries(
        new ol.renderer.replay.input.LineStrings(
            collection.buf.getArray(),
            goog.object.getValues(collection.ends),
            width, color, miterLimit));

  }
};


/**
 * @param {Array.<ol.geom2.PointCollection>} pointCollections Point collections.
 */
ol.renderer.webgl.VectorLayer2.prototype.renderPointCollections =
    function(pointCollections) {

  var mapRenderer = this.getWebGLMapRenderer();
  var gl = mapRenderer.getGL();

  var vertexShader = ol.renderer.webgl.vectorlayer2.shader.
      PointCollectionVertex;
  var fragmentShader = ol.renderer.webgl.vectorlayer2.shader.
      PointCollectionFragment;
  var program = mapRenderer.getProgram(vertexShader, fragmentShader);
  gl.useProgram(program);
  if (goog.isNull(this.pointCollectionLocations_)) {
    this.pointCollectionLocations_ =
        new ol.renderer.webgl.vectorlayer2.shader.PointCollection.Locations(
            gl, program);
  }

  gl.uniformMatrix4fv(this.pointCollectionLocations_.u_modelViewMatrix, false,
      this.modelViewMatrix_);
  gl.enableVertexAttribArray(this.pointCollectionLocations_.a_position);

  var buf, dim, i, pointCollection;
  for (i = 0; i < pointCollections.length; ++i) {
    pointCollection = pointCollections[i];
    buf = pointCollection.buf;
    dim = pointCollection.dim;
    mapRenderer.bindBuffer(goog.webgl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(this.pointCollectionLocations_.a_position, 2,
        goog.webgl.FLOAT, false, 4 * dim, 0);
    gl.uniform4fv(this.pointCollectionLocations_.u_color, [1, 0, 0, 0.75]);
    gl.uniform1f(this.pointCollectionLocations_.u_pointSize, 3);
    buf.forEachRange(function(start, stop) {
      gl.drawArrays(goog.webgl.POINTS, start / dim, (stop - start) / dim);
    });
  }

  gl.disableVertexAttribArray(this.pointCollectionLocations_.a_position);

};
