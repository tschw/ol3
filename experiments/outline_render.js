
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
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

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

        gl.flush();
    },

    _setupUserInterface: function() {

        $('#rotation-angle').slider({min: 0, max: Math.PI * 2, value: 0, step: 0.0001 });
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
        this._bgProgram = this.gl.linkProgram($('script#webgl-bg-vert').text(),
                                         $('script#webgl-bg-frag').text());
        // Fetch uniform locations
        var gl = this.gl.context;
        this._uniOffset = gl.getUniformLocation(this._bgProgram, 'Offset');
        this._uniScale = gl.getUniformLocation(this._bgProgram, 'Scale');
        this._uniRotation = gl.getUniformLocation(this._bgProgram, 'Rotation');
        this._uniLineWidth = gl.getUniformLocation(this._bgProgram, 'LineWidth');
        this._uniAntiAliasing = gl.getUniformLocation(this._bgProgram, 'AntiAliasing');
        this._uniAASmoothing = gl.getUniformLocation(this._bgProgram, 'AASmoothing');
        this._uniGamma = gl.getUniformLocation(this._bgProgram, 'Gamma');

        // Create buffers
        this._bgVertices = this.gl.buffer(this._SQUARE_VERTEX_DATA)
        this._bgIndices = this.gl.buffer(
                this._SQUARE_INDEX_DATA, goog.webgl.ELEMENT_ARRAY_BUFFER);

        // Set start offset
        this._posX = gl.drawingBufferWidth / 2;
        this._posY = gl.drawingBufferHeight / 2;
    },

    _renderBackground: function() {
        var scaleX = 1 / $('#grid-size-x').slider('value');
        var scaleY = 1 / $('#grid-size-y').slider('value');

        var angle = $('#rotation-angle').slider('value');
        var angleAnim = $('#rotation-speed').slider('value');

        if (angleAnim > 0) {
            angle = (angle + angleAnim * this._timeSlicer.dt) % (Math.PI * 2);

            $('#rotation-angle').slider('value', angle);
        }
        var lineWidth = $('#line-width').slider('value');
        var antiAliasing = $('#anti-aliasing').slider('value');
        var aaSmoothing = $('#aa-smoothing').val();
        var gamma = $('#gamma').slider('value');

        var gl = this.gl.context;
        gl.useProgram(this._bgProgram);
        gl.uniform2f(this._uniOffset, Math.round(this._posX), Math.round(this._posY));

        gl.uniform2f(this._uniScale, scaleX, scaleY);
        var cosA = Math.cos(angle), sinA = Math.sin(angle);
        gl.uniformMatrix2fv(this._uniRotation, false, [ cosA, sinA, -sinA, cosA ]);
        gl.uniform1f(this._uniLineWidth, lineWidth);
        gl.uniform1f(this._uniAntiAliasing, antiAliasing);
        gl.uniform1i(this._uniAASmoothing, aaSmoothing);
        gl.uniform1f(this._uniGamma, gamma);
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

