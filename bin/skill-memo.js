#!/usr/bin/env node
/**
 * skill-memo CLI
 * サブコマンド: list, add, memo, remove, sync
 *
 * 使用例:
 *   skill-memo list
 *   skill-memo list --type mcp
 *   skill-memo add skill nano-banana --memo "画像生成スキル"
 *   skill-memo memo mcp:memory "ナレッジグラフ管理"
 *   skill-memo remove skill:old-tool
 *   skill-memo sync
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
} from '../src/store.js';
import { detectAll } from '../src/detector.js';
import { formatTable, formatDetail, formatSummary } from '../src/display.js';

const [, , command, ...args] = process.argv;

function usage() {
  console.log(`
skill-memo — Claude Codeスキル・MCPサーバーカタログツール

使い方:
  skill-memo list [--type mcp|skill] [--sort key|type|source]
      カタログ一覧を表示する

  skill-memo add <mcp|skill> <name> [--memo <text>]
      エントリを手動追加する

  skill-memo memo <key> <text>
      エントリのメモを更新する
      例: skill-memo memo mcp:memory "ナレッジグラフ"

  skill-memo remove <key>
      エントリを削除する
      例: skill-memo remove skill:old-tool

  skill-memo sync
      settings.json と skills/ を自動検出して新規エントリをカタログに追加する
      既存エントリは上書きしない

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
  const sortBy = opts['sort'] ?? 'type';

  if (filterType && filterType !== 'mcp' && filterType !== 'skill') {
    console.error(`エラー: --type は 'mcp' または 'skill' を指定してください`);
    process.exit(1);
  }

  console.log(formatTable(entries, { filterType, sortBy }));
  console.log('');
  console.log(formatSummary(entries));
  console.log(`\nストア: ${getStorePath()}`);
}

function cmdAdd(args) {
  const { positional, opts } = parseArgs(args);
  const [type, name] = positional;

  if (!type || !name) {
    console.error('エラー: skill-memo add <mcp|skill> <name> [--memo <text>]');
    process.exit(1);
  }

  const memo = opts['memo'] ?? '';

  try {
    const entry = addEntry(type, name, 'manual', memo);
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

  const memo = memoParts.join(' ');

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

function cmdSync() {
  const detected = detectAll();
  const { added, skipped } = syncEntries(detected);
  console.log(`同期完了: 追加=${added}, スキップ(既存)=${skipped}`);
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
    cmdSync();
    break;
  case 'path':
    cmdPath();
    break;
  default:
    console.error(`エラー: 不明なコマンド '${command}'`);
    console.error('skill-memo --help でヘルプを確認してください');
    process.exit(1);
}
