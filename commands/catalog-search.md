---
description: "Search catalog entries. Usage: /catalog-search セキュリティ"
---

カタログをキーワードでAND検索する。

`$ARGUMENTS` から検索キーワードを取得して以下のコマンドを実行すること:

```bash
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js search $ARGUMENTS
```

## 使い方

```
/catalog-search <キーワード> [キーワード2 ...]
```

複数キーワードを指定するとAND検索になる。

## 例

```bash
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js search セキュリティ
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js search --json memory
```

コマンドの出力結果をそのままユーザーに提示すること。
