// FIXME check against gl.getParameter(webgl.MAX_TEXTURE_SIZE)

goog.provide('ol.renderer.webgl.Map');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.events');
goog.require('goog.events.Event');
goog.require('goog.log');
goog.require('goog.log.Logger');
goog.require('goog.object');
goog.require('goog.style');
goog.require('goog.webgl');
goog.require('ol.Size');
goog.require('ol.Tile');
goog.require('ol.css');
goog.require('ol.layer.Image');
goog.require('ol.layer.Tile');
goog.require('ol.layer.Vector2');
goog.require('ol.renderer.Map');
goog.require('ol.renderer.webgl.ImageLayer');
goog.require('ol.renderer.webgl.TileLayer');
goog.require('ol.renderer.webgl.VectorLayer2');
goog.require('ol.renderer.webgl.map.shader.Color');
goog.require('ol.renderer.webgl.map.shader.Default');
goog.require('ol.size');
goog.require('ol.structs.Buffer');
goog.require('ol.structs.IntegerSet');
goog.require('ol.structs.PriorityQueue');
goog.require('ol.webgl');
goog.require('ol.webgl.ShaderCache');
goog.require('ol.webgl.TextureCache');
goog.require('ol.webgl.WebGLContextEventType');
goog.require('ol.webgl.shader');


/**
 * @define {number} Texture cache high water mark.
 */
ol.WEBGL_TEXTURE_CACHE_HIGH_WATER_MARK = 1024;


/**
 * @typedef {{buf: ol.structs.Buffer,
 *            buffer: WebGLBuffer,
 *            dirtySet: ol.structs.IntegerSet}}
 */
ol.renderer.webgl.BufferCacheEntry;


/**
 * @typedef {{magFilter: number, minFilter: number, texture: WebGLTexture}}
 */
ol.renderer.webgl.TextureCacheEntry;



/**
 * @constructor
 * @extends {ol.renderer.Map}
 * @param {Element} container Container.
 * @param {ol.Map} map Map.
 */
ol.renderer.webgl.Map = function(container, map) {

  goog.base(this, container, map);

  /**
   * @private
   * @type {Element}
   */
  this.canvas_ = goog.dom.createElement(goog.dom.TagName.CANVAS);
  this.canvas_.height = container.clientHeight;
  this.canvas_.width = container.clientWidth;
  this.canvas_.className = ol.css.CLASS_UNSELECTABLE;
  goog.dom.insertChildAt(container, this.canvas_, 0);

  /**
   * @private
   * @type {boolean}
   */
  this.renderedVisible_ = true;

  /**
   * @private
   * @type {ol.Size}
   */
  this.canvasSize_ = [container.clientHeight, container.clientWidth];

  /**
   * @private
   * @type {WebGLRenderingContext}
   */
  this.gl_ = ol.webgl.getContext(this.canvas_, {
    blend: true,
    alpha: true,
    premultipliedAlpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    preserveDrawingBuffer: false
  });
  goog.asserts.assert(!goog.isNull(this.gl_));

  goog.events.listen(this.canvas_, ol.webgl.WebGLContextEventType.LOST,
      this.handleWebGLContextLost, false, this);
  goog.events.listen(this.canvas_, ol.webgl.WebGLContextEventType.RESTORED,
      this.handleWebGLContextRestored, false, this);

  /**
   * @private
   * @type {ol.renderer.webgl.map.shader.Color.Locations}
   */
  this.colorLocations_ = null;

  /**
   * @private
   * @type {ol.renderer.webgl.map.shader.Default.Locations}
   */
  this.defaultLocations_ = null;

  /**
   * @private
   * @type {ol.structs.Buffer}
   */
  this.arrayBuffer_ = new ol.structs.Buffer([
    -1, -1, 0, 0,
    1, -1, 1, 0,
    -1, 1, 0, 1,
    1, 1, 1, 1
  ]);

  /**
   * @private
   * @type {Object.<number, ol.renderer.webgl.BufferCacheEntry>}
   */
  this.bufferCache_ = {};

  /**
   * @private
   * @type {ol.webgl.ShaderCache}
   */
  this.shaderCache_ = new ol.webgl.ShaderCache(this.gl_);

  this.registerDisposable(this.shaderCache_);

  /**
   * @private
   * @type {ol.webgl.TextureCache}
   */
  this.textureCache_ = new ol.webgl.TextureCache(this.gl_, 256);

  this.registerDisposable(this.textureCache_);

  /**
   * @private
   * @type {ol.Coordinate}
   */
  this.focus_ = null;

  /**
   * @private
   * @type {ol.structs.PriorityQueue}
   */
  this.tileTextureQueue_ = new ol.structs.PriorityQueue(
      /**
       * @param {Array} element Element.
       * @return {number} Priority.
       */
      goog.bind(function(element) {
        var tileCenter = /** @type {ol.Coordinate} */ (element[1]);
        var tileResolution = /** @type {number} */ (element[2]);
        var deltaX = tileCenter[0] - this.focus_[0];
        var deltaY = tileCenter[1] - this.focus_[1];
        return 65536 * Math.log(tileResolution) +
            Math.sqrt(deltaX * deltaX + deltaY * deltaY) / tileResolution;
      }, this),
      /**
       * @param {Array} element Element.
       * @return {string} Key.
       */
      function(element) {
        return /** @type {ol.Tile} */ (element[0]).getKey();
      });

  /**
   * @private
   * @type {ol.PostRenderFunction}
   */
  this.loadNextTileTexture_ = goog.bind(
      function(map, frameState) {
        if (!this.tileTextureQueue_.isEmpty()) {
          this.tileTextureQueue_.reprioritize();
          var tile =
              /** @type {ol.Tile} */ (this.tileTextureQueue_.dequeue()[0]);
          this.bindTileTexture(tile, goog.webgl.LINEAR, goog.webgl.LINEAR);
        }
      }, this);

  this.initializeGL_();

};
goog.inherits(ol.renderer.webgl.Map, ol.renderer.Map);


