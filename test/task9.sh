#!/bin/bash
# task9.sh - update_page 连续推送稳定性测试
set -e

WIKI="jthou"
PAGE="连续推送测试"
CONTENT_PREFIX="自动化测试内容"
ENV_FILE="../test.env"

function update_and_get() {
  local idx=$1
  local content="${CONTENT_PREFIX} 第${idx}次 $(date '+%Y-%m-%d %H:%M:%S')"
  echo "\n--- 第${idx}次 update_page ---"
  node build/index.js -f "$ENV_FILE" --tool update_page --input "{\"wiki\":\"$WIKI\",\"title\":\"$PAGE\",\"content\":\"$content\"}"
  echo "--- get_page ---"
  node build/index.js -f "$ENV_FILE" --tool get_page --input "{\"wiki\":\"$WIKI\",\"title\":\"$PAGE\"}"
}

for i in {1..5}
do
  update_and_get $i
done

echo "\n全部 update_page 测试完成。请检查输出内容是否每次都成功推送。"
