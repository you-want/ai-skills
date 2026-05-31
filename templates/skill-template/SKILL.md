---
name: example-skill
version: 1.0.0
description: 这是一个技能模板示例
author: Your Name
tags: [template, example]
dependencies: []
install:
  - npm install
  - npm run build
---

# 技能模板

## 概述

这是一个标准的技能模板，展示了如何组织技能仓库结构。

## 文件结构

```
skill-name/
├── SKILL.md              # 技能核心定义（必须）
├── package.json          # npm 包配置（可选，用于可执行技能）
├── tsconfig.json         # TypeScript 配置（可选）
├── src/
│   └── index.ts          # 技能入口（可选，用于可执行技能）
├── dist/                 # 编译输出目录
├── references/           # 参考文档（可选）
│   └── reference.md
├── checklists/           # 检查清单（可选）
│   └── checklist.md
└── .ai-skills-ignore     # 安装时需要忽略的文件（可选）
```

## 使用方式

技能可以是两种类型：

### 1. 可执行技能
- 有 package.json 和 TypeScript 代码
- 可以通过 `ai-skills run` 命令执行
- 编译后放在 dist/index.js

### 2. 参考技能
- 只有 SKILL.md 和参考文档
- 供 Agent 读取参考
- 不需要编译
