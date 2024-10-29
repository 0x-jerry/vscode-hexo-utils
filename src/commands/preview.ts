import { Command, type ICommandParsed, command, Commands } from './common'

@command()
export class StartPreview extends Command {
  constructor() {
    super(Commands.startPreview)
  }

  async execute(cmd: ICommandParsed) {
    // todo
  }
}

@command()
export class StopPreview extends Command {
  constructor() {
    super(Commands.stopPreview)
  }

  async execute(cmd: ICommandParsed) {
    // todo
  }
}
