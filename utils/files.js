/**
 * 附件文件管理：把临时文件复制到用户目录持久化，删除时清理
 */
const DIR = wx.env.USER_DATA_PATH + '/notes'

function ensureDir() {
  const fs = wx.getFileSystemManager()
  try {
    fs.accessSync(DIR)
  } catch (e) {
    try { fs.mkdirSync(DIR, true) } catch (e2) { /* 目录已存在或创建失败，后续 copy 再兜底 */ }
  }
}

// 已在用户目录下的文件原样返回；临时文件复制持久化后返回新路径；失败返回原路径
function persistFile(path) {
  if (!path) return path
  if (path.indexOf(wx.env.USER_DATA_PATH) === 0) return path
  ensureDir()
  const fs = wx.getFileSystemManager()
  const ext = (String(path).match(/\.(\w+)$/) || ['', 'bin'])[1]
  const target = DIR + '/' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext
  try {
    fs.copyFileSync(path, target)
    return target
  } catch (e) {
    return path
  }
}

function persistAll(paths) {
  return (paths || []).map(persistFile)
}

// 删除用户目录下的文件（临时文件与非法路径自动跳过），全部容错
function deleteFiles(paths) {
  const fs = wx.getFileSystemManager()
  ;(paths || []).forEach(p => {
    if (!p || p.indexOf(wx.env.USER_DATA_PATH) !== 0) return
    try { fs.unlinkSync(p) } catch (e) { /* 文件不存在等情况忽略 */ }
  })
}

/* ---------- 展示路径适配 ----------
 * 开发者工具模拟器对用户目录图片有 CORS 渲染缺陷：http://usr/... 会被重定向到
 * 本地服务器且响应不带 Access-Control-Allow-Origin，<image>/canvas 一律加载失败。
 * 真机使用 wxfile:// 协议不受影响。故仅 devtools 环境把用户目录文件读成
 * base64 data URL 供展示（带缓存）；真机与临时文件路径原样返回。
 */
const displayCache = new Map()
let cachedPlatform = null

function getPlatform() {
  if (cachedPlatform === null) {
    try {
      cachedPlatform = (wx.getDeviceInfo ? wx.getDeviceInfo() : wx.getSystemInfoSync()).platform || ''
    } catch (e) {
      cachedPlatform = ''
    }
  }
  return cachedPlatform
}

function displaySrc(path) {
  if (!path) return ''
  if (getPlatform() !== 'devtools') return path
  if (path.indexOf(wx.env.USER_DATA_PATH) !== 0) return path
  if (displayCache.has(path)) return displayCache.get(path)
  let dataUrl = ''
  try {
    const b64 = wx.getFileSystemManager().readFileSync(path, 'base64')
    const ext = (String(path).toLowerCase().match(/\.(\w+)$/) || ['', 'png'])[1]
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext === 'webp' ? 'webp' : ext === 'gif' ? 'gif' : 'png'
    dataUrl = 'data:image/' + mime + ';base64,' + b64
  } catch (e) {
    dataUrl = '' // 文件缺失等异常：返回空串，调用方隐藏该图
  }
  if (displayCache.size > 40) displayCache.clear() // 防止长会话缓存膨胀
  displayCache.set(path, dataUrl)
  return dataUrl
}

module.exports = { persistFile, persistAll, deleteFiles, displaySrc }