/**
 * @param {number} target Target.
 * @param {ol.structs.Buffer} buf Buffer.
 */
ol.renderer.webgl.Map.prototype.bindBuffer = function(target, buf) {
  var gl = this.getGL();
  var arr = buf.getArray();
  var bufferKey = goog.getUid(buf);
  if (bufferKey in this.bufferCache_) {
    var bufferCacheEntry = this.bufferCache_[bufferKey];
    gl.bindBuffer(target, bufferCacheEntry.buffer);
    bufferCacheEntry.dirtySet.forEachRange(function(start, stop) {
      // FIXME check if slice is really efficient here
      var slice = arr.slice(start, stop);
      gl.bufferSubData(
          target,
          start,
          target == goog.webgl.ARRAY_BUFFER ?
          new Float32Array(slice) :
          new Uint16Array(slice));
    });
    bufferCacheEntry.dirtySet.clear();
  } else {
    var buffer = gl.createBuffer();
    gl.bindBuffer(target, buffer);
    gl.bufferData(
        target,
        target == goog.webgl.ARRAY_BUFFER ?
        new Float32Array(arr) : new Uint16Array(arr),
        buf.getUsage());
    var dirtySet = new ol.structs.IntegerSet();
    buf.addDirtySet(dirtySet);
    this.bufferCache_[bufferKey] = {
      buf: buf,
      buffer: buffer,
      dirtySet: dirtySet
    };
  }
};


/**
 * @param {ol.Tile} tile Tile.
 * @param {number} magFilter Mag filter.
 * @param {number} minFilter Min filter.
 */
ol.renderer.webgl.Map.prototype.bindTileTexture =
    function(tile, magFilter, minFilter) {

  this.textureCache_.
      bindTexture(tile, magFilter, minFilter, goog.webgl.CLAMP_TO_EDGE);
};


/**
 * @inheritDoc
 */
ol.renderer.webgl.Map.prototype.createLayerRenderer = function(layer) {
  if (layer instanceof ol.layer.Tile) {
    return new ol.renderer.webgl.TileLayer(this, layer);
  } else if (layer instanceof ol.layer.Image) {
    return new ol.renderer.webgl.ImageLayer(this, layer);
  } else if (layer instanceof ol.layer.Vector2) {
    return new ol.renderer.webgl.VectorLayer2(this, layer);
  } else {
    goog.asserts.fail();
    return null;
  }
};


/**
 * @param {ol.structs.Buffer} buf Buffer.
 */
