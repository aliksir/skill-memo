# Changelog

## [2.0.1] - 2026-03-22

### Fixed
- `bin` フィールドのパスから `./` プレフィックスを削除（npm publish時にbin登録が消える問題を修正）

## [2.0.0] - 2026-03-19

### Added
- **タグ機能**: エントリにタグを付与・フィルタ・更新できるようになった
  - `addEntry()` に `tags` パラメータ追加
  - `updateTags(key, tags)` 関数追加（正規化・バリデーション付き）
  - `list --tag <tag>` でタグフィルタ
  - `tag <key> <tags>` コマンドでタグを上書き設定
- **検索機能**: `search <query>` コマンドでAND検索できるようになった
  - 対象フィールド: key, name, memo, tags, description
  - 大文字小文字無視、部分一致、全角スペース対応
- **エクスポート機能**: `export` コマンドでMarkdown・JSONにエクスポートできるようになった
  - `--format md`（デフォルト）: パイプ記法Markdownテーブル
  - `--format json`: ストア全体のJSON
- **diff sync**: `sync` コマンドが差分を表示するようになった
  - `[新規]` / `[削除候補]` / `[既存]` の3カテゴリで表示
  - `isPrunable()` / `computeSyncDiff()` 関数追加
- **description フィールド**: エントリにdescriptionを追加
  - `sync` 時にスキルの `SKILL.md` から自動取得（フロントマター優先）
  - `formatDetail()` にTAGSとDESCRIPTION行を追加
- **ソート拡張**: `--sort name`（エントリ名昇順）と `--sort updated`（更新日降順）を追加
- **複数行メモ**: `memo` コマンドで `\n` を改行として扱うようになった
  - テーブル表示では1行目+↩マーカー、`show`（詳細）では全文表示
- **--json オプション**: `list` / `search` でJSON配列出力が可能になった
- **TAGS列**: テーブル表示にTAGS列を追加（20文字切り詰め）

### Changed
- スキーマバージョンを1→2に更新
  - v1ストアを読み込むと自動的にv2に変換される（tags:[], description:''を補完）
  - v1ストアのデータは非破壊で保持
- `emptyStore()` が `version: 2` を返すようになった
- `addEntry()` シグネチャに `tags=[]` と `description=''` を追加

### Fixed
- 前方互換チェック追加: `version > CURRENT_VERSION` のストアでエラーをスロー

## [1.0.0] - 2026-03-14

### Added
- 初回リリース
- Claude Code スキル・MCPサーバーのカタログ管理CLI
- `list`, `add`, `memo`, `remove`, `sync`, `path` コマンド
- `~/.claude/settings.json` からMCPサーバー自動検出
- `~/.claude/skills/` からスキル自動検出
- テーブル形式表示（--type, --sort フィルタ対応）
- スキーマバージョン管理（v1）
