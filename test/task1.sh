#!/bin/bash

# 任务1测试：list_wikis 工具功能验证

echo "=== 任务1测试：list_wikis 工具 ==="

# 构建项目
echo "1. 构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

# 测试 list_wikis 工具
echo "2. 测试 list_wikis 工具..."
RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_wikis","arguments":{}}}' | node build/index.js -f ../test.env 2>/dev/null)

# 检查响应是否包含 Jthou wiki
if echo "$RESPONSE" | grep -q "Jthou"; then
    echo "✅ list_wikis 工具测试通过"
    echo "   响应包含: Jthou wiki"
    exit 0
else
    echo "❌ list_wikis 工具测试失败"
    echo "   响应: $RESPONSE"
    exit 1
fi
