# skill-memo

Claude Code にインストール済みのスキル・MCP サーバーを一覧管理し、自由形式のメモを付けられる CLI ツール。

## 何ができるか

- `~/.claude/settings.json` の MCP サーバーと `~/.claude/skills/` のスキルを **自動検出**
- 未検出のエントリを **手動登録**
- 各エントリに **メモ** を付与・編集・削除
- テーブル形式で **一覧表示**（型・ソース別フィルタ対応）
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
node bin/skill-memo.js list --type mcp      # MCP サーバーのみ
node bin/skill-memo.js list --type skill    # スキルのみ

# 自動検出 → カタログに同期
node bin/skill-memo.js sync

# 手動追加
node bin/skill-memo.js add skill nano-banana --memo "画像生成スキル"
node bin/skill-memo.js add mcp filesystem --memo "ファイルシステムアクセス"

# メモ更新
node bin/skill-memo.js memo mcp:memory "ナレッジグラフ。エンティティ管理用"

# 削除
node bin/skill-memo.js remove skill:old-tool

# ストアファイルのパス確認
node bin/skill-memo.js path
```

### スラッシュコマンド（`/catalog`）

```
/catalog              一覧表示
/catalog sync         自動検出 → 同期
/catalog add skill foo --memo "メモ"
/catalog memo skill:foo "新しいメモ"
/catalog remove skill:foo
/catalog mcp          MCP サーバーのみ
/catalog skill        スキルのみ
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
  "version": 1,
  "entries": {
    "mcp:memory": {
      "type": "mcp",
      "name": "memory",
      "source": "auto",
      "memo": "ナレッジグラフ。エンティティ管理用",
      "detectedAt": "2026-03-12T00:00:00.000Z",
      "updatedAt": "2026-03-12T00:00:00.000Z"
    }
  }
}
```

- `source`: `auto`（自動検出）/ `manual`（手動登録）
- `sync` は既存エントリを上書きしない。メモは手動で更新したものが保持される
- **`~/.claude/settings.json` は読み取り専用**。このツールは一切書き込まない

## テスト

```bash
node test/run.js
```

37 テスト（assert ベース、外部依存なし）。

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
