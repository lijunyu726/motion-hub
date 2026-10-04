#!/usr/bin/env node
// 安装 Motion Hub 的 Agent Skill：把仓库里的 skills/motion-hub/ 复制到 Agent 的 skills 目录。零依赖。
//   npx motion-hub              装到 ~/.claude/skills/motion-hub（所有项目可用）
//   npx motion-hub --project    装到当前目录的 .claude/skills/motion-hub（只给这个项目）
//   npx motion-hub --dir <路径>  装到指定的 skills 目录下（其他 Agent 工具用）
// 已经装过会直接覆盖同名的 motion-hub 文件夹（里面只有这个 Skill 自己的文件）。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) {
  console.log(`用法：
  npx motion-hub              装到 ~/.claude/skills/（所有项目可用）
  npx motion-hub --project    装到当前项目的 .claude/skills/
  npx motion-hub --dir <路径>  装到指定的 skills 目录`);
  process.exit(0);
}
const src = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'motion-hub');
if (!fs.existsSync(path.join(src, 'SKILL.md'))) { console.error('找不到 skills/motion-hub/SKILL.md，安装包不完整'); process.exit(1); }

const i = args.indexOf('--dir');
if (i >= 0 && !args[i + 1]) { console.error('--dir 后面要跟一个目录'); process.exit(1); }
const base = i >= 0 ? path.resolve(args[i + 1])
  : args.includes('--project') ? path.resolve('.claude', 'skills')
  : path.join(os.homedir(), '.claude', 'skills');
const dest = path.join(base, 'motion-hub');

fs.mkdirSync(base, { recursive: true });
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

let version = '';
try { version = JSON.parse(fs.readFileSync(path.join(dest, 'index.json'), 'utf8')).version; } catch (e) { /* 旧版没有 index.json */ }
const n = fs.readdirSync(path.join(dest, 'effects')).length;
console.log(`✓ Motion Hub Skill 已安装到 ${dest}`);
console.log(`  自带 ${n} 个效果${version ? `（版本 ${version}）` : ''}；使用时会自动从 https://motion.lijunyu.com.cn 获取新加的效果，不用重装。`);
console.log('  试试对 AI 说：“给首页加一个等高线动态背景”');
