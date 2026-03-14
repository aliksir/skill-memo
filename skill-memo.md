# skill-memo — スキル・MCPカタログ+メモ

Claude CodeとClaude Coworkの両方で動作するスキル・MCPサーバーのカタログ管理ツール。

## 対応環境

- **Claude Code（Bashあり）**: `skill-memo` CLIを直接実行
- **Claude Cowork（Bashなし）**: このスキル定義に従い、Read/Editで `~/.claude/skill-catalog.json` を直接操作

## カタログファイル

`~/.claude/skill-catalog.json` — スキルとMCPサーバーの一覧+メモを管理するJSONファイル。

## サブコマンド判定

引数 `$ARGUMENTS` を見てサブコマンドを判定する:

| 引数 | サブコマンド |
|------|------------|
| なし / `list` | **list** — カタログ一覧表示 |
| `list --type skill` | **list** — スキルのみ表示 |
| `list --type mcp` | **list** — MCPサーバーのみ表示 |
| `add ...` | **add** — エントリ追加 |
| `memo ...` | **memo** — メモを更新 |
| `remove ...` | **remove** — エントリ削除 |
| `sync` | **sync** — 環境から自動検出して同期 |

## 各サブコマンドの手順

### list（デフォルト）

1. `~/.claude/skill-catalog.json` を Read ツールで読み込む
2. JSONの `entries` オブジェクトを解析
3. 各エントリを表形式で表示:
   ```
   | キー | 種別 | メモ |
   |------|------|------|
   | skill:nano-banana | skill | 画像生成スキル |
   | mcp:memory | mcp | ナレッジグラフ管理 |
   ```
4. `--type skill` or `--type mcp` が指定された場合はフィルタ

### add

1. 引数からタイプ（skill/mcp）と名前を取得: `/skill-memo add skill nano-banana --memo "画像生成"`
2. `~/.claude/skill-catalog.json` を Read で読み込む
3. `entries` にエントリを追加:
   ```json
   {
     "skill:nano-banana": {
       "type": "skill",
       "name": "nano-banana",
       "memo": "画像生成",
       "addedAt": "2026-03-14T12:00:00Z"
     }
   }
   ```
4. Edit ツールで書き戻す
5. 「追加したヨシッ！」と報告

### memo

1. 引数からキーとメモテキストを取得: `/skill-memo memo mcp:memory "ナレッジグラフ管理"`
2. `~/.claude/skill-catalog.json` を Read で読み込む
3. 該当エントリの `memo` フィールドを更新
4. Edit ツールで書き戻す
5. 「メモ更新したヨシッ！」と報告

### remove

1. 引数からキーを取得: `/skill-memo remove skill:old-tool`
2. `~/.claude/skill-catalog.json` を Read で読み込む
3. 該当エントリを削除
4. Edit ツールで書き戻す
5. 「削除したヨシッ！」と報告

### sync

1. **Claude Code（Bashあり）**: `skill-memo sync` CLIを実行して環境から自動検出
2. **Claude Cowork（Bashなし）**:
   - `~/.claude/commands/` 配下の `.md` ファイルをGlobで検出 → skill として登録
   - 手動で追加されたエントリは保持
   - 「sync完了。N件検出、M件新規追加ヨシッ！」と報告

## 重要なルール

- カタログファイルが存在しない場合は空のストアを作成: `{"version": 1, "entries": {}}`
- エントリのキーは `{type}:{name}` 形式（例: `skill:nano-banana`, `mcp:memory`）
- 既存エントリの上書き時は確認を求める
