
goog.provide('ol.webglnew.Renderer');

goog.require('ol.webglnew.WebGL');
goog.require('ol.webglnew.PipelineProgram');

goog.require('goog.webgl');


ol.webglnew.Renderer = function(canvass, batchingStrategyCtor) {

    var webgl = new WebGL(canvas, this._WEBGL_CONTEXT_ATTRIBUTES);
    this.webgl = webgl;
    if (! (this.glContext = webgl.context)) throw "unable to create context";

    this._batchTypes = {};
    this._batchingStrategyCtor = batchingStrategyCtor;
};

ol.webglnew.Renderer.prototype = {

    /**
     * @return {BatchBuilder} Batch builder specific to the program.
     */
    batchBuilder: function(name) {

        var batchType = this._batchTypes[name];
        var result = new batchType.builderCtor();
        goog.mixin(result, batchType.batchingStrategy);
        return result
    },

    /**
     * @return {GpuBatch}
     */
    upload: function(batch) {

        var gl = this.glContext, util.this.webgl;
    
        return {
            program: this._batchType[batch.typeName].program,
            vertices: util.buffer(batch.vertices),
            indices: batch.indices ? util.buffer(batch.indices) : null,
            procedure: batch.procedure 
        };
    },

    render: function(gpuBatch) {

        var gl = this.glContext, program = gpuBatch.program;
        var vboLayout = program.vertexBufferLayout;

        // switch program when required
        if (program !== this._activeProgram) {

            var prevProgram = this._activeProgram;
            if (prevProgram) {
                util.disableVertexAttribArrays(prevProgram.vertexBufferLayout);
            }

            gl.useProgram(program.glObject);
            util.enableVertexAttribArrays(vboLayout);
            this._activeProgram = program;
        }

        // activate buffers
        gl.bindBuffer(goog.webgl.ARRAY_BUFFER, gpuBatch.vertices);
        util.activateVertexBuffer(vboLayout);
        if (this.indices) {
            gl.bindBuffer(goog.webgl.ELEMENT_ARRAY_BUFFER, this.indices);
        }

        // issue calls to render batch
        for (var i = 0, n = gpuBatch.procedure.length; i < n; ++i) {
            var call = gpuBatch.procedure[i];
            gl[call.name].apply(gl, call.args);
        }

    },

    unload: function(gpuBatch) {

        var gl = this.glContext;
        gpuBatch.dataSource.unload(gl);
    },


    registerBatchType: function(batchBuilderCtor) {

        var meta = batchBuilderCtor.metaInfo(this.glContext);

        var name = batchBuilderCtor.name,
            styleAttribs = batchBuilderCtor.styleAttribs,
            vertexAttribs = batchBuilderCtor.vertexAttribs,
            vertexShader = batchBuilderCtor.vertexShaderSource,
            fragmentShader = batchBuilderCtor.fragmentShaderSource;

        var strategy = new this._batchingStrategyCtor(styleAttribs, vertexAttribs);

        var allAttribs = strategy._attrNamesAll,
            arrayAttribs = strategy._attrNamesArray;

        var programObj = util.linkProgram(vertexShader, fragmentShader, allAttribs);

        this._batchType[name] = {

            builderCtor: batchBuilderCtor,
            batchingStrategy: strategy, 
            program: {  
                glObject: programObj, 
                vertexBufferLayout: util.vertexFormat(arrayAttribs, program)
            }
        };  

    },

    _activeProgram: null,

    _WEBGL_CONTEXT_ATTRIBUTES: {
        alpha: true, 
        blend: true,
        stencil: false,
        antialias: false,
        premultilpiedAlpha: true,
        preserveDrawingBuffer: false 
    }

};




