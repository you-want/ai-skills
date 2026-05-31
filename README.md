# AI Skills Engine

一个 **可扩展的 AI 技能引擎**，让你轻松管理、安装和运行 AI 技能，统一团队规范。

## 🤔 什么是 AI Skills Engine？

想象一下，你可以把各种代码检查、规范审查、自动化任务都封装成一个「技能」，然后：

- 用一行命令安装技能
- 一键运行技能检查项目
- 技能可以是简单的 markdown 文档，也可以是强大的可执行程序
- 团队成员共享同一套技能，保证代码质量一致

这就是 **AI Skills Engine**！

## ✨ 核心特性

| 特性 | 说明 |
|------|------|
| 📦 **技能管理** | 安装、移除、更新、列出所有技能 |
| 🌍 **技能远程化** | 从 GitHub/Git 仓库安装，也可以本地安装 |
| � **多目录加载** | 自动加载项目本地、全局、内置技能 |
| 📝 **两种技能类型** | 支持文档型技能（SKILL.md）和可执行技能（TypeScript） |
| ⚙️ **Install 钩子** | 自动执行 npm install、build 等命令 |
| 🎯 **即装即用** | 安装后立即可用，无需配置 |
| 📊 **结构化报告** | 运行技能后生成详细的检查报告 |

## � 5 分钟快速上手

### 1. 构建项目

```bash
# 克隆项目
git clone https://github.com/your-username/ai-skills.git
cd ai-skills

# 安装依赖
pnpm install

# 构建项目
pnpm build
```

### 2. 查看已安装的技能

```bash
pnpm run cli list
```

你会看到类似这样的输出：

```
已安装的技能:

  ✅ vue-code-review [本地]
     描述: Vue 3 前端代码审查与生成规范...
     路径: ~/you-want/ai-skills/.ai-skills/skills/vue-code-review
     安装时间: 2026/5/31 19:00:00
```

### 3. 安装新技能

从本地路径安装：

```bash
pnpm run cli add /path/to/your/skill --local
```

或者使用我们提供的模板：

```bash
pnpm run cli add /Users/rain9/you-want/ai-skills/templates/skill-template --local
```

安装成功后，会自动执行 install 钩子（npm install、npm run build）。

### 4. 运行技能

```bash
pnpm run cli run vue-code-review --project /path/to/your/project
```

你会看到详细的检查报告：

```
vue-code-review
───────────────
Status   🟢 PASS
Score    100/100
Project  /Users/rain9/you-want/ai-skills

文档技能 vue-code-review 已加载

✅ No issues found.
```

### 5. 管理技能

```bash
# 更新所有技能
pnpm run cli update

# 移除技能
pnpm run cli remove skill-name

# 再次查看技能列表
pnpm run cli list
```

## 📖 完整命令手册

### `ai-skills list` - 列出所有技能

显示所有已安装的技能，包括：
- 技能名称
- 范围（本地/全局）
- 版本号
- 描述
- 安装路径
- 安装时间
- 标签

```bash
pnpm run cli list
```

### `ai-skills add <repo> [--local]` - 安装技能

安装新技能。

```bash
# 从本地路径安装
pnpm run cli add /path/to/skill --local

# 从 Git 仓库安装（待实现）
pnpm run cli add https://github.com/user/skill.git
```

**参数说明**：
- `repo`: 技能仓库路径或 Git URL
- `--local`: 表示安装到项目本地的 `.ai-skills/skills/`（默认安装到全局 `~/.ai-skills/skills/`）

### `ai-skills update` - 更新技能

更新所有已安装的技能。

```bash
pnpm run cli update
```

本地技能会跳过更新，远程技能会尝试拉取最新代码。

### `ai-skills remove <name>` - 移除技能

移除已安装的技能。

```bash
pnpm run cli remove skill-name
```

### `ai-skills run <name> [--project <path>] [--json]` - 运行技能

运行指定的技能。

```bash
# 运行技能
pnpm run cli run skill-name

# 指定项目路径
pnpm run cli run skill-name --project /path/to/project

# JSON 格式输出
pnpm run cli run skill-name --json
```

## 📦 两种技能类型

### 1. 文档型技能（SKILL.md）

最简单的技能形式，只需创建一个包含 `SKILL.md` 的目录：

```
my-skill/
└── SKILL.md
```

`SKILL.md` 示例：

```markdown
---
name: my-skill
version: 1.0.0
description: 我的技能描述
author: Your Name
tags: [tag1, tag2]
---

# 我的技能

这是技能的具体内容...
```

### 2. 可执行技能（TypeScript）

功能更强大的技能，使用 TypeScript 编写：

```
my-skill/
├── SKILL.md
├── package.json
└── src/
    └── index.ts
```

