import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import Logger from '../logger'
import { runner } from '../index'

const logger = new Logger(() => {})

describe('each', () => {
  it('writes one file per array entry from a single template', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hygen-each-'))
    const action = path.join(root, '_templates', 'worker', 'new')
    await fs.outputFile(
      path.join(action, 'prompt.js'),
      `module.exports = { params: () => ({ names: ['john', 'house', 'car'] }) }\n`,
    )
    await fs.outputFile(
      path.join(action, 'handler.ejs.t'),
      `---
to: app/<%= name %>/handler.js
each: name in names
---
module.exports = '<%= name %>'
`,
    )

    const result = await runner(['worker', 'new'], {
      templates: path.join(root, '_templates'),
      cwd: root,
      logger,
      createPrompter: () => require('enquirer'),
    })

    expect(result.success).toBe(true)
    for (const name of ['john', 'house', 'car']) {
      const file = path.join(root, 'app', name, 'handler.js')
      expect(fs.readFileSync(file, 'utf8')).toBe(`module.exports = '${name}'\n`)
    }
    await fs.remove(root)
  })
})
