// services/mood.js — 心情管理服务（内置 + 自定义，云端同步）
var request = require('../utils/request').request;
var storage = require('../utils/storage');

var CACHE_KEY = 'moods_cache';
var BUILTIN_MOODS = [
  { id: 'happy', emoji: '😊', label: '开心', color: '#F0C060', isCustom: false },
  { id: 'calm', emoji: '😌', label: '平静', color: '#7BA0A0', isCustom: false },
  { id: 'grateful', emoji: '🥰', label: '感恩', color: '#8BA07B', isCustom: false },
  { id: 'excited', emoji: '🤩', label: '激动', color: '#C47B6A', isCustom: false },
  { id: 'thoughtful', emoji: '🤔', label: '思考', color: '#7B8BA0', isCustom: false },
  { id: 'sad', emoji: '😢', label: '难过', color: '#8B7BA0', isCustom: false },
  { id: 'anxious', emoji: '😰', label: '焦虑', color: '#A08B7B', isCustom: false },
  { id: 'tired', emoji: '😴', label: '疲惫', color: '#9B9B8B', isCustom: false },
  { id: 'inspired', emoji: '💡', label: '灵感', color: '#A0A07B', isCustom: false },
  { id: 'love', emoji: '💕', label: '爱意', color: '#C48B9B', isCustom: false }
];

/**
 * 获取本地缓存的所有心情（内置 + 自定义）
 */
function getLocalMoods() {
  var cached = wx.getStorageSync(CACHE_KEY);
  if (cached && cached.length) return cached;
  return BUILTIN_MOODS.slice();
}

/**
 * 根据 ID 查找心情（本地）
 */
function findMood(id) {
  var moods = getLocalMoods();
  return moods.find(function (m) { return m.id === id; }) || null;
}

/**
 * 从服务器同步心情列表（内置 + 用户自定义）
 */
function syncFromServer() {
  return request({ url: '/moods', method: 'GET' }).then(function (res) {
    var moods = res.moods || [];
    wx.setStorageSync(CACHE_KEY, moods);
    return moods;
  }).catch(function () {
    // 网络失败，返回本地缓存
    return getLocalMoods();
  });
}

/**
 * 创建自定义心情
 * @param {Object} mood - { label, color, emoji, iconUrl }
 */
function createCustomMood(mood) {
  return request({
    url: '/moods',
    method: 'POST',
    data: mood
  }).then(function (res) {
    // 更新本地缓存
    var moods = getLocalMoods();
    moods.push({
      id: res.id,
      emoji: mood.emoji || '',
      label: mood.label,
      color: mood.color || '#8B7355',
      iconUrl: mood.iconUrl || '',
      isCustom: true
    });
    wx.setStorageSync(CACHE_KEY, moods);
    return res;
  });
}

/**
 * 删除自定义心情
 */
function deleteCustomMood(moodId) {
  return request({
    url: '/moods/' + moodId,
    method: 'DELETE'
  }).then(function () {
    var moods = getLocalMoods().filter(function (m) { return m.id !== moodId; });
    wx.setStorageSync(CACHE_KEY, moods);
  });
}

/**
 * 上传心情图标
 */
function uploadMoodIcon(filePath) {
  var uploadFile = require('../utils/request').uploadFile;
  return uploadFile(filePath, '/upload/mood-icon').then(function (data) {
    var BASE_URL = require('../utils/request').BASE_URL;
    return data.iconUrl.startsWith('http') ? data.iconUrl : BASE_URL.replace('/api/v1', '') + data.iconUrl;
  });
}

module.exports = {
  BUILTIN_MOODS: BUILTIN_MOODS,
  getLocalMoods: getLocalMoods,
  findMood: findMood,
  syncFromServer: syncFromServer,
  createCustomMood: createCustomMood,
  deleteCustomMood: deleteCustomMood,
  uploadMoodIcon: uploadMoodIcon
};
