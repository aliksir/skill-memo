/**
 * test/run.js — skill-memo テストスイート
 * assert重視。本物の store.js を環境変数でパス差し替えて使う。
 * 実行: node test/run.js
 */

import assert from 'assert/strict';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// テスト用の一時ストアパスを環境変数で設定（store.js のインポート前に設定）
const TMP_STORE = join(tmpdir(), `skill-memo-test-${Date.now()}.json`);
process.env.SKILL_MEMO_STORE_PATH = TMP_STORE;

// store.js（環境変数でパスが差し替わっている）
import {
  loadStore,
  saveStore,
  makeKey,
  listEntries,
  getEntry,
  addEntry,
  updateMemo,
  removeEntry,
  syncEntries,
  getStorePath,
} from '../src/store.js';

// display.js
import {
  formatTable,
  formatDetail,
  formatSummary,
} from '../src/display.js';

// detector.js
import {
  detectMcpServers,
  detectSkills,
  buildDetectedEntries,
} from '../src/detector.js';

// ---- テストユーティリティ ----

let passCount = 0;
let failCount = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passCount++;
    process.stdout.write(`  PASS: ${name}\n`);
  } catch (err) {
    failCount++;
    failures.push({ name, err });
    process.stdout.write(`  FAIL: ${name}\n       ${err.message}\n`);
  }
}

function resetStore() {
  if (existsSync(TMP_STORE)) {
    try { unlinkSync(TMP_STORE); } catch { /* ignore */ }
  }
}

// テスト終了時にクリーンアップ
process.on('exit', resetStore);

// ---- テスト開始 ----

console.log('\n=== skill-memo テストスイート ===\n');

// -------------------- makeKey --------------------
console.log('[makeKey]');
test('mcp:name の形式でキーを生成する', () => {
  assert.equal(makeKey('mcp', 'memory'), 'mcp:memory');
});
test('skill:name の形式でキーを生成する', () => {
  assert.equal(makeKey('skill', 'x-post'), 'skill:x-post');
});

// -------------------- ストア CRUD --------------------
console.log('\n[store CRUD — 一時ファイル使用]');

resetStore(); // 各セクション前にリセット

test('空ストアはentriesが空オブジェクト', () => {
  const data = loadStore();
  assert.deepEqual(data.entries, {});
  assert.equal(data.version, 1);
});

test('ストアパスが環境変数で差し替わっている', () => {
  assert.equal(getStorePath(), TMP_STORE);
});

test('エントリを追加できる', () => {
  const entry = addEntry('mcp', 'memory', 'auto', 'テストメモ');
  assert.equal(entry.type, 'mcp');
  assert.equal(entry.name, 'memory');
  assert.equal(entry.source, 'auto');
  assert.equal(entry.memo, 'テストメモ');
  assert.ok(entry.detectedAt);
  assert.ok(entry.updatedAt);
});

test('追加したエントリを取得できる', () => {
  const entry = getEntry('mcp:memory');
  assert.ok(entry !== null);
  assert.equal(entry.name, 'memory');
});

test('存在しないキーはnullを返す', () => {
  const entry = getEntry('mcp:nonexistent');
  assert.equal(entry, null);
});

test('メモを更新できる', () => {
  addEntry('skill', 'x-post', 'manual', '元メモ');
  const updated = updateMemo('skill:x-post', '新しいメモ');
  assert.equal(updated.memo, '新しいメモ');
});

test('存在しないキーのメモ更新はエラー', () => {
  assert.throws(
    () => updateMemo('skill:ghost', 'メモ'),
    /エントリが見つかりません/
  );
});

test('エントリを削除できる', () => {
  addEntry('skill', 'to-delete', 'manual', '');
  const removed = removeEntry('skill:to-delete');
  assert.equal(removed.name, 'to-delete');
  assert.equal(getEntry('skill:to-delete'), null);
});

test('存在しないキーの削除はエラー', () => {
  assert.throws(
    () => removeEntry('skill:ghost'),
    /エントリが見つかりません/
  );
});

test('不正なtypeはエラー', () => {
  assert.throws(
    () => addEntry('invalid', 'test', 'auto'),
    /typeは 'mcp' または 'skill'/
  );
});

