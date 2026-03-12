# skill-memo

Claude Codeにインストール済みのスキル・MCPサーバーのカタログ+メモツール。

## 機能

- **自動検出**: `~/.claude/settings.json` のMCPサーバーと `~/.claude/skills/` のスキルを自動検出
- **手動登録**: 未検出のエントリや「これから入れたい」ものを手動追加
- **メモ管理**: 各エントリに自由形式のメモを付与・編集・削除
- **一覧表示**: テーブル形式でMCPサーバーとスキルを一覧表示
- **プラグイン版**: `/catalog` コマンドで素早くアクセス

## インストール

```bash
# プロジェクトディレクトリに移動
cd skill-memo

# グローバルリンク（オプション）
npm link
```

## 使い方

### 一覧表示

```bash
node bin/skill-memo.js list
node bin/skill-memo.js list --type mcp
node bin/skill-memo.js list --type skill
node bin/skill-memo.js list --sort key
```

### カタログ同期（自動検出）

```bash
node bin/skill-memo.js sync
```

`~/.claude/settings.json` のMCPサーバーと `~/.claude/skills/` のスキルを検出して追加する。
既存エントリのメモは上書きしない。

### 手動追加

```bash
node bin/skill-memo.js add skill nano-banana --memo "画像生成スキル"
node bin/skill-memo.js add mcp filesystem --memo "ファイルシステムアクセス"
```

### メモ更新

```bash
node bin/skill-memo.js memo mcp:memory "ナレッジグラフ。エンティティ管理用"
node bin/skill-memo.js memo skill:x-post "X投稿スキル。ファクトチェック内蔵"
```

### 削除

```bash
node bin/skill-memo.js remove skill:old-tool
```

### ストアパス確認

```bash
node bin/skill-memo.js path
```

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

**注意**: `~/.claude/settings.json` は読み取り専用。このツールは一切書き込まない。

## テスト

```bash
node test/run.js
```

## 依存パッケージ

なし（Node.js 18+ 標準ライブラリのみ使用）

## ライセンス

MIT
