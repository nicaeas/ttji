/**
 * 通用工具函数：ID 生成、时间格式化、摘要提取、月份键
 */

// 生成笔记唯一 ID：时间戳(36进制) + 随机串，避免同一毫秒内重复
function createId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

// 人性化时间：今天 HH:mm / 昨天 HH:mm / M月D日 HH:mm / YYYY年M月D日
function formatTime(ts) {
  const now = new Date()
  const d = new Date(ts)
  const pad = n => (n < 10 ? '0' + n : '' + n)

  const startOfDay = date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const dayMs = 24 * 60 * 60 * 1000
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / dayMs)

  const hm = pad(d.getHours()) + ':' + pad(d.getMinutes())
  if (diffDays === 0) return hm
  if (diffDays === 1) return '昨天 ' + hm
  if (d.getFullYear() === now.getFullYear()) {
    return d.getMonth() + 1 + '月' + d.getDate() + '日 ' + hm
  }
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日'
}

// 月份键：YYYY-MM，用于按月份筛选
function monthKey(ts) {
  const d = new Date(ts)
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
}

// 判空：除常规空白外，全角空格、不换行空格、零宽字符也视为空
function isBlank(text) {
  return !String(text || '').replace(/[\s\u3000\u00A0\u200B]/g, '')
}

// 列表摘要：压缩空白后截取前 maxLen 字
function extractSummary(content, maxLen) {
  const text = (content || '').replace(/\s+/g, ' ').trim()
  if (!text) return '暂无正文'
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

module.exports = { createId, formatTime, monthKey, isBlank, extractSummary }
