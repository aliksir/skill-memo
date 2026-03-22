---
description: "Remove a catalog entry. Usage: /catalog-remove skill:old-tool"
---

カタログからエントリを削除する。

`$ARGUMENTS` からエントリキーを取得して以下のコマンドを実行すること:

```bash
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js remove $ARGUMENTS
```

## 使い方

```
/catalog-remove <key>
```

キーの形式は `mcp:<name>` または `skill:<name>`。

## 例

```bash
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js remove skill:old-tool
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js remove mcp:deprecated-server
```

コマンドの出力結果をそのままユーザーに提示すること。
