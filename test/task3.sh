#!/bin/bash

# 任务3测试：get_page 工具功能验证

echo "=== 任务3测试：get_page 工具 ==="

# 构建项目
echo "1. 构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

# 清理之前的测试文件
rm -f .jthou_wiki/test.txt

# 测试 get_page 工具
echo "2. 测试 get_page 工具..."
RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_page","arguments":{"wiki":"Jthou","title":"test"}}}' | node build/index.js -f ../test.env 2>/dev/null)

# 检查响应是否成功
if echo "$RESPONSE" | grep -q "Successfully retrieved"; then
    echo "✅ get_page 工具调用成功"
    
    # 检查文件是否创建
    if [ -f ".jthou_wiki/test.txt" ]; then
        echo "✅ 页面内容文件已创建"
        echo "✅ 任务3测试通过"
        exit 0
    else
        echo "❌ 页面内容文件未创建"
        exit 1
    fi
else
    echo "❌ get_page 工具测试失败"
    echo "   响应: $RESPONSE"
    exit 1
fi
