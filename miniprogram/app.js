// app.js - 天天记 · 日记小程序
App({
  onLaunch() {
    // 初始化本地存储
    this.initStorage();
    // 获取系统信息
    this.initSystemInfo();
    // 静默登录（不阻塞用户操作）
    this.silentLogin();
  },

  onShow() {
    // 小程序从后台恢复时，如果云同步有效则自动同步
    this.autoCloudSync();
  },

  silentLogin() {
    const { ensureLogin } = require('./utils/request');
    ensureLogin().then(() => {
      // 登录成功后自动云同步
      this.autoCloudSync();
    });
  },

  autoCloudSync() {
    const cloud = require('./services/cloud');
    if (!cloud.checkCloudStatus()) return; // 未激活云同步，跳过
    cloud.fullSync().catch(() => {}); // 静默失败，不打扰用户
  },

  initStorage() {
    // 确保必要的存储键存在
    const keys = {
      diaries: 'diaries',         // 日记列表
      categories: 'categories',   // 分类列表
      templates: 'templates',     // 自定义模板
    };

    if (!wx.getStorageSync(keys.diaries)) {
      wx.setStorageSync(keys.diaries, []);
    }
    if (!wx.getStorageSync(keys.categories)) {
      wx.setStorageSync(keys.categories, [
        { id: 'cat_1', name: '生活', icon: '🏠', color: '#8B7355' },
        { id: 'cat_2', name: '工作', icon: '💼', color: '#5B7B8A' },
        { id: 'cat_3', name: '学习', icon: '📚', color: '#6B8B5B' },
        { id: 'cat_4', name: '旅行', icon: '✈️', color: '#8B6B5B' },
        { id: 'cat_5', name: '心情', icon: '💭', color: '#8B5B7B' },
      ]);
    }
    if (!wx.getStorageSync(keys.templates)) {
      wx.setStorageSync(keys.templates, []);
    }
  },

  initSystemInfo() {
    try {
      const windowInfo = wx.getWindowInfo();
      const deviceInfo = wx.getDeviceInfo();
      const appBaseInfo = wx.getAppBaseInfo();

      this.globalData.systemInfo = Object.assign({}, windowInfo, deviceInfo, appBaseInfo);
      this.globalData.statusBarHeight = windowInfo.statusBarHeight || 0;
      this.globalData.screenWidth = windowInfo.screenWidth || 375;
      this.globalData.screenHeight = windowInfo.screenHeight || 667;
      this.globalData.pixelRatio = windowInfo.pixelRatio || 2;
      this.globalData.platform = deviceInfo.platform || '';
    } catch (e) {
      console.warn('initSystemInfo failed:', e);
    }
  },

  globalData: {
    userInfo: null,
    systemInfo: null,
    statusBarHeight: 0,
    screenWidth: 375,
    screenHeight: 667,
    pixelRatio: 2,
    platform: '',
  }
});
