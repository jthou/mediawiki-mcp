#!/bin/bash

echo "=== 任务7测试：upload_file 工具 ==="

# 1. 构建项目
echo "1. 构建项目..."
npm run build > /dev/null 2>&1

# 2. 测试 fromFile 首次上传
echo "2. 测试 fromFile 首次上传..."
RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"upload_file","arguments":{"wiki":"Jthou","fromFile":"test/fixtures/simple.txt","title":"File:SimpleTest.txt","comment":"Test upload from file"}}}' | node build/index.js -f test.env 2>/dev/null)
echo "响应: $RESPONSE"

if echo "$RESPONSE" | grep -q "Successfully uploaded file"; then
    echo "✅ fromFile 首次上传测试通过"
elif echo "$RESPONSE" | grep -q "Permission denied"; then
    echo "⚠️ fromFile 首次上传权限不足（预期情况）"
else
    echo "❌ fromFile 首次上传测试失败"
fi

# 3. 测试 fromUrl 上传（使用有效的测试URL）
echo "3. 测试 fromUrl 上传..."
RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"upload_file","arguments":{"wiki":"Jthou","fromUrl":"https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png","title":"File:TestImage.png","comment":"Test upload from URL"}}}' | node build/index.js -f test.env 2>/dev/null)
echo "响应: $RESPONSE"

if echo "$RESPONSE" | grep -q "Successfully uploaded file"; then
    echo "✅ fromUrl 上传测试通过"
elif echo "$RESPONSE" | grep -q "Permission denied"; then
    echo "⚠️ fromUrl 上传权限不足（预期情况）"
elif echo "$RESPONSE" | grep -q "network socket disconnected"; then
    echo "⚠️ fromUrl 上传网络连接问题（预期情况）"
else
    echo "❌ fromUrl 上传测试失败"
fi

# 4. 测试参数验证：缺少必要参数
echo "4. 测试参数验证：缺少必要参数..."
RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"upload_file","arguments":{"wiki":"Jthou"}}}' | node build/index.js -f test.env 2>/dev/null)
echo "响应: $RESPONSE"

if echo "$RESPONSE" | grep -q "Either 'fromFile' or 'fromUrl' parameter is required"; then
    echo "✅ 参数验证测试通过"
else
    echo "❌ 参数验证测试失败"
fi

# 5. 测试非法文件路径
echo "5. 测试非法文件路径..."
RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"upload_file","arguments":{"wiki":"Jthou","fromFile":"nonexistent.txt","title":"File:NonExistent.txt"}}}' | node build/index.js -f test.env 2>/dev/null)
echo "响应: $RESPONSE"

if echo "$RESPONSE" | grep -q "File not found"; then
    echo "✅ 非法文件路径测试通过"
else
    echo "❌ 非法文件路径测试失败"
fi

# 6. 测试文件大小限制
echo "6. 测试文件大小限制..."
# 创建一个大文件进行测试
dd if=/dev/zero of=test/fixtures/large.txt bs=1M count=15 2>/dev/null
RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"upload_file","arguments":{"wiki":"Jthou","fromFile":"test/fixtures/large.txt","title":"File:LargeTest.txt"}}}' | node build/index.js -f test.env 2>/dev/null)
rm -f test/fixtures/large.txt
echo "响应: $RESPONSE"

if echo "$RESPONSE" | grep -q "File too large"; then
    echo "✅ 文件大小限制测试通过"
else
    echo "❌ 文件大小限制测试失败"
fi

echo "✅ 任务7测试完成"