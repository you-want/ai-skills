# AI Skills Engine

一个 **可扩展的 AI 技能引擎**，让 AI 助手理解并执行你的团队规范。

## 🎯 项目简介

AI Skills Engine 是一个技能引擎框架，提供：

- � **技能加载器**: 自动发现和加载 `skills/` 目录中的技能文档
- ⚙️ **技能运行器**: 执行技能并生成结构化的检查报告
- 🛠️ **命令行工具**: 支持 CI/CD 集成和自动化检查
- 📦 **技能开发框架**: 轻松创建新的可执行技能

**核心思路**：将团队规范编写成 AI 可读的 `SKILL.md` 文档，引擎负责加载和执行，让 AI 助手根据规范工作。

```
skills/ (你的技能仓库)
    ↓
技能引擎加载
    ↓
AI 助手根据规范工作
    ↓
符合团队标准的产出
```

## 📁 项目结构

```
ai-skills/
├── packages/
│   ├── cli/              # 命令行接口
│   ├── core/             # 技能引擎核心
│   │   ├── load-skills.ts # 技能加载器
│   │   ├── run.ts        # 技能运行器
│   │   ├── config.ts     # 配置管理
│   │   └── types.ts      # 类型定义
│   └── skills/
│       └── ship-safe/    # 内置技能示例
├── skills/               # 技能仓库（你的规范文档）
└── configs/              # 配置文件
```

## ✨ 核心能力

### 1. 技能加载器 (`load-skills.ts`)

自动扫描 `skills/` 目录，发现并加载所有技能文档。

```typescript
import { loadAllSkills } from '@ai-skills/core'

// 加载所有技能
const skills = await loadAllSkills()

// 获取技能列表
for (const skill of Object.values(skills)) {
  console.log(skill.name, skill.description)
}
```

### 2. 技能运行器 (`run.ts`)

执行技能并生成结构化的检查报告。

```typescript
import { runSkill } from '@ai-skills/core'

// 运行技能
const result = await runSkill(skill, context, {
  output: 'text' // 或 'silent'
})

// 检查结果
console.log(result.passed)   // 是否通过
console.log(result.score)    // 评分 0-100
console.log(result.issues)    // 问题列表
console.log(result.suggestions) // 建议列表
```

### 3. 命令行工具 (`cli`)

提供交互式命令行界面。

```bash
# 查看所有可用技能
ai-skills list

# 运行特定技能
ai-skills run <skill-name>

# 指定项目路径
ai-skills run <skill-name> --project /path/to/project

# JSON 格式输出
ai-skills run <skill-name> --json
```

### 4. 技能开发框架

创建新的可执行技能非常简单：

```typescript
import type { Skill, SkillContext, SkillResult } from '@ai-skills/core'

const mySkill: Skill = {
  name: 'my-skill',
  description: '我的自定义技能',
  run: async (ctx: SkillContext): Promise<SkillResult> => {
    // 实现技能逻辑
    return {
      passed: true,
      score: 100,
      summary: '检查完成',
      issues: [],
      suggestions: []
    }
  }
}

export default mySkill
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.x
- pnpm >= 8.x

### 安装

```bash
# 克隆项目
git clone https://github.com/your-username/ai-skills.git
cd ai-skills

# 安装依赖
pnpm install

# 构建项目
pnpm build
```

### 基本使用

```bash
# 查看帮助
pnpm run cli help

# 列出所有可用技能
pnpm run cli list

# 运行技能
pnpm run cli run ship-safe

# 指定项目路径
pnpm run cli run ship-safe --project /path/to/your/project
```

### 集成到项目

在你的项目中引用 ai-skills 引擎：

```typescript
import { loadAllSkills, runSkill } from 'ai-skills'

const skills = await loadAllSkills('/path/to/your/skills')
const result = await runSkill(skills['my-skill'], {
  projectPath: '/path/to/project'
})
```

## 🔧 本地调试

### 开发模式

```bash
# 启动开发模式（监听文件变化自动重建）
pnpm dev

