import { parse } from '@babel/parser'
import { Action, CodeBlockDescriptor, ExtensionContext } from './shared'
import { LVal } from '@babel/types'
import { lstat, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

export interface ExecuteJavaScriptConfig {
  code: string
}

export class JavaScriptExecutionContext {
  private moduleCountStatusBarItem: HTMLElement
  private moduleCount = 0

  constructor(context: ExtensionContext) {
    this.moduleCountStatusBarItem = context.addStatusBarItem()
  }

  incrementModuleCount() {
    this.moduleCountStatusBarItem.empty()
    this.moduleCountStatusBarItem.createEl('span', { text: String(++this.moduleCount) })
  }
}

export class JavaScriptExecutorFactory {
  private executionContext: JavaScriptExecutionContext

  constructor(context: ExtensionContext) {
    this.executionContext = new JavaScriptExecutionContext(context)
  }

  static async create(context: ExtensionContext) {
    return new JavaScriptExecutorFactory(context)
  }

  async build(config: ExecuteJavaScriptConfig) {
    return new JavaScriptExecutor(config, this.executionContext)
  }
}

export class JavaScriptExecutor implements Action {
  constructor(private config: ExecuteJavaScriptConfig, private context: JavaScriptExecutionContext) { }

  async execute(code: CodeBlockDescriptor) {
    const file = parse(this.config.code)
    const exports: string[] = []
    for (const statement of file.program.body) {
      if (statement.type === 'VariableDeclaration') {
        exports.push(...statement.declarations.flatMap(declaration => this.getIdentifiers(declaration.id)))
      }
    }
    const moduleCode = `${this.config.code};module.exports={${exports.join()}}`
    const hash = createHash('sha256').update(moduleCode).digest('hex')
    const scriptDataPath = join(vault.path, vault.configDir, 'enhancements', 'script-data')
    const cachedScriptPath = join(scriptDataPath, hash)
    if (!(await this.isFile(cachedScriptPath))) {
      await mkdir(scriptDataPath, { recursive: true })
      await writeFile(cachedScriptPath, moduleCode, 'utf8')
      console.log(require(cachedScriptPath))
    }
  }

  private getIdentifiers(lVal: LVal) {
    switch (lVal.type) {
      case 'Identifier':
        return [lVal.name]
    }
    return []
  }

  private async isFile(path: string) {
    try {
      return (await lstat(path)).isFile()
    } catch {
      return false
    }
  }
}
