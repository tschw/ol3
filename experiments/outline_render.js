
goog.webgl = null;

function Application() { 

    // WebGL initialization
    if (ol.webglnew.WebGL.available()) {

        var gl = new ol.webglnew.WebGL($('#webgl-canvas')[0]);
        if (gl != null) this.gl = gl;
        else $('#webgl-canvas,#webgl-init-failed').toggleClass('invisible');
    }
    else $('#webgl-canvas,#webgl-unavailable').toggleClass('invisible');
    if (! this.gl) throw 'WebGL initialization failed';


    // Configure rendering
    var gl = this.gl.context;
    goog.webgl = gl; // TODO: unhack

    //gl.enable(gl.DEPTH_TEST);
    //gl.depthFunc(gl.LEQUAL);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    this._setupBackground();

    // Configure timing

    this._timeSlicer = new ol.webglnew.TimeSlicer(this.FPS_SECS_TO_AVERAGE);

    // Setup events
    $('#webgl-canvas')
            .resize(this.onResize.bind(this))
            .mousedown(this.onMouseDown.bind(this))
            .mouseup(this.onMouseUp.bind(this))
            .mousemove(this.onMouseMove.bind(this))
            .bind('mousewheel wheel', this.onMouseWheel.bind(this));
    // Setup time trigger
    this._timer = new ol.webglnew.Timer(this.frame.bind(this),
                                        this.MIN_FRAME_DELAY_MS);
    // Call 'frame' from now on
    this._timer.start();
}

Application.prototype = {

    MIN_FRAME_DELAY_MS: 12,
    FPS_SECS_TO_AVERAGE: 5,

    MOVE_GRIP_SECS: 3/32, 
    MOVE_FRICT_SECS: 2,

    _veloX: 0, _veloY: 0,

    frame: function() {
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


    onResize: function(e) {

        this.gl.context.viewpoert($(this).width(), $(this).height());
    },

    // Mouse input

    _mouseX: 0, _mouseY: 0, _mouseButton: 0, _mouseMoveX:0, _mouseMoveY: 0,

    onMouseDown: function(e) {

        this._mouseButton = e.which;
        this._mouseX = e.pageX;
        this._mouseY = e.pageY;
    },

    onMouseUp: function(e) {

        this.onMouseMove(e);
        this._mouseButton = -1;
    },

    onMouseMove: function(e) {

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

    onMouseWheel: function(e) {

        this._zoom += e.originalEvent.wheelDelta;
        console.log('zoom ' + this._zoom);
    },


    // Background

    _posX:0, _posY: 0, _zoom: 0,

    _setupBackground: function() {

        this._bgProgram = this.gl.linkProgram($('script#webgl-bg-vert').text(),
                                         $('script#webgl-bg-frag').text());
        this._poset = this.gl.context.getUniformLocation(this._bgProgram, 'Offset');

        this._bgVertices = this.gl.buffer(this.SQUARE_VERTEX_DATA)
        this._bgIndices = this.gl.buffer(
                this.SQUARE_INDEX_DATA, goog.webgl.ELEMENT_ARRAY_BUFFER);
    },

    _renderBackground: function() {

        var gl = this.gl.context;
        gl.useProgram(this._bgProgram);
        gl.uniform2f(this._poset, this._posX, this._posY);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._bgVertices);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_ELEMENT_BUFFER, this._bgIndices);
        gl.drawElements(gl.TRIANGLES, 6, goog.webgl.UNSIGNED_SHORT, 0);
        gl.disableVertexAttribArray(0);
    },

    SQUARE_VERTEX_DATA: new Float32Array([
        -1.0, -1.0,
        +1.0, -1.0,
        +1.0, +1.0,
        -1.0, +1.0
    ]),

    SQUARE_INDEX_DATA: new Uint16Array([
        0,1,2,
        0,2,3
    ])

};

var app = null; // please keep here for interactive debugging
$(window).load(function() { app = new Application(); });

