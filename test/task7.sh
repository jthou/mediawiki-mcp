#!/bin/bash

echo "=== 任务7测试：upload_file 工具 ==="

# 1. 构建项目
echo "1. 构建项目..."
npm run build > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi
echo "✅ 构建成功"

# 2. 启动服务器
echo "2. 启动MCP服务器..."
node build/index.js -f ../test.env &
SERVER_PID=$!
sleep 2

# 检查服务器是否启动成功
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ 服务器启动失败"
    exit 1
fi
echo "✅ 服务器启动成功 (PID: $SERVER_PID)"

# 3. 创建测试文件
echo "3. 创建测试文件..."
mkdir -p test/fixtures
echo "This is a test file for upload testing" > test/fixtures/test.txt

# 4. 测试case1: fromFile 首次上传
echo "4. 测试case1: fromFile 首次上传..."
timeout 10s node -e "
const net = require('net');
const client = net.createConnection('/tmp/mcp-test.sock', () => {
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'upload_file',
      arguments: {
        wiki: 'Jthou',
        fromFile: 'test/fixtures/test.txt',
        comment: 'Test upload from file'
      }
    }
  };
  client.write(JSON.stringify(request));
});

client.on('data', (data) => {
  console.log(data.toString());
  client.end();
});

client.on('error', (err) => {
  console.error('Client error:', err);
  process.exit(1);
});

setTimeout(() => {
  console.error('Timeout');
  client.end();
  process.exit(1);
}, 5000);
" > response1.json 2>&1

if grep -q "File uploaded successfully" response1.json; then
    echo "✅ case1测试通过: fromFile 首次上传成功"
    grep -o '"File uploaded successfully: \[\[[^\]]*\]\]"' response1.json
elif grep -q "Timeout" response1.json; then
    echo "⚠️ case1测试超时"
else
    echo "❌ case1测试失败: fromFile 首次上传失败"
    cat response1.json
fi

# 5. 测试case2: 再次上传相同文件
echo "5. 测试case2: 再次上传相同文件..."
timeout 10s node -e "
const net = require('net');
const client = net.createConnection('/tmp/mcp-test.sock', () => {
  const request = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'upload_file',
      arguments: {
        wiki: 'Jthou',
        fromFile: 'test/fixtures/test.txt',
        comment: 'Test upload from file'
      }
    }
  };
  client.write(JSON.stringify(request));
});

client.on('data', (data) => {
  console.log(data.toString());
  client.end();
});

client.on('error', (err) => {
  console.error('Client error:', err);
  process.exit(1);
});

setTimeout(() => {
  console.error('Timeout');
  client.end();
  process.exit(1);
}, 5000);
" > response2.json 2>&1

if grep -q "File already exists with same content" response2.json; then
    echo "✅ case2测试通过: 再次上传相同文件正确返回已存在信息"
    grep -o '"File already exists with same content: \[\[[^\]]*\]\]"' response2.json
elif grep -q "Timeout" response2.json; then
    echo "⚠️ case2测试超时"
else
    echo "❌ case2测试失败: 再次上传相同文件未正确处理"
    cat response2.json
fi

# 6. 测试case3: 同名不同内容
echo "6. 测试case3: 同名不同内容..."
echo "This is a modified test file for upload testing" > test/fixtures/test_modified.txt
timeout 10s node -e "
const net = require('net');
const client = net.createConnection('/tmp/mcp-test.sock', () => {
  const request = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'upload_file',
      arguments: {
        wiki: 'Jthou',
        fromFile: 'test/fixtures/test_modified.txt',
        title: 'test.txt',
        comment: 'Test upload with different content'
      }
    }
  };
  client.write(JSON.stringify(request));
});

client.on('data', (data) => {
  console.log(data.toString());
  client.end();
});

client.on('error', (err) => {
  console.error('Client error:', err);
  process.exit(1);
});

setTimeout(() => {
  console.error('Timeout');
  client.end();
  process.exit(1);
}, 5000);
" > response3.json 2>&1

if grep -q "File uploaded successfully" response3.json; then
    echo "✅ case3测试通过: 同名不同内容自动改名并上传成功"
    grep -o '"File uploaded successfully: \[\[[^\]]*\]\]"' response3.json
elif grep -q "Timeout" response3.json; then
    echo "⚠️ case3测试超时"
else
    echo "❌ case3测试失败: 同名不同内容未正确处理"
    cat response3.json
fi

# 7. 清理
echo "7. 清理..."
kill $SERVER_PID 2>/dev/null
rm -f response*.json test/fixtures/test.txt test/fixtures/test_modified.txt

echo "=== 任务7测试完成 ==="