test('不正なsourceはエラー', () => {
  assert.throws(
    () => addEntry('mcp', 'test', 'unknown'),
    /sourceは 'auto' または 'manual'/
  );
});

test('nameが空のときエラー', () => {
  assert.throws(
    () => addEntry('mcp', '', 'auto'),
    /空でない文字列/
  );
});

test('追加で同一キーは上書きされる（detectedAtは保持）', () => {
  addEntry('mcp', 'overlap', 'auto', '初回');
  const first = getEntry('mcp:overlap');
  addEntry('mcp', 'overlap', 'manual', '2回目');
  const second = getEntry('mcp:overlap');
  assert.equal(second.memo, '2回目');
  assert.equal(second.detectedAt, first.detectedAt);
});

test('list() で全エントリを取得できる', () => {
  const entries = listEntries();
  assert.ok(typeof entries === 'object');
  assert.ok('mcp:memory' in entries);
});

test('永続化: 保存後に再ロードしても同じデータ', () => {
  addEntry('skill', 'persist-test', 'auto', '永続化確認');
  // loadStore を直接呼び出して再読み込みをシミュレート
  const store = loadStore();
  const entry = store.entries['skill:persist-test'];
  assert.ok(entry !== null);
  assert.equal(entry.memo, '永続化確認');
});

// -------------------- syncEntries --------------------
console.log('\n[syncEntries — バルク追加]');

resetStore();

test('syncEntries: 新規エントリをバルク追加できる', () => {
  const { added, skipped } = syncEntries([
    { type: 'mcp', name: 'server1', source: 'auto' },
    { type: 'mcp', name: 'server2', source: 'auto' },
    { type: 'skill', name: 'skill1', source: 'auto' },
  ]);
  assert.equal(added, 3);
  assert.equal(skipped, 0);
  assert.ok(getEntry('mcp:server1') !== null);
  assert.ok(getEntry('skill:skill1') !== null);
});

test('syncEntries: 既存エントリはスキップする', () => {
  const { added, skipped } = syncEntries([
    { type: 'mcp', name: 'server1', source: 'auto' }, // 既存
    { type: 'skill', name: 'new-skill', source: 'auto' }, // 新規
  ]);
  assert.equal(added, 1);
  assert.equal(skipped, 1);
});

test('syncEntries: 空配列では書き込みしない', () => {
  const { added, skipped } = syncEntries([]);
  assert.equal(added, 0);
  assert.equal(skipped, 0);
});

// -------------------- display.js --------------------
console.log('\n[display.js]');

const sampleEntries = {
  'mcp:memory': { type: 'mcp', name: 'memory', source: 'auto', memo: 'ナレッジグラフ', detectedAt: '2026-03-12T00:00:00Z', updatedAt: '2026-03-12T00:00:00Z' },
  'skill:x-post': { type: 'skill', name: 'x-post', source: 'auto', memo: 'X投稿', detectedAt: '2026-03-12T00:00:00Z', updatedAt: '2026-03-12T00:00:00Z' },
  'skill:future': { type: 'skill', name: 'future', source: 'manual', memo: '', detectedAt: '2026-03-12T00:00:00Z', updatedAt: '2026-03-12T00:00:00Z' },
};

test('formatTable: テーブル文字列を返す', () => {
  const result = formatTable(sampleEntries);
  assert.ok(typeof result === 'string');
  assert.ok(result.includes('mcp:memory'));
  assert.ok(result.includes('skill:x-post'));
});

test('formatTable: --type mcp でフィルタできる', () => {
  const result = formatTable(sampleEntries, { filterType: 'mcp' });
  assert.ok(result.includes('mcp:memory'));
  assert.ok(!result.includes('skill:x-post'));
});

test('formatTable: --type skill でフィルタできる', () => {
  const result = formatTable(sampleEntries, { filterType: 'skill' });
  assert.ok(!result.includes('mcp:memory'));
  assert.ok(result.includes('skill:x-post'));
});

test('formatTable: 空エントリは (エントリがありません) を返す', () => {
  const result = formatTable({});
  assert.equal(result, '(エントリがありません)');
});

