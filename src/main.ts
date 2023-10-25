import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { Plugin, TFile, TextFileView, addIcon } from 'obsidian'
import { ProcessLauncherFactory } from './launch-process'
import { Action, ActionBuilder, ActionBuilderFactory, ActionConfig, CodeBlockDescriptor, ExtensionContext } from './shared'
import { RangeSetBuilder, StateField, Transaction } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { DirectoryMakerFactory } from './make-directory'
import { FileWriterFactory } from './write-file'

interface IconConfig {
  name: string
  markup: string
}

interface RibbonButtonConfig {
  icon: string
  hoverText: string
  actions: ActionConfig[] | null | undefined
}

interface CodeBlockButtonConfig {
  languages: string[] | null | undefined
  align: 'left' | 'right'
  text: string
  actions: ActionConfig[] | null | undefined
}

interface CodeBlockButtonSkeleton extends Omit<CodeBlockButtonConfig, 'actions'> {
  actions: Action[] | undefined
}

interface Config {
  icons: IconConfig[] | null | undefined
  ribbonButtons: RibbonButtonConfig[] | null | undefined
  codeBlockButtons: CodeBlockButtonConfig[] | null | undefined
}

async function runActions(actions: Action[], code?: CodeBlockDescriptor) {
  for (const action of actions) {
    await action.execute(code)
  }
}

class CodeBlockActionBarWidget extends WidgetType {
  constructor(private buttonSkeletons: CodeBlockButtonSkeleton[], private code: CodeBlockDescriptor) {
    super()
  }

  toDOM() {
    const actionBar = document.createElement('div')
    actionBar.classList.add('oe-code-block-action-bar')
    for (const { text, actions } of this.buttonSkeletons) {
      const actionButton = document.createElement('span')
      actionButton.classList.add('oe-code-block-action-button')
      actionButton.appendText(text)
      actionButton.addEventListener('click', () => {
        if (actions) {
          runActions(actions, this.code).catch(console.error)
        } else {
          console.error('No action was specified for this button')
        }
      })
      actionBar.appendChild(actionButton)
    }
    return actionBar
  }
}

interface ExtensionModule {
  actions: Record<string, ActionBuilderFactory<any>>
}

export default class EnhancementPlugin extends Plugin {
  async onload() {
    const extensionData = await this.loadData()
    const builtinContext = new ExtensionContext(this, extensionData, 'builtin-enhancements')
    const pluginPath = join(builtinContext.vaultPath, builtinContext.vaultConfigDir, 'plugins', 'enhancements')
    const actionBuilders: Record<string, ActionBuilder> = {
      'launch-process': await ProcessLauncherFactory.create(builtinContext),
      'make-directory': await DirectoryMakerFactory.create(builtinContext),
      'write-file': await FileWriterFactory.create(builtinContext)
      //'execute-javascript': await JavaScriptExecutorFactory.create(builtinContext)
    }

    const modulePath = join(pluginPath, 'extensions')
    for (const moduleName of await readdir(modulePath)) {
      const extensionModule: ExtensionModule = require(join(modulePath, moduleName))
      const context = new ExtensionContext(this, extensionData, moduleName)
      for (const actionName in extensionModule.actions) {
        actionBuilders[actionName] = await extensionModule.actions[actionName].create(context)
      }
    }

    const config: Config = JSON.parse(await readFile(join(pluginPath, 'config.json'), 'utf8'))
    
    if (config.icons) {
      for (const { name, markup } of config.icons) {
        addIcon(name, markup)
      }
    }
    
    if (config.ribbonButtons) {
      for (const { icon: iconName, hoverText, actions: actionConfigs } of config.ribbonButtons) {
        let actions: Action[] = []
        if (actionConfigs) {
          try {
            actions = await Promise.all(actionConfigs.map(actionConfig => {
              if (!(actionConfig.type in actionBuilders)) {
                throw new Error(`Unknown action type '${actionConfig.type}' (Not built in, module missing or failed to load)`)
              }
              return actionBuilders[actionConfig.type].build(actionConfig)
            }))
          } catch (error) {
            console.error(error)
            continue
          }
        }
        this.addRibbonIcon(iconName, hoverText, () => {
          if (actions) {
            const activeFile = this.app.workspace.getActiveFile()
            const activeView = this.app.workspace.getMostRecentLeaf()?.view
            const code = activeFile && activeView instanceof TextFileView
              ? {
                  text: activeView.getViewData(),
                  filePath: join(builtinContext.vaultPath, activeFile.path),
                  offset: 0
                }
              : undefined
            runActions(actions, code).catch(console.error)
          } else {
            console.error('No action was specified for this button')
          }
        })
      }
    }

    if (config.codeBlockButtons) {
      const buttonSkeletons: CodeBlockButtonSkeleton[] = []
      for (const buttonConfig of config.codeBlockButtons) {
        let actions: Action[] = []
        if (buttonConfig.actions) {
          try {
            actions = await Promise.all(buttonConfig.actions.map(actionConfig => {
              if (!(actionConfig.type in actionBuilders)) {
                throw new Error(`Unknown action type '${actionConfig.type}' (Not built in, module missing or failed to load)`)
              }
              return actionBuilders[actionConfig.type].build(actionConfig)
            }))
          } catch (error) {
            console.error(error)
            continue
          }
        }
        buttonSkeletons.push({ ...buttonConfig, actions })
      }
      
      const plugin = this
      this.registerEditorExtension([
        StateField.define({
          create() {
            return Decoration.none
          },

          update(previousState: DecorationSet, transaction: Transaction): DecorationSet {
            const builder = new RangeSetBuilder<Decoration>()
            syntaxTree(transaction.state).iterate({
              enter(nodeRef) {
                if (!nodeRef.type.name.split('_').includes('HyperMD-codeblock-begin')) {
                  return true
                }

                const codeBlockStartText = transaction.state.doc.sliceString(nodeRef.from, nodeRef.to).trimStart()
                const codeNode = nodeRef.node.nextSibling
                const language = codeBlockStartText.slice(3).trim()
                const languageButtonSkeletons = buttonSkeletons.filter(skeleton => !skeleton.languages || skeleton.languages.includes(language))
                if (!(codeBlockStartText.startsWith('```') && codeNode && language && languageButtonSkeletons.length > 0)) {
                  return true
                }

                const text = transaction.state.doc.sliceString(codeNode.from, codeNode.to)
                const activeFile = plugin.app.workspace.getActiveFile()
                if (text.trimStart().startsWith('```') || !(activeFile instanceof TFile)) {
                  return true
                }

                const widget = new CodeBlockActionBarWidget(languageButtonSkeletons, {
                  text,
                  filePath: join(builtinContext.vaultPath, activeFile.path),
                  offset: codeNode.from
                })
                builder.add(nodeRef.from, nodeRef.from, Decoration.widget({ widget }))
              }
            })
            return builder.finish()
          },

          provide(field) {
            return EditorView.decorations.from(field)
          }
        })
      ])
    }
  }
}
