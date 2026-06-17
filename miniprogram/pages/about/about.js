// pages/about/about.js - 关于页面

const { getDiaryStats } = require('../../utils/storage');

Page({
  data: {
    version: '1.0.0',
    stats: null,
    features: [
      { icon: '📝', title: 'Markdown 写作', desc: '支持标题、粗体、斜体、列表、代码块、引用等常用语法' },
      { icon: '😊', title: '心情记录', desc: '10 种心情标签，捕捉每一天的情绪色彩' },
      { icon: '📂', title: '分类管理', desc: '自定义分类，让日记井井有条' },
      { icon: '📋', title: '丰富模板', desc: '8 种预设模板 + 自定义模板，快速开始写作' },
      { icon: '🔒', title: '本地存储', desc: '数据安全保存在本地，隐私无忧' },
      { icon: '🔍', title: '搜索筛选', desc: '按关键词、心情、分类快速找到回忆' },
    ],
  },

  onShow() {
    const stats = getDiaryStats();
    this.setData({ stats });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '天天记 - 记录生活的每一刻',
      path: '/pages/index/index',
    };
  },
});
