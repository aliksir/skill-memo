#!/usr/bin/env node
/**
 * skill-memo CLI
 * サブコマンド: list, add, memo, remove, sync, search, tag, export
 *
 * 使用例:
 *   skill-memo list
 *   skill-memo list --type mcp
 *   skill-memo list --tag security
 *   skill-memo list --json
 *   skill-memo add skill nano-banana --memo "画像生成スキル" --tag "image,ai"
 *   skill-memo memo mcp:memory "ナレッジグラフ管理"
 *   skill-memo remove skill:old-tool
 *   skill-memo sync
 *   skill-memo search セキュリティ
 *   skill-memo search --json memory
 *   skill-memo tag mcp:memory security,review
 *   skill-memo export
 *   skill-memo export --format json
 */

import {
  listEntries,
  getEntry,
  addEntry,
  updateMemo,
  removeEntry,
  syncEntries,
  makeKey,
  getStorePath,
  loadStore,
  searchEntries,
  updateTags,
  isPrunable,
  computeSyncDiff,
} from '../src/store.js';
import { detectAll } from '../src/detector.js';
import { formatTable, formatDetail, formatSummary, formatJson, formatExportMarkdown } from '../src/display.js';

const [, , command, ...args] = process.argv;

function usage() {
  console.log(`
skill-memo — Claude Codeスキル・MCPサーバーカタログツール

使い方:
  skill-memo list [--type mcp|skill] [--sort key|type|source|name|updated] [--tag <tag>] [--json]
      カタログ一覧を表示する

  skill-memo add <mcp|skill> <name> [--memo <text>] [--tag <tags>]
      エントリを手動追加する
      例: skill-memo add skill nano-banana --memo "画像生成" --tag "image,ai"

  skill-memo memo <key> <text>
      エントリのメモを更新する（\\nで改行）
      例: skill-memo memo mcp:memory "1行目\\n2行目"

  skill-memo remove <key>
      エントリを削除する
      例: skill-memo remove skill:old-tool

  skill-memo sync
      settings.json と skills/ を自動検出して新規エントリをカタログに追加する
      既存エントリは上書きしない

  skill-memo search <query>
      AND検索（スペース区切り）でエントリを検索する
      例: skill-memo search セキュリティ
      例: skill-memo search --json memory

  skill-memo tag <key> <tags>
      エントリのタグを設定する（カンマ区切り、上書き）
      例: skill-memo tag mcp:memory security,review

  skill-memo export [--format md|json]
      カタログをエクスポートする（デフォルト: Markdownテーブル）
      例: skill-memo export --format json > catalog.json

  skill-memo path
      ストアファイルのパスを表示する

オプション:
  --help    このヘルプを表示する
`);
}

/**
 * コマンドライン引数からオプションをパースする
 * @param {string[]} rawArgs
 * @returns {{ positional: string[], opts: Object }}
 */
