import { spawnSync } from 'child_process'
import { readFileSync } from 'fs'
import path from 'path'

const bin = path.resolve(__dirname, '../../dist/bin.js')
const version = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'),
).version

describe('version flag', () => {
  it.each(['--version', '-v'])(
    '%s prints the version and exits 0',
    (flag) => {
      const result = spawnSync(process.execPath, [bin, flag], {
        encoding: 'utf8',
      })

      expect(result.status).toBe(0)
      expect(result.stdout).toContain(`Hygen v${version}`)
      expect(result.stdout).not.toContain('Error: please specify a generator.')
      expect(result.stderr).not.toContain('Error: please specify a generator.')
    },
  )
})
