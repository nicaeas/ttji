// pages/index/index.js - 日记列表页

const { searchDiaries, deleteDiary, getCategories, getDiaryStats } = require('../../utils/storage');
const { MOODS, SORT_OPTIONS } = require('../../utils/constants');
const { groupByDate } = require('../../utils/date');

Page({
  data: {
    // 日记数据
    diaryGroups: [],
    diaries: [],

    // 搜索与筛选
    searchQuery: '',
    showSearch: false,
    selectedMood: '',
    selectedCategoryId: '',
    selectedSort: 'time-desc',

    // 筛选选项
    moodOptions: MOODS,
    sortOptions: SORT_OPTIONS,
    categoryOptions: [],

    // 筛选面板
    showFilterPanel: false,
    activeFilters: 0,

    // 统计
    stats: null,

    // 多选模式
    selectMode: false,
    selectedIds: [],

    // 空状态
    isEmpty: false,
    isSearchResult: false,
  },

  onLoad() {
    this.loadCategories();
  },

  onShow() {
    // 检查是否有来自分类页的筛选请求
    const app = getApp();
    if (app.globalData.categoryFilter) {
      this.setData({ selectedCategoryId: app.globalData.categoryFilter });
      app.globalData.categoryFilter = null;
      this.updateActiveFilters();
    }
    this.loadDiaries();
    this.loadStats();
  },

  onPullDownRefresh() {
    this.loadDiaries();
    this.loadStats();
    wx.stopPullDownRefresh();
  },

  // ==================== 数据加载 ====================

  loadDiaries() {
    const filters = {
      mood: this.data.selectedMood,
      categoryId: this.data.selectedCategoryId,
      sortBy: this.data.selectedSort,
    };

    const diaries = searchDiaries(this.data.searchQuery, filters);
    const diaryGroups = groupByDate(diaries);

    this.setData({
      diaries,
      diaryGroups,
      isEmpty: diaries.length === 0,
      isSearchResult: !!(this.data.searchQuery || this.data.selectedMood || this.data.selectedCategoryId),
    });
  },

  loadCategories() {
    const categories = getCategories();
    this.setData({
      categoryOptions: [{ id: '', name: '全部分类', icon: '📂', color: '#8B7E74' }, ...categories],
    });
  },

  loadStats() {
    const stats = getDiaryStats();
    this.setData({ stats });
  },

  // ==================== 搜索 ====================

  onSearchInput(e) {
    this.setData({ searchQuery: e.detail.value });
  },

  onSearchConfirm() {
    this.loadDiaries();
  },

  onSearchClear() {
    this.setData({ searchQuery: '' });
    this.loadDiaries();
  },

  toggleSearch() {
    this.setData({
      showSearch: !this.data.showSearch,
      searchQuery: '',
    });
    if (this.data.showSearch === false) {
      this.loadDiaries();
    }
  },

  // ==================== 筛选 ====================

  toggleFilterPanel() {
    this.setData({ showFilterPanel: !this.data.showFilterPanel });
  },

  onSelectMood(e) {
    const mood = e.currentTarget.dataset.mood;
    this.setData({
      selectedMood: this.data.selectedMood === mood ? '' : mood,
    });
    this.updateActiveFilters();
  },

  onSelectCategory(e) {
    const catId = e.currentTarget.dataset.catid;
    this.setData({
      selectedCategoryId: this.data.selectedCategoryId === catId ? '' : catId,
    });
    this.updateActiveFilters();
  },

  onSelectSort(e) {
    const sort = e.currentTarget.dataset.sort;
    this.setData({ selectedSort: sort });
  },

  updateActiveFilters() {
    let count = 0;
    if (this.data.selectedMood) count++;
    if (this.data.selectedCategoryId) count++;
    this.setData({ activeFilters: count });
  },

  applyFilters() {
    this.setData({ showFilterPanel: false });
    this.loadDiaries();
  },

  clearFilters() {
    this.setData({
      selectedMood: '',
      selectedCategoryId: '',
      selectedSort: 'time-desc',
      activeFilters: 0,
      showFilterPanel: false,
    });
    this.loadDiaries();
  },

  // ==================== 日记操作 ====================

  onDiaryTap(e) {
    const diary = e.detail && e.detail.diary;
    if (!diary || !diary.id) return;
    if (this.data.selectMode) {
      this.toggleSelect(diary.id);
      return;
    }
    wx.navigateTo({
      url: `/pages/detail/detail?id=${diary.id}`,
    });
  },

  onDiaryLongPress(e) {
    const diary = e.detail && e.detail.diary;
    if (!diary || !diary.id) return;
    wx.showActionSheet({
      itemList: ['编辑', '删除', '多选'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            wx.navigateTo({ url: `/pages/detail/detail?id=${diary.id}` });
            break;
          case 1:
            this.confirmDeleteDiary(diary);
            break;
          case 2:
            this.enterSelectMode(diary.id);
            break;
        }
      },
    });
  },

  confirmDeleteDiary(diary) {
    wx.showModal({
      title: '删除日记',
      content: `确定要删除"${diary.title || '无标题'}"吗？此操作不可恢复。`,
      confirmColor: '#C46A6A',
      success: (res) => {
        if (res.confirm) {
          deleteDiary(diary.id);
          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadDiaries();
          this.loadStats();
        }
      },
    });
  },

  // ==================== 多选模式 ====================

  enterSelectMode(firstId) {
    this.setData({
      selectMode: true,
      selectedIds: [firstId],
    });
  },

  exitSelectMode() {
    this.setData({
      selectMode: false,
      selectedIds: [],
    });
  },

  toggleSelect(id) {
    const ids = [...this.data.selectedIds];
    const idx = ids.indexOf(id);
    if (idx > -1) {
      ids.splice(idx, 1);
    } else {
      ids.push(id);
    }
    this.setData({ selectedIds: ids });
  },

  batchDelete() {
    if (this.data.selectedIds.length === 0) return;
    wx.showModal({
      title: '批量删除',
      content: `确定要删除 ${this.data.selectedIds.length} 篇日记吗？此操作不可恢复。`,
      confirmColor: '#C46A6A',
      success: (res) => {
        if (res.confirm) {
          this.data.selectedIds.forEach((id) => deleteDiary(id));
          wx.showToast({ title: `已删除 ${this.data.selectedIds.length} 篇`, icon: 'success' });
          this.exitSelectMode();
          this.loadDiaries();
          this.loadStats();
        }
      },
    });
  },

  // ==================== 导航 ====================

  goToNewDiary() {
    wx.navigateTo({
      url: '/pages/detail/detail',
    });
  },

  // ==================== 分享 ====================

  onShareAppMessage() {
    return {
      title: '天天记 - 记录生活的每一刻',
      path: '/pages/index/index',
    };
  },

  onShareTimeline() {
    return {
      title: '天天记 - 温馨日记小程序',
      query: '',
    };
  },
});
