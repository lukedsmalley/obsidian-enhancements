'use strict';

var require$$0$2 = require('node:fs/promises');
var require$$1 = require('node:path');
var require$$0 = require('obsidian');
var require$$0$1 = require('node:child_process');
var require$$5 = require('@codemirror/state');
var require$$6 = require('@codemirror/view');
var require$$7 = require('@codemirror/language');

var main = {};

var launchProcess = {};

var shared = {};

Object.defineProperty(shared, "__esModule", { value: true });
shared.render = shared.ExtensionContext = void 0;
const obsidian_1$1 = require$$0;
class ExtensionContext {
    constructor(plugin, extensionData, extensionName) {
        this.plugin = plugin;
        this.extensionData = extensionData;
        this.extensionName = extensionName;
        if (!(plugin.app.vault.adapter instanceof obsidian_1$1.FileSystemAdapter)) {
            throw new Error('Unsupported vault storage adapter');
        }
        this.vaultPath = plugin.app.vault.adapter.getBasePath();
        this.vaultConfigDir = this.plugin.app.vault.configDir;
    }
    addStatusBarItem() {
        return this.plugin.addStatusBarItem();
    }
    getData() {
        return this.extensionData[this.extensionName];
    }
    async saveData(data) {
        this.extensionData[this.extensionName] = data;
        await this.plugin.saveData(this.extensionData);
    }
}
shared.ExtensionContext = ExtensionContext;
function render(templateText, context, code) {
    return templateText.replaceAll('{VAULT_PATH}', context.vaultPath)
        .replaceAll('{VAULT_CONFIG_DIR}', context.vaultConfigDir)
        .replaceAll('{CODE}', code ? code.text : '')
        .replaceAll('{FILE_PATH}', code ? code.filePath : '')
        .replaceAll('{OFFSET}', code ? String(code.offset) : '');
}
shared.render = render;

Object.defineProperty(launchProcess, "__esModule", { value: true });
launchProcess.ProcessLauncher = launchProcess.ProcessLauncherFactory = void 0;
const node_child_process_1 = require$$0$1;
const shared_1$3 = shared;
class ProcessLauncherFactory {
    constructor(context) {
        this.context = context;
    }
    static async create(context) {
        return new ProcessLauncherFactory(context);
    }
    async build(config) {
        return new ProcessLauncher(config, this.context);
    }
}
launchProcess.ProcessLauncherFactory = ProcessLauncherFactory;
class ProcessLauncher {
    constructor(config, context) {
        this.config = config;
        this.context = context;
    }
    async execute(code) {
        const cwd = this.config.workingPath ? (0, shared_1$3.render)(this.config.workingPath, this.context, code) : this.context.vaultPath;
        const args = this.config.args ? this.config.args.map(template => (0, shared_1$3.render)(template, this.context, code)) : [];
        (0, node_child_process_1.spawn)((0, shared_1$3.render)(this.config.executablePath, this.context, code), args, { cwd });
    }
}
launchProcess.ProcessLauncher = ProcessLauncher;

var makeDirectory = {};

Object.defineProperty(makeDirectory, "__esModule", { value: true });
makeDirectory.DirectoryMaker = makeDirectory.DirectoryMakerFactory = void 0;
const promises_1$2 = require$$0$2;
const shared_1$2 = shared;
class DirectoryMakerFactory {
    constructor(context) {
        this.context = context;
    }
    static async create(context) {
        return new DirectoryMakerFactory(context);
    }
    async build(config) {
        return new DirectoryMaker(config, this.context);
    }
}
makeDirectory.DirectoryMakerFactory = DirectoryMakerFactory;
class DirectoryMaker {
    constructor(config, context) {
        this.config = config;
        this.context = context;
    }
    async execute(code) {
        await (0, promises_1$2.mkdir)((0, shared_1$2.render)(this.config.path, this.context, code), { recursive: !!this.config.recursive });
    }
}
makeDirectory.DirectoryMaker = DirectoryMaker;

