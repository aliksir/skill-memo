# skill-memo

Claude Codeにインストール済みのスキル・MCPサーバーのカタログツール。自動検出・手動登録・自由メモ機能を提供し、`/catalog` コマンドで一覧確認できる。

## 技術スタック
- Node.js 18+（ESモジュール）
- 依存パッケージなし

## セットアップ
```bash
npm install -g skill-memo
```

## ビルド
該当なし（ビルドステップなし）

## テスト
```bash
node test/run.js
```

## 開発規約
- `~/.claude/settings.json` は読み取り専用。書き込み・変更は絶対禁止
- 既存のClaude Code設定を破壊しない
- データストア（`~/.claude/skill-catalog.json`）のスキーマ変更時はマイグレーション対応を実装する
- エントリポイント: `bin/skill-memo.js`
