---
description: Display installed skills and MCP servers catalog
---

インストール済みスキルとMCPサーバーのカタログ一覧をメモ・タグつきで表示する。

以下のコマンドを実行してカタログ一覧を表示すること:

```bash
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js list
```

## オプション

| オプション | 説明 | 例 |
|-----------|------|---|
| `--type mcp` | MCPサーバーのみ表示 | `node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js list --type mcp` |
| `--type skill` | スキルのみ表示 | `node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js list --type skill` |
| `--tag <タグ>` | 指定タグでフィルタ | `node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js list --tag security` |
| `--sort name` | 名前順でソート | `node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js list --sort name` |
| `--json` | JSON形式で出力 | `node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js list --json` |

コマンドの出力結果をそのままユーザーに提示すること。
