# 数织解谜 (Nonogram)

在线地址：<https://amiya0426.github.io/nonogram-game/>

## 项目结构

```
src/
  main.jsx                 # 入口
  App.jsx                  # 组合层：布局 + 组件装配（不再承载业务逻辑）
  App.css                  # 自定义样式（CSS 叉子等）
  constants.js             # 主题、预设题目、棋盘上限、推演等级等常量
  hooks/
    useGameState.js        # 全部状态与业务逻辑（单一数据源）
  logic/                   # 纯函数逻辑（无 React 依赖，可独立测试）
    clues.js               # 线索解析 / 完成判定 / 自动高亮 / 插入位置
    board.js               # 棋盘数据工具（稀疏不可变更新）
    solver.js              # 数织求解器（单行推导 + 整盘迭代）
    importer.js            # 外部网页源码解析
    exporter.js            # 存档代码 / JSON / 图片导出
    storage.js             # localStorage 封装
    theme.js               # 推演模式样式辅助
  components/
    Board.jsx              # 棋盘（事件委托 + memo 化子组件）
    GridCell.jsx           # 单个格子（memo）
    RowClueBar.jsx         # 行线索条（memo）
    ColClueBar.jsx         # 列线索条（memo）
    MeasureTooltip.jsx     # 测量 / 悬浮线索提示
    SidePanel.jsx          # 左侧控制面板
    Accordion.jsx          # 折叠面板
```

## 模式说明

- **游玩模式（默认）**：主界面，用于解谜与推演。
- **自定义题目**：从游玩模式进入的独立编辑视图。默认"画盘面"：直接在棋盘上点击/拖拽
  画出图案，两侧线索实时自动生成，完成后棋盘清空供从头解谜；也可切换到"手动输入"
  直接填写行列线索。"取消"可还原进入编辑前的盘面。
- **账号与收藏**：未登录时收藏保存在浏览器本地；登录后自动把本地收藏合并到云端
  （按 名称+尺寸 去重），之后收藏随账号跨设备保存。

## 开发命令

```bash
npm run dev      # 本地开发（/api 自动代理到 localhost:3000）
npm run build    # 生产构建
npm run lint     # ESLint 检查
```

## 服务器部署（阿里云 ECS）

后端位于 `server/`（Express + Node 内置 SQLite，零原生依赖），前端构建产物由 Nginx 托管，
`/api` 反向代理到 Node 服务：

```bash
# 本地构建
npm run build

# 上传 dist 与 server 到服务器的 /opt/nonogram/ 后，在服务器上执行：
cd /opt/nonogram/server
npm install --omit=dev
pm2 start index.js --name nonogram-api
pm2 save && pm2 startup

# Nginx 配置（见 deploy/nginx.conf）
cp deploy/nginx.conf /etc/nginx/conf.d/nonogram.conf
nginx -t && systemctl reload nginx
```

注意事项：

- 数据库文件为 `server/data/app.db`，请用 cron 定时备份。
- 登录会话使用 httpOnly Cookie；配置 HTTPS 后设置环境变量 `SECURE_COOKIE=1`。
- 若仍要发布 GitHub Pages 子路径，构建时设置 `BASE_PATH=/nonogram-game/`。
- 大陆服务器对外提供 Web 服务需完成 ICP 备案，并建议配置 HTTPS。
