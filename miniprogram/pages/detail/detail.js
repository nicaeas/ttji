// pages/detail/detail.js - 日记详情/编辑页

const { getDiaryById, saveDiary, deleteDiary, getCategories } = require('../../utils/storage');
const moodService = require('../../services/mood');
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
    moodOptions: [],
    categoryOptions: [],
    selectedMoodData: null,
    selectedCategoryData: null,

    // UI 状态
    showActionSheet: false,
    showMoodPicker: false,
    showCategoryPicker: false,
    showDeleteConfirm: false,
    showMoodEditor: false,
    showSharePanel: false,
    showCanvasPreview: false,
    shareImagePath: '',
    newMoodLabel: '',
    newMoodColor: '#8B7355',
    newMoodIconUrl: '',

    // 模板参数
    templateContent: '',
  },

  onLoad(options) {
    // 加载分类选项
    const categories = getCategories();
    this.setData({
      categoryOptions: [{ id: '', name: '无分类', icon: '📂', color: '#8B7E74' }, ...categories],
    });

    // 加载心情列表（本地缓存优先，后台静默同步）
    this.loadMoods();

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
    // 追踪光标位置（用于图片插入）
    if (e.detail.cursor !== undefined) {
      this._cursorPos = e.detail.cursor;
    }
  },

  onContentBlur(e) {
    if (e.detail.cursor !== undefined) {
      this._cursorPos = e.detail.cursor;
    }
    // 自动保存草稿
    this.autoSaveDraft();
  },

  // ==================== 图片插入 ====================

  onInsertImage() {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success(res) {
        const tempFile = res.tempFiles[0];
        // 限制 10MB
        if (tempFile.size > 10 * 1024 * 1024) {
          wx.showToast({ title: '图片不能超过 10MB', icon: 'none' });
          return;
        }
        that.uploadAndInsertImage(tempFile.tempFilePath);
      },
    });
  },

  uploadAndInsertImage(filePath) {
    const that = this;
    wx.showLoading({ title: '上传中...', mask: true });
    const { uploadFile, BASE_URL } = require('../../utils/request');
    uploadFile(filePath, '/upload/image').then((data) => {
      wx.hideLoading();
      // 服务器返回相对路径，拼成完整 URL
      const imgUrl = data.fullUrl.startsWith('http') ? data.fullUrl : BASE_URL.replace('/api/v1', '') + data.fullUrl;
      const markdown = `\n![](${imgUrl})\n`;
      const pos = that._cursorPos !== undefined ? that._cursorPos : that.data.content.length;
      const newContent = that.data.content.slice(0, pos) + markdown + that.data.content.slice(pos);
      that.setData({
        content: newContent,
      });
      that._cursorPos = pos + markdown.length;
      wx.showToast({ title: '图片已插入', icon: 'success' });
    }).catch((err) => {
      wx.hideLoading();
      wx.showToast({ title: '上传失败', icon: 'none' });
    });
  },

  // ==================== 预览模式 ====================

  togglePreview() {
    this.setData({ previewMode: !this.data.previewMode });
  },

  // ==================== 心情选择 ====================

  loadMoods() {
    const moods = moodService.getLocalMoods();
    this.setData({ moodOptions: moods });
    // 静默同步云端
    moodService.syncFromServer().then((serverMoods) => {
      this.setData({ moodOptions: serverMoods });
    });
  },

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

  // ==================== 新建自定义心情 ====================

  openMoodEditor() {
    this.setData({
      showMoodEditor: true,
      newMoodLabel: '',
      newMoodColor: '#8B7355',
      newMoodIconUrl: '',
    });
  },

  closeMoodEditor() {
    this.setData({ showMoodEditor: false });
  },

  preventBubble() {},

  onMoodLabelInput(e) {
    this.setData({ newMoodLabel: e.detail.value });
  },

  onMoodColorSelect(e) {
    this.setData({ newMoodColor: e.currentTarget.dataset.color });
  },

  onMoodIconUpload() {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success(res) {
        const tempFile = res.tempFiles[0];
        if (tempFile.size > 2 * 1024 * 1024) {
          wx.showToast({ title: '图标不能超过 2MB', icon: 'none' });
          return;
        }
        wx.showLoading({ title: '上传中...', mask: true });
        moodService.uploadMoodIcon(tempFile.tempFilePath).then((url) => {
          wx.hideLoading();
          that.setData({ newMoodIconUrl: url });
        }).catch(() => {
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'none' });
        });
      },
    });
  },

  saveCustomMood() {
    const label = this.data.newMoodLabel.trim();
    if (!label) {
      wx.showToast({ title: '请输入心情名称', icon: 'none' });
      return;
    }
    const that = this;
    wx.showLoading({ title: '保存中...', mask: true });
    moodService.createCustomMood({
      label: label,
      color: this.data.newMoodColor,
      emoji: '',
      iconUrl: this.data.newMoodIconUrl
    }).then((res) => {
      wx.hideLoading();
      // 刷新心情列表
      return moodService.syncFromServer();
    }).then((moods) => {
      that.setData({
        moodOptions: moods,
        showMoodEditor: false,
        mood: moods[moods.length - 1].id  // 自动选中新创建的
      });
      wx.showToast({ title: '心情已创建', icon: 'success' });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '创建失败', icon: 'none' });
    });
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

  showShareOptions() {
    this.setData({ showSharePanel: true });
  },

  closeShareOptions() {
    this.setData({ showSharePanel: false });
  },

  // Canvas 生成分享卡片（免费）
  shareAsCanvas() {
    this.setData({ showSharePanel: false });
    const that = this;
    const moodData = require('../../services/mood').findMood(this.data.mood);
    const diary = {
      title: this.data.title,
      content: this.data.content,
      mood: this.data.mood,
      moodLabel: moodData ? moodData.label : '',
      createdAt: this.data.createdAt
    };

    wx.showLoading({ title: '生成中...', mask: true });
    // 获取 canvas 节点
    const query = wx.createSelectorQuery();
    query.select('#shareCanvas').fields({ node: true, size: true }).exec(function (res) {
      if (!res[0] || !res[0].node) {
        wx.hideLoading();
        wx.showToast({ title: '生成失败', icon: 'none' });
        return;
      }
      const canvasShare = require('../../utils/canvasShare');
      canvasShare.generateShareImage(res[0].node, diary).then(function (tempPath) {
        wx.hideLoading();
        that.setData({
          showCanvasPreview: true,
          shareImagePath: tempPath
        });
      }).catch(function () {
        wx.hideLoading();
        wx.showToast({ title: '生成失败', icon: 'none' });
      });
    });
  },

  closeCanvasPreview() {
    this.setData({ showCanvasPreview: false, shareImagePath: '' });
  },

  saveShareImage() {
    const that = this;
    const canvasShare = require('../../utils/canvasShare');
    canvasShare.saveToAlbum(this.data.shareImagePath).then(function () {
      wx.showToast({ title: '已保存到相册', icon: 'success' });
      that.setData({ showCanvasPreview: false });
    }).catch(function () {
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  // 云端分享链接（需看广告）
  shareAsCloudLink() {
    this.setData({ showSharePanel: false });
    const that = this;
    const shareService = require('../../services/share');
    shareService.createCloudShare([this.data.diaryId]).then(function (res) {
      const share = res.shares[0];
      // 复制分享链接到剪贴板
      const link = '天天记 · ' + (that.data.title || '日记分享') + '\n打开天天记小程序查看：' + share.shareId;
      wx.setClipboardData({
        data: link,
        success: function () {
          wx.showToast({ title: '链接已复制', icon: 'success' });
        }
      });
    }).catch(function (err) {
      if (err && err.message !== '未完成观看') {
        wx.showToast({ title: '分享失败', icon: 'none' });
      }
    });
  },

  onShareAppMessage() {
    return {
      title: this.data.title || '天天记 · 日记',
      path: `/pages/detail/detail?id=${this.data.diaryId}`,
    };
  },
});
