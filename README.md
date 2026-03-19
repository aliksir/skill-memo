# skill-memo

Claude Code にインストール済みのスキル・MCP サーバーを一覧管理し、自由形式のメモを付けられる CLI ツール。

## 何ができるか

- `~/.claude/settings.json` の MCP サーバーと `~/.claude/skills/` のスキルを **自動検出**
- 未検出のエントリを **手動登録**
- 各エントリに **メモ・タグ・説明** を付与・編集・削除
- テーブル形式で **一覧表示**（型・タグ・ソース別フィルタ、ソート対応）
- **AND検索**（key, name, memo, tags, description を横断）
- **エクスポート**（Markdown / JSON形式）
- Claude Code のスラッシュコマンド `/catalog` として呼び出し可能

## インストール

```bash
git clone https://github.com/aliksir/skill-memo.git
cd skill-memo
```

依存パッケージなし。Node.js 18+ のみ必要。

### スラッシュコマンドとして使う

`~/.claude/commands/catalog.md` を作成すれば `/catalog` で呼び出せる。
テンプレートは `skills/catalog.md` を参照。パス部分を自分の環境に合わせて書き換えること。

## 使い方

### CLI

```bash
# 一覧表示
node bin/skill-memo.js list
node bin/skill-memo.js list --type mcp         # MCP サーバーのみ
node bin/skill-memo.js list --type skill       # スキルのみ
node bin/skill-memo.js list --tag security     # タグフィルタ
node bin/skill-memo.js list --sort name        # 名前順
node bin/skill-memo.js list --sort updated     # 更新日順
node bin/skill-memo.js list --json             # JSON配列出力

# 検索（AND検索、大文字小文字無視）
node bin/skill-memo.js search セキュリティ
node bin/skill-memo.js search "security review"
node bin/skill-memo.js search --json memory

# 自動検出 → カタログに同期（差分表示あり）
node bin/skill-memo.js sync

# 手動追加
node bin/skill-memo.js add skill nano-banana --memo "画像生成スキル" --tag "image,ai"
node bin/skill-memo.js add mcp filesystem --memo "ファイルシステムアクセス"

# メモ更新（\nで改行）
node bin/skill-memo.js memo mcp:memory "1行目\n2行目"

# タグ更新（上書き）
node bin/skill-memo.js tag mcp:memory "security,review"

# 削除
node bin/skill-memo.js remove skill:old-tool

# エクスポート
node bin/skill-memo.js export                  # Markdownテーブル（stdout）
node bin/skill-memo.js export --format json    # store全体JSON

# ストアファイルのパス確認
node bin/skill-memo.js path
```

### スラッシュコマンド（`/catalog`）

```
/catalog                          一覧表示
/catalog sync                     自動検出 → 同期
/catalog add skill foo --memo "メモ" --tag "tag1,tag2"
/catalog memo skill:foo "新しいメモ"
/catalog remove skill:foo
/catalog mcp                      MCP サーバーのみ
/catalog skill                    スキルのみ
/catalog search セキュリティ       検索
/catalog tag skill:foo security   タグ設定
/catalog export                   Markdownエクスポート
/catalog export --format json     JSONエクスポート
```

## コンテキスト消費量に関する注意

`/catalog` や `list` コマンドの出力はテーブル形式で全エントリを返す。
スキルを大量にインストールしている環境（100件超など）では、**1回の呼び出しでかなりのコンテキストウィンドウを消費する**。

対策:
- `--type mcp` / `--type skill` で絞り込んで表示する
- メモ追加・削除など目的が明確な場合は `list` を省略し、直接 `add` / `memo` / `remove` を使う
- 頻繁に一覧確認が必要な場合は CLI で直接実行する（Claude Code のコンテキストを消費しない）

## Claude Cowork 対応

Claude Cowork（Bashなし環境）でも使える。`skill-memo.md` をスキルとしてインストールすると、ClaudeがRead/Editで `skill-catalog.json` を直接操作する。

```bash
cp skill-memo/skill-memo.md ~/.claude/commands/skill-memo.md
```

Cowork では `/skill-memo list`, `/skill-memo add ...`, `/skill-memo memo ...` が動作する。
`sync`（自動検出）は Glob ベースの簡易版で動作する（CLI版のような settings.json 解析は行わない）。

## データストア

`~/.claude/skill-catalog.json` に保存される。

```json
{
  "version": 2,
  "entries": {
    "mcp:memory": {
      "type": "mcp",
      "name": "memory",
      "source": "auto",
      "memo": "ナレッジグラフ。エンティティ管理用",
      "tags": ["knowledge", "storage"],
      "description": "自動検出された説明",
      "detectedAt": "2026-03-12T00:00:00.000Z",
      "updatedAt": "2026-03-12T00:00:00.000Z"
    }
  }
}
```

- `source`: `auto`（自動検出）/ `manual`（手動登録）
- `sync` は既存エントリのメモ・タグを上書きしない
- `description` はスキルの `SKILL.md` から自動取得（sync時に更新）
- v1形式のストアは自動的にv2に変換される（後方互換）
- **`~/.claude/settings.json` は読み取り専用**。このツールは一切書き込まない

## テスト

```bash
node test/run.js
```

74 テスト（assert ベース、外部依存なし）。

## 構成

```
skill-memo/
  bin/skill-memo.js    CLI エントリポイント
  src/store.js         データストア CRUD（スキーマバージョン管理）
  src/detector.js      自動検出（settings.json + skills/）
  src/display.js       テーブル形式フォーマッタ
  test/run.js          テスト
  skills/catalog.md    スラッシュコマンドテンプレート
```

## ライセンス

MIT
