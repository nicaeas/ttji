/**
 * 离线校验：不依赖微信环境，验证
 *   1) store 的 importNotes / seedOnce / exportAll 行为正确
 *   2) 种子数据 47 篇日记完整无损（标题、正文、时间、分类标签）
 * 运行：node tools/verify_seed.js
 */
const path = require('path')
const assert = require('assert')

/* ---------- mock 微信存储 ---------- */
const mem = {}
global.wx = {
  getStorageSync: k => (k in mem ? mem[k] : ''),
  setStorageSync: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)) },
  removeStorageSync: k => { delete mem[k] },
  showToast: () => {}
}

const ROOT = path.join(__dirname, '..')
const store = require(path.join(ROOT, 'utils', 'store.js'))
const seed = require(path.join(ROOT, 'data', 'seed-diary.js'))
const src = require(process.argv[2] || path.join('C:\\', 'Users', 'hh757', 'Desktop', '贴贴密笺_2026-10-14_补全.json'))

let pass = 0
function ok(name) { pass++; console.log('  ✓', name) }

/* ---------- 1. 首次播种 ---------- */
console.log('\n[1] 首次启动播种')
const stat = store.seedOnce()
assert(stat, 'seedOnce 应返回统计')
assert.strictEqual(stat.added, seed.notes.length, '应全部新增')
assert.strictEqual(stat.skipped, 0)
assert.strictEqual(stat.added + stat.updated + stat.skipped, stat.total)
assert.strictEqual(store.getAll(true).length, seed.notes.length, '本地应有 47 篇')
ok(`播种 ${stat.added} 篇，本地共 ${stat.total} 篇`)

/* ---------- 2. 重复播种幂等 ---------- */
console.log('\n[2] 重复播种幂等性')
assert.strictEqual(store.seedOnce(), null, '第二次应直接返回 null（已标记）')
assert.strictEqual(store.getAll(true).length, seed.notes.length, '不应重复写入')
ok('二次启动不产生重复数据')

const stat2 = store.reseed()
assert.strictEqual(stat2.added, 0, 'reseed 不应新增已存在的')
assert.strictEqual(stat2.skipped, seed.notes.length)
assert.strictEqual(store.getAll(true).length, seed.notes.length)
ok('reseed 全部跳过，数量不变')

/* ---------- 3. 与源文件逐条比对 ---------- */
console.log('\n[3] 与源 JSON 逐字段比对')
const cats = {}
src.categories.forEach(c => { cats[c.id] = c.name })
const local = {}
store.getAll(true).forEach(n => { local[n.id] = n })

assert.strictEqual(Object.keys(local).length, src.notes.length, '笔记条数应一致')
let charTotal = 0
src.notes.forEach(n => {
  const l = local[n.id]
  assert(l, '缺少笔记 ' + n.title)
  assert.strictEqual(l.title, n.title, '标题不一致: ' + n.title)
  assert.strictEqual(l.content, n.content, '正文不一致: ' + n.title)
  assert.strictEqual(l.pinned, !!n.is_pinned, '置顶不一致: ' + n.title)
  charTotal += n.content.length

  // 时间戳应与源 ISO 本地时间等价
  const [d, t] = n.created_at.split('T')
  const [Y, M, D] = d.split('-').map(Number)
  const [h, mi, s] = t.split(':').map(Number)
  const expect = new Date(Y, M - 1, D, h, mi, s).getTime()
  assert.strictEqual(l.createdAt, expect, '创建时间不一致: ' + n.title)

  // 分类应落在标签里
  const cat = cats[n.category_id]
  assert(l.tags.indexOf(cat) !== -1, '缺少分类标签 ' + cat + ': ' + n.title)
  assert.strictEqual(l.deletedAt, null, '不应有删除标记: ' + n.title)
})
ok(`${src.notes.length} 篇标题/正文/时间/分类标签全部一致`)
ok(`正文字符合计 ${charTotal}`)

/* ---------- 4. 排序与展示 ---------- */
console.log('\n[4] 列表排序与展示')
const sorted = store.sortByDisplayOrder(store.getAll())
assert.strictEqual(sorted.length, 47)
for (let i = 1; i < sorted.length; i++) {
  assert(sorted[i - 1].updatedAt >= sorted[i].updatedAt, '应按更新时间倒序')
}
ok('47 篇按最后编辑时间倒序排列')
const stats = store.tagStats(false)
ok('标签统计: ' + stats.map(t => `${t.name}(${t.count})`).join(' '))
assert(stats.find(t => t.name === '生活' && t.count === 45), '生活应为 45 篇')
assert(stats.find(t => t.name === '重要' && t.count === 1))
assert(stats.find(t => t.name === '工作' && t.name && t.count === 1))

/* ---------- 5. 月份筛选覆盖 ---------- */
console.log('\n[5] 月份分布')
const months = {}
store.getAll().forEach(n => {
  const d = new Date(n.createdAt)
  const k = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
  months[k] = (months[k] || 0) + 1
})
console.log('   ', JSON.stringify(months))
assert.strictEqual(Object.values(months).reduce((a, b) => a + b, 0), 47)
ok('月份分布合计 47 篇')

/* ---------- 6. 导出再导入（往返一致） ---------- */
console.log('\n[6] 导出 → 清空 → 再导入 往返一致')
const backup = store.exportAll()
assert.strictEqual(backup.notes.length, 47)
mem.notes = []
assert.strictEqual(store.getAll(true).length, 0, '应已清空')
const back = store.importNotes(backup.notes, 'skip')
assert.strictEqual(back.added, 47)
store.getAll(true).forEach(n => {
  const o = src.notes.find(s => s.id === n.id)
  assert.strictEqual(n.content, o.content, '往返后正文变化: ' + n.title)
  assert.strictEqual(n.title, o.title)
})
ok('导出→清空→导入后 47 篇内容完全一致')

/* ---------- 7. 覆盖 / 跳过 模式 ---------- */
console.log('\n[7] 导入模式')
const r1 = store.importNotes(backup.notes, 'skip')
assert.strictEqual(r1.added, 0); assert.strictEqual(r1.skipped, 47)
ok('skip 模式：0 新增 / 47 跳过')
const mutated = backup.notes.map(n => Object.assign({}, n, { content: n.content + '\n[本地改动]' }))
const r2 = store.importNotes(mutated, 'overwrite')
assert.strictEqual(r2.updated, 47)
ok('overwrite 模式：47 条被更新')
assert(store.getAll(true)[0].content.indexOf('[本地改动]') !== -1)
store.importNotes(backup.notes, 'overwrite')
ok('已还原为原始内容')

/* ---------- 8. 编辑一篇笔记后不被播种覆盖 ---------- */
console.log('\n[8] 用户编辑保护')
const target = store.getAll(true)[0]
store.update(target.id, { title: target.title, content: target.content + '\n我加的一行', tags: target.tags, images: [], audio: [] })
store.reseed()
const after = store.getById(target.id)
assert(after.content.indexOf('我加的一行') !== -1, '本地编辑不应被覆盖')
assert.strictEqual(store.getAll(true).length, 47)
ok('本地编辑内容保留，篇数仍为 47')

console.log(`\n全部通过：${pass} 项断言组\n`)