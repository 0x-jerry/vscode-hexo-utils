import { ExtensionContext, Disposable, commands } from 'vscode';
import { isHexoProject } from '../utils/utils';

/**
 * hexo.<command>[[...args]]
 *
 * example:
 * hexo.new[default layout, default name]
 * hexo.new[post, new article]
 *
 */
export enum Commands {
  new = 'hexo.new',
  open = 'hexo.open',
  delete = 'hexo.delete',
  rename = 'hexo.rename',
  refresh = 'hexo.refresh',
  newPost = 'hexo.new[post]',
  newDraft = 'hexo.new[draft]',
  moveToDraft = 'hexo.moveTo[draft]',
  moveToPost = 'hexo.moveTo[post]',
}

interface ICommandConstructor {
  new (): any;
}

export interface ICommandParsed {
  cmd: string;
  args: string[];
}

export abstract class Command implements Disposable {
  static parseCommand(command: Commands): ICommandParsed {
    let args: string[] = [];
    const cmd = command
      .replace(/\[(.+)\]/, (...rest) => {
        const params = rest[1];
        if (typeof params === 'string') {
          args = params.split(',').map((a) => a.trim());
        }

        return '';
      })
      .split('.')
      .pop()!;

    return {
      cmd,
      args,
    };
  }

  private _disposable: Disposable;

  constructor(...ids: Commands[]) {
    const registers = ids.map((id) =>
      commands.registerCommand(
        id,
        (...args: any[]) => {
          this._execute(id, ...args);
        },
        this,
      ),
    );

    this._disposable = Disposable.from(...registers);
  }

  abstract async execute(cmd: ICommandParsed, ...arg: any[]): Promise<any>;

  private async _execute(command: Commands, ...args: any[]) {
    if (!isHexoProject()) {
      return;
    }

    const cmd = Command.parseCommand(command);

    return this.execute(cmd, ...args);
  }

  dispose() {
    this._disposable.dispose();
  }
}

const registrableCommands: ICommandConstructor[] = [];

export function command(): ClassDecorator {
  return (target: any) => {
    registrableCommands.push(target);
  };
}

export function registerCommands(context: ExtensionContext): void {
  for (const c of registrableCommands) {
    context.subscriptions.push(new c());
  }
}
