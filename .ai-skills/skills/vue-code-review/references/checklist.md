# Vue / TypeScript 规范扩展示例

## Vue 3 专项检查

### Props & Emits

```ts
// ✅ Block 级别正确示例
const props = withDefaults(
  defineProps<{
    title?: string
    data?: DataItem[]
  }>(),
  {
    title: '',
    data: () => [],
  },
)

const emits = defineEmits<{
  (e: 'change', value: string): void
  (e: 'confirm'): void
}>()

// ❌ Block：使用 any
const props = defineProps<{ data: any }>()

// ❌ Block：Emits 字符串数组
const emits = defineEmits(['change'])
```

### 模板规范

```vue
<!-- ❌ Block：模板中写复杂逻辑 -->
<div v-if="user.role === 'admin' && user.status === 1 && !user.isDeleted">
  {{ user.name.toUpperCase().trim() }}
</div>

<!-- ✅ 正确：抽取到 computed -->
<script setup>
const isAdmin = computed(() => user.role === 'admin' && user.status === 1 && !user.isDeleted)
const displayName = computed(() => user.name.toUpperCase().trim())
</script>
<template>
  <div v-if="isAdmin">{{ displayName }}</div>
</template>
```

### 属性顺序

```vue
<!-- ✅ 正确：条件 → 样式 → 属性 → 事件 -->
<div
  v-if="isVisible"
  v-for="item in list"
  :key="item.id"
  :class="style['item']"
  :data-id="item.id"
  :disabled="item.disabled"
  @click="handleClick(item)"
>
```

### 响应式与副作用

```ts
// ✅ 正确：清理副作用
onMounted(() => {
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// ❌ Warning：未清理
onMounted(() => {
  window.addEventListener('resize', handleResize)
})
```

### 样式规范

```scss
// ✅ 根容器必须显式设置宽高
.component-name {
  width: 100%;
  height: 100%;
}

.dialog-wrapper {
  width: 480px;
  height: auto;
  min-height: 300px;
}
```

## TypeScript 专项检查

| 问题 | 等级 | 说明 |
|------|------|------|
| 使用 `any` | Block | 必须用具体类型或 `unknown` |
| 非空断言 `!` 无守卫 | Warning | 建议用可选链或显式判断 |
| `as` 强制类型转换 | Warning | 可能隐藏真实问题 |
| 可选链过度使用 | Suggestion | 某些场景应显式处理 null |

## 命名规范速查

| 类型 | 规范 | 示例 |
|------|------|------|
| 常量 | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| 变量/函数 | camelCase | `userList`, `handleClick` |
| 组件/类型 | PascalCase | `UserListView`, `UserBO` |
| BO | 模块 + BO | `UserBO`, `ApiMgmtTableRowBO` |
| Param | 模块 + 动作 + Param | `UserQueryParam`, `CommonDirectoryCreateParam` |
| API | 动作 + 模块 + By条件 | `fetchUserInfoById`, `searchUserList` |
| 枚举 | 以 Type/Status 结尾 | `UserStatus`, `DialogType` |

## 常见可维护性问题

### 魔法数字与硬编码

```ts
// ❌ Warning
if (status === 1) { ... }
setTimeout(() => {}, 3000)

// ✅ 正确
export const USER_STATUS = { ENABLED: 1, DISABLED: 0 } as const
export const TIMEOUT = { SHORT: 1000, MEDIUM: 3000, LONG: 5000 } as const
```

### 数组索引隐式耦合

```ts
// ❌ Warning：依赖数组顺序
const oldPkValue = oldPkValues[index]

// ✅ 更安全的关联
const oldPkValue = oldPkValueMap.get(member.id) || ''
```

### 深层 Prop 透传

```ts
// Suggestion：透传 2 层尚可，3 层以上建议用 provide/inject
```

## 性能检查点

- [ ] 大列表是否虚拟化或分页
- [ ] `computed` 中是否避免副作用
- [ ] 模板中是否避免复杂表达式
- [ ] 循环中是否缓存 `length`
- [ ] 并行请求是否使用 `Promise.all`

## 安全检查点

- [ ] `innerHTML` / `dangerouslySetInnerHTML` 是否净化（Block）
- [ ] 用户输入是否直接用于 URL/DOM（Block/Warning）
- [ ] 敏感信息是否硬编码（Warning）
