
goog.provide('ol.webglnew.WideLines');

goog.require('goog.webgl');
goog.require('ol.webglnew.BatchBuilder');


// Edge: 2-bit value
// T-coord for stipples, 



ol.webglnew.WideLines = function() {

    this.style = {

        width: 10.0, 
        color: 0x2222ff, 
        outlineWidth: 1.0,
        outlineCOlor: 0xffee11,
    };

};

goog.inherits(ol.webglnew.WideLines, ol.webglnew.BatchBuilder);

ol.webglnew.WideLines.prototype = { 

    line: function(coords) { 
    },

    ring: function(coords) {

    }
};


ol.webglnew.WideLines.metaInfo = function(gl) {

    var ext = this.gl.OES_standard_derivatives = gl.getExtension('OES_standard_derivatives');
    if (ext) {
        gl.hint(ext.FRAGMENT_SHADER_DERIVATIVE_HINT_OES, goog.webgl.FASTEST);
    }

    var result = {
        name: 'WideLines',

        vertexAttribs: [ 
            { name: 'Position', size: 4 } 
        ],
        styleAttribs: [ 
            { name: 'Style', size: ext ? 3 : 4 }
        ],

        vertexShaderSource: $('#wide-lines-vs').text(),
        fragmentShaderSource: $('#wide-lines-fs').text()
    };

};




ol.webglnew.WideLines.prototype = {





};

