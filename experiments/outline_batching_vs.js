
goog.webgl = null;

function Application() { 

    // WebGL initialization
    if (ol.webglnew.WebGL.available()) {

        var gl = new ol.webglnew.WebGL($('#webgl-canvas')[0], { 
            alpha: true, blend: true, stencil: false, antialias: false,
            premultilpiedAlpha: true, preserveDrawingBuffer: false });
        if (gl != null) this.gl = gl;
        else $('#app-panel,#webgl-init-failed').toggleClass('invisible');
    }
    else $('#app-panel,#webgl-unavailable').toggleClass('invisible');
    if (! this.gl) throw 'WebGL initialization failed';

    // Configure rendering
    var gl = this.gl.context;
    goog.webgl = gl; // TODO: unhack

    //alert(gl.getSupportedExtensions());

    var ext = this.gl.OES_standard_derivatives = gl.getExtension('OES_standard_derivatives');
    if (ext) {
        gl.hint(ext.FRAGMENT_SHADER_DERIVATIVE_HINT_OES, goog.webgl.FASTEST);
    }

    //gl.enable(gl.DEPTH_TEST);
    //gl.depthFunc(gl.LEQUAL);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    this._setupUserInterface();
    this._setupBackground();
    this._setupPolys();

    // Configure timing
    this._timeSlicer = new ol.webglnew.TimeSlicer(this.FPS_SECS_TO_AVERAGE);


    // Setup events
    $('#webgl-canvas')
            .resize(this._onResize.bind(this))
            .mousedown(this._onMouseDown.bind(this))
            .mouseup(this._onMouseUp.bind(this))
            .mousemove(this._onMouseMove.bind(this))
            .bind('mousewheel wheel', this._onMouseWheel.bind(this));
    // Setup time trigger
    this._timer = new ol.webglnew.Timer(this._frame.bind(this),
                                        this.MIN_FRAME_DELAY_MS);
    // Call 'frame' from now on
    this._timer.start();
}

