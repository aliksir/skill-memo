# catalog

Claude Codeスキル・MCPサーバーのカタログ一覧とメモを表示する。

## 使い方

```
/catalog
```

インストール済みスキルとMCPサーバーの一覧+メモをテーブル形式で表示する。

## サブコマンド

### 一覧表示
```
node /path/to/skill-memo/bin/skill-memo.js list
node /path/to/skill-memo/bin/skill-memo.js list --type mcp
node /path/to/skill-memo/bin/skill-memo.js list --type skill
node /path/to/skill-memo/bin/skill-memo.js list --tag security
node /path/to/skill-memo/bin/skill-memo.js list --sort name
node /path/to/skill-memo/bin/skill-memo.js list --json
```

### 検索
```
node /path/to/skill-memo/bin/skill-memo.js search セキュリティ
node /path/to/skill-memo/bin/skill-memo.js search --json memory
```

### カタログ同期（自動検出）
```
node /path/to/skill-memo/bin/skill-memo.js sync
```
`~/.claude/settings.json` のMCPサーバーと `~/.claude/skills/` のスキルを検出してカタログに追加する。
差分（新規/削除候補/既存）を表示する。

### 手動追加
```
node /path/to/skill-memo/bin/skill-memo.js add skill <name> --memo <text> --tag <tags>
node /path/to/skill-memo/bin/skill-memo.js add mcp <name> --memo <text>
```

### メモ更新（\nで改行）
```
node /path/to/skill-memo/bin/skill-memo.js memo mcp:memory "ナレッジグラフ管理"
node /path/to/skill-memo/bin/skill-memo.js memo skill:foo "1行目\n2行目"
```

### タグ設定
```
node /path/to/skill-memo/bin/skill-memo.js tag mcp:memory "security,review"
```

### 削除
```
node /path/to/skill-memo/bin/skill-memo.js remove skill:old-tool
```

### エクスポート
```
node /path/to/skill-memo/bin/skill-memo.js export
node /path/to/skill-memo/bin/skill-memo.js export --format json
```

## データストア

`~/.claude/skill-catalog.json` に保存される。

注意: `~/.claude/settings.json` は読み取り専用。このスキルは一切書き込まない。

## 出力例

```
+------------------------------------------+---------+----------+----------------------------------------------------+
| KEY                                      | TYPE    | SOURCE   | MEMO                                               |
+------------------------------------------+---------+----------+----------------------------------------------------+
| mcp:memory                               | mcp     | auto     | ナレッジグラフ。エンティティ管理用                   |
| skill:x-post                             | skill   | auto     | X投稿スキル。ファクトチェック内蔵                    |
+------------------------------------------+---------+----------+----------------------------------------------------+

合計: 2件 (MCP: 1, スキル: 1)
```
