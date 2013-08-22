
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
        this._POLY_STYLE = this._polyStyle.bind(this);
        this._LINE_STYLE = this._lineStyle.bind(this);

        this._models.push({ 
            vbuf: this.gl.buffer(new Float32Array(this._expandLine(this._LINE_COORDS1))),
            ibuf: null,
            tess: goog.webgl.TRIANGLE_STRIP,
            n: this._LINE_COORDS1.length + 4,
            style: this._LINE_STYLE
        });

        this._models.push({
            vbuf: this.gl.buffer(new Float32Array(this._expandLine(this._LINE_COORDS1, true))),
            ibuf: null,
            tess: goog.webgl.TRIANGLE_STRIP,
            n: this._LINE_COORDS1.length + 2,
            style: this._LINE_STYLE
        });

        var nFirst = this._LINE_COORDS1.length * 3; 
        var vertices = this._expandLine(this._LINE_COORDS1);
        this._expandLine(this._LINE_COORDS2, true, vertices);
        this._models.push({
            vbuf: this.gl.buffer(new Float32Array(vertices)),
            ibuf: null,
            tess: goog.webgl.TRIANGLE_STRIP,
            n: vertices.length / 3 - 4,
            style: this._LINE_STYLE
        });

        var data = this._tomsTestData();
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
            n: vertices.length / 3 - 4,
            style: this._LINE_STYLE
        });

        vertices = this._expandLine(this._dude()[0], true);
        this._models.push({
            vbuf: this.gl.buffer(new Float32Array(vertices)),
            ibuf: null,
            tess: goog.webgl.TRIANGLE_STRIP,
            n: vertices.length / 3 - 4,
            style: this._LINE_STYLE
        });

        var tri = this._TRIANGLE, indices = [0, 1, 2];
        vertices = [ 0, 0, 12,   0, 0, 12, 
                     tri[0], tri[1], 0,  tri[2], tri[3], 0,  tri[4], tri[5], 0, 
                     0, 0, 12,   0, 0, 12 ];
        this._models.push({
            vbuf: this.gl.buffer(new Float32Array(vertices)),
            ibuf: this.gl.buffer(new Uint16Array(indices),
                                 goog.webgl.ELEMENT_ARRAY_BUFFER),
            tess: goog.webgl.TRIANGLES,
            n: indices.length,
            style: this._LINE_STYLE
        });

        vertices = [], indices = [];
        ol.renderer.webgl.gpuData.expandPolygon(vertices, indices, [tri], 2);
        this._models.push({
            vbuf: this.gl.buffer(new Float32Array(vertices)),
            ibuf: this.gl.buffer(new Uint16Array(indices),
                                 goog.webgl.ELEMENT_ARRAY_BUFFER),
            tess: goog.webgl.TRIANGLES,
            n: indices.length,
            style: this._POLY_STYLE
        });

        vertices = [], indices = [];
        ol.renderer.webgl.gpuData.expandPolygon(vertices, indices, this._dude(), 2);
        this._models.push({
            vbuf: this.gl.buffer(new Float32Array(vertices)),
            ibuf: this.gl.buffer(new Uint16Array(indices),
                                 goog.webgl.ELEMENT_ARRAY_BUFFER),
            tess: goog.webgl.TRIANGLES,
            n: indices.length,
            style: this._POLY_STYLE
        });
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

        antiAliasing += 0.001;

        // Set uniforms.
        gl.uniform3f(program.uniRenderParams, antiAliasing, gamma, 1/gamma);
        gl.uniform2f(program.uniPixelScale, pixelScaleX, pixelScaleY);

        var model = this._models[modelIndex];

        // Set style
        var style = [];
        model.style(style, lineWidth, outlineWidth, antiAliasing);
        gl.vertexAttrib4fv(program.attrStyle, style);

        // Setup buffers and render
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
        ol.renderer.webgl.gpuData.expandLineString(dst, coords, 0, coords.length, 2);
        return dst;

    },

    _lineStyle: function(dst, width, stroke, aa) {
        ol.renderer.webgl.gpuData.encodeLineStyle(
            dst, width, this._COLOR1, stroke, this._COLOR2);
    },

    _polyStyle: function(dst, width, stroke, aa) {
        ol.renderer.webgl.gpuData.encodePolygonStyle(
            dst, this._COLOR1, aa, width, this._COLOR2); 
    },

    // UI

    _setupUserInterface: function() {

        $('#rotation-angle').slider({min: 0, max: Math.PI * 2, value: 0.125, step: 0.0001 });
        $('#rotation-speed').slider({min: 0, max: 1, value: 0, step: 0.0001 });
        $('#scale-x, #scale-y').slider({min: 0.125, max: 10, value: 1.0, step: 0.125});
        $('#line-width').slider({min: 0.0001, max: 10, value: 6.0, step: 0.0001});
        $('#outline-width').slider({min: 0, max: 1, value: 0.5, step: 0.0001});
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
    ]),

    _COLOR1: { r: 0, g: 0, b: 255, a: 1 },
    _COLOR2: { r: 255, g: 248, b: 20, a: 1 },

    _LINE_COORDS1: [ 
        0, -0.5,   0, 0,   0.25, 0.25,   0.25, 0.5,   0, 0.7,   0, 0.5,   -0.25, 0.4
    ],

    _LINE_COORDS2: [
        -0.75,-0.5,   -0.5,-0.5,   -0.625,0.0
    ],

    _TRIANGLE: [
        -0.5,-0.25,   0.5,-0.25,   0,0.5
    ],

    _tomsTestData: function() {
        var k = 1/20;
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

    _dude: function() {
        var kx = 1/250, ky = -1/250, tx = -1.4, ty = 2;
        return ([
        // Test data taken from
        // http://javascript.poly2tri.googlecode.com/hg/index.html
        [ // contour
            280.35714 * kx + tx, 648.79075 * ky + ty,
            286.78571 * kx + tx, 662.8979 * ky + ty,
            263.28607 * kx + tx, 661.17871 * ky + ty,
            262.31092 * kx + tx, 671.41548 * ky + ty,
            250.53571 * kx + tx, 677.00504 * ky + ty,
            250.53571 * kx + tx, 683.43361 * ky + ty,
            256.42857 * kx + tx, 685.21933 * ky + ty,
            297.14286 * kx + tx, 669.50504 * ky + ty,
            289.28571 * kx + tx, 649.50504 * ky + ty,
            285 * kx + tx, 631.6479 * ky + ty,
            285 * kx + tx, 608.79075 * ky + ty,
            292.85714 * kx + tx, 585.21932 * ky + ty,
            306.42857 * kx + tx, 563.79075 * ky + ty,
            323.57143 * kx + tx, 548.79075 * ky + ty,
            339.28571 * kx + tx, 545.21932 * ky + ty,
            357.85714 * kx + tx, 547.36218 * ky + ty,
            375 * kx + tx, 550.21932 * ky + ty,
            391.42857 * kx + tx, 568.07647 * ky + ty,
            404.28571 * kx + tx, 588.79075 * ky + ty,
            413.57143 * kx + tx, 612.36218 * ky + ty,
            417.14286 * kx + tx, 628.07647 * ky + ty,
            438.57143 * kx + tx, 619.1479 * ky + ty,
            438.03572 * kx + tx, 618.96932 * ky + ty,
            437.5 * kx + tx, 609.50504 * ky + ty,
            426.96429 * kx + tx, 609.86218 * ky + ty,
            424.64286 * kx + tx, 615.57647 * ky + ty,
            419.82143 * kx + tx, 615.04075 * ky + ty,
            420.35714 * kx + tx, 605.04075 * ky + ty,
            428.39286 * kx + tx, 598.43361 * ky + ty,
            437.85714 * kx + tx, 599.68361 * ky + ty,
            443.57143 * kx + tx, 613.79075 * ky + ty,
            450.71429 * kx + tx, 610.21933 * ky + ty,
            431.42857 * kx + tx, 575.21932 * ky + ty,
            405.71429 * kx + tx, 550.21932 * ky + ty,
            372.85714 * kx + tx, 534.50504 * ky + ty,
            349.28571 * kx + tx, 531.6479 * ky + ty,
            346.42857 * kx + tx, 521.6479 * ky + ty,
            346.42857 * kx + tx, 511.6479 * ky + ty,
            350.71429 * kx + tx, 496.6479 * ky + ty,
            367.85714 * kx + tx, 476.6479 * ky + ty,
            377.14286 * kx + tx, 460.93361 * ky + ty,
            385.71429 * kx + tx, 445.21932 * ky + ty,
            388.57143 * kx + tx, 404.50504 * ky + ty,
            360 * kx + tx, 352.36218 * ky + ty,
            337.14286 * kx + tx, 325.93361 * ky + ty,
            330.71429 * kx + tx, 334.50504 * ky + ty,
            347.14286 * kx + tx, 354.50504 * ky + ty,
            337.85714 * kx + tx, 370.21932 * ky + ty,
            333.57143 * kx + tx, 359.50504 * ky + ty,
            319.28571 * kx + tx, 353.07647 * ky + ty,
            312.85714 * kx + tx, 366.6479 * ky + ty,
            350.71429 * kx + tx, 387.36218 * ky + ty,
            368.57143 * kx + tx, 408.07647 * ky + ty,
            375.71429 * kx + tx, 431.6479 * ky + ty,
            372.14286 * kx + tx, 454.50504 * ky + ty,
            366.42857 * kx + tx, 462.36218 * ky + ty,
            352.85714 * kx + tx, 462.36218 * ky + ty,
            336.42857 * kx + tx, 456.6479 * ky + ty,
            332.85714 * kx + tx, 438.79075 * ky + ty,
            338.57143 * kx + tx, 423.79075 * ky + ty,
            338.57143 * kx + tx, 411.6479 * ky + ty,
            327.85714 * kx + tx, 405.93361 * ky + ty,
            320.71429 * kx + tx, 407.36218 * ky + ty,
            315.71429 * kx + tx, 423.07647 * ky + ty,
            314.28571 * kx + tx, 440.21932 * ky + ty,
            325 * kx + tx, 447.71932 * ky + ty,
            324.82143 * kx + tx, 460.93361 * ky + ty,
            317.85714 * kx + tx, 470.57647 * ky + ty,
            304.28571 * kx + tx, 483.79075 * ky + ty,
            287.14286 * kx + tx, 491.29075 * ky + ty,
            263.03571 * kx + tx, 498.61218 * ky + ty,
            251.60714 * kx + tx, 503.07647 * ky + ty,
            251.25 * kx + tx, 533.61218 * ky + ty,
            260.71429 * kx + tx, 533.61218 * ky + ty,
            272.85714 * kx + tx, 528.43361 * ky + ty,
            286.07143 * kx + tx, 518.61218 * ky + ty,
            297.32143 * kx + tx, 508.25504 * ky + ty,
            297.85714 * kx + tx, 507.36218 * ky + ty,
            298.39286 * kx + tx, 506.46932 * ky + ty,
            307.14286 * kx + tx, 496.6479 * ky + ty,
            312.67857 * kx + tx, 491.6479 * ky + ty,
            317.32143 * kx + tx, 503.07647 * ky + ty,
            322.5 * kx + tx, 514.1479 * ky + ty,
            325.53571 * kx + tx, 521.11218 * ky + ty,
            327.14286 * kx + tx, 525.75504 * ky + ty,
            326.96429 * kx + tx, 535.04075 * ky + ty,
            311.78571 * kx + tx, 540.04075 * ky + ty,
            291.07143 * kx + tx, 552.71932 * ky + ty,
            274.82143 * kx + tx, 568.43361 * ky + ty,
            259.10714 * kx + tx, 592.8979 * ky + ty,
            254.28571 * kx + tx, 604.50504 * ky + ty,
            251.07143 * kx + tx, 621.11218 * ky + ty,
            250.53571 * kx + tx, 649.1479 * ky + ty,
            268.1955 * kx + tx, 654.36208 * ky + ty
        ], [ // 1st hole
            332 * kx + tx,  423 * ky + ty,
            329 * kx + tx,  413 * ky + ty,
            320 * kx + tx, 423 * ky + ty,
            325 * kx + tx, 437 * ky + ty
        ], [ // 2nd hole
            334.86556 * kx + tx,  478.09046 * ky + ty,
            339.91632 * kx + tx,  480.11077 * ky + ty,
            329.8148 * kx + tx,  510.41534 * ky + ty,
            347.99754 * kx + tx,  480.61584 * ky + ty,
            338.90617 * kx + tx,  465.96863 * ky + ty,
            320.72342 * kx + tx,  480 * ky + ty
        ]]);
    }

};

var app = null; // please keep here for interactive debugging
$(window).load(function() { app = new Application(); });

