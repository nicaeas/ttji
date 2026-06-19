// components/mood-icon/mood-icon.js
// 心情图标组件 - 显示心情 emoji/图片 + 标签

var moodService = require('../../services/mood');

Component({
  properties: {
    // 心情 ID
    mood: {
      type: String,
      value: '',
    },
    // 尺寸: sm | md | lg
    size: {
      type: String,
      value: 'md',
    },
    // 是否显示文字标签
    showLabel: {
      type: Boolean,
      value: true,
    },
    // 是否为选中状态
    selected: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    moodData: null,
  },

  observers: {
    'mood': function (newMood) {
      var moodData = moodService.findMood(newMood) || null;
      this.setData({ moodData: moodData });
    },
  },

  lifetimes: {
    attached() {
      var moodData = moodService.findMood(this.data.mood) || null;
      this.setData({ moodData: moodData });
    },
  },

  methods: {
    onTap() {
      if (this.data.moodData) {
        this.triggerEvent('tap', { mood: this.data.moodData });
      }
    },
  },
});
