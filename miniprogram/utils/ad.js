// utils/ad.js — 激励视频广告助手
// 使用前需在微信公众平台 → 流量主 → 广告管理 创建激励视频广告位，替换 AD_UNIT_ID

var AD_UNIT_ID = 'adunit-xxxxxxxxxxxxx'; // ← 替换为你的广告单元 ID

/**
 * 播放激励视频广告
 * @returns {Promise<boolean>} 是否完整看完
 */
function showRewardedVideo() {
  return new Promise(function (resolve) {
    // 创建广告实例（每次新建，避免缓存问题）
    var videoAd = wx.createRewardedVideoAd({ adUnitId: AD_UNIT_ID });

    videoAd.onLoad(function () {
      videoAd.show().catch(function () {
        // 广告还没加载好，先加载再播
        videoAd.load().then(function () {
          return videoAd.show();
        }).catch(function () {
          resolve(false);
        });
      });
    });

    videoAd.onError(function (err) {
      console.warn('广告加载失败:', err);
      // 广告加载失败，降级放行
      resolve(true);
    });

    videoAd.onClose(function (res) {
      // res.isEnded === true 表示完整看完
      resolve(res && res.isEnded === true);
    });
  });
}

/**
 * 带广告门控的操作
 * @param {string} title - 提示标题
 * @param {string} desc - 提示描述
 * @returns {Promise<boolean>} 是否通过（看完广告）
 */
function gateWithAd(title, desc) {
  return new Promise(function (resolve) {
    wx.showModal({
      title: title,
      content: desc + '\n\n观看一段短视频即可解锁此功能',
      confirmText: '观看视频',
      cancelText: '取消',
      success: function (modalRes) {
        if (!modalRes.confirm) return resolve(false);
        showRewardedVideo().then(function (watched) {
          if (watched) {
            wx.showToast({ title: '解锁成功', icon: 'success' });
          } else {
            wx.showToast({ title: '需完整观看才能解锁', icon: 'none' });
          }
          resolve(watched);
        });
      }
    });
  });
}

module.exports = {
  showRewardedVideo: showRewardedVideo,
  gateWithAd: gateWithAd
};
