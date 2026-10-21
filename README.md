# dsh-project-cockpit

DSH 项目驾驶舱总控插件：把四个独立引擎——GapForm 选题、AI 成本分析、ShipSignal 信号评分、CodeConstellation 图谱——整合为统一 webServer 路由 + 右下角浮动面板。

## 定位

四个引擎原本只是并排摆着的独立能力。本插件把它们串成一条真实的工作流：**一个机会 → 一张决策卡 + 一张图谱**。

~~~
机会(opportunity)
  │
  ├─ ① scoreMatch      六维评分 + verdict（capability < 0.5 一票否决）
  │     └─ verdict=kill ──► 提前终止
  ▼
 ② assessSignal     机会来源可信度
  ▼
 ③ analyze          按能力缺口折算投入规模，算回本周期
  ▼
 ④ buildProjectGraph 决策卡挂成图谱节点，与目标项目连边
  │
  ▼
decisionCard：值不值得做 + 要花多少钱 + 信不信得过
~~~

## 安装

作为 workspace 内插件使用：

~~~bash
pnpm install
pnpm build      # 生成 lib/client.js
~~~

在 DSH 的插件配置中挂载本包，`cordis.patch.yml` 已声明 `insert` 条目，无需手动注册。

## 使用

点右下角 🛰️ 图标打开面板，五个页签：

| 页签 | 功能 |
|---|---|
| 🧭 编排 | 一次输入 → 四引擎串联，输出决策卡 + 图谱 |
| 🎯 选题 | 机会/能力结构化表单 → 六维评分条 + 判定徽章 + 差距清单 |
| 💰 成本 | 模型/场景/职业下拉 → 指标卡片 + 回本建议 |
| 📡 信号 | 可验证性/付费/时间序列 → 置信徽章 + 理由清单 |
| 🌌 图谱 | 扫描 + 项目/关系编辑 → Canvas 2D 力导向星座图 |

## 路由

所有路由前缀 `/__dsh/project-cockpit`，均要求请求头 `X-DSH-Request: project-cockpit`。

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/meta` | 模型、职业、场景清单 |
| POST | `/match` | 六维匹配评分 |
| POST | `/cost` | 本地部署 vs API 回本分析 |
| POST | `/signal` | 信号真实性评分 |
| POST | `/scan` | 目录扫描 |
| POST | `/graph` | 项目图谱构建 |
| POST | `/validate` | 能力提取结果校验 |
| POST | `/prompt` | 能力提取 prompt 构建 |
| POST | `/pipeline` | 四引擎串联 |
| POST | `/pipeline-stages` | 编排阶段自述 |

## 开发

~~~bash
pnpm install
pnpm test          # 37 项测试（引擎判据 + 编排判据 + 生命周期）
pnpm build         # 产物 lib/client.js
pnpm run doctor    # 自检：patch name / exports / host 入口
pnpm typecheck     # tsc --noEmit
~~~

**注意**：`lib/` 纳入版本控制，改了 `src/client/` 后必须先 `pnpm build` 再提交，否则 GitHub 上的 client 是旧的。

### 目录结构

~~~
src/
  engines/        四个引擎（纯函数，零 UI 依赖）
  pipeline.mjs    编排层：四引擎串联 + 决策卡合成
  host/           webServer 路由（一文件一路由）
  client/         React 面板（components / hooks / tabs）
tests/
  engines/        引擎行为契约
  pipeline.test.mjs  编排判据
  client/         生命周期（ctx.effect 注册/清理）
~~~

### 设计约束

- 引擎层是纯函数，输入相同必得相同输出（时间维度可注入 `now`）。
- 业务判据集中在 `src/engines/constants.mjs`，由测试守护。
- 所有资源（DOM 节点、React root、icon 注册、settings slot）通过 `ctx.effect` 注册 disposer，HMR / dispose 自动清理。
- client 侧状态收敛在 `CockpitStore`，跨页签共享同一份机会/能力数据。

## License

MIT © Boris-boomer
