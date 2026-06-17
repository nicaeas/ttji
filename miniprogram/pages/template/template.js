// pages/template/template.js - 模板管理页

const { DEFAULT_TEMPLATES } = require('../../utils/constants');
const { getTemplates, saveTemplate, deleteTemplate } = require('../../utils/storage');
const { MOODS } = require('../../utils/constants');

Page({
  data: {
    // 预设模板
    presetTemplates: DEFAULT_TEMPLATES,

    // 用户自定义模板
    customTemplates: [],

    // 新建/编辑模板弹窗
    showEditor: false,
    editingTemplate: null,
    templateName: '',
    templateIcon: '📝',
    templateContent: '',
    templateMood: 'calm',

    // 心情选项
    moodOptions: MOODS,

    // 图标选项
    iconOptions: ['📝', '💭', '✈️', '💼', '🙏', '📚', '🔄', '🌙', '🎯', '💪', '🎨', '🍳', '🏃', '🎵', '🌟', '❤️'],
  },

  onShow() {
    this.loadCustomTemplates();
  },

  loadCustomTemplates() {
    const templates = getTemplates();
    this.setData({ customTemplates: templates });
  },

  // ==================== 使用模板 ====================

  useTemplate(e) {
    const tpl = e.currentTarget.dataset.template;

    // 将模板内容编码传递到新建日记页面
    const templateData = encodeURIComponent(JSON.stringify({
      content: tpl.structure.content,
      mood: tpl.structure.mood,
    }));

    wx.navigateTo({
      url: `/pages/detail/detail?template=${templateData}`,
    });
  },

  // ==================== 新建/编辑自定义模板 ====================

  openNewTemplate() {
    this.setData({
      showEditor: true,
      editingTemplate: null,
      templateName: '',
      templateIcon: '📝',
      templateContent: '## 标题\n\n',
      templateMood: 'calm',
    });
  },

  editCustomTemplate(e) {
    const tpl = e.currentTarget.dataset.template;
    this.setData({
      showEditor: true,
      editingTemplate: tpl,
      templateName: tpl.name || '',
      templateIcon: tpl.icon || '📝',
      templateContent: tpl.structure?.content || '',
      templateMood: tpl.structure?.mood || 'calm',
    });
  },

  closeEditor() {
    this.setData({ showEditor: false });
  },

  // 阻止弹窗内点击冒泡到遮罩层
  preventBubble() {},

  // 编辑器字段更新
  onNameInput(e) {
    this.setData({ templateName: e.detail.value });
  },

  onContentInput(e) {
    this.setData({ templateContent: e.detail.value });
  },

  onSelectIcon(e) {
    this.setData({ templateIcon: e.currentTarget.dataset.icon });
  },

  onSelectTemplateMood(e) {
    this.setData({ templateMood: e.currentTarget.dataset.mood });
  },

  // 保存自定义模板
  saveCustomTemplate() {
    if (!this.data.templateName.trim()) {
      wx.showToast({ title: '请输入模板名称', icon: 'none' });
      return;
    }

    const template = {
      id: this.data.editingTemplate?.id || undefined,
      name: this.data.templateName.trim(),
      icon: this.data.templateIcon,
      description: '自定义模板',
      structure: {
        title: '',
        content: this.data.templateContent,
        mood: this.data.templateMood,
      },
    };

    saveTemplate(template);
    wx.showToast({
      title: this.data.editingTemplate ? '模板已更新' : '模板已创建',
      icon: 'success',
    });

    this.closeEditor();
    this.loadCustomTemplates();
  },

  // 删除自定义模板
  deleteCustomTemplate(e) {
    const tpl = e.currentTarget.dataset.template;
    wx.showModal({
      title: '删除模板',
      content: `确定要删除"${tpl.name}"吗？`,
      confirmColor: '#C46A6A',
      success: (res) => {
        if (res.confirm) {
          deleteTemplate(tpl.id);
          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadCustomTemplates();
        }
      },
    });
  },

  // ==================== 分享 ====================

  onShareAppMessage() {
    return {
      title: '天天记 - 多种日记模板助你记录生活',
      path: '/pages/template/template',
    };
  },
});
