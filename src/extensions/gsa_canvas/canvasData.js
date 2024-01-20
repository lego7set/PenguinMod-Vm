const xmlEscape = require('../../util/xml-escape');

class CanvasVar {
    /**
     * initiats the variable
     * @param {Runtime} runtime the runtime this canvas exists inside
     * @param {string} id this canvas's id
     * @param {string} name the name of this canvas
     * @param {[number,number]|string|Image} [img=[1, 1]] optionally the image to be loaded into this canvas
     */
    constructor (runtime, id, name, img = [1, 1]) {
        this.id = id;
        this.name = name;
        this.type = 'canvas';
        this.runtime = runtime;
        this.renderer = runtime.renderer;
        this.canvas = document.createElement('canvas');
        this._skinId = this.renderer.createBitmapSkin(this.canvas);
        // img is just a size to be given to the canvas
        if (Array.isArray(img)) {
            this.size = img;
            return;
        }
        if (img) this.loadImage();
    }

    get value() {
        return this.canvas;
    }

    serialize() {
        return [this.id, this.name, this.canvas.toDataURL()];
    }
    toReporterContent() {
        return this.canvas;
    }
    toString() {
        return this.canvas.toDataURL();
    }
    toXML(isLocal) {
        return `<variable type="canvas" id="${this.id}" islocal="${isLocal
        }" iscloud="false">${xmlEscape(this.name)}</variable>`;
    }
    toToolboxDefault(fieldName) {
        return `<field name="${fieldName}" id="${this.id}" variabletype="canvas">${xmlEscape(this.name)}</field>`;
    }

    get size() {
        return [this.canvas.width, this.canvas.height];
    }
    set size(size) {
        console.log('jump in the caac', ...size);
        this.canvas.width = size[0];
        this.canvas.height = size[1];
        console.log(this.size);
    }

    /**
     * load an image onto the 2d canvas
     * @param {Image} img the image to load onto the 2d canvas
     */
    async loadImage(img) {
        // we where not given something we can use imediatly :(
        if (img instanceof Image && !img.complete) {
            await new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
            });
        }
        if (typeof img === 'string') {
            await new Promise(resolve => {
                img = new Image(img);
                img.onload = resolve;
                img.onerror = resolve;
            });
        }

        this.canvas.width = img.width;
        this.canvas.height = img.height;
        const ctx = this.canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
    }

    updateCanvasSkin() {
        this.renderer.updateBitmapSkin(this.canvas);
    }

    applyCanvasToTarget(target) {
        this.renderer.updateDrawableSkinId(target.drawableId, this._skinId);
    }
}

module.exports = CanvasVar;
