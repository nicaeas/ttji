// pages/detail/detail.js - 日记详情/编辑页

const { getDiaryById, saveDiary, deleteDiary, getCategories } = require('../../utils/storage');
const { MOODS } = require('../../utils/constants');
const { formatDateTime, getToday } = require('../../utils/date');

Page({
  data: {
    // 日记数据
    diaryId: '',
    title: '',
    content: '',
    mood: 'calm',
    categoryId: '',

    // 元数据
    createdAt: '',
    updatedAt: '',
    createdAtDisplay: '',

    // 编辑模式
    isEditing: false,
    isNew: true,

    // 预览模式
    previewMode: false,

    // 选择器数据
    moodOptions: MOODS,
    categoryOptions: [],
    selectedMoodData: null,
    selectedCategoryData: null,

    // UI 状态
    showActionSheet: false,
    showMoodPicker: false,
    showCategoryPicker: false,
    showDeleteConfirm: false,

    // 模板参数
    templateContent: '',
  },

  onLoad(options) {
    // 加载分类选项
    const categories = getCategories();
    this.setData({
      categoryOptions: [{ id: '', name: '无分类', icon: '📂', color: '#8B7E74' }, ...categories],
    });

    if (options.id) {
      // 编辑已有日记
      this.loadDiary(options.id);
    } else {
      // 新建日记
      this.setData({ isEditing: true, isNew: true });

      // 如果有模板参数
      if (options.template) {
        try {
          const tpl = JSON.parse(decodeURIComponent(options.template));
          this.setData({
            content: tpl.content || '',
            mood: tpl.mood || 'calm',
            templateContent: tpl.content || '',
          });
        } catch (e) {
          // ignore
        }
      }
    }
  },

  loadDiary(id) {
    const diary = getDiaryById(id);
    if (!diary) {
      wx.showToast({ title: '日记不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({
      diaryId: diary.id,
      title: diary.title || '',
      content: diary.content || '',
      mood: diary.mood || 'calm',
      categoryId: diary.categoryId || '',
      createdAt: diary.createdAt,
      updatedAt: diary.updatedAt,
      createdAtDisplay: formatDateTime(diary.createdAt),
      isNew: false,
      isEditing: false,
    });
  },

  // ==================== 编辑模式 ====================

  enterEditMode() {
    this.setData({ isEditing: true });
  },

  cancelEdit() {
    if (this.data.isNew) {
      // 新建日记取消 → 返回
      if (this.data.title || this.data.content) {
        wx.showModal({
          title: '放弃编辑',
          content: '内容尚未保存，确定要放弃吗？',
          confirmColor: '#C46A6A',
          success: (res) => {
            if (res.confirm) wx.navigateBack();
          },
        });
      } else {
        wx.navigateBack();
      }
    } else {
      // 编辑已有日记取消 → 恢复原内容
      this.loadDiary(this.data.diaryId);
    }
  },

  // ==================== 字段更新 ====================

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  onContentBlur() {
    // 自动保存草稿
    this.autoSaveDraft();
  },

  // ==================== 预览模式 ====================

  togglePreview() {
    this.setData({ previewMode: !this.data.previewMode });
  },

  // ==================== 心情选择 ====================

  toggleMoodPicker() {
    this.setData({ showMoodPicker: !this.data.showMoodPicker });
  },

  onSelectMood(e) {
    // 兼容两种事件来源：
    // 1) mood-icon 组件自定义事件 → e.detail.mood.id
    // 2) 内联 picker 原生 tap → e.currentTarget.dataset.mood
    const moodId = e.detail?.mood?.id || e.currentTarget.dataset.mood;
    if (moodId) {
      this.setData({
        mood: moodId,
        showMoodPicker: false,
      });
    }
  },

  // ==================== 分类选择 ====================

  toggleCategoryPicker() {
    this.setData({ showCategoryPicker: !this.data.showCategoryPicker });
  },

  onSelectCategory(e) {
    const catId = e.currentTarget.dataset.catid;
    this.setData({
      categoryId: catId,
      showCategoryPicker: false,
    });
  },

  // ==================== 保存 ====================

  saveDiary() {
    // 验证
    if (!this.data.title.trim() && !this.data.content.trim()) {
      wx.showToast({ title: '请输入标题或内容', icon: 'none' });
      return;
    }

    const diaryData = {
      id: this.data.diaryId || undefined,
      title: this.data.title.trim(),
      content: this.data.content.trim(),
      mood: this.data.mood,
      categoryId: this.data.categoryId,
    };

    try {
      saveDiary(diaryData);
      wx.showToast({
        title: this.data.isNew ? '日记已创建' : '保存成功',
        icon: 'success',
      });

      if (this.data.isNew) {
        // 新建后留在页面，但更新为编辑模式
        const diaries = require('../../utils/storage').getDiaries();
        const newDiary = diaries[0];
        this.setData({
          diaryId: newDiary.id,
          isNew: false,
          isEditing: false,
          createdAt: newDiary.createdAt,
          updatedAt: newDiary.updatedAt,
          createdAtDisplay: formatDateTime(newDiary.createdAt),
        });
      } else {
        this.setData({ isEditing: false });
        this.loadDiary(this.data.diaryId);
      }
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  // ==================== 删除 ====================

  toggleDeleteConfirm() {
    this.setData({ showDeleteConfirm: !this.data.showDeleteConfirm });
  },

  // 阻止弹窗内点击冒泡到遮罩层
  preventBubble() {},

  confirmDelete() {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这篇日记吗？',
      confirmColor: '#C46A6A',
      confirmText: '删除',
      success: (res) => {
        if (res.confirm) {
          deleteDiary(this.data.diaryId);
          wx.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 1000);
        }
      },
    });
    this.setData({ showDeleteConfirm: false });
  },

  // ==================== 草稿 ====================

  autoSaveDraft() {
    if (!this.data.title.trim() && !this.data.content.trim()) return;
    wx.setStorageSync('diary_draft', {
      title: this.data.title,
      content: this.data.content,
      mood: this.data.mood,
      categoryId: this.data.categoryId,
      time: new Date().toISOString(),
    });
  },

  loadDraft() {
    const draft = wx.getStorageSync('diary_draft');
    if (draft) {
      this.setData({
        title: draft.title || '',
        content: draft.content || '',
        mood: draft.mood || 'calm',
        categoryId: draft.categoryId || '',
      });
      wx.removeStorageSync('diary_draft');
    }
  },

  // ==================== 分享 ====================

  onShareAppMessage() {
    return {
      title: this.data.title || '天天记 · 日记',
      path: `/pages/detail/detail?id=${this.data.diaryId}`,
    };
  },
});
