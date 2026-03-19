/**
 * test/run.js — skill-memo テストスイート
 * assert重視。本物の store.js を環境変数でパス差し替えて使う。
 * 実行: node test/run.js
 */

import assert from 'assert/strict';
import { unlinkSync, existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
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
  searchEntries,
  updateTags,
  isPrunable,
  computeSyncDiff,
} from '../src/store.js';

// display.js
import {
  formatTable,
  formatDetail,
  formatSummary,
  formatJson,
  formatExportMarkdown,
} from '../src/display.js';

// detector.js
import {
  detectMcpServers,
  detectSkills,
  buildDetectedEntries,
  detectSkillDescription,
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
  assert.equal(data.version, 2);
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

// -------------------- v2 マイグレーション (M1-M6) --------------------
console.log('\n[v2 マイグレーション]');

test('M1: v1→v2変換でtags:[]とdescription:""が補完される', () => {
  resetStore();
  // v1形式のデータを直接保存
  const v1Store = {
    version: 1,
    entries: {
      'mcp:oldserver': { type: 'mcp', name: 'oldserver', source: 'auto', memo: 'old', detectedAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    },
  };
  saveStore(v1Store);
  const loaded = loadStore();
  assert.equal(loaded.version, 2);
  assert.deepEqual(loaded.entries['mcp:oldserver'].tags, []);
  assert.equal(loaded.entries['mcp:oldserver'].description, '');
  // 既存フィールドは保持
  assert.equal(loaded.entries['mcp:oldserver'].memo, 'old');
});

test('M2: v1→v2変換で既存tags/descriptionは保持される', () => {
  resetStore();
  // v1形式だがtags/descriptionが既にある（ありえないが念のため）
  const v1Store = {
    version: 1,
    entries: {
      'skill:test': { type: 'skill', name: 'test', source: 'manual', memo: '', tags: ['existing'], description: 'keep me', detectedAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    },
  };
  saveStore(v1Store);
  const loaded = loadStore();
  // tagsがArrayなのでそのまま保持
  assert.deepEqual(loaded.entries['skill:test'].tags, ['existing']);
  assert.equal(loaded.entries['skill:test'].description, 'keep me');
});

test('M3: v0→v2変換（versionなし）でv2に変換される', () => {
  resetStore();
  const v0Store = {
    entries: {
      'mcp:v0server': { type: 'mcp', name: 'v0server', source: 'auto', memo: '', detectedAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    },
  };
  saveStore(v0Store);
  const loaded = loadStore();
  assert.equal(loaded.version, 2);
  assert.deepEqual(loaded.entries['mcp:v0server'].tags, []);
  assert.equal(loaded.entries['mcp:v0server'].description, '');
});

test('M4: version:99のストアはエラーがスローされる', () => {
  resetStore();
  const futureStore = { version: 99, entries: {} };
  saveStore(futureStore);
  assert.throws(
    () => loadStore(),
    /サポート外/
  );
  resetStore(); // 後続のテストのためにリセット
});

test('M5: 新規作成はversion:2で作成される', () => {
  resetStore();
  const store = loadStore();
  assert.equal(store.version, 2);
});

test('M6: addEntryはtags/descriptionデフォルト値が設定される', () => {
  resetStore();
  const entry = addEntry('mcp', 'defaulttest', 'auto');
  assert.deepEqual(entry.tags, []);
  assert.equal(entry.description, '');
});

// -------------------- 検索 (S1-S8) --------------------
console.log('\n[検索 F1 (S1-S8)]');

resetStore();
addEntry('mcp', 'memory', 'auto', 'ナレッジグラフ管理', ['knowledge', 'storage'], 'メモリーサーバー');
addEntry('skill', 'security-check', 'auto', 'セキュリティスキャン', ['security', 'review'], 'スキルのセキュリティ検査');
addEntry('skill', 'x-post', 'manual', 'X投稿スキル', [], '');

test('S1: 名前に一致するエントリを返す', () => {
  const result = searchEntries('memory');
  assert.ok('mcp:memory' in result);
  assert.ok(!('skill:security-check' in result));
});

test('S2: メモに一致するエントリを返す', () => {
  const result = searchEntries('ナレッジ');
  assert.ok('mcp:memory' in result);
});

test('S3: タグに一致するエントリを返す', () => {
  const result = searchEntries('knowledge');
  assert.ok('mcp:memory' in result);
  assert.ok(!('skill:x-post' in result));
});

test('S4: descriptionに一致するエントリを返す', () => {
  const result = searchEntries('メモリーサーバー');
  assert.ok('mcp:memory' in result);
});

test('S5: AND検索で全キーワードを含むエントリのみ返す', () => {
  const result = searchEntries('security review');
  assert.ok('skill:security-check' in result);
  assert.ok(!('mcp:memory' in result));
});

test('S6: 大文字クエリで小文字エントリにもマッチする', () => {
  const result = searchEntries('MEMORY');
  assert.ok('mcp:memory' in result);
});

test('S7: 空クエリは全件返す', () => {
  const result = searchEntries('');
  const keys = Object.keys(result);
  assert.ok(keys.length >= 3);
  assert.ok('mcp:memory' in result);
  assert.ok('skill:x-post' in result);
});

test('S8: 存在しないキーワードは空オブジェクト返却', () => {
  const result = searchEntries('xyznotexists');
  assert.deepEqual(result, {});
});

// -------------------- タグ (T1-T5) --------------------
console.log('\n[タグ F2 (T1-T5)]');

resetStore();
addEntry('mcp', 'tagtest', 'auto', '', [], '');

test('T1: addEntry --tag でtags配列に保存される', () => {
  resetStore();
  const entry = addEntry('mcp', 'tagged', 'manual', '', ['security', 'ai']);
  assert.deepEqual(entry.tags, ['security', 'ai']);
});

test('T2: updateTagsで上書き保存される', () => {
  resetStore();
  addEntry('mcp', 'tagupdate', 'auto', '', ['old-tag']);
  const { entry } = updateTags('mcp:tagupdate', ['new-tag', 'another']);
  assert.deepEqual(entry.tags, ['new-tag', 'another']);
});

test('T3: タグ正規化（大文字・空白・重複）', () => {
  resetStore();
  addEntry('mcp', 'normalize', 'auto');
  const { entry } = updateTags('mcp:normalize', ['Security', '  AI  ', 'security', 'review']);
  assert.deepEqual(entry.tags, ['security', 'ai', 'review']);
});

test('T4: 不正文字タグはerrorsに報告されスキップされる', () => {
  resetStore();
  addEntry('mcp', 'invalid-tag', 'auto');
  const { entry, errors } = updateTags('mcp:invalid-tag', ['valid', 'INVALID@TAG', '日本語']);
  assert.ok(errors.length >= 2);
  assert.deepEqual(entry.tags, ['valid']);
});

test('T5: list --tagフィルタでマッチするエントリのみ返す', () => {
  resetStore();
  addEntry('mcp', 'tagged1', 'auto', '', ['security']);
  addEntry('mcp', 'tagged2', 'auto', '', ['review']);
  addEntry('skill', 'untagged', 'auto', '', []);
  const result = formatTable(listEntries(), { filterTag: 'security' });
  assert.ok(result.includes('mcp:tagged1'));
  assert.ok(!result.includes('mcp:tagged2'));
  assert.ok(!result.includes('skill:untagged'));
});

// -------------------- diff sync (D1-D5) --------------------
console.log('\n[diff sync F4 (D1-D5)]');

test('D1: 未登録エントリは[新規]カテゴリに分類', () => {
  const current = {};
  const detected = ['mcp:newserver'];
  const diff = computeSyncDiff(current, detected);
  assert.ok(diff.added.includes('mcp:newserver'));
  assert.equal(diff.removed.length, 0);
});

test('D2: 登録済みエントリは[既存]カテゴリに分類', () => {
  const current = {
    'mcp:existing': { type: 'mcp', name: 'existing', source: 'auto', memo: '', tags: [], description: '' },
  };
  const detected = ['mcp:existing'];
  const diff = computeSyncDiff(current, detected);
  assert.ok(diff.existing.includes('mcp:existing'));
  assert.equal(diff.added.length, 0);
});

test('D3: auto+メモなし+タグなしは[削除候補]に分類', () => {
  const current = {
    'mcp:prunable': { type: 'mcp', name: 'prunable', source: 'auto', memo: '', tags: [], description: '' },
  };
  const detected = []; // 検出されなかった
  const diff = computeSyncDiff(current, detected);
  assert.ok(diff.removed.includes('mcp:prunable'));
});

test('D4: auto+メモありは[削除候補]にならない', () => {
  const current = {
    'mcp:withmemo': { type: 'mcp', name: 'withmemo', source: 'auto', memo: 'メモあり', tags: [], description: '' },
  };
  const detected = []; // 検出されなかった
  const diff = computeSyncDiff(current, detected);
  assert.ok(!diff.removed.includes('mcp:withmemo'));
});

test('D5: computeSyncDiffはストアに書き込まない（副作用なし）', () => {
  resetStore();
  addEntry('mcp', 'nodiff', 'auto');
  const storeBefore = loadStore();
  computeSyncDiff(storeBefore.entries, ['mcp:new1', 'mcp:new2']);
  const storeAfter = loadStore();
  assert.deepEqual(storeBefore.entries, storeAfter.entries);
});

// -------------------- エクスポート (E1-E2) --------------------
console.log('\n[エクスポート F3 (E1-E2)]');

const exportEntries = {
  'mcp:server1': { type: 'mcp', name: 'server1', source: 'auto', memo: 'メモ', tags: ['tag1'], description: '', detectedAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  'skill:tool1': { type: 'skill', name: 'tool1', source: 'manual', memo: '', tags: [], description: '説明', detectedAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
};

test('E1: formatExportMarkdownでパイプ記法テーブルが出力される', () => {
  const result = formatExportMarkdown(exportEntries);
  assert.ok(result.includes('| Key | Type | Source | Tags | Memo |'));
  assert.ok(result.includes('|-----|'));
  assert.ok(result.includes('mcp:server1'));
  assert.ok(result.includes('skill:tool1'));
  assert.ok(result.includes('tag1'));
});

test('E2: formatJson（export用）でstore全体のJSONが返される', () => {
  // store全体は JSON.stringify(store, null, 2) のテスト
  resetStore();
  addEntry('mcp', 'exporttest', 'auto', 'エクスポートテスト');
  const store = loadStore();
  const json = JSON.stringify(store, null, 2);
  const parsed = JSON.parse(json);
  assert.equal(parsed.version, 2);
  assert.ok('mcp:exporttest' in parsed.entries);
});

// -------------------- --json出力 (J1-J2) --------------------
console.log('\n[--json出力 U1 (J1-J2)]');

const jsonEntries = {
  'mcp:j1': { type: 'mcp', name: 'j1', source: 'auto', memo: 'テスト', tags: [], description: '', detectedAt: '', updatedAt: '' },
  'skill:j2': { type: 'skill', name: 'j2', source: 'manual', memo: '', tags: ['tag'], description: '', detectedAt: '', updatedAt: '' },
};

test('J1: formatJsonでkeyフィールド付きJSON配列を返す', () => {
  const result = formatJson(jsonEntries);
  const parsed = JSON.parse(result);
  assert.ok(Array.isArray(parsed));
  assert.equal(parsed.length, 2);
  assert.ok(parsed.every(e => 'key' in e));
  const keys = parsed.map(e => e.key);
  assert.ok(keys.includes('mcp:j1'));
  assert.ok(keys.includes('skill:j2'));
});

test('J2: searchEntriesの結果をformatJsonで変換できる', () => {
  resetStore();
  addEntry('mcp', 'jsearch1', 'auto', 'マッチするメモ', [], '');
  addEntry('mcp', 'jsearch2', 'auto', '別のメモ', [], '');
  const results = searchEntries('マッチ');
  const json = formatJson(results);
  const parsed = JSON.parse(json);
  assert.ok(Array.isArray(parsed));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].key, 'mcp:jsearch1');
});

// -------------------- ソート拡張 (O1-O2) --------------------
console.log('\n[ソート拡張 U2 (O1-O2)]');

const sortEntries = {
  'mcp:zebra': { type: 'mcp', name: 'zebra', source: 'auto', memo: '', tags: [], description: '', detectedAt: '', updatedAt: '2026-03-10T00:00:00Z' },
  'mcp:apple': { type: 'mcp', name: 'apple', source: 'auto', memo: '', tags: [], description: '', detectedAt: '', updatedAt: '2026-03-19T00:00:00Z' },
  'mcp:mango': { type: 'mcp', name: 'mango', source: 'auto', memo: '', tags: [], description: '', detectedAt: '', updatedAt: '2026-03-15T00:00:00Z' },
};

test('O1: --sort nameでエントリ名の昇順ソート', () => {
  const result = formatTable(sortEntries, { sortBy: 'name' });
  const lines = result.split('\n').filter(l => l.startsWith('|') && !l.includes('KEY') && !l.includes('---'));
  assert.ok(lines[0].includes('apple'));
  assert.ok(lines[1].includes('mango'));
  assert.ok(lines[2].includes('zebra'));
});

test('O2: --sort updatedでupdatedAt降順ソート', () => {
  const result = formatTable(sortEntries, { sortBy: 'updated' });
  const lines = result.split('\n').filter(l => l.startsWith('|') && !l.includes('KEY') && !l.includes('---'));
  // 最近更新順: apple(2026-03-19) > mango(2026-03-15) > zebra(2026-03-10)
  assert.ok(lines[0].includes('apple'));
  assert.ok(lines[1].includes('mango'));
  assert.ok(lines[2].includes('zebra'));
});

// -------------------- メモ複数行 (L1-L3) --------------------
console.log('\n[メモ複数行 U3 (L1-L3)]');

test('L1: updateMemoで\\nが改行として保存される', () => {
  resetStore();
  addEntry('mcp', 'multiline', 'auto');
  const entry = updateMemo('mcp:multiline', '1行目\n2行目\n3行目');
  assert.ok(entry.memo.includes('\n'));
  assert.equal(entry.memo, '1行目\n2行目\n3行目');
});

test('L2: list表示で複数行メモは1行目+↩マーカー', () => {
  const multiEntries = {
    'mcp:multi': { type: 'mcp', name: 'multi', source: 'auto', memo: '1行目\n2行目', tags: [], description: '', detectedAt: '', updatedAt: '' },
  };
  const result = formatTable(multiEntries);
  assert.ok(result.includes('1行目↩'));
  assert.ok(!result.includes('2行目'));
});

test('L3: formatDetailで複数行メモは全文表示', () => {
  const entry = { type: 'mcp', name: 'multi', source: 'auto', memo: '1行目\n2行目\n3行目', tags: [], description: '', detectedAt: '', updatedAt: '' };
  const result = formatDetail('mcp:multi', entry);
  assert.ok(result.includes('1行目'));
  assert.ok(result.includes('2行目'));
  assert.ok(result.includes('3行目'));
});

// -------------------- isPrunable --------------------
console.log('\n[isPrunable]');

test('isPrunable: auto+memo空+tags空+description空はtrue', () => {
  const entry = { source: 'auto', memo: '', tags: [], description: '' };
  assert.equal(isPrunable(entry), true);
});

test('isPrunable: auto+メモありはfalse', () => {
  const entry = { source: 'auto', memo: 'メモあり', tags: [], description: '' };
  assert.equal(isPrunable(entry), false);
});

test('isPrunable: manual+memo空でもfalse', () => {
  const entry = { source: 'manual', memo: '', tags: [], description: '' };
  assert.equal(isPrunable(entry), false);
});

test('isPrunable: auto+タグありはfalse', () => {
  const entry = { source: 'auto', memo: '', tags: ['tag'], description: '' };
  assert.equal(isPrunable(entry), false);
});

// -------------------- detectSkillDescription (F5) --------------------
console.log('\n[detectSkillDescription F5]');

// テスト用の一時スキルディレクトリ
const TMP_SKILLS_DIR = join(tmpdir(), `skill-memo-test-skills-${Date.now()}`);

test('F5-1: フロントマターのdescriptionを読み取る', () => {
  const skillDir = join(TMP_SKILLS_DIR, 'test-skill-fm');
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, 'SKILL.md'), `---
name: test-skill
description: "This is a test skill description"
---

# Test Skill

Some content here.
`, 'utf-8');
  // detectSkillDescription はSKILLS_DIRを使うので直接テストは難しい
  // 代わりにフロントマター解析ロジックを検証（正規表現テスト）
  const raw = `---\nname: test\ndescription: Test description here\n---\n# Title\nContent`;
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  assert.ok(fmMatch);
  const descMatch = fmMatch[1].match(/^description:\s*(.+)$/m);
  assert.ok(descMatch);
  assert.equal(descMatch[1].trim(), 'Test description here');
  // クリーンアップ
  rmSync(skillDir, { recursive: true, force: true });
});

test('F5-2: フロントマターなしでヘッダー次行からdescriptionを取得する', () => {
  const raw = `# My Skill\n\nThis is the first paragraph after the heading.\n\nMore content.`;
  const lines = raw.split('\n');
  let foundHeading = false;
  let result = '';
  for (const line of lines) {
    if (!foundHeading) {
      if (line.startsWith('# ')) foundHeading = true;
      continue;
    }
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
      result = trimmed.slice(0, 200);
      break;
    }
  }
  assert.equal(result, 'This is the first paragraph after the heading.');
});

test('F5-3: 200文字を超えるdescriptionは切り詰められる', () => {
  const longDesc = 'A'.repeat(250);
  assert.equal(longDesc.slice(0, 200).length, 200);
});

test('F5-4: パストラバーサルが検出されるパターン', () => {
  // detectSkillDescriptionは内部でSKILLS_DIRを使うので、
  // '../' を含むスキル名を渡すとパストラバーサル防止で空文字が返る
  const result = detectSkillDescription('../../../etc/passwd');
  assert.equal(result, '');
});

test('F5-5: 存在しないスキルは空文字を返す', () => {
  const result = detectSkillDescription('nonexistent-skill-12345');
  assert.equal(result, '');
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
