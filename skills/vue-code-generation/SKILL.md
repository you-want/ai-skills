---
name: vue-code-generation
description: Vue 3 前端代码生成规范。当用户要求生成、修改、重构前端代码，或询问如何编写符合团队规范的 Vue / TypeScript / SCSS Module 组件时使用此 skill。
---

# Vue 组件生成规范

## 组件结构

组件文件由三部分组成：`<script setup>`、`<template>`，样式使用 SCSS Module 独立文件。

## 文件组织规范

生成代码时，相关文件需按以下规则组织：

### 1. 常量文件

常量必须放在同级的 `constants` 文件夹中：

```
src/
├── views/
│   └── MyComponent/
│       ├── index.vue
│       └── constants.ts   # 存放该组件相关的常量
```

常量命名使用全大写下划线（UPPER_SNAKE_CASE）：

```ts
// constants/index.ts
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_RETRY_COUNT = 3;
export const STATUS_OPTIONS = [
  { label: "启用", value: 1 },
  { label: "禁用", value: 0 },
];
```

### 2. 业务对象接口（BO）

TS 接口放在 `model/bo` 文件夹中，以 `xxxBO.ts` 结尾：

```
src/
├── model/
│   └── bo/
│       └── userBO.ts       # 用户业务对象
```

```ts
// model/bo/userBO.ts
export interface UserBO {
  id: string;
  name: string;
  email: string;
  createTime: string;
}

export interface UserDetailBO extends UserBO {
  roles: string[];
  permissions: string[];
}
```

### 3. 请求参数接口（Params）

网络请求参数放在 `model/param` 文件夹中，以 `xxxParams.ts` 结尾（与 BO 分开存放）：

```
src/
├── model/
│   └── param/
│       └── userParams.ts    # 用户相关请求参数
```

```ts
// model/param/userParams.ts
export interface UserQueryParams {
  currPage: number;
  pageSize: number;
  keyword?: string;
  status?: number;
}

export interface UserCreateParams {
  name: string;
  email: string;
  roleIdList: string[];
}

export interface UserUpdateParams extends UserCreateParams {
  id: string;
}
```

### 4. 目录结构示例

一个完整的模块目录结构：

```
src/
├── api/
│   └── userApi.ts                 # 命名规则：模块+Api
├── assets/                        # 静态资源
      └── dark                     # 存放暗色图片
      └── light                    # 存放亮色图片
      └── iconfont                 # 图标字体
      └── icons                    # 存放多色图标
├── components/
│   └── xxx-xxx/
│       ├── index.vue              # 通用组件
│       ├── constants.ts           # 常量
│       └── index.module.scss      # 样式
├── views/
│   └── xxx-xxx/                   # 页面模块组件
│       ├── index.vue              # 组件
│       ├── constants.ts           # 常量
│       └── index.module.scss      # 样式
├── constants/                      # 全局常量
| └── UrlPrefix.ts                  # 网络请求URL前缀
| └── EventBusKey.ts                # 事件总线Key
├── hooks/
| └── UseXxx.ts
├── locales/                        # 多语言
│   └── lang
      └── en-US.json                # 英语
      └── zh-CN.json                # 中文
    └── element-plus.ts      # Element Plus语言包
    └── index.ts
├── store/
  └── xxxStore.ts
├── model/
│   ├── bo/
│   │   └── userBO.ts              # 业务对象
│   └── param/
│       └── userParams.ts          # 请求参数
typings/                        # 自定义类型定义
  └── xxx-xx.d.ts                   # 自定义类型定义 例如click-outside-vue3.d.ts文件

```

## 代码规范

### 1. 文件头部注释

```vue
<!-- 组件功能描述 -->
<script setup lang="ts">
```

### 2. 组件命名

使用 `defineOptions` 定义组件名称，采用 PascalCase 命名规范：

```ts
defineOptions({ name: "ComponentName" });
```

### 3. 导入顺序

