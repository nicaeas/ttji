/**
 * 快速模板：内置模板（可修改，覆盖配置存于本地）+ 自定义模板（存于本地 custom_templates）
 */
const CUSTOM_KEY = 'custom_templates'
const OVERRIDE_KEY = 'builtin_overrides'
const { createId } = require('./util')

const BUILTIN = [
  { id: 'diary', icon: '📔', name: '日记' },
  { id: 'todo', icon: '✅', name: '待办清单' },
  { id: 'meeting', icon: '🗒️', name: '会议纪要' }
]

function todayText() {
  const d = new Date()
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 星期' + '日一二三四五六'[d.getDay()]
}

function getBuiltinContent(id) {
  switch (id) {
    case 'diary':
      return todayText() + '\n\n🌤 心情：\n\n📌 今日要事：\n- \n\n✨ 今日感想：\n'
    case 'todo':
      return '- [ ] \n- [ ] \n- [ ] '
    case 'meeting':
      return '📅 主题：\n👥 参与人：\n\n📌 结论：\n- \n\n✅ 待办事项：\n- [ ] \n'
    default:
      return ''
  }
}

/* ---------- 内置模板的用户修改（覆盖配置，可恢复默认） ---------- */

function getOverrides() {
  try {
    const m = wx.getStorageSync(OVERRIDE_KEY)
    return m && typeof m === 'object' ? m : {}
  } catch (e) {
    return {}
  }
}

function saveOverrides(m) {
  try {
    wx.setStorageSync(OVERRIDE_KEY, m)
    return true
  } catch (e) {
    wx.showToast({ title: '保存失败，存储空间可能不足', icon: 'none' })
    return false
  }
}

// 单个内置模板的当前状态：有覆盖用覆盖，否则用默认
function getBuiltin(id) {
  const base = BUILTIN.find(t => t.id === id)
  if (!base) return null
  const ov = getOverrides()[id]
  return {
    id: base.id,
    icon: base.icon,
    name: (ov && ov.name) || base.name,
    content: ov ? ov.content : getBuiltinContent(id),
    builtin: true,
    overridden: !!ov
  }
}

function updateBuiltin(id, data) {
  const base = BUILTIN.find(t => t.id === id)
  if (!base) return null
  const m = getOverrides()
  m[id] = {
    name: (data.name || '').trim() || base.name,
    content: data.content || ''
  }
  return saveOverrides(m) ? getBuiltin(id) : null
}

function resetBuiltin(id) {
  const m = getOverrides()
  if (!m[id]) return true
  delete m[id]
  return saveOverrides(m)
}

/* ---------- 自定义模板 ---------- */

function getCustom() {
  try {
    const list = wx.getStorageSync(CUSTOM_KEY)
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

function saveCustomList(list) {
  try {
    wx.setStorageSync(CUSTOM_KEY, list)
    return true
  } catch (e) {
    wx.showToast({ title: '保存失败，存储空间可能不足', icon: 'none' })
    return false
  }
}

function addCustom(data) {
  const list = getCustom()
  const tpl = {
    id: 'c' + createId(),
    name: (data.name || '').trim(),
    content: data.content || '',
    builtin: false
  }
  list.unshift(tpl)
  return saveCustomList(list) ? tpl : null
}

function updateCustom(id, data) {
  const list = getCustom()
  const tpl = list.find(t => t.id === id)
  if (!tpl) return null
  tpl.name = (data.name || '').trim()
  tpl.content = data.content || ''
  return saveCustomList(list) ? tpl : null
}

function removeCustom(id) {
  const list = getCustom()
  const next = list.filter(t => t.id !== id)
  if (next.length === list.length) return false
  return saveCustomList(next)
}

/* ---------- 汇总 ---------- */

// 编辑页模板条 + 管理页列表：内置（含覆盖后的名称）+ 自定义
function getAllTemplates() {
  return BUILTIN.map(t => {
    const b = getBuiltin(t.id)
    return { id: b.id, icon: b.icon, name: b.name, builtin: true, overridden: b.overridden }
  }).concat(
    getCustom().map(t => ({ id: t.id, icon: '📄', name: t.name, builtin: false, overridden: false }))
  )
}

// 按模板 ID 取内容：自定义优先，其次内置（含覆盖），找不到返回空
function getContent(id) {
  const custom = getCustom().find(t => t.id === id)
  if (custom) return custom.content
  const b = getBuiltin(id)
  return b ? b.content : ''
}

module.exports = {
  BUILTIN, getBuiltin, updateBuiltin, resetBuiltin,
  getCustom, addCustom, updateCustom, removeCustom,
  getAllTemplates, getContent
}
