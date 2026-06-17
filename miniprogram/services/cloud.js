// services/cloud.js — 云同步服务
var request = require('../utils/request').request;

/**
 * 上传本地日记到云端
 */
function uploadDiaries(diaries) {
  return request({
    url: '/diaries/sync',
    method: 'POST',
    data: { diaries: diaries }
  });
}

/**
 * 从云端下载日记（增量：since 之后更新的）
 */
function downloadDiaries(since) {
  return request({
    url: '/diaries/sync' + (since ? '?since=' + encodeURIComponent(since) : ''),
    method: 'GET'
  });
}

/**
 * 合并云端日记到本地
 * 策略：云端为准（updatedAt 更新则覆盖本地）
 */
function mergeFromCloud(cloudDiaries) {
  var storage = require('../utils/storage');
  var localDiaries = storage.getDiaries();
  var localMap = {};
  localDiaries.forEach(function (d) { localMap[d.id] = d; });

  cloudDiaries.forEach(function (cd) {
    var local = localMap[cd.id];
    if (cd.isDeleted) {
      // 云端标记删除 → 本地也删
      if (local) storage.deleteDiary(cd.id);
    } else if (!local || new Date(cd.updatedAt) > new Date(local.updatedAt)) {
      // 云端更新或本地没有 → 以云端为准
      storage.saveDiary({
        id: cd.id,
        title: cd.title,
        content: cd.content,
        mood: cd.mood,
        categoryId: cd.categoryId,
        createdAt: cd.createdAt,
        updatedAt: cd.updatedAt
      });
    }
  });
}

/**
 * 完整同步流程：先上传本地变更，再下载云端变更
 */
function fullSync() {
  var storage = require('../utils/storage');
  var localDiaries = storage.getDiaries();
  var lastSync = wx.getStorageSync('last_sync_time') || '';

  return uploadDiaries(localDiaries).then(function () {
    return downloadDiaries(lastSync);
  }).then(function (res) {
    if (res.diaries && res.diaries.length > 0) {
      mergeFromCloud(res.diaries);
    }
    wx.setStorageSync('last_sync_time', new Date().toISOString());
    return { count: res.diaries ? res.diaries.length : 0 };
  });
}

/**
 * 检查云同步权益是否有效
 */
function checkCloudStatus() {
  var expires = wx.getStorageSync('cloud_sync_expires');
  if (!expires) return false;
  return new Date(expires) > new Date();
}

module.exports = {
  uploadDiaries: uploadDiaries,
  downloadDiaries: downloadDiaries,
  mergeFromCloud: mergeFromCloud,
  fullSync: fullSync,
  checkCloudStatus: checkCloudStatus
};
