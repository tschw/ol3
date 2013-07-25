
goog.provide('ol.webglnew.TimeSlicer');

/**
 * Timing encapsulation for per-frame processing.
 *
 * The cosntructor creates an instance that is then to be updated once per
 * frame calling the 'update' method. From this point on, values for most
 * timing related calculations are provided.
 *
 * @constructor
 * @param {Number} opt_secondsToAverage Number of seconds
 *                      to average over to determine time derivatives.
 *                      Defaults to one second. 
 */
ol.webglnew.TimeSlicer = function(opt_secondsToAverage) {

    /**
     * @private
     * @type {Number}
     */
    this._startTimeValue = Date.now();

    /**
     * @private
     * @type {Number}
     */
    this._secsToAverage = opt_secondsToAverage || 1.0;
};

ol.webglnew.TimeSlicer.prototype = {

    /**
     * Number of slices. 
     * @type {Number}
     */ 
    n: 0,

    /**
     * Number of seconds elapsed since creation.
     * @type {Number}
     */
    tN: 0.0,

    /**
     * Time frame differential.
     * @type {Number}
     */
    dt: Number.NaN,

    /**
     * Average frame rate.
     * @type {Number}
     */
    averageFrameRate: 60.0,

    /**
     * Update timing information - to be called once per frame.
     */
    update: function() {

        // update state
        ++this.n;
        var tPrevFrame = this.tN;
        this.tN = (Date.now() - this._startTimeValue) / 1000.0;
        this.dt = this.tN - tPrevFrame;

        // derermine smooth framerate
        this.averageFrameRate =
                this.smoothTimeDerivative(this.averageFrameRate, 1.0);
    },

    /**
     * Accumulate a smooth derivative in respect to time. 
     * 
     * @param {Number} prevPerSecond Previous value.
     * @param {Number} amount Amount measured during the current frame.
     * @return {Number} 
     */
    smoothTimeDerivative: function(prevPerSecond, amount, opt_secsToAverage) {

        opt_secsToAverage = opt_secsToAverage || this._secsToAverage;
        return goog.math.lerp(prevPerSecond, amount / this.dt, 
                              Math.min(this.dt / opt_secsToAverage, 1.0)); 
    }
};

