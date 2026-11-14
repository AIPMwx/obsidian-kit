const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

// Exercise the extension without launching Obsidian or changing a user note.
const sandbox = {
  module: { exports: {} },
  require(name) {
    return {
      obsidian: { Plugin: class {} },
      "@codemirror/view": {
        EditorView: {},
        ViewPlugin: { fromClass: cls => cls },
        Decoration: {
          mark: spec => ({ range: (from, to) => ({ from, to, spec }) }),
          set: ranges => ranges.sort((a, b) => a.from - b.from),
        },
      },
      "@codemirror/state": { Prec: {} },
      "@codemirror/language": { syntaxTree: state => state.tree },
    }[name];
  },
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../plugins/notion-enter/main.js"), "utf8") +
  "\nmodule.exports = { listNumberDecorations, notionListNumbers };", sandbox);
const { listNumberDecorations, notionListNumbers } = sandbox.module.exports;

function viewOf(text, nodes, visibleRanges = [{ from: 0, to: text.length }], selection = []) {
  return {
    visibleRanges,
    state: {
      doc: { sliceString: (from, to) => text.slice(from, to) },
      selection: { ranges: selection },
      tree: { iterate({ from, to, enter }) {
        for (const node of nodes) if (node.from <= to && node.to >= from) enter(node);
      } },
    },
  };
}
const ordered = (from, to) => ({ from, to, type: { name: "formatting_formatting-list_formatting-list-ol_list-2" } });

test("preserves source numbers, including non-one starts and parenthesis markers", () => {
  const view = viewOf("27. entry\n004) next", [ordered(0, 4), ordered(10, 15)]);
  const result = listNumberDecorations(view);
  assert.equal(result.length, 2);
  assert.equal(result[0].spec.attributes.style, "--nt-list-number: 27");
  assert.equal(result[1].spec.attributes.style, "--nt-list-number: 4");
  assert.equal(result[0].to, 3); // Keep the following space outside the mark.
  assert.equal(result[1].to, 14);
});

test("scrolling and folded/overlapping ranges do not renumber or duplicate markers", () => {
  const view = viewOf("1. first\n9. visible", [ordered(0, 3), ordered(9, 12)],
    [{ from: 9, to: 18 }, { from: 10, to: 18 }]);
  const result = listNumberDecorations(view);
  assert.equal(result.length, 1);
  assert.equal(result[0].spec.attributes.style, "--nt-list-number: 9");
});

test("ignores unordered lists, code, and plain numeric text", () => {
  const view = viewOf("1. text\n- item\n2. code", [
    { from: 0, to: 3, type: { name: "list-2" } },
    { from: 8, to: 10, type: { name: "formatting-list-ul_list-2" } },
    { from: 15, to: 18, type: { name: "hmd-codeblock" } },
  ]);
  assert.equal(listNumberDecorations(view).length, 0);
});

test("reveals a marker only when a caret is in it", () => {
  for (const selection of [[{ from: 0, to: 0 }], [{ from: 1, to: 1 }], [{ from: 3, to: 3 }]]) {
    const view = viewOf("12. text", [ordered(0, 4)], undefined, selection);
    assert.equal(listNumberDecorations(view).length, 0);
  }
  const view = viewOf("12. text", [ordered(0, 4)], undefined, [{ from: 7, to: 7 }]);
  assert.equal(listNumberDecorations(view).length, 1);
});

test("keeps markers when selecting a digit, a line, or multiple nested levels", () => {
  const text = "1. root\n   1. child\n      2. grandchild";
  const nodes = [ordered(0, 3), ordered(11, 14), ordered(26, 29)];
  for (const selection of [
    [{ from: 11, to: 12 }],
    [{ from: 11, to: 19 }],
    [{ from: 0, to: text.length }],
    [{ from: 11, to: 13 }, { from: 26, to: 28 }],
  ]) {
    const result = listNumberDecorations(viewOf(text, nodes, undefined, selection));
    assert.equal(result.length, 3);
    assert.equal(result[2].spec.attributes.style, "--nt-list-number: 2");
  }
});

test("rebuilds after selection changes and background syntax parsing", () => {
  const view = viewOf("2. text", [ordered(0, 3)]);
  const plugin = new notionListNumbers(view);
  const selected = viewOf("2. text", [ordered(0, 3)], undefined, [{ from: 0, to: 0 }]);
  plugin.update({ selectionSet: true, view: selected, startState: view.state, state: selected.state });
  assert.equal(plugin.decorations.length, 0);
  const rangeSelected = viewOf("2. text", [ordered(0, 3)], undefined, [{ from: 0, to: 7 }]);
  plugin.update({ selectionSet: true, view: rangeSelected, startState: selected.state, state: rangeSelected.state });
  assert.equal(plugin.decorations.length, 1);
  plugin.update({ view, startState: rangeSelected.state, state: view.state });
  assert.equal(plugin.decorations.length, 1);
});
