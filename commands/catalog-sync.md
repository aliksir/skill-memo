---
description: Auto-detect and sync skills/MCP servers from settings.json
---

`~/.claude/settings.json` のMCPサーバーと `~/.claude/skills/` のスキルを自動検出してカタログに同期する。

以下のコマンドを実行すること:

```bash
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js sync
```

実行後、新規追加・削除候補・既存の差分がテーブル形式で表示される。コマンドの出力結果をそのままユーザーに提示すること。

注意: `~/.claude/settings.json` は読み取り専用。このコマンドは一切書き込まない。
