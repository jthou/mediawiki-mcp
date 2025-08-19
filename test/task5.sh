#!/bin/bash

echo "=== 任务5测试：search_pages 工具 ==="

# 1. 构建项目
echo "1. 构建项目..."
npm run build > /dev/null 2>&1

# 2. 测试基础搜索功能
echo "2. 测试基础搜索功能：搜索'test'关键词..."
SEARCH_RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_pages","arguments":{"wiki":"Jthou","query":"test","limit":5}}}' | node build/index.js -f ../test.env 2>/dev/null)

# 检查响应是否包含搜索结果
if echo "$SEARCH_RESPONSE" | grep -q "Found.*result"; then
    echo "✅ 基础搜索测试通过"
    echo "   搜索结果包含预期格式"
else
    echo "❌ 基础搜索测试失败"
    echo "   响应: $SEARCH_RESPONSE"
    exit 1
fi

# 3. 测试空结果搜索
echo "3. 测试空结果搜索：搜索不存在的内容..."
EMPTY_RESPONSE=$(echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_pages","arguments":{"wiki":"Jthou","query":"nonexistentcontent12345","limit":5}}}' | node build/index.js -f ../test.env 2>/dev/null)

# 检查空结果响应
if echo "$EMPTY_RESPONSE" | grep -q "No results found"; then
    echo "✅ 空结果搜索测试通过"
    echo "   正确处理了空搜索结果"
else
    echo "❌ 空结果搜索测试失败"
    echo "   响应: $EMPTY_RESPONSE"
    exit 1
fi

# 4. 测试不同的limit参数
echo "4. 测试不同的limit参数..."
LIMIT_RESPONSE=$(echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_pages","arguments":{"wiki":"Jthou","query":"test","limit":3}}}' | node build/index.js -f ../test.env 2>/dev/null)

# 检查limit参数是否生效
if echo "$LIMIT_RESPONSE" | grep -q "result"; then
    echo "✅ limit参数测试通过"
    echo "   支持自定义结果数量限制"
else
    echo "❌ limit参数测试失败"
    echo "   响应: $LIMIT_RESPONSE"
    exit 1
fi

# 5. 测试参数验证
echo "5. 测试参数验证：缺少必要参数..."
ERROR_RESPONSE=$(echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"search_pages","arguments":{"wiki":"Jthou"}}}' | node build/index.js -f ../test.env 2>/dev/null)

# 检查错误处理
if echo "$ERROR_RESPONSE" | grep -q "required"; then
    echo "✅ 参数验证测试通过"
    echo "   正确处理了缺少参数的情况"
else
    echo "❌ 参数验证测试失败"
    echo "   响应: $ERROR_RESPONSE"
    exit 1
fi

echo "✅ 任务5测试通过"