按以下顺序导入：

```ts
// 1. 类型导入
import type { SomeType } from "some-package";

// 2. 第三方库
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

// 3. 项目内部模块
import { CONSTANT } from "@/constants";
import { someUtil } from "@/utils";

// 4. 组件导入
import ChildComponent from "./ChildComponent.vue";

// 5. 样式导入
import style from "./index.module.scss";
```

### 4. Props 定义

使用 TypeScript 类型定义，推荐使用 `withDefaults`：

```ts
// 定义具体类型
interface DataItem {
  id: string;
  name: string;
  [key: string]: unknown;
}

const props = withDefaults(
  defineProps<{
    title?: string;
    disabled?: boolean;
    data?: DataItem[];
  }>(),
  {
    title: "",
    disabled: false,
    data: () => [],
  },
);
```

或使用运行时声明（兼容纯 JS 调用场景）：

```ts
const props = defineProps({
  modelValue: Boolean,
  title: String,
  options: {
    type: Array,
    default: () => [],
  },
});
```

### 5. Emits 定义

必须使用类型化定义：

```ts
const emits = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "change", value: string): void;
  (e: "confirm"): void;
}>();
```

### 6. 双向绑定

使用 `defineModel`（Vue 3.4+）：

```ts
const value = defineModel<string>();
const count = defineModel<number>("count", { default: 0 });
```

或使用 computed getter/setter：

```ts
const visible = computed({
  get() {
    return props.modelValue;
  },
  set(val) {
    emits("update:modelValue", val);
  },
});
```

### 7. 国际化

```ts
const { t } = useI18n();

// 使用
{
  {
    t("common.confirm");
  }
}
```

### 8. 模板引用

使用 `useTemplateRef`（Vue 3.5+）：

```ts
const refEditor = useTemplateRef<typeof Editor>("editorRef");
```

或传统方式：

```ts
const inputRef = ref<HTMLInputElement | null>(null);
```

### 9. 暴露方法

```ts
function showLoading() {
  loading.value = true;
}

function hideLoading() {
  loading.value = false;
}

defineExpose({
  showLoading,
  hideLoading,
});
```

### 10. 样式绑定

使用 SCSS Module，**最外层根容器**通过 `:class="style['component-name']"` 绑定模块类名，**内部子元素**在 SCSS 文件中使用 `:global` 嵌套，模板中直接用普通 `class` 引用：

```vue
<script setup lang="ts">
import style from "./index.module.scss";
</script>

<template>
  <!-- 最外层：SCSS Module 绑定 -->
  <div :class="style['component-name']">
    <!-- 内部子元素：普通 class -->
    <span class="item-text">内容</span>
    <div class="header">标题</div>
  </div>
</template>
```

对应 SCSS 文件：

```scss
.component-name {
  width: 100%;
  height: 100%;

  :global {
    .item-text {
      color: var(--el-text-color-primary);
    }
    .header {
      font-size: 14px;
    }
  }
}
```

**规则**：
- 根容器必须用 `:class="style['xxx']"` 绑定，确保模块隔离
- 内部子元素样式写在 `:global` 嵌套中，模板中直接用 `class="xxx"` 引用
- `:global` 内的类名仍受根容器的命名空间约束（CSS 嵌套作用域）

### 11. 组件尺寸

**每个组件必须显式设置宽高**，确保布局的可控性和一致性：

```scss
// index.module.scss
.component-name {
  width: 100%;
  height: 100%;
}

// 或指定具体尺寸
.component-name {
  width: 300px;
  height: 200px;
}

// 弹窗/对话框类组件
.dialog-wrapper {
  width: 480px;
  height: auto;
  min-height: 300px;
}
```

注意事项：

- 根容器必须设置 `width` 和 `height`
- 使用 `100%` 继承父容器尺寸时，确保父容器有明确尺寸
- 避免依赖内容撑开尺寸，保持布局可控

### 12. 插槽使用