# 或使用 tsc 监听模式
pnpm build --watch
```

### 调试技能

```bash
# 使用调试标志运行技能
pnpm run cli run ship-safe --debug

# 输出详细日志
pnpm run cli run ship-safe --verbose

# 测试特定功能
pnpm run cli run ship-safe --test
```

### VS Code 调试配置

在 `.vscode/launch.json` 中添加调试配置：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Run Skill",
      "program": "${workspaceFolder}/packages/cli/src/index.ts",
      "args": ["run", "ship-safe"],
      "cwd": "${workspaceFolder}",
      "runtimeArgs": ["--require", "ts-node/register"],
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### 日志调试

```typescript
// 在技能代码中添加调试日志
import { logger } from '@ai-skills/core'

logger.debug('Debug info')
logger.info('Info message')
logger.warn('Warning')
logger.error('Error')
```

## 📦 部署

### 本地部署

```bash
# 构建生产版本
pnpm build

# 全局安装 CLI
pnpm link --global

# 现在可以全局使用
ai-skills --version
ai-skills run ship-safe
```

### 作为依赖部署

在其他项目中使用：

```bash
# 安装到你的项目
pnpm add ai-skills
```

```typescript
import { loadAllSkills, runSkill, loadConfig } from 'ai-skills'

// 加载配置
const config = await loadConfig({ projectPath: process.cwd() })

// 加载技能
const skills = await loadAllSkills()

// 运行技能
const result = await runSkill(skills['ship-safe'], {
  projectPath: process.cwd(),
  config
})

console.log('检查结果:', result.passed ? '通过' : '失败')
```

### CI/CD 集成

#### GitHub Actions

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
      
      - name: Run ship-safe check
        run: pnpm run cli run ship-safe --json > result.json
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: ai-skills-results
          path: result.json
```

#### Git Hooks

使用 Husky 在提交前自动检查：

```bash
pnpm add -D husky
npx husky install
npx husky add .husky/pre-commit "pnpm run cli run ship-safe"
```

## ❓ 常见问题

### Q: 技能加载失败？

A: 检查 `skills/` 目录结构是否正确，确保每个技能目录包含 `SKILL.md` 文件。

### Q: 运行技能时报错？

A: 使用 `--debug` 或 `--verbose` 标志查看详细日志。

### Q: 如何创建自定义技能？

A: 参考「扩展技能」章节，支持两种方式：
1. 添加技能文档（SKILL.md）
2. 开发可执行技能（TypeScript）

### Q: 配置文件在哪里？

A: 配置文件支持多种格式：
- `ai-skills.config.json`
- `ai-skills.config.js`
- `ai-skills.config.mjs`
- `ai-skills.config.cjs`

## � 扩展技能

### 方式一：添加技能文档

在 `skills/` 目录创建新的技能文档：

```
skills/
└── my-custom-skill/
    └── SKILL.md  # 你的规范文档
```

### 方式二：开发可执行技能

在 `packages/skills/` 创建新的技能包：

```
packages/skills/
└── my-executable-skill/
    ├── src/
    │   └── index.ts
    └── package.json
```

## 📦 内置技能

项目提供了一个完整的示例技能 `ship-safe`，用于发布前安全检查：

- 检测测试脚本是否可用
- 运行 lint、typecheck 等质量检查
- 验证变更文件是否有对应测试

## 🎯 核心价值

| 价值点 | 说明 |
|--------|------|
| **规范文档化** | 将团队规范编写成 AI 可读的技能文档 |
| **技能引擎化** | 提供加载和执行技能的核心框架 |
| **高度可扩展** | 支持自定义技能，适应任意场景 |
| **开箱即用** | 内置完整示例技能，可直接使用 |
| **CI/CD 友好** | 支持命令行和 JSON 输出，易于集成 |

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📧 联系

如有问题或建议，欢迎通过 Issues 联系。
