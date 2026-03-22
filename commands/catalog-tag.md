---
description: "Set tags for a catalog entry. Usage: /catalog-tag mcp:memory security,review"
---

カタログエントリのタグを設定する。

`$ARGUMENTS` からエントリキーとタグ文字列を取得して以下のコマンドを実行すること:

```bash
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js tag $ARGUMENTS
```

## 使い方

```
/catalog-tag <key> <タグ1,タグ2,...>
```

キーの形式は `mcp:<name>` または `skill:<name>`。タグはカンマ区切りで複数指定可能。

## 例

```bash
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js tag mcp:memory "security,review"
node ${CLAUDE_PLUGIN_ROOT}/bin/skill-memo.js tag skill:x-post "sns,posting"
```

コマンドの出力結果をそのままユーザーに提示すること。
