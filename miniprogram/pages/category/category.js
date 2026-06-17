// pages/category/category.js - 分类管理页

const {
  getCategories, saveCategory, deleteCategory,
  getCategoryDiaryCount, getDiaries,
} = require('../../utils/storage');

const CATEGORY_COLORS = [
  '#8B7355', '#5B7B8A', '#6B8B5B', '#8B6B5B',
  '#8B5B7B', '#7B8BA0', '#8BA07B', '#A08B7B',
  '#C4956A', '#7B9B6A', '#6A9B8B', '#9B6A8B',
];

const CATEGORY_ICONS = [
  '🏠', '💼', '📚', '✈️', '💭', '🎯', '💪',
  '🎨', '🍳', '🏃', '🎵', '🌟', '❤️', '🌿',
  '🐱', '☕', '🎮', '📷', '🎬', '💰',
];

Page({
  data: {
    categories: [],
    categoryCounts: {},
    showEditor: false,
    editingCategory: null,
    categoryName: '',
    categoryIcon: '🏠',
    categoryColor: '#8B7355',
    iconOptions: CATEGORY_ICONS,
    colorOptions: CATEGORY_COLORS,
  },

  onShow() {
    this.loadCategories();
  },

  loadCategories() {
    const categories = getCategories();
    const counts = {};
    categories.forEach((cat) => {
      counts[cat.id] = getCategoryDiaryCount(cat.id);
    });

    this.setData({
      categories,
      categoryCounts: counts,
    });
  },

  // ==================== 新建/编辑分类 ====================

  openNewCategory() {
    this.setData({
      showEditor: true,
      editingCategory: null,
      categoryName: '',
      categoryIcon: '🏠',
      categoryColor: '#8B7355',
    });
  },

  editCategory(e) {
    const cat = e.currentTarget.dataset.category;
    this.setData({
      showEditor: true,
      editingCategory: cat,
      categoryName: cat.name,
      categoryIcon: cat.icon,
      categoryColor: cat.color,
    });
  },

  closeEditor() {
    this.setData({ showEditor: false });
  },

  // 阻止弹窗内点击冒泡到遮罩层
  preventBubble() {},

  onNameInput(e) {
    this.setData({ categoryName: e.detail.value });
  },

  onSelectIcon(e) {
    this.setData({ categoryIcon: e.currentTarget.dataset.icon });
  },

  onSelectColor(e) {
    this.setData({ categoryColor: e.currentTarget.dataset.color });
  },

  // 保存分类
  saveCategoryHandler() {
    if (!this.data.categoryName.trim()) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' });
      return;
    }

    const category = {
      id: this.data.editingCategory?.id || undefined,
      name: this.data.categoryName.trim(),
      icon: this.data.categoryIcon,
      color: this.data.categoryColor,
    };

    saveCategory(category);
    wx.showToast({
      title: this.data.editingCategory ? '分类已更新' : '分类已创建',
      icon: 'success',
    });

    this.closeEditor();
    this.loadCategories();
  },

  // 删除分类
  deleteCategoryHandler(e) {
    const cat = e.currentTarget.dataset.category;
    const count = this.data.categoryCounts[cat.id] || 0;

    wx.showModal({
      title: '删除分类',
      content: count > 0
        ? `"${cat.name}"下有 ${count} 篇日记，删除后这些日记将变为"未分类"。确定删除吗？`
        : `确定要删除"${cat.name}"分类吗？`,
      confirmColor: '#C46A6A',
      success: (res) => {
        if (res.confirm) {
          deleteCategory(cat.id);
          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadCategories();
        }
      },
    });
  },

  // ==================== 查看分类下日记 ====================

  viewCategoryDiaries(e) {
    const cat = e.currentTarget.dataset.category;
    // 必须在 switchTab 之前设置，因为 switchTab 会同步触发目标页的 onShow，
    // success 回调执行时 onShow 早已结束，导致筛选值永远落后一次
    const app = getApp();
    app.globalData.categoryFilter = cat.id;
    wx.switchTab({
      url: '/pages/index/index',
    });
  },
});
