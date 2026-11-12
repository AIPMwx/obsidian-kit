# Notion Enter

让 Obsidian 的回车键像 Notion 一样区分「新块」和「换行」。

| 按键 | 效果 | 写进 Markdown 的内容 |
|---|---|---|
| Enter | 新起一个块 | 插入空行（新段落） |
| Shift+Enter | 同一个块里换行 | 单个换行 |
| 块开头按 Backspace | 合并到上一个块 | 删掉中间的空行 |

阅读模式下，空行分隔的是不同段落，单个换行是段内换行（需要「严格换行」保持关闭，这是 Obsidian 的默认设置）。

## 不受影响的地方

以下位置的 Enter 保持 Obsidian 原有行为，因此 Outliner、Table Editor 等插件照常工作：

- 列表、引用、Callout、表格
- 代码块、公式块（`$$`）、文件开头的属性区
- 行首有缩进的行
- 补全菜单弹出时（例如输入 `[[` 后）
- 中文等输入法正在选字时

## 搭配主题

建议搭配 [Notion Like](../../themes/notion-like) 主题：它会把块之间的空行在编辑模式下压缩为 8px，看起来和 Notion 一致。不用这个主题也能用，只是空行会是一整行高。

## 实现

单个 `main.js`，无需构建。通过 CodeMirror 6 的最高优先级按键处理实现，只改写普通段落里的 Enter 和 Backspace。