`src/index.ts` 示例：

```typescript
import type { Skill, SkillContext, SkillResult } from '@ai-skills/core'

const mySkill: Skill = {
  name: 'my-skill',
  description: '我的可执行技能',
  
  async run(ctx: SkillContext): Promise<SkillResult> {
    // 你的技能逻辑
    return {
      passed: true,
      score: 100,
      summary: '检查完成',
      issues: [],
      suggestions: [],
      metadata: {}
    }
  }
}

export default mySkill
```

`package.json` 示例：

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

## 🎯 使用我们的技能模板

项目提供了完整的技能模板，快速创建新技能：

```bash
# 复制模板
cp -r templates/skill-template skills/my-new-skill

# 编辑 SKILL.md，修改名称、描述等

# 安装技能
pnpm run cli add /Users/rain9/you-want/ai-skills/skills/my-new-skill --local
```

## � 技能存储位置

AI Skills Engine 按优先级从以下位置加载技能：

| 位置 | 优先级 | 路径 | 说明 |
|------|--------|------|------|
| 项目本地 | 1（最高） | `.ai-skills/skills/` | 当前项目的技能 |
| 全局 | 2 | `~/.ai-skills/skills/` | 所有项目共享的技能 |
| 内置 | 3（最低） | `packages/skills/` | 引擎内置技能 |

## 🔧 技能元数据（SKILL.md）

在 `SKILL.md` 的 YAML frontmatter 中可以定义：

```yaml
---
name: skill-name          # 技能名称（必需）
version: 1.0.0            # 版本号
description: 技能描述      # 描述
author: Your Name         # 作者
tags: [tag1, tag2]        # 标签
dependencies:             # 依赖的其他技能
  - other-skill
install:                  # 安装后执行的命令
  - npm install
  - npm run build
---
```

## 🏗️ 项目结构

```
ai-skills/
├── packages/
│   ├── cli/                    # 命令行工具
│   │   └── src/
│   │       ├── index.ts        # CLI 入口
│   │       └── commands/
│   │           └── skill.ts    # 技能管理命令
│   ├── core/                   # 核心引擎
│   │   ├── src/
│   │   │   ├── load-skills.ts  # 技能加载器
│   │   │   ├── run.ts          # 技能运行器
│   │   │   ├── config.ts       # 配置管理
│   │   │   └── types.ts        # 类型定义
│   └── skills/
│       └── ship-safe/          # 内置技能示例
├── skills/                     # 你的技能仓库
├── templates/
│   └── skill-template/         # 技能模板
├── .ai-skills/
│   ├── skills/                 # 项目本地安装的技能
│   └── registry.json           # 技能注册表
└── package.json
```

## 🎨 使用场景

### 场景 1：团队代码规范检查

创建一个 `code-review` 技能，包含团队的代码规范，然后在每个项目中安装：

```bash
# 在项目 A 中安装
pnpm run cli add /path/to/team/code-review --local

# 运行检查
pnpm run cli run code-review --project ./src
```

### 场景 2：发布前安全检查

创建 `ship-safe` 技能，在发布前自动运行 lint、测试等：

```bash
# 集成到 CI/CD
pnpm run cli run ship-safe --json > result.json
```

### 场景 3：AI 助手提示词管理

将各种 AI 提示词封装成技能，方便团队共享和使用。

## 🔗 CI/CD 集成

### GitHub Actions

```yaml
name: AI Skills Check

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  ai-skills:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm build
      
      - name: Install skills
        run: pnpm run cli add ./skills/code-review --local
      
      - name: Run checks
        run: pnpm run cli run code-review --project ./src --json > result.json
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: ai-skills-results
          path: result.json
```

### Git Hooks

使用 Husky 在提交前自动检查：

```bash
pnpm add -D husky
npx husky install
npx husky add .husky/pre-commit "pnpm run cli run code-review"
```

## ❓ 常见问题

### Q: 技能安装到哪里了？

A: 
- 本地安装：`.ai-skills/skills/`
- 全局安装：`~/.ai-skills/skills/`

### Q: 如何创建自定义技能？

A: 复制 `templates/skill-template/`，然后修改 `SKILL.md` 和代码。

### Q: 技能加载失败怎么办？

A: 检查技能目录是否包含 `SKILL.md` 或 `package.json` + `dist/index.js`。

### Q: 如何调试技能？

A: 使用 `--json` 输出详细信息，或者查看技能的源代码。

### Q: 本地技能和全局技能有什么区别？

A: 
- 本地技能：只在当前项目可用，存储在 `.ai-skills/skills/`
- 全局技能：所有项目都可用，存储在 `~/.ai-skills/skills/`

## 🤝 贡献

欢迎提交 Issue 和 PR！

## � 许可证

MIT License