```vue
<template>
  <div>
    <!-- 默认插槽 -->
    <slot />

    <!-- 具名插槽 -->
    <slot name="header" />
    <slot name="footer" />

    <!-- 作用域插槽 -->
    <slot name="item" :data="itemData" />
  </div>
</template>
```

### 13. 模版规范

#### 13.1 避免复杂业务逻辑

**不应该在模版里写复杂的业务逻辑代码**，应将逻辑抽取到 `computed` 或方法中：

```vue
<!-- 错误示例：模版中写复杂逻辑 -->
<template>
  <div v-if="user.role === 'admin' && user.status === 1 && !user.isDeleted">
    {{ user.name.toUpperCase().trim() }}
  </div>
</template>

<!-- 正确示例：使用 computed -->
<script setup lang="ts">
const isAdmin = computed(() => {
  return user.role === "admin" && user.status === 1 && !user.isDeleted;
});

const displayName = computed(() => {
  return user.name.toUpperCase().trim();
});
</script>

<template>
  <div v-if="isAdmin">
    {{ displayName }}
  </div>
</template>
```

#### 13.2 标签属性顺序

标签属性应按以下顺序排列：

1. **条件语句** - `v-if`、`v-else-if`、`v-else`、`v-for`、`v-show`
2. **样式相关** - `:class`、`class`、`:style`、`style`
3. **属性相关** - `:prop`、`prop`、`v-model`、`v-bind`
4. **事件相关** - `@click`、`@change`、`v-on`

```vue
<template>
  <!-- 正确示例：属性顺序 条件 → 样式 → 属性 → 事件 -->
  <div
    v-if="isVisible"
    v-for="item in list"
    :key="item.id"
    :class="style['item']"
    :style="{ color: item.color }"
    :data-id="item.id"
    :disabled="item.disabled"
    @click="handleClick(item)"
    @mouseenter="handleHover(item)"
  >
    {{ item.name }}
  </div>

  <!-- 错误示例：属性顺序混乱 -->
  <div
    @click="handleClick"
    :class="style['item']"
    v-if="isVisible"
    :disabled="item.disabled"
    v-for="item in list"
  >
    {{ item.name }}
  </div>
</template>
```

### 14. 命名规范

#### 14.1 组件命名体现类型

import 的组件或页面命名应体现其类型，使用 PascalCase 与原生 HTML 元素区分：

```ts
// 组件类型后缀
import UserManageView from "./UserManageView.vue"; // 页面视图
import UserListPage from "./UserListPage.vue"; // 页面
import CreateUserDialog from "./CreateUserDialog.vue"; // 弹窗/对话框
import UserFormDialog from "./UserFormDialog.vue"; // 表单弹窗
import SearchFilter from "./SearchFilter.vue"; // 筛选组件
import DataTable from "./DataTable.vue"; // 表格组件
```

#### 14.2 使用有意义的命名

参数命名应具体，不要过于抽象：

```ts
// 正确示例：命名具体、有意义
const fieldList = ref<FieldItem[]>([]);
const userList = ref<UserBO[]>([]);
const selectedRowKeys = ref<string[]>([]);
const formData = ref<UserCreateParams>({});

// 错误示例：命名过于抽象
const list = ref([]); // 不清楚是什么列表
const data = ref({}); // 不清楚是什么数据
const arr = ref([]); // 不清楚数组内容
const obj = ref({}); // 不清楚对象结构
```

#### 14.3 BO 和 Params 命名规范

BO 和 Params 分开存放：`model/bo/` 和 `model/param/` 各自独立文件。

格式：`模块 [+ 动作/名词] + BO/Params`

