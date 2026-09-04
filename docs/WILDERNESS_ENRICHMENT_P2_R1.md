# 野外丰容 P2 R1：短暂动态物与环境生命迹象

**状态：** 施工规范；尚未激活实现。  
**前置：** [`WILDERNESS_ENRICHMENT_P0_R1.md`](WILDERNESS_ENRICHMENT_P0_R1.md) 与 [`WILDERNESS_ENRICHMENT_P1_R1.md`](WILDERNESS_ENRICHMENT_P1_R1.md) 已完成验收。  
**定位：** P2 只增加低成本、低频、可关闭的环境动态，不再承担空间骨架和材质修复任务。

> 本文是阶段施工规范，不是 `docs/work/` 热包。用户明确激活 P2 后，现场基于 fresh `main` 创建独立 work packet，并重新核对 P0/P1 已落地后的真实性能基线。

## 1. 目标

在 P0 已建立空间结构、P1 已建立材质与生态次锚点之后，用极少量动态物让野外偶尔出现“有东西经过”的感觉。

P2 的视觉原则是：

**稀少、短暂、可解释、不会抢菜园。**

动态物应该让玩家偶尔注意到，而不是持续占据视线或把场景变成粒子演示。

## 2. 建议内容

### P2-A — 风滚草 / 干草团

风滚草不是常驻主景，而是条件性环境事件。

推荐出现条件：

- 偏干、非雨天；
- 风速达到较明显水平；
- 一次只出现 `1–3` 个；
- 低频从中远景横穿，不反复在菜园中央滚动。

实现规则：

- 使用约 `150–400` triangles 的枝条 / 干草球 low-poly mesh；
- 路径使用预设或参数化曲线，不使用刚体物理；
- `Y` 位置读取 `terrainHeightAt()` 或同一场景高度权威；
- 旋转角由移动距离积分得到，允许少量弹跳；
- 遇到围栏、拖拉机等不要求真实碰撞，可通过路径设计避免穿模。

如果常绿基线下风滚草显得气候不协调，可以只保留为干燥 / 收获后视觉状态，不能为了“已经做了”而常驻。

### P2-B — 飞叶、草籽或絮状物

作为比风滚草更自然的日常风迹象：

- 同屏建议约 `4–12` 个可见元素；
- 主要分布在中景与侧边，不贴着 HUD 或作物标签飞；
- 运动由统一风方向 + 少量涡流 / 上升下降构成；
- 不建立数百粒子的透明 particle cloud。

优先使用小型不透明 mesh 或 alpha 成本可控的极少量元素；如果使用透明材质，必须检查移动端 fill-rate 与排序问题。

### P2-C — 远处鸟影

- 同屏约 `2–4` 只；
- 只承担 skyline / far-field movement；
- 使用极简不透明 mesh / silhouette；
- 不做骨骼系统、AI flocking、巢穴或导航；
- 不飞进中央菜畦遮挡交互。

鸟不需要常驻。短暂横穿远景比持续盘旋更有效，也更便宜。

## 3. 单一 ephemeral owner

P2 默认只允许建立**一个共享 ephemeral draw owner**。

建议一个 instanced dynamic geometry / shader 通过 instance data 区分：

- tumbleweed；
- leaf / seed；
- bird silhouette。

共享：

- `viewProjection`；
- sun / fog；
- weather / wind；
- time；
- quality level。

每帧只更新少量 instance 参数或让 shader 直接由时间推导位置。禁止为每个飞叶、每只鸟或每个风滚草建立 draw call。

如果不同几何无法在一个 owner 内保持代码清楚，允许保留一个主要 ephemeral draw + 一个极小补充 draw，但 P2 验收仍以总预算为准；不能按对象类别无限拆 owner。

## 4. 动态方式

### 4.1 不做真实物理

P2 的运动都是视觉状态，不进入 gameplay truth。

允许：

- 曲线运动；
- 基于 world time 的周期；
- terrain height sampling；
- 风向 / 风速驱动；
- 少量 deterministic hash variation。

禁止：

- 刚体 solver；
- CPU 碰撞世界；
- 群体 AI；
- GPU compute particle simulation；
- 将 transient object 写入 save。

### 4.2 频率必须稀疏

不能“为了证明有功能”让动态物一直出现。

建议：

- 正常风：大部分时间只有偶发叶片 / 远鸟；
- 强风：可提高飞叶频率；
- 干燥强风：允许偶发风滚草；
- 雨天：关闭风滚草，大幅减少飞叶，保留极少远鸟或全部关闭。

