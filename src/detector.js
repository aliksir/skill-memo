/**
 * detector.js — 自動検出
 * - ~/.claude/settings.json から MCPサーバーを検出
 * - ~/.claude/skills/ からスキルを検出
 *
 * 注意: settings.json は読み取り専用。書き込みは一切しない。
 */

import { readFileSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const SETTINGS_PATH = join(homedir(), '.claude', 'settings.json');
const SKILLS_DIR = join(homedir(), '.claude', 'skills');

/**
 * settings.json から MCPサーバー名一覧を取得する
 * @returns {string[]} MCPサーバー名の配列
 */
export function detectMcpServers() {
  let raw;
  try {
    raw = readFileSync(SETTINGS_PATH, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    process.stderr.write(`[detector] settings.json の読み取りに失敗しました: ${err.message}\n`);
    return [];
  }

  let settings;
  try {
    settings = JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`[detector] settings.json のJSON解析に失敗しました: ${err.message}\n`);
    return [];
  }

  const mcpServers = settings.mcpServers;
  if (!mcpServers || typeof mcpServers !== 'object') {
    return [];
  }

  return Object.keys(mcpServers);
}

/**
 * ~/.claude/skills/ からスキル名一覧を取得する
 * サブディレクトリ名をスキル名として扱う（_archive は除外）
 * @returns {string[]} スキル名の配列
 */
export function detectSkills() {
  let entries;
  try {
    entries = readdirSync(SKILLS_DIR, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    process.stderr.write(`[detector] skills/ の読み取りに失敗しました: ${err.message}\n`);
    return [];
  }

  const skills = [];
  for (const entry of entries) {
    if (entry.name.startsWith('_')) continue;
    if (entry.isDirectory()) {
      skills.push(entry.name);
    }
  }

  return skills;
}

/**
 * 検出結果をエントリ形式に変換する
 * @param {string[]} mcpNames
 * @param {string[]} skillNames
 * @returns {{ type: string, name: string, source: 'auto' }[]}
 */
export function buildDetectedEntries(mcpNames, skillNames) {
  const now = new Date().toISOString();
  const entries = [];

  for (const name of mcpNames) {
    entries.push({ type: 'mcp', name, source: 'auto', detectedAt: now });
  }
  for (const name of skillNames) {
    entries.push({ type: 'skill', name, source: 'auto', detectedAt: now });
  }

  return entries;
}

/**
 * 自動検出を実行してエントリ一覧を返す（convenience wrapper）
 * @returns {{ type: string, name: string, source: 'auto', detectedAt: string }[]}
 */
export function detectAll() {
  const mcpNames = detectMcpServers();
  const skillNames = detectSkills();
  return buildDetectedEntries(mcpNames, skillNames);
}
