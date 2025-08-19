#!/bin/bash

# 任务4测试：update_page 工具功能验证

echo "=== 任务4测试：update_page 工具 ==="

# 构建项目
echo "1. 构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

# 清理之前的测试文件
rm -f .jthou_wiki/test2.txt

TEST_PAGE="test2"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
ORIGINAL_CONTENT="任务4测试页面内容\\n\\n== 测试章节 ==\\n测试时间: $TIMESTAMP"
UPDATED_CONTENT="任务4更新后的页面内容\\n\\n== 更新后的章节 ==\\n更新时间: $TIMESTAMP\\n\\n这是通过 update_page 工具更新的内容"

echo "2. 用 get_page 获取 $TEST_PAGE 页面..."
GET_RESPONSE1=$(echo "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_page\",\"arguments\":{\"wiki\":\"Jthou\",\"title\":\"$TEST_PAGE\"}}}" | node build/index.js -f ../test.env 2>/dev/null)

if echo "$GET_RESPONSE1" | grep -q "Successfully retrieved"; then
    echo "✅ 成功获取页面"
else
    echo "❌ 获取页面失败: $GET_RESPONSE1"
    exit 1
fi

echo "3. 使用 update_page 工具更新 $TEST_PAGE 页面..."
UPDATE_RESPONSE=$(echo "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"update_page\",\"arguments\":{\"wiki\":\"Jthou\",\"title\":\"$TEST_PAGE\",\"content\":\"$UPDATED_CONTENT\",\"summary\":\"任务4测试：通过 update_page 工具更新\",\"mode\":\"replace\",\"minor\":false}}}" | node build/index.js -f ../test.env 2>/dev/null)

if echo "$UPDATE_RESPONSE" | grep -q "Successfully updated"; then
    echo "✅ 成功更新页面"
    
    # 提取修订版本号
    REVISION=$(echo "$UPDATE_RESPONSE" | grep -o 'Revision ID: [0-9]*' | grep -o '[0-9]*')
    if [ -n "$REVISION" ]; then
        echo "   新修订版本: $REVISION"
    fi
else
    echo "❌ 更新页面失败: $UPDATE_RESPONSE"
    exit 1
fi

echo "4. 再次用 get_page 获取 $TEST_PAGE 页面，验证内容已更新..."
GET_RESPONSE2=$(echo "{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"get_page\",\"arguments\":{\"wiki\":\"Jthou\",\"title\":\"$TEST_PAGE\"}}}" | node build/index.js -f ../test.env 2>/dev/null)

if echo "$GET_RESPONSE2" | grep -q "Successfully retrieved"; then
    echo "✅ 成功获取更新后的页面"
    
    # 检查本地文件内容是否包含更新的内容
    if [ -f ".jthou_wiki/$TEST_PAGE.txt" ]; then
        if grep -q "更新时间: $TIMESTAMP" ".jthou_wiki/$TEST_PAGE.txt"; then
            echo "✅ 页面内容已正确更新"
            echo "✅ 任务4测试通过"
            exit 0
        else
            echo "❌ 页面内容未正确更新"
            echo "   文件内容:"
            cat ".jthou_wiki/$TEST_PAGE.txt"
            exit 1
        fi
    else
        echo "❌ 页面文件未创建"
        exit 1
    fi
else
    echo "❌ 获取更新后页面失败: $GET_RESPONSE2"
    exit 1
fi
