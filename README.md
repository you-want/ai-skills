# AI Skills Engine

一个 **可扩展的 AI 技能引擎框架**，让 AI 助手理解并执行你的团队规范。

## 🎯 项目简介

AI Skills Engine 是一个可扩展的技能框架，通过将团队规范编写成 AI 可读的 `SKILL.md` 文档，让 AI 助手能够根据规范自动生成或审查代码。

**核心能力**：
- 📚 **规范文档化**: 将团队规范编写成 AI 可读的技能文档
- 🤖 **AI 驱动**: 让 AI 助手根据规范自动生成或审查代码
- ✅ **自动化检查**: 提供命令行工具进行自动化质量检查
- 🔌 **高度可扩展**: 轻松添加新的技能，支持任意技术栈和场景
- 🔄 **CI/CD 集成**: 可以集成到 CI/CD 流程中

## 💡 项目初衷

### 解决的核心问题

**1. AI 助手缺乏团队规范知识**
- AI 不知道团队的编码规范和最佳实践
- 每次都需要重复说明规范要求
- 生成的内容不符合团队标准

**2. 规范文档难以落地执行**
- 规范文档写好了，但没人主动查阅
- 新成员学习成本高，上手慢
- 缺乏自动化的规范执行机制

**3. 知识传承效率低**
- 团队经验散落在各处，难以系统化
- 资深成员的经验和实践难以传递给新人
- 同样的错误反复出现

### 解决方案

将代码规范编写成 AI 可读的 `SKILL.md` 文档，让 AI 助手根据规范生成或审查代码。

```
规范文档 (SKILL.md) 
    ↓
AI 读取并理解规范
    ↓
自动生成/审查代码
    ↓
符合团队标准的代码
```

## ✨ 特性

- **可扩展架构**: 轻松添加新的技能，支持任意技术栈
- **多级别检查**: P0（必须修复）、P1（应该修复）、P2（建议优化）
- **详细报告**: 提供清晰的检查报告和改进建议
- **灵活使用**: 可作为 AI 助手文档或命令行工具
- **开箱即用**: 内置常用技能，可直接使用或自定义

## 📁 项目结构

```
ai-skills/
├── packages/
│   ├── cli/              # 命令行接口
│   ├── core/             # 技能引擎核心
│   │   ├── run.ts        # 技能运行器
│   │   ├── load-skills.ts # 技能加载器
│   │   └── types.ts      # 类型定义
│   └── skills/
│       └── ship-safe/    # 发布安全检查技能
├── skills/               # 技能描述文档（可扩展）
│   ├── frontend-design/  # 前端设计规范
│   ├── vue-code-generation/ # Vue 代码生成规范
│   └── vue-code-review/  # Vue 代码审查规范
├── configs/              # 配置文件
└── dist/                 # 构建产物
```

## 📖 使用手册

### 方式一：AI 助手使用（主要使用方式）

**核心思路**：让 AI 读取 `skills/` 目录中的规范文档，然后根据规范生成或审查代码。

#### 1. 代码生成

**步骤 1**: 告诉 AI 使用哪个技能文档

```
用户：请读取 skills/vue-code-generation/SKILL.md 中的规范
```

**步骤 2**: 描述你的需求

```
用户：帮我生成一个 Vue 3 用户列表组件，包含分页功能
```

**步骤 3**: AI 会根据规范生成符合要求的代码

#### 2. 代码审查

**步骤 1**: 准备待审查的代码

```vue
<script setup lang="ts">
const list = ref([])
</script>
```

**步骤 2**: 让 AI 读取审查规范并审查代码

```
用户：请读取 skills/vue-code-review/SKILL.md，然后审查这段代码
```

**步骤 3**: AI 会输出检查结果

```
P0: 缺少 TypeScript 类型定义
P1: 组件未使用 defineOptions 定义名称
P2: 建议添加单元测试
```

#### 3. 常用技能选择

| 你的需求 | 使用的技能文档 |
|----------|---------------|
| 生成 Vue 代码 | `skills/vue-code-generation/SKILL.md` |
| 审查 Vue 代码 | `skills/vue-code-review/SKILL.md` |
| 发布前检查 | 运行 `ship-safe` 命令行工具 |
| 检查前端设计 | `skills/frontend-design/SKILL.md` |
| 其他场景 | 查看 `skills/` 目录获取更多技能 |

### 方式二：命令行工具使用

**适用场景**：自动化检查、CI/CD 集成

#### 安装

```bash
# 克隆项目
git clone https://github.com/your-username/ai-skills.git
cd ai-skills

# 安装依赖
pnpm install

# 构建
pnpm build
```

#### 基本命令

```bash
# 查看帮助
pnpm run cli help

# 列出所有可用技能
pnpm run cli list

# 运行特定技能
pnpm run cli run ship-safe

# 运行所有技能
pnpm run cli run all

# 指定项目路径
pnpm run cli run ship-safe --project /path/to/your/project

# 输出 JSON 格式
pnpm run cli run ship-safe --json

# 指定变更文件
pnpm run cli run ship-safe --changed src/app.ts,test/app.test.ts
```

#### 运行示例

```bash
# 运行 ship-safe 检查
pnpm run cli run ship-safe

# 输出示例：
# ship-safe
# ───────────
# Status   🟢 PASS
# Score    95/100
# Project  /path/to/project
# 
# Checks
# - test-script        PASS (120ms)
# - repo-tests         PASS (45ms)
# - command:lint       PASS (890ms)
# 
# No issues found.
```

#### 配置文件

在项目根目录创建 `.ai-skills.config.json`：

```json
{
  "skills": {
    "ship-safe": {
      "testScripts": ["test", "test:unit"],
      "qualityScripts": ["lint", "typecheck"],
      "requireRepoTests": true
    }
  }
}
```

### 方式三：CI/CD 集成

#### GitHub Actions 示例

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
        continue-on-error: true
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: ai-skills-results
          path: result.json
```

#### Git Hook 集成

使用 Husky 在提交前自动检查：

```bash
# 安装 Husky
pnpm add -D husky
npx husky install

# 添加 pre-commit hook
npx husky add .husky/pre-commit "pnpm run cli run ship-safe"
```

## 📚 可用技能

| 技能名称 | 描述 | 状态 | 使用方式 |
|----------|------|------|----------|
| `ship-safe` | 发布前安全检查（测试覆盖率、质量检查等） | ✅ 可用 | 命令行运行 |
| `vue-code-review` | Vue 3 代码审查规范 | 📝 文档可用 | AI 助手读取 |
| `vue-code-generation` | Vue 3 代码生成规范 | 📝 文档可用 | AI 助手读取 |
| `frontend-design` | 前端设计规范 | 📝 文档可用 | AI 助手读取 |

**状态说明**：
- ✅ 可用：有完整的可执行代码
- 📝 文档可用：有规范文档，可供 AI 助手使用

**提示**：`skills/` 目录会持续扩展，欢迎贡献更多技能！

## 🔍 审查维度

### P0 - 红线规则（必须修复）
- TypeScript 类型安全（禁止 any）
- 模板规范（禁止复杂逻辑）
- 组件基础规范（defineOptions、Props 默认值）
- 安全检查（XSS、注入、路径遍历等）
- 运行时异常防护（空值处理、错误处理）

### P1 - 规范规则（应该修复）
- 文件结构与命名规范
- SOLID 原则检查
- 代码异味检测
- 性能优化建议

### P2 - 建议规则（可选优化）
- 调试代码清理
- 可访问性（a11y）检查
- 测试覆盖率

## 🎯 核心价值

| 价值点 | 说明 |
|--------|------|
| **规范落地** | 让规范文档真正被执行，而非摆设 |
| **效率提升** | AI 自动检查，减少人工审查时间 |
| **质量保障** | 发布前自动检查，降低线上问题 |
| **团队协作** | 新成员快速上手，保持代码一致性 |
| **灵活扩展** | 支持自定义技能，适应不同技术栈 |

## 🚀 快速开始

### 5 分钟上手指南

**1. 作为 AI 助手使用（推荐新手）**

```bash
# 无需安装，直接使用
# 在 AI 对话中：
"请读取 skills/vue-code-review/SKILL.md，帮我审查这段代码..."
```

**2. 作为命令行工具使用**

```bash
# 克隆并安装
git clone https://github.com/your-username/ai-skills.git
cd ai-skills
pnpm install
pnpm build

# 运行检查
pnpm run cli run ship-safe
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📧 联系

如有问题或建议，欢迎通过 Issues 联系。
