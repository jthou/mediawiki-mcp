const { spawn } = require('child_process');
const fs = require('fs');

// 构建项目
console.log('构建项目...');
const build = require('child_process').execSync('npm run build', { cwd: process.cwd() });
console.log('构建完成');

// 创建测试页面名称
const testPageName = `test_update_page_${Date.now()}`;

// 启动MCP服务器
const server = spawn('node', ['build/index.js', '-f', 'test.env'], {
  cwd: process.cwd()
});

let serverStarted = false;
let testCounter = 0;
const maxTests = 10;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`STDOUT: ${output}`);
  
  if (!serverStarted && output.includes('dotenv')) {
    serverStarted = true;
    console.log('服务器已启动，开始测试...');
    runTest();
  }
});

server.stderr.on('data', (data) => {
  console.error(`STDERR: ${data}`);
});

function runTest() {
  if (testCounter >= maxTests) {
    console.log('测试完成');
    server.kill();
    return;
  }
  
  testCounter++;
  console.log(`\n=== 测试 ${testCounter}/${maxTests} ===`);
  
  // 准备测试内容
  const testContent = `测试内容更新 ${testCounter} - ${new Date().toISOString()}`;
  
  // 构造update_page请求
  const updateRequest = {
    jsonrpc: "2.0",
    id: testCounter,
    method: "tools/call",
    params: {
      name: "update_page",
      arguments: {
        wiki: "Jthou",
        title: testPageName,
        content: testContent,
        summary: `自动测试更新 ${testCounter}`,
        mode: "replace"
      }
    }
  };
  
  // 发送请求
  server.stdin.write(JSON.stringify(updateRequest) + '\n');
  
  // 等待一段时间后再进行下一次测试
  setTimeout(runTest, 3000);
}

server.on('close', (code) => {
  console.log(`服务器进程退出，退出码: ${code}`);
});