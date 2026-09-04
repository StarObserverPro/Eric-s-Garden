# 野外丰容 P1 R1：农塘、水岸与功能布景

**状态：** 施工规范；尚未激活实现。  
**基线来源：** P0 规范与 `main@f0343a084ca0cc2673dd2b5c32399129a7d024d7` 审计结论。  
**前置：** [`WILDERNESS_ENRICHMENT_P0_R1.md`](WILDERNESS_ENRICHMENT_P0_R1.md) 已完成验收。  
**后续：** P1 验收后再考虑 [`WILDERNESS_ENRICHMENT_P2_R1.md`](WILDERNESS_ENRICHMENT_P2_R1.md)。

> 本文是阶段施工规范，不是 `docs/work/` 热包。用户明确激活 P1 后，基于 fresh `main` 创建独立 work packet；P1 不自动继承 P0 未完成项。

## 1. 目标

在不增加第二场景、不引入复杂水渲染栈的前提下，给围栏外增加一个**小型农塘 / 雨水生态角**，把天空、太阳、风、地表和草木通过同一处高识别度材质联系起来；同时补齐少量功能布景，使外围从“背景”变成可信的乡野地点。

P1 的核心不是做一块蓝色面，而是做好：

**地形凹陷 → 湿岸 → 水面 → 芦苇/草 → 周边使用痕迹。**

## 2. 必做内容

### P1-A — 小型农塘

- 位于围栏外约 `10–20 m` 的中景区域，使用现有 terrain carrier，不另建地图；
- 尺度以“农家小塘 / 雨水塘”而不是湖泊为准；
- 默认构图下水面建议只占画面约 `5–8%`，不能抢过中央菜园；
- 水塘位置必须与 P0 主道路、拖拉机工作角错开，形成次锚点而不是堆在同一侧。

### P1-B — 真实岸线关系

水塘至少同时包含：

1. 平缓地形凹陷；
2. 泥岸 / 湿润圈；
3. 浅水到深水的颜色变化；
4. 芦苇、草或少量岸石；
5. 与周围 terrain 连续的高度和法线关系。

禁止：

- 水面直接穿过原地形；
- 椭圆蓝片贴在草上；
- 岸线完全平滑、完全规则；
- 芦苇沿圆周等距排布。

### P1-C — 水面响应

水面必须读出当前场景已有的统一世界条件：

- sun direction / sunlight；
- sky / fog color；
- wind；
- rain / cloudiness。

最小可接受效果：

- 两组低频顶点波浪；
- 视角相关的天空色 / 深水色混合；
- 太阳方向上的受控高光；
- 风大时波纹略强，雨天整体更冷、更暗；
- fog 与远景一致。

水面保持**风格化不透明、正常写深度**为默认方案。

### P1-D — 芦苇与岸草

- 复用 P0 中远 vegetation 体系，不建立单独粒子系统；
- 根部读取同一个 terrain / pond shoreline authority；
- 密度应成团并留缺口；
- `reduced / minimum` 时优先减芦苇和次要岸草，不删除水塘主轮廓。

### P1-E — 功能小布景

在 P0 工作角和 P1 水塘周边按功能成组补齐少量对象，例如：

- 木箱；
- 水桶 / 雨水桶；
- 简单工具架；
- 堆肥堆；
- 草垛；
- 小木板、石头或岸边踏步。

规则：

- 每组物件必须解释一个地点用途；
- 禁止均匀撒满地图的“装饰随机数”；
- 小物件优先进入 P0 已存在的 static scenery / hardscape static geometry owner；
- 不为每个道具建立独立 draw。

## 3. 地形实现

### 3.1 单一高度权威

优先在 `terrainHeightAt()` 的远离中央菜畦区域加入一个受控 basin 项：

- 使用平滑径向或轻微非对称 mask；
- 中心下沉、岸边缓坡；
- 必须在围栏 / 菜畦影响范围外开始；
- 保持 terrain normal 由同一 analytic height 派生。

禁止另做一个只供水塘使用、与 terrain 不一致的 CPU 高度函数。

### 3.2 岸线材质

泥岸 / 湿润圈优先由 hardscape / terrain world-space material mask 生成：

- 深色湿土；
- 少量裸土；
- 靠外逐渐回到 meadow；
- 可有低频矿物 / 石色变化，但不增加高频噪声密度。

水塘本身不得复用菜畦 wetness gameplay 语义；这是 renderer-side scenery，不进入 save。

## 4. 水面渲染方案

建议使用一个小型规则网格，例如 `16×12` 到 `24×16` cells：

- 顶点阶段按 world position + time 做两组波；
- fragment 阶段根据 view direction、normal、sun direction、fog 和天气混色；
- 不采样屏幕颜色；
- 不采样独立 reflection target；
- 不需要透明 blend。

推荐新增一个明确的 `water` draw owner，仍放进现有 world pass；不要把水面硬塞进 terrain shader 造成深度和材质语义混乱。

## 5. 明确禁止的水渲染路线

P1 不做：

- 平面镜像二次重绘；
- SSR；
- scene-color refraction；
- 大面积 alpha transparency；
- caustics pass；
- compute water simulation；
- ripple render target / ping-pong；
- 独立 shadow map；
- 为水新增 post-process pass。

这些以后只有在孩子可感知收益和实测预算都成立时，才能另立实验。

## 6. P1 累计性能预算

P1 以 P0 达标后的主路径为基线。

累计目标：

- **pass：** 仍为 `3`；
- **draw：** 目标累计 `<=10`；
- **水面 draw：** `+1`；
- **水面 triangles：** 建议 `<1500`；
- **水面 textures：** `0` 为默认；
- **新增全屏资源：** `0`；
- **小布景额外 draw：** `0`，应复用 static scenery owner；
- **芦苇额外 draw：** `0`，应复用 vegetation owner。

如果 P0 因 owner 分离已经占到 10 draw，P1 在验收前应先合并/重组静态 owner 或证明 11 draw 仍有明确必要；不能把预算一路顺延成“每阶段 +1 无上限”。

P1 的主要风险不是 triangle count，而是低角度近看时的**像素覆盖和 fragment 成本**。水塘默认应位于中景；若相机可拉到非常近，必须检查最坏视角下水面是否覆盖过大屏幕区域。

## 7. 质量降级规则

- `core`：菜园交互与作物不受影响；
- `structure`：水塘 basin、主岸线、水面本体保留；
- `dressing`：芦苇、岸石、次要道具可降密度；
- `ephemeral`：P1 不要求。

水面本体不应该在 `reduced` 时消失；如果需要降级，优先降低岸草密度和次要材质细节，而不是把池塘突然变成干坑。

## 8. 验收标准

- **A1** — 水塘明显属于地形的一部分，岸线无悬浮、穿插或蓝片感。
- **A2** — 至少可读出浅水 / 深水、湿岸和芦苇三种边界关系。
- **A3** — 晴天、阴天和雨天至少三个状态下，水面随统一 sun / sky / fog / weather 改变，不像独立背景素材。
- **A4** — 风变化会影响水面与芦苇，但运动频率不与近草完全同步。
- **A5** — P1 小布景按地点功能成组，不形成均匀随机撒物。
- **A6** — 中央菜园仍是第一视觉中心；水塘是次锚点而不是第二主场景。
- **A7** — pass 保持 3，累计 draw 达成目标预算；基准设备无持续质量降档回归。
- **A8** — Canvas fallback 继续可玩；水塘不进入游戏状态、存档或交互规则。

## 9. 必须留证据

施工验收至少包含：

- desktop 默认构图 before / after；
- 水塘近、中、远三个相机距离；
- 低角度最坏像素覆盖视图；
- 晴 / 多云 / 雨三个天气状态；
- 两个相反 camera azimuth，确认岸线和凹地都成立；
- P0 后与 P1 后的 metrics 对比；
- Canvas fallback smoke；
- terrain basin 与 water owner 的代码路径说明。

## 10. Non-goals

P1 不做：

- 钓鱼、游泳、取水、青蛙点击等新 gameplay；
- 水量、蒸发、流体状态进入 save；
- 河流、瀑布、大湖；
- 高成本实时反射 / 折射；
- 为水塘扩建远景世界；
- P2 的鸟、风滚草、飞叶等动态丰容。

## 11. 停止条件

A1–A8 达成并完成性能 / 天气 / 低角度证据后，P1 停止。不要因为已经有水就顺手进入复杂波纹模拟或生态 NPC；P2 只负责低成本短暂生命迹象。