```ts
// model/bo/userBO.ts - 业务对象命名
export interface UserBO {
  // 用户基本信息
  id: string;
  name: string;
}
export interface UserDetailBO {
  // 用户详情
  id: string;
  name: string;
}
export interface ApiMgmtTableRowBO {
  // API管理 表格行数据
  id: string;
  name: string;
}

// model/param/userParams.ts - 请求参数命名
export interface UserQueryParams {
  // 用户 查询参数
  currPage: number;
  pageSize: number;
}
export interface ApiMgmtTableDataParams {
  // API管理 列表 查询请求参数
  currPage: number;
  pageSize: number;
}
export interface CommonDirectoryCreateParams {
  // 通用目录 创建请求参数
  name: string;
}
export interface CommonDirectoryEditParams {
  // 通用目录 编辑请求参数
  id: string;
  name: string;
}
```

#### 14.4 API 命名规范

格式：`动作 + 模块 + [具体数据] + [By条件]`

常用动作：`fetch`、`create`、`update`、`edit`、`delete`、`search`、`download`

使用标准的 HTTP 请求库（如 axios）进行 API 调用：

```ts
// api/userApi.ts
import axios from 'axios'
import type { UserBO, UserDetailBO } from '@/model/bo/userBO'
import type { UserQueryParams, UserCreateParams, UserUpdateParams } from '@/model/param/userParams'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// 根据ID获取单个用户信息
export function fetchUserInfoById(id: string) {
  return axios.get<UserDetailBO>(`${API_BASE_URL}/user/get?id=${id}`)
}

// 创建新用户
export function createUser(data: UserCreateParams) {
  return axios.post<UserBO>(`${API_BASE_URL}/user/create`, data)
}

// 根据ID更新用户
export function updateUser(data: UserUpdateParams) {
  return axios.post<UserBO>(`${API_BASE_URL}/user/update`, data)
}

// 根据ID删除用户
export function deleteUserById(id: string) {
  return axios.post(`${API_BASE_URL}/user/delete`, { id })
}

// 搜索用户列表（POST + 分页参数分离）
export function searchUserList(data: UserQueryParams) {
  return axios.post<UserBO[]>(`${API_BASE_URL}/user/list`, data, {
    params: { currPage: data.currPage, pageSize: data.pageSize, sort: data.sort }
  })
}

// 根据assetId获取资产表基本信息
export function fetchAssetTableBaseInfoByAssetId(assetId: string) {
  return axios.get(`${API_BASE_URL}/asset/${assetId}/base-info`)
}

// 下载用户报告
export function downloadUserReport(data: UserReportParams) {
  return axios.post(`${API_BASE_URL}/user/report/download`, data, {
    responseType: 'blob'
  })
}
```

#### 14.5 枚举命名

枚举以 `Type` 或 `Status` 结尾：

```ts
// 正确示例
export enum UserStatus {
  ENABLED = 1,
  DISABLED = 0,
}

export enum DialogType {
  CREATE = "create",
  EDIT = "edit",
  VIEW = "view",
}

export enum TaskStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
}

// 错误示例
export enum User {
  // 不明确是状态还是类型
  ENABLED = 1,
}
export enum Status {
  // 命名太泛
  A = 1,
}
```

#### 14.6 禁止魔法数字和硬编码字符

所有数字和字符串常量必须定义在 constants 文件中：

```ts
// 错误示例：魔法数字和硬编码
if (status === 1) { ... }
if (type === 'admin') { ... }
setTimeout(() => {}, 3000)

// 正确示例：使用常量
// constants.ts
export const USER_STATUS = {
  ENABLED: 1,
  DISABLED: 0,
} as const

export const USER_TYPE = {
  ADMIN: 'admin',
  USER: 'user',
} as const

export const TIMEOUT = {
  SHORT: 1000,
  MEDIUM: 3000,
  LONG: 5000,
} as const

// 使用
if (status === USER_STATUS.ENABLED) { ... }
if (type === USER_TYPE.ADMIN) { ... }
setTimeout(() => {}, TIMEOUT.MEDIUM)
```

## 完整模版

