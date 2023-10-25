import { FileSystemAdapter, Plugin } from 'obsidian'

export interface CodeBlockDescriptor {
  text: string
  filePath: string
  offset: number
}

export interface ActionConfig {
  type: string
}

export class ExtensionContext {
  readonly vaultPath: string
  readonly vaultConfigDir: string

  constructor(private plugin: Plugin, private extensionData: Record<string, any>, private extensionName: string) {
    if (!(plugin.app.vault.adapter instanceof FileSystemAdapter)) {
      throw new Error('Unsupported vault storage adapter')
    }
    this.vaultPath = plugin.app.vault.adapter.getBasePath()
    this.vaultConfigDir = this.plugin.app.vault.configDir
  }

  addStatusBarItem() {
    return this.plugin.addStatusBarItem()
  }

  getData() {
    return this.extensionData[this.extensionName]
  }

  async saveData(data: any) {
    this.extensionData[this.extensionName] = data
    await this.plugin.saveData(this.extensionData)
  }
}

export interface Action {
  execute(code: CodeBlockDescriptor | undefined): Promise<void>
}

export interface ActionBuilder {
  build(config: any): Promise<Action>
}

export interface ActionBuilderFactory<T> {
  create(context: ExtensionContext): Promise<ActionBuilder>
}

export function render(templateText: string, context: ExtensionContext, code?: CodeBlockDescriptor) {
  return templateText.replaceAll('{VAULT_PATH}', context.vaultPath)
    .replaceAll('{VAULT_CONFIG_DIR}', context.vaultConfigDir)
    .replaceAll('{CODE}', code ? code.text : '')
    .replaceAll('{FILE_PATH}', code ? code.filePath : '')
    .replaceAll('{OFFSET}', code ? String(code.offset) : '')
}
