
goog.provide('ol.webglnew.batchingStrategy.SetAttribs');
goog.provide('ol.webglnew.batchingStrategy.AttribArrays');
goog.provide('ol.webglnew.batchingStrategy.StyleTexture');

goog.require('goog.webgl');


ol.webglnew.batchingStrategy.SetAttribs = function(vertexAttribs, styleAttribs) { 

    this._styleAttribs = styleAttribs;

    var allAttribs = goog.clone(vertexAttribs);
    allAttribs.append(styleAttribs);
    this._attrNamesAll = allAttribs;
    this._attrNamesArray = vertexAttribs;

    this._shaderPreamble = '#version 100\n';
};

ol.webglnew.batchingStrategy.SetAttribs.prototype = {

    _onNextPrimitive: function(nVertices, nIndices) {

        this._setAttribues();
        this._emitDraw();
    },

    _onRelease: function() { },

    _setAttributes: function() {

        // TODO: implement the beef
    }

};




ol.webglnew.batchingStrategy.AttribArrays = function(vertexAttribs, styleAttribs) { 

    this._styleAttrsOffs = this._nAttrElems(vertexAttribs);
    this._styleAttrsLength = this._nAttrElems(styleAttribs);


    var allAttribs = goog.clone(vertexAttribs);
    allAttribs.append(styleAttribs);
    this._attrNamesAll = allAttribs;
    this._attrNamesArray = allAttribs;

    this._shaderPreamble = '#version 100\n';
};

ol.webglnew.batchingStrategy.AttribArrays.prototype = {

    _nAttrElems: function(attrs) {
        var result =  0;
        for (var i = 0, n = attrs.length; i < n; ++i) {
            result += goog.isString(attrs) ? 1 : attrs.size;
        }
        return result;
    },

    _onNextPrimitive: function(nVertices, nIndices) {


        for (var i = this._vertexOffset + this._styleAttrsOffs,
                 e = this._vertexBuffer.length; i < e; i += this._vertexStride) {

            this._vertexBuffer.splice(i, this._styleAttrsLength, this._attributes); // TODO <-- wrong usage of 'splice'
        }

    },

    _onRelease: function() { 

        this._emitDraw();
    }

};




