/*
 * Notion Enter
 * - Enter        : start a new block (inserts a blank line → new Markdown paragraph)
 * - Shift+Enter  : line break inside the same block (single newline, Obsidian default)
 * - Backspace    : at the start of a block, merge it into the block above
 *
 * Lists, quotes/callouts, tables, code blocks, math blocks and frontmatter keep
 * Obsidian's own Enter behaviour, so plugins like Outliner / Table Editor still work.
 */
const { Plugin } = require("obsidian");
const { EditorView, ViewPlugin, Decoration } = require("@codemirror/view");
const { Prec } = require("@codemirror/state");
const { syntaxTree } = require("@codemirror/language");

// Supply the source number to the theme, without editing Markdown or counting
// visible DOM rows (which would restart numbering when the editor scrolls).
function listNumberDecorations(view) {
  const ranges = [];
  const seen = new Set();
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from, to,
      enter(node) {
        const tokens = node.type.name.split("_");
        if (!tokens.includes("formatting-list-ol") || seen.has(node.from)) return;
        const match = view.state.doc.sliceString(node.from, node.to).match(/^(\d+)[.)]/);
        if (!match) return;
        const end = node.from + match[0].length;
        // Only reveal digits for a caret in the marker; text selections keep
        // the themed numbering, including selections across multiple levels.
        if (view.state.selection.ranges.some(r =>
          r.from === r.to && r.from >= node.from && r.from <= end)) return;
        seen.add(node.from);
        ranges.push(Decoration.mark({
          class: "notion-list-number",
          attributes: { style: `--nt-list-number: ${Number(match[1])}` },
        }).range(node.from, end));
      },
    });
  }
  return Decoration.set(ranges, true);
}

const notionListNumbers = ViewPlugin.fromClass(class {
  constructor(view) {
    this.decorations = listNumberDecorations(view);
  }
  update(update) {
    if (update.docChanged || update.viewportChanged || update.selectionSet ||
        syntaxTree(update.startState) !== syntaxTree(update.state)) {
      this.decorations = listNumberDecorations(update.view);
    }
  }
}, { decorations: value => value.decorations });

const LIST_RE = /^\s*([-*+]|\d+[.)])(\s|$)/;
const SPECIAL_RE = /^\s*(>|\||`{3,}|~{3,}|\$\$)/;
const FENCE_RE = /^\s*(`{3,}|~{3,})/;

/** Is line `lineNo` inside frontmatter, a fenced code block or a $$ math block? */
function insideBlock(doc, lineNo) {
  let start = 1;
  if (doc.lines >= 1 && doc.line(1).text.trim() === "---") {
    let closed = 0;
    for (let i = 2; i <= doc.lines; i++) {
      const t = doc.line(i).text.trim();
      if (t === "---" || t === "...") { closed = i; break; }
    }
    if (!closed || lineNo <= closed) return true;
    start = closed + 1;
  }
  let fence = null;
  let math = false;
  for (let i = start; i < lineNo; i++) {
    const t = doc.line(i).text;
    const m = t.match(FENCE_RE);
    if (!math && m) {
      const ch = m[1][0];
      if (fence === null) fence = ch;
      else if (fence === ch) fence = null;
      continue;
    }
    if (fence === null) {
      const tt = t.trim();
      if (tt.startsWith("$$")) {
        const single = tt.length > 4 && tt.endsWith("$$");
        if (!single) math = !math;
      }
    }
  }
  return fence !== null || math;
}

function isPlainLine(doc, line) {
  const t = line.text;
  if (/^\s/.test(t)) return false;
  if (LIST_RE.test(t) || SPECIAL_RE.test(t)) return false;
  return !insideBlock(doc, line.number);
}

function suggestOpen() {
  return !!document.querySelector(".suggestion-container");
}

function onKeydown(e, view) {
  if (e.key !== "Enter" && e.key !== "Backspace") return false;
  if (e.isComposing || e.keyCode === 229 || view.composing) return false;
  if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return false;
  if (suggestOpen()) return false;

  const state = view.state;
  if (state.selection.ranges.length !== 1) return false;
  const r = state.selection.main;
  const doc = state.doc;

  if (e.key === "Enter") {
    const line = doc.lineAt(r.from);
    if (doc.lineAt(r.to).number !== line.number) return false;
    if (line.text.trim() === "") return false;
    if (!isPlainLine(doc, line)) return false;

    view.dispatch({
      changes: { from: r.from, to: r.to, insert: "\n\n" },
      selection: { anchor: r.from + 2 },
      scrollIntoView: true,
      userEvent: "input",
    });
    e.preventDefault();
    return true;
  }

  // Backspace at the start of a block → merge into previous block
  if (!r.empty) return false;
  const line = doc.lineAt(r.head);
  if (r.head !== line.from || line.number < 3) return false;
  const gap = doc.line(line.number - 1);
  const prev = doc.line(line.number - 2);
  if (gap.text.trim() !== "" || prev.text.trim() === "") return false;
  if (!isPlainLine(doc, prev)) return false;
  if (line.text.trim() !== "" && !isPlainLine(doc, line)) return false;

  view.dispatch({
    changes: { from: prev.to, to: line.from },
    selection: { anchor: prev.to },
    scrollIntoView: true,
    userEvent: "delete.backward",
  });
  e.preventDefault();
  return true;
}

module.exports = class NotionEnterPlugin extends Plugin {
  onload() {
    this.registerEditorExtension(
      Prec.highest(EditorView.domEventHandlers({ keydown: onKeydown }))
    );
    this.registerEditorExtension(notionListNumbers);
  }
};
