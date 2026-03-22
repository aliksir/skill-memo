---
description: "Export catalog. Usage: /catalog-export --format json"
---

カタログをエクスポートする。

`$ARGUMENTS` からフォーマットオプションを取得して以下のコマンドを実行すること:

```bash
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js export $ARGUMENTS
```

## 使い方

```
/catalog-export [--format json]
```

## 例

```bash
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js export
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js export --format json
```

コマンドの出力結果をそのままユーザーに提示すること。