Application.prototype = {

    MIN_FRAME_DELAY_MS: 12,
    FPS_SECS_TO_AVERAGE: 5,

    MOVE_GRIP_SECS: 2/32, 
    MOVE_FRICT_SECS: 2,

    _veloX: 0, _veloY: 0,

    _frame: function() {
        var gl = this.gl.context;

        // Frame starts now.
        this._timeSlicer.update();
        $('title').text(this._timeSlicer.averageFrameRate.toFixed(2) + ' FPS');

        // Clear framebuffer
//        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

        // Determine velocity
        var avgT = this._mouseButton == 1 ? this.MOVE_GRIP_SECS : this.MOVE_FRICT_SECS;
        this._veloX = this._timeSlicer.smoothTimeDerivative(this._veloX, this._mouseMoveX, avgT);
        this._veloY = this._timeSlicer.smoothTimeDerivative(this._veloY, this._mouseMoveY, avgT);

        // Move background
        var dt = this._timeSlicer.dt;
        this._posX += this._veloX * dt;
        this._posY += this._veloY * dt;

        // "Consume" mouse movement
        this._mouseMoveX = 0;
        this._mouseMoveY = 0;

        this._renderBackground();
        this._renderPolys();

        gl.flush();
    },


    // Main renderer


    _setupPolys: function() {

        var gl = this.gl.context;

        // Setup shaders
        //
        // We create a header that enables standard derivatives extension
        // when available and tells us whether to premultiply the color by
        // the alpha component.

        this._programs = [ ];
        var vertShaderSource = $('#webgl-poly-vert').text();
        var fragShaderSource = $('#webgl-poly-frag').text();

        var fragShaderSourceBuilder = [ '#version 100' ];
        if (gl.getContextAttributes().premultipliedAlpha) {
            fragShaderSourceBuilder.push('#define PREMULTIPLY_BY_ALPHA 1');
        }
        fragShaderSourceBuilder.push(fragShaderSource);
        this._programs.push(this._polyShaderDesc(
                this.gl.linkProgram(vertShaderSource,
                                    fragShaderSourceBuilder.join('\n')) ));
        if (this.gl.OES_standard_derivatives) {
            fragShaderSourceBuilder.splice(fragShaderSourceBuilder.length - 1, 1);
            fragShaderSourceBuilder.push('#extension GL_OES_standard_derivatives : enable');
            fragShaderSourceBuilder.push('#define STANDARD_DERIVATIVES 1');
            $('<option value="1">using derivatives extension</option>').appendTo('#program');
            fragShaderSourceBuilder.push(fragShaderSource);
            this._programs.push(this._polyShaderDesc(
                    this.gl.linkProgram(vertShaderSource,
                                        fragShaderSourceBuilder.join('\n')) ));
        }

        // Setup buffers

        this._models = [ ];

        this._models.push({ 
            vbuf: this.gl.buffer(new Float32Array(this._expandLine(this._LINE_COORDS1))),
            ibuf: null,
            tess: goog.webgl.TRIANGLE_STRIP,
            n: this._LINE_COORDS1.length + 4 });

        this._models.push({
            vbuf: this.gl.buffer(new Float32Array(this._expandLine(this._LINE_COORDS1, true))),
            ibuf: null,
            tess: goog.webgl.TRIANGLE_STRIP,
            n: this._LINE_COORDS1.length + 2 });

        var nFirst = this._LINE_COORDS1.length * 3; 
        var vertices = this._expandLine(this._LINE_COORDS1);
        this._expandLine(this._LINE_COORDS2, true, vertices);
        this._models.push({
            vbuf: this.gl.buffer(new Float32Array(vertices)),
            ibuf: null,
            tess: goog.webgl.TRIANGLE_STRIP,
            n: vertices.length / 3 - 4
        });

        var data = this._tomsTestData(1/20);
        vertices = [];
        for(var i = 0; i < data.length; ++i) {
            var lineString = data[i], flatCoords = [];
            for (var j = 0; j < lineString.length; ++j) {
                var coords = lineString[j];
                flatCoords.push(coords[0]);
                flatCoords.push(coords[1]);
            }
            this._expandLine(flatCoords, false, vertices);
        }
        this._models.push({
            vbuf: this.gl.buffer(new Float32Array(vertices)),
            ibuf: null,
            tess: goog.webgl.TRIANGLE_STRIP,
            n: vertices.length / 3 - 4
        });
    },


    _LINE_COORDS1: [ 
        0, -0.5,   0, 0,   0.25, 0.25,   0.25, 0.5,   0, 0.7,   0, 0.5,   -0.25, 0.4
    ],

    _LINE_COORDS2: [
        -0.75,-0.5,   -0.5,-0.5,   -0.625,0.0
    ],

    _tomsTestData: function(k) {
        return ([
          [[-20 * k, -20 * k], [20 * k, 20 * k]],
          [[-20 * k, 20 * k], [20 * k, -20 * k]],
          [[0 * k, 15 * k],
           [10 * k, 5 * k],
           [5 * k, 5 * k],
           [5 * k, -15 * k],
           [-5 * k, -15 * k],
           [-5 * k, 5 * k],
           [-10 * k, 5 * k],
           [0 * k, 15 * k]]
        ]);
    },


    _polyShaderDesc: function(prog) {
        var result = { glObject: prog };
        var gl = this.gl.context;

        // Query vertex attributes
        result.attrPositionP = gl.getAttribLocation(prog, 'PositionP');
        result.attrPosition0 = gl.getAttribLocation(prog, 'Position0');
        result.attrPositionN = gl.getAttribLocation(prog, 'PositionN');
        result.attrControl = gl.getAttribLocation(prog, 'Control');
        result.attrStyle = gl.getAttribLocation(prog, 'Style');

        // Query uniforms

        result.uniTransform = gl.getUniformLocation(prog, 'Transform');
        result.uniFillColor = gl.getUniformLocation(prog, 'FillColor');
        result.uniStrokeColor = gl.getUniformLocation(prog, 'StrokeColor');
        result.uniRenderParams = gl.getUniformLocation(prog, 'RenderParams');
        result.uniPixelScale = gl.getUniformLocation(prog, 'PixelScale');
        return result;
    },

    _renderPolys: function() {

        // UI interaction
        var angle = $('#rotation-angle').slider('value');
        var angleAnim = $('#rotation-speed').slider('value');
        if (angleAnim > 0) {
            // (modulated add to angle when rotating)
            angle = (angle + angleAnim * this._timeSlicer.dt) % (Math.PI * 2);
            $('#rotation-angle').slider('value', angle);
        }
        var scaleX = $('#scale-x').slider('value'),
            scaleY = $('#scale-y').slider('value'),
            lineWidth = $('#line-width').slider('value'),
            outlineWidth = $('#outline-width').slider('value'),
            antiAliasing = $('#anti-aliasing').slider('value'),
            gamma = $('#gamma').slider('value');
        var modelIndex = $('#model').val(),
            programIndex = $('#program').val();
        var canvas = $('#webgl-canvas');
        var pixelScaleX = 2 / canvas.width(), pixelScaleY = 2 / canvas.height();


        var gl = this.gl.context;
        var program = this._programs[programIndex];

        // Enable blending.
        gl.enable(goog.webgl.BLEND);
        gl.blendFunc(goog.webgl.SRC_ALPHA, goog.webgl.ONE_MINUS_SRC_ALPHA);


        gl.useProgram(program.glObject); 

        // Setup transformation matrix.
        var cosA = Math.cos(angle), sinA = Math.sin(angle);
        gl.uniformMatrix4fv(program.uniTransform, false, [ 
                cosA * scaleX, sinA * scaleX, 0, 0, 
               -sinA * scaleY, cosA * scaleY, 0, 0,
                            0,             0, 1, 0,
                            0,             0, 0, 1
        ]);

        // Set uniforms.
        gl.uniform4f(program.uniFillColor, 0.0, 0.0, 1.0, 1.0); // TODO move to style
        gl.uniform4f(program.uniStrokeColor, 1.0, 0.8, 0.1, 1.0); // TODO move to style
        gl.uniform3f(program.uniRenderParams, antiAliasing, gamma, 1/gamma);
        gl.uniform2f(program.uniPixelScale, pixelScaleX, pixelScaleY);
        // Set style
        gl.vertexAttrib2f(program.attrStyle, lineWidth, outlineWidth);

        // Setup buffers and render
        var model = this._models[modelIndex];
        gl.bindBuffer(goog.webgl.ARRAY_BUFFER, model.vbuf);
        gl.enableVertexAttribArray(program.attrPositionP);
        gl.vertexAttribPointer(program.attrPositionP, 2, gl.FLOAT, false, 12, 0);
        gl.enableVertexAttribArray(program.attrPosition0);
        gl.vertexAttribPointer(program.attrPosition0, 2, gl.FLOAT, false, 12, 24);
        gl.enableVertexAttribArray(program.attrPositionN);
        gl.vertexAttribPointer(program.attrPositionN, 2, gl.FLOAT, false, 12, 48);
        gl.enableVertexAttribArray(program.attrControl);
        gl.vertexAttribPointer(program.attrControl, 1, gl.FLOAT, false, 12, 32);
        if (! model.ibuf) {
            gl.drawArrays(model.tess, 0, model.n);
        } else {
            gl.bindBuffer(goog.webgl.ELEMENT_ARRAY_BUFFER, model.ibuf);
            gl.drawElements(model.tess, model.n, 
                            goog.webgl.UNSIGNED_SHORT, 0); 
        }

        gl.disableVertexAttribArray(program.attrPositionN);
        gl.disableVertexAttribArray(program.attrPosition0);
        gl.disableVertexAttribArray(program.attrPositionP);
        gl.disableVertexAttribArray(program.attrControl);

        // Disable blending
        gl.disable(goog.webgl.BLEND);
    },

    _expandLine: function(coords, opt_ring, opt_dest) {

        var dst = opt_dest || [];
        if (opt_ring) {
            coords = coords.slice(0, coords.length);
            coords.push(coords[0]);
            coords.push(coords[1]);
        }
        this.expandLineString_(dst, coords, 0, coords.length, 2);
        return dst;

    },

    // Prototypical library code

    surfaceFlags_: {
        NOT_AT_EDGE: 0, 
        EDGE_LEFT: 1,
        EDGE_RIGHT: 2, 
        LAST_INNER: 4,
        LAST_OUTER: 8,
        NO_RENDER: 12
    },

    expandLinearRing_: function(dst, coords, offset, end, stride, nDimensions, forPolygon) {

        // Won't need a left edge when using CCW winding for the
        // outside contours and CW winding for inside contours of
        // polygons
        var leftEdge = ! forPolygon ? 
                this.surfaceFlags_.EDGE_LEFT :
                this.surfaceFlags_.NOT_AT_EDGE;

        var i, j = end - stride;
        var e = j + nDimensions;

        // Last coord on start sentinel (for proper miters)
        for (i = j; i != e; ++i) dst.push(coords[i]);
        dst.push(this.surfaceFlags_.NO_RENDER);
        for (i = j; i != e; ++i) dst.push(coords[i]);
        dst.push(this.surfaceFlags_.NO_RENDER);

        // Line string from coordinates
        for (j = offset; j != end; j += stride) {

            e = j + nDimensions;
            for (i = j; i != e; ++i) dst.push(coords[i]);
            dst.push(leftEdge);
            for (i = j; i != e; ++i) dst.push(coords[i]);
            dst.push(this.surfaceFlags_.EDGE_RIGHT);
        }

        // Wrap around
        j = offset;
        if (! forPolygon) {
            // Have the wrapped vertex be valid (not a sentinel yet)
            // in order to close the ring when rendering a strip
            e = j + nDimensions;
            for (i = j; i != e; ++i) dst.push(coords[i]);
            dst.push(leftEdge);
            for (i = j; i != e; ++i) dst.push(coords[i]);
            dst.push(this.surfaceFlags_.EDGE_RIGHT);
            j += stride;
        }
        // Next (first or second) on end sentinel
        e = j + nDimensions;
        for (i = j; i != e; ++i) dst.push(coords[i]);
        dst.push(this.surfaceFlags_.NO_RENDER);
        for (i = j; i != e; ++i) dst.push(coords[i]);
        dst.push(this.surfaceFlags_.NO_RENDER);
    },

    expandLineString_: function(dst, coords, offset, end, nDimensions) {

        var last = end - nDimensions;
        var i, j, e = offset + nDimensions;

        // Assume ring when coordinates of first and last vertex match
        var isRing = true;
        for (i = offset, j = last; i != e; ++i, ++j) {
            if (coords[i] != coords[j]) {
                isRing = false;
                break;
            }
        }
        if (isRing) {
            end -= nDimensions;
            this.expandLinearRing_(dst, coords, offset, end, 
                                   nDimensions, nDimensions);
            return;
        }

        // Vertex pattern used for lines:
        // ------------------------------
        //
        // L1  R1   L0  R0   L0  R0   L1  R1
        // ~~~~~~   ======   ------
        // 
        // LM  RM   LN  RN   LN  RN   LM  RM
        //          ------   ======   ~~~~~~
        // 
        // \________|_________/             <- info visible in the
        //     \________|_________/              shader at specific
        //          \________|_________/         vertices
        //               \________|_________/  
        // 
        // Legend: 
        //     ~ Sentinel vertex
        //     = Terminal vertex, outer
        //     - Terminal vertex, inner
        //     - N: Last index, M: Second last index
        // 
        // Terminal vertices:
        //     - one of the two adjacent edges is zero
        //     - sum is the negated actual edge
        //     - 1st nonzero => start of line
        //     - 2nd nonzero => end of line
        //     - difference 1st minus 2nd gives outside direction

        j = offset + nDimensions;
        e = j + nDimensions;
        for (i = j; i != e; ++i) dst.push(coords[i]);
        dst.push(this.surfaceFlags_.NO_RENDER);
        for (i = j; i != e; ++i) dst.push(coords[i]);
        dst.push(this.surfaceFlags_.NO_RENDER);

        j = offset;
        e = j + nDimensions;
        for (i = j; i != e; ++i) dst.push(coords[i]);
        dst.push(this.surfaceFlags_.EDGE_LEFT | this.surfaceFlags_.LAST_OUTER);
        for (i = j; i != e; ++i) dst.push(coords[i]);
        dst.push(this.surfaceFlags_.EDGE_RIGHT | this.surfaceFlags_.LAST_OUTER);
        for (i = j; i != e; ++i) dst.push(coords[i]);
        dst.push(this.surfaceFlags_.EDGE_LEFT | this.surfaceFlags_.LAST_INNER);
        for (i = j; i != e; ++i) dst.push(coords[i]);
        dst.push(this.surfaceFlags_.EDGE_RIGHT | this.surfaceFlags_.LAST_INNER);

        for (j = offset + nDimensions; j != last; j = e) {

            e = j + nDimensions;
            for (i = j; i != e; ++i) dst.push(coords[i]);
            dst.push(this.surfaceFlags_.EDGE_LEFT);
            for (i = j; i != e; ++i) dst.push(coords[i]);
            dst.push(this.surfaceFlags_.EDGE_RIGHT);
        }

        e = j + nDimensions;
        for (i = j; i != e; ++i) dst.push(coords[i]);
        dst.push(this.surfaceFlags_.EDGE_LEFT | this.surfaceFlags_.LAST_INNER);
        for (i = j; i != e; ++i) dst.push(coords[i]);
        dst.push(this.surfaceFlags_.EDGE_RIGHT | this.surfaceFlags_.LAST_INNER);
        for (i = j; i != e; ++i) dst.push(coords[i]);
        dst.push(this.surfaceFlags_.EDGE_LEFT | this.surfaceFlags_.LAST_OUTER);
        for (i = j; i != e; ++i) dst.push(coords[i]);
        dst.push(this.surfaceFlags_.EDGE_RIGHT | this.surfaceFlags_.LAST_OUTER);

        j = last - nDimensions;
        e = last;
        for (i = j; i != e; ++i) dst.push(coords[i]);
        dst.push(this.surfaceFlags_.NO_RENDER);
        for (i = j; i != e; ++i) dst.push(coords[i]);
        dst.push(this.surfaceFlags_.NO_RENDER);
    },


    // UI

    _setupUserInterface: function() {

        $('#rotation-angle').slider({min: 0, max: Math.PI * 2, value: 0.125, step: 0.0001 });
        $('#rotation-speed').slider({min: 0, max: 1, value: 0, step: 0.0001 });
        $('#scale-x, #scale-y').slider({min: 0.125, max: 10, value: 1.0, step: 0.125});
        $('#line-width').slider({min: 0.0001, max: 15, value: 20.0, step: 0.0001});
        $('#outline-width').slider({min: 0, max: 1, value: 0.38, step: 0.0001});
        $('#anti-aliasing').slider({min: 0, max: 5, value: 1.75, step: 0.0001});
        $('#gamma').slider({min: 0.125, max: 10, value: 2.2, step: 0.125});
        $('#grid-size-x').slider({min: 10, max: 999, step: 1, value: 400});
        $('#grid-size-y').slider({min: 10, max: 999, step: 1, value: 400});

        $('#user-interface').children(':ui-slider')
                .after('<div class="value-display"/>')
                .on('slidechange slide', this._displaySliderValue.bind(this))
                .trigger('slidechange');
    },

    _displaySliderValue: function(e,ui) {

        ui = ui || { value: $(e.target).slider('value') };
        $(e.target).next().text(ui.value.toPrecision(3));
    },

    _onResize: function(e) {

        this.gl.context.viewport($(this).width(), $(this).height());
    },

    // Mouse input

    _mouseX: 0, _mouseY: 0, _mouseButton: 0, _mouseMoveX:0, _mouseMoveY: 0,

    _onMouseDown: function(e) {

        this._mouseButton = e.which;
        this._mouseX = e.pageX;
        this._mouseY = e.pageY;
    },

    _onMouseUp: function(e) {

        this._onMouseMove(e);
        this._mouseButton = -1;
    },

    _onMouseMove: function(e) {

        // Determine movment vector when left button is pressed.
        if (this._mouseButton == 1) {

            this._mouseMoveX = e.pageX - this._mouseX;
            this._mouseMoveY = this._mouseY - e.pageY;

            //console.log('mouse move ' + this._mouseMoveX + 
            //                      ',' + this._mouseMoveY);
        }

        this._mouseX = e.pageX;
        this._mouseY = e.pageY;
    },

    _onMouseWheel: function(e) {

        this._zoom += e.originalEvent.wheelDelta;
        console.log('zoom ' + this._zoom);
    },


    // Background

    _posX:0, _posY: 0, _zoom: 0,

    _setupBackground: function() {

        // Compile shaders
        this._bgProgram = this.gl.linkProgram($('#webgl-bg-vert').text(),
                                              $('#webgl-bg-frag').text());
        // Fetch uniform locations
        var gl = this.gl.context;
        this._bgUniOffset = gl.getUniformLocation(this._bgProgram, 'Offset');
        this._bgUniScale = gl.getUniformLocation(this._bgProgram, 'Scale');

        // Create buffers
        this._bgVertices = this.gl.buffer(this._SQUARE_VERTEX_DATA);
        this._bgIndices = this.gl.buffer(
                this._SQUARE_INDEX_DATA, goog.webgl.ELEMENT_ARRAY_BUFFER);

        // Set start offset
        this._posX = gl.drawingBufferWidth / 2;
        this._posY = gl.drawingBufferHeight / 2;
    },

    _renderBackground: function() {
        var scaleX = 1 / $('#grid-size-x').slider('value');
        var scaleY = 1 / $('#grid-size-y').slider('value');

        var gl = this.gl.context;
        gl.useProgram(this._bgProgram);
        gl.uniform2f(this._bgUniOffset, Math.round(this._posX), Math.round(this._posY));
        gl.uniform2f(this._bgUniScale, scaleX, scaleY);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._bgVertices);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._bgIndices);
        gl.drawElements(gl.TRIANGLES, 6, goog.webgl.UNSIGNED_SHORT, 0);
        gl.disableVertexAttribArray(0);
    },

    _SQUARE_VERTEX_DATA: new Float32Array([
        -1.0, -1.0,
        +1.0, -1.0,
        +1.0, +1.0,
        -1.0, +1.0
    ]),

    _SQUARE_INDEX_DATA: new Uint16Array([
        0,1,2,
        0,2,3
    ])

};

var app = null; // please keep here for interactive debugging
$(window).load(function() { app = new Application(); });