ol.renderer.webgl.Map.prototype.deleteBuffer = function(buf) {
  var gl = this.getGL();
  var bufferKey = goog.getUid(buf);
  goog.asserts.assert(bufferKey in this.bufferCache_);
  var bufferCacheEntry = this.bufferCache_[bufferKey];
  bufferCacheEntry.buf.removeDirtySet(bufferCacheEntry.dirtySet);
  if (!gl.isContextLost()) {
    gl.deleteBuffer(bufferCacheEntry.buffer);
  }
  delete this.bufferCache_[bufferKey];
};


/**
 * @inheritDoc
 */
ol.renderer.webgl.Map.prototype.disposeInternal = function() {
  var gl = this.getGL();
  goog.object.forEach(this.bufferCache_, function(bufferCacheEntry) {
    bufferCacheEntry.buf.removeDirtySet(bufferCacheEntry.dirtySet);
  });
  if (!gl.isContextLost()) {
    goog.object.forEach(this.bufferCache_, function(bufferCacheEntry) {
      gl.deleteBuffer(bufferCacheEntry.buffer);
    });
  }
  goog.base(this, 'disposeInternal');
};


/**
 * @inheritDoc
 */
ol.renderer.webgl.Map.prototype.getCanvas = function() {
  return this.canvas_;
};


/**
 * @return {WebGLRenderingContext} GL.
 */
ol.renderer.webgl.Map.prototype.getGL = function() {
  return this.gl_;
};


/**
 * @param {function(new:ol.webgl.shader.Vertex, WebGLRenderingContext)}
 *    vertexShaderCtor Vertex shader class represented by its constructor.
 * @param {function(new:ol.webgl.shader.Fragment, WebGLRenderingContext)}
 *    fragmentShaderCtor Fragment shader class represented by its constructor.
 * @return {WebGLProgram}
 */
ol.renderer.webgl.Map.prototype.getProgram =
    function(vertexShaderCtor, fragmentShaderCtor) {

  return this.shaderCache_.getProgram(vertexShaderCtor, fragmentShaderCtor);
};


/**
 * @return {ol.structs.PriorityQueue} Tile texture queue.
 */
ol.renderer.webgl.Map.prototype.getTileTextureQueue = function() {
  return this.tileTextureQueue_;
};


/**
 * @param {goog.events.Event} event Event.
 * @protected
 */
ol.renderer.webgl.Map.prototype.handleWebGLContextLost = function(event) {
  event.preventDefault();
  this.colorLocations_ = null;
  this.defaultLocations_ = null;
  this.bufferCache_ = {};
  this.shaderCache_.clear();
  this.textureCache_.clear();
  goog.object.forEach(this.getLayerRenderers(), function(layerRenderer) {
    layerRenderer.handleWebGLContextLost();
  });
};


/**
 * @protected
 */
ol.renderer.webgl.Map.prototype.handleWebGLContextRestored = function() {
  this.initializeGL_();
  this.getMap().render();
};


/**
 * @private
 */
ol.renderer.webgl.Map.prototype.initializeGL_ = function() {
  var gl = this.gl_;
  gl.activeTexture(goog.webgl.TEXTURE0);
  gl.blendFuncSeparate(
      goog.webgl.SRC_ALPHA, goog.webgl.ONE_MINUS_SRC_ALPHA,
      goog.webgl.ONE, goog.webgl.ONE_MINUS_SRC_ALPHA);
  gl.disable(goog.webgl.CULL_FACE);
  gl.disable(goog.webgl.DEPTH_TEST);
  gl.disable(goog.webgl.SCISSOR_TEST);
};


/**
 * @param {ol.Tile} tile Tile.
 * @return {boolean} Is tile texture loaded.
 */
ol.renderer.webgl.Map.prototype.isTileTextureLoaded = function(tile) {
  return this.textureCache_.imageAvailable(tile);
};


/**
 * @private
 * @type {goog.log.Logger}
 */
ol.renderer.webgl.Map.prototype.logger_ =
    goog.log.getLogger('ol.renderer.webgl.Map');


/**
 * @inheritDoc
 */
