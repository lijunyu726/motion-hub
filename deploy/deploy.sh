#!/usr/bin/env bash
# 把实验台同步到云服务器（ssh 别名 tc），网址 https://motion.lijunyu.com.cn
# 只传网页需要的文件：index.html、favicon.svg、robots.txt、LICENSE、src/，以及 Skill 的下载包 skill/motion-hub.zip 和在线目录 skill/motion-hub/（装了 Skill 的 Agent 从这里取最新的 index.json 和效果文件）；仓库文档、工具、草稿、node_modules 都不传。
# 用法：bash deploy/deploy.sh   （改了 src/ 先跑 npm run sources，否则“复制 Prompt + 代码”拿到旧代码）
# 注意：本机代理开着全局 / TUN 时 SSH 可能被掐断，先把 43.142.137.86 设为直连。
set -euo pipefail
cd "$(dirname "$0")/.."
node -e "import('./tools/build-sources.mjs').then(m => { const fs = require('fs'); if (fs.readFileSync('src/sources.js', 'utf8') !== m.render()) { console.error('src/sources.js 已过期，先运行 npm run sources'); process.exit(1); } })"
# Skill：重新生成 skill/motion-hub/，有变化就提醒先提交；再打成 zip 放到网站上供下载（zip 不进仓库）
npm run -s skill
git diff --quiet -- skill/ && [ -z "$(git ls-files --others --exclude-standard skill/)" ] || echo "⚠ skill/ 有变化，记得提交"
rm -f skill/motion-hub.zip && (cd skill && zip -qr motion-hub.zip motion-hub)
DEST=/www/wwwroot/motion.lijunyu.com.cn
rsync -az --delete --include='/index.html' --include='/favicon.svg' --include='/robots.txt' --include='/LICENSE' --include='/src/***' --include='/skill/' --include='/skill/motion-hub.zip' --include='/skill/motion-hub/***' --exclude='*' ./ tc:$DEST/
ssh tc "chown -R www:www $DEST && find $DEST -type d -exec chmod 755 {} + && find $DEST -type f -exec chmod 644 {} +"
echo "已同步。检查：$(curl -s -o /dev/null -w '%{http_code}' https://motion.lijunyu.com.cn/)（200 为正常）"
