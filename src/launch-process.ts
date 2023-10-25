import { spawn } from 'node:child_process'
import { Action, CodeBlockDescriptor, ExtensionContext, render } from './shared'

export interface LaunchProcessConfig {
  executablePath: string
  args: string[] | null | undefined
  workingPath: string | null | undefined
}

export class ProcessLauncherFactory {
  constructor(private context: ExtensionContext) { }

  static async create(context: ExtensionContext) {
    return new ProcessLauncherFactory(context)
  }

  async build(config: LaunchProcessConfig) {
    return new ProcessLauncher(config, this.context)
  }
}

export class ProcessLauncher implements Action {
  constructor(private config: LaunchProcessConfig, private context: ExtensionContext) { }

  async execute(code?: CodeBlockDescriptor) {
    const cwd = this.config.workingPath ? render(this.config.workingPath, this.context, code) : this.context.vaultPath
    const args = this.config.args ? this.config.args.map(template => render(template, this.context, code)) : []
    spawn(render(this.config.executablePath, this.context, code), args, { cwd })
  }
}
