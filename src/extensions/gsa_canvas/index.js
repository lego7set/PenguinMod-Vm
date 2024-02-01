/* eslint-disable no-invalid-this */
/* eslint-disable no-undef */
const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const MathUtil = require('../../util/math-util');
const CanvasVar = require('./canvasData');
const uid = require('../../util/uid');

const sanitize = string => {
    if (typeof string !== 'string') {
        log.warn(`sanitize got unexpected type: ${typeof string}`);
        string = '' + string;
    }
    return JSON.stringify(string).slice(1, -1);
};
const DefaultDrawImage = 'https://studio.penguinmod.com/favicon.ico'; 
const canvasPropInfos = [
    ['compositing method', 'globalCompositeOperation', [
        ['source over', 'source-over'],
        ['source in', 'source-in'],
        ['source out', 'source-out'],
        ['source atop', 'source-atop'],
        ['destination over', 'destination-over'],
        ['destination in', 'destination-in'],
        ['destination out', 'destination-out'],
        ['destination atop', 'destination-atop'],
        ['lighter', 'lighter'],
        ['copy', 'copy'],
        ['xor', 'xor'],
        ['multiply', 'multiply'],
        ['screen', 'screen'],
        ['overlay', 'overlay'],
        ['darken', 'darken'],
        ['lighten', 'lighten'],
        ['color dodge', 'color-dodge'],
        ['color burn', 'color-burn'],
        ['hard light', 'hard-light'],
        ['soft light', 'soft-light'],
        ['difference', 'difference'],
        ['exclusion', 'exclusion'],
        ['hue', 'hue'],
        ['saturation', 'saturation'],
        ['color', 'color'],
        ['luminosity', 'luminosity']
    ], 'source-over'],
    ['CSS filter', 'filter', ArgumentType.STRING, 'none'],
    ['font', 'font', ArgumentType.STRING, ''],
    ['font kerning method', 'fontKerning', [
        ['browser defined', 'auto'],
        ['font defined', 'normal'],
        ['none', 'none']
    ], 'normal'],
    ['font stretch', 'fontStretch', [
        ['ultra condensed', 'ultra-condensed'],
        ['extra condensed', 'extra-condensed'],
        ['condensed', 'condensed'],
        ['normal', 'normal'],
        ['semi expanded', 'semi-expanded'],
        ['expanded', 'expanded'],
        ['extra expanded', 'extra-expanded'],
        ['ultra expanded', 'ultra-expanded']
    ], 'normal'],
    ['font case sizing', 'fontVariantCaps', [
        ['normal', 'normal'],
        ['uni-case', 'unicase'],
        ['titling-case', 'titling-caps'],
        ['smaller uppercase', 'small-caps'],
        ['smaller cased characters', 'all-small-caps'],
        ['petite uppercase', 'petite-caps'],
        ['petite cased characters', 'all-petite-caps']
    ], 'normal'],
    ['transparency', 'globalAlpha', ArgumentType.NUMBER, '0'],
    ['image smoothing', 'imageSmoothingEnabled', ArgumentType.BOOLEAN, ''],
    ['image smoothing quality', 'imageSmoothingQuality', [
        ['low', 'low'],
        ['medium', 'medium'],
        ['high', 'high']
    ], 'low'],
    ['letter spacing', 'letterSpacing', ArgumentType.NUMBER, '0'],
    ['line cap shape', 'lineCap', [
        ['sharp', 'butt'],
        ['round', 'round'],
        ['square', 'square']
    ], 'butt'],
    ['line dash offset', 'lineDashOffset', ArgumentType.NUMBER, '0'],
    ['line join shape', 'lineJoin', [
        ['round', 'round'],
        ['beveled', 'bevel'],
        ['sharp', 'miter']
    ], 'miter'],
    ['line size', 'lineWidth', ArgumentType.NUMBER, '1'],
    ['sharp line join limit', 'miterLimit', ArgumentType.NUMBER, '10'],
    ['shadow blur', 'shadowBlur', ArgumentType.NUMBER, '0'],
    ['shadow color', 'shadowColor', ArgumentType.COLOR, null],
    ['shadow X offset', 'shadowOffsetX', ArgumentType.NUMBER, '0'],
    ['shadow Y offset', 'shadowOffsetY', ArgumentType.NUMBER, '0'],
    ['line color', 'strokeStyle', ArgumentType.COLOR, null],
    ['text horizontal alignment', 'textAlign', [
        ['start', 'start'],
        ['left', 'left'],
        ['center', 'center'],
        ['right', 'right'],
        ['end', 'end']
    ], 'start'],
    ['text vertical alignment', 'textBaseline', [
        ['top', 'top'],
        ['hanging', 'hanging'],
        ['middle', 'middle'],
        ['alphabetic', 'alphabetic'],
        ['ideographic', 'ideographic'],
        ['bottom', 'bottom']
    ], 'alphabetic'],
    ['text rendering optimisation', 'textRendering', [
        ['auto', 'auto'],
        ['render speed', 'optimizeSpeed'],
        ['legibility', 'optimizeLegibility'],
        ['geometric precision', 'geometricPrecision']
    ], 'auto'],
    ['word spacing', 'wordSpacing', ArgumentType.NUMBER, '0']
];

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
        this.propList = [];
        this.sbInfo = {};
        for (const item of canvasPropInfos) {
            this.propList.push(item.slice(0, 2));
            const info = {
                isDummy: false,
                default: item[3],
                type: item[2]
            };
            switch (item[2]) {
            case ArgumentType.STRING:
                info.shadow = 'text';
                break;
            case ArgumentType.NUMBER:
                info.shadow = 'math_number';
                break;
            case ArgumentType.BOOLEAN:
                info.check = 'Boolean';
                break;
            case ArgumentType.COLOR:
                info.shadow = 'colour_picker';
                break;
            default:
                info.isDummy = true;
                info.options = item[2];
            }
            this.sbInfo[item[1]] = info;
        }
        this.runtime.registerVariable('canvas', CanvasVar);
        this.runtime.registerCompiledExtensionBlocks('newCanvas', this.getCompileInfo());

        const updateVariables = type => {
            if (type === 'canvas') {
                this.runtime.vm.emitWorkspaceUpdate();
            }
        };
        this.runtime.on('variableCreate', updateVariables);
        this.runtime.on('variableChange', updateVariables);
        this.runtime.on('variableDelete', updateVariables);
        let infoObj = {};
        Object.defineProperty(ScratchBlocks.Blocks, 'newCanvas_setProperty', {
            set: block => {
                this._implementSBInfo(block);
                infoObj = block;
            },
            get: () => infoObj
        });
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

    _implementSBInfo(block) {
        const info = this.sbInfo;
        block.renderInput = function(item) {
            if (!item) item = this.getFieldValue('prop');
            const existingInput = this.getInput('value');
            const isInputCurrentlyUsed = existingInput.type !== ScratchBlocks.DUMMY_INPUT
                && !existingInput.connection.targetBlock()?.isShadow?.();
            const target = info[item];
            if (this.lastItem === item || (isInputCurrentlyUsed && !target.isDummy)) return;
            this.removeInput('value');
            if (target.isDummy) {
                const inp = this.appendDummyInput('value');
                const field = new ScratchBlocks.FieldDropdown(target.options);
                inp.appendField(field, 'value');
                field.setValue(target.default);
                return;
            }
        
            const inp = this.appendValueInput('value');
            inp.setCheck(target.check);
            if (target.shadow && !this.isInsertionMarker()) {
                const shadow = this.workspace.newBlock(target.shadow);
                shadow.setShadow(true);
                shadow.initSvg();
                shadow.inputList[0].fieldRow[0].setValue(target.default);
                inp.connection.connect(shadow.outputConnection);
                shadow.render(false);
            }
        };
        const oldInit = block.init;
        block.init = function() {
            oldInit.apply(this);
            this.appendDummyInput('value');
            const dropdownField = this.getField('prop');
            dropdownField.setValidator(item => {
                this.renderInput(item);
                return item;
            });
            this.renderInput();
        };
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: 'newCanvas',
            name: 'html canvas',
            color1: '#0069c2',
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
                    opcode: 'setProperty',
                    text: 'set [prop] of [canvas] to ',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        },
                        prop: {
                            type: ArgumentType.STRING,
                            menu: 'canvasProps'
                        }
                    },
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'getProperty',
                    text: 'get [prop] of [canvas]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        },
                        prop: {
                            type: ArgumentType.STRING,
                            menu: 'canvasProps'
                        }
                    },
                    blockType: BlockType.REPORTER
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
                },
                {
                    blockType: BlockType.LABEL,
                    text: "utilizing"
                },
                {
                    opcode: 'putOntoSprite',
                    blockType: BlockType.COMMAND,
                    text: 'set this sprites costume to [canvas]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
                        }
                    }
                },
                {
                    opcode: 'getDataURI',
                    blockType: BlockType.REPORTER,
                    text: 'get data URL of [canvas]',
                    arguments: {
                        canvas: {
                            type: ArgumentType.STRING,
                            menu: 'canvas'
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
                }
            ],
            menus: {
                canvas: {
                    variableType: 'canvas'
                },
                canvasProps: {
                    items: this.propList
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
                target.createVariable(uid(), name, 'canvas');
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
                setSize: (generator, block) => ({
                    kind: 'stack',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas'),
                    width: generator.descendInputOfBlock(block, 'width'),
                    height: generator.descendInputOfBlock(block, 'height')
                }),
                setProperty: (generator, block) => ({
                    kind: 'stack',
                    isField: !!block.fields.value,
                    prop: block.fields.prop.value,
                    value: block.fields?.value?.value ?? generator.descendInputOfBlock(block, 'value'),
                    canvas: generator.descendVariable(block, 'canvas', 'canvas')
                }),
                getProperty: (generator, block) => ({
                    kind: 'input',
                    prop: block.fields.prop.value,
                    canvas: generator.descendVariable(block, 'canvas', 'canvas')
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
                }),
                putOntoSprite: (generator, block) => ({
                    kind: 'stack',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas')
                }),
                getDataURI: (generator, block) => ({
                    kind: 'input',
                    canvas: generator.descendVariable(block, 'canvas', 'canvas')
                })
            },
            js: {
                canvasGetter: (node, compiler, {TypedInput, TYPE_UNKNOWN}) => 
                    new TypedInput(compiler.referenceVariable(node.canvas), TYPE_UNKNOWN),
                setSize: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const width = compiler.descendInput(node.width).asNumber();
                    const height = compiler.descendInput(node.height).asNumber();

                    compiler.source += `${canvas}.canvas.width = ${width};\n`;
                    compiler.source += `${canvas}.canvas.height = ${height};\n`;
                },
                setProperty: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const val = node.isField 
                        ? node.value
                        : compiler.descendInput(node.value);

                    compiler.source += `${ctx}.${node.prop} = `;
                    const target = this.sbInfo[node.prop];
                    switch (target.type) {
                    case ArgumentType.STRING:
                        compiler.source += val.asString();
                        break;
                    case ArgumentType.NUMBER:
                        compiler.source += val.asNumber();
                        break;
                    case ArgumentType.BOOLEAN:
                        compiler.source += val.asBoolean();
                        break;
                    case ArgumentType.COLOR:
                        compiler.source += val.asString();
                        break;
                    default:
                        compiler.source += `"${sanitize(val)}"`;
                    }
                    compiler.source += ';\n';
                },
                getProperty: (node, compiler, {TypedInput, TYPE_NUMBER, TYPE_STRING, TYPE_BOOLEAN, TYPE_UNKNOWN}) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);

                    let type = TYPE_UNKNOWN;
                    const target = this.sbInfo[node.prop];
                    switch (target.type) {
                    case ArgumentType.STRING:
                        type = TYPE_STRING;
                        break;
                    case ArgumentType.NUMBER:
                        type = TYPE_NUMBER;
                        break;
                    case ArgumentType.BOOLEAN:
                        type = TYPE_BOOLEAN;
                        break;
                    case ArgumentType.COLOR:
                        type = TYPE_STRING;
                        break;
                    default:
                        type = TYPE_STRING;
                    }
                    return new TypedInput(`${ctx}.${node.prop}`, type);
                },
                dash: (node, compiler, {ConstantInput}) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const arrInp = compiler.descendInput(node.dashing);
                    const isConstant = arrInp instanceof ConstantInput;

                    compiler.source += `${ctx}.setLineDash(`;
                    if (!isConstant) compiler.source += `parseJSONSafe(`;
                    compiler.source += isConstant 
                        ? arrInp.constantValue
                        : arrInp.asUnknown();
                    if (!isConstant) compiler.source += ')';
                    compiler.source += ');\n';
                },
                clearCanvas: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);

                    compiler.source += `${ctx}.clearRect(0, 0, ${canvas}.canvas.width, ${canvas}.canvas.height);\n`;
                    compiler.source += `${canvas}._monitorUpToDate = false;\n`;
                    compiler.source += `${canvas}.updateCanvasSkin();\n`;
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
                    compiler.source += `${canvas}.updateCanvasSkin();\n`;
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
                    compiler.source += `${canvas}.updateCanvasSkin();\n`;
                },
                preloadUriImage: (node, compiler) => {
                    const allPreloaded = compiler.evaluateOnce('{}');
                    const preloadName = compiler.descendInput(node.NAME).asString();
                    const preloadUri = compiler.descendInput(node.URI).asUnknown();

                    compiler.source += `${allPreloaded}[${preloadName}] = yield* waitPromise(`;
                    compiler.source += `resolveImageURL(${preloadUri})`;
                    compiler.source += ');\n';
                },
                unloadUriImage: (node, compiler) => {
                    const allPreloaded = compiler.evaluateOnce('{}');
                    const preloadName = compiler.descendInput(node.NAME).asString();

                    compiler.source += `if (${allPreloaded}[${preloadName}]) {`;
                    compiler.source += `${allPreloaded}[${preloadName}].remove();\n`;
                    compiler.source += `delete ${allPreloaded}[${preloadName}];\n`;
                    compiler.source += '}';
                },
                getWidthOfPreloaded: (node, compiler, {TypedInput, TYPE_NUMBER}) => {
                    const allPreloaded = compiler.evaluateOnce('{}');
                    const preloadName = compiler.descendInput(node.name).asString();
                    return new TypedInput(`${allPreloaded}[${preloadName}]?.width ?? 0`, TYPE_NUMBER);
                },
                getHeightOfPreloaded: (node, compiler, {TypedInput, TYPE_NUMBER}) => {
                    const allPreloaded = compiler.evaluateOnce('{}');
                    const preloadName = compiler.descendInput(node.name).asString();
                    return new TypedInput(`${allPreloaded}[${preloadName}]?.height ?? 0`, TYPE_NUMBER);
                },
                drawUriImage: (node, compiler) => {
                    const allPreloaded = compiler.evaluateOnce('{}');
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const uri = compiler.descendInput(node.URI).asUnknown();
                    const x = compiler.descendInput(node.X).asNumber();
                    const y = compiler.descendInput(node.Y).asNumber();

                    compiler.source += `${ctx}.drawImage(`;
                    compiler.source += `${allPreloaded}[${uri}]`;
                    compiler.source += `? ${allPreloaded}[${uri}]`;
                    compiler.source += `: yield* waitPromise(resolveImageURL(${uri}))`;
                    compiler.source += `, ${x}, ${y});\n`;
                    compiler.source += `${canvas}._monitorUpToDate = false;\n`;
                    compiler.source += `${canvas}.updateCanvasSkin();\n`;
                },
                drawUriImageWHR: (node, compiler) => {
                    const allPreloaded = compiler.evaluateOnce('{}');
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const uri = compiler.descendInput(node.URI).asUnknown();
                    const x = compiler.descendInput(node.X).asNumber();
                    const y = compiler.descendInput(node.Y).asNumber();
                    const width = compiler.descendInput(node.WIDTH).asNumber();
                    const height = compiler.descendInput(node.HEIGHT).asNumber();
                    const dir = compiler.descendInput(node.ROTATE).asNumber();

                    compiler.source += `${ctx}.drawImage(`;
                    compiler.source += `${allPreloaded}[${uri}] ? `;
                    compiler.source += `${allPreloaded}[${uri}] : `;
                    compiler.source += `yield* waitPromise(resolveImageURL(${uri}))`;
                    compiler.source += `, ${x}, ${y}, ${width}, ${height}, ${dir});\n`;
                    compiler.source += `${canvas}._monitorUpToDate = false;\n`;
                    compiler.source += `${canvas}.updateCanvasSkin();\n`;
                },
                drawUriImageWHCX1Y1X2Y2R: (node, compiler) => {
                    const allPreloaded = compiler.evaluateOnce('{}');
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);
                    const uri = compiler.descendInput(node.URI).asUnknown();
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
                    compiler.source += `${allPreloaded}[${uri}] ? `;
                    compiler.source += `${allPreloaded}[${uri}] : `;
                    compiler.source += `yield* waitPromise(resolveImageURL(${uri}))`;
                    compiler.source += `, ${x}, ${y}, ${width}, ${height}, ${dir}, `;
                    compiler.source += `${cropX}, ${cropY}, ${cropWidth}, ${cropHeight});\n`;
                    compiler.source += `${canvas}._monitorUpToDate = false;\n`;
                    compiler.source += `${canvas}.updateCanvasSkin();\n`;
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

                    compiler.source += `${ctx}.ellipse(${x}, ${y}, ${width}, ${height}`;
                    compiler.source += `, ${dir} * Math.PI / 180, 0, 2 * Math.PI);\n`;
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

                    compiler.source += `${ctx}.ellipse(${x}, ${y}, ${width}, ${height}, `;
                    compiler.source += `${dir} * Math.PI / 180, ${start} * Math.PI / 180, ${end} * Math.PI / 180);\n`;
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
                    compiler.source += `${canvas}.updateCanvasSkin();\n`;
                },
                fill: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    const ctx = compiler.evaluateOnce(`${canvas}.canvas.getContext('2d')`);

                    compiler.source += `${ctx}.fill();\n`;
                    compiler.source += `${canvas}._monitorUpToDate = false;\n`;
                    compiler.source += `${canvas}.updateCanvasSkin();\n`;
                },
                putOntoSprite: (node, compiler) => {
                    const canvas = compiler.referenceVariable(node.canvas);

                    compiler.source += `${canvas}.applyCanvasToTarget(target);\n`;
                },
                getDataURI: (node, compiler, {TypedInput, TYPE_STRING}) => {
                    const canvas = compiler.referenceVariable(node.canvas);
                    return new TypedInput(`${canvas}.toString()`, TYPE_STRING);
                }
            }
        };
    }

    getOrCreateVariable(target, id, name) {
        const variable = target.variables[id];
        if (!variable) {
            target.createVariable(id, name);
        }
    }
    // display monitors
    canvasGetter(args, util) {
        const canvasObj = this.getOrCreateVariable(util.target, args.canvas.id, args.canvas.name);
        return canvasObj;
    }
    getProperty(args, util) {
        const canvasObj = this.getOrCreateVariable(util.target, args.canvas.id, args.canvas.name);
        const ctx = canvasObj.canvas.getContext('2d');

        return ctx[args.prop];
    }
    getDataURI(args, util) {
        const canvasObj = this.getOrCreateVariable(util.target, args.canvas.id, args.canvas.name);
        return canvasObj.toString();
    }
    getWidthOfPreloaded ({ name }) {
        if (!this.preloadedImages.hasOwnProperty(name)) return 0;
        return this.preloadedImages[name].width;
    }
    getHeightOfPreloaded ({ name }) {
        if (!this.preloadedImages.hasOwnProperty(name)) return 0;
        return this.preloadedImages[name].height;
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
