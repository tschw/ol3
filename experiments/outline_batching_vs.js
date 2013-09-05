
goog.webgl = null;

function Application() { 

    // WebGL initialization
    if (ol.webglnew.WebGL.available()) {

        var gl = new ol.webglnew.WebGL($('#webgl-canvas')[0], { 
            alpha: true, blend: true, stencil: false, antialias: false,
            premultilpiedAlpha: false, preserveDrawingBuffer: false });
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
        gl.finish();
    },


    // Main renderer


    _setupPolys: function() {

        var gl = this.gl.context;

        // Setup shaders
        //
        // We create a header that enables standard derivatives extension
        // when available and tells us whether to premultiply the color by
        // the alpha component.

        this._renders = [ ];
        var vertShaderSource = $('#webgl-poly-vert').text();
        var fragShaderSource = $('#webgl-poly-frag').text();

        var fragShaderSourceBuilder = [ '#version 100' ];
        if (gl.getContextAttributes().premultipliedAlpha) {
            fragShaderSourceBuilder.push('#define PREMULTIPLY_BY_ALPHA 1');
        }
        fragShaderSourceBuilder.push(fragShaderSource);
        var program, locations;

        program = this.gl.linkProgram(
                vertShaderSource, fragShaderSourceBuilder.join('\n'));
        locations = this._vectorShaderLocations(program);
        this._renders.push(
                new ol.renderer.webgl.VectorRender(0, program, locations));

        if (this.gl.OES_standard_derivatives) {
            fragShaderSourceBuilder.splice(fragShaderSourceBuilder.length - 1, 1);
            fragShaderSourceBuilder.push('#extension GL_OES_standard_derivatives : enable');
            fragShaderSourceBuilder.push('#define STANDARD_DERIVATIVES 1');
            $('<option value="1">using derivatives extension</option>').appendTo('#program');
            fragShaderSourceBuilder.push(fragShaderSource);

            program = this.gl.linkProgram(
                    vertShaderSource, fragShaderSourceBuilder.join('\n'));
            locations = this._vectorShaderLocations(program);
            this._renders.push(
                    new ol.renderer.webgl.VectorRender(0, program, locations));
        }

        // Setup batching infrastructure

        this._batchBuilder = new ol.renderer.webgl.BatchBuilder(30, 160);
        this._batchRenderer = new ol.renderer.webgl.BatchRenderer();
        this._currentModelIndex = -1;
        this._currentBatch = null;
    },

    _ring: function(batchBuilder, coords) {

        coords = coords.slice(0, coords.length);
        coords.push(coords[0]);
        coords.push(coords[1]);
        batchBuilder.lineString(coords, 0, coords.length);
    },

    _tomsTest: function(batchBuilder) {

        var data = this._tomsTestData();
        for(var i = 0; i < data.length; ++i) {
            var lineString = data[i], flatCoords = [];
            for (var j = 0; j < lineString.length; ++j) {
                var coords = lineString[j];
                flatCoords.push(coords[0]);
                flatCoords.push(coords[1]);
            }
            batchBuilder.lineString(flatCoords, 0, flatCoords.length);
        }
    },

    _vectorShaderLocations: function(prog) {
        var result = { };
        var gl = this.gl.context;

        // Query vertex attributes
        result.PositionP = gl.getAttribLocation(prog, 'PositionP');
        result.Position0 = gl.getAttribLocation(prog, 'Position0');
        result.PositionN = gl.getAttribLocation(prog, 'PositionN');
        result.Control = gl.getAttribLocation(prog, 'Control');
        result.Style = gl.getAttribLocation(prog, 'Style');

        // Query uniforms

        result.Transform = gl.getUniformLocation(prog, 'Transform');
        result.RenderParams = gl.getUniformLocation(prog, 'RenderParams');
        result.PixelScale = gl.getUniformLocation(prog, 'PixelScale');
        return result;
    },

    _renderPolys: function() {

        // UI interaction
        var modelIndex = Number($('#model').val()),
            programIndex = Number($('#program').val());

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
        var canvas = $('#webgl-canvas');
        var pixelScaleX = 2 / canvas.width(), pixelScaleY = 2 / canvas.height();
        antiAliasing += 0.001;

        // Batch creation

        var gl = this.gl.context;

        if (modelIndex != this._currentModelIndex) {
            this._currentModelIndex = modelIndex;

            var batchBuilder = this._batchBuilder;
            var blueprint = null;

            batchBuilder.setLineStyle(
                lineWidth, this._COLOR1, outlineWidth, this._COLOR2);

            batchBuilder.setPolygonStyle(
                this._COLOR1, antiAliasing, lineWidth, this._COLOR2); 

            switch (modelIndex) {
              case 0:
                batchBuilder.lineString(this._LINE_COORDS1, 0, this._LINE_COORDS1.length);
                break;
              case 1:
                this._ring(batchBuilder, this._LINE_COORDS1);
                break;
              case 2:
                batchBuilder.lineString(this._LINE_COORDS1, 0, this._LINE_COORDS1.length);
                this._ring(batchBuilder, this._LINE_COORDS2);
                break;
              case 3:
                this._tomsTest(batchBuilder);
                break;
              case 4:
                batchBuilder.lineString(this._france(), 0, this._france().length);
                break;
              case 5:
                batchBuilder.polygon([this._TRIANGLE]);
                break;
              case 6:
                batchBuilder.polygon([this._TRIANGLE, this._HOLE]);
                break;
              case 7:
                batchBuilder.polygon([this._france()]);
                break;
              case 8:
                batchBuilder.polygon(this._dude());
                break;
              case 9:
                this._tomsTest(batchBuilder);
                batchBuilder.polygon([this._TRIANGLE, this._HOLE]);
                break;
              case 10:
                batchBuilder.polygon([this._TRIANGLE, this._HOLE]);
                this._tomsTest(batchBuilder);
            }
            if (this._currentBatch) {
              ol.renderer.webgl.BatchRenderer.unload(gl, this._currentBatch);
            }
            blueprint = batchBuilder.releaseBlueprint();
            //console.log('blueprint.indexData', blueprint.indexData);
            //console.log('blueprint.vertexData', blueprint.vertexData);
            this._currentBatch =
                ol.renderer.webgl.BatchRenderer.upload(gl, blueprint);
        }

        // Set some GL state (global for now)
        // TODO -> RendererConfig
        gl.enable(goog.webgl.BLEND);
        gl.blendFunc(goog.webgl.SRC_ALPHA, goog.webgl.ONE_MINUS_SRC_ALPHA);
        //gl.disable(gl.DEPTH_TEST);
        //gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.CULL_FACE);

        // Select shaders in renderer configs
        // Hacky as using one render for both types
        var render = this._renders[programIndex];
        this._batchRenderer.renders_[0] = render;
        this._batchRenderer.renders_[1] = render;

        // Setup transformation matrix.
        var cosA = Math.cos(angle), sinA = Math.sin(angle);
        this._batchRenderer.setParameter(
            ol.renderer.webgl.Render.Parameter.COORDINATE_TRANSFORM,
            [   cosA * scaleX, sinA * scaleX, 0, 0,
               -sinA * scaleY, cosA * scaleY, 0, 0,
                            0,             0, 1, 0,
                            0,             0, 0, 1 ]);
        this._batchRenderer.setParameter(
            ol.renderer.webgl.Render.Parameter.NDC_PIXEL_SIZE, [pixelScaleX, pixelScaleY]);
        this._batchRenderer.setParameter(
            ol.renderer.webgl.Render.Parameter.SMOOTHING_PIXELS, antiAliasing);
        this._batchRenderer.setParameter(
            ol.renderer.webgl.Render.Parameter.GAMMA, gamma);

        this._batchRenderer.render(gl, this._currentBatch);
        this._batchRenderer.reset(gl);

        // Disable blending
        // TODO -> RendererConfig
        gl.disable(goog.webgl.BLEND);
    },

    // UI

    _setupUserInterface: function() {

        $('#rotation-angle').slider({min: 0, max: Math.PI * 2, value: 0.125, step: 0.0001 });
        $('#rotation-speed').slider({min: 0, max: 1, value: 0, step: 0.0001 });
        $('#scale-x, #scale-y').slider({min: 0.125, max: 10, value: 1.0, step: 0.125});
        $('#line-width').slider({min: 0.0001, max: 10, value: 3.0, step: 0.0001});
        $('#outline-width').slider({min: 0, max: 1, value: 1.0, step: 0.0001});
        $('#anti-aliasing').slider({min: 0, max: 5, value: 1.75, step: 0.0001});
        $('#gamma').slider({min: 0.125, max: 10, value: 2.2, step: 0.125});
        $('#grid-size-x').slider({min: 10, max: 999, step: 1, value: 400});
        $('#grid-size-y').slider({min: 10, max: 999, step: 1, value: 400});

        $('#user-interface').children(':ui-slider')
                .after('<div class="value-display"/>')
                .on('slidechange slide', this._displaySliderValue.bind(this))
                .trigger('slidechange');
    },

    _STYLE_CONTROLS: {
        'line-width': 1, 
        'outline-width': 1,
        'anti-aliasing': 1 // TODO allow this one to be removed
    },

    _displaySliderValue: function(e,ui) {

        ui = ui || { value: $(e.target).slider('value') };
        $(e.target).next().text(ui.value.toPrecision(3));
        if (e.target.id in this._STYLE_CONTROLS) {
            this._currentModelIndex = -1;
        }
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
        -0.75, -0.5,   -0.5, -0.5,   -0.625, 0.0
    ],

    _TRIANGLE: [
        -0.5, -0.25,   0.5, -0.25,   0, 0.5
    ],

    _HOLE: [
        -0.125, -0.125,   +0.125, -0.125,   +0.125, +0.125,   -0.125, +0.125
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

    },


    _france: function() {
        var kx = 1/350, ky = 1/350, tx = -0.9, ty = -0.7;
        return ([
        // Test data taken from
        // http://javascript.poly2tri.googlecode.com/hg/index.html
        204.3125 * kx + tx,99.211183 * ky + ty, 198.65625 * kx + tx,98.054933 * ky + ty,
        194.75 * kx + tx,95.117433 * ky + ty, 195.71875 * kx + tx,89.648683 * ky + ty,
        200.40625 * kx + tx,82.617433 * ky + ty, 208.40625 * kx + tx,78.304933 * ky + ty,
        218.1875 * kx + tx,74.804933 * ky + ty, 233.03125 * kx + tx,71.086183 * ky + ty,
        241.40625 * kx + tx,64.648683 * ky + ty, 249.03125 * kx + tx,55.273683 * ky + ty,
        254.3125 * kx + tx,58.398683 * ky + ty, 254.3125 * kx + tx,56.429933 * ky + ty,
        250 * kx + tx,52.523683 * ky + ty, 250.59375 * kx + tx,45.304933 * ky + ty,
        250.59375 * kx + tx,18.929933 * ky + ty, 259.1875 * kx + tx,12.304933 * ky + ty,
        270.53125 * kx + tx,10.148683 * ky + ty, 280.28125 * kx + tx,8.586183 * ky + ty,
        286.53125 * kx + tx,5.648683 * ky + ty, 289.0625 * kx + tx,10.742433 * ky + ty,
        289.84375 * kx + tx,13.679933 * ky + ty, 288.5 * kx + tx,15.804933 * ky + ty,
        288.5 * kx + tx,19.148683 * ky + ty, 289.65625 * kx + tx,21.273683 * ky + ty,
        292.40625 * kx + tx,21.273683 * ky + ty, 294.34375 * kx + tx,23.429933 * ky + ty,
        294.9375 * kx + tx,25.586183 * ky + ty, 296.5 * kx + tx,27.523683 * ky + ty,
        298.84375 * kx + tx,27.523683 * ky + ty, 301.1875 * kx + tx,24.617433 * ky + ty,
        306.0625 * kx + tx,23.054933 * ky + ty, 308.59375 * kx + tx,22.836183 * ky + ty,
        309 * kx + tx,25.179933 * ky + ty, 310.15625 * kx + tx,25.179933 * ky + ty,
        310.375 * kx + tx,26.367433 * ky + ty, 312.125 * kx + tx,27.148683 * ky + ty,
        312.3125 * kx + tx,34.961183 * ky + ty, 313.09375 * kx + tx,37.492433 * ky + ty,
        315.84375 * kx + tx,37.898683 * ky + ty, 317.1875 * kx + tx,39.242433 * ky + ty,
        321.09375 * kx + tx,37.492433 * ky + ty, 322.46875 * kx + tx,39.054933 * ky + ty,
        324.8125 * kx + tx,38.679933 * ky + ty, 327.9375 * kx + tx,42.367433 * ky + ty,
        327.75 * kx + tx,49.211183 * ky + ty, 329.125 * kx + tx,49.211183 * ky + ty,
        330.28125 * kx + tx,47.273683 * ky + ty, 341.21875 * kx + tx,46.679933 * ky + ty,
        347.46875 * kx + tx,51.554933 * ky + ty, 348.25 * kx + tx,53.117433 * ky + ty,
        345.3125 * kx + tx,55.273683 * ky + ty, 345.3125 * kx + tx,57.992433 * ky + ty,
        344.34375 * kx + tx,58.992433 * ky + ty, 348.0625 * kx + tx,59.961183 * ky + ty,
        348.65625 * kx + tx,63.679933 * ky + ty, 344.75 * kx + tx,66.023683 * ky + ty,
        344.9375 * kx + tx,67.961183 * ky + ty, 352.9375 * kx + tx,67.961183 * ky + ty,
        355.6875 * kx + tx,70.117433 * ky + ty, 358.03125 * kx + tx,69.148683 * ky + ty,
        362.3125 * kx + tx,67.773683 * ky + ty, 364.65625 * kx + tx,66.211183 * ky + ty,
        364.65625 * kx + tx,63.867433 * ky + ty, 364.65625 * kx + tx,62.117433 * ky + ty,
        366.40625 * kx + tx,60.336183 * ky + ty, 368.375 * kx + tx,57.429933 * ky + ty,
        371.3125 * kx + tx,57.429933 * ky + ty, 372.09375 * kx + tx,57.992433 * ky + ty,
        372.09375 * kx + tx,61.523683 * ky + ty, 369.9375 * kx + tx,63.461183 * ky + ty,
        371.3125 * kx + tx,64.648683 * ky + ty, 370.53125 * kx + tx,66.586183 * ky + ty,
        369.9375 * kx + tx,68.742433 * ky + ty, 373.0625 * kx + tx,70.711183 * ky + ty,
        373.0625 * kx + tx,72.461183 * ky + ty, 372.28125 * kx + tx,73.242433 * ky + ty,
        372.65625 * kx + tx,77.742433 * ky + ty, 378.90625 * kx + tx,78.523683 * ky + ty,
        380.6875 * kx + tx,79.679933 * ky + ty, 381.65625 * kx + tx,82.211183 * ky + ty,
        387.125 * kx + tx,82.804933 * ky + ty, 388.6875 * kx + tx,83.992433 * ky + ty,
        389.46875 * kx + tx,87.898683 * ky + ty, 392 * kx + tx,88.273683 * ky + ty,
        393.5625 * kx + tx,89.836183 * ky + ty, 394.34375 * kx + tx,93.554933 * ky + ty,
        395.53125 * kx + tx,93.554933 * ky + ty, 396.6875 * kx + tx,92.367433 * ky + ty,
        400 * kx + tx,92.179933 * ky + ty, 402.34375 * kx + tx,90.023683 * ky + ty,
        406.84375 * kx + tx,90.023683 * ky + ty, 410.375 * kx + tx,93.929933 * ky + ty,
        413.5 * kx + tx,93.929933 * ky + ty, 414.65625 * kx + tx,95.117433 * ky + ty,
        417.96875 * kx + tx,95.117433 * ky + ty, 418.5625 * kx + tx,94.148683 * ky + ty,
        420.90625 * kx + tx,92.179933 * ky + ty, 423.84375 * kx + tx,91.992433 * ky + ty,
        426.5625 * kx + tx,94.336183 * ky + ty, 428.53125 * kx + tx,94.336183 * ky + ty,
        429.125 * kx + tx,93.929933 * ky + ty, 431.0625 * kx + tx,93.929933 * ky + ty,
        435.15625 * kx + tx,95.898683 * ky + ty, 437.125 * kx + tx,97.836183 * ky + ty,
        437.3125 * kx + tx,102.52368 * ky + ty, 440.0625 * kx + tx,103.71118 * ky + ty,
        440.0625 * kx + tx,106.42993 * ky + ty, 441.21875 * kx + tx,106.83618 * ky + ty,
        443.1875 * kx + tx,110.55493 * ky + ty, 446.5 * kx + tx,110.14868 * ky + ty,
        446.6875 * kx + tx,107.80493 * ky + ty, 449.4375 * kx + tx,106.64868 * ky + ty,
        449.65565 * kx + tx,106.77743 * ky + ty, 451.42823 * kx + tx,107.80494 * ky + ty,
        452.34375 * kx + tx,107.80493 * ky + ty, 452.36378 * kx + tx,107.80493 * ky + ty,
        452.41248 * kx + tx,107.80363 * ky + ty, 452.4375 * kx + tx,107.80493 * ky + ty,
        452.44093 * kx + tx,107.80479 * ky + ty, 452.46591 * kx + tx,107.80494 * ky + ty,
        452.46875 * kx + tx,107.80493 * ky + ty, 452.48002 * kx + tx,107.8107 * ky + ty,
        452.52058 * kx + tx,107.83076 * ky + ty, 452.53125 * kx + tx,107.83618 * ky + ty,
        452.55512 * kx + tx,107.84316 * ky + ty, 452.59646 * kx + tx,107.85577 * ky + ty,
        452.625 * kx + tx,107.86743 * ky + ty, 452.66355 * kx + tx,107.8842 * ky + ty,
        452.71729 * kx + tx,107.91257 * ky + ty, 452.75 * kx + tx,107.92993 * ky + ty,
        453.59437 * kx + tx,108.40056 * ky + ty, 454.55551 * kx + tx,110.09675 * ky + ty,
        454.6875 * kx + tx,110.33618 * ky + ty, 456.65625 * kx + tx,111.71118 * ky + ty,
        463.28125 * kx + tx,111.52368 * ky + ty, 466.03125 * kx + tx,108.99243 * ky + ty,
        470.71875 * kx + tx,108.58618 * ky + ty, 472.09375 * kx + tx,110.74243 * ky + ty,
        476 * kx + tx,113.08618 * ky + ty, 477.34375 * kx + tx,115.02368 * ky + ty,
        477.75 * kx + tx,114.89868 * ky + ty, 481.46875 * kx + tx,113.86743 * ky + ty,
        483.59375 * kx + tx,113.86743 * ky + ty, 485.15625 * kx + tx,115.61743 * ky + ty,
        488.09375 * kx + tx,113.86743 * ky + ty, 492.40625 * kx + tx,116.02368 * ky + ty,
        497.28125 * kx + tx,116.58618 * ky + ty, 500 * kx + tx,118.74243 * ky + ty,
        497.28125 * kx + tx,119.33618 * ky + ty, 495.53125 * kx + tx,124.02368 * ky + ty,
        495.90625 * kx + tx,127.33618 * ky + ty, 494.15625 * kx + tx,129.08618 * ky + ty,
        492.59375 * kx + tx,129.08618 * ky + ty, 490.625 * kx + tx,131.64868 * ky + ty,
        490.625 * kx + tx,133.99243 * ky + ty, 485.5625 * kx + tx,137.67993 * ky + ty,
        484.96875 * kx + tx,144.33618 * ky + ty, 482.625 * kx + tx,151.96118 * ky + ty,
        483.21875 * kx + tx,157.61743 * ky + ty, 478.125 * kx + tx,167.58618 * ky + ty,
        478.34375 * kx + tx,173.83618 * ky + ty, 480.28125 * kx + tx,176.55493 * ky + ty,
        478.53125 * kx + tx,179.08618 * ky + ty, 478.53125 * kx + tx,182.99243 * ky + ty,
        477.5625 * kx + tx,185.33618 * ky + ty, 477.5625 * kx + tx,190.24243 * ky + ty,
        476 * kx + tx,192.36743 * ky + ty, 477.34375 * kx + tx,195.49243 * ky + ty,
        479.90625 * kx + tx,198.42993 * ky + ty, 477.9375 * kx + tx,200.96118 * ky + ty,
        477.75 * kx + tx,205.27368 * ky + ty, 474.03125 * kx + tx,208.21118 * ky + ty,
        466.8125 * kx + tx,208.39868 * ky + ty, 465.4375 * kx + tx,207.21118 * ky + ty,
        465.84375 * kx + tx,205.08618 * ky + ty, 460.9375 * kx + tx,205.86743 * ky + ty,
        455.875 * kx + tx,211.71118 * ky + ty, 456.0625 * kx + tx,212.49243 * ky + ty,
        460.75 * kx + tx,211.52368 * ky + ty, 462.125 * kx + tx,212.89868 * ky + ty,
        459.59375 * kx + tx,216.02368 * ky + ty, 457.4375 * kx + tx,216.99243 * ky + ty,
        458.40625 * kx + tx,219.33618 * ky + ty, 452.15625 * kx + tx,226.55493 * ky + ty,
        449.4375 * kx + tx,227.92993 * ky + ty, 449.21875 * kx + tx,231.64868 * ky + ty,
        446.5 * kx + tx,234.17993 * ky + ty, 443.5625 * kx + tx,235.55493 * ky + ty,
        439.28125 * kx + tx,237.67993 * ky + ty, 439.65625 * kx + tx,247.05493 * ky + ty,
        427.5625 * kx + tx,258.39868 * ky + ty, 427.34375 * kx + tx,259.77368 * ky + ty,
        429.3125 * kx + tx,260.55493 * ky + ty, 426.375 * kx + tx,264.05493 * ky + ty,
        426 * kx + tx,268.14868 * ky + ty, 429.6875 * kx + tx,270.11743 * ky + ty,
        430.09375 * kx + tx,271.27368 * ky + ty, 427.15625 * kx + tx,274.99243 * ky + ty,
        428.34375 * kx + tx,275.77368 * ky + ty, 428.125 * kx + tx,277.74243 * ky + ty,
        424.625 * kx + tx,278.11743 * ky + ty, 422.28125 * kx + tx,279.49243 * ky + ty,
        422.28125 * kx + tx,283.21118 * ky + ty, 428.71875 * kx + tx,283.21118 * ky + ty,
        431.25 * kx + tx,280.86743 * ky + ty, 435.15625 * kx + tx,278.30493 * ky + ty,
        433.03125 * kx + tx,276.55493 * ky + ty, 432.8125 * kx + tx,274.80493 * ky + ty,
        434.78125 * kx + tx,270.49243 * ky + ty, 436.9375 * kx + tx,270.30493 * ky + ty,
        438.09375 * kx + tx,272.05493 * ky + ty, 442.40625 * kx + tx,268.55493 * ky + ty,
        446.875 * kx + tx,267.77368 * ky + ty, 453.53125 * kx + tx,267.77368 * ky + ty,
        453.71875 * kx + tx,270.30493 * ky + ty, 457.25 * kx + tx,274.02368 * ky + ty,
        457.25 * kx + tx,276.74243 * ky + ty, 455.09375 * kx + tx,279.08618 * ky + ty,
        455.28125 * kx + tx,280.64868 * ky + ty, 459 * kx + tx,282.42993 * ky + ty,
        459 * kx + tx,285.33618 * ky + ty, 459 * kx + tx,287.11743 * ky + ty,
        460.375 * kx + tx,286.33618 * ky + ty, 464.65625 * kx + tx,290.80493 * ky + ty,
        465.0625 * kx + tx,295.11743 * ky + ty, 464.28125 * kx + tx,297.05493 * ky + ty,
        457.625 * kx + tx,299.80493 * ky + ty, 457.53125 * kx + tx,303.21118 * ky + ty,
        457.4375 * kx + tx,306.42993 * ky + ty, 460.375 * kx + tx,309.77368 * ky + ty,

/*
        460.37500001 * kx + tx,309.77368 * ky + ty, 463.28125 * kx + tx,309.56275 * ky + ty,
        464.0625 * kx + tx,309.36743 * ky + ty, 464.06534 * kx + tx,309.36744 * ky + ty,
        464.09022 * kx + tx,309.36735 * ky + ty, 464.09375 * kx + tx,309.36743 * ky + ty,
        464.0967 * kx + tx,309.36736 * ky + ty, 464.12209 * kx + tx,309.36728 * ky + ty,
        464.125 * kx + tx,309.36743 * ky + ty, 464.12784 * kx + tx,309.36739 * ky + ty,
*/


        464.15269 * kx + tx,309.36755 * ky + ty, 464.15625 * kx + tx,309.36743 * ky + ty,
        464.15608 * kx + tx,309.3693 * ky + ty, 464.1562 * kx + tx,309.3917 * ky + ty,
        464.15625 * kx + tx,309.39868 * ky + ty, 464.1591 * kx + tx,309.39861 * ky + ty,
        464.18393 * kx + tx,309.3989 * ky + ty, 464.1875 * kx + tx,309.39868 * ky + ty,
        464.19264 * kx + tx,309.40331 * ky + ty, 464.21374 * kx + tx,309.42448 * ky + ty,
        464.21875 * kx + tx,309.42993 * ky + ty, 464.23155 * kx + tx,309.44637 * ky + ty,
        464.26544 * kx + tx,309.49673 * ky + ty, 464.28125 * kx + tx,309.52368 * ky + ty,

/*
        464.78377 * kx + tx,310.59893 * ky + ty, 464.46875 * kx + tx,316.58618 * ky + ty,
        464.4687500001 * kx + tx,316.58618 * ky + ty, 469.75 * kx + tx,319.71118 * ky + ty,
        470.53125 * kx + tx,322.46118 * ky + ty, 473.0625 * kx + tx,323.42993 * ky + ty,
        470.3125 * kx + tx,328.11743 * ky + ty, 471.3125 * kx + tx,329.67993 * ky + ty,
        470.71875 * kx + tx,332.99243 * ky + ty, 465.625 * kx + tx,334.96118 * ky + ty,
*/
        464.65625 * kx + tx,336.11743 * ky + ty, 462.125 * kx + tx,337.49243 * ky + ty,
        461.9375 * kx + tx,339.83618 * ky + ty, 459.78125 * kx + tx,339.83618 * ky + ty,
        457.625 * kx + tx,338.46118 * ky + ty, 451.78125 * kx + tx,340.80493 * ky + ty,
        451.84375 * kx + tx,340.92993 * ky + ty, 453.125 * kx + tx,343.74243 * ky + ty,
        454.125 * kx + tx,345.71118 * ky + ty, 457.03125 * kx + tx,346.67993 * ky + ty,
        457.8125 * kx + tx,352.52368 * ky + ty, 462.90625 * kx + tx,355.08618 * ky + ty,
        465.625 * kx + tx,354.67993 * ky + ty, 467.78125 * kx + tx,355.46118 * ky + ty,
        468.375 * kx + tx,361.11743 * ky + ty, 471.09375 * kx + tx,362.49243 * ky + ty,
        471.09375 * kx + tx,364.24243 * ky + ty, 468.96875 * kx + tx,364.05493 * ky + ty,
        466.625 * kx + tx,366.58618 * ky + ty, 467.1875 * kx + tx,369.33618 * ky + ty,
        463.6875 * kx + tx,373.05493 * ky + ty, 462.90625 * kx + tx,374.80493 * ky + ty,
        463.875 * kx + tx,377.33618 * ky + ty, 465.84375 * kx + tx,377.92993 * ky + ty,
        467.40625 * kx + tx,379.30493 * ky + ty, 464.65625 * kx + tx,379.67993 * ky + ty,
        464.65625 * kx + tx,383.58618 * ky + ty, 468.75 * kx + tx,386.11743 * ky + ty,
        468.75 * kx + tx,389.64868 * ky + ty, 471.6875 * kx + tx,389.64868 * ky + ty,
        476.78125 * kx + tx,391.02368 * ky + ty, 481.84375 * kx + tx,395.11743 * ky + ty,
        484.78125 * kx + tx,395.11743 * ky + ty, 493.96875 * kx + tx,391.80493 * ky + ty,
        496.875 * kx + tx,391.58618 * ky + ty, 497.65625 * kx + tx,394.14868 * ky + ty,
        498.65625 * kx + tx,395.89868 * ky + ty, 499.21875 * kx + tx,398.83618 * ky + ty,
        498.0625 * kx + tx,403.11743 * ky + ty, 493.75 * kx + tx,404.49243 * ky + ty,
        494.34375 * kx + tx,407.42993 * ky + ty, 491.40625 * kx + tx,409.96118 * ky + ty,
        493.375 * kx + tx,414.46118 * ky + ty, 489.84375 * kx + tx,416.58618 * ky + ty,
        489.65625 * kx + tx,418.74243 * ky + ty, 486.15625 * kx + tx,418.74243 * ky + ty,
        482.25 * kx + tx,422.27368 * ky + ty, 477.75 * kx + tx,422.64868 * ky + ty,
        477.5625 * kx + tx,428.71118 * ky + ty, 475.59375 * kx + tx,428.30493 * ky + ty,
        474.21875 * kx + tx,430.08618 * ky + ty, 470.3125 * kx + tx,429.30493 * ky + ty,
        470.125 * kx + tx,433.77368 * ky + ty, 466.8125 * kx + tx,437.49243 * ky + ty,
        461.15625 * kx + tx,438.27368 * ky + ty, 460.75 * kx + tx,441.39868 * ky + ty,
        459.1875 * kx + tx,443.55493 * ky + ty, 456.0625 * kx + tx,445.49243 * ky + ty,
        460.15625 * kx + tx,445.30493 * ky + ty, 460.15625 * kx + tx,450.39868 * ky + ty,
        457.03125 * kx + tx,451.74243 * ky + ty, 454.3125 * kx + tx,450.96118 * ky + ty,
        453.125 * kx + tx,452.74243 * ky + ty, 449.03125 * kx + tx,452.74243 * ky + ty,
        447.46875 * kx + tx,454.08618 * ky + ty, 447.09375 * kx + tx,456.64868 * ky + ty,
        445.71875 * kx + tx,457.61743 * ky + ty, 444.75 * kx + tx,456.42993 * ky + ty,
        443.5625 * kx + tx,456.05493 * ky + ty, 440.625 * kx + tx,455.08618 * ky + ty,
        438.09375 * kx + tx,456.83618 * ky + ty, 438.5 * kx + tx,459.36743 * ky + ty,
        439.65625 * kx + tx,460.55493 * ky + ty, 434.96875 * kx + tx,460.33618 * ky + ty,
        436.9375 * kx + tx,459.36743 * ky + ty, 437.125 * kx + tx,457.80493 * ky + ty,
        431.0625 * kx + tx,457.21118 * ky + ty, 427.5625 * kx + tx,459.36743 * ky + ty,
        425.59375 * kx + tx,460.74243 * ky + ty, 423.4375 * kx + tx,460.33618 * ky + ty,
        422.46875 * kx + tx,456.42993 * ky + ty, 418.96875 * kx + tx,454.86743 * ky + ty,
        417.96875 * kx + tx,453.52368 * ky + ty, 413.28125 * kx + tx,451.96118 * ky + ty,
        403.71875 * kx + tx,451.96118 * ky + ty, 404.90625 * kx + tx,450.58618 * ky + ty,
        405.6875 * kx + tx,448.61743 * ky + ty, 401.375 * kx + tx,448.42993 * ky + ty,
        404.5 * kx + tx,445.71118 * ky + ty, 403.90625 * kx + tx,443.92993 * ky + ty,
        401 * kx + tx,445.11743 * ky + ty, 389.84375 * kx + tx,444.92993 * ky + ty,
        388.09375 * kx + tx,441.21118 * ky + ty, 384.375 * kx + tx,439.64868 * ky + ty,
        382.03125 * kx + tx,441.58618 * ky + ty, 385.5625 * kx + tx,444.92993 * ky + ty,
        378.90625 * kx + tx,446.08618 * ky + ty, 370.53125 * kx + tx,444.33618 * ky + ty,
        372.46875 * kx + tx,441.02368 * ky + ty, 375.40625 * kx + tx,441.02368 * ky + ty,
        373.84375 * kx + tx,439.46118 * ky + ty, 365.625 * kx + tx,438.86743 * ky + ty,
        359.4375 * kx + tx,438.58618 * ky + ty, 357.03125 * kx + tx,438.46118 * ky + ty,
        352.5625 * kx + tx,438.67993 * ky + ty, 352.5625 * kx + tx,434.77368 * ky + ty,
        349.5625 * kx + tx,434.55493 * ky + ty, 346.875 * kx + tx,434.36743 * ky + ty,
        340.25 * kx + tx,439.05493 * ky + ty, 329.6875 * kx + tx,447.46118 * ky + ty,
        327.9375 * kx + tx,449.61743 * ky + ty, 322.46875 * kx + tx,449.80493 * ky + ty,
        321.6875 * kx + tx,451.55493 * ky + ty, 314.65625 * kx + tx,453.71118 * ky + ty,
        314.53125 * kx + tx,454.77368 * ky + ty, 314.28125 * kx + tx,456.83618 * ky + ty,
        312.3125 * kx + tx,458.77368 * ky + ty, 309.375 * kx + tx,461.11743 * ky + ty,
        306.0625 * kx + tx,457.99243 * ky + ty, 304.5 * kx + tx,460.55493 * ky + ty,
        306.46875 * kx + tx,463.46118 * ky + ty, 308.8125 * kx + tx,463.27368 * ky + ty,
        308.59375 * kx + tx,469.71118 * ky + ty, 308.75 * kx + tx,475.30493 * ky + ty,
        309.1875 * kx + tx,492.36743 * ky + ty, 311.9375 * kx + tx,493.55493 * ky + ty,
        313.5 * kx + tx,495.71118 * ky + ty, 313.5 * kx + tx,498.83618 * ky + ty,
        310.375 * kx + tx,498.61743 * ky + ty, 307.8125 * kx + tx,495.89868 * ky + ty,
        303.71875 * kx + tx,495.89868 * ky + ty, 300.78125 * kx + tx,496.86743 * ky + ty,
        298.84375 * kx + tx,499.39868 * ky + ty, 292.96875 * kx + tx,500.77368 * ky + ty,
        292.78125 * kx + tx,503.52368 * ky + ty, 291.625 * kx + tx,504.08618 * ky + ty,
        290.25 * kx + tx,503.11743 * ky + ty, 288.875 * kx + tx,503.11743 * ky + ty,
        287.3125 * kx + tx,505.08618 * ky + ty, 281.84375 * kx + tx,500.39868 * ky + ty,
        275.40625 * kx + tx,498.24243 * ky + ty, 271.3125 * kx + tx,499.02368 * ky + ty,
        267.96875 * kx + tx,503.11743 * ky + ty, 265.625 * kx + tx,503.52368 * ky + ty,
        262.5 * kx + tx,500.77368 * ky + ty, 262.3125 * kx + tx,497.27368 * ky + ty,
        256.46875 * kx + tx,495.71118 * ky + ty, 253.53125 * kx + tx,492.96118 * ky + ty,
        253.1875 * kx + tx,490.89868 * ky + ty, 252.5625 * kx + tx,487.30493 * ky + ty,
        243.96875 * kx + tx,486.11743 * ky + ty, 241.03125 * kx + tx,487.30493 * ky + ty,
        237.71875 * kx + tx,482.02368 * ky + ty, 229.3125 * kx + tx,482.42993 * ky + ty,
        226 * kx + tx,478.11743 * ky + ty, 223.4375 * kx + tx,478.11743 * ky + ty,
        217.40625 * kx + tx,476.96118 * ky + ty, 216.34375 * kx + tx,476.36743 * ky + ty,
        212.3125 * kx + tx,474.02368 * ky + ty, 209.59375 * kx + tx,473.61743 * ky + ty,
        209.1875 * kx + tx,483.21118 * ky + ty, 201.25 * kx + tx,482.67993 * ky + ty,
        197.46875 * kx + tx,482.42993 * ky + ty, 195.71875 * kx + tx,481.64868 * ky + ty,
        194.34375 * kx + tx,483.99243 * ky + ty, 190.625 * kx + tx,482.99243 * ky + ty,
        187.90625 * kx + tx,479.86743 * ky + ty, 181.46875 * kx + tx,482.61743 * ky + ty,
        178.90625 * kx + tx,482.61743 * ky + ty, 175.78125 * kx + tx,480.08618 * ky + ty,
        175.40625 * kx + tx,477.74243 * ky + ty, 171.5 * kx + tx,474.80493 * ky + ty,
        168.1875 * kx + tx,472.83618 * ky + ty, 167.6875 * kx + tx,473.11743 * ky + ty,
        164.28125 * kx + tx,474.99243 * ky + ty, 162.5 * kx + tx,475.96118 * ky + ty,
        161.53125 * kx + tx,474.99243 * ky + ty, 159.59375 * kx + tx,475.39868 * ky + ty,
        157.4375 * kx + tx,476.55493 * ky + ty, 155.46875 * kx + tx,474.21118 * ky + ty,
        150.40625 * kx + tx,470.30493 * ky + ty, 150 * kx + tx,466.21118 * ky + ty,
        142.59375 * kx + tx,466.21118 * ky + ty, 138.09375 * kx + tx,463.46118 * ky + ty,
        133.40625 * kx + tx,462.67993 * ky + ty, 131.84375 * kx + tx,460.55493 * ky + ty,
        128.34375 * kx + tx,460.55493 * ky + ty, 126.96875 * kx + tx,458.58618 * ky + ty,
        127.15625 * kx + tx,456.05493 * ky + ty, 125.40625 * kx + tx,457.99243 * ky + ty,
        124.8125 * kx + tx,460.92993 * ky + ty, 121.6875 * kx + tx,459.96118 * ky + ty,
        119.9375 * kx + tx,457.99243 * ky + ty, 120.125 * kx + tx,456.24243 * ky + ty,
        122.875 * kx + tx,454.86743 * ky + ty, 122.875 * kx + tx,451.17993 * ky + ty,
        124.21875 * kx + tx,449.99243 * ky + ty, 123.65625 * kx + tx,447.64868 * ky + ty,
        121.3125 * kx + tx,447.05493 * ky + ty, 117.59375 * kx + tx,445.49243 * ky + ty,
        116.8125 * kx + tx,447.27368 * ky + ty, 114.0625 * kx + tx,447.05493 * ky + ty,
        113.875 * kx + tx,444.52368 * ky + ty, 110.375 * kx + tx,444.33618 * ky + ty,
        108.03125 * kx + tx,442.17993 * ky + ty, 108.03125 * kx + tx,440.02368 * ky + ty,
        110.5625 * kx + tx,439.64868 * ky + ty, 114.0625 * kx + tx,438.27368 * ky + ty,
        118.5625 * kx + tx,432.80493 * ky + ty, 119.375 * kx + tx,431.36743 * ky + ty,
        122.28125 * kx + tx,426.36743 * ky + ty, 123.4375 * kx + tx,421.67993 * ky + ty,
        124.8125 * kx + tx,415.02368 * ky + ty, 129.3125 * kx + tx,397.83618 * ky + ty,
        132.79688 * kx + tx,379.17993 * ky + ty, 132.8125 * kx + tx,374.61743 * ky + ty,
        134.96875 * kx + tx,371.67993 * ky + ty, 135.375 * kx + tx,368.74243 * ky + ty,
        137.3125 * kx + tx,367.96118 * ky + ty, 138.09375 * kx + tx,369.14868 * ky + ty,
        142.96875 * kx + tx,368.92993 * ky + ty, 141.8125 * kx + tx,367.36743 * ky + ty,
        141.40625 * kx + tx,366.21118 * ky + ty, 137.5 * kx + tx,362.67993 * ky + ty,
        134.78125 * kx + tx,366.21118 * ky + ty, 133.40625 * kx + tx,370.71118 * ky + ty,
        133.59375 * kx + tx,367.36743 * ky + ty, 135.375 * kx + tx,354.49243 * ky + ty,
        137.90625 * kx + tx,337.89868 * ky + ty, 138.875 * kx + tx,321.49243 * ky + ty,
        142 * kx + tx,316.80493 * ky + ty, 143.96875 * kx + tx,316.99243 * ky + ty,
        143.75 * kx + tx,321.08618 * ky + ty, 153.71875 * kx + tx,330.08618 * ky + ty,
        156.46875 * kx + tx,340.80493 * ky + ty, 157.4375 * kx + tx,345.49243 * ky + ty,
        158.40625 * kx + tx,343.92993 * ky + ty, 158.03125 * kx + tx,338.27368 * ky + ty,
        156.65625 * kx + tx,332.61743 * ky + ty, 156.375 * kx + tx,331.36743 * ky + ty,
        154.90625 * kx + tx,324.61743 * ky + ty, 148.65625 * kx + tx,318.36743 * ky + ty,
        146.5 * kx + tx,317.96118 * ky + ty, 146.3125 * kx + tx,316.02368 * ky + ty,
        143.5625 * kx + tx,314.46118 * ky + ty, 139.46875 * kx + tx,311.11743 * ky + ty,
        137.125 * kx + tx,311.33618 * ky + ty, 136.71875 * kx + tx,307.02368 * ky + ty,
        135.9375 * kx + tx,302.74243 * ky + ty, 135.5625 * kx + tx,299.02368 * ky + ty,
        131.0625 * kx + tx,295.71118 * ky + ty, 131.46875 * kx + tx,288.86743 * ky + ty,
        134.1875 * kx + tx,292.17993 * ky + ty, 137.5 * kx + tx,292.58618 * ky + ty,
        137.90625 * kx + tx,297.27368 * ky + ty, 138.875 * kx + tx,298.05493 * ky + ty,
        139.46875 * kx + tx,299.39868 * ky + ty, 137.71875 * kx + tx,301.74243 * ky + ty,
        138.09375 * kx + tx,303.30493 * ky + ty, 140.84375 * kx + tx,303.30493 * ky + ty,
        140.25 * kx + tx,302.33618 * ky + ty, 140.0625 * kx + tx,299.61743 * ky + ty,
        142.40625 * kx + tx,299.80493 * ky + ty, 143.375 * kx + tx,295.49243 * ky + ty,
        141.625 * kx + tx,292.96118 * ky + ty, 142.40625 * kx + tx,291.80493 * ky + ty,
        144.75 * kx + tx,292.17993 * ky + ty, 144.9375 * kx + tx,290.02368 * ky + ty,
        143.1875 * kx + tx,289.24243 * ky + ty, 142.1875 * kx + tx,286.52368 * ky + ty,
        139.46875 * kx + tx,285.92993 * ky + ty, 138.6875 * kx + tx,284.17993 * ky + ty,
        134.59375 * kx + tx,284.36743 * ky + ty, 132.4375 * kx + tx,282.61743 * ky + ty,
        129.6875 * kx + tx,280.86743 * ky + ty, 126.96875 * kx + tx,280.86743 * ky + ty,
        124.8125 * kx + tx,277.74243 * ky + ty, 128.125 * kx + tx,276.55493 * ky + ty,
        130.46875 * kx + tx,278.11743 * ky + ty, 130.875 * kx + tx,280.08618 * ky + ty,
        134.78125 * kx + tx,280.46118 * ky + ty, 136.34375 * kx + tx,282.21118 * ky + ty,
        139.28125 * kx + tx,281.83618 * ky + ty, 139.65625 * kx + tx,279.86743 * ky + ty,
        142.78125 * kx + tx,277.33618 * ky + ty, 141.34375 * kx + tx,276.02368 * ky + ty,
        140.25 * kx + tx,274.99243 * ky + ty, 140.0625 * kx + tx,277.74243 * ky + ty,
        135.75 * kx + tx,275.58618 * ky + ty, 133.8125 * kx + tx,272.64868 * ky + ty,
        129.5 * kx + tx,272.64868 * ky + ty, 127.75 * kx + tx,268.74243 * ky + ty,
        123.25 * kx + tx,268.74243 * ky + ty, 119.34375 * kx + tx,264.83618 * ky + ty,
        115.4375 * kx + tx,262.89868 * ky + ty, 111.71875 * kx + tx,251.74243 * ky + ty,
        109.96875 * kx + tx,251.74243 * ky + ty, 110.15625 * kx + tx,249.99243 * ky + ty,
        104.125 * kx + tx,244.14868 * ky + ty, 104.3125 * kx + tx,239.46118 * ky + ty,
        110.25 * kx + tx,231.80493 * ky + ty, 105.28125 * kx + tx,226.96118 * ky + ty,
        101 * kx + tx,227.74243 * ky + ty, 100.59375 * kx + tx,224.80493 * ky + ty,
        102.9375 * kx + tx,224.80493 * ky + ty, 105.09375 * kx + tx,222.64868 * ky + ty,
        104.3125 * kx + tx,220.89868 * ky + ty, 104.125 * kx + tx,218.92993 * ky + ty,
        107.625 * kx + tx,217.17993 * ky + ty, 104.3125 * kx + tx,217.17993 * ky + ty,
        101.78125 * kx + tx,219.92993 * ky + ty, 98.25 * kx + tx,219.92993 * ky + ty,
        96.09375 * kx + tx,217.17993 * ky + ty, 95.71875 * kx + tx,218.74243 * ky + ty,
        92 * kx + tx,217.96118 * ky + ty, 89.84375 * kx + tx,216.80493 * ky + ty,
        91.8125 * kx + tx,214.05493 * ky + ty, 91.03125 * kx + tx,212.49243 * ky + ty,
        90.25 * kx + tx,211.71118 * ky + ty, 93.96875 * kx + tx,208.39868 * ky + ty,
        92.78125 * kx + tx,207.57056 * ky + ty, 92.40625 * kx + tx,205.64868 * ky + ty,
        93.75 * kx + tx,204.49243 * ky + ty, 91.03125 * kx + tx,203.89868 * ky + ty,
        80.46875 * kx + tx,204.86743 * ky + ty, 78.71875 * kx + tx,202.14868 * ky + ty,
        76.375 * kx + tx,201.36743 * ky + ty, 77.9375 * kx + tx,199.39868 * ky + ty,
        80.875 * kx + tx,200.77368 * ky + ty, 83.40625 * kx + tx,201.55493 * ky + ty,
        84.375 * kx + tx,199.99243 * ky + ty, 82.4375 * kx + tx,197.64868 * ky + ty,
        79.90625 * kx + tx,197.05493 * ky + ty, 80.46875 * kx + tx,198.42993 * ky + ty,
        77.75 * kx + tx,198.83618 * ky + ty, 75.59375 * kx + tx,195.89868 * ky + ty,
        76.78125 * kx + tx,198.61743 * ky + ty, 75.59375 * kx + tx,200.58618 * ky + ty,
        73.0625 * kx + tx,198.42993 * ky + ty, 72.46875 * kx + tx,197.05493 * ky + ty,
        71.6875 * kx + tx,199.39868 * ky + ty, 69.34375 * kx + tx,198.83618 * ky + ty,
        69.34375 * kx + tx,202.33618 * ky + ty, 70.53125 * kx + tx,203.89868 * ky + ty,
        69.34375 * kx + tx,205.27368 * ky + ty, 67 * kx + tx,203.52368 * ky + ty,
        67.40625 * kx + tx,200.96118 * ky + ty, 67.78125 * kx + tx,198.42993 * ky + ty,
        66.625 * kx + tx,196.27368 * ky + ty, 63.09375 * kx + tx,192.77368 * ky + ty,
        60.375 * kx + tx,191.58618 * ky + ty, 60.9375 * kx + tx,189.46118 * ky + ty,
        59.78125 * kx + tx,191.21118 * ky + ty, 56.65625 * kx + tx,190.42993 * ky + ty,
        54.390625 * kx + tx,186.82056 * ky + ty, 51.78125 * kx + tx,186.71118 * ky + ty,
        48.4375 * kx + tx,186.11743 * ky + ty, 47.09375 * kx + tx,184.17993 * ky + ty,
        46.875 * kx + tx,185.33618 * ky + ty, 41.40625 * kx + tx,184.96118 * ky + ty,
        38.875 * kx + tx,180.86743 * ky + ty, 38.09375 * kx + tx,177.52368 * ky + ty,
        38.09375 * kx + tx,180.86743 * ky + ty, 36.15625 * kx + tx,181.24243 * ky + ty,
        33.03125 * kx + tx,179.49243 * ky + ty, 31.25 * kx + tx,179.67993 * ky + ty,
        29.5 * kx + tx,178.89868 * ky + ty, 31.25 * kx + tx,181.24243 * ky + ty,
        30.28125 * kx + tx,182.99243 * ky + ty, 25.78125 * kx + tx,183.21118 * ky + ty,
        21.6875 * kx + tx,182.42993 * ky + ty, 23.0625 * kx + tx,179.67993 * ky + ty,
        22.09375 * kx + tx,174.61743 * ky + ty, 17.96875 * kx + tx,169.92993 * ky + ty,
        15.4375 * kx + tx,170.11743 * ky + ty, 13.6875 * kx + tx,168.55493 * ky + ty,
        11.53125 * kx + tx,168.74243 * ky + ty, 9.59375 * kx + tx,167.58618 * ky + ty,
        10.9375 * kx + tx,165.80493 * ky + ty, 17.59375 * kx + tx,165.42993 * ky + ty,
        21.5 * kx + tx,164.83618 * ky + ty, 23.84375 * kx + tx,164.83618 * ky + ty,
        26.375 * kx + tx,165.02368 * ky + ty, 27.5625 * kx + tx,162.89868 * ky + ty,
        26.78125 * kx + tx,159.77368 * ky + ty, 24.8125 * kx + tx,159.36743 * ky + ty,
        20.71875 * kx + tx,157.02368 * ky + ty, 18.5625 * kx + tx,160.33618 * ky + ty,
        17.59375 * kx + tx,161.11743 * ky + ty, 17.78125 * kx + tx,155.86743 * ky + ty,
        14.28125 * kx + tx,154.67993 * ky + ty, 17 * kx + tx,151.55493 * ky + ty,
        21.5 * kx + tx,153.71118 * ky + ty, 25.21875 * kx + tx,154.67993 * ky + ty,
        29.90625 * kx + tx,154.86743 * ky + ty, 30.09375 * kx + tx,153.71118 * ky + ty,
        25.78125 * kx + tx,153.52368 * ky + ty, 26.5625 * kx + tx,150.77368 * ky + ty,
        22.65625 * kx + tx,152.52368 * ky + ty, 22.28125 * kx + tx,150.58618 * ky + ty,
        26.5625 * kx + tx,146.49243 * ky + ty, 21.6875 * kx + tx,149.99243 * ky + ty,
        14.28125 * kx + tx,150.96118 * ky + ty, 13.6875 * kx + tx,150.17993 * ky + ty,
        12.5 * kx + tx,151.36743 * ky + ty, 9.375 * kx + tx,150.96118 * ky + ty,
        10.15625 * kx + tx,146.67993 * ky + ty, 9.1875 * kx + tx,144.92993 * ky + ty,
        12.3125 * kx + tx,142.36743 * ky + ty, 9.96875 * kx + tx,140.61743 * ky + ty,
        12.71875 * kx + tx,137.30493 * ky + ty, 17.96875 * kx + tx,137.11743 * ky + ty,
        18.375 * kx + tx,134.77368 * ky + ty, 19.9375 * kx + tx,133.99243 * ky + ty,
        21.3125 * kx + tx,134.96118 * ky + ty, 24.4375 * kx + tx,134.77368 * ky + ty,
        24.4375 * kx + tx,133.39868 * ky + ty, 28.90625 * kx + tx,132.80493 * ky + ty,
        29.3125 * kx + tx,134.96118 * ky + ty, 31.84375 * kx + tx,134.36743 * ky + ty,
        32.625 * kx + tx,132.42993 * ky + ty, 36.9375 * kx + tx,132.02368 * ky + ty,
        39.28125 * kx + tx,132.99243 * ky + ty, 41.40625 * kx + tx,130.64868 * ky + ty,
        41.8125 * kx + tx,135.14868 * ky + ty, 44.15625 * kx + tx,134.77368 * ky + ty,
        44.53125 * kx + tx,136.52368 * ky + ty, 46.09375 * kx + tx,136.52368 * ky + ty,
        46.09375 * kx + tx,132.61743 * ky + ty, 51.5625 * kx + tx,132.42993 * ky + ty,
        54.84375 * kx + tx,134.33618 * ky + ty, 57.625 * kx + tx,130.64868 * ky + ty,
        56.0625 * kx + tx,128.52368 * ky + ty, 60.15625 * kx + tx,125.77368 * ky + ty,
        63.28125 * kx + tx,128.11743 * ky + ty, 64.28125 * kx + tx,126.74243 * ky + ty,
        68.75 * kx + tx,126.17993 * ky + ty, 70.53125 * kx + tx,124.80493 * ky + ty,
        71.6875 * kx + tx,127.52368 * ky + ty, 72.28125 * kx + tx,125.58618 * ky + ty,
        76.1875 * kx + tx,125.58618 * ky + ty, 76 * kx + tx,127.74243 * ky + ty,
        78.125 * kx + tx,127.92993 * ky + ty, 77.9375 * kx + tx,131.05493 * ky + ty,
        80.6875 * kx + tx,131.64868 * ky + ty, 80.6875 * kx + tx,134.96118 * ky + ty,
        84.375 * kx + tx,137.67993 * ky + ty, 84 * kx + tx,141.21118 * ky + ty,
        88.09375 * kx + tx,143.14868 * ky + ty, 88.09375 * kx + tx,146.67993 * ky + ty,
        89.65625 * kx + tx,146.67993 * ky + ty, 89.65625 * kx + tx,144.71118 * ky + ty,
        96.875 * kx + tx,140.80493 * ky + ty, 98.0625 * kx + tx,138.46118 * ky + ty,
        101.5625 * kx + tx,139.05493 * ky + ty, 103.90625 * kx + tx,137.30493 * ky + ty,
        103.90625 * kx + tx,141.21118 * ky + ty, 105.28125 * kx + tx,139.64868 * ky + ty,
        107.25 * kx + tx,140.24243 * ky + ty, 107.4375 * kx + tx,142.96118 * ky + ty,
        109.78125 * kx + tx,142.77368 * ky + ty, 110.15625 * kx + tx,140.61743 * ky + ty,
        113.875 * kx + tx,141.02368 * ky + ty, 115.125 * kx + tx,139.61743 * ky + ty,
        117 * kx + tx,137.49243 * ky + ty, 121.6875 * kx + tx,137.67993 * ky + ty,
        119.34375 * kx + tx,140.80493 * ky + ty, 122.875 * kx + tx,142.96118 * ky + ty,
        132.46875 * kx + tx,142.96118 * ky + ty, 136.15625 * kx + tx,142.96118 * ky + ty,
        138.28125 * kx + tx,141.99243 * ky + ty, 137.90625 * kx + tx,140.02368 * ky + ty,
        133.59375 * kx + tx,139.05493 * ky + ty, 130.875 * kx + tx,132.02368 * ky + ty,
        133.40625 * kx + tx,126.96118 * ky + ty, 133.40625 * kx + tx,121.49243 * ky + ty,
        131.0625 * kx + tx,116.80493 * ky + ty, 131.0625 * kx + tx,109.77368 * ky + ty,
        130.09375 * kx + tx,108.39868 * ky + ty, 129.125 * kx + tx,103.89868 * ky + ty,
        124.625 * kx + tx,98.836183 * ky + ty, 123.25 * kx + tx,95.711183 * ky + ty,
        123.65625 * kx + tx,91.992433 * ky + ty, 123.0625 * kx + tx,91.586183 * ky + ty,
        122.09375 * kx + tx,90.617433 * ky + ty, 123.65625 * kx + tx,88.679933 * ky + ty,
        123.65625 * kx + tx,84.367433 * ky + ty, 119.53125 * kx + tx,81.054933 * ky + ty,
        120.3125 * kx + tx,79.086183 * ky + ty, 127.5625 * kx + tx,81.242433 * ky + ty,
        132.625 * kx + tx,84.554933 * ky + ty, 137.125 * kx + tx,81.429933 * ky + ty,
        145.53125 * kx + tx,81.836183 * ky + ty, 147.46875 * kx + tx,87.117433 * ky + ty,
        145.3125 * kx + tx,87.117433 * ky + ty, 143.75 * kx + tx,91.023683 * ky + ty,
        148.84375 * kx + tx,97.054933 * ky + ty, 149.03125 * kx + tx,101.74243 * ky + ty,
        150.875 * kx + tx,101.27368 * ky + ty, 156.65625 * kx + tx,99.804933 * ky + ty,
        160.375 * kx + tx,101.74243 * ky + ty, 176.375 * kx + tx,104.08618 * ky + ty,
        183.03125 * kx + tx,107.80493 * ky + ty, 191.40625 * kx + tx,104.49243 * ky + ty,
        198.84375 * kx + tx,100.17993 * ky + ty, 203.40625 * kx + tx,99.367433 * ky + ty
        ]);

    }
};

var app = null; // please keep here for interactive debugging
$(window).load(function() { app = new Application(); });

