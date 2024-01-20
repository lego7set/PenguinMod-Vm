/* eslint-disable no-undef */
const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const CanvasVar = require('./canvasData');
const uid = require('../../util/uid');

const DefaultDrawImage = 'https://studio.penguinmod.com/favicon.ico'; 

/**
 * Class
 * @constructor
 */
class canvas {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {runtime}
         */
        this.runtime = runtime;
        this.lastVars = [];
        this.preloadedImages = {};

        const changeOnVarChange = type => {
            if (type === 'canvas') {
                this.runtime.vm.emitWorkspaceUpdate();
            }
        };
        this.runtime.on('variableChange', changeOnVarChange);
        this.runtime.on('variableDelete', changeOnVarChange);
    }

    createVariable(target, id, name, img) {
        id ??= uid();
        target ??= this.runtime.getTargetForStage();
        if (target.variables[id]) return;
        const cnvs = new CanvasVar(this.runtime, id, name, img);
        target.variables[id] = cnvs;
        return cnvs;
    }

    getOrCreateVariable(target, id, name) {
        const variable = target.lookupVariableById(id);
        if (variable) return variable;
        return this.createVariable(id, name);
    }

    deserialize(data) {
        for (const variable of data) {
            const targetId = data.pop();
            const target = this.runtime.getTargetById(targetId);
            this.createVariable(target, ...variable);
        }
    }

    serialize() {
        const vars = [];
        for (const target of this.runtime.targets) {
            for (const varId in target.variables) {
                const variable = target.variables[varId];
                const varJSON = variable.serialize();
                varJSON.push(target.id);
                vars.push(varJSON);
            }
        }
        return vars;
    }

    orderCategoryBlocks(blocks) {
        const button = blocks[0];
        const varBlock = blocks[1];
        const variables = [button];
        delete blocks[0];
        delete blocks[1];

        const stage = this.runtime.getTargetForStage();
        const target = this.runtime.vm.editingTarget;
        const stageVars = Object.values(stage.variables)
            .filter(variable => variable.type === 'canvas')
            .map(variable => variable.toToolboxDefault('canvas'))
            .map(xml => varBlock.replace('></block>', `>${xml}</block>`));
        const privateVars = Object.values(target.variables)
            .filter(variable => variable.type === 'canvas')
            .map(variable => variable.toToolboxDefault('canvas'))
            .map(xml => varBlock.replace('></block>', `>${xml}</block>`));
        
        if (stageVars.length) {
            variables.push(`<label text="Canvases for all sprites"></label>`);
            variables.push(...stageVars);
        }
        if (privateVars.length) {
            variables.push(`<label text="Canvases for this sprite"></label>`);
            variables.push(...privateVars);
        }
        if (stageVars.length || privateVars.length) {
            variables.push(...blocks);
        }

        return variables;
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: 'newCanvas',
            name: 'html canvas',
            color1: '#0069c2',
            color2: '#0060B4',
            color3: '#0060B4',
            isDynamic: true,
            orderBlocks: this.orderCategoryBlocks.bind(this),
            blocks: [
                {
                    opcode: 'createNewCanvas',
                    blockType: BlockType.BUTTON,
                    text: 'create new canvas'
                },
                {
                    opcode: 'canvasGetter',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        }
                    },
                    text: '[canvas]'
                },
                {
                    blockType: BlockType.LABEL,
                    text: "config"
                },
                {
                    opcode: 'setGlobalCompositeOperation',
                    text: 'set composite operation of [canvas] to [CompositeOperation]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        },
                        CompositeOperation: {
                            type: ArgumentType.STRING,
                            menu: 'CompositeOperation'
                        }
                    },
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'setSize',
                    text: 'set width: [width] height: [height] of [canvas]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        },
                        width: {
                            type: ArgumentType.NUMBER,
                            defaultValue: this.runtime.stageWidth
                        },
                        height: {
                            type: ArgumentType.NUMBER,
                            defaultValue: this.runtime.stageHeight
                        }
                    },
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'setTransparency',
                    text: 'set transparency of [canvas] to [transparency]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        },
                        transparency: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    },
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'setFill',
                    text: 'set fill color of [canvas] to [color]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        },
                        color: {
                            type: ArgumentType.COLOR
                        }
                    },
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'setBorderColor',
                    text: 'set line color of [canvas] to [color]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        },
                        color: {
                            type: ArgumentType.COLOR
                        }
                    },
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'setBorderSize',
                    text: 'set line size of [canvas] to [size]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        },
                        size: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '1'
                        }
                    },
                    blockType: BlockType.COMMAND
                },
                {
                    blockType: BlockType.LABEL,
                    text: "drawing"
                },
                {
                    opcode: 'clearCanvas',
                    text: 'clear canvas [canvas]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        }
                    },
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'clearAria',
                    text: 'clear area at x: [x] y: [y] with width: [width] height: [height] on [canvas]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        },
                        x: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        width: {
                            type: ArgumentType.NUMBER,
                            defaultValue: this.runtime.stageWidth
                        },
                        height: {
                            type: ArgumentType.NUMBER,
                            defaultValue: this.runtime.stageHeight
                        }
                    },
                    blockType: BlockType.COMMAND
                },
                '---',
                {
                    opcode: 'drawRect',
                    text: 'draw rectangle at x: [x] y: [y] with width: [width] height: [height] on [canvas]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        },
                        x: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        width: {
                            type: ArgumentType.NUMBER,
                            defaultValue: this.runtime.stageWidth
                        },
                        height: {
                            type: ArgumentType.NUMBER,
                            defaultValue: this.runtime.stageHeight
                        }
                    },
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'preloadUriImage',
                    blockType: BlockType.COMMAND,
                    text: 'preload image [URI] as [NAME]',
                    arguments: {
                        URI: {
                            type: ArgumentType.STRING,
                            exemptFromNormalization: true,
                            defaultValue: DefaultDrawImage
                        },
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "preloaded image"
                        }
                    }
                },
                {
                    opcode: 'unloadUriImage',
                    blockType: BlockType.COMMAND,
                    text: 'unload image [NAME]',
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "preloaded image"
                        }
                    }
                },
                {
                    opcode: 'drawUriImage',
                    blockType: BlockType.COMMAND,
                    text: 'draw image [URI] at x:[X] y:[Y] onto canvas [canvas]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        },
                        URI: {
                            type: ArgumentType.STRING,
                            exemptFromNormalization: true,
                            defaultValue: DefaultDrawImage
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                },
                {
                    opcode: 'drawUriImageWHR',
                    blockType: BlockType.COMMAND,
                    text: 'draw image [URI] at x:[X] y:[Y] width:[WIDTH] height:[HEIGHT] pointed at: [ROTATE] onto canvas [canvas]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        },
                        URI: {
                            type: ArgumentType.STRING,
                            exemptFromNormalization: true,
                            defaultValue: DefaultDrawImage
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        WIDTH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 64
                        },
                        HEIGHT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 64
                        },
                        ROTATE: {
                            type: ArgumentType.ANGLE,
                            defaultValue: 90
                        }
                    }
                },
                {
                    opcode: 'drawUriImageWHCX1Y1X2Y2R',
                    blockType: BlockType.COMMAND,
                    text: 'draw image [URI] at x:[X] y:[Y] width:[WIDTH] height:[HEIGHT] cropping from x:[CROPX] y:[CROPY] width:[CROPW] height:[CROPH] pointed at: [ROTATE] onto canvas [canvas]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        },
                        URI: {
                            type: ArgumentType.STRING,
                            exemptFromNormalization: true,
                            defaultValue: DefaultDrawImage
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        WIDTH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 64
                        },
                        HEIGHT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 64
                        },
                        CROPX: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        CROPY: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        CROPW: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        },
                        CROPH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        },
                        ROTATE: {
                            type: ArgumentType.ANGLE,
                            defaultValue: 90
                        }
                    }
                }
            ],
            menus: {
                canvas: {
                    variableType: 'canvas'
                },
                CompositeOperation: {
                    items: [
                        {
                            "text": "source-over",
                            "value": "source-over"
                        },
                        {
                            "text": "source-in",
                            "value": "source-in"
                        },
                        {
                            "text": "source-out",
                            "value": "source-out"
                        },
                        {
                            "text": "source-atop",
                            "value": "source-atop"
                        },
                        {
                            "text": "destination-over",
                            "value": "destination-over"
                        },
                        {
                            "text": "destination-in",
                            "value": "destination-in"
                        },
                        {
                            "text": "destination-out",
                            "value": "destination-out"
                        },
                        {
                            "text": "destination-atop",
                            "value": "destination-atop"
                        },
                        {
                            "text": "lighter",
                            "value": "lighter"
                        },
                        {
                            "text": "copy",
                            "value": "copy"
                        },
                        {
                            "text": "xor",
                            "value": "xor"
                        },
                        {
                            "text": "multiply",
                            "value": "multiply"
                        },
                        {
                            "text": "screen",
                            "value": "screen"
                        },
                        {
                            "text": "overlay",
                            "value": "overlay"
                        },
                        {
                            "text": "darken",
                            "value": "darken"
                        },
                        {
                            "text": "lighten",
                            "value": "lighten"
                        },
                        {
                            "text": "color-dodge",
                            "value": "color-dodge"
                        },
                        {
                            "text": "color-burn",
                            "value": "color-burn"
                        },
                        {
                            "text": "hard-light",
                            "value": "hard-light"
                        },
                        {
                            "text": "soft-light",
                            "value": "soft-light"
                        },
                        {
                            "text": "difference",
                            "value": "difference"
                        },
                        {
                            "text": "exclusion",
                            "value": "exclusion"
                        },
                        {
                            "text": "hue",
                            "value": "hue"
                        },
                        {
                            "text": "saturation",
                            "value": "saturation"
                        },
                        {
                            "text": "color",
                            "value": "color"
                        },
                        {
                            "text": "luminosity",
                            "value": "luminosity"
                        }
                    ]
                }
            }
        };
    }

    createNewCanvas() {
        // expect the global ScratchBlocks from inside the window
        ScratchBlocks.prompt(ScratchBlocks.Msg.NEW_VARIABLE_TITLE, '', 
            (name, additionalVars, {scope}) => {
                name = ScratchBlocks.Variables.validateScalarVarOrListName_(name, 
                    ScratchBlocks.getMainWorkspace(), additionalVars, false, 
                    'canvas', ScratchBlocks.Msg.VARIABLE_ALREADY_EXISTS);
                if (!name) return;

                const target = scope
                    ? this.runtime.vm.editingTarget
                    : this.runtime.getTargetForStage();
                this.createVariable(target, null, name);
                this.runtime.vm.emitWorkspaceUpdate();
            }, ScratchBlocks.Msg.VARIABLE_MODAL_TITLE, 'canvas');
    }

    canvasGetter(args, util) {
        const canvasObj = this.getOrCreateVariable(util.target, args.canvas.id, args.canvas.name);
        return canvasObj;
    }

    setGlobalCompositeOperation(args, util) {
        const canvasObj = this.getOrCreateVariable(util.target, args.canvas.id, args.canvas.name);
        const ctx = canvasObj.canvas.getContext('2d');
        ctx.globalCompositeOperation = args.CompositeOperation;
    }

    setBorderColor(args, util) {
        const color = args.color;
        const canvasObj = this.getOrCreateVariable(util.target, args.canvas.id, args.canvas.name);
        const ctx = canvasObj.canvas.getContext('2d');
        ctx.strokeStyle = color;
    }

    setBorderSize(args, util) {
        const size = args.size;
        const canvasObj = this.getOrCreateVariable(util.target, args.canvas.id, args.canvas.name);
        const ctx = canvasObj.canvas.getContext('2d');
        ctx.lineSize = size;
    }

    setFill(args, util) {
        const color = args.color;
        const canvasObj = this.getOrCreateVariable(util.target, args.canvas.id, args.canvas.name);
        const ctx = canvasObj.canvas.getContext('2d');
        ctx.fillStyle = color;
    }

    setSize(args, util) {
        const canvasObj = this.getOrCreateVariable(util.target, args.canvas.id, args.canvas.name);
        canvasObj.size = [args.width, args.height];
    }

    drawRect(args, util) {
        const canvasObj = this.getOrCreateVariable(util.target, args.canvas.id, args.canvas.name);
        const ctx = canvasObj.canvas.getContext('2d');
        ctx.fillRect(args.x, args.y, args.width, args.height);
    }

    async _drawUriImage({canvas, URI, X, Y, WIDTH, HEIGHT, ROTATE, CROPX, CROPY, CROPW, CROPH}, target) {
        const canvasObj = this.getOrCreateVariable(target, canvas.id, canvas.name);
        const image = this.preloadedImages[URI] ?? (URI instanceof CanvasVar
            ? URI.canvas
            : await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = err => reject(err);
                image.src = URI;
            }));
        const ctx = canvasObj.canvas.getContext('2d');
        ctx.rotate(MathUtil.degToRad(ROTATE - 90));

        // use sizes from the image if none specified
        const width = (WIDTH ?? image.width) * this._penRes;
        const height = (HEIGHT ?? image.height) * this._penRes;
        const realX = (X * this._penRes) - (width / 2);
        const realY = (-Y * this._penRes) - (height / 2);
        const drawArgs = [CROPX, CROPY, CROPW, CROPH, realX, realY, width, height];

        // if cropx or cropy are undefined then remove the crop args
        if (typeof (CROPX ?? CROPY) === "undefined") {
            drawArgs.splice(0, 4);
        }

        ctx.drawImage(image, ...drawArgs);
    }

    // todo: should these be merged into their own function? they all have the same code...
    drawUriImage (args, util) {
        const preloaded = this.preloadedImages[args.URI];
        const possiblePromise = this._drawUriImage(args, util.target);
        if (!preloaded && !(args.URI instanceof CanvasVar)) {
            return possiblePromise;
        }
    }
    drawUriImageWHR (args, util) {
        const preloaded = this.preloadedImages[args.URI];
        const possiblePromise = this._drawUriImage(args, util.target);
        if (!preloaded && !(args.URI instanceof CanvasVar)) {
            return possiblePromise;
        }
    }
    drawUriImageWHCX1Y1X2Y2R (args, util) {
        const preloaded = this.preloadedImages[args.URI];
        const possiblePromise = this._drawUriImage(args, util.target);
        if (!preloaded && !(args.URI instanceof CanvasVar)) {
            return possiblePromise;
        }
    }

    preloadUriImage ({ URI, NAME }) {
        // just incase the user tries to preload a canvas, dont use the canvases data uri
        if (URI instanceof CanvasVar) {
            this.preloadedImages[NAME] = URI.canvas;
            return;
        }
        return new Promise(resolve => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = () => {
                this.preloadedImages[NAME] = image;
                resolve();
            };
            image.onerror = resolve; // ignore loading errors lol!
            image.src = URI;
        });
    }
    unloadUriImage ({ NAME }) {
        if (this.preloadedImages.hasOwnProperty(NAME)) {
            this.preloadedImages[NAME].remove();
            delete this.preloadedImages[NAME];
        }
    }

    clearAria(args, util) {
        const canvasObj = this.getOrCreateVariable(util.target, args.canvas.id, args.canvas.name);
        const ctx = canvasObj.canvas.getContext('2d');
        ctx.clearRect(args.x, args.y, args.width, args.height);
    }

    clearCanvas(args, util) {
        const canvasObj = this.getOrCreateVariable(util.target, args.canvas.id, args.canvas.name);
        const ctx = canvasObj.canvas.getContext('2d');
        ctx.clearRect(0, 0, canvasObj.size[0], canvasObj.size[1]);
    }

    setTransparency(args, util) {
        const canvasObj = this.getOrCreateVariable(util.target, args.canvas.id, args.canvas.name);
        const ctx = canvasObj.canvas.getContext('2d');
        ctx.globalAlpha = args.transparency / 100;
    }
}

module.exports = canvas;
