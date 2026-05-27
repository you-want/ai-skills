# 测试检查清单

## Bugfix 回归测试

- [ ] 修复 Bug 的 commit 是否包含对应的测试用例
- [ ] 测试是否覆盖了触发 Bug 的边界条件
- [ ] 测试是否验证了修复后的正确行为，而不仅仅是"不报错"

### 常见反模式

```ts
// ❌ 不足：只测了正常路径
it('should work', () => {
  expect(component.exists()).toBe(true)
})

// ✅ 正确：覆盖 Bug 场景
it('should not crash when data is empty', () => {
  wrapper.setProps({ data: [] })
  expect(() => wrapper.vm.handleSubmit()).not.toThrow()
})
```

---

## 复杂逻辑单元测试

- [ ] `computed` 中有复杂过滤/转换时，是否有独立测试
- [ ] 纯工具函数（utils/hooks）是否有单元测试
- [ ] 条件分支较多（>3 个）的函数是否覆盖了主要分支
- [ ] 数值计算、日期处理、字符串格式化是否有精确断言

### 常见反模式

```ts
// ❌ 不足：没有测试过滤逻辑
const filteredList = computed(() => list.value.filter(item => item.active && item.status > 0))

// ✅ 正确：测试正常、空数组、部分匹配等场景
```

---

## 组件渲染与交互测试

- [ ] 关键用户路径是否有渲染测试
- [ ] Props 变化是否正确反映在 DOM 上
- [ ] 用户交互（点击、输入、提交）是否触发了正确的事件/回调
- [ ] 异步操作（加载、请求完成）是否有等待和状态断言
- [ ] 弹窗/对话框的打开关闭是否有测试

### 常见反模式

```ts
// ❌ 不足：只测了渲染，没测交互
it('renders', () => {
  const wrapper = mount(MyComponent)
  expect(wrapper.html()).toContain('标题')
})

// ✅ 正确：测试交互和结果
it('emits confirm on button click', async () => {
  const wrapper = mount(MyComponent)
  await wrapper.find('button').trigger('click')
  expect(wrapper.emitted('confirm')).toBeTruthy()
})
```

---

## 测试与代码同步

- [ ] 修改了组件/函数后，相关测试是否同步更新
- [ ] 删除了功能后，对应的测试是否被清理（避免死测试）
- [ ] 重命名了文件/函数后，测试引用是否正确
- [ ] 改了类型定义后，测试中的 mock 数据是否仍然合法

### 常见反模式

```ts
// ❌ 危险：改了 Props 但测试没更新，测试还在用旧接口
// ❌ 危险：功能已删除但测试还在跑，浪费 CI 时间
```

---

## 测试质量

- [ ] 测试名称是否清晰描述了测试场景
- [ ] 断言是否具体（避免 `toBeTruthy()` 代替精确值）
- [ ] 测试之间是否独立，没有隐式依赖执行顺序
- [ ] 是否避免了过于宽泛的 mock（mock 掉了整个模块导致测不到集成问题）
- [ ] 异步测试是否正确等待（`await`、`waitFor`、`flushPromises`）

### 常见反模式

```ts
// ❌ 不足：断言过于宽泛
expect(result).toBeTruthy()

// ✅ 正确：精确断言
expect(result).toEqual({ id: '1', name: 'test' })

// ❌ 危险：测试之间有依赖
let sharedValue = 0
beforeEach(() => { sharedValue++ })
// 如果执行顺序变化，测试可能失败
```

---

## 自问清单

- "这个 Bug 修复有对应的回归测试吗？"
- "这个复杂 computed/函数，我敢在不运行应用的情况下重构它吗？"
- "改了代码后，测试还能给我信心吗？"
- "这个测试如果失败了，我能快速定位问题吗？"
