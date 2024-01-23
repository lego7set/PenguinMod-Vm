/* eslint-disable no-undef */
const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const MathUtil = require('../../util/math-util');
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
        this.runtime.registerCompiledExtensionBlocks('newCanvas', this.getCompileInfo());
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
                    text: "stylizing"
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
                    opcode: 'dash',
                    blockType: BlockType.COMMAND,
                    text: 'set line dash to [dashing] in [canvas]',
                    arguments: {
                        dashing: {
                            type: ArgumentType.STRING,
                            defaultValue: '[10, 10]'
                        },
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        }
                    }
                },
                {
                    blockType: BlockType.LABEL,
                    text: "direct drawing"
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
                    opcode: 'getWidthOfPreloaded',
                    blockType: BlockType.REPORTER,
                    text: 'get width of [name]',
                    arguments: {
                        name: {
                            type: ArgumentType.STRING,
                            defaultValue: "preloaded image"
                        }
                    }
                },
                {
                    opcode: 'getHeightOfPreloaded',
                    blockType: BlockType.REPORTER,
                    text: 'get height of [name]',
                    arguments: {
                        name: {
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
                },
                {
                    opcode: 'getWidthOfCanvas',
                    blockType: BlockType.REPORTER,
                    text: 'get width of [canvas]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        }
                    }
                },
                {
                    opcode: 'getHeightOfCanvas',
                    blockType: BlockType.REPORTER,
                    text: 'get height of [canvas]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        }
                    }
                },
                {
                    blockType: BlockType.LABEL,
                    text: "path drawing"
                },
                {
                    opcode: 'beginPath',
                    blockType: BlockType.COMMAND,
                    text: 'begin path drawing on [canvas]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        }
                    }
                },
                {
                    opcode: 'moveTo',
                    blockType: BlockType.COMMAND,
                    text: 'move pen to x:[x] y:[y] on [canvas]',
                    arguments: {
                        x: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        }
                    }
                },
                {
                    opcode: 'lineTo',
                    blockType: BlockType.COMMAND,
                    text: 'add line going to x:[x] y:[y] on [canvas]',
                    arguments: {
                        x: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        }
                    }
                },
                {
                    opcode: 'arcTo',
                    blockType: BlockType.COMMAND,
                    text: 'add arc going to x:[x] y:[y] on [canvas] with control points [controlPoints] and radius [radius]',
                    arguments: {
                        x: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        controlPoints: {
                            type: ArgumentType.POLYGON,
                            nodes: 2
                        },
                        radius: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '10'
                        },
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        }
                    }
                },
                "---",
                {
                    opcode: 'addRect',
                    blockType: BlockType.COMMAND,
                    text: 'add a rectangle at x:[x] y:[y] with width:[width] height:[height] to [canvas]',
                    arguments: {
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
                            defaultValue: 10
                        },
                        height: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 10
                        },
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        }
                    }
                },
                {
                    opcode: 'addEllipse',
                    blockType: BlockType.COMMAND,
                    text: 'add a ellipse at x:[x] y:[y] with width:[width] height:[height] pointed towards [dir] to [canvas]',
                    arguments: {
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
                            defaultValue: 10
                        },
                        height: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 10
                        },
                        dir: {
                            type: ArgumentType.ANGLE,
                            defaultValue: 90
                        },
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        }
                    }
                },
                {
                    opcode: 'addEllipseStartStop',
                    blockType: BlockType.COMMAND,
                    text: 'add a ellipse with starting rotation [start] and ending rotation [end] at x:[x] y:[y] with width:[width] height:[height] pointed towards [dir] to [canvas]',
                    arguments: {
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
                            defaultValue: 10
                        },
                        height: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 10
                        },
                        start: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        end: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '360'
                        },
                        dir: {
                            type: ArgumentType.ANGLE,
                            defaultValue: 90
                        },
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        }
                    }
                },
                "---",
                {
                    opcode: 'closePath',
                    blockType: BlockType.COMMAND,
                    text: 'attempt to close any open path in [canvas]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        }
                    }
                },
                {
                    opcode: 'stroke',
                    blockType: BlockType.COMMAND,
                    text: 'draw outline for current path in [canvas]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        }
                    }
                },
                {
                    opcode: 'fill',
                    blockType: BlockType.COMMAND,
                    text: 'draw fill for current path in [canvas]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
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

    /**
     * This function is used for any compiled blocks in the extension if they exist.
     * Data in this function is given to the IR & JS generators.
     * Data must be valid otherwise errors may occur.
     * @returns {object} functions that create data for compiled blocks.
     */
    getCompileInfo() {
        return {
            ir: {
                canvasGetter: (generator, block) => ({
                    kind: 'input',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas')
                }),
                setGlobalCompositeOperation: (generator, block) => ({
                    kind: 'stack',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas'),
                    CompositeOperation: block.fields.CompositeOperation.value
                }),
                setSize: (generator, block) => ({
                    kind: 'stack',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas'),
                    width: generator.descendInputOfBlock(block, 'width'),
                    height: generator.descendInputOfBlock(block, 'height')
                }),
                setTransparency: (generator, block) => ({
                    kind: 'stack',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas'),
                    transparency: generator.descendInputOfBlock(block, 'transparency')
                }),
                setFill: (generator, block) => ({
                    kind: 'stack',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas'),
                    color: generator.descendInputOfBlock(block, 'color')
                }),
                setBorderColor: (generator, block) => ({
                    kind: 'stack',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas'),
                    color: generator.descendInputOfBlock(block, 'color')
                }),
                setBorderSize: (generator, block) => ({
                    kind: 'stack',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas'),
                    size: generator.descendInputOfBlock(block, 'size')
                }),
                dash: (generator, block) => ({
                    kind: 'stack',
                    dashing: generator.descendInputOfBlock(block, 'dashing'),
                    canvas: generator.descendVariable(block, 'canvas', 'canvas')
                }),
                clearCanvas: (generator, block) => ({
                    kind: 'stack',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas')
                }),
                clearAria: (generator, block) => ({
                    kind: 'stack',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas'),
                    x: generator.descendInputOfBlock(block, 'x'),
                    y: generator.descendInputOfBlock(block, 'y'),
                    width: generator.descendInputOfBlock(block, 'width'),
                    height: generator.descendInputOfBlock(block, 'height')
                }),
                drawRect: (generator, block) => ({
                    kind: 'stack',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas'),
                    x: generator.descendInputOfBlock(block, 'x'),
                    y: generator.descendInputOfBlock(block, 'y'),
                    width: generator.descendInputOfBlock(block, 'width'),
                    height: generator.descendInputOfBlock(block, 'height')
                }),
                preloadUriImage: (generator, block) => ({
                    kind: 'stack',
                    URI: generator.descendInputOfBlock(block, 'URI'),
                    NAME: generator.descendInputOfBlock(block, 'NAME')
                }),
                unloadUriImage: (generator, block) => ({
                    kind: 'stack',
                    NAME: generator.descendInputOfBlock(block, 'NAME')
                }),
                getWidthOfPreloaded: (generator, block) => ({
                    kind: 'input',
                    name: generator.descendInputOfBlock(block, 'name')
                }),
                getHeightOfPreloaded: (generator, block) => ({
                    kind: 'input',
                    name: generator.descendInputOfBlock(block, 'name')
                }),
                drawUriImage: (generator, block) => ({
                    kind: 'stack',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas'),
                    URI: generator.descendInputOfBlock(block, 'URI'),
                    X: generator.descendInputOfBlock(block, 'X'),
                    Y: generator.descendInputOfBlock(block, 'Y')
                }),
                drawUriImageWHR: (generator, block) => ({
                    kind: 'stack',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas'),
                    URI: generator.descendInputOfBlock(block, 'URI'),
                    X: generator.descendInputOfBlock(block, 'X'),
                    Y: generator.descendInputOfBlock(block, 'Y'),
                    WIDTH: generator.descendInputOfBlock(block, 'WIDTH'),
                    HEIGHT: generator.descendInputOfBlock(block, 'HEIGHT'),
                    ROTATE: generator.descendInputOfBlock(block, 'ROTATE')
                }),
                drawUriImageWHCX1Y1X2Y2R: (generator, block) => ({
                    kind: 'stack',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas'),
                    URI: generator.descendInputOfBlock(block, 'URI'),
                    X: generator.descendInputOfBlock(block, 'X'),
                    Y: generator.descendInputOfBlock(block, 'Y'),
                    WIDTH: generator.descendInputOfBlock(block, 'WIDTH'),
                    HEIGHT: generator.descendInputOfBlock(block, 'HEIGHT'),
                    CROPX: generator.descendInputOfBlock(block, 'CROPX'),
                    CROPY: generator.descendInputOfBlock(block, 'CROPY'),
                    CROPW: generator.descendInputOfBlock(block, 'CROPW'),
                    CROPH: generator.descendInputOfBlock(block, 'CROPH'),
                    ROTATE: generator.descendInputOfBlock(block, 'ROTATE')
                }),
                getWidthOfCanvas: (generator, block) => ({
                    kind: 'input',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas')
                }),
                getHeightOfCanvas: (generator, block) => ({
                    kind: 'input',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas')
                }),
                beginPath: (generator, block) => ({
                    kind: 'stack',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas')
                }),
                moveTo: (generator, block) => ({
                    kind: 'stack',
                    x: generator.descendInputOfBlock(block, 'x'),
                    y: generator.descendInputOfBlock(block, 'y'),
                    canvas: generator.descendVariable(block, 'canvas', 'canvas')
                }),
                lineTo: (generator, block) => ({
                    kind: 'stack',
                    x: generator.descendInputOfBlock(block, 'x'),
                    y: generator.descendInputOfBlock(block, 'y'),
                    canvas: generator.descendVariable(block, 'canvas', 'canvas')
                }),
                arcTo: (generator, block) => ({
                    kind: 'stack',
                    x: generator.descendInputOfBlock(block, 'x'),
                    y: generator.descendInputOfBlock(block, 'y'),
                    controlPoints: generator.descendInputOfBlock(block, 'controlPoints'),
                    radius: generator.descendInputOfBlock(block, 'radius'),
                    canvas: generator.descendVariable(block, 'canvas', 'canvas')
                }),
                addRect: (generator, block) => ({
                    kind: 'stack',
                    x: generator.descendInputOfBlock(block, 'x'),
                    y: generator.descendInputOfBlock(block, 'y'),
                    width: generator.descendInputOfBlock(block, 'width'),
                    height: generator.descendInputOfBlock(block, 'height'),
                    canvas: generator.descendVariable(block, 'canvas', 'canvas')
                }),
                addEllipse: (generator, block) => ({
                    kind: 'stack',
                    x: generator.descendInputOfBlock(block, 'x'),
                    y: generator.descendInputOfBlock(block, 'y'),
                    width: generator.descendInputOfBlock(block, 'width'),
                    height: generator.descendInputOfBlock(block, 'height'),
                    dir: generator.descendInputOfBlock(block, 'dir'),
                    canvas: generator.descendVariable(block, 'canvas', 'canvas')
                }),
                addEllipseStartStop: (generator, block) => ({
                    kind: 'stack',
                    x: generator.descendInputOfBlock(block, 'x'),
                    y: generator.descendInputOfBlock(block, 'y'),
                    width: generator.descendInputOfBlock(block, 'width'),
                    height: generator.descendInputOfBlock(block, 'height'),
                    start: generator.descendInputOfBlock(block, 'start'),
                    end: generator.descendInputOfBlock(block, 'end'),
                    dir: generator.descendInputOfBlock(block, 'dir'),
                    canvas: generator.descendVariable(block, 'canvas', 'canvas')
                }),
                stroke: (generator, block) => ({
                    kind: 'stack',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas')
                }),
                fill: (generator, block) => ({
                    kind: 'stack',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas')
                })
            },
            js: {
                canvasGetter: (node, compiler) => compiler.descendVariable(node.variable),
                setGlobalCompositeOperation: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);

                    compiler.source += `${ctx}.globalCompositeOperation = '${node.CompositeOperation}';\n`;
                },
                setSize: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const width = compiler.descendInput(node.width).asNumber();
                    const height = compiler.descendInput(node.height).asNumber();

                    compiler.source += `${canvas}.canvas.width = ${width};\n`;
                    compiler.source += `${canvas}.canvas.height = ${height};\n`;
                },
                setTransparency: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const transparency = compiler.descendInput(node.transparency).asNumber();

                    compiler.source += `${ctx}.globalAlpha = ${transparency} / 100;\n`;
                },
                setFill: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const color = compiler.descendInput(node.color).asColor();

                    compiler.source += `${ctx}.fillStyle = ${color};\n`;
                },
                setBorderColor: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const color = compiler.descendInput(node.color).asColor();

                    compiler.source += `${ctx}.strokeStyle = ${color};\n`;
                },
                setBorderSize: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const size = compiler.descendInput(node.size).asNumber();

                    compiler.source += `${ctx}.fillStyle = ${size};\n`;
                },
                dash: (node, compiler, {ConstantInput}) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const arrInp = compiler.descendInput(node.size);
                    const isContant = arrInp instanceof ConstantInput;

                    compiler.source += `${ctx}.setLineDash(`;
                    if (!isContant) compiler.source += `parseJSONSafe(`;
                    compiler.source += arrInp.asColor();
                    if (!isContant) compiler.source += ')';
                    compiler.source += ');';
                },
                clearCanvas: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);

                    compiler.source += `${ctx}.clearRect(0, 0, ${canvas}.canvas.width, ${canvas}.canvas.height);\n`;
                    compiler.source += `${canvas}._monitorUpToDate = false;\n`;
                },
                clearAria: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const x = compiler.descendInput(node.x).asNumber();
                    const y = compiler.descendInput(node.y).asNumber();
                    const width = compiler.descendInput(node.width).asNumber();
                    const height = compiler.descendInput(node.height).asNumber();

                    compiler.source += `${ctx}.clearRect(${x}, ${y}, ${width}, ${height});\n`;
                    compiler.source += `${canvas}._monitorUpToDate = false;\n`;
                },
                drawRect: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const x = compiler.descendInput(node.x).asNumber();
                    const y = compiler.descendInput(node.y).asNumber();
                    const width = compiler.descendInput(node.width).asNumber();
                    const height = compiler.descendInput(node.height).asNumber();

                    compiler.source += `${ctx}.fillRect(${x}, ${y}, ${width}, ${height});\n`;
                    compiler.source += `${canvas}._monitorUpToDate = false;\n`;
                },
                preloadUriImage: (node, compiler) => {
                    const allPreloaded = compiler.evaluateOnce('{}');
                    const preloadName = compiler.descendInput(node.NAME).asString();
                    const preloadUri = compiler.descendInput(node.URI).asUnkown();

                    compiler.source += `${allPreloaded}[${preloadName}] = waitPromise(resolveImageURL(${preloadUri}));\n`;
                },
                unloadUriImage: (node, compiler) => {
                    const allPreloaded = compiler.evaluateOnce('{}');
                    const preloadName = compiler.descendInput(node.NAME).asString();

                    compiler.source += `if (${allPreloaded}[${preloadName}]) {`;
                    compiler.source += `${allPreloaded}[${preloadName}].remove();\n`;
                    compiler.source += `delete ${allPreloaded}[${preloadName}];\n`;
                    compiler.source += '}';
                },
                getWidthOfPreloaded: (node, compiler) => {
                    const allPreloaded = compiler.evaluateOnce('{}');
                    const preloadName = compiler.descendInput(node.name).asString();
                    return new TypedInput(`${allPreloaded}[${preloadName}].height`, TYPE_NUMBER);
                },
                getHeightOfPreloaded: (node, compiler) => {
                    const allPreloaded = compiler.evaluateOnce('{}');
                    const preloadName = compiler.descendInput(node.name).asString();
                    return new TypedInput(`${allPreloaded}[${preloadName}].height`, TYPE_NUMBER);
                },
                drawUriImage: (node, compiler) => {
                    const allPreloaded = compiler.evaluateOnce('{}');
                    const preloadName = compiler.descendInput(node.name).asString();
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const uri = compiler.descendInput(node.URI).asNumber();
                    const x = compiler.descendInput(node.X).asNumber();
                    const y = compiler.descendInput(node.Y).asNumber();

                    compiler.source += `${ctx}.drawImage(`;
                    compiler.source += `${allPreloaded}[${preloadName}] ? `;
                    compiler.source += `${allPreloaded}[${preloadName}] : `;
                    compiler.source += `waitPromise(resolveImageURL(${uri}))`;
                    compiler.source += `, ${x}, ${y});\n`;
                    compiler.source += `${canvas}._monitorUpToDate = false;\n`;
                },
                drawUriImageWHR: (node, compiler) => {
                    const allPreloaded = compiler.evaluateOnce('{}');
                    const preloadName = compiler.descendInput(node.name).asString();
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const uri = compiler.descendInput(node.URI).asNumber();
                    const x = compiler.descendInput(node.X).asNumber();
                    const y = compiler.descendInput(node.Y).asNumber();
                    const width = compiler.descendInput(node.WIDTH).asNumber();
                    const height = compiler.descendInput(node.HEIGHT).asNumber();
                    const dir = compiler.descendInput(node.ROTATE).asNumber();

                    compiler.source += `${ctx}.drawImage(`;
                    compiler.source += `${allPreloaded}[${preloadName}] ? `;
                    compiler.source += `${allPreloaded}[${preloadName}] : `;
                    compiler.source += `waitPromise(resolveImageURL(${uri}))`;
                    compiler.source += `, ${x}, ${y}, ${width}, ${height}, ${dir});\n`;
                    compiler.source += `${canvas}._monitorUpToDate = false;\n`;
                },
                drawUriImageWHCX1Y1X2Y2R: (node, compiler) => {
                    const allPreloaded = compiler.evaluateOnce('{}');
                    const preloadName = compiler.descendInput(node.name).asString();
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const uri = compiler.descendInput(node.URI).asNumber();
                    const x = compiler.descendInput(node.X).asNumber();
                    const y = compiler.descendInput(node.Y).asNumber();
                    const width = compiler.descendInput(node.WIDTH).asNumber();
                    const height = compiler.descendInput(node.HEIGHT).asNumber();
                    const dir = compiler.descendInput(node.ROTATE).asNumber();
                    const cropX = compiler.descendInput(node.CROPX).asNumber();
                    const cropY = compiler.descendInput(node.CROPY).asNumber();
                    const cropWidth = compiler.descendInput(node.CROPW).asNumber();
                    const cropHeight = compiler.descendInput(node.CROPH).asNumber();

                    compiler.source += `${ctx}.drawImage(`;
                    compiler.source += `${allPreloaded}[${preloadName}] ? `;
                    compiler.source += `${allPreloaded}[${preloadName}] : `;
                    compiler.source += `waitPromise(resolveImageURL(${uri}))`;
                    compiler.source += `, ${x}, ${y}, ${width}, ${height}, ${dir}, `;
                    compiler.source += `${cropX}, ${cropY}, ${cropWidth}, ${cropHeight});\n`;
                    compiler.source += `${canvas}._monitorUpToDate = false;\n`;
                },
                getWidthOfCanvas: (node, compiler, {TYPE_NUMBER, TypedInput}) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    return new TypedInput(`${canvas}.canvas.width`, TYPE_NUMBER);
                },
                getHeightOfCanvas: (node, compiler, {TYPE_NUMBER, TypedInput}) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    return new TypedInput(`${canvas}.canvas.height`, TYPE_NUMBER);
                },
                beginPath: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);

                    compiler.source += `${ctx}.beginPath();\n`;
                },
                moveTo: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const x = compiler.descendInput(node.x).asNumber();
                    const y = compiler.descendInput(node.y).asNumber();

                    compiler.source += `${ctx}.moveTo(${x}, ${y});\n`;
                },
                lineTo: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const x = compiler.descendInput(node.x).asNumber();
                    const y = compiler.descendInput(node.y).asNumber();

                    compiler.source += `${ctx}.lineTo(${x}, ${y});\n`;
                },
                arcTo: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const x = compiler.descendInput(node.x).asNumber();
                    const y = compiler.descendInput(node.y).asNumber();
                    const controlPoints = compiler.descendInput(node.controlPoints).asUnknown();
                    const radius = compiler.descendInput(node.radius).asNumber();

                    compiler.source += `${ctx}.arcTo(${x}, ${y}, ...${controlPoints}, ${radius});\n`;
                },
                addRect: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const x = compiler.descendInput(node.x).asNumber();
                    const y = compiler.descendInput(node.y).asNumber();
                    const width = compiler.descendInput(node.width).asNumber();
                    const height = compiler.descendInput(node.height).asNumber();

                    compiler.source += `${ctx}.rect(${x}, ${y}, ${width}, ${height});\n`;
                },
                addEllipse: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const x = compiler.descendInput(node.x).asNumber();
                    const y = compiler.descendInput(node.y).asNumber();
                    const width = compiler.descendInput(node.width).asNumber();
                    const height = compiler.descendInput(node.height).asNumber();
                    const dir = compiler.descendInput(node.dir).asNumber();

                    compiler.source += `${ctx}.ellipse(${x}, ${y}, ${width}, ${height}, ${dir} * Math.PI / 180, 0, 2 * Math.PI);\n`;
                },
                addEllipseStartStop: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const x = compiler.descendInput(node.x).asNumber();
                    const y = compiler.descendInput(node.y).asNumber();
                    const width = compiler.descendInput(node.width).asNumber();
                    const height = compiler.descendInput(node.height).asNumber();
                    const dir = compiler.descendInput(node.dir).asNumber();
                    const start = compiler.descendInput(node.start).asNumber();
                    const end = compiler.descendInput(node.end).asNumber();

                    compiler.source += `${ctx}.ellipse(${x}, ${y}, ${width}, ${height}, ${dir} * Math.PI / 180, ${start} * Math.PI / 180, ${end} * Math.PI / 180);\n`;
                },
                closePath: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);

                    compiler.soource += `${ctx}.closePath()`;
                },
                stroke: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);

                    compiler.source += `${ctx}.stroke();\n`;
                    compiler.source += `${canvas}._monitorUpToDate = false;\n`;
                },
                fill: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);

                    compiler.source += `${ctx}.fill();\n`;
                    compiler.source += `${canvas}._monitorUpToDate = false;\n`;
                }                
            }
        };
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
        const width = WIDTH ?? image.width;
        const height = HEIGHT ?? image.height;
        const drawArgs = [CROPX, CROPY, CROPW, CROPH, X, Y, width, height];

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
    getWidthOfPreloaded ({ name }) {
        if (!this.preloadedImages.hasOwnProperty(name)) return 0;
        return this.preloadedImages[name].width;
    }
    getHeightOfPreloaded ({ name }) {
        if (!this.preloadedImages.hasOwnProperty(name)) return 0;
        return this.preloadedImages[name].height;
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

    getWidthOfCanvas({ canvas }, util) {
        const canvasObj = this.getOrCreateVariable(util.target, canvas.id, canvas.name);
        return canvasObj.size[0];
    }
    getHeightOfCanvas({ canvas }, util) {
        const canvasObj = this.getOrCreateVariable(util.target, canvas.id, canvas.name);
        return canvasObj.size[1];
    }
}

module.exports = canvas;
