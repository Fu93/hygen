import path from 'path'
import fs from 'fs-extra'
import ejs from 'ejs'
import fm from 'front-matter'
import walk from 'ignore-walk'
import createDebug from 'debug'
import type { RenderedAction, RunnerConfig } from './types'
import context from './context'
const debug = createDebug('hygen:render')

// for some reason lodash/fp takes 90ms to load.
// inline what we use here with the regular lodash.
const map = (f) => (arr) => arr.map(f)
const filter = (f) => (arr) => arr.filter(f)

const ignores = [
  'prompt.js',
  'index.js',
  'prompt.ts',
  'index.ts',
  '.hygenignore',
  '.DS_Store',
  '.Spotlight-V100',
  '.Trashes',
  'ehthumbs.db',
  'Thumbs.db',
]
const renderTemplate = (tmpl, locals, config) =>
  typeof tmpl === 'string' ? ejs.render(tmpl, context(locals, config)) : tmpl

const EACH_PATTERN = /^\s*([A-Za-z_][\w]*)\s+in\s+([A-Za-z_][\w]*)\s*$/

const arrayFrom = (value) => {
  if (Array.isArray(value)) {
    return value
  }
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed.startsWith('[')) {
    return null
  }
  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed : null
  } catch (err) {
    return null
  }
}

// `each: name in names` repeats the whole template once per array entry.
// The issue does not name this syntax; it is the loop form added for #396.
const iterationsFor = (eachValue, args) => {
  if (eachValue == null || eachValue === false || eachValue === '') {
    return [null]
  }
  const match = String(eachValue).match(EACH_PATTERN)
  if (!match) {
    throw new Error(
      `each must look like "item in collection", got ${JSON.stringify(
        eachValue,
      )}`,
    )
  }
  const [, itemName, collectionName] = match
  const collection = arrayFrom(args[collectionName])
  if (!collection) {
    throw new Error(`each collection "${collectionName}" is not an array`)
  }
  return collection.map((item, index) => ({ [itemName]: item, index }))
}

const renderOne = (file, attributes, body, args, config) => {
  const { each, ...templateAttributes } = attributes
  const renderedAttrs = Object.entries(templateAttributes).reduce(
    (obj, [key, value]) => {
      return {
        ...obj,
        [key]: renderTemplate(value, args, config),
      }
    },
    {},
  )
  return {
    file,
    attributes: renderedAttrs,
    body: renderTemplate(body, { ...args, attributes: renderedAttrs }, config),
  }
}

async function getFiles(dir) {
  const files = walk
    .sync({ path: dir, ignoreFiles: ['.hygenignore'] })
    .map((f) => path.join(dir, f))
  return files
}

const render = async (
  args: any,
  config: RunnerConfig,
): Promise<RenderedAction[]> =>
  getFiles(args.actionfolder)
    .then((things) => things.sort((a, b) => a.localeCompare(b))) // TODO: add a test to verify this sort
    .then(filter((f) => !ignores.find((ig) => f.endsWith(ig)))) // TODO: add a
    // test for ignoring prompt.js and index.js
    .then(
      filter((file) =>
        args.subaction
          ? file.replace(args.actionfolder, '').match(args.subaction)
          : true,
      ),
    )
    .then(
      map((file) =>
        fs.readFile(file).then((text) => ({ file, text: text.toString() })),
      ),
    )
    .then((_) => Promise.all(_))
    .then(
      map(({ file, text }) => {
        debug('Pre-formatting file: %o', file)
        return { file, ...fm(text, { allowUnsafe: true }) }
      }),
    )
    .then(
      map(({ file, attributes, body }) => {
        debug('Rendering file: %o', file)
        return iterationsFor(attributes.each, args).map((extra) =>
          renderOne(
            file,
            attributes,
            body,
            extra ? { ...args, ...extra } : args,
            config,
          ),
        )
      }),
    )
    .then((groups) => groups.reduce((acc, group) => acc.concat(group), []))

export default render
