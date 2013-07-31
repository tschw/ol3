
goog.webgl = null;

function Application() { 

    // WebGL initialization
    if (ol.webglnew.WebGL.available()) {

        var gl = new ol.webglnew.WebGL($('#webgl-canvas')[0]);
        if (gl != null) this.gl = gl;
        else $('#app-panel,#webgl-init-failed').toggleClass('invisible');
    }
    else $('#app-panel,#webgl-unavailable').toggleClass('invisible');
    if (! this.gl) throw 'WebGL initialization failed';


    // Configure rendering
    var gl = this.gl.context;
    goog.webgl = gl; // TODO: unhack

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
        var fragShaderSource = [ '#version 100',
            '#define PREMULTIPLY_BY_ALPHA ' + 
                    (gl.getContextAttributes().premultipliedAlpha ? '0' : '1'),
            $('#webgl-poly-frag').text() ].join('\n');

        this._polyProgram = this.gl.linkProgram($('#webgl-poly-vert').text(),
                                                fragShaderSource);

        this._polyAttrPosition = gl.getAttribLocation(this._polyProgram, 'Position');
        this._polyPosition = this.gl.buffer(new Float32Array([  0, -0.25,  0.25, 0.25,  -0.25, 0.25,  0, 0.5,  -0.5,0.5,  0,0.7, -0.7, 0.7]));
        this._polyAttrSurfaceScale = gl.getAttribLocation(this._polyProgram, 'SurfaceScale');
        // TODO inaccurate total guesstimation, here - derive automatically
        var a = 1/50;
        this._polySurfaceScale = this.gl.buffer(new Float32Array([
                a,a, a,a, a,a, a,a, a,a, a,a ]));
        this._polyAttrControl = gl.getAttribLocation(this._polyProgram, 'Control');
        // Control: Two two-bit surface coordinates. 
        // Edges are drawn at 0 and 2, 1 describes an inner edge.
        // If the lower value is 3, the triangle is invalidated and not drawn 
        this._polyControl = this.gl.buffer(new Float32Array([ 0,   8,   2,   8,   2,   0 ]));

        this._polyUniRotation = gl.getUniformLocation(this._polyProgram, 'Rotation');
        this._polyUniFillColor = gl.getUniformLocation(this._polyProgram, 'FillColor');
        this._polyUniStrokeColor = gl.getUniformLocation(this._polyProgram, 'StrokeColor');
        this._polyUniRenderParams = gl.getUniformLocation(this._polyProgram, 'RenderParams');
    },

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
            f = 1 / sqrt(n1X * n1X + n1Y * n1Y);
            n1X *= f; n1Y *= f;

            // translate by sum of indepdendent directions
            f = n0X * n1X + n0Y + n1Y; // dot(n1,n2)
            coords[i] += amount * (n0X + n1X - n1X * f);
            coords[i + 1] += amount * (n0Y + n1Y - n1Y * f);

            // use now-changed vertex position and one normal in next iteration
            fromX = hereX; fromY = hereY;
            n0X = n1X; n0Y = n1Y;
        }

        // once again for the special, last vertex (look ahead wraps around)
        {
            hereX = coords[iLast]; hereY = coords[iLast+1]; 

            n1X = firstY - hereY, n1Y = hereX - firstX;
            f = 1 / sqrt(n1X * n1X + n1Y * n1Y);
            n1X *= f; n1Y *= f;

            f = n0X * n1X + n0Y + n1Y; // dot(n1,n2)
            coords[iLast] += amount * (n0X + n1X - n1X * f);
            coords[iLast + 1] += amount * (n0Y + n1Y - n1Y * f);
        }

    },

    _renderPolys: function() {

        var lineWidth = $('#line-width').slider('value');
        var antiAliasing = $('#anti-aliasing').slider('value');
        var angle = $('#rotation-angle').slider('value');
        var angleAnim = $('#rotation-speed').slider('value');

        if (angleAnim > 0) {
            angle = (angle + angleAnim * this._timeSlicer.dt) % (Math.PI * 2);

            $('#rotation-angle').slider('value', angle);
        }

        var gl = this.gl.context;
        gl.enable(goog.webgl.BLEND);
        gl.blendFunc(goog.webgl.SRC_ALPHA, goog.webgl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(this._polyProgram);

        var cosA = Math.cos(angle), sinA = Math.sin(angle);
        gl.uniformMatrix2fv(this._polyUniRotation, false, [ cosA, sinA, -sinA, cosA ]);
        gl.uniform4f(this._polyUniFillColor, 0.0, 0.0, 1.0, 1.0);
        gl.uniform4f(this._polyUniStrokeColor, 1.0, 0.8, 0.1, 1.0);
        gl.uniform4f(this._polyUniRenderParams, lineWidth, antiAliasing, 0, 0);

        gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this._polyPosition);
        gl.enableVertexAttribArray(this._polyAttrPosition);
        gl.vertexAttribPointer(this._polyAttrPosition, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this._polySurfaceScale);
        gl.enableVertexAttribArray(this._polyAttrSurfaceScale);
        gl.vertexAttribPointer(this._polyAttrSurfaceScale, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this._polyControl);
        gl.enableVertexAttribArray(this._polyAttrControl);
        gl.vertexAttribPointer(this._polyAttrControl, 1, gl.FLOAT, false, 0, 0);

        gl.drawArrays(goog.webgl.TRIANGLE_STRIP, 0, 6);

        gl.disableVertexAttribArray(2);
        gl.disableVertexAttribArray(1);
        gl.disableVertexAttribArray(0);

        gl.disable(goog.webgl.BLEND);
    },


    // UI

    _setupUserInterface: function() {

        $('#rotation-angle').slider({min: 0, max: Math.PI * 2, value: 0.125, step: 0.0001 });
        $('#rotation-speed').slider({min: 0, max: 1, value: 0, step: 0.0001 });
        $('#line-width').slider({min: 0.0001, max: 5, value: 1.5, step: 0.0001});
        $('#anti-aliasing').slider({min: 0, max: 5, value: 1.5, step: 0.0001});
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