ol.renderer.webgl.Map.prototype.renderFrame = function(frameState) {

  var gl = this.getGL();

  if (gl.isContextLost()) {
    return false;
  }

  if (goog.isNull(frameState)) {
    if (this.renderedVisible_) {
      goog.style.setElementShown(this.canvas_, false);
      this.renderedVisible_ = false;
    }
    return false;
  }

  this.focus_ = frameState.focus;

  this.textureCache_.protectFromHere();

  var layersArray = frameState.layersArray;
  var i, ii, layer, layerRenderer, layerState;
  for (i = 0, ii = layersArray.length; i < ii; ++i) {
    layer = layersArray[i];
    layerRenderer = this.getLayerRenderer(layer);
    layerState = frameState.layerStates[goog.getUid(layer)];
    if (layerState.visible && layerState.ready) {
      layerRenderer.renderFrame(frameState, layerState);
    }
  }

  var size = frameState.size;
  if (!ol.size.equals(this.canvasSize_, size)) {
    this.canvas_.width = size[0];
    this.canvas_.height = size[1];
    this.canvasSize_ = size;
  }

  gl.bindFramebuffer(goog.webgl.FRAMEBUFFER, null);

  gl.clearColor(0, 0, 0, 0);
  gl.clear(goog.webgl.COLOR_BUFFER_BIT);
  gl.enable(goog.webgl.BLEND);
  gl.viewport(0, 0, size[0], size[1]);

  this.bindBuffer(goog.webgl.ARRAY_BUFFER, this.arrayBuffer_);

  var locations;
  for (i = 0, ii = layersArray.length; i < ii; ++i) {

    layer = layersArray[i];
    layerState = frameState.layerStates[goog.getUid(layer)];
    if (!layerState.visible || !layerState.ready) {
      continue;
    }
    var useColor =
        layerState.brightness ||
        layerState.contrast != 1 ||
        layerState.hue ||
        layerState.saturation != 1;

    var fragmentShader, vertexShader;
    if (useColor) {
      fragmentShader = ol.renderer.webgl.map.shader.ColorFragment;
      vertexShader = ol.renderer.webgl.map.shader.ColorVertex;
    } else {
      fragmentShader =
          ol.renderer.webgl.map.shader.DefaultFragment;
      vertexShader = ol.renderer.webgl.map.shader.DefaultVertex;
    }

    var program = this.getProgram(vertexShader, fragmentShader);
    gl.useProgram(program);

    if (useColor) {
      if (goog.isNull(this.colorLocations_)) {
        locations =
            new ol.renderer.webgl.map.shader.Color.Locations(gl, program);
        this.colorLocations_ = locations;
      } else {
        locations = this.colorLocations_;
      }
    } else {
      if (goog.isNull(this.defaultLocations_)) {
        locations =
            new ol.renderer.webgl.map.shader.Default.Locations(gl, program);
        this.defaultLocations_ = locations;
      } else {
        locations = this.defaultLocations_;
      }
    }

    gl.enableVertexAttribArray(locations.a_position);
    gl.vertexAttribPointer(
        locations.a_position, 2, goog.webgl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(locations.a_texCoord);
    gl.vertexAttribPointer(
        locations.a_texCoord, 2, goog.webgl.FLOAT, false, 16, 8);
    gl.uniform1i(locations.u_texture, 0);

    layerRenderer = this.getLayerRenderer(layer);
    gl.uniformMatrix4fv(
        locations.u_texCoordMatrix, false, layerRenderer.getTexCoordMatrix());
    gl.uniformMatrix4fv(locations.u_projectionMatrix, false,
        layerRenderer.getProjectionMatrix());
    if (useColor) {
      gl.uniformMatrix4fv(locations.u_colorMatrix, false,
          layerRenderer.getColorMatrix(
              layerState.brightness,
              layerState.contrast,
              layerState.hue,
              layerState.saturation
          ));
    }
    gl.uniform1f(locations.u_opacity, layerState.opacity);
    gl.bindTexture(goog.webgl.TEXTURE_2D, layerRenderer.getTexture());
    gl.drawArrays(goog.webgl.TRIANGLE_STRIP, 0, 4);

  }
  if (goog.isDefAndNotNull(locations)) {
    gl.disableVertexAttribArray(locations.a_position);
    gl.disableVertexAttribArray(locations.a_texCoord);
  }

  if (!this.renderedVisible_) {
    goog.style.setElementShown(this.canvas_, true);
    this.renderedVisible_ = true;
  }

  this.calculateMatrices2D(frameState);

  if (!this.tileTextureQueue_.isEmpty()) {
    frameState.postRenderFunctions.push(this.loadNextTileTexture_);
    frameState.animate = true;
  }

  this.scheduleRemoveUnusedLayerRenderers(frameState);

};
