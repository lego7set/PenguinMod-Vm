const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const Cast = require('../../util/cast');

class JgScriptsBlocks {
  /**
   * Class for Script blocks
   * @constructor
   */
  constructor(runtime) {
    /**
     * The runtime instantiating this block package.
     * @type {Runtime}
     */
    this.runtime = runtime;
    this.scripts = {};

    this.runtime.on("PROJECT_START", () => { this.scripts = {} });
    this.runtime.on("PROJECT_STOP_ALL", () => { this.scripts = {} });
  }
  /**
   * @returns {object} metadata for this extension and its blocks.
  */
  getInfo() {
    return {
      id: "jgScripts",
      name: "Scripts",
      color1: "#8c8c8c",
      color2: "#7a7a7a",
      blocks: [{
          opcode: "createScript",
          blockType: BlockType.COMMAND,
          text: "create script named [NAME]",
          arguments: {
            NAME: { type: ArgumentType.STRING, defaultValue: "Script1" }
          },
        },
        {
          opcode: "deleteScript",
          blockType: BlockType.COMMAND,
          text: "delete script named [NAME]",
          arguments: {
            NAME: { type: ArgumentType.STRING, defaultValue: "Script1" }
          },
        },
        {
          opcode: "deleteAll",
          blockType: BlockType.COMMAND,
          text: "delete all scripts"
        },
        {
          opcode: "allScripts",
          blockType: BlockType.REPORTER,
          text: "all scripts"
        },
        {
          opcode: "scriptExists",
          blockType: BlockType.BOOLEAN,
          text: "script named [NAME] exists?",
          arguments: {
            NAME: { type: ArgumentType.STRING, defaultValue: "Script1" }
          },
        },
        "---",
        {
          opcode: "addBlocksTo",
          blockType: BlockType.COMMAND,
          text: ["add blocks", "to script [NAME]"],
          branchCount: 1,
          arguments: {
            NAME: { type: ArgumentType.STRING, defaultValue: "Script1" }
          },
        },
        {
          opcode: "JGreturn",
          text: "return [THING]",
          blockType: BlockType.COMMAND,
          isTerminal: true,
          arguments: {
            THING: { type: ArgumentType.STRING, defaultValue: "1" }
          },
        },
        "---",
        {
          opcode: "runBlocks",
          text: "run script [NAME] in [SPRITE]",
          blockType: BlockType.LOOP,
          branchCount: -1,
          branchIconURI: "",
          arguments: {
            NAME: { type: ArgumentType.STRING, defaultValue: "Script1" },
            SPRITE: { type: ArgumentType.STRING, menu: "TARGETS" }
          },
        },
        {
          opcode: "reportBlocks",
          text: "run script [NAME] in [SPRITE]",
          blockType: BlockType.REPORTER,
          arguments: {
            NAME: { type: ArgumentType.STRING, defaultValue: "Script1" },
            SPRITE: { type: ArgumentType.STRING, menu: "TARGETS" }
          },
        }
      ],
      menus: {
        TARGETS: { acceptReporters: true, items: "getTargets" }
      },
    };
  }

  getTargets() {
    const spriteNames = [
      { text: "myself", value: "_myself_" },
      { text: "Stage", value: "_stage_" }
    ];
    const targets = this.runtime.targets;
    for (let index = 1; index < targets.length; index++) {
      const target = targets[index];
      if (target.isOriginal) spriteNames.push({
        text: target.getName(),
        value: target.getName()
      });
    }
    return spriteNames.length > 0 ? spriteNames : [""];
  }

  createScript(args) {
    const name = Cast.toString(args.NAME);
    scripts[name] = { blocks: [] };
  }

  deleteScript(args) { delete scripts[Cast.toString(args.NAME)] }

  deleteAll() { scripts = {} }

  allScripts() { return JSON.stringify(Object.keys(scripts)) }

  scriptExists(args) { return Cast.toBoolean(scripts[args.NAME]) }

  addBlocksTo(args, util) {
    const name = Cast.toString(args.NAME);
    const branch = util.thread.target.blocks.getBranch(util.thread.peekStack(), 1);
    if (branch && scripts[name] !== undefined && scripts[name].blocks.indexOf(branch) === -1) {
      scripts[name].blocks.push(branch);
    }
  }

  JGreturn(args, util) { util.thread.report = Cast.toString(args.THING) }

  runBlocks(args, util) {
    const target = args.SPRITE === "_myself_" ? util.target :
      args.SPRITE === "_stage_" ? this.runtime.getTargetForStage() : this.runtime.getSpriteTargetByName(args.SPRITE);
    const name = Cast.toString(args.NAME);
    if (scripts[name] === undefined || !target) return;

    if (util.stackFrame.JGindex === undefined) util.stackFrame.JGindex = 0;
    if (util.stackFrame.JGthread === undefined) util.stackFrame.JGthread = "";
    const blocks = scripts[name].blocks;
    const index = util.stackFrame.JGindex;
    const thread = util.stackFrame.JGthread;
    if (!thread && index < blocks.length) {
      util.stackFrame.JGthread = this.runtime._pushThread(blocks[index], util.target);
      util.stackFrame.JGthread.target = target;
      util.stackFrame.JGthread.tryCompile(); // update thread
      util.stackFrame.JGindex = util.stackFrame.JGindex + 1;
    }

    // same behaviour for util.yield()
    if (thread && this.runtime.isActiveThread(thread)) util.startBranch(1, true);
    else util.stackFrame.JGthread = "";
    if (util.stackFrame.JGindex < blocks.length) util.startBranch(1, true);
  }

  reportBlocks(args, util) {
    const target = args.SPRITE === "_myself_" ? util.target :
      args.SPRITE === "_stage_" ? this.runtime.getTargetForStage() : this.runtime.getSpriteTargetByName(args.SPRITE);
    const name = Cast.toString(args.NAME);
    if (scripts[name] === undefined || !target) return;

    if (util.stackFrame.JGindex === undefined) util.stackFrame.JGindex = 0;
    if (util.stackFrame.JGthread === undefined) util.stackFrame.JGthread = "";
    const blocks = scripts[name].blocks;
    const index = util.stackFrame.JGindex;
    const thread = util.stackFrame.JGthread;
    if (!thread && index < blocks.length) {
      util.stackFrame.JGthread = this.runtime._pushThread(blocks[index], util.target);
      util.stackFrame.JGthread.target = target;
      util.stackFrame.JGthread.tryCompile(); // update thread
      util.stackFrame.JGindex = util.stackFrame.JGindex + 1;
    }

    if (util.stackFrame.JGthread && this.runtime.isActiveThread(util.stackFrame.JGthread)) util.yield();
    else {
      if (util.stackFrame.JGthread.report !== undefined) {
        util.stackFrame.JGreport = util.stackFrame.JGthread.report;
        util.stackFrame.JGindex = blocks.length + 1;
      }
      util.stackFrame.JGthread = "";
    }
    if (util.stackFrame.JGindex < blocks.length) util.yield();
    return util.stackFrame.JGreport || "";
  }
}

module.exports = JgScriptsBlocks;
