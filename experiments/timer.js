
goog.provide('ol.webglnew.Timer');

/**
 * Interval timer.
 *
 * This implementation is based on the 'window.setTimeout' functionality.
 * Why use this one instead of just using 'window.setInterval'?
 *
 * A typical implementation of 'setInterval' is based on monotonous events.
 * Using it to trigger a rendering loop can have the undesired effect that 
 * when load is slowing down the machine it makes us produce even more.
 * Filled even queues decrease the responsiveness of the application - thus
 * we rather drop a frame or two when appropriate instead of suffocating
 * the machine.
 *
 * The constructor is initialized with a callback and the minimum delay 
 * between invocations.
 *
 * @constructor
 * @param {function} func Function to call back.
 * @param {Number} minDelay Minimum delay in milliseconds.
 */
ol.webglnew.Timer = function(func, minDelay) {

    /**
     * Function to call back.
     * @type {Function}
     */
    this.func = func;

    /**
     * Minimum delay between calls in milliseconds.
     * @type {Function}
     */
    this.minDelay = minDelay;

    /**
     * @private
     * @type {Function}
     */
    this._bound_onTimeout = goog.bind(this._onTimeout, this);
};

ol.webglnew.Timer.prototype = {

    /**
     * Start the timer.
     */
    start: function() {

        if (! this._alive) {
            this._alive = true;

            this._timerHandle = window.setTimeout(this._bound_onTimeout, this.minDelay);
        }
    },

    /**
     * Stop the timer.
     */
    stop: function() {

        if (this._alive) {
            this._alive = false;

            window.clearTimeout(this._timerHandle);
            this._timerHandle = null;
        }
    },

    /**
     * Return whether the timer is currently running.
     *
     * @return {boolean}
     */
    isAlive: function() {
        return this._alive;
    },


    /**
     * @private
     * @type {boolean}
     */
    _alive: false,

    /**
     * @private
     * @type {Number}
     */
     _timerHandle: null,

    /**
     * @private
     * @access private
     */
    _onTimeout: function() {

        this.func();

        // schedule next call
        if (this._alive) {
            window.clearTimeout(this._timerHandle);
            this._timerHandle = window.setTimeout(this._bound_onTimeout, this.minDelay);
        }
    }
}; 

