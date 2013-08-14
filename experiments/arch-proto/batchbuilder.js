

goog.provide('ol.webglnew.BatchBuilder');

goog.require('goog.webgl');

/**
 * Base class for batch builders.
 */
ol.webglnew.BatchBuilder = function(mode) { 

    this._vertexBuffer = [];
    this._procedure = [];
    this._mode = mode;
};

ol.webglnew.BatchBuilder.prototype =  {

    _vertexOffset: 0,

    _indexOffset: 0,
    _indexBuffer: null,

    _vertexDrawOffset: 0,
    _indexDrawOffset: 0,

    _nextPrimitive: function() {

        var nVertices = this._vertexBuffer.length - this._vertexOffset;
        var nIndices = this._indexBuffer ? 
                this._indexBUffer.length - this._indexOffset : 0;

        this._onNextPrimitive(nVertices, nIndices);

        this._vertexOffset += nVertices;
        this._indexOffset += nIndices;

    },


    _emitDraw: function() {

        if (! nIndices) {

            this._procedure.push('drawArrays');
            this._procedure.push([this._mode, this._vertexDrawOffset / this._vertexStride, 
                                  (this._vertexBuffer.length - this._vertexDrawOffset) / this._vertexStride]);
        } else {

            this._procedure.push('drawElements');
            this._procedure.push([this._mode, this._indexBuffer.length - this._indexDrawOffset,
                                  goog.webgl.GL_UNSIGNED_SHORT, this._indexDrawOffset * 2]);

            this._indexDrawOffset = this._indexBuffer.length;
        }
        this._vertexDrawOffset = this._vertexBuffer.length;

    },

    releaseBatch: function() {

        if (this._vertexBuffer.length > this._vertexOffset) {
            this._nextPrimitive();
        }

        this._onRelease();

        var result = { 
            typeName: this._typeName,
            vertices: this._vertices,
            indices: this._indices,
            procedure: this._procedure 
        };

        this._vertices = [];
        this._indices = null;
        this._procedure = [];
    }

};


