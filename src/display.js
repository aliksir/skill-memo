/**
 * display.js — 一覧表示フォーマッタ
 * エントリをテーブル形式でフォーマットする（外部依存なし）
 */

const COL_WIDTHS = {
  key: 40,
  type: 7,
  source: 8,
  memo: 50,
};

/**
 * 文字列を指定幅に切り詰める（末尾に ... を付ける）
 * @param {string} str
 * @param {number} maxLen
 */
function truncate(str, maxLen) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

/**
 * 文字列を指定幅に右パディングする
 * @param {string} str
 * @param {number} width
 */
function pad(str, width) {
  return str.padEnd(width);
}

/**
 * テーブルのセパレーター行を生成する
 */
function separator() {
  const line = [
    '-'.repeat(COL_WIDTHS.key + 2),
    '-'.repeat(COL_WIDTHS.type + 2),
    '-'.repeat(COL_WIDTHS.source + 2),
    '-'.repeat(COL_WIDTHS.memo + 2),
  ].join('+');
  return `+${line}+`;
}

/**
 * テーブルのヘッダー行を生成する
 */
function header() {
  const cols = [
    pad('KEY', COL_WIDTHS.key),
    pad('TYPE', COL_WIDTHS.type),
    pad('SOURCE', COL_WIDTHS.source),
    pad('MEMO', COL_WIDTHS.memo),
  ].map(c => ` ${c} `).join('|');
  return `|${cols}|`;
}

/**
 * エントリ1件の行を生成する
 * @param {string} key
 * @param {Object} entry
 */
function entryRow(key, entry) {
  const cols = [
    pad(truncate(key, COL_WIDTHS.key), COL_WIDTHS.key),
    pad(entry.type ?? '', COL_WIDTHS.type),
    pad(entry.source ?? '', COL_WIDTHS.source),
    pad(truncate(entry.memo ?? '', COL_WIDTHS.memo), COL_WIDTHS.memo),
  ].map(c => ` ${c} `).join('|');
  return `|${cols}|`;
}

/**
 * エントリオブジェクトをテーブル形式の文字列に変換する
 * @param {Object} entries  key -> entry のオブジェクト
 * @param {{ filterType?: 'mcp'|'skill', sortBy?: 'key'|'type'|'source' }} [opts]
 * @returns {string}
 */
export function formatTable(entries, opts = {}) {
  const { filterType, sortBy = 'type' } = opts;

  let pairs = Object.entries(entries);

  // フィルタ
  if (filterType) {
    pairs = pairs.filter(([, e]) => e.type === filterType);
  }

  // ソート
  pairs.sort(([keyA, entA], [keyB, entB]) => {
    if (sortBy === 'key') return keyA.localeCompare(keyB);
    if (sortBy === 'source') return (entA.source ?? '').localeCompare(entB.source ?? '');
    // デフォルト: type でソートし、同type内は key でソート
    const typeCompare = (entA.type ?? '').localeCompare(entB.type ?? '');
    return typeCompare !== 0 ? typeCompare : keyA.localeCompare(keyB);
  });

  if (pairs.length === 0) {
    return '(エントリがありません)';
  }

  const lines = [
    separator(),
    header(),
    separator(),
    ...pairs.map(([key, entry]) => entryRow(key, entry)),
    separator(),
  ];

  return lines.join('\n');
}

/**
 * エントリ1件の詳細表示を生成する
 * @param {string} key
 * @param {Object} entry
 * @returns {string}
 */
export function formatDetail(key, entry) {
  return [
    `KEY    : ${key}`,
    `TYPE   : ${entry.type}`,
    `SOURCE : ${entry.source}`,
    `MEMO   : ${entry.memo || '(なし)'}`,
    `追加日 : ${entry.detectedAt}`,
    `更新日 : ${entry.updatedAt}`,
  ].join('\n');
}

/**
 * サマリー表示（件数）を生成する
 * @param {Object} entries
 * @returns {string}
 */
export function formatSummary(entries) {
  const counts = Object.values(entries).reduce((acc, e) => {
    acc.total++;
    if (e.type === 'mcp') acc.mcp++;
    if (e.type === 'skill') acc.skill++;
    if (e.source === 'auto') acc.auto++;
    if (e.source === 'manual') acc.manual++;
    return acc;
  }, { total: 0, mcp: 0, skill: 0, auto: 0, manual: 0 });

  return [
    `合計: ${counts.total}件 (MCP: ${counts.mcp}, スキル: ${counts.skill})`,
    `検出元: 自動=${counts.auto}, 手動=${counts.manual}`,
  ].join('\n');
}