出现时长和间隔应通过 fixed seed 可复现，便于 browser evidence。

## 5. P2 累计性能预算

P2 是整个三阶段丰容中最先被降级的部分。

累计目标：

- **pass：** 仍为 `3`；
- **draw：** 目标累计 `<=11`；
- **ephemeral draw：** 目标 `+1`；
- **同时活动实例：** 建议 `<24`；
- **新增 triangles：** 通常 `<5k`；
- **新增 render target：** `0`；
- **新增 full-screen pass：** `0`；
- **compute：** `0`；
- **透明高覆盖粒子：** `0` 为目标。

如果 P0/P1 已经让累计 draw 达到 11，则 P2 在进入主路径前必须先证明：

1. 可以通过复用 / 合并 owner 把预算腾出来；或
2. 第 12 draw 的实测代价极低且所有权明显更清楚。

默认不能直接把上限从 11 推到 12。

## 6. governor / 质量降级

P2 应直接使用现有 `qualityLevel`，不建立第二套性能控制器。

建议规则：

- `full`：允许全部 P2 内容；
- `reduced`：关闭风滚草，减少飞叶 / 鸟数量；
- `minimum`：关闭全部 ephemeral 内容。

也就是说 P2 是 governor 压力下**第一批主动消失**的视觉内容。

如果实现时需要一个 `ephemeralEnabled` 或密度参数，可从现有 `RuntimeQualityProfile` 派生；不要另建独立帧采样器。

## 7. 视觉纪律

### 必须做到

- 动态物不遮挡中央菜畦、作物状态、HUD 或点击区域；
- 运动方向与当前风场大体一致，但可以有局部涡流；
- 远鸟速度、飞叶速度、风滚草速度有明显尺度区别；
- 不同对象不要使用同一正弦频率一起摆动；
- 动态物进入 fog，远处不会像贴在屏幕上的 UI 图标。

### 禁止

- 所有动态物一直循环同一路径；
- 每次进入场景都在同一秒出现；
- 同时十几个风滚草；
- 大量半透明 billboard 充满屏幕；
- 让鸟、叶子或草团成为新 gameplay；
- 用 P2 掩盖 P0/P1 尚未解决的空地、岸线或尺度问题。

## 8. 验收标准

- **A1** — 正常天气下场景大部分时间保持安静，动态物是偶发而非持续噪声。
- **A2** — 强风时可观察到更明显环境运动，但不影响中央菜园可读性。
- **A3** — 干燥强风状态允许低频风滚草；雨天风滚草关闭。
- **A4** — 飞叶 / 草籽和远鸟具有不同轨迹、速度和空间层次。
- **A5** — 所有 P2 动态物进入统一 sun / fog / weather 世界，不像 DOM overlay 或屏幕贴纸。
- **A6** — `reduced` 时显著削减 P2，`minimum` 时全部关闭；core / structure 不受影响。
- **A7** — pass 仍为 3，累计 draw 满足预算，固定基准下不产生持续质量降档回归。
- **A8** — Canvas fallback 继续可玩；P2 不改变 save、关卡、作物或工具语义。

## 9. 必须留证据

施工验收至少包含：

- 正常风固定 20–30 秒观察窗口；
- 强风固定窗口；
- 干燥强风风滚草出现证据；
- 雨天风滚草关闭证据；
- `full / reduced / minimum` 三档对照；
- desktop 与 portrait mobile 各一组低角度证据；
- P1 后与 P2 后 metrics 对比；
- Canvas fallback smoke；
- ephemeral owner 与 quality profile 的代码路径说明。

## 10. Non-goals

P2 不做：

- 蝴蝶 / 蜜蜂完整生态系统；
- flocking AI；
- 刚体、碰撞、导航；
- 大规模 GPU 粒子；
- interactable bird / tumbleweed；
- 新奖励、图鉴、资源或任务；
- 高成本 motion blur / post-process；
- 用动态内容继续扩大野外面积。

## 11. 停止条件

A1–A8 满足且动态频率、质量降级和预算证据完整后，P2 停止。

三阶段全部结束时，野外应形成以下完整关系：

**P0：空间骨架与尺度 → P1：材质 / 水岸次锚点 → P2：偶发生命迹象。**

到此不自动进入更多生态系统。昆虫、复杂水模拟、工具棚扩展或正式外部资产都需要重新判断视觉收益与预算，再单独激活。
