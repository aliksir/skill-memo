---
description: "Update memo for a catalog entry. Usage: /catalog-memo mcp:memory ナレッジグラフ管理"
---

カタログエントリのメモを更新する。

`$ARGUMENTS` からエントリキーとメモテキストを取得して以下のコマンドを実行すること:

```bash
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js memo $ARGUMENTS
```

## 使い方

```
/catalog-memo <key> "<メモテキスト>"
```

キーの形式は `mcp:<name>` または `skill:<name>`。

## 例

```bash
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js memo mcp:memory "ナレッジグラフ管理"
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js memo skill:x-post "X投稿スキル。ファクトチェック内蔵"
```

メモ内で `\n` を使うと改行できる。コマンドの出力結果をそのままユーザーに提示すること。