test('formatTable: フィルタで全件除外時も (エントリがありません) を返す', () => {
  const result = formatTable({ 'mcp:a': { type: 'mcp', name: 'a', source: 'auto', memo: '' } }, { filterType: 'skill' });
  assert.equal(result, '(エントリがありません)');
});

test('formatDetail: 全フィールドを含む', () => {
  const result = formatDetail('mcp:memory', sampleEntries['mcp:memory']);
  assert.ok(result.includes('mcp:memory'));
  assert.ok(result.includes('ナレッジグラフ'));
  assert.ok(result.includes('auto'));
});

test('formatDetail: memoが空のとき(なし)を表示', () => {
  const entry = { type: 'skill', name: 'future', source: 'manual', memo: '', detectedAt: '2026-03-12T00:00:00Z', updatedAt: '2026-03-12T00:00:00Z' };
  const result = formatDetail('skill:future', entry);
  assert.ok(result.includes('(なし)'));
});

test('formatSummary: 件数を正しく集計する', () => {
  const result = formatSummary(sampleEntries);
  assert.ok(result.includes('合計: 3件'));
  assert.ok(result.includes('MCP: 1'));
  assert.ok(result.includes('スキル: 2'));
  assert.ok(result.includes('自動=2'));
  assert.ok(result.includes('手動=1'));
});

test('formatSummary: 空エントリ', () => {
  const result = formatSummary({});
  assert.ok(result.includes('合計: 0件'));
});

// -------------------- detector.js --------------------
console.log('\n[detector.js]');

test('buildDetectedEntries: MCP エントリを正しく生成する', () => {
  const entries = buildDetectedEntries(['memory', 'filesystem'], []);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].type, 'mcp');
  assert.equal(entries[0].name, 'memory');
  assert.equal(entries[0].source, 'auto');
  assert.ok(entries[0].detectedAt);
});

test('buildDetectedEntries: スキルエントリを正しく生成する', () => {
  const entries = buildDetectedEntries([], ['x-post', 'nano-banana']);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].type, 'skill');
  assert.equal(entries[0].name, 'x-post');
  assert.equal(entries[0].source, 'auto');
});

test('buildDetectedEntries: 空の場合は空配列', () => {
  const entries = buildDetectedEntries([], []);
  assert.deepEqual(entries, []);
});

test('detectMcpServers: 配列を返す', () => {
  const result = detectMcpServers();
  assert.ok(Array.isArray(result));
});

test('detectSkills: 配列を返す（_archiveは除外）', () => {
  const result = detectSkills();
  assert.ok(Array.isArray(result));
  assert.ok(!result.includes('_archive'));
});

// -------------------- 境界値・異常系 --------------------
console.log('\n[境界値・異常系]');

test('長いメモは truncate されてテーブルに収まる', () => {
  const longMemo = 'あ'.repeat(100);
  const entries = {
    'skill:long': { type: 'skill', name: 'long', source: 'auto', memo: longMemo, detectedAt: '', updatedAt: '' }
  };
  const result = formatTable(entries);
  const lines = result.split('\n');
  for (const line of lines) {
    assert.ok(line.length <= 200, `行が長すぎる: ${line.length}文字`);
  }
});

test('キーに特殊文字を含む場合もテーブル表示できる', () => {
  const entries = {
    'skill:foo-bar_baz': { type: 'skill', name: 'foo-bar_baz', source: 'manual', memo: '', detectedAt: '', updatedAt: '' }
  };
  const result = formatTable(entries);
  assert.ok(result.includes('skill:foo-bar_baz'));
});

test('makeKey: nameに:を含む場合でもキーが生成される', () => {
  const key = makeKey('mcp', 'foo:bar');
  assert.equal(key, 'mcp:foo:bar');
});

// -------------------- 結果サマリー --------------------
console.log('\n================================');
console.log(`結果: ${passCount} PASS, ${failCount} FAIL`);

if (failures.length > 0) {
  console.log('\n失敗したテスト:');
  for (const { name, err } of failures) {
    console.log(`  - ${name}`);
    console.log(`    ${err.message}`);
  }
  process.exit(1);
} else {
  console.log('\n全テスト通過…ヨシッ！');
  process.exit(0);
}