```vue
<!-- 组件功能描述 -->
<script setup lang="ts">
import type { SomeType } from "some-package";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import style from "./index.module.scss";

defineOptions({ name: "ComponentName" });

// 定义具体类型
interface DataItem {
  id: string;
  name: string;
  [key: string]: unknown;
}

// Props
const props = withDefaults(
  defineProps<{
    title?: string;
    disabled?: boolean;
    data?: DataItem[];
  }>(),
  {
    title: "",
    disabled: false,
    data: () => [],
  },
);

// Emits
const emits = defineEmits<{
  (e: "update", value: string): void;
  (e: "change", value: string): void;
  (e: "confirm"): void;
}>();

// 国际化
const { t } = useI18n();

// 响应式数据
const loading = ref(false);
const visible = ref(false);

// 计算属性
const computedTitle = computed(() => {
  return props.title || t("common.defaultTitle");
});

// 方法
function handleClick() {
  emits("update", "value");
}

// 生命周期
onMounted(() => {
  // 初始化逻辑
});

// 暴露给父组件
defineExpose({
  loading,
  visible,
  handleClick,
});
</script>

<template>
  <div :class="style['component-name']">
    <!-- 头部插槽 -->
    <div v-if="$slots.header" class="header">
      <slot name="header" />
    </div>

    <!-- 主体内容 -->
    <div class="content">
      <slot>
        <span>{{ computedTitle }}</span>
      </slot>
    </div>

    <!-- 底部插槽 -->
    <div v-if="$slots.footer" class="footer">
      <slot name="footer" />
    </div>
  </div>
</template>
```

## 常用 Element Plus 组件

- `el-button` - 按钮
- `el-input` - 输入框
- `el-select` - 下拉选择
- `el-dialog` - 对话框
- `el-form` / `el-form-item` - 表单
- `el-table` / `el-table-column` - 表格
- `el-popover` - 弹出框
- `el-tooltip` - 提示
- `el-link` - 链接
- `el-alert` - 警告
- `ElLoading.directive` - 加载指令

## 运行时异常防护规范（避免线上频繁抛异常）

### 1. 空值与深层属性安全访问

对任何可能为 `null` / `undefined` 的数据，优先使用可选链 `?.` 和空值合并 `??`：

```ts
// 错误示例：可能抛 Cannot read properties of undefined
const name = user.profile.name;

// 正确示例
const name = user?.profile?.name ?? "";
```

### 2. 数组操作前做有效性检查

```ts
// 错误示例
const firstId = list[0].id;

// 正确示例
const firstId = list?.[0]?.id ?? "";
// 或在逻辑分支中检查
if (list && list.length > 0) {
  const firstId = list[0].id;
}
```

### 3. 慎用类型断言与非空断言

禁止用 `!` 或 `as` 掩盖运行时空值风险：

```ts
// 错误示例
const el = document.querySelector("#app")!; // 线上可能不存在
const data = res as UserBO; // 若接口返回结构变化，后续访问会抛异常

// 正确示例
const el = document.querySelector("#app");
if (el) {
  el.innerText = "Hello";
}

// 对不确定的外部数据，使用类型守卫
function isUserBO(val: unknown): val is UserBO {
  return (
    typeof val === "object" &&
    val !== null &&
    "id" in val &&
    "name" in val
  );
}
```

### 4. 危险操作必须包裹 try-catch

```ts
// 错误示例
const config = JSON.parse(configStr);

// 正确示例
try {
  const config = JSON.parse(configStr);
} catch (e) {
  console.error("JSON parse failed:", e);
  // 使用兜底值或上报错误
}
```

### 5. 异步错误必须处理

```ts
// 错误示例
async function loadData() {
  const res = await fetchUserList(); // 若抛异常，调用方未捕获会导致未处理的 rejection
}

// 正确示例
async function loadData() {
  try {
    const res = await fetchUserList();
    userList.value = res.data ?? [];
  } catch (e) {
    console.error("加载用户列表失败:", e);
    userList.value = [];
  }
}
```

### 6. 模板中禁止直接访问可能抛异常的数据

