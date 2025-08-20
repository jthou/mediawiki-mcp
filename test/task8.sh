#!/bin/bash

echo "=== 任务8测试：upload_from_clipboard 工具 ==="

# 1. 构建项目
echo "1. 构建项目..."
npm run build > /dev/null 2>&1

# 2. 测试剪贴板文本上传
echo "2. 测试剪贴板文本上传..."
# 准备测试文本数据（Base64编码）
TEXT_DATA=$(echo "This is a test text from clipboard" | base64)
RESPONSE=$(echo "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"upload_from_clipboard\",\"arguments\":{\"wiki\":\"Jthou\",\"clipboardType\":\"text\",\"clipboardData\":\"$TEXT_DATA\",\"title\":\"File:ClipboardTextTest.txt\",\"comment\":\"Test upload from clipboard text\"}}}" | node build/index.js -f test.env 2>/dev/null)
echo "响应: $RESPONSE"

if echo "$RESPONSE" | grep -q "Successfully uploaded from clipboard"; then
    echo "✅ 剪贴板文本上传测试通过"
elif echo "$RESPONSE" | grep -q "Permission denied"; then
    echo "⚠️ 剪贴板文本上传权限不足（预期情况）"
else
    echo "❌ 剪贴板文本上传测试失败"
fi

# 3. 测试剪贴板图片上传
echo "3. 测试剪贴板图片上传..."
# 准备测试图片数据（Base64编码）
IMAGE_DATA=$(base64 -i test/fixtures/small.png)
RESPONSE=$(echo "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"upload_from_clipboard\",\"arguments\":{\"wiki\":\"Jthou\",\"clipboardType\":\"image\",\"clipboardData\":\"$IMAGE_DATA\",\"title\":\"File:ClipboardImageTest.png\",\"comment\":\"Test upload from clipboard image\"}}}" | node build/index.js -f test.env 2>/dev/null)
echo "响应: $RESPONSE"

if echo "$RESPONSE" | grep -q "Successfully uploaded from clipboard"; then
    echo "✅ 剪贴板图片上传测试通过"
elif echo "$RESPONSE" | grep -q "Permission denied"; then
    echo "⚠️ 剪贴板图片上传权限不足（预期情况）"
else
    echo "❌ 剪贴板图片上传测试失败"
fi

# 4. 测试剪贴板文件上传
echo "4. 测试剪贴板文件上传..."
# 准备测试文件数据（Base64编码）
FILE_DATA=$(base64 -i test/fixtures/simple.txt)
RESPONSE=$(echo "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"upload_from_clipboard\",\"arguments\":{\"wiki\":\"Jthou\",\"clipboardType\":\"file\",\"clipboardData\":\"$FILE_DATA\",\"title\":\"File:ClipboardFileTest.txt\",\"comment\":\"Test upload from clipboard file\"}}}" | node build/index.js -f test.env 2>/dev/null)
echo "响应: $RESPONSE"

if echo "$RESPONSE" | grep -q "Successfully uploaded from clipboard"; then
    echo "✅ 剪贴板文件上传测试通过"
elif echo "$RESPONSE" | grep -q "Permission denied"; then
    echo "⚠️ 剪贴板文件上传权限不足（预期情况）"
else
    echo "❌ 剪贴板文件上传测试失败"
fi

# 5. 测试参数验证：缺少必要参数
echo "5. 测试参数验证：缺少必要参数..."
RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"upload_from_clipboard","arguments":{"wiki":"Jthou"}}}' | node build/index.js -f test.env 2>/dev/null)
echo "响应: $RESPONSE"

if echo "$RESPONSE" | grep -q "Parameter 'clipboardType' is required"; then
    echo "✅ 参数验证测试通过"
else
    echo "❌ 参数验证测试失败"
fi

# 6. 测试非法clipboardType
echo "6. 测试非法clipboardType..."
RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"upload_from_clipboard","arguments":{"wiki":"Jthou","clipboardType":"invalid","clipboardData":"test"}}}' | node build/index.js -f test.env 2>/dev/null)
echo "响应: $RESPONSE"

if echo "$RESPONSE" | grep -q "clipboardType must be one of: image, file, text"; then
    echo "✅ 非法clipboardType测试通过"
else
    echo "❌ 非法clipboardType测试失败"
fi

echo "✅ 任务8测试完成"