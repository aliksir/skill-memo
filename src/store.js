/**
 * store.js — データストアCRUD
 * 保存先: ~/.claude/skill-catalog.json
 * スキーマバージョン管理あり（migration対応）
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';

const CURRENT_VERSION = 1;
const DEFAULT_STORE_PATH = join(homedir(), '.claude', 'skill-catalog.json');

function storePath() {
  return process.env.SKILL_MEMO_STORE_PATH || DEFAULT_STORE_PATH;
}

/**
 * 空のストアオブジェクトを返す
 */
function emptyStore() {
  return { version: CURRENT_VERSION, entries: {} };
}

/**
 * マイグレーション: バージョン差分を吸収する
 * 将来バージョンが増えた場合はここに追加
 */
function migrate(data) {
  let store = data;

  // v0 -> v1: entries フィールドが存在しない場合の補完
  if (!store.version || store.version < 1) {
    store = { version: 1, entries: store.entries || {} };
  }

  return store;
}

/**
 * ストアファイルを読み込む
 * 存在しない場合は空ストアを返す
 */
export function loadStore() {
  let raw;
  try {
    raw = readFileSync(storePath(), 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') return emptyStore();
    throw new Error(`ストアファイルの読み込みに失敗しました: ${err.message}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(`ストアファイルのJSON解析に失敗しました: ${err.message}`);
  }

  return migrate(data);
}

/**
 * ストアファイルに書き込む
 */
export function saveStore(store) {
  const dir = dirname(storePath());
  mkdirSync(dir, { recursive: true });

  try {
    writeFileSync(storePath(), JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    throw new Error(`ストアファイルの書き込みに失敗しました: ${err.message}`);
  }
}

/**
 * エントリキーを生成する
 * @param {'mcp'|'skill'} type
 * @param {string} name
 */
export function makeKey(type, name) {
  return `${type}:${name}`;
}

/**
 * エントリを全件取得する
 * @returns {Object} entries オブジェクト
 */
export function listEntries() {
  const store = loadStore();
  return store.entries;
}

/**
 * エントリを1件取得する
 * @param {string} key  例: 'mcp:memory'
 * @returns {Object|null}
 */
export function getEntry(key) {
  const store = loadStore();
  return store.entries[key] ?? null;
}

/**
 * エントリを追加または上書きする
 * @param {'mcp'|'skill'} type
 * @param {string} name
 * @param {'auto'|'manual'} source
 * @param {string} [memo]
 * @returns {Object} 追加されたエントリ
 */
export function addEntry(type, name, source, memo = '') {
  if (type !== 'mcp' && type !== 'skill') {
    throw new Error(`typeは 'mcp' または 'skill' でなければなりません。受け取った値: ${type}`);
  }
  if (!name || typeof name !== 'string') {
    throw new Error('nameは空でない文字列でなければなりません');
  }
  if (source !== 'auto' && source !== 'manual') {
    throw new Error(`sourceは 'auto' または 'manual' でなければなりません。受け取った値: ${source}`);
  }

  const store = loadStore();
  const key = makeKey(type, name);
  const now = new Date().toISOString();

  const existing = store.entries[key];
  const entry = {
    type,
    name,
    source,
    memo,
    detectedAt: existing?.detectedAt ?? now,
    updatedAt: now,
  };

  store.entries[key] = entry;
  saveStore(store);
  return entry;
}

/**
 * エントリのメモを更新する
 * @param {string} key
 * @param {string} memo
 * @returns {Object} 更新されたエントリ
 */
export function updateMemo(key, memo) {
  const store = loadStore();

  if (!store.entries[key]) {
    throw new Error(`エントリが見つかりません: ${key}`);
  }

  store.entries[key].memo = memo;
  store.entries[key].updatedAt = new Date().toISOString();

  saveStore(store);
  return store.entries[key];
}

/**
 * エントリを削除する
 * @param {string} key
 * @returns {Object} 削除されたエントリ
 */
export function removeEntry(key) {
  const store = loadStore();

  if (!store.entries[key]) {
    throw new Error(`エントリが見つかりません: ${key}`);
  }

  const removed = store.entries[key];
  delete store.entries[key];
  saveStore(store);
  return removed;
}

/**
 * 複数エントリを一括追加する（sync用。既存エントリはスキップ）
 * @param {{ type: string, name: string, source: string }[]} newEntries
 * @returns {{ added: number, skipped: number }}
 */
export function syncEntries(newEntries) {
  const store = loadStore();
  const now = new Date().toISOString();
  let added = 0;
  let skipped = 0;

  for (const { type, name, source } of newEntries) {
    const key = makeKey(type, name);
    if (store.entries[key]) {
      skipped++;
      continue;
    }
    store.entries[key] = {
      type, name, source, memo: '',
      detectedAt: now,
      updatedAt: now,
    };
    added++;
  }

  if (added > 0) saveStore(store);
  return { added, skipped };
}

/**
 * ストアのパスを返す（テスト・デバッグ用）
 */
export function getStorePath() {
  return storePath();
}
