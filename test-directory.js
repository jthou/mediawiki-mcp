#!/usr/bin/env node

// 测试目录创建行为
import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: path.join(__dirname, '../test.env') });

console.log('当前工作目录:', process.cwd());
console.log('WIKI_OUTPUT_DIR:', process.env.WIKI_OUTPUT_DIR || '(未设置)');

// 模拟 handleGetPage 中的目录创建逻辑
const outputBaseDir = process.env.WIKI_OUTPUT_DIR || process.cwd();
const wikiDir = path.join(outputBaseDir, '.jthou_wiki');

console.log('计算的输出目录:', wikiDir);

// 创建目录（如果不存在）
if (!fs.existsSync(wikiDir)) {
  fs.mkdirSync(wikiDir, { recursive: true });
  console.log('创建了目录:', wikiDir);
} else {
  console.log('目录已存在:', wikiDir);
}

// 写入测试文件
const testFile = path.join(wikiDir, 'test-location.txt');
fs.writeFileSync(testFile, `测试文件创建于: ${new Date().toISOString()}\n工作目录: ${process.cwd()}\n输出目录: ${wikiDir}`, 'utf8');
console.log('测试文件已创建:', testFile);
