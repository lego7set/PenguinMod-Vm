const MathUtil = require('../util/math-util');

const roundToThreeDecimals = number => Math.round(number * 1000) / 1000;

class Touch {
    constructor (runtime) {
        this.fingers = Array.from(Array(5).keys()).map(() => {
            return {
                _clientX: 0,
                _clientY: 0,
                _scratchX: 0,
                _scratchY: 0,
                _isDown: false,
                // pm: keep track of taps
                _isTapped: false,
                _tapId: 0
            }
        })
        /**
         * Reference to the owning Runtime.
         * Can be used, for example, to activate hats.
         * @type{!Runtime}
         */
        this.runtime = runtime;
    }

    /**
     * Touch DOM event handler.
     * @param  {object} data Data from DOM event.
     */
    postData (data) {
        data.changedTouches.forEach(touch => {
            const finger = this.fingers[touch.identifier];
            console.log(touch, finger);
            if (!finger) return;
            if (typeof touch.x === 'number') {
                finger._clientX = touch.x;
                finger._scratchX = MathUtil.clamp(
                    this.runtime.stageWidth * ((touch.x / data.canvasWidth) - 0.5),
                    -(this.runtime.stageWidth / 2),
                    (this.runtime.stageWidth / 2)
                );
            }
            if (typeof touch.y === 'number') {
                finger._clientY = touch.y;
                finger._scratchY = MathUtil.clamp(
                    -this.runtime.stageHeight * ((touch.y / data.canvasHeight) - 0.5),
                    -(this.runtime.stageHeight / 2),
                    (this.runtime.stageHeight / 2)
                );
            }
            if (typeof data.isDown !== "undefined") {
                finger._isDown = data.isDown;
            }
            if (data.isDown === true) {
                finger._isTapped = true;
                // increment tap id
                finger._tapId++;
                if (finger._tapId > 16777216) {
                    finger._tapId = 0;
                }
            }
            const thisTapId = finger._tapId;
            // reset after 2 ticks
            this.runtime.once("RUNTIME_STEP_START", () => {
                this.runtime.once("RUNTIME_STEP_START", () => {
                    // check if tap id is equal (otherwise we tapped this frame too)
                    if (thisTapId !== finger._tapId) return;
                    finger._isTapped = false;
                })
            })
        })
    }

    /**
     * Get the X position of the finger in client coordinates.
     * @return {number} Non-clamped X position of the finger cursor.
     */
    getClientX (finger) {
        const f = this.fingers[finger];
        if (!f) return 0;
        return f._clientX;
    }

    /**
     * Get the Y position of the finger in client coordinates.
     * @return {number} Non-clamped Y position of the finger cursor.
     */
    getClientY (finger) {
        const f = this.fingers[finger];
        if (!f) return 0;
        return f._clientY;
    }

    /**
     * Get the X position of the finger in scratch coordinates.
     * @return {number} Clamped and integer rounded X position of the finger cursor.
     */
    getScratchX (finger) {
        const f = this.fingers[finger];
        if (!f) return 0;
        if (this.runtime.runtimeOptions.miscLimits) {
            return Math.round(f._scratchX);
        }
        return roundToThreeDecimals(f._scratchX);
    }

    /**
     * Get the Y position of the finger in scratch coordinates.
     * @return {number} Clamped and integer rounded Y position of the finger cursor.
     */
    getScratchY (finger) {
        const f = this.fingers[finger];
        if (!f) return 0;
        if (this.runtime.runtimeOptions.miscLimits) {
            return Math.round(f._scratchY);
        }
        return roundToThreeDecimals(f._scratchY);
    }

    /**
     * Get the down state of the finger.
     * @return {boolean} Is the finger down?
     */
    getIsDown (finger) {
        const f = this.fingers[finger];
        if (!f) return false;
        return f._isDown;
    }

    /**
     * pm: Get if the finger was pressed down on this tick.
     * @return {boolean} Is the finger tapping?
     */
    getIsTapped (finger) {
        const f = this.fingers[finger];
        if (!f) return false;
        return f._isTapped;
    }
}

module.exports = Touch;
