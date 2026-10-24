import chalk from 'chalk'
import Logger from '../logger'

describe('logger colorful', () => {
  it('applies chalk template styles instead of leaving the tags in place', () => {
    const lines: string[] = []
    const logger = new Logger((msg) => lines.push(msg))

    logger.colorful('{green ok}')

    expect(lines).toEqual([chalk.green('ok')])
    expect(lines[0]).not.toContain('{green')
  })
})
