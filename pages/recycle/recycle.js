const store = require('../../utils/store')
const util = require('../../utils/util')
const files = require('../../utils/files')

Page({
  data: {
    notes: []
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const notes = store.getBin().map(n => ({
      id: n.id,
      title: n.title || '无标题',
      summary: util.extractSummary(n.content, 50),
      deletedText: util.formatTime(n.deletedAt),
      imageCount: (n.images || []).length,
      audioCount: (n.audio || []).length
    }))
    this.setData({ notes })
  },

  // 清理某条笔记的附件文件
  cleanupFiles(note) {
    if (!note) return
    const paths = (note.images || []).slice()
    ;(note.audio || []).forEach(a => paths.push(a.path))
    files.deleteFiles(paths)
  },

  onRestore(e) {
    store.restore(e.currentTarget.dataset.id)
    this.refresh()
    wx.showToast({ title: '已恢复', icon: 'success' })
  },

  onPurge(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '彻底删除',
      content: '删除后无法恢复，确定删除吗？',
      confirmText: '删除',
      confirmColor: '#E5484D',
      success: res => {
        if (res.confirm) {
          this.cleanupFiles(store.purge(id))
          this.refresh()
        }
      }
    })
  },

  onClear() {
    if (!this.data.notes.length) return
    wx.showModal({
      title: '清空回收站',
      content: '回收站内所有笔记将被彻底删除，无法恢复。',
      confirmText: '清空',
      confirmColor: '#E5484D',
      success: res => {
        if (res.confirm) {
          const removed = store.clearBin()
          if (removed) removed.forEach(n => this.cleanupFiles(n))
          this.refresh()
        }
      }
    })
  }
})
