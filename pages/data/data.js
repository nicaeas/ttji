const store = require('../../utils/store')
const util = require('../../util')

const fs = wx.getFileSystemManager()

Page({
  data: {
    total: 0,
    active: 0,
    bin: 0,
    chars: 0,
    months: [],
    tags: [],
    seedInfo: ''
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const all = store.getAll(true)
    const activeList = all.filter(n => !n.deletedAt)
    const monthCount = {}
    activeList.forEach(n => {
      const k = util.monthKey(n.createdAt)
      monthCount[k] = (monthCount[k] || 0) + 1
    })
    const months = Object.keys(monthCount)
      .sort()
      .reverse()
      .map(k => ({ key: k, count: monthCount[k] }))

    this.setData({
      total: all.length,
      active: activeList.length,
      bin: all.length - activeList.length,
      chars: activeList.reduce((s, n) => s + (n.content || '').length, 0),
      months,
      tags: store.tagStats(false).slice(0, 20)
    })
  },

  /* ---------- 导出备份 ---------- */

  onExport() {
    wx.showLoading({ title: '导出中' })
    const data = store.exportAll()
    const text = JSON.stringify(data, null, 2)
    const filePath = `${wx.env.USER_DATA_PATH}/ttji-backup-${Date.now()}.json`
    fs.writeFile({
      filePath,
      data: text,
      encoding: 'utf8',
      success: () => {
        wx.hideLoading()
        wx.shareFileMessage({
          filePath,
          success: () => {},
          fail: err => {
            const msg = (err && err.errMsg) || ''
            if (msg.indexOf('cancel') === -1) {
              wx.showModal({
                title: '导出文件已保存',
                content: '当前微信版本不支持直接发送，已保存到小程序本地目录。',
                showCancel: false
              })
            }
          }
        })
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '导出失败', icon: 'none' })
      }
    })
  },

  /* ---------- 从微信聊天导入 JSON ---------- */

  onImport() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: res => {
        const f = (res.tempFiles || [])[0]
        if (!f) return
        fs.readFile({
          filePath: f.path,
          encoding: 'utf8',
          success: out => this.handleImportText(out.data),
          fail: () => wx.showToast({ title: '读取文件失败', icon: 'none' })
        })
      },
      fail: err => {
        const msg = (err && err.errMsg) || ''
        if (msg.indexOf('cancel') === -1) wx.showToast({ title: '未选择文件', icon: 'none' })
      }
    })
  },

  // 解析导入文件内容，先校验再询问覆盖策略
  handleImportText(text) {
    let payload
    try {
      payload = JSON.parse(text)
    } catch (e) {
      wx.showToast({ title: '不是有效的 JSON 文件', icon: 'none' })
      return
    }
    const list = Array.isArray(payload) ? payload : payload && payload.notes
    if (!Array.isArray(list) || !list.length) {
      wx.showToast({ title: '文件里没有笔记数据', icon: 'none' })
      return
    }

    const preview = list.slice(0, 8).map(n => n.title || '无标题').join('、')
    wx.showModal({
      title: `导入 ${list.length} 篇日记`,
      content: `包含：${preview}${list.length > 8 ? ' 等' : ''}\n\n选择导入方式：`,
      confirmText: '合并',
      cancelText: '覆盖同 ID',
      success: res => {
        if (res.confirm) this.doImport(list, 'skip')
        else if (res.cancel) this.doImport(list, 'overwrite')
      }
    })
  },

  doImport(list, mode) {
    wx.showLoading({ title: '导入中' })
    setTimeout(() => {
      const stat = store.importNotes(list, mode)
      wx.hideLoading()
      if (!stat) {
        wx.showToast({ title: '导入失败，存储空间可能不足', icon: 'none' })
        return
      }
      this.refresh()
      wx.showModal({
        title: '导入完成',
        content: `新增 ${stat.added} 篇，更新 ${stat.updated} 篇，跳过 ${stat.skipped} 篇。\n当前共 ${stat.total} 篇。`,
        showCancel: false
      })
    }, 30)
  },

  /* ---------- 补齐内置日记 ---------- */

  onReseed() {
    wx.showModal({
      title: '补齐内置日记',
      content: '会检查内置的 47 篇历史日记，把本地缺失的补进来；不会删除或覆盖你已有的笔记。',
      confirmText: '开始检查',
      success: res => {
        if (!res.confirm) return
        const stat = store.reseed()
        this.refresh()
        if (!stat) {
          wx.showToast({ title: '没有可补齐的内容', icon: 'none' })
          return
        }
        wx.showToast({ title: `新增 ${stat.added} 篇`, icon: 'none' })
      }
    })
  }
})