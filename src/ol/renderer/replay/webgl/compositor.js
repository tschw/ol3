goog.provide('ol.renderer.replay.webgl.Compositor');

goog.require('ol.array');

goog.require('ol.renderer.replay.webgl.BlendShader');
goog.require('ol.renderer.replay.webgl.PresentShader');

goog.require('ol.webgl.ShaderCache');



/**
 * @constructor
 * @param {WebGLRenderingContext} gl
 * @param {ol.webgl.ShaderCache} shaderCache
 */
ol.renderer.replay.webgl.Compositor = function(gl, shaderCache) {

  /**
   * @type {WebGLRenderingContext}
   * @private
   */
  this.gl_ = gl;

  /**
   * @type {ol.webgl.ShaderCache}
   * @private
   */
  this.shaderCache_ = shaderCache;

  /**
   * @type {Array.<WebGLFramebuffer>}
   * @private
   */
  this.framebuffers_ = [null, null];

  /**
   * @type {Array.<WebGLTexture>}
   * @private
   */
  this.textures_ = [null, null];

  /**
   * @type {WebGLProgram}
   * @private
   */
  this.programBlend_ = null;

  /**
   * @type {ol.renderer.replay.webgl.BlendShader.Locations}
   * @private
   */
  this.locationsBlend_ = null;

  /**
   * @type {WebGLProgram}
   * @private
   */
  this.programPresent_ = null;

  /**
   * @type {ol.renderer.replay.webgl.PresentShader.Locations}
   * @private
   */
  this.locationsPresent_ = null;

  /**
   * @type {WebGLBuffer}
   * @private
   */
  this.vbo_ = null;

  /**
   * @type {Float32Array}
   * @private
   */
  this.vboData_ = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

  /**
   * @type {Array.<number>}
   * @private
   */
  this.viewport_ = [0, 0, 0, 0];

  /**
   * @type {number}
   * @private
   */
  this.blendOpacity_ = 0;


  this.setViewport.apply(this,
      /** @type {Float32Array} */ (gl.getParameter(goog.webgl.VIEWPORT)));
};


/**
 * Set the viewport for the output when resizing. The default is obtained
 * from the rendering context in the constructor.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
ol.renderer.replay.webgl.Compositor.prototype.setViewport =
    function(x, y, w, h) {

  if (!! ol.array.rangeCopyCountNotSame(this.viewport_, 0, arguments, 0, 4)) {

    var gl = this.gl_;

    for (var i = 0; i < 2; ++i) {
      gl.deleteFramebuffer(this.framebuffers_[i]);
      this.framebuffers_[i] = null;
      gl.deleteTexture(this.textures_[i]);
      this.textures_[i] = null;
    }
  }
};


/**
 * Clear the canvas.
 * Should be called before the first call to 'beginPass' within a frame
 * when desired.
 *
 * @param {number=} opt_r Red component of the background color.
 * @param {number=} opt_g Green component of the background color.
 * @param {number=} opt_b Blue component of the background color.
 * @param {number=} opt_a Alpha component of the background color.
 */
