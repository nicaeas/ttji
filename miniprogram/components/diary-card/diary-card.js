// components/diary-card/diary-card.js
// 日记卡片组件 - 列表页统一展示

const { MOODS } = require('../../utils/constants');
const { getPlainText } = require('../../utils/markdown');
const { getFriendlyDate, getRelativeTime } = require('../../utils/date');
const { getCategoryById } = require('../../utils/storage');

Component({
  properties: {
    diary: {
      type: Object,
      value: {},
      observer: 'onDiaryChange',
    },
    // 显示模式: list | compact
    mode: {
      type: String,
      value: 'list',
    },
  },

  data: {
    previewText: '',
    displayDate: '',
    moodData: null,
    categoryData: null,
  },

  methods: {
    onDiaryChange(diary) {
      if (!diary) return;

      // 提取纯文本预览
      const preview = getPlainText(diary.content || '');
      this.setData({
        previewText: preview.substring(0, 120),
        displayDate: getFriendlyDate(diary.createdAt),
        moodData: MOODS.find((m) => m.id === diary.mood) || null,
        categoryData: diary.categoryId ? getCategoryById(diary.categoryId) : null,
      });
    },

    onTap() {
      this.triggerEvent('tap', { diary: this.data.diary });
    },

    onLongPress() {
      this.triggerEvent('longpress', { diary: this.data.diary });
    },
  },

  lifetimes: {
    attached() {
      this.onDiaryChange(this.data.diary);
    },
  },
});
