const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 创建测试文件
fs.writeFileSync('test/fixtures/simple.txt', 'This is a simple test file for upload');

// 启动MCP服务器
const server = spawn('node', ['build/index.js', '-f', '../test.env'], {
  cwd: process.cwd()
});

let serverStarted = false;

server.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
  if (!serverStarted) {
    serverStarted = true;
    // 服务器启动后，进行测试
    testUploadFunction();
  }
});

server.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

server.on('close', (code) => {
  console.log(`服务器进程退出，退出码: ${code}`);
});

function testUploadFunction() {
  console.log('服务器已启动，开始测试upload_file工具...');
  
  // 这里可以添加实际的测试代码
  // 但由于MCP是通过stdin/stdout通信的，我们需要更复杂的设置
  
  // 暂停几秒后关闭服务器
  setTimeout(() => {
    server.kill();
    console.log('测试完成');
  }, 5000);
}