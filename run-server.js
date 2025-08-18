#!/usr/bin/env node

/**
 * 启动 MediaWiki MCP 服务器（静默桥接版）
 * - 不向 stdout/stderr 直接输出任何非 JSON 内容
 * - 仅将子进程 stdout/stderr 透明转发给父进程（作为 JSON-RPC 通道）
 * - 所有调试与错误仅写入日志文件
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path, { dirname, join } from 'path';
import { config } from 'dotenv';
import fs from 'fs';
import os from 'os';

// 计算路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 轻量文件日志工具（同步写，避免引入第三方并保持简单可靠）
let logDir = process.env.LOG_DIR || '/var/log/mediawiki-mcp';
function ensureDir(p) {
  try {
    if (!path.isAbsolute(p)) {
      p = path.resolve(process.cwd(), p);
    }
    fs.mkdirSync(p, { recursive: true });
    return p;
  } catch {
    const fallback = path.join(os.tmpdir(), 'mediawiki-mcp-logs');
    try {
      fs.mkdirSync(fallback, { recursive: true });
    } catch {}
    return fallback;
  }
}
logDir = ensureDir(logDir);
const mainLogFile = path.join(logDir, 'mediawiki-mcp.run.log');
const errorLogFile = path.join(logDir, 'mediawiki-mcp.run.error.log');

function now() {
  return new Date().toISOString();
}
function writeLog(msg) {
  try {
    fs.appendFileSync(mainLogFile, `[${now()}] ${msg}\n`);
  } catch {}
}
function writeErr(msg) {
  try {
    fs.appendFileSync(errorLogFile, `[${now()}] ${msg}\n`);
  } catch {}
}

// 加载 .env（静默）
try {
  const cwd = process.cwd();
  const localEnvPath = path.join(cwd, '.env');
  const parentEnvPath = path.join(cwd, '../.env');
  if (fs.existsSync(localEnvPath)) {
    config({ path: localEnvPath });
    writeLog(`.env loaded from: ${localEnvPath}`);
  } else if (fs.existsSync(parentEnvPath)) {
    config({ path: parentEnvPath });
    writeLog(`.env loaded from: ${parentEnvPath}`);
  } else {
    writeLog(`.env not found, using default env`);
  }
} catch (e) {
  writeErr(`dotenv load error: ${e instanceof Error ? e.message : String(e)}`);
}

// 强制静默服务端内部控制台输出（被服务端读取的 stdout 仅保留 JSON）
process.env.MCP_SILENT = 'true';

// 处理未捕获异常，写入文件日志而不是输出到控制台
process.on('uncaughtException', (err) => {
  writeErr(`uncaughtException: ${err && err.stack ? err.stack : String(err)}`);
});
process.on('unhandledRejection', (reason) => {
  writeErr(`unhandledRejection: ${reason instanceof Error ? reason.stack : JSON.stringify(reason)}`);
});

// 启动 MCP 服务器主进程（ESM 构建文件）
try {
  const serverEntry = join(__dirname, 'build/index.js');

  // 使用管道，保持 JSON-RPC 通道
  const serverProcess = spawn('node', [serverEntry], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env
  });

  // 桥接：父进程stdin -> 子进程stdin
  process.stdin.pipe(serverProcess.stdin);

  // 桥接：子进程stdout -> 父进程stdout（JSON-RPC 仅走 stdout）
  // 仅转发有效 JSON-RPC 行到 stdout，其余写入运行日志，防止通道污染
  let stdoutBuf = '';
  serverProcess.stdout.on('data', (chunk) => {
    try {
      stdoutBuf += chunk.toString();
      const lines = stdoutBuf.split(/\r?\n/);
      stdoutBuf = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const obj = JSON.parse(trimmed);
          if (obj && obj.jsonrpc === '2.0') {
            process.stdout.write(trimmed + '\n');
          } else {
            writeLog(`filtered stdout (no jsonrpc): ${trimmed.slice(0, 200)}`);
          }
        } catch {
          writeLog(`filtered non-JSON stdout: ${trimmed.slice(0, 200)}`);
        }
      }
    } catch (e) {
      writeErr(`forward stdout error: ${e instanceof Error ? e.message : String(e)}`);
    }
  });

  // 桥接：子进程stderr -> 父进程stderr（不改写，避免在 stdout 混入）
  serverProcess.stderr.on('data', (chunk) => {
    try {
      process.stderr.write(chunk);
    } catch (e) {
      writeErr(`forward stderr error: ${e instanceof Error ? e.message : String(e)}`);
    }
  });

  // 退出处理
  serverProcess.on('exit', (code, signal) => {
    writeLog(`server process exited: code=${code ?? 'null'} signal=${signal ?? 'null'}`);
    // 将退出码原样传递
    process.exit(code === null ? 1 : code);
  });

  // 信号转发
  const forward = (sig) => {
    try {
      serverProcess.kill(sig);
    } catch (e) {
      writeErr(`signal forward error (${sig}): ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  process.on('SIGINT', () => forward('SIGINT'));
  process.on('SIGTERM', () => forward('SIGTERM'));

  writeLog(`run-server started. logDir=${logDir} entry=${serverEntry}`);
} catch (e) {
  writeErr(`spawn error: ${e instanceof Error ? e.stack : String(e)}`);
  process.exit(1);
}