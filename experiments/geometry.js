
goog.provide('ol.webglnew.geometry');

ol.webglnew.geometry.LF_LINE = 0;           // coordinates represent a line
ol.webglnew.geometry.LF_RING = 1;           // coordinates represent a ring
ol.webglnew.geometry.LF_OUTLINE_INNER = 4;  // outline left (ccw)      V|  |^
ol.webglnew.geometry.LF_OUTLINE_OUTER = 8;  // outline right (ccw)    |V    ^|
ol.webglnew.geometry.LF_LINE_LINE_OUTLINE_CAPS = 2; // outline top and bottom
ol.webglnew.geometry.LF_RING_CLOSED = 3;       // re-emit first vertex pair
ol.webglnew.geometry.LF_OUTLINE_PROPORTIONAL = 16; // needed w/o derivatives

ol.webglnew.geometry.lineVertices = 
        function(dst, offset, stride, ctrlOffs, coords, width, flags) {

    // half the width from the center of the line
    width *= 0.5;

    // original first position (need this wrapping around on the last)
    var firstX = coords[0], firstY = coords[1], k = offset;

    // first vertex to consider (starting with the last)
    var iLast = coords.length - 2,
        fromX, fromY ,n0X, n0Y, surfStart = 1, surfEnd = 1, surfLen = 0;
    if (! (flags & ol.webglnew.geometry.LF_RING)) {

        if ((flags & ol.webglnew.geometry.LF_OUTLINE_PROPORTIONAL)
                && (flags & ol.webglnew.geometry.LF_LINE_OUTLINE_CAPS)) {

            fromX = coords[0]; fromY = coords[1];
            dst[ k += ctrlStride ] = 0;
            var s2 = stride * 2;
            k += s2;
            for (var i = 2; i <= iLast; i+= 2, k += s2) {
                hereX = coords[i]; hereY = coords[i+1]; 

                toX = hereX - fromX; toY = hereY - fromY;
                surfLen += (dst[k] = Math.sqrt(toX * toX + toY * toY));
            }

            k = offset;
        }

        // no miters at first vertex pair
        fromX = firstX, fromY = firstY;
        firstX = coords[2], firstY = coords[3];

        surfStart = 1 - (flags &ol.webglnew.geometry.LF_LINE_OUTLINE_CAPS?1:0);
        surfEnd = 2 - surfStart;


    } else {
        fromX = coords[iLast], fromY = coords[iLast + 1];
    }
    var surfInner = 4 - (flags &ol.webglnew.geometry.LF_OUTLINE_INNER?4:0),
        surfOuter = 4 + (flags &ol.webglnew.geometry.LF_OUTLINE_OUTER?4:0);
 
    // first normal
    var n0X = firstY - fromY, n0Y = fromX - firstX;
    var f = 1 / Math.sqrt(n0X * n0X + n0Y * n0Y); // 1 / len(n0)
    n0X *= f; n0Y *= f;

    var hereX, hereY, toX, toY, n1X, n1Y, ctrl = surfStart;

    for (var i = 0; i < iLast; i += 2) {

        // fetch coordinates: from -> here -> to
        hereX = coords[i]; hereY = coords[i+1]; 
        toX = coords[i+2]; toY = coords[i+3];

        // calculate normal of here -> to
        n1X = toY - hereY, n1Y = hereX - toX;
        f = 1 / Math.sqrt(n1X * n1X + n1Y * n1Y); // 1 / len(n1)
        n1X *= f; n1Y *= f;

        // create halfway normal for the direction
        n0X += n1X; n0Y += n1Y;
        f = -1 / Math.sqrt(n0X * n0X + n0Y * n0Y); // 1 / len(n0)
        n0X *= f; n0Y *= f;

        // move position by amount and underestimation factor
        f = width / (n0X * n1X + n0Y * n1Y); // width / dot(n0,n1)
        n0X *= f; n0Y *= f;

        if (surfLen) {
            // use one real surface coordinate when requested
            ctrl = dst[k+ctrlOffs];

            if (ctrl < width) {
                ctrl /= width;
            } else if (ctrl > surfLen - width) {
                ctrl = (surfLen - ctrl) / width;
            } else {
                ctrl = 1; 
            }
        }

        dst[k+ctrlOffs] = ctrl + surfInner;
        dst[k] = hereX - n0X;
        dst[k+1] = hereY - n0Y;
        k += stride;
        dst[k+ctrlOffs] = ctrl + surfOuter;
        dst[k] = hereX + n0X;
        dst[k+1] = hereY + n0Y;
        k += stride;

        // use now-changed vertex position and one normal in next iteration
        fromX = hereX; fromY = hereY;
        n0X = n1X; n0Y = n1Y;

        ctrl = 1; // surfMid
    }

    // once again for the special, last vertex

    hereX = coords[iLast]; hereY = coords[iLast+1]; 

    if (! (flags & ol.webglnew.geometry.LF_RING)) {
        // not a ring? just terminate

        ctrl = surfEnd;
        n0X *= width; n0Y *= width;
        dst[k+ctrlOffs] = ctrl + surfInner;
        dst[k] = hereX - n0X;
        dst[k+1] = hereY - n0Y;
        k += stride;
        dst[k+ctrlOffs] = ctrl + surfOuter;
        dst[k] = hereX + n0X;
        dst[k+1] = hereY + n0Y;
        k += stride;

    } else {
        // looking ahead means wrapping around

        n1X = firstY - hereY, n1Y = hereX - firstX;
        f = 1 / Math.sqrt(n1X * n1X + n1Y * n1Y); // 1 / len(n1)
        n1X *= f; n1Y *= f;

        n0X += n1X; n0Y += n1Y;
        f = -1 / Math.sqrt(n0X * n0X + n0Y * n0Y); // 1 / len(n0)
        n0X *= f; n0Y *= f;

        f = width / (n0X * n1X + n0Y * n1Y); // width / dot(n0,n1)
        n0X *= f; n0Y *= f;

        dst[k+ctrlOffs] = ctrl + surfInner;
        dst[k] = hereX - n0X;
        dst[k+1] = hereY - n0Y;
        k += stride;
        dst[k+ctrlOffs] = ctrl + surfOuter;
        dst[k] = hereX + n0X;
        dst[k+1] = hereY + n0Y;
        k += stride;

        if ((flags & ol.webglnew.geometry.LF_RING_CLOSED) 
                > ol.webglnew.geometry.LF_RING)
        {
            // copy first vertex pair from the beginning 

            dst[k+ctrlOffs] = dst[offset+ctrlOffs];
            dst[k] = dst[offset];
            dst[k+1] = dst[offset+1];
            k += stride, offset += stride;
            dst[k+ctrlOffs] = dst[offset+ctrlOffs];
            dst[k] = dst[offset];
            dst[k+1] = dst[offset+1];

            return coords.length + 2;
        }
    }
    return coords.length;
};

