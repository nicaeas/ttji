// pages/share/share.js — 云端分享查看页
var shareService = require('../../services/share');

Page({
  data: {
    shareId: '',
    title: '',
    content: '',
    mood: '',
    createdAt: '',
    loading: true,
    notFound: false,
    expired: false
  },

  onLoad: function (options) {
    var shareId = options.shareId || options.id || '';
    if (!shareId) {
      this.setData({ loading: false, notFound: true });
      return;
    }
    this.setData({ shareId: shareId });
    this.loadShare(shareId);
  },

  loadShare: function (shareId) {
    var that = this;
    shareService.getShareContent(shareId).then(function (data) {
      that.setData({
        title: data.title || '分享的日记',
        content: data.content || '',
        mood: data.mood || '',
        createdAt: data.createdAt || '',
        loading: false
      });
    }).catch(function (err) {
      that.setData({
        loading: false,
        notFound: err.code === 404,
        expired: err.message && err.message.indexOf('过期') > -1
      });
    });
  },

  // 引导用户打开小程序首页
  goToApp: function () {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onShareAppMessage: function () {
    var that = this;
    return {
      title: that.data.title || '天天记 · 日记',
      path: '/pages/share/share?shareId=' + that.data.shareId
    };
  }
});
