const store = require('./utils/store')

App({
  onLaunch() {
    // 首次启动：把内置日记（data/seed-diary.js）播种到本地存储。
    // 仅在本地无数据时全量写入；已有数据时只补齐缺失记录，不覆盖用户改动。
    try {
      const stat = store.seedOnce()
      if (stat && stat.added) {
        console.log('[天天记] 已导入内置日记 %d 篇，本地共 %d 篇', stat.added, stat.total)
      }
    } catch (e) {
      console.warn('[天天记] 内置日记播种失败', e)
    }
  },
  globalData: {}
})