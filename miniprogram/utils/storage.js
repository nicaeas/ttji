// storage.js - 数据持久化管理

const STORAGE_KEYS = {
  DIARIES: 'diaries',
  CATEGORIES: 'categories',
  TEMPLATES: 'templates',
};

// ==================== 日记 CRUD ====================

/**
 * 获取所有日记
 */
function getDiaries() {
  return wx.getStorageSync(STORAGE_KEYS.DIARIES) || [];
}

/**
 * 根据 ID 获取单篇日记
 */
function getDiaryById(id) {
  const diaries = getDiaries();
  return diaries.find((d) => d.id === id) || null;
}

/**
 * 保存日记 (新建或更新)
 */
function saveDiary(diary) {
  const diaries = getDiaries();
  const now = new Date().toISOString();

  if (diary.id) {
    // 更新已有日记
    const index = diaries.findIndex((d) => d.id === diary.id);
    if (index > -1) {
      diaries[index] = {
        ...diaries[index],
        ...diary,
        updatedAt: now,
      };
    }
  } else {
    // 新建日记
    const newDiary = {
      ...diary,
      id: generateId('diary'),
      createdAt: now,
      updatedAt: now,
    };
    diaries.unshift(newDiary);
  }

  wx.setStorageSync(STORAGE_KEYS.DIARIES, diaries);
  return diary.id || diaries[0].id;
}

/**
 * 删除日记
 */
function deleteDiary(id) {
  let diaries = getDiaries();
  diaries = diaries.filter((d) => d.id !== id);
  wx.setStorageSync(STORAGE_KEYS.DIARIES, diaries);
}

/**
 * 搜索日记
 */
function searchDiaries(query, filters = {}) {
  let diaries = getDiaries();
  const q = (query || '').toLowerCase().trim();

  // 文本搜索
  if (q) {
    diaries = diaries.filter((d) =>
      (d.title || '').toLowerCase().includes(q) ||
      (d.content || '').toLowerCase().includes(q)
    );
  }

  // 心情筛选
  if (filters.mood) {
    diaries = diaries.filter((d) => d.mood === filters.mood);
  }

  // 分类筛选
  if (filters.categoryId) {
    diaries = diaries.filter((d) => d.categoryId === filters.categoryId);
  }

  // 日期范围筛选
  if (filters.dateStart) {
    diaries = diaries.filter((d) => d.createdAt >= filters.dateStart);
  }
  if (filters.dateEnd) {
    diaries = diaries.filter((d) => d.createdAt <= filters.dateEnd);
  }

  // 排序
  return sortDiaries(diaries, filters.sortBy || 'time-desc');
}

/**
 * 排序日记
 */
function sortDiaries(diaries, sortBy) {
  const sorted = [...diaries];
  switch (sortBy) {
    case 'time-asc':
      sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case 'title':
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      break;
    case 'mood':
      sorted.sort((a, b) => (a.mood || '').localeCompare(b.mood || ''));
      break;
    case 'time-desc':
    default:
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
  }
  return sorted;
}

// ==================== 分类 CRUD ====================

/**
 * 获取所有分类
 */
function getCategories() {
  return wx.getStorageSync(STORAGE_KEYS.CATEGORIES) || [];
}

/**
 * 根据 ID 获取分类
 */
function getCategoryById(id) {
  const categories = getCategories();
  return categories.find((c) => c.id === id) || null;
}

/**
 * 保存分类
 */
function saveCategory(category) {
  const categories = getCategories();
  if (category.id) {
    const index = categories.findIndex((c) => c.id === category.id);
    if (index > -1) {
      categories[index] = { ...categories[index], ...category };
    }
  } else {
    categories.push({
      ...category,
      id: generateId('cat'),
    });
  }
  wx.setStorageSync(STORAGE_KEYS.CATEGORIES, categories);
}

/**
 * 删除分类
 */
function deleteCategory(id) {
  let categories = getCategories();
  categories = categories.filter((c) => c.id !== id);
  wx.setStorageSync(STORAGE_KEYS.CATEGORIES, categories);

  // 清除使用此分类的日记的分类关联
  const diaries = getDiaries();
  let updated = false;
  diaries.forEach((d) => {
    if (d.categoryId === id) {
      d.categoryId = '';
      updated = true;
    }
  });
  if (updated) {
    wx.setStorageSync(STORAGE_KEYS.DIARIES, diaries);
  }
}

/**
 * 获取分类下的日记数量
 */
function getCategoryDiaryCount(categoryId) {
  const diaries = getDiaries();
  return diaries.filter((d) => d.categoryId === categoryId).length;
}

// ==================== 模板 CRUD ====================

/**
 * 获取所有自定义模板
 */
function getTemplates() {
  return wx.getStorageSync(STORAGE_KEYS.TEMPLATES) || [];
}

/**
 * 保存模板
 */
function saveTemplate(template) {
  const templates = getTemplates();
  if (template.id) {
    const index = templates.findIndex((t) => t.id === template.id);
    if (index > -1) {
      templates[index] = { ...templates[index], ...template };
    }
  } else {
    templates.push({
      ...template,
      id: generateId('tpl'),
    });
  }
  wx.setStorageSync(STORAGE_KEYS.TEMPLATES, templates);
}

/**
 * 删除模板
 */
function deleteTemplate(id) {
  let templates = getTemplates();
  templates = templates.filter((t) => t.id !== id);
  wx.setStorageSync(STORAGE_KEYS.TEMPLATES, templates);
}

// ==================== 工具函数 ====================

/**
 * 生成唯一 ID
 */
function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}${random}`;
}

/**
 * 获取日记统计
 */
function getDiaryStats() {
  const diaries = getDiaries();
  const categories = getCategories();

  return {
    total: diaries.length,
    thisWeek: diaries.filter((d) => {
      const diaryDate = new Date(d.createdAt);
      const now = new Date();
      const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      return diaryDate >= weekAgo;
    }).length,
    byCategory: categories.map((cat) => ({
      category: cat,
      count: diaries.filter((d) => d.categoryId === cat.id).length,
    })),
    byMood: countByMood(diaries),
  };
}

/**
 * 按心情统计
 */
function countByMood(diaries) {
  const counts = {};
  diaries.forEach((d) => {
    if (d.mood) {
      counts[d.mood] = (counts[d.mood] || 0) + 1;
    }
  });
  return counts;
}

module.exports = {
  getDiaries,
  getDiaryById,
  saveDiary,
  deleteDiary,
  searchDiaries,
  getCategories,
  getCategoryById,
  saveCategory,
  deleteCategory,
  getCategoryDiaryCount,
  getTemplates,
  saveTemplate,
  deleteTemplate,
  getDiaryStats,
};
