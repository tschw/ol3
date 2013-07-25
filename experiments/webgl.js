
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
ol.webglnew.WebGL = function(canvas) {
    try {
        this.context = canvas.getContext("webgl") || 
                canvas.getContext("experimental-webgl");
    } catch(e) {
        this.error(e);
    }
}

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
     * @return {Object} GL program object or 'null' on error.
     */
    linkProgram: function(vert, frag)
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
     * @return {Array} An array of 'WebGLActiveInfo' structures,
     *      each containing the 'size' (number of elements), 
     *      a 'type' constant (e.g. 'gl.FLOAT'), and the 'name'.
     */
    programAttributes: function(program) {
        var result = [], n, gl = this.context;
        n = gl.getProgramParameter(program, goog.webgl.ACTIVE_ATTRIBUTES);
        for (var i = 0; i < n; ++i) 
            result.push( gl.getActiveAttrib(program, i) );
        return result;
    },

    /**
     * Fetch all active uniforms of the given program from the GL.
     *
     * @param {Object} program GL program object.
     * @return {Array} An array of 'WebGLActiveInfo' structures,
     *      each containing the 'size' (number of elements), 
     *      a 'type' constant (e.g. 'gl.FLOAT'), and the 'name'.
     */
    programUniforms: function(program) {
        var result = [], n, gl = this.context;
        n = gl.getProgramParameter(program, goog.webgl.ACTIVE_UNIFORMS);
        for (var i = 0; i < n; ++i) 
            result.push( gl.getActiveUniform(program, i) );
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
     * @param {Number} type GL type of buffer - defaults to 'ARRAY_BUFFER'.
     * @param {Number} usage GL usage specifiet - defaults to 'STATIC_DRAW'.
     * @return {Object} GL buffer object.
     */
    buffer: function(data, type /* = ARRAY_BUFFER */, usage /* = STATIC_DRAW */) {

        type = goog.isDef(type) ? type : goog.webgl.ARRAY_BUFFER;
        usage = goog.isDef(usage) ? usage : goog.webgl.STATIC_DRAW;

        var gl = this.context;
        var result = gl.createBuffer();
        gl.bindBuffer(type, result);
        gl.bufferData(type, data, usage);
        return result;
    },

    /**
     * Create an object representing a vertex buffer format using a strided
     * layout.
     *
     * @param {Array} attributeOrder Array of strings. The order of the array
     *      reflects the sought order of vertex attributes within the buffer.
     *      Use an element of the kind '{name: "Attribute", normalized: true}'
     *      to denote that an attribute should be normalized.
     * @param {Array} attribsOrProgram Array of 'WebGLActiveInfo' objects as
     *      returned by 'attributesInfo' or GL program object in which case 
     *      the information is derived from it.
     * @return {Object} Meta information used by other operations.
     */
    vertexFormat: function(attributeOrder, attribsOrProgram) {

        var layout = [], names = goog.clone(attributeOrder);
        // assume program when second arg is no array and get vertex attributes
        var attribs = (! goog.isArray(attribsOrProgram) 
                ? this.programAttributes(attribsOrProgram)
                : attribsOrProgram);

        // store shader index by name and determine total record size 
        var attrIndexByName = { }, recordSize = 0;
        for (var i = 0, n = attribs.length; i < n; ++i) {
            var glActInf = attribs[i];

            attrIndexByName[glActInf.name] = i;
            recordSize += this.attributeByteSize(glActInf);
        }
        // create the layout (array of 'vertexAttribPointer' argument arrays)
        var offset = 0;
        for (var i = 0, n = names.length; i < n; ++i) {
            var attrName = names[i], normalized = false;
            if (! goog.isString(attrName)) {
                normalized = attrName.normalized;
                attrName = names[i] = attrName.name;
            }
            var attrIndex = attrIndexByName[attrName];
            delete attrIndexByName[attrName];
            var glActInf = attribs[attrIndex];
            layout.push([attrIndex, glActInf.size, glActInf.type, 
                         normalized, recordSize, offset ]);
            offset += this.attributeByteSize(glActInfo);
        }
        // unused attributes?
        if (! goog.object.isEmpty(attrIndexByName)) {

            this.warning('Unused vertex attributes in vertex format', 
                         attrIndexByName);

            // stride was overestimated, subtract space for leftover attributes
            for (var k in attrIndexByName) {
                var glActInf = attribs[ attrIndexByName[k] ];
                recordSize -= this.attributeByteSize(glActInfo);
            }
            // correct stride in result array
            for (var i = 0, n = layout.length; i < n; ++i)
                layout[i][4] = recordSize;
        }
        return {
            attributeNames: names,
            bytesPerRecord: recordSize,
            bufferLayout: layout 
        };
    },

    /**
     * Create a host-side buffer and corresponding views according to a 
     * given vertex format.
     * 
     * @param {Object} vertexFormat Object as returned by 'vertexFormat'.
     * @param {Number} vertexCount Number of vertices to allocate.
     * @return {Object} Object holding an 'ArrayBuffer' of 'rawBytes' and
     *      another two further members per attribute suffixed with 'View'
     *      and 'Stride' that provide means to access the buffer.
     */
    hostVertexBuffer: function(vertexFormat, vertexCount) {

        var result = { };
        var recordSize = vertexFormat.bytesPerRecord;
        result.rawBytes = new ArrayBuffer(vertexCount * recordSize);
        for (var i = 0, n = vertexFormat.names; i < n; ++i) {

            var name = vertexFormat.names[i],
                vertexAttribPointer = vetexFormat.layout[i];

            var nElems = vertexAttribPointer[1],
                glType = vertexAttribPointer[2],
                offset = vertexAttribPointer[5];

            var typeInfo = this.GL_TYPE_INFO[glType];

            var elemSize = typeInfo.size;
            if (recordSize % elemSize != 0) 
                throw name + 'Stride breaks WebGL layout constraints.';

            result[name + 'View'] = typeInfo.view.call(
                    null, result.rawBytes, offset, vertexCount);

            result[name + 'Stride'] = recordSize / elemSize;
        }
        return result;
    },

    /**
     * Prepare rendering using the given vertex format.
     *
     * @param {Object} vertexFormat Vertex format to use.
     */
    activateVertexFormat: function(vertexFormat) {

        var gl = this.context, layout = vertexFormat.layout;
        for (var i = 0, n = layout.length; i < n; ++i) {

            var vertexAttribPointerArgs = layout[i];

            gl.enableVertexAttribIndex(vertexAttribPointerArgs[0]);
            gl.vertexAttribArray.apply(gl, vertexAttribPointerArgs);
        }
    },

    /**
     * Disables all vertex attribute arrays used by the given
     * vertex format.
     *
     * @param {Object} vertexFormat Vertex format to use.
     */
    deactivateVertexFormat: function(vertexFormat) {

        var gl = this.context, layout = vertexFormat.layout;
        for (var i = 0, n = layout.length; i < n; ++i) {
            gl.disableVertexAttribArray(layout[i][0]);
        }
    },


    /**
     * Determine the required size in bytes from a 'WebGLActiveInfo' object.
     *
     * @param {Object} glActiveInfo Meta information for attributes and 
     *      uniforms.
     * @return {Number} Number of bytes.
     */
    attributeByteSize: function(glActiveInfo) {
        return glActiveInfo.size * this.GL_TYPE_INFO[glActiveInfo.type].size;
    },

    /**
     * Size / JS-view types by GL type constant.
     * @const
     * @public
     */
    GL_TYPE_INFO: { },


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

ol.webglnew.WebGL.prototype.GL_TYPE_INFO[goog.webgl.BYTE]             = { size: 1, view: Int8Array };
ol.webglnew.WebGL.prototype.GL_TYPE_INFO[goog.webgl.UNSIGNED_BYTE]    = { size: 1, view: Uint8Array };
ol.webglnew.WebGL.prototype.GL_TYPE_INFO[goog.webgl.SHORT]            = { size: 2, view: Int16Array };
ol.webglnew.WebGL.prototype.GL_TYPE_INFO[goog.webgl.UNSIGNED_SHORT]   = { size: 2, view: Uint16Array };
ol.webglnew.WebGL.prototype.GL_TYPE_INFO[goog.webgl.INT]              = { size: 4, view: Int32Array  };
ol.webglnew.WebGL.prototype.GL_TYPE_INFO[goog.webgl.UNSIGNED_INT]     = { size: 4, view: Uint32Array };
ol.webglnew.WebGL.prototype.GL_TYPE_INFO[goog.webgl.FLOAT]            = { size: 4, view: Float32Array };