function parseArgs(rawArgs) {
  const positional = [];
  const opts = {};

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = rawArgs[i + 1];
      if (next && !next.startsWith('--')) {
        opts[key] = next;
        i++;
      } else {
        opts[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, opts };
}

function cmdList(args) {
  const { opts } = parseArgs(args);
  const entries = listEntries();

  const filterType = opts['type']; // 'mcp' | 'skill' | undefined
  const filterTag = opts['tag']?.toLowerCase();   // タグフィルタ（小文字正規化）
  const sortBy = opts['sort'] ?? 'type';

  if (filterType && filterType !== 'mcp' && filterType !== 'skill') {
    console.error(`エラー: --type は 'mcp' または 'skill' を指定してください`);
    process.exit(1);
  }

  if (opts['json']) {
    // JSON出力: フィルタを適用した上で配列出力
    let filtered = entries;
    if (filterType) {
      filtered = Object.fromEntries(Object.entries(entries).filter(([, e]) => e.type === filterType));
    }
    if (filterTag) {
      filtered = Object.fromEntries(Object.entries(filtered).filter(([, e]) => Array.isArray(e.tags) && e.tags.includes(filterTag)));
    }
    console.log(formatJson(filtered));
    return;
  }

  console.log(formatTable(entries, { filterType, filterTag, sortBy }));
  console.log('');
  console.log(formatSummary(entries));
  console.log(`\nストア: ${getStorePath()}`);
}

function cmdAdd(args) {
  const { positional, opts } = parseArgs(args);
  const [type, name] = positional;

  if (!type || !name) {
    console.error('エラー: skill-memo add <mcp|skill> <name> [--memo <text>] [--tag <tags>]');
    process.exit(1);
  }

  const memo = opts['memo'] ?? '';

  // タグをカンマ区切りで分割
  const tagRaw = opts['tag'] ?? '';
  const tags = tagRaw ? tagRaw.split(',').map(t => t.trim()).filter(t => t) : [];

  try {
    const entry = addEntry(type, name, 'manual', memo, tags);
    const key = makeKey(type, name);
    console.log(`追加しました: ${key}`);
    console.log(formatDetail(key, entry));
  } catch (err) {
    console.error(`エラー: ${err.message}`);
    process.exit(1);
  }
}

function cmdMemo(args) {
  const { positional } = parseArgs(args);
  const [key, ...memoParts] = positional;

  if (!key || memoParts.length === 0) {
    console.error('エラー: skill-memo memo <key> <text>');
    process.exit(1);
  }

  // \\n を実際の改行に変換
  const memo = memoParts.join(' ').replace(/\\n/g, '\n');

  try {
    const entry = updateMemo(key, memo);
    console.log(`メモを更新しました: ${key}`);
    console.log(formatDetail(key, entry));
  } catch (err) {
    console.error(`エラー: ${err.message}`);
    process.exit(1);
  }
}

function cmdRemove(args) {
  const { positional } = parseArgs(args);
  const [key] = positional;

  if (!key) {
    console.error('エラー: skill-memo remove <key>');
    process.exit(1);
  }

  try {
    const removed = removeEntry(key);
    console.log(`削除しました: ${key} (type: ${removed.type})`);
  } catch (err) {
    console.error(`エラー: ${err.message}`);
    process.exit(1);
  }
}

function cmdSync(args) {
  const { opts } = parseArgs(args || []);

  if (opts['prune']) {
    console.log('--pruneは未実装です。削除は skill-memo remove <key> で手動実行してください。');
    return;
  }

  const detected = detectAll();
  const currentEntries = listEntries();

  // 検出されたキーを生成
  const detectedKeys = detected.map(e => makeKey(e.type, e.name));

  // 差分計算
  const diff = computeSyncDiff(currentEntries, detectedKeys);

  // 差分表示
  for (const key of diff.added) {
    console.log(`[新規] ${key}`);
  }
  for (const key of diff.removed) {
    console.log(`[削除候補] ${key}（カタログにあるが環境に不在 / メモ・タグなし）`);
  }
  for (const key of diff.existing) {
    console.log(`[既存] ${key}（変更なし）`);
  }

  // 保存（新規のみ追加、descriptionも更新）
  const { added, skipped } = syncEntries(detected);
  console.log(`\n同期完了: 追加=${added}, 削除候補=${diff.removed.length}, 既存=${skipped}`);
}

function cmdSearch(args) {
  const { positional, opts } = parseArgs(args);
  const query = positional.join(' ');

  const results = searchEntries(query);

  const filterType = opts['type'];
  const filterTag = opts['tag']?.toLowerCase();

  if (filterType && filterType !== 'mcp' && filterType !== 'skill') {
    console.error(`エラー: --type は 'mcp' または 'skill' を指定してください`);
    process.exit(1);
  }

  if (opts['json']) {
    let filtered = results;
    if (filterType) {
      filtered = Object.fromEntries(Object.entries(filtered).filter(([, e]) => e.type === filterType));
    }
    if (filterTag) {
      filtered = Object.fromEntries(Object.entries(filtered).filter(([, e]) => Array.isArray(e.tags) && e.tags.includes(filterTag)));
    }
    console.log(formatJson(filtered));
    return;
  }

  const sortBy = opts['sort'] ?? 'type';
  console.log(formatTable(results, { filterType, filterTag, sortBy }));
  console.log('');
  console.log(formatSummary(results));
}

function cmdTag(args) {
  const { positional } = parseArgs(args);
  const [key, ...tagParts] = positional;

  if (!key) {
    console.error('エラー: skill-memo tag <key> <tags>');
    process.exit(1);
  }

  // タグをカンマ区切りで結合してから分割（複数引数またはカンマ区切りに対応）
  const tagRaw = tagParts.join(',');
  const tags = tagRaw ? tagRaw.split(',').map(t => t.trim()).filter(t => t) : [];

  try {
    const { entry, errors } = updateTags(key, tags);
    if (errors.length > 0) {
      for (const err of errors) {
        console.error(`警告: ${err}`);
      }
    }
    console.log(`タグを更新しました: ${key}`);
    console.log(formatDetail(key, entry));
  } catch (err) {
    console.error(`エラー: ${err.message}`);
    process.exit(1);
  }
}

function cmdExport(args) {
  const { opts } = parseArgs(args);
  const store = loadStore();

  if (opts['format'] === 'json') {
    console.log(JSON.stringify(store, null, 2));
    return;
  }

  // デフォルト: Markdownテーブル
  console.log(formatExportMarkdown(store.entries));
}

function cmdPath() {
  console.log(getStorePath());
}

// メインルーティング
if (!command || command === '--help' || command === '-h') {
  usage();
  process.exit(0);
}

switch (command) {
  case 'list':
    cmdList(args);
    break;
  case 'add':
    cmdAdd(args);
    break;
  case 'memo':
    cmdMemo(args);
    break;
  case 'remove':
    cmdRemove(args);
    break;
  case 'sync':
    cmdSync(args);
    break;
  case 'search':
    cmdSearch(args);
    break;
  case 'tag':
    cmdTag(args);
    break;
  case 'export':
    cmdExport(args);
    break;
  case 'path':
    cmdPath();
    break;
  default:
    console.error(`エラー: 不明なコマンド '${command}'`);
    console.error('skill-memo --help でヘルプを確認してください');
    process.exit(1);
}
