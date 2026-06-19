// pages/about/about.js - 关于页面

const { getDiaryStats } = require('../../utils/storage');
const { request } = require('../../utils/request');
const ad = require('../../utils/ad');

Page({
  data: {
    version: '1.1.0',
    stats: null,
    cloudSyncActive: false,
    cloudSyncExpires: '',
    features: [
      { icon: '📝', title: 'Markdown 写作', desc: '支持标题、粗体、斜体、列表、代码块、引用、图片等常用语法' },
      { icon: '😊', title: '心情记录', desc: '10 种内置心情 + 自定义心情图标，捕捉每一天的情绪色彩' },
      { icon: '📂', title: '分类管理', desc: '自定义分类，让日记井井有条' },
      { icon: '📋', title: '丰富模板', desc: '8 种预设模板 + 自定义模板，快速开始写作' },
      { icon: '☁️', title: '云同步', desc: '日记云端备份，换机不丢数据' },
      { icon: '📤', title: '分享日记', desc: '生成精美卡片或云端链接，与好友分享你的日记' },
      { icon: '🔍', title: '搜索筛选', desc: '按关键词、心情、分类快速找到回忆' },
    ],
  },

  onShow() {
    const stats = getDiaryStats();
    this.setData({ stats });
    this.loadCloudStatus();
  },

  loadCloudStatus() {
    const that = this;
    request({ url: '/user/cloud-status', method: 'GET' }).then(function (res) {
      var expires = res.expiresAt ? new Date(res.expiresAt).toLocaleDateString() : '';
      that.setData({
        cloudSyncActive: res.active,
        cloudSyncExpires: expires
      });
      // 缓存到期时间供云同步服务使用
      if (res.active) {
        wx.setStorageSync('cloud_sync_expires', res.expiresAt);
      }
    }).catch(function () {
      // 离线检查本地缓存
      var expires = wx.getStorageSync('cloud_sync_expires');
      if (expires) {
        that.setData({
          cloudSyncActive: new Date(expires) > new Date(),
          cloudSyncExpires: new Date(expires).toLocaleDateString()
        });
      }
    });
  },

  activateCloudSync() {
    const that = this;
    ad.gateWithAd('激活云同步', '观看视频即可激活 30 天云同步权益').then(function (watched) {
      if (!watched) return;
      request({ url: '/user/activate-cloud', method: 'POST' }).then(function (res) {
        wx.setStorageSync('cloud_sync_expires', res.expiresAt);
        that.setData({
          cloudSyncActive: true,
          cloudSyncExpires: new Date(res.expiresAt).toLocaleDateString()
        });
        wx.showToast({ title: '云同步已激活', icon: 'success' });
      }).catch(function () {
        wx.showToast({ title: '激活失败', icon: 'none' });
      });
    });
  },

  goToPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '天天记 - 记录生活的每一刻',
      path: '/pages/index/index',
    };
  },
});
