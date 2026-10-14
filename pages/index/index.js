const store = require('../../utils/store')
const util = require('../../utils/util')
const files = require('../../utils/files')

// 列表展示时把待办语法替换为可读符号
function displayContent(content) {
  return (content || '')
    .replace(/- \[x\] ?/g, '☑ ')
    .replace(/- \[ \] ?/g, '☐ ')
}

Page({
  data: {
    keyword: '',
    activeTag: '',
    activeMonth: '',
    todayMonth: '',
    notes: [], // 渲染用视图列表（已筛选、已排序）
    total: 0,
    tags: [],
    binCount: 0
  },

  onLoad() {
    this.setData({ todayMonth: util.monthKey(Date.now()) })
  },

  onShow() {
    // 从编辑页/回收站返回时刷新，保证数据最新
    this.refreshList()
  },

  // 读取存储，按 标签 + 月份 + 关键词 过滤后排序渲染
  refreshList() {
    const { keyword, activeTag, activeMonth } = this.data
    const all = store.getAll()

    let notes = all
    if (activeTag) {
      notes = notes.filter(n => (n.tags || []).indexOf(activeTag) !== -1)
    }
    if (activeMonth) {
      notes = notes.filter(n => util.monthKey(n.createdAt) === activeMonth)
    }
    const kw = keyword.trim().toLowerCase()
    if (kw) {
      notes = notes.filter(
        n =>
          (n.title || '').toLowerCase().indexOf(kw) !== -1 ||
          (n.content || '').toLowerCase().indexOf(kw) !== -1 ||
          (n.tags || []).join('\u0001').toLowerCase().indexOf(kw) !== -1
      )
    }

    notes = store.sortByDisplayOrder(notes).map(n => {
      const images = n.images || []
      const tags = n.tags || []
      return {
        id: n.id,
        title: n.title || '无标题',
        tags: tags.slice(0, 3),
        moreTags: Math.max(0, tags.length - 3),
        summary: util.extractSummary(displayContent(n.content), 60),
        timeText: util.formatTime(n.updatedAt),
        pinned: n.pinned,
        thumb: files.displaySrc(images[0]),
        imageCount: images.length,
        audioCount: (n.audio || []).length
      }
    })

    this.setData({
      notes,
      tags: store.tagStats(false),
      binCount: store.getBinCount(),
      total: all.length
    })
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
    this.refreshList()
  },

  onClearKeyword() {
    this.setData({ keyword: '' })
    this.refreshList()
  },

  // 点击标签 chip：选中/切换；点击「全部」清空
  onTagTap(e) {
    this.setData({ activeTag: e.currentTarget.dataset.tag || '' })
    this.refreshList()
  },

  // 长按标签：删除（从预设与所有笔记中移除该标签）
  onTagLongPress(e) {
    const name = e.currentTarget.dataset.tag
    wx.showModal({
      title: '删除标签 #' + name,
      content: '将从预设和所有笔记中移除该标签，确定删除吗？',
      confirmText: '删除',
      confirmColor: '#E5484D',
      success: res => {
        if (!res.confirm) return
        store.deleteTag(name)
        if (this.data.activeTag === name) this.setData({ activeTag: '' })
        this.refreshList()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },

  onMonthChange(e) {
    this.setData({ activeMonth: e.detail.value })
    this.refreshList()
  },

  onClearMonth() {
    this.setData({ activeMonth: '' })
    this.refreshList()
  },

  onCreate() {
    wx.navigateTo({ url: '/pages/edit/edit' })
  },

  onNoteTap(e) {
    wx.navigateTo({ url: '/pages/edit/edit?id=' + e.currentTarget.dataset.id })
  },

  onOpenRecycle() {
    wx.navigateTo({ url: '/pages/recycle/recycle' })
  },

  onOpenData() {
    wx.navigateTo({ url: '/pages/data/data' })
  },

  // 长按卡片：置顶 / 分享为图片 / 删除
  onNoteLongPress(e) {
    const id = e.currentTarget.dataset.id
    const note = store.getById(id)
    if (!note) return
    wx.showActionSheet({
      itemList: [note.pinned ? '取消置顶' : '置顶', '分享为图片', '删除笔记'],
      success: res => {
        if (res.tapIndex === 0) {
          store.togglePin(id)
          this.refreshList()
        } else if (res.tapIndex === 1) {
          wx.navigateTo({ url: '/pages/share/share?id=' + id })
        } else if (res.tapIndex === 2) {
          this.confirmDelete(id)
        }
      }
    })
  },

  // 删除为软删除，可在回收站恢复
  confirmDelete(id) {
    wx.showModal({
      title: '删除笔记',
      content: '笔记将移入回收站，确定删除吗？',
      confirmText: '删除',
      confirmColor: '#E5484D',
      success: res => {
        if (res.confirm) {
          store.softDelete(id)
          this.refreshList()
          wx.showToast({ title: '已移入回收站', icon: 'none' })
        }
      }
    })
  }
})
