const { spawn } = require('child_process');

// 启动MCP服务器
const server = spawn('node', ['build/index.js', '-f', '../test.env'], {
  cwd: process.cwd()
});

let serverStarted = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`STDOUT: ${output}`);
  
  if (!serverStarted && output.includes('dotenv')) {
    serverStarted = true;
    // 请求工具列表
    const listToolsRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list"
    };
    
    server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
    
    // 2秒后关闭服务器
    setTimeout(() => {
      server.kill();
    }, 2000);
  }
});

server.stderr.on('data', (data) => {
  console.error(`STDERR: ${data}`);
});

server.on('close', (code) => {
  console.log(`服务器进程退出，退出码: ${code}`);
});