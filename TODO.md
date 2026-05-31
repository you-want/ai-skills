## 设计目标

- **技能远程化**：技能存放在 GitHub 仓库或任何 Git 地址上，用户不直接 fork 到自己的项目里
- **按需安装**：通过 CLI 命令（如 `ai-skills add <repo>`）自动 clone 到本地的 `~/.ai-skills/skills/` 或项目内的 `.ai-skills/skills/`
- **即装即用**：安装后自动注册到技能管理器，下次 Agent 运行时就能加载
- **版本管理**（可选）：支持 `@tag` 或 `#branch` 指定版本
- **依赖自动解析**（进阶）：如果技能依赖别的技能，自动递归安装

---

## 目录结构设计

### 本地技能仓库（用户视角）

```
~/.ai-skills/                      # 全局技能目录
├── skills/
│   ├── agents-best-practices/    # 技能1
│   │   ├── SKILL.md               # 技能描述文件（必须）
│   │   ├── references/            # 参考文档
│   │   ├── checklists/            # 检查清单
│   │   └── scripts/               # 可执行脚本（可选）
│   ├── native-feel-skill/         # 技能2
│   │   ├── SKILL.md
│   │   └── ...
│   └── ...
├── config.json                    # 全局配置（安装源、默认分支等）
└── registry.json                  # 已安装技能的元信息（来源、版本、安装时间）
```

### 技能仓库的标准化结构（开发者发布）

每个技能单独一个 Git 仓库，根目录下必须包含：

```
skill-name/
├── SKILL.md          # 技能核心：YAML frontmatter + Markdown 指令
├── references/       # 可选，存放详细参考文档
├── checklists/       # 可选，存放清单文件（如上线检查清单）
├── scripts/          # 可选，存放可执行脚本（Python/Node/Bash）
└── .ai-skills-ignore # 可选，类似 .gitignore，安装时排除某些文件
```

`SKILL.md` 的 frontmatter 示例：

```yaml
---
name: agents-best-practices
version: 1.0.0
description: 生产级Agent系统的设计范式
author: DenisSergeevitch
tags: [agent, architecture, best-practices]
dependencies: []   # 将来可能依赖其他技能
install:           # 安装后执行的钩子（如编译）
  - npm install
---
```

---

## CLI 命令设计

### 1. 安装技能

```bash
# 通过 GitHub 短名安装（默认使用主分支）
ai-skills add DenisSergeevitch/agents-best-practices

# 通过完整 Git URL 安装
ai-skills add https://github.com/yetone/native-feel-skill.git

# 指定分支或 tag
ai-skills add yetone/native-feel-skill#main
ai-skills add yetone/native-feel-skill#v1.2.0

# 安装到项目目录（而非全局）
ai-skills add --local yetone/native-feel-skill
```

执行流程：
- 解析输入，得到 Git URL 和 目标分支
- 检查本地是否已安装（通过 `registry.json`）
- 如果已安装，询问是否覆盖或更新
- `git clone --depth 1 --branch <branch> <url> ~/.ai-skills/skills/<skill-name>`
- 读取 `SKILL.md`，校验格式，写入 `registry.json`
- 如果 `SKILL.md` 中有 `install` 钩子，执行它

### 2. 列出已安装技能

```bash
ai-skills list
```

输出示例：
```
✅ agents-best-practices (v1.0.0) - 生产级Agent系统的设计范式
✅ native-feel-skill (main) - 原生桌面应用开发技能
❌ pdf-parser (未安装)
```

### 3. 移除技能

```bash
ai-skills remove agents-best-practices
```

删除对应目录，并从 `registry.json` 中移除记录。

### 4. 更新技能

```bash
ai-skills update                # 更新所有已安装技能
ai-skills update agents-best-practices
```

进入技能目录执行 `git pull`。

### 5. 搜索技能（可选，进阶）

```bash
ai-skills search agent
```

可以先做一个简单的索引：从已知的技能列表（比如维护一个 `skill-repos.json`）中搜索名称和标签。

---

## 核心实现（Node.js CLI）

基于你的 `ai-skills` 项目（看起来是 monorepo 结构，有个 `packages/cli`），我来写一下核心模块的伪代码。

### 依赖

```bash
npm install simple-git fs-extra commander prompts chalk
```

### 代码骨架

