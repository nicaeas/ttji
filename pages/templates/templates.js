const templates = require('../../utils/templates')

// 模板内容预览：取首个非空行，截断
function previewOf(content) {
  const first = (content || '').split('\n').find(l => l.trim()) || '（空模板）'
  return first.length > 30 ? first.slice(0, 30) + '…' : first
}

Page({
  data: {
    list: []
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const list = templates.getAllTemplates().map(t =>
      Object.assign({}, t, { preview: previewOf(templates.getContent(t.id)) })
    )
    this.setData({ list })
  },

  // 新建（无 id）或编辑（内置/自定义）均跳转独立编辑页
  onOpenEdit(e) {
    const id = (e.currentTarget && e.currentTarget.dataset.id) || ''
    wx.navigateTo({ url: '/pages/template-edit/template-edit' + (id ? '?id=' + id : '') })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除模板',
      content: '确定删除该自定义模板吗？',
      confirmText: '删除',
      confirmColor: '#E5484D',
      success: res => {
        if (res.confirm) {
          templates.removeCustom(id)
          this.refresh()
        }
      }
    })
  }
})
