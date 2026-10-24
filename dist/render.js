"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const ejs_1 = __importDefault(require("ejs"));
const front_matter_1 = __importDefault(require("front-matter"));
const ignore_walk_1 = __importDefault(require("ignore-walk"));
const debug_1 = __importDefault(require("debug"));
const context_1 = __importDefault(require("./context"));
const debug = (0, debug_1.default)('hygen:render');
// for some reason lodash/fp takes 90ms to load.
// inline what we use here with the regular lodash.
const map = (f) => (arr) => arr.map(f);
const filter = (f) => (arr) => arr.filter(f);
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
];
const renderTemplate = (tmpl, locals, config) => typeof tmpl === 'string' ? ejs_1.default.render(tmpl, (0, context_1.default)(locals, config)) : tmpl;
const EACH_PATTERN = /^\s*([A-Za-z_][\w]*)\s+in\s+([A-Za-z_][\w]*)\s*$/;
const arrayFrom = (value) => {
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed.startsWith('[')) {
        return null;
    }
    try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : null;
    }
    catch (err) {
        return null;
    }
};
// `each: name in names` repeats the whole template once per array entry.
// The issue does not name this syntax; it is the loop form added for #396.
const iterationsFor = (eachValue, args) => {
    if (eachValue == null || eachValue === false || eachValue === '') {
        return [null];
    }
    const match = String(eachValue).match(EACH_PATTERN);
    if (!match) {
        throw new Error(`each must look like "item in collection", got ${JSON.stringify(eachValue)}`);
    }
    const [, itemName, collectionName] = match;
    const collection = arrayFrom(args[collectionName]);
    if (!collection) {
        throw new Error(`each collection "${collectionName}" is not an array`);
    }
    return collection.map((item, index) => ({ [itemName]: item, index }));
};
const renderOne = (file, attributes, body, args, config) => {
    const { each } = attributes, templateAttributes = __rest(attributes, ["each"]);
    const renderedAttrs = Object.entries(templateAttributes).reduce((obj, [key, value]) => {
        return Object.assign(Object.assign({}, obj), { [key]: renderTemplate(value, args, config) });
    }, {});
    return {
        file,
        attributes: renderedAttrs,
        body: renderTemplate(body, Object.assign(Object.assign({}, args), { attributes: renderedAttrs }), config),
    };
};
function getFiles(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        const files = ignore_walk_1.default
            .sync({ path: dir, ignoreFiles: ['.hygenignore'] })
            .map((f) => path_1.default.join(dir, f));
        return files;
    });
}
const render = (args, config) => __awaiter(void 0, void 0, void 0, function* () {
    return getFiles(args.actionfolder)
        .then((things) => things.sort((a, b) => a.localeCompare(b))) // TODO: add a test to verify this sort
        .then(filter((f) => !ignores.find((ig) => f.endsWith(ig)))) // TODO: add a
        // test for ignoring prompt.js and index.js
        .then(filter((file) => args.subaction
        ? file.replace(args.actionfolder, '').match(args.subaction)
        : true))
        .then(map((file) => fs_extra_1.default.readFile(file).then((text) => ({ file, text: text.toString() }))))
        .then((_) => Promise.all(_))
        .then(map(({ file, text }) => {
        debug('Pre-formatting file: %o', file);
        return Object.assign({ file }, (0, front_matter_1.default)(text, { allowUnsafe: true }));
    }))
        .then(map(({ file, attributes, body }) => {
        debug('Rendering file: %o', file);
        return iterationsFor(attributes.each, args).map((extra) => renderOne(file, attributes, body, extra ? Object.assign(Object.assign({}, args), extra) : args, config));
    }))
        .then((groups) => groups.reduce((acc, group) => acc.concat(group), []));
});
exports.default = render;
