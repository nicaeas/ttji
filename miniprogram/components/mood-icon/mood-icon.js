// components/mood-icon/mood-icon.js
// 心情图标组件 - 显示心情 emoji + 标签

const { MOODS } = require('../../utils/constants');

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
      const moodData = MOODS.find((m) => m.id === newMood) || null;
      this.setData({ moodData });
    },
  },

  lifetimes: {
    attached() {
      const moodData = MOODS.find((m) => m.id === this.data.mood) || null;
      this.setData({ moodData });
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