var writeFile = {};

Object.defineProperty(writeFile, "__esModule", { value: true });
writeFile.FileWriter = writeFile.FileWriterFactory = void 0;
const promises_1$1 = require$$0$2;
const shared_1$1 = shared;
class FileWriterFactory {
    constructor(context) {
        this.context = context;
    }
    static async create(context) {
        return new FileWriterFactory(context);
    }
    async build(config) {
        return new FileWriter(config, this.context);
    }
}
writeFile.FileWriterFactory = FileWriterFactory;
class FileWriter {
    constructor(config, context) {
        this.config = config;
        this.context = context;
    }
    async execute(code) {
        await (0, promises_1$1.writeFile)((0, shared_1$1.render)(this.config.path, this.context, code), (0, shared_1$1.render)(this.config.text || '', this.context, code), (0, shared_1$1.render)(this.config.encoding || '', this.context, code));
    }
}
writeFile.FileWriter = FileWriter;

Object.defineProperty(main, "__esModule", { value: true });
const promises_1 = require$$0$2;
const node_path_1 = require$$1;
const obsidian_1 = require$$0;
const launch_process_1 = launchProcess;
const shared_1 = shared;
const state_1 = require$$5;
const view_1 = require$$6;
const language_1 = require$$7;
const make_directory_1 = makeDirectory;
const write_file_1 = writeFile;
async function runActions(actions, code) {
    for (const action of actions) {
        await action.execute(code);
    }
}
class CodeBlockActionBarWidget extends view_1.WidgetType {
    constructor(buttonSkeletons, code) {
        super();
        this.buttonSkeletons = buttonSkeletons;
        this.code = code;
    }
    toDOM() {
        const actionBar = document.createElement('div');
        actionBar.classList.add('oe-code-block-action-bar');
        for (const { text, actions } of this.buttonSkeletons) {
            const actionButton = document.createElement('span');
            actionButton.classList.add('oe-code-block-action-button');
            actionButton.appendText(text);
            actionButton.addEventListener('click', () => {
                if (actions) {
                    runActions(actions, this.code).catch(console.error);
                }
                else {
                    console.error('No action was specified for this button');
                }
            });
            actionBar.appendChild(actionButton);
        }
        return actionBar;
    }
}
class EnhancementPlugin extends obsidian_1.Plugin {
    async onload() {
        const extensionData = await this.loadData();
        const builtinContext = new shared_1.ExtensionContext(this, extensionData, 'builtin-enhancements');
        const pluginPath = (0, node_path_1.join)(builtinContext.vaultPath, builtinContext.vaultConfigDir, 'plugins', 'enhancements');
        const actionBuilders = {
            'launch-process': await launch_process_1.ProcessLauncherFactory.create(builtinContext),
            'make-directory': await make_directory_1.DirectoryMakerFactory.create(builtinContext),
            'write-file': await write_file_1.FileWriterFactory.create(builtinContext)
            //'execute-javascript': await JavaScriptExecutorFactory.create(builtinContext)
        };
        const modulePath = (0, node_path_1.join)(pluginPath, 'extensions');
        for (const moduleName of await (0, promises_1.readdir)(modulePath)) {
            const extensionModule = require((0, node_path_1.join)(modulePath, moduleName));
            const context = new shared_1.ExtensionContext(this, extensionData, moduleName);
            for (const actionName in extensionModule.actions) {
                actionBuilders[actionName] = await extensionModule.actions[actionName].create(context);
            }
        }
        const config = JSON.parse(await (0, promises_1.readFile)((0, node_path_1.join)(pluginPath, 'config.json'), 'utf8'));
        if (config.icons) {
            for (const { name, markup } of config.icons) {
                (0, obsidian_1.addIcon)(name, markup);
            }
        }
        if (config.ribbonButtons) {
            for (const { icon: iconName, hoverText, actions: actionConfigs } of config.ribbonButtons) {
                let actions = [];
                if (actionConfigs) {
                    try {
                        actions = await Promise.all(actionConfigs.map(actionConfig => {
                            if (!(actionConfig.type in actionBuilders)) {
                                throw new Error(`Unknown action type '${actionConfig.type}' (Not built in, module missing or failed to load)`);
                            }
                            return actionBuilders[actionConfig.type].build(actionConfig);
                        }));
                    }
                    catch (error) {
                        console.error(error);
                        continue;
                    }
                }
                this.addRibbonIcon(iconName, hoverText, () => {
                    var _a;
                    if (actions) {
                        const activeFile = this.app.workspace.getActiveFile();
                        const activeView = (_a = this.app.workspace.getMostRecentLeaf()) === null || _a === void 0 ? void 0 : _a.view;
                        const code = activeFile && activeView instanceof obsidian_1.TextFileView
                            ? {
                                text: activeView.getViewData(),
                                filePath: (0, node_path_1.join)(builtinContext.vaultPath, activeFile.path),
                                offset: 0
                            }
                            : undefined;
                        runActions(actions, code).catch(console.error);
                    }
                    else {
                        console.error('No action was specified for this button');
                    }
                });
            }
        }
        if (config.codeBlockButtons) {
            const buttonSkeletons = [];
            for (const buttonConfig of config.codeBlockButtons) {
                let actions = [];
                if (buttonConfig.actions) {
                    try {
                        actions = await Promise.all(buttonConfig.actions.map(actionConfig => {
                            if (!(actionConfig.type in actionBuilders)) {
                                throw new Error(`Unknown action type '${actionConfig.type}' (Not built in, module missing or failed to load)`);
                            }
                            return actionBuilders[actionConfig.type].build(actionConfig);
                        }));
                    }
                    catch (error) {
                        console.error(error);
                        continue;
                    }
                }
                buttonSkeletons.push({ ...buttonConfig, actions });
            }
            const plugin = this;
            this.registerEditorExtension([
                state_1.StateField.define({
                    create() {
                        return view_1.Decoration.none;
                    },
                    update(previousState, transaction) {
                        const builder = new state_1.RangeSetBuilder();
                        (0, language_1.syntaxTree)(transaction.state).iterate({
                            enter(nodeRef) {
                                if (!nodeRef.type.name.split('_').includes('HyperMD-codeblock-begin')) {
                                    return true;
                                }
                                const codeBlockStartText = transaction.state.doc.sliceString(nodeRef.from, nodeRef.to).trimStart();
                                const codeNode = nodeRef.node.nextSibling;
                                const language = codeBlockStartText.slice(3).trim();
                                const languageButtonSkeletons = buttonSkeletons.filter(skeleton => !skeleton.languages || skeleton.languages.includes(language));
                                if (!(codeBlockStartText.startsWith('```') && codeNode && language && languageButtonSkeletons.length > 0)) {
                                    return true;
                                }
                                const text = transaction.state.doc.sliceString(codeNode.from, codeNode.to);
                                const activeFile = plugin.app.workspace.getActiveFile();
                                if (text.trimStart().startsWith('```') || !(activeFile instanceof obsidian_1.TFile)) {
                                    return true;
                                }
                                const widget = new CodeBlockActionBarWidget(languageButtonSkeletons, {
                                    text,
                                    filePath: (0, node_path_1.join)(builtinContext.vaultPath, activeFile.path),
                                    offset: codeNode.from
                                });
                                builder.add(nodeRef.from, nodeRef.from, view_1.Decoration.widget({ widget }));
                            }
                        });
                        return builder.finish();
                    },
                    provide(field) {
                        return view_1.EditorView.decorations.from(field);
                    }
                })
            ]);
        }
    }
}
var _default = main.default = EnhancementPlugin;

module.exports = _default;