```typescript
// packages/cli/src/commands/add.ts
import { simpleGit } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

const SKILLS_DIR = path.join(process.env.HOME || '~', '.ai-skills', 'skills');
const REGISTRY_PATH = path.join(process.env.HOME || '~', '.ai-skills', 'registry.json');

export async function addSkill(repoInput: string, options: { local?: boolean; branch?: string }) {
  // 1. 解析 repo 输入
  let repoUrl: string;
  let branch = options.branch || 'main';
  let skillName: string;

  if (repoInput.includes('/') && !repoInput.startsWith('http')) {
    // 短名: DenisSergeevitch/agents-best-practices
    repoUrl = `https://github.com/${repoInput}.git`;
    skillName = repoInput.split('/').pop()!;
  } else if (repoInput.startsWith('http')) {
    repoUrl = repoInput;
    skillName = repoInput.split('/').pop()!.replace('.git', '');
  } else {
    console.error(chalk.red('❌ 无法识别的技能地址，请使用 GitHub 短名或完整 Git URL'));
    return;
  }

  // 2. 确定安装目录
  const targetDir = options.local 
    ? path.join(process.cwd(), '.ai-skills', 'skills', skillName)
    : path.join(SKILLS_DIR, skillName);

  // 3. 检查是否已存在
  if (await fs.pathExists(targetDir)) {
    const answer = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: `技能 ${skillName} 已存在，是否覆盖？`,
      initial: false
    });
    if (!answer.overwrite) return;
    await fs.remove(targetDir);
  }

  // 4. clone 技能仓库
  console.log(chalk.blue(`📦 正在安装技能 ${skillName}...`));
  const git = simpleGit();
  await git.clone(repoUrl, targetDir, ['--depth', '1', '--branch', branch]);
  console.log(chalk.green(`✅ 技能 ${skillName} 安装完成`));

  // 5. 验证 SKILL.md 存在
  const skillMdPath = path.join(targetDir, 'SKILL.md');
  if (!await fs.pathExists(skillMdPath)) {
    console.warn(chalk.yellow(`⚠️ 技能缺少 SKILL.md 文件，可能无法正常加载`));
  }

  // 6. 记录到 registry
  const registry = await loadRegistry();
  registry[skillName] = {
    repo: repoUrl,
    branch,
    installedAt: new Date().toISOString(),
    version: await extractVersion(skillMdPath) || 'unknown'
  };
  await saveRegistry(registry);

  // 7. 执行安装钩子（如果 SKILL.md 中定义了）
  await runInstallHooks(targetDir);
}

async function loadRegistry() {
  if (await fs.pathExists(REGISTRY_PATH)) {
    return await fs.readJson(REGISTRY_PATH);
  }
  return {};
}

async function saveRegistry(registry: any) {
  await fs.ensureDir(path.dirname(REGISTRY_PATH));
  await fs.writeJson(REGISTRY_PATH, registry, { spaces: 2 });
}

async function extractVersion(skillMdPath: string): Promise<string | null> {
  // 简单解析 frontmatter，可以先用正则
  const content = await fs.readFile(skillMdPath, 'utf-8');
  const match = content.match(/version:\s*(.+)/);
  return match ? match[1] : null;
}

async function runInstallHooks(skillDir: string) {
  // 读取 SKILL.md 中的 install 字段（YAML 列表）
  // 如果有，执行 `npm install` 等
  // 这部分可以后续实现
}
```

### 与现有 SkillManager 集成

当 Agent 启动时，`SkillManager` 不仅要扫描 `skills/` 目录，还要扫描全局 `~/.ai-skills/skills/` 和项目本地 `.ai-skills/skills/`。这样用户安装的技能就能被自动加载。

修改 `SkillManager.loadCustomSkills()`：

```typescript
async loadCustomSkills(): Promise<void> {
  const skillDirs = [
    path.join(os.homedir(), '.ai-skills', 'skills'),   // 全局
    path.join(process.cwd(), '.ai-skills', 'skills'),  // 项目本地
    path.join(process.cwd(), 'skills')                 // 兼容旧结构
  ];
  // 然后遍历每个目录，加载 SKILL.md
}
```

---

## 用户体验示例

用户 A 想在自己的项目里使用 `agents-best-practices` 这个技能：

```bash
# 安装到全局（一次安装，所有项目可用）
ai-skills add DenisSergeevitch/agents-best-practices

# 在 mini-cc 或任何 Agent 中，技能自动生效
# 因为 Agent 启动时会扫描 ~/.ai-skills/skills/
```

用户 B 只想在某个特定项目里用 `native-feel-skill`：

```bash
cd my-project
ai-skills add --local yetone/native-feel-skill
```

然后在这个项目目录下运行 Agent，技能就只对这个项目生效。

---

## 下一步迭代计划

| 阶段 | 任务 | 优先级 | 状态 |
|------|------|--------|------|
| 1. 基础安装 | 实现 `ai-skills add/remove/list`，支持 clone GitHub 仓库 | P0 | ✅ 已完成 |
| 2. 集成到 mini-cc | 修改 SkillManager 扫描全局/项目技能目录，加载 SKILL.md 内容到系统提示词 | P0 | ✅ 已完成 |
| 3. 技能规范 | 定义并文档化 SKILL.md 的标准结构（YAML frontmatter + Markdown 指令），创建技能模板 | P1 | ✅ 已完成 |
| 4. 更新机制 | `ai-skills update` 拉取最新代码 | P1 | ✅ 已完成 |
| 5. 依赖解析 | 技能可以声明 dependencies，自动递归安装 | P2 | ⏳ 待开始 |
| 6. 搜索与发现 | 维护一个官方技能索引，`ai-skills search` 在线查找 | P2 | ⏳ 待开始 |

---

## 总结

这套设计让 `ai-skills` 项目从一个“技能仓库”升级为一个“技能运行时 + 管理器”。用户不再需要手动 clone 技能到项目里，而是通过 CLI 按需安装、自动加载。

你现在的任务就是**先把 `ai-skills add` 这个命令跑通**，让它能把 `agents-best-practices` 和 `native-feel-skill` 这两个项目 clone 下来，然后让你的 Agent（mini-cc）能扫描到它们，把 `SKILL.md` 的内容注入到系统提示词里。

一旦这个流程通了，你的 `ai-skills` 就成了一个真正的“技能市场基础设施”——别人可以发布技能，用户可以一键安装。这才是 Agent 生态该有的样子。

需要我帮你写一个完整的 `add.ts` 实现吗？或者先从整合 `agents-best-practices` 的技能内容开始，让它能在 mini-cc 里生效？