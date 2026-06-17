// services/share.js — 分享服务
var request = require('../utils/request').request;
var ad = require('../utils/ad');

/**
 * 创建云端分享（需看完激励视频）
 * @param {string[]} diaryIds - 日记 ID 数组（支持批量）
 * @returns {Promise<{shares: Array}>}
 */
function createCloudShare(diaryIds) {
  return ad.gateWithAd('解锁云端分享', '云端分享链接可以让好友直接查看你的日记').then(function (watched) {
    if (!watched) throw { message: '未完成观看' };
    return request({
      url: '/diaries/share',
      method: 'POST',
      data: { diaryIds: diaryIds }
    });
  });
}

/**
 * 获取分享内容（公开，无需登录）
 */
function getShareContent(shareId) {
  return request({
    url: '/share/' + shareId,
    method: 'GET'
  });
}

module.exports = {
  createCloudShare: createCloudShare,
  getShareContent: getShareContent
};
