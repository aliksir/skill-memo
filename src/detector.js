/**
 * detector.js — 自動検出
 * - ~/.claude/settings.json から MCPサーバーを検出
 * - ~/.claude/skills/ からスキルを検出
 *
 * 注意: settings.json は読み取り専用。書き込みは一切しない。
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const SETTINGS_PATH = join(homedir(), '.claude', 'settings.json');
const SKILLS_DIR = join(homedir(), '.claude', 'skills');

/**
 * settings.json から MCPサーバー名一覧を取得する
 * @returns {string[]} MCPサーバー名の配列
 */
export function detectMcpServers() {
  if (!existsSync(SETTINGS_PATH)) {
    return [];
  }

  let raw;
  try {
    raw = readFileSync(SETTINGS_PATH, 'utf-8');
  } catch (err) {
    // 読み取りエラーは警告にとどめる（ツールの動作は継続）
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
  if (!existsSync(SKILLS_DIR)) {
    return [];
  }

  let entries;
  try {
    entries = readdirSync(SKILLS_DIR);
  } catch (err) {
    process.stderr.write(`[detector] skills/ の読み取りに失敗しました: ${err.message}\n`);
    return [];
  }

  const skills = [];
  for (const entry of entries) {
    // _archive など _ で始まるディレクトリは除外
    if (entry.startsWith('_')) continue;

    const fullPath = join(SKILLS_DIR, entry);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        skills.push(entry);
      }
    } catch {
      // stat に失敗したエントリはスキップ
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
