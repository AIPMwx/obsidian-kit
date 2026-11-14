# obsidian-kit

我自己做的 Obsidian 主题和插件，统一放在这里。

| 名称 | 类型 | 说明 |
|---|---|---|
| [Notion Like](themes/notion-like) | 主题 | 仿 Notion 页面的配色和排版，亮色、暗色两套 |
| [Notion Enter](plugins/notion-enter) | 插件 | Enter 新起一个块，Shift+Enter 段内换行，和 Notion 一样 |
| [MD Annotator](https://github.com/AIPMwx/obsidian-md-annotator) | 插件 | 独立仓库 |

Notion Like 和 Notion Enter 搭配使用效果最好：主题负责间距和样式，插件让编辑时的 Enter 行为和 Notion 一致。

有序列表按层级显示 `1.` → `a.` → `i.`；阅读模式只需主题，实时预览需同时更新 Notion Enter。

## 安装

下面的「库」指你的 Obsidian 笔记库文件夹。`.obsidian` 是隐藏文件夹，macOS 上在访达里按 `Cmd + Shift + .` 可以显示。

**主题**

1. 把 `themes/notion-like` 文件夹复制到 `库/.obsidian/themes/`，并改名为 `Notion Like`。
2. 打开「设置 → 外观 → 主题」，选择 **Notion Like**。

**插件**

1. 把 `plugins/notion-enter` 文件夹复制到 `库/.obsidian/plugins/`。
2. 打开「设置 → 第三方插件」，关闭安全模式（如果开着），在已安装插件里启用 **Notion Enter**。

复制后看不到的话，在列表旁点刷新或重启 Obsidian。

## 许可

[MIT](LICENSE)