// TODO: following facilities should be changed to operate on a 
// batch builder interface, once ready

ol.webglnew.geometry.polygon = function(outerContour, holes, nCoords, width) {

    var vertices = [], indices = [], vOffs;

    var ctrlOffs = 2, vStride = 3;
    var templateVertex = [0,0,5];

    vOffs = vStride * ol.webglnew.geometry.lineVertices(
            vertices, vOffs, vStride, ctrlOffs, outerContour, width, 
            ol.webglnew.geometry.LF_RING | ol.webglnew.geometry.LF_OUTLINE_OUTER);



    templateVertex[ctrlOffs] = 1; // outer edge

    for (var i = 0, n = outerContour.length; i < n; i += nCoords) {

        for (var j = 0; j < nCoords; ++j) {
            templateVertex[j] = outerContour[i + j];
        }
        vertices.append(templateVertex);
    }


    templateVertex[ctrlOffs] = 8 + 1; // inner edge



};


ol.webglnew.geometry.Tesselator = function(dstVertexBuffer, dstVertexOffset,
                                           dstIndexBuffer, dstIndexOffset,
                                           templateVertex, opt_nCoords) { 

    var tessy = this._tessy = new libtess.GluTesselator();
    
    tessy.gluTessProperty(libtess.gluEnum.GLU_TESS_WINDING_RULE,
                          libtess.windingRule.GLU_TESS_WINDING_POSITIVE);

    tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_VERTEX, 
                          goog.bind(this._vertexCallback, this));
    tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_BEGIN,
                          goog.bind(this._begincallback, this));
    tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_ERROR, 
                          goog.bind(this._errorcallback, this));
    tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_COMBINE,
                          goog.bind(this._combinecallback, this));
    tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_EDGE_FLAG, 
                          goog.bind(this._edgeCallback, this));

    this._dstVertexBuffer = dstVertexBuffer;
    this._dstVertexOffset = dstVertexOffset;
    this._dstIndexBuffer = dstInd;
    this._dstIndexOffset = indOffs;
    this._templateVertex = templateVertex;

    if ((this._nCoords = opt_nCoords || 3) == 2) {
        // 2D -> set ccw orientation (positive z-axis pointing
        // towards the viewer
        this._tessy.gluTesNormal(0, 0, 1);
    }
};

ol.webglnew.geometry.Tesselator.prototype = {

    beginPolygon: function(opt_normal) {

        this._tessy.gluTessBeginPolygon();
        if (opt_normal) {
            this._tessy.gluTesNormal(opt_normal[0], opt_normal[1], opt_normal[2]);
        }
    },

    addContour: function(src, opt_end, opt_offset, opt_stride) {

        if (! this._polyState) {
            this._tessy.gluTessBeginPolygon(this);
        }

        var tessy = this._tessy;
        tessy.gluTessBeginContour();
        var coords = [0,0,0];
        for (var i = opt_offset || 0, e = opt_end || src.length,
                 s = opt_stride || this._nCoords; i < e; i += s) {

            for (var j = 0; j < this._nCoords; ++j) {
                coords[j] = src[i + j];
            }
            tessy.gluTessVertex(coords, Math.floor(i / s));
        }
        tessy.gluTessEndContour();
    },

    endPolygon: function() {
        this._tessy.gluTessEndPolygon();
    },

    //

    _vertexCallback: function(data) {
        // data element is the index, record it
        this._dstIndexBuffer[ this._dstIndexOffset++ ] = data;
    },
    _combinecallback: function(coords, data, weight) {
        // create a new vertex for the coordinate resulting 
        // from the split and return its index

        // prepare variables, calculate index from current vertex offset
        var vStride = this._templateOffset.length, j = this._dstVertexOffset;
        var result = Math.floor(j / vStride);

        // copy coordinates
        for (var i = this._vertexOffset; i < this._nCoords; ++i) {
            this._dstVertexBuffer[j++] = coords[i];
        }
        // take the rest from the template vertex
        for (var i = this._nCoords; i < vStride; ++i) {
            this._dstVertexBuffer[j] = this._templateVertex[i];
        }
        this._vertexOffset += vStride;
        return result;
    },
    // taken from the libtess.js example code:
    _begincallback: function(type) {
        if (type !== libtess.primitiveType.GL_TRIANGLES) {
            console.log('expected TRIANGLES but got type: ' + type);
        }
    },
    _edgeCallback: function(flag) {
        // don't really care about the flag, but need no-strip/no-fan
        // behavior console.log('edge flag: ' + flag); 
    },
    _errorCallback: function(errno) {
        console.log('error callback');
        console.log('error number: ' + errno);
    }

};


