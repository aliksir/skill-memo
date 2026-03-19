/**
 * detector.js — 自動検出
 * - ~/.claude/settings.json から MCPサーバーを検出
 * - ~/.claude/skills/ からスキルを検出
 *
 * 注意: settings.json は読み取り専用。書き込みは一切しない。
 */

import { readFileSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';

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
 * スキルの SKILL.md から description を読み取る
 * @param {string} skillName
 * @returns {string} description（最大200文字）、読み取れない場合は ''
 */
export function detectSkillDescription(skillName) {
  // パス検証: SKILLS_DIR配下のみ許可（パストラバーサル防止）
  const skillPath = resolve(SKILLS_DIR, skillName, 'SKILL.md');
  if (!skillPath.startsWith(SKILLS_DIR + '/') && !skillPath.startsWith(SKILLS_DIR + '\\')) {
    // Windowsのパス区切り文字も考慮
    const normalizedSkillPath = skillPath.replace(/\\/g, '/');
    const normalizedSkillsDir = SKILLS_DIR.replace(/\\/g, '/');
    if (!normalizedSkillPath.startsWith(normalizedSkillsDir + '/')) {
      process.stderr.write(`[detector] パストラバーサルを検出しました: ${skillName}\n`);
      return '';
    }
  }

  let raw;
  try {
    raw = readFileSync(skillPath, 'utf-8');
  } catch (err) {
    // ファイルが存在しない場合は空文字列を返す（エラーは無視）
    return '';
  }

  // フロントマター（---で囲まれた部分）のdescription: を探す
  const frontmatterMatch = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
    if (descMatch) {
      const desc = descMatch[1].trim().replace(/^["']|["']$/g, ''); // クォート除去
      return desc.slice(0, 200);
    }
  }

  // フロントマターにdescriptionがなければ、最初の # 見出しの次の非空行を探す
  const lines = raw.split('\n');
  let foundHeading = false;
  for (const line of lines) {
    if (!foundHeading) {
      if (line.startsWith('# ')) {
        foundHeading = true;
      }
      continue;
    }
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
      return trimmed.slice(0, 200);
    }
  }

  return '';
}

/**
 * 検出結果をエントリ形式に変換する
 * @param {string[]} mcpNames
 * @param {string[]} skillNames
 * @returns {{ type: string, name: string, source: 'auto', description: string }[]}
 */
export function buildDetectedEntries(mcpNames, skillNames) {
  const now = new Date().toISOString();
  const entries = [];

  for (const name of mcpNames) {
    // MCPサーバーはdescriptionなし（settings.jsonに構造がないため）
    entries.push({ type: 'mcp', name, source: 'auto', detectedAt: now, description: '' });
  }
  for (const name of skillNames) {
    const description = detectSkillDescription(name);
    entries.push({ type: 'skill', name, source: 'auto', detectedAt: now, description });
  }

  return entries;
}

/**
 * 自動検出を実行してエントリ一覧を返す（convenience wrapper）
 * @returns {{ type: string, name: string, source: 'auto', detectedAt: string, description: string }[]}
 */
export function detectAll() {
  const mcpNames = detectMcpServers();
  const skillNames = detectSkills();
  return buildDetectedEntries(mcpNames, skillNames);
}
