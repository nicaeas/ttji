// components/markdown-view/markdown-view.js
// Markdown 渲染组件 - 将 Markdown 文本解析为结构化数据渲染

const { parseMarkdown } = require('../../utils/markdown');

Component({
  properties: {
    // Markdown 文本内容
    content: {
      type: String,
      value: '',
      observer: 'onContentChange',
    },
  },

  data: {
    tokens: [],
  },

  methods: {
    onContentChange(newVal) {
      if (newVal) {
        const tokens = parseMarkdown(newVal);
        this.setData({ tokens });
      } else {
        this.setData({ tokens: [] });
      }
    },
  },

  lifetimes: {
    attached() {
      if (this.data.content) {
        const tokens = parseMarkdown(this.data.content);
        this.setData({ tokens });
      }
    },
  },
});
