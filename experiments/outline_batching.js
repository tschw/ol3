
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
          //  fragShaderSourceBuilder.push('#define PREMULTIPLY_BY_ALPHA 1');
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
            vbuf: this.gl.buffer(this._expandLine(this._LINE_COORDS1, 0.0625)),
            ibuf: null,
            tess: goog.webgl.TRIANGLE_STRIP,
            n: this._LINE_COORDS1.length });

        this._models.push({
            vbuf: this.gl.buffer(this._expandLine(this._LINE_COORDS1, 0.0625, true)),
            ibuf: null,
            tess: goog.webgl.TRIANGLE_STRIP,
            n: this._LINE_COORDS1.length + 2 });

        var nFirst = this._LINE_COORDS1.length * 3; 
        var vertices = new Float32Array(nFirst + 6 + this._LINE_COORDS2.length * 3 + 6);
        this._expandLine(this._LINE_COORDS1, 0.0625, false, vertices);
        for (var i = nFirst, n = nFirst + 6; i < n; ++i) vertices[i] = 3.0;
        this._expandLine(this._LINE_COORDS2, 0.0625, true, vertices, nFirst + 6);
        this._models.push({
            vbuf: this.gl.buffer(vertices),
            ibuf: null,
            tess: goog.webgl.TRIANGLE_STRIP,
            n: this._LINE_COORDS1.length + 2 + this._LINE_COORDS2.length + 2});
    },

    _polyShaderDesc: function(prog) {
        var result = { glObject: prog };
        var gl = this.gl.context;

        // Query vertex attributes
        result.attrPosition = gl.getAttribLocation(prog, 'Position');
        result.attrControl = gl.getAttribLocation(prog, 'Control');

        // Query uniforms

        result.uniRotation = gl.getUniformLocation(prog, 'Rotation');
        result.uniFillColor = gl.getUniformLocation(prog, 'FillColor');
        result.uniStrokeColor = gl.getUniformLocation(prog, 'StrokeColor');
        result.uniRenderParams = gl.getUniformLocation(prog, 'RenderParams');
        result.uniScale = gl.getUniformLocation(prog, 'Scale');
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
        var lineWidth = $('#line-width').slider('value');
        var antiAliasing = $('#anti-aliasing').slider('value');
        var gamma = $('#gamma').slider('value');
        var modelIndex = $('#model').val();
        var programIndex = $('#program').val();


        var gl = this.gl.context;
        var program = this._programs[programIndex];

        // Enable blending.
        gl.enable(goog.webgl.BLEND);
        gl.blendFunc(goog.webgl.SRC_ALPHA, goog.webgl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(this._programs[programIndex].glObject); 

        // Setup rotation matrix.
        var cosA = Math.cos(angle), sinA = Math.sin(angle);
        gl.uniformMatrix2fv(program.uniRotation, false, [ cosA, sinA, -sinA, cosA ]);

        // Set uniforms.
        gl.uniform4f(program.uniFillColor, 0.0, 0.0, 1.0, 1.0);
        gl.uniform4f(program.uniStrokeColor, 1.0, 0.8, 0.1, 1.0);
        gl.uniform4f(program.uniRenderParams, lineWidth, antiAliasing, gamma, 1/gamma);
        gl.uniform2f(program.uniScale, 1/50, 1/10); // TODO make sure this stuff is proper

        // Setup buffers and render
        var model = this._models[modelIndex];
        gl.bindBuffer(goog.webgl.ARRAY_BUFFER, model.vbuf);
        gl.enableVertexAttribArray(program.attrPosition);
        gl.vertexAttribPointer(program.attrPosition, 2, gl.FLOAT, false, 12, 0);
        gl.enableVertexAttribArray(program.attrControl);
        gl.vertexAttribPointer(program.attrControl, 1, gl.FLOAT, false, 12, 8);

        gl.drawArrays(model.tess, 0, model.n);

        gl.disableVertexAttribArray(program.attrPosition);
        gl.disableVertexAttribArray(program.attrControl);

        // Disable blending
        gl.disable(goog.webgl.BLEND);
    },

    _expandLine: function(coords, width, opt_ring, opt_dest, opt_dest_offset) {

        width *= 0.5;

        var result = opt_dest || new Float32Array(coords.length * 3 + (!opt_ring ? 0 : 6));
        var k = opt_dest_offset || 0;

        // original first position (need this wrapping around on the last)
        var firstX = coords[0], firstY = coords[1];

        // first vertex to consider (starting with the last)
        var iLast = coords.length - 2;
        var fromX, fromY ,n0X, n0Y;
        if (! opt_ring) {
            fromX = firstX, fromY = firstY;
            firstX = coords[2], firstY = coords[3];
        } else {
            fromX = coords[iLast], fromY = coords[iLast + 1];
        }
        // first normal
        var n0X = firstY - fromY, n0Y = fromX - firstX;
        var f = 1 / Math.sqrt(n0X * n0X + n0Y * n0Y); // 1 / len(n0)
        n0X *= f; n0Y *= f;

        var hereX, hereY, toX, toY, n1X, n1Y;

        var ctrl = !opt_ring ? 0 : 4;
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
            f = 1 / Math.sqrt(n0X * n0X + n0Y * n0Y); // 1 / len(n0)
            n0X *= f; n0Y *= f;

            // move position by amount and underestimation factor
            f = width / (n0X * n1X + n0Y * n1Y); // width / dot(n0,n1)
            n0X *= f; n0Y *= f;
            result[k++] = hereX - n0X;
            result[k++] = hereY - n0Y;
            result[k++] = ctrl;
            result[k++] = hereX + n0X;
            result[k++] = hereY + n0Y;
            result[k++] = ctrl + 2;

            // use now-changed vertex position and one normal in next iteration
            fromX = hereX; fromY = hereY;
            n0X = n1X; n0Y = n1Y;

            ctrl = 4;
        }

        // once again for the special, last vertex (look ahead wraps around)

        hereX = coords[iLast]; hereY = coords[iLast+1]; 

        if (! opt_ring) {

            ctrl = 8;
            n0X *= width; n0Y *= width;
            result[k++] = hereX - n0X;
            result[k++] = hereY - n0Y;
            result[k++] = ctrl;
            result[k++] = hereX + n0X;
            result[k++] = hereY + n0Y;
            result[k++] = ctrl + 2;

        } else {

            // looking ahead means wrapping around

            n1X = firstY - hereY, n1Y = hereX - firstX;
            f = 1 / Math.sqrt(n1X * n1X + n1Y * n1Y); // 1 / len(n1)
            n1X *= f; n1Y *= f;

            n0X += n1X; n0Y += n1Y;
            f = 1 / Math.sqrt(n0X * n0X + n0Y * n0Y); // 1 / len(n0)
            n0X *= f; n0Y *= f;

            f = width / (n0X * n1X + n0Y * n1Y); // width / dot(n0,n1)
            n0X *= f; n0Y *= f;

            result[k++] = hereX - n0X;
            result[k++] = hereY - n0Y;
            result[k++] = ctrl;
            result[k++] = hereX + n0X;
            result[k++] = hereY + n0Y;
            result[k++] = ctrl + 2;
            // repeat first vertex
            var j = opt_dest_offset || 0;
            for (var i = 0; i < 6; ++i) {
                result[k++] = result[j++];
            }
        }
        return result;
    },

    _LINE_COORDS1: [ 
        0, -0.5,   0, 0,   0.25, 0.25,   0.25, 0.5,   0, 0.7,   0, 0.5,   -0.25, 0.4
    ],

    _LINE_COORDS2: [
        -0.75,-0.5,   -0.5,-0.5,   -0.625,0.0
    ],

    _expandOutline: function(coords, amount) {

        // TODO this routine is not yet referenced and probably full of
        // errors

        // We derive the normals of two subsequent edges along the polygon
        // to use the sum of their independent directions to translate the
        // coordinates, making room for stroke outline + anti aliasing.
        // We assume counter-clockwise orientation thus rotate clockwise 
        // (x', y') = (y, -x)

        // original first position (need this wrapping around on the last)
        var firstX = coords[0], firstY = coords[1];

        // first vertex to consider (starting with the last)
        var iLast = coords.length - 2;
        var fromX = coords[iLast], fromY = coords[iLast + 1];
        // first normal
        var n0X = firstY - fromY, n0Y = fromX - firstX;
        var f = 1 / sqrt(n0X * n0X + n0Y * n0Y);
        n0X *= f; n0Y *= f;

        var hereX, hereY, toX, toY, n1X, n1Y;

        for (var i = 0; i < iLast; i += 2) {

            // fetch coordinates: from -> here -> to
            hereX = coords[i]; hereY = coords[i+1]; 
            toX = coords[i+2]; toY = coords[i+3];

            // calculate normal of here -> to
            n1X = toY - hereY, n1Y = hereX - toX;
            f = 1 / Math.sqrt(n1X * n1X + n1Y * n1Y);
            n1X *= f; n1Y *= f;

            // create halfway normal for the direction
            n0X += n1X; n0Y += n1Y;
            f = 1 / Math.sqrt(n0X * n0X + n0Y * n0Y);
            n0X *= f; n0Y *= f;

            // move position by amount and underestimation factor
            f = 1 / (n0X * n1X + n0Y * n1Y); 
            coords[i] += amount * n0X * f;
            coords[i + 1] += amount * n0Y * f;

            // use now-changed vertex position and one normal in next iteration
            fromX = hereX; fromY = hereY;
            n0X = n1X; n0Y = n1Y;
        }

        // once again for the special, last vertex (look ahead wraps around)
        hereX = coords[iLast]; hereY = coords[iLast+1]; 

        n1X = firstY - hereY, n1Y = hereX - firstX;
        f = 1 / sqrt(n1X * n1X + n1Y * n1Y);
        n1X *= f; n1Y *= f;

        n0X += n1X; n0Y += n1Y;
        f = 1 / Math.sqrt(n0X * n0X + n0Y * n0Y);
        n0X *= f; n0Y *= f;

        f = 1 / (n0X * n1X + n0Y * n1Y); 
        coords[iLast] += amount * n0X * f;
        coords[iLast + 1] += amount * n0Y  * f;
    },


    // UI

    _setupUserInterface: function() {

        $('#rotation-angle').slider({min: 0, max: Math.PI * 2, value: 0.125, step: 0.0001 });
        $('#rotation-speed').slider({min: 0, max: 1, value: 0, step: 0.0001 });
        $('#line-width').slider({min: 0.0001, max: 5, value: 1.5, step: 0.0001});
        $('#anti-aliasing').slider({min: 0, max: 5, value: 1.5, step: 0.0001});
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

        this.gl.context.viewpoert($(this).width(), $(this).height());
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