```vue
<!-- 错误示例：若 user.profile 为 undefined，渲染时直接抛异常 -->
<template>
  <div>{{ user.profile.name.toUpperCase() }}</div>
</template>

<!-- 正确示例 -->
<script setup lang="ts">
const displayName = computed(() => {
  return user.value?.profile?.name?.toUpperCase() ?? "-";
});
</script>

<template>
  <div>{{ displayName }}</div>
</template>
```

### 7. 数值计算避免除零等异常

```ts
// 错误示例
const ratio = a / b;

// 正确示例
const ratio = b !== 0 ? a / b : 0;
```

### 8. 禁止提交调试代码到线上

代码生成和提交前，必须清理所有调试痕迹：

```ts
// 错误示例：包含调试输出
function handleSubmit() {
  console.log("submit", formData.value);
  debugger;
  // TODO: 先这样写，后面再改
  api.save(formData.value);
}

// 正确示例
function handleSubmit() {
  api.save(formData.value);
}
```

禁止项包括：
- `console.log`、`console.debug`、`console.table`、`console.dir` 等调试输出
- `debugger` 语句
- 被大量注释掉的废弃代码块
- 带有 `TODO:` / `FIXME:` / `HACK:` 等未解决标记的临时代码（若确需保留，必须在注释中说明原因和后续计划）

## 代码质量红线（生成时必须遵守）

生成代码时必须主动遵守以下规范，确保代码从产出时就符合项目标准，无需后续修复：

### 1. ESLint 风格规范

| 规则 | 要求 |
|------|------|
| 引号 | 字符串使用单引号 `'` |
| 分号 | 语句末尾不使用分号 |
| 缩进 | 2 个空格 |
| 尾随逗号 | 多行对象/数组末尾加逗号（ES5 风格）|
| 行宽 | 最大 120 字符 |
| 导入顺序 | 类型导入 → 第三方库 → 项目内部模块 → 组件导入 → 样式导入 |

### 2. 调试代码规范

**catch 块中的错误日志**：
- 使用 `console.error(err)` 而非 `console.log(err)`
- 保留错误信息输出，但使用正确的日志级别

```ts
// ✅ 正确
.catch((err) => {
  console.error(err)
  errorMessageHandle(err)
})

// ❌ 错误
try {
  JSON.parse(str)
} catch (e) {
  console.log(e)  // 应使用 console.error
}
```

## 注意事项

1. 使用 TypeScript 类型定义，确保类型安全
2. **禁止使用 `any` 类型**，必须定义具体的类型或使用 `unknown`
3. 组件命名使用 PascalCase，体现类型（XxxView、XxxPage、XxxDialog）
4. **常量命名使用全大写下划线（UPPER_SNAKE_CASE），变量使用小驼峰（camelCase）**
5. Props 必须定义默认值
6. 使用 SCSS Module 管理样式，避免样式污染
7. **每个组件必须显式设置宽高**，确保布局可控
8. **不在模版中写复杂业务逻辑**，应抽取到 computed 或方法中
9. **标签属性顺序**：条件 → 样式 → 属性 → 事件
10. **使用有意义的命名**，参数命名应具体（fieldList 优于 list）
11. **BO/Params 命名**：模块 [+ 动作/名词] + BO/Params，分开存放
12. **API 命名**：动作 + 模块 + [具体数据] + [By条件]
13. **枚举以 Type 或 Status 结尾**
14. **禁止魔法数字和硬编码字符**，必须定义常量
15. 合理使用插槽，提高组件灵活性
16. 通过 `defineExpose` 暴露必要的方法和属性
17. 国际化文本使用 `useI18n` 的 `t()` 方法
18. 注释说明复杂逻辑和业务规则
19. **严格进行运行时异常防护**，不要让未处理的异常频繁抛到线上
20. **生成代码时必须确保通过 Git Commit 验证（ESLint + commitlint），否则无法提交**
