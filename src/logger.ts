import chalk from 'chalk'

// chalk 4.1.2 does not export `template`. The helper lives in
// chalk/source/templates (https://github.com/jondot/hygen/issues/411).
const { yellow, red, green, magenta } = chalk
// eslint-disable-next-line @typescript-eslint/no-var-requires
const template = require('chalk/source/templates')

class Logger {
  log: (message?: any, ...optionalParams: any[]) => void

  constructor(log) {
    this.log = log
  }

  colorful(msg) {
    this.log(template(chalk, msg))
  }

  notice(msg) {
    this.log(magenta(msg))
  }

  warn(msg) {
    this.log(yellow(msg))
  }

  err(msg) {
    this.log(red(msg))
  }

  ok(msg) {
    this.log(green(msg))
  }
}
export default Logger
