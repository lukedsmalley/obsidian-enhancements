import { mkdir } from 'node:fs/promises'
import { Action, CodeBlockDescriptor, ExtensionContext, render } from './shared'

export interface MakeDirectoryConfig {
  path: string
  recursive: boolean | null | undefined
}

export class DirectoryMakerFactory {
  constructor(private context: ExtensionContext) { }

  static async create(context: ExtensionContext) {
    return new DirectoryMakerFactory(context)
  }

  async build(config: MakeDirectoryConfig) {
    return new DirectoryMaker(config, this.context)
  }
}

export class DirectoryMaker implements Action {
  constructor(private config: MakeDirectoryConfig, private context: ExtensionContext) { }

  async execute(code?: CodeBlockDescriptor) {
    await mkdir(render(this.config.path, this.context, code), { recursive: !!this.config.recursive })
  }
}
