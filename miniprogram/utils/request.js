// utils/request.js — 统一网络层
var BASE_URL = 'https://YOUR_DOMAIN.com/api/v1';

/**
 * 通用 HTTP 请求，自动附加 JWT，401 自动重新登录重试
 */
function request(options) {
  return new Promise(function (resolve, reject) {
    var token = wx.getStorageSync('access_token');
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? 'Bearer ' + token : ''
      },
      success: function (res) {
        if (res.statusCode === 401) {
          wx.removeStorageSync('access_token');
          return login().then(function () {
            return request(options);
          }).then(resolve).catch(reject);
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          var msg = (res.data && res.data.detail) || '请求失败';
          reject({ code: res.statusCode, message: msg });
        }
      },
      fail: function (err) {
        reject({ code: -1, message: '网络错误' });
      }
    });
  });
}

/**
 * 微信登录 → 换取服务端 JWT
 */
function login() {
  return new Promise(function (resolve, reject) {
    wx.login({
      success: function (res) {
        if (!res.code) return reject({ message: 'wx.login 失败' });
        wx.request({
          url: BASE_URL + '/auth/login',
          method: 'POST',
          header: { 'Content-Type': 'application/x-www-form-urlencoded' },
          data: { code: res.code },
          success: function (result) {
            if (result.statusCode === 200 && result.data.access_token) {
              wx.setStorageSync('access_token', result.data.access_token);
              wx.setStorageSync('user_id', result.data.user_id);
              resolve(result.data);
            } else {
              reject({ message: '登录失败' });
            }
          },
          fail: reject
        });
      },
      fail: reject
    });
  });
}

/**
 * 上传文件（图片 / 心情图标）
 */
function uploadFile(filePath, endpoint) {
  return new Promise(function (resolve, reject) {
    var token = wx.getStorageSync('access_token');
    wx.uploadFile({
      url: BASE_URL + endpoint,
      filePath: filePath,
      name: 'file',
      header: { 'Authorization': token ? 'Bearer ' + token : '' },
      success: function (res) {
        if (res.statusCode === 200) {
          resolve(JSON.parse(res.data));
        } else {
          reject({ code: res.statusCode, message: '上传失败' });
        }
      },
      fail: reject
    });
  });
}

/**
 * 确保已登录（静默登录，不阻塞）
 */
function ensureLogin() {
  var token = wx.getStorageSync('access_token');
  if (token) return Promise.resolve(token);
  return login().catch(function () {});
}

module.exports = {
  request: request,
  login: login,
  uploadFile: uploadFile,
  ensureLogin: ensureLogin,
  BASE_URL: BASE_URL
};
