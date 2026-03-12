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
```

### カタログ同期（自動検出）
```
node /path/to/skill-memo/bin/skill-memo.js sync
```
`~/.claude/settings.json` のMCPサーバーと `~/.claude/skills/` のスキルを検出してカタログに追加する。
既存エントリのメモは上書きしない。

### 手動追加
```
node /path/to/skill-memo/bin/skill-memo.js add skill <name> --memo <text>
node /path/to/skill-memo/bin/skill-memo.js add mcp <name> --memo <text>
```

### メモ更新
```
node /path/to/skill-memo/bin/skill-memo.js memo mcp:memory "ナレッジグラフ管理"
```

### 削除
```
node /path/to/skill-memo/bin/skill-memo.js remove skill:old-tool
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
