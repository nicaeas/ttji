/**
 * 笔记数据存取层：封装本地存储 CRUD（含标签、附件、软删除）
 * 页面层不直接读写 wx.storage，便于后续版本切换云开发
 */
const NOTES_KEY = 'notes'
const PRESET_TAGS_KEY = 'preset_tags'
const DEFAULT_PRESET_TAGS = ['日记', '待办', '灵感', '工作', '学习', '生活']
const { createId } = require('./util')

// 从显式标签 + 正文 #标签 中提取，去重、去 # 前缀，最多 10 个
function normalizeTags(tags, content) {
  const result = []
  const push = t => {
    t = String(t || '').trim().replace(/^#+/, '').trim()
    if (t && result.indexOf(t) === -1) result.push(t)
  }
  ;(tags || []).forEach(push)
  const re = /#([^\s#]+)/g
  let m
  while ((m = re.exec(content || ''))) push(m[1])
  return result.slice(0, 10)
}

// 读取全部笔记；默认过滤回收站，includeDeleted=true 时含已删除
function getAll(includeDeleted) {
  try {
    const list = wx.getStorageSync(NOTES_KEY)
    const arr = Array.isArray(list) ? list : []
    return includeDeleted ? arr : arr.filter(n => !n.deletedAt)
  } catch (e) {
    return []
  }
}

// 全量写入
function saveAll(list) {
  try {
    wx.setStorageSync(NOTES_KEY, list)
    return true
  } catch (e) {
    wx.showToast({ title: '保存失败，存储空间可能不足', icon: 'none' })
    return false
  }
}

// 按 ID 查找（含回收站中的笔记）
function getById(id) {
  return getAll(true).find(note => note.id === id) || null
}

// 新建笔记，返回新建对象；失败返回 null
function add(data) {
  const now = Date.now()
  const note = {
    id: createId(),
    title: (data.title || '').trim(),
    content: data.content || '',
    tags: normalizeTags(data.tags, data.content),
    images: data.images || [],
    audio: data.audio || [],
    pinned: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  }
  const list = getAll(true)
  list.unshift(note)
  return saveAll(list) ? note : null
}

// 更新笔记，返回更新后的对象；不存在或失败返回 null
function update(id, data) {
  const list = getAll(true)
  const note = list.find(n => n.id === id)
  if (!note) return null
  note.title = (data.title || '').trim()
  note.content = data.content || ''
  note.tags = normalizeTags(data.tags, data.content)
  note.images = data.images || []
  note.audio = data.audio || []
  note.updatedAt = Date.now()
  return saveAll(list) ? note : null
}

// 软删除：移入回收站
function softDelete(id) {
  const list = getAll(true)
  const note = list.find(n => n.id === id)
  if (!note) return false
  note.deletedAt = Date.now()
  note.pinned = false
  return saveAll(list)
}

// 从回收站恢复
function restore(id) {
  const list = getAll(true)
  const note = list.find(n => n.id === id)
  if (!note) return false
  note.deletedAt = null
  return saveAll(list)
}

// 彻底删除单条，返回被删笔记（页面据此清理附件文件）；找不到返回 null
function purge(id) {
  const list = getAll(true)
  const idx = list.findIndex(n => n.id === id)
  if (idx === -1) return null
  const removed = list.splice(idx, 1)[0]
  return saveAll(list) ? removed : null
}

// 清空回收站，返回被删笔记数组；失败返回 null
function clearBin() {
  const list = getAll(true)
  const removed = list.filter(n => n.deletedAt)
  if (!removed.length) return []
  return saveAll(list.filter(n => !n.deletedAt)) ? removed : null
}

// 回收站列表（按删除时间倒序）
function getBin() {
  return getAll(true)
    .filter(n => n.deletedAt)
    .sort((a, b) => b.deletedAt - a.deletedAt)
}

function getBinCount() {
  return getBin().length
}

// 标签统计与排序：常用（次数多）在前，其次最近（最近使用时间新）在前
// includeUnusedPresets=true 时附带未被使用的预设标签（供编辑页点选池）
function tagStats(includeUnusedPresets) {
  const stats = {}
  getAll().forEach(n => {
    const ts = n.updatedAt
    ;(n.tags || []).forEach(t => {
      if (!stats[t]) stats[t] = { name: t, count: 0, lastUsedAt: 0 }
      stats[t].count++
      if (ts > stats[t].lastUsedAt) stats[t].lastUsedAt = ts
    })
  })
  if (includeUnusedPresets) {
    getPresetTags().forEach(t => {
      if (!stats[t]) stats[t] = { name: t, count: 0, lastUsedAt: 0 }
    })
  }
  return Object.keys(stats)
    .map(k => stats[k])
    .sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count
      return b.lastUsedAt - a.lastUsedAt
    })
}

// 删除标签：从预设与所有笔记（含回收站）的标签中移除；正文 #标签 原文不动
function deleteTag(name) {
  const presets = getPresetTags()
  const idx = presets.indexOf(name)
  if (idx !== -1) {
    presets.splice(idx, 1)
    if (!savePresetTags(presets)) return false
  }
  const list = getAll(true)
  let changed = false
  list.forEach(n => {
    if (n.tags && n.tags.indexOf(name) !== -1) {
      n.tags = n.tags.filter(t => t !== name)
      changed = true
    }
  })
  if (changed && !saveAll(list)) return false
  return true
}

// 切换置顶，返回更新后的对象
function togglePin(id) {
  const list = getAll(true)
  const note = list.find(n => n.id === id)
  if (!note) return null
  note.pinned = !note.pinned
  return saveAll(list) ? note : null
}

// 预设标签：默认一组，存于本地可被替换（供编辑页快捷点选）；空数组视为已自定义清空
function getPresetTags() {
  try {
    const list = wx.getStorageSync(PRESET_TAGS_KEY)
    if (Array.isArray(list)) return list
  } catch (e) { /* 未存储过时用默认 */ }
  return DEFAULT_PRESET_TAGS.slice()
}

function savePresetTags(list) {
  try {
    wx.setStorageSync(PRESET_TAGS_KEY, list)
    return true
  } catch (e) {
    return false
  }
}

// 列表排序：置顶优先，其余按最后编辑时间倒序
function sortByDisplayOrder(list) {
  return list.slice().sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.updatedAt - a.updatedAt
  })
}

module.exports = {
  getAll, getById, add, update,
  softDelete, restore, purge, clearBin, getBin, getBinCount,
  tagStats, getPresetTags, savePresetTags, deleteTag, togglePin, sortByDisplayOrder
}
