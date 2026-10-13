const templates = require('../../utils/templates')
const util = require('../../utils/util')

Page({
  data: {
    id: '', // 空 = 新建自定义模板
    isBuiltin: false,
    overridden: false,
    name: '',
    content: ''
  },

  onLoad(options) {
    const id = (options && options.id) || ''
    if (id) {
      const custom = templates.getCustom().find(t => t.id === id)
      if (custom) {
        this.setData({ id, name: custom.name, content: custom.content })
        wx.setNavigationBarTitle({ title: '编辑模板' })
        return
      }
      const builtin = templates.getBuiltin(id)
      if (builtin) {
        this.setData({
          id,
          name: builtin.name,
          content: builtin.content,
          isBuiltin: true,
          overridden: builtin.overridden
        })
        wx.setNavigationBarTitle({ title: '编辑内置模板' })
        return
      }
    }
    wx.setNavigationBarTitle({ title: '新建模板' })
  },

  // 与笔记编辑页一致：输入直写 data，避免真机输入法回显丢字
  onNameInput(e) {
    this.data.name = e.detail.value
  },

  onContentInput(e) {
    this.data.content = e.detail.value
  },

  onSave() {
    const { isBuiltin, id } = this.data
    const name = this.data.name || ''
    const content = this.data.content || ''
    if (util.isBlank(name)) {
      wx.showToast({ title: '请填写模板名称', icon: 'none' })
      return
    }
    if (util.isBlank(content)) {
      wx.showToast({ title: '请填写模板内容', icon: 'none' })
      return
    }
    const ok = isBuiltin
      ? templates.updateBuiltin(id, { name, content })
      : id
        ? templates.updateCustom(id, { name, content })
        : templates.addCustom({ name, content })
    if (!ok) return
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 600)
  },

  onDelete() {
    wx.showModal({
      title: '删除模板',
      content: '确定删除该自定义模板吗？',
      confirmText: '删除',
      confirmColor: '#E5484D',
      success: res => {
        if (res.confirm) {
          templates.removeCustom(this.data.id)
          wx.showToast({ title: '已删除', icon: 'none' })
          setTimeout(() => wx.navigateBack(), 600)
        }
      }
    })
  },

  // 仅内置模板且已有修改时显示
  onReset() {
    wx.showModal({
      title: '恢复默认',
      content: '将放弃对该内置模板的修改，确定恢复吗？',
      confirmText: '恢复',
      success: res => {
        if (res.confirm) {
          templates.resetBuiltin(this.data.id)
          wx.showToast({ title: '已恢复默认', icon: 'none' })
          setTimeout(() => wx.navigateBack(), 600)
        }
      }
    })
  }
})
