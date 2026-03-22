---
description: "Manually add an entry to the catalog. Usage: /catalog-add skill nano-banana --memo 画像生成"
---

カタログにエントリを手動追加する。

`$ARGUMENTS` からタイプ（skill/mcp）・名前・メモ・タグを取得して以下のコマンドを実行すること:

```bash
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js add $ARGUMENTS
```

## 使い方

```
/catalog-add skill <name> [--memo <テキスト>] [--tag <タグ,カンマ区切り>]
/catalog-add mcp <name> [--memo <テキスト>] [--tag <タグ,カンマ区切り>]
```

## 例

```bash
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js add skill nano-banana --memo 画像生成
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js add mcp memory --memo "ナレッジグラフ管理" --tag "memory,search"
```

コマンドの出力結果をそのままユーザーに提示すること。
