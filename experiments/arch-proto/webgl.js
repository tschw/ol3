
goog.provide('ol.webglnew.WebGL');

goog.require('goog.webgl');


/** 
 * WebGL context and resource acquisition. 
 *
 * This class is not meant as a full encapsulation of the API
 * but rather a factorization of otherwise lengthy call sequences.
 *
 * The constructor initializes a rendering context for a given 
 * HTML5 canvas object.
 *
 * You should check the 'context' attribute of the result to 
 * determine whether the operation was successful; when 'null',
 * point the user to http://get.webgl.org/troubleshooting or
 * http://get.webgl.org (use the latter when the browser has
 * no webgl support at all, see webgl.available).
 *
 * @constructor
 * @param {Object} canvas Canvas DOM element.
 */
ol.webglnew.WebGL = function(canvas, opt_contextAttrs) {
    try {
        this.context = canvas.getContext("webgl", opt_contextAttrs) || 
                canvas.getContext("experimental-webgl", opt_contextAttrs);
    } catch(e) {
        this.error(e);
    }
};

/**
 * Determine whether WebGL is available.
 * @static
 * @return {boolean} 
 */
ol.webglnew.WebGL.available =  function()  {
    return goog.isDef(window.WebGLRenderingContext);
};

ol.webglnew.WebGL.prototype = { 

    /**
     * WebGL rendering context.
     * @public
     * @type {Object}
     */
    context: null,

    /**
     * Combine vertex and fragment shader to a graphics pipeline program
     * and return the corresponding WebGL object.
     * Returns 'null' on error and writes diagnostic messages to the log.
     * If the arguments are strings, 'compileShader' is called. If either
     * of the arguments is 'null' after this step fails silently (errors
     * will have been logged during compilation).
     * Requests the shaders to be deleted in any case (deletion will be
     * deferred until the end of the program's lifetime upon successful
     * link).
     *
     * @param {String or Object} vert GL shader object or source code for
     *          the vertex shader.
     * @param {String or Object} vert GL shader object or source code for
     *          for fragment shader.
     * @param {Array} opt_attributeNames Array of strings. The order of 
     *      the array reflects the sought order of vertex attribute
     *      locations.
     *      Use an element of the kind '{name: "Attribute", size: 4}'
     *      to e,g, denote a wide attribute of type 'mat4'.
     * @return {Object} GL program object or 'null' on error.
     */
    linkProgram: function(vert, frag, opt_attributeNames)
    {
        var gl = this.context;

        if (goog.isString(vert))
            vert = this.compileShader(vert, goog.webgl.VERTEX_SHADER);

        if (goog.isString(frag))
            frag = this.compileShader(frag, goog.webgl.FRAGMENT_SHADER);

        if (vert != null && frag != null) {

            var result = gl.createProgram();
            gl.attachShader(result, vert);
            gl.attachShader(result, frag);

            if (opt_attributeNames) {
                var attrIndex = 0;
                for (var i = 0, n = opt_attributeNames.length; i < n; ++i) {
                    var name = opt_attributeNames[i], size = 1;

                    if (! goog.isString(name)) { 
                        size = name.size || 1;
                        name = name.name;
                    }

                    gl.bindAttribLocation(result, attrIndex, name);
                    attrIndex += size;
                }
            }

            gl.linkProgram(result);

            // error handling
            if (! gl.getProgramParameter(result, goog.webgl.LINK_STATUS)) {
                this.error(gl.getProgramInfoLog(result));
                gl.deleteProgram(result);
                result = null;
            }
        }

        if (vert != null) gl.deleteShader(vert);
        if (frag != null) gl.deleteShader(frag);

        return result;
    },

    /**
     * Fetch all active attributes of the given program from the GL.
     *
     * @param {Object} program GL program object.
     * @return {Object} Slot info objects (see 'slotInfo method') by name.
     */
    programAttributes: function(program) {
        var result = {}, n, gl = this.context;
        n = gl.getProgramParameter(program, goog.webgl.ACTIVE_ATTRIBUTES);
        for (var i = 0; i < n; ++i)  {
            var activeInfo = gl.getActiveAttrib(program, i);
            var name = activeInfo.name;
            if (! goog.isDef(result[name])) {
                result[name] = this.slotInfo(i, activeInfo);
            }
        }
        return result;
    },

    /**
     * Fetch all active uniforms of the given program from the GL.
     *
     * @param {Object} program GL program object.
     * @return {Object} Slot info objects (see 'slotInfo method') by name.
     */
    programUniforms: function(program) {
        var result = {}, n, gl = this.context;
        n = gl.getProgramParameter(program, goog.webgl.ACTIVE_UNIFORMS);
        for (var i = 0; i < n; ++i)  {
            var activeInfo = gl.getActiveUniform(program, i);
            var name = activeInfo.name;
            if (! goog.isDef(result[name])) {
                result[name] = this.slotInfo(i, activeInfo);
            }
        }
        return result;
    },

    /**
     * Compile a shader from source code and return the corresponding
     * WebGL object.
     *
     * @return {Object} GL shader object - 'null' on error.
     */
    compileShader: function(sourceCode, type)
    {
        var gl = this.context;
        var result = gl.createShader(type);
        gl.shaderSource(result, sourceCode);
        gl.compileShader(result);

        if (! gl.getShaderParameter(result, goog.webgl.COMPILE_STATUS))
        {
            this.error(gl.getShaderInfoLog(result));
            gl.deleteShader(result);
            result = null;
        }

        return result;
    },

    /**
     * Create a buffer on the GPU of given contents or size.
     *
     * @param {any} data Argument passed to GL function 'bufferData'.
     * @param {Number} target GL buffer target - defaults to 'ARRAY_BUFFER'.
     * @param {Number} usage GL usage - defaults to 'STATIC_DRAW'.
     * @return {Object} GL buffer object.
     */
    buffer: function(data, target /* = ARRAY_BUFFER */, usage /* = STATIC_DRAW */) {

        target = goog.isDef(target) ? target : goog.webgl.ARRAY_BUFFER;
        usage = goog.isDef(usage) ? usage : goog.webgl.STATIC_DRAW;

        var gl = this.context;
        var result = gl.createBuffer();
        gl.bindBuffer(target, result);
        gl.bufferData(target, data, usage);
        return result;
    },

    /**
     * Create an object representing a vertex buffer format using a strided
     * layout.
     *
     * @param {Array} attributeNames Array of strings. The order of the array
     *      reflects the sought order of vertex attributes within the buffer.
     *      Use an element of the kind '{name: "Attribute", normalized: true}'
     *      to denote that an attribute should be normalized.
     * @param {Array} attribsOrProgram Array of 'WebGLActiveInfo' objects as
     *      returned by 'attributesInfo' or GL program object in which case 
     *      the information is derived from it.
     * @return {Array} Array of argument arrays for 'vertexAttribPointer'. 
     */
    vertexFormat: function(attributeNames, attribsOrProgram) {

        var result = [];
        // assume program when second arg is no array and get vertex attributes
        var attribs = (! goog.isArray(attribsOrProgram) 
                ? this.programAttributes(attribsOrProgram)
                : attribsOrProgram);

        // calculate stride
        for (var i = 0, n = attributeNames.length; i < n; ++i) {

            var attrName = attributeNames[i];
            if (! goog.isString(attrName)) {
                attrName = attrName.name;
            }
            recordSize += attribs[attrName].nBytes;
        }

        // create the layout (array of 'vertexAttribPointer' arguments)
        var offset = 0;
        for (var i = 0, n = attributeNames.length; i < n; ++i) {
            var attrName = attributeNames[i], normalized = false;
            if (! goog.isString(attrName)) {
                attrName = attrName.name;
                normalized = attrName.normalized || false;
            }
            var inf = attribs[attrName];
            result.push([inf.index, inf.nElements, inf.type,
                         normalized, recordSize, offset]);
            offset += inf.nBytes;
        }
        return result;
    },

    /**
     * Enables all vertex attribute arrays contained in the given
     * vertex format representation.
     *
     * @param {Array} Vertex format as returned by 'vertexFormat'.
     */
    enableVertexAttribArrays: function(vertexFormat) {
        for (var gl = this.context, 
                 i = 0, n = vertexFormat.length; i < n; ++i) {
            gl.enableVertexAttribArray(vertexFormat[i][0]);
        }
    },

    /**
     * Disables all vertex attribute arrays contained in the given
     * vertex format representation.
     *
     * @param {Array} Vertex format as returned by 'vertexFormat'.
     */
    disableVertexAttribArrays: function(vertexFormat) {
        for (var gl = this.context, 
                 i = 0, n = vertexFormat.length; i < n; ++i) {
            gl.enableVertexAttribArray(vertexFormat[i][0]);
        }
    },


    /**
     * Prepare the currently bound vertex buffer for rendering 
     * using the given vertex format by issuing the calls to 
     * 'vertexAttribPointer'.
     *
     * @param {Array} Vertex format as returned by 'vertexFormat'.
     */
    activateVertexBuffer: function(vertexFormat) {
        for (var gl = this.context, 
                 i = 0, n = vertexFormat.length; i < n; ++i) {
            gl.vertexAttribPointer.apply(gl, vertexFormat[i]);
        }
    },


    /**
     * Returns an object that describes uniforms or vertex attribute
     * slots.
     *
     * @param {WebGlActiveInfo} GL info structure.
     * @param {Number} slotIndex Slot index.
     * @return {Object} Object containing 'name', 'index', 'type',
     *          'nElements', 'bytesPerElement', and 'nBytes'.
     */
    slotInfo: function(slotIndex, activeInfo) {

        this.elementSize(glActiveInfo.type);
        return {
            name: activeInfo.name, index: slotIndex, type: activeInfo.type,
            nElements: activeInfo.size, bytesPerElement: elementSize,
            nBytes: activeInfo.size * elementSize
        };
    },


    /**
     * Provide typed array view type for a specific GL type constant.
     *
     * @param {Number} glTypeConstant GL type constant.
     * @return {Object} Typed array view.
     */
    typedArrayView: function(glTypeConstant) {

        switch (glTypeConstant) {
        case goog.webgl.BYTE:           return Int8Array;
        case goog.webgl.UNSIGNED_BYTE:  return Uint8Array;
        case goog.webgl.SHORT:          return Int16Array;
        case goog.webgl.UNSIGNED_SHORT: return Uint16Array;
        case goog.webgl.INT:            return Int32Array;
        case goog.webgl.UNSIGNED_INT:   return Uint32Array;
        case goog.webgl.FLOAT:          return Float32Array;
        }
        return null;
    },

    /**
     * Provide size in bytes for a specific GL type constant.
     *
     * @param {Number} glTypeConstant GL type constant.
     * return {Number} Size in bytes.
     */
    elementSize: function(glTypeConstant) {
        switch (glTypeConstant) {
        case goog.webgl.BYTE:
        case goog.webgl.UNSIGNED_BYTE:  return 1;
        case goog.webgl.SHORT: 
        case goog.webgl.UNSIGNED_SHORT: return 2;
        case goog.webgl.INT:
        case goog.webgl.UNSIGNED_INT:
        case goog.webgl.FLOAT:          return 4;
        }
        return null;
    },


    /**
     * Called to issue diagnostics and invokes 'console.error' when 
     * available.
     * 
     * @param {any} x Argument passed to 'console.error' function.
     */
    error: function(var_args) {

        if (goog.isDef(console.error))
            console.error.apply(console, arguments);
        //else alert(x);
    },

    /**
     * Called to issue diagnostics and invokes 'console.warn' when 
     * available.
     * 
     * @param {any} x Argument passed to 'console.error' function.
     */
    warning: function(var_args) {

        if (goog.isDef(console.warn))
            console.warn.apply(console, arguments);
    }

};


