import { writeFile } from 'node:fs/promises'
import { Action, CodeBlockDescriptor, ExtensionContext, render } from './shared'

export interface WriteFileConfig {
  path: string
  text: string | null | undefined
  encoding: string | null | undefined
}

export class FileWriterFactory {
  constructor(private context: ExtensionContext) { }

  static async create(context: ExtensionContext) {
    return new FileWriterFactory(context)
  }

  async build(config: WriteFileConfig) {
    return new FileWriter(config, this.context)
  }
}

export class FileWriter implements Action {
  constructor(private config: WriteFileConfig, private context: ExtensionContext) { }

  async execute(code?: CodeBlockDescriptor) {
    await writeFile(render(this.config.path, this.context, code),
      render(this.config.text || '', this.context, code),
      render(this.config.encoding || '', this.context, code) as BufferEncoding)
  }
}
