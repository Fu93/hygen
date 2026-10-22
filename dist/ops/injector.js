"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const newline_1 = __importDefault(require("../newline"));
const EOLRegex = /\r?\n/;
const getPragmaticIndex = (pattern, lines, isBefore) => {
    const oneLineMatchIndex = lines.findIndex((l) => l.match(pattern));
    // joins the text and looks for line number,
    // we dont care about platform line-endings correctness other than joining/splitting
    // for all platforms
    if (oneLineMatchIndex < 0) {
        const fullText = lines.join('\n');
        const fullMatch = fullText.match(new RegExp(pattern, 'm'));
        if (fullMatch && fullMatch.length) {
            if (isBefore) {
                const fullTextUntilMatchStart = fullText.substring(0, fullMatch.index);
                return fullTextUntilMatchStart.split(EOLRegex).length - 1;
            }
            const matchEndIndex = fullMatch.index + fullMatch.toString().length;
            const fullTextUntilMatchEnd = fullText.substring(0, matchEndIndex);
            return fullTextUntilMatchEnd.split(EOLRegex).length;
        }
    }
    return oneLineMatchIndex + (isBefore ? 0 : 1);
};
const locations = {
    at_line: (_) => _,
    prepend: (_) => 0,
    append: (_, lines) => lines.length - 1,
    before: (_, lines) => getPragmaticIndex(_, lines, true),
    after: (_, lines) => getPragmaticIndex(_, lines, false),
};
const indexByLocation = (attributes, lines) => {
    const pair = Object.entries(attributes).find(([k, _]) => locations[k]);
    if (pair) {
        const [k, v] = pair;
        return locations[k](v, lines);
    }
    return -1;
};
// The line a before/after pattern actually matched, rather than the
// neighboring line where a new-line inject would be inserted.
const matchedLineIndex = (attributes, lines) => {
    const pair = Object.entries(attributes).find(([k, _]) => locations[k]);
    if (!pair) {
        return -1;
    }
    const [k, v] = pair;
    if (k === 'at_line') {
        return Number(v);
    }
    if (k === 'prepend') {
        return 0;
    }
    if (k === 'append') {
        const last = lines.length - 1;
        return last > 0 && lines[last] === '' ? last - 1 : last;
    }
    const pattern = String(v);
    const oneLineMatchIndex = lines.findIndex((l) => l.match(pattern));
    if (oneLineMatchIndex >= 0) {
        return oneLineMatchIndex;
    }
    const fullText = lines.join('\n');
    const fullMatch = fullText.match(new RegExp(pattern, 'm'));
    if (fullMatch && typeof fullMatch.index === 'number') {
        return fullText.substring(0, fullMatch.index).split(EOLRegex).length - 1;
    }
    return -1;
};
const injector = (action, content) => {
    const { attributes: { skip_if, eof_last }, attributes, body, } = action;
    const shouldSkip = skip_if && !!content.match(skip_if);
    if (!shouldSkip) {
        //
        // we care about producing platform-correct line endings.
        // however the "correct" line endings should be detected from the actual
        // CONTENT given, and not the underlying operating system.
        // this is similar to how a text editor behaves.
        //
        const NL = (0, newline_1.default)(content);
        const lines = content.split(NL);
        // inline appends the body onto the matched line (issue #96):
        // `dependencies = A,B` + `,C` => `dependencies = A,B,C`
        if (attributes.inline) {
            const lineIdx = matchedLineIndex(attributes, lines);
            if (lineIdx >= 0 && lineIdx < lines.length) {
                lines[lineIdx] = `${lines[lineIdx]}${body.replace(/\r?\n$/, '')}`;
            }
            return lines.join(NL);
        }
        // returns -1 (end) if no attrs
        const idx = indexByLocation(attributes, lines);
        const trimEOF = idx >= 0 && eof_last === false && /\r?\n$/.test(body);
        const insertEOF = idx >= 0 && eof_last === true && !/\r?\n$/.test(body);
        if (trimEOF) {
            lines.splice(idx, 0, body.replace(/\r?\n$/, ''));
        }
        else if (insertEOF) {
            lines.splice(idx, 0, `${body}${NL}`);
        }
        else if (idx >= 0) {
            lines.splice(idx, 0, body);
        }
        return lines.join(NL);
    }
    else {
        return content;
    }
};
exports.default = injector;