ol.renderer.replay.webgl.Compositor.prototype.clear =
    function(opt_r, opt_g, opt_b, opt_a) {

  var gl = this.gl_;
  this.bindOutput_(ol.renderer.replay.webgl.Compositor.SOURCE_);
  gl.clearColor(opt_r || 0, opt_g || 0, opt_b || 0, opt_a || 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  this.blendOpacity_ = 0;
  // Depth buffer should be cleared here, if needed - also will have to
  // add a depth attachment to the destination framebuffer.
  // this.bindOutput_(ol.renderer.replay.webgl.Compositor.DESTINATION_);
  // gl.clear(gl.DEPTH_BUFFER_BIT);
};


/**
 * Prepare rendering.
 *
 * An input input texture the client can use for blending against the
 * output of the previous pass is bound to the currently active texture
 * unit and the framebuffer will render to an output texture.
 *
 * @param {number=} opt_opacity Opacity in range 0..1, defaults to 1.
 */
ol.renderer.replay.webgl.Compositor.prototype.beginPass =
    function(opt_opacity) {

  var gl = this.gl_, prg = this.programBlend_;
  gl.enable(goog.webgl.BLEND);
  gl.blendFuncSeparate(
      goog.webgl.SRC_ALPHA, goog.webgl.ONE_MINUS_SRC_ALPHA,
      goog.webgl.ONE, goog.webgl.ONE_MINUS_SRC_ALPHA);
  if (this.blendOpacity_ > 0) {
    this.bindOutput_(ol.renderer.replay.webgl.Compositor.SOURCE_);
    this.bindInput_(ol.renderer.replay.webgl.Compositor.DESTINATION_);

    if (! gl.isProgram(prg)) {
      prg = this.shaderCache_.getProgram(
          ol.renderer.replay.webgl.BlendShaderVertex,
          ol.renderer.replay.webgl.BlendShaderFragment);
      this.programBlend_ = prg;
      this.locationsBlend_ =
          new ol.renderer.replay.webgl.BlendShader.Locations(gl, prg);
    }
    gl.useProgram(prg);

    var locs = this.locationsBlend_;
    gl.uniform1i(locs.Sampler0, 0);
    gl.uniform1f(locs.Opacity, this.blendOpacity_);

    this.blit_(locs.Position);
  }
  this.blendOpacity_ = goog.isDefAndNotNull(opt_opacity) ? opt_opacity : 1;

  this.bindInput_(ol.renderer.replay.webgl.Compositor.SOURCE_);
  this.bindOutput_(ol.renderer.replay.webgl.Compositor.DESTINATION_);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(goog.webgl.COLOR_BUFFER_BIT);
};


/**
 * Finalize the last rendering pass in a frame and present the output.
 *
 * @param {number} displayGamma Assumed gamma constant of the display.
 * @param {WebGLFramebuffer=} opt_framebuffer Destination framebuffer.
 */
ol.renderer.replay.webgl.Compositor.prototype.present =
    function(displayGamma, opt_framebuffer) {

  var gl = this.gl_, prg = this.programPresent_;

  gl.viewport.apply(gl, this.viewport_);

  gl.activeTexture(goog.webgl.TEXTURE1);
  this.bindInput_(ol.renderer.replay.webgl.Compositor.DESTINATION_);
  gl.activeTexture(goog.webgl.TEXTURE0);
  this.bindInput_(ol.renderer.replay.webgl.Compositor.SOURCE_);

  gl.bindFramebuffer(goog.webgl.FRAMEBUFFER, opt_framebuffer || null);

  if (! gl.isProgram(prg)) {
    prg = this.shaderCache_.getProgram(
        ol.renderer.replay.webgl.PresentShaderVertex,
        ol.renderer.replay.webgl.PresentShaderFragment);
    this.programPresent_ = prg;
    this.locationsPresent_ =
        new ol.renderer.replay.webgl.PresentShader.Locations(gl, prg);
  }
  gl.useProgram(prg);

  var locs = this.locationsPresent_;
  gl.uniform1i(locs.Sampler0, 0);
  gl.uniform1i(locs.Sampler1, 1);
  gl.uniform2f(locs.Params, 1 / displayGamma, this.blendOpacity_);

  this.blit_(locs.Position);
};


/**
 * @param {number} index
 * @private
 */
ol.renderer.replay.webgl.Compositor.prototype.validateBuffer_ =
    function(index) {

  var gl = this.gl_;

  if (! gl.isFramebuffer(this.framebuffers_[index]) ||
      ! gl.isTexture(this.textures_[index])) {

    var texture = gl.createTexture();
    gl.bindTexture(goog.webgl.TEXTURE_2D, texture);
    gl.texImage2D(goog.webgl.TEXTURE_2D, 0, goog.webgl.RGBA,
        this.viewport_[2], this.viewport_[3], 0, goog.webgl.RGBA,
        goog.webgl.UNSIGNED_BYTE, null);

    gl.texParameteri(goog.webgl.TEXTURE_2D,
        goog.webgl.TEXTURE_MIN_FILTER, goog.webgl.NEAREST);
    gl.texParameteri(goog.webgl.TEXTURE_2D,
        goog.webgl.TEXTURE_MAG_FILTER, goog.webgl.NEAREST);
    gl.texParameteri(goog.webgl.TEXTURE_2D,
        goog.webgl.TEXTURE_WRAP_S, goog.webgl.CLAMP_TO_EDGE);
    gl.texParameteri(goog.webgl.TEXTURE_2D,
        goog.webgl.TEXTURE_WRAP_T, goog.webgl.CLAMP_TO_EDGE);

    var framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(goog.webgl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(goog.webgl.FRAMEBUFFER,
        goog.webgl.COLOR_ATTACHMENT0, goog.webgl.TEXTURE_2D, texture, 0);

    this.framebuffers_[index] = framebuffer;
    this.textures_[index] = texture;
  }
};


/**
 * @param {number} index
 * @private
 */
ol.renderer.replay.webgl.Compositor.prototype.bindInput_ = function(index) {

  this.validateBuffer_(index);
  this.gl_.bindTexture(goog.webgl.TEXTURE_2D, this.textures_[index]);
};


/**
 * @param {number} index
 * @private
 */
ol.renderer.replay.webgl.Compositor.prototype.bindOutput_ = function(index) {
  this.validateBuffer_(index);
  this.gl_.bindFramebuffer(goog.webgl.FRAMEBUFFER, this.framebuffers_[index]);
  this.gl_.viewport(0, 0, this.viewport_[2], this.viewport_[3]);
};


/**
 * @param {number} locPosition Location of position vertex attribute.
 * @private
 */
ol.renderer.replay.webgl.Compositor.prototype.blit_ = function(locPosition) {

  var gl = this.gl_, vbo = this.vbo_;

  if (! gl.isBuffer(vbo)) {
    vbo = gl.createBuffer();
    gl.bindBuffer(goog.webgl.ARRAY_BUFFER, vbo);
    gl.bufferData(
        goog.webgl.ARRAY_BUFFER, this.vboData_, goog.webgl.STATIC_DRAW);
    this.vbo_ = vbo;
  } else {
    gl.bindBuffer(goog.webgl.ARRAY_BUFFER, vbo);
  }
  gl.enableVertexAttribArray(locPosition);
  gl.vertexAttribPointer(locPosition, 2, goog.webgl.FLOAT, false, 0, 0);
  gl.drawArrays(goog.webgl.TRIANGLE_STRIP, 0, 4);
  gl.disableVertexAttribArray(locPosition);
};


/**
 * @const
 * @type {number}
 * @private
 */
ol.renderer.replay.webgl.Compositor.SOURCE_ = 0;


/**
 * @const
 * @type {number}
 * @private
 */
ol.renderer.replay.webgl.Compositor.DESTINATION_ = 1;
