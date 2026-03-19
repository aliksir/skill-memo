/**
 * store.js — データストアCRUD
 * 保存先: ~/.claude/skill-catalog.json
 * スキーマバージョン管理あり（migration対応）
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';

const CURRENT_VERSION = 2;
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

  // v1 -> v2: tags と description フィールドを補完
  if (store.version === 1) {
    for (const key of Object.keys(store.entries)) {
      const e = store.entries[key];
      if (!Array.isArray(e.tags)) e.tags = [];
      if (typeof e.description !== 'string') e.description = '';
    }
    store.version = 2;
  }

  // 前方互換: 未知バージョンは拒否
  if (store.version > CURRENT_VERSION) {
    throw new Error(`ストアバージョン ${store.version} はサポート外です（最大: ${CURRENT_VERSION}）`);
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
 * @param {string[]} [tags]
 * @param {string} [description]
 * @returns {Object} 追加されたエントリ
 */
export function addEntry(type, name, source, memo = '', tags = [], description = '') {
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
    tags: Array.isArray(tags) ? tags : [],
    description: typeof description === 'string' ? description : '',
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
 * @param {{ type: string, name: string, source: string, description?: string }[]} newEntries
 * @returns {{ added: number, skipped: number }}
 */
export function syncEntries(newEntries) {
  const store = loadStore();
  const now = new Date().toISOString();
  let added = 0;
  let skipped = 0;

  for (const { type, name, source, description = '' } of newEntries) {
    const key = makeKey(type, name);
    if (store.entries[key]) {
      // 既存エントリのdescriptionを更新（auto検出は毎回最新化）
      if (description && store.entries[key].source === 'auto') {
        store.entries[key].description = description;
      }
      skipped++;
      continue;
    }
    store.entries[key] = {
      type, name, source, memo: '',
      tags: [],
      description,
      detectedAt: now,
      updatedAt: now,
    };
    added++;
  }

  if (added > 0 || newEntries.some(({ description, name, type }) => {
    const key = makeKey(type, name);
    return description && store.entries[key]?.source === 'auto';
  })) {
    saveStore(store);
  }
  return { added, skipped };
}

/**
 * エントリのタグを更新する（上書き）
 * タグは正規化（小文字化、trim、dedup、空除去）してバリデーションする
 * @param {string} key
 * @param {string[]} tags
 * @returns {{ entry: Object, errors: string[] }} 更新されたエントリと無効タグのエラーリスト
 */
export function updateTags(key, tags) {
  const store = loadStore();

  if (!store.entries[key]) {
    throw new Error(`エントリが見つかりません: ${key}`);
  }

  const errors = [];
  const validTags = [];
  const seen = new Set();

  for (const tag of tags) {
    const normalized = tag.trim().toLowerCase();
    if (!normalized) continue; // 空タグ除去
    if (!/^[a-z0-9-]+$/.test(normalized)) {
      errors.push(`無効なタグ: "${tag}" （使用可能: 半角英小文字・数字・ハイフンのみ）`);
      continue;
    }
    if (seen.has(normalized)) continue; // 重複排除
    seen.add(normalized);
    validTags.push(normalized);
  }

  store.entries[key].tags = validTags;
  store.entries[key].updatedAt = new Date().toISOString();

  saveStore(store);
  return { entry: store.entries[key], errors };
}

/**
 * エントリが削除候補かどうかを判定する
 * @param {Object} entry
 * @returns {boolean}
 */
export function isPrunable(entry) {
  return (
    entry.source === 'auto' &&
    entry.memo === '' &&
    (typeof entry.description !== 'string' || entry.description === '') &&
    (!Array.isArray(entry.tags) || entry.tags.length === 0)
  );
}

/**
 * 検出結果と既存ストアの差分を計算する（副作用なし）
 * @param {Object} currentEntries  現在のストアエントリ
 * @param {string[]} detectedKeys  検出されたキーの配列
 * @returns {{ added: string[], removed: string[], existing: string[] }}
 */
export function computeSyncDiff(currentEntries, detectedKeys) {
  const detectedSet = new Set(detectedKeys);
  const currentKeys = Object.keys(currentEntries);

  const added = detectedKeys.filter(k => !currentEntries[k]);
  const existing = detectedKeys.filter(k => currentEntries[k]);
  const removed = currentKeys.filter(k => {
    if (detectedSet.has(k)) return false;
    return isPrunable(currentEntries[k]);
  });

  return { added, removed, existing };
}

/**
 * エントリを検索する（AND検索、大文字小文字無視）
 * @param {string} query  検索クエリ（スペース区切りでAND検索）
 * @returns {Object} マッチしたエントリのオブジェクト
 */
export function searchEntries(query) {
  const entries = loadStore().entries;

  // 空クエリは全件返す
  const trimmed = query.trim();
  if (!trimmed) return entries;

  // 正規化: 連続空白（全角スペース含む）を単一半角スペースに
  const normalized = trimmed.replace(/[\s\u3000]+/g, ' ').toLowerCase();
  const tokens = normalized.split(' ').filter(t => t.length > 0);

  const result = {};
  for (const [key, entry] of Object.entries(entries)) {
    const haystack = [
      key,
      entry.name ?? '',
      entry.memo ?? '',
      entry.description ?? '',
      ...(Array.isArray(entry.tags) ? entry.tags : []),
    ].join(' ').toLowerCase();

    if (tokens.every(token => haystack.includes(token))) {
      result[key] = entry;
    }
  }

  return result;
}

/**
 * ストアのパスを返す（テスト・デバッグ用）
 */
export function getStorePath() {
  return storePath();
}
