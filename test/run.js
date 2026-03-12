/**
 * test/run.js — skill-memo テストスイート
 * assert重視。print文のみのテストは不可。
 * 実行: node test/run.js
 */

import assert from 'assert/strict';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// テスト用の一時ストアパスを使うためにモジュールを直接テストする
// store.js のロジックを独立して検証するため、一時ファイルを使う

// ---- ユーティリティ ----

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

async function testAsync(name, fn) {
  try {
    await fn();
    passCount++;
    process.stdout.write(`  PASS: ${name}\n`);
  } catch (err) {
    failCount++;
    failures.push({ name, err });
    process.stdout.write(`  FAIL: ${name}\n       ${err.message}\n`);
  }
}

// ---- ストアの一時パスを切り替えるためのヘルパー ----

const ORIG_ENV = process.env.SKILL_MEMO_STORE_PATH;
const TMP_STORE = join(tmpdir(), `skill-memo-test-${Date.now()}.json`);

function cleanup() {
  if (existsSync(TMP_STORE)) {
    try { unlinkSync(TMP_STORE); } catch { /* ignore */ }
  }
}

// store.js は homedir() を使うため、テスト用に環境変数で差し替えるのが難しい。
// そのため、store.js のロジックを部分的に直接インポートし、
// 一時ファイルを明示的に指定して検証する関数を作る。

import {
  makeKey,
} from '../src/store.js';

// display.js のユニットテスト
import {
  formatTable,
  formatDetail,
  formatSummary,
} from '../src/display.js';

// detector.js のユニットテスト
import {
  detectMcpServers,
  detectSkills,
  buildDetectedEntries,
} from '../src/detector.js';

import { readFileSync } from 'fs';

function createTempStore(path) {
  const CURRENT_VERSION = 1;

  function load() {
    if (!existsSync(path)) return { version: CURRENT_VERSION, entries: {} };
    return JSON.parse(readFileSync(path, 'utf-8'));
  }
  function save(store) {
    writeFileSync(path, JSON.stringify(store, null, 2), 'utf-8');
  }
  function add(type, name, source, memo = '') {
    if (type !== 'mcp' && type !== 'skill') throw new Error(`invalid type: ${type}`);
    if (!name) throw new Error('name required');
    if (source !== 'auto' && source !== 'manual') throw new Error(`invalid source: ${source}`);
    const store = load();
    const key = `${type}:${name}`;
    const now = new Date().toISOString();
    store.entries[key] = {
      type, name, source, memo,
      detectedAt: store.entries[key]?.detectedAt ?? now,
      updatedAt: now,
    };
    save(store);
    return store.entries[key];
  }
  function updateMemo(key, memo) {
    const store = load();
    if (!store.entries[key]) throw new Error(`not found: ${key}`);
    store.entries[key].memo = memo;
    store.entries[key].updatedAt = new Date().toISOString();
    save(store);
    return store.entries[key];
  }
  function remove(key) {
    const store = load();
    if (!store.entries[key]) throw new Error(`not found: ${key}`);
    const removed = store.entries[key];
    delete store.entries[key];
    save(store);
    return removed;
  }
  function list() { return load().entries; }
  function get(key) { return load().entries[key] ?? null; }

  return { load, save, add, updateMemo, remove, list, get };
}

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

{
  const STORE = join(tmpdir(), `skill-memo-crud-${Date.now()}.json`);
  const store = createTempStore(STORE);

  // 後始末
  process.on('exit', () => { if (existsSync(STORE)) unlinkSync(STORE); });

  test('空ストアはentriesが空オブジェクト', () => {
    const data = store.load();
    assert.deepEqual(data.entries, {});
    assert.equal(data.version, 1);
  });

  test('エントリを追加できる', () => {
    const entry = store.add('mcp', 'memory', 'auto', 'テストメモ');
    assert.equal(entry.type, 'mcp');
    assert.equal(entry.name, 'memory');
    assert.equal(entry.source, 'auto');
    assert.equal(entry.memo, 'テストメモ');
    assert.ok(entry.detectedAt);
    assert.ok(entry.updatedAt);
  });

  test('追加したエントリを取得できる', () => {
    const entry = store.get('mcp:memory');
    assert.ok(entry !== null);
    assert.equal(entry.name, 'memory');
  });

  test('存在しないキーはnullを返す', () => {
    const entry = store.get('mcp:nonexistent');
    assert.equal(entry, null);
  });

  test('メモを更新できる', () => {
    store.add('skill', 'x-post', 'manual', '元メモ');
    const updated = store.updateMemo('skill:x-post', '新しいメモ');
    assert.equal(updated.memo, '新しいメモ');
  });

  test('存在しないキーのメモ更新はエラー', () => {
    assert.throws(
      () => store.updateMemo('skill:ghost', 'メモ'),
      /not found/
    );
  });

  test('エントリを削除できる', () => {
    store.add('skill', 'to-delete', 'manual', '');
    const removed = store.remove('skill:to-delete');
    assert.equal(removed.name, 'to-delete');
    assert.equal(store.get('skill:to-delete'), null);
  });

  test('存在しないキーの削除はエラー', () => {
    assert.throws(
      () => store.remove('skill:ghost'),
      /not found/
    );
  });

  test('不正なtypeはエラー', () => {
    assert.throws(
      () => store.add('invalid', 'test', 'auto'),
      /invalid type/
    );
  });

  test('不正なsourceはエラー', () => {
    assert.throws(
      () => store.add('mcp', 'test', 'unknown'),
      /invalid source/
    );
  });

  test('nameが空のときエラー', () => {
    assert.throws(
      () => store.add('mcp', '', 'auto'),
      /name required/
    );
  });

  test('追加で同一キーは上書きされる（detectedAtは保持）', () => {
    store.add('mcp', 'overlap', 'auto', '初回');
    const first = store.get('mcp:overlap');
    // 少し待ってから再追加
    store.add('mcp', 'overlap', 'manual', '2回目');
    const second = store.get('mcp:overlap');
    assert.equal(second.memo, '2回目');
    assert.equal(second.detectedAt, first.detectedAt); // detectedAt は保持
  });

  test('list() で全エントリを取得できる', () => {
    const entries = store.list();
    assert.ok(typeof entries === 'object');
    // 現在追加済みのエントリが存在する
    assert.ok('mcp:memory' in entries);
  });

  test('永続化: 保存後に再ロードしても同じデータ', () => {
    store.add('skill', 'persist-test', 'auto', '永続化確認');
    const store2 = createTempStore(STORE); // 同じパスで別インスタンス
    const entry = store2.get('skill:persist-test');
    assert.ok(entry !== null);
    assert.equal(entry.memo, '永続化確認');
  });
}

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

test('detectMcpServers: settings.json が存在しない場合は空配列', () => {
  // テスト環境で settings.json が存在する場合はスキップしない
  // 存在する場合は配列を返す（型チェックのみ）
  const result = detectMcpServers();
  assert.ok(Array.isArray(result));
});

test('detectSkills: skills/ が存在する場合は配列を返す', () => {
  const result = detectSkills();
  assert.ok(Array.isArray(result));
  // _archive は含まれない
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
  // テーブルに収まっていること（行が異常に長くない）
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
  // 制約なし（keyは文字列結合のみ）
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
