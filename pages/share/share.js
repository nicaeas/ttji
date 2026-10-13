const store = require('../../utils/store')
const util = require('../../utils/util')
const files = require('../../utils/files')

// 画布逻辑尺寸（css 上等比缩放为 690rpx 宽）
const W = 375
const H = 640
const PAD = 24

/* ---------- canvas 绘制辅助 ---------- */

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// 逐字符断行（中文无分词），maxLines 传 Infinity 表示不限
function wrapText(ctx, text, maxWidth, maxLines) {
  const lines = []
  let line = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '\n') {
      lines.push(line)
      line = ''
      if (lines.length >= maxLines) return lines
      continue
    }
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = ch
      if (lines.length >= maxLines) return lines
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

// 等比 cover 填充圆角区域
function drawCover(ctx, img, x, y, w, h) {
  const ratio = Math.max(w / img.width, h / img.height)
  const dw = img.width * ratio
  const dh = img.height * ratio
  ctx.save()
  roundRect(ctx, x, y, w, h, 10)
  ctx.clip()
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  ctx.restore()
}

Page({
  data: {
    ready: false,
    filePath: ''
  },

  onLoad(options) {
    this.note = store.getById(options.id)
    if (!this.note) {
      wx.showToast({ title: '笔记不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 600)
    }
  },

  onReady() {
    if (!this.note) return
    wx.createSelectorQuery()
      .select('#shareCanvas')
      .fields({ node: true, size: true })
      .exec(res => {
        if (!res || !res[0] || !res[0].node) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio || 2
        canvas.width = W * dpr
        canvas.height = H * dpr
        ctx.scale(dpr, dpr)
        this.canvas = canvas
        this.draw(ctx, canvas)
      })
  },

  draw(ctx, canvas) {
    const note = this.note

    // 背景与卡片
    ctx.fillStyle = '#F6F5F2'
    ctx.fillRect(0, 0, W, H)
    roundRect(ctx, 16, 16, W - 32, H - 32, 14)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()

    // 标题（最多 2 行）
    let y = 48
    ctx.fillStyle = '#2C2C2C'
    ctx.font = 'bold 20px sans-serif'
    wrapText(ctx, note.title || '无标题', W - PAD * 2, 2).forEach(line => {
      ctx.fillText(line, PAD, y)
      y += 28
    })
    y += 8

    // 标签胶囊（最多 4 个，放不下自动跳过）
    const tags = (note.tags || []).slice(0, 4)
    if (tags.length) {
      ctx.font = '12px sans-serif'
      let tx = PAD
      tags.forEach(t => {
        const label = '#' + t
        const tw = ctx.measureText(label).width + 16
        if (tx + tw > W - PAD) return
        ctx.fillStyle = '#FFF3DC'
        roundRect(ctx, tx, y - 14, tw, 20, 10)
        ctx.fill()
        ctx.fillStyle = '#B87E14'
        ctx.fillText(label, tx + 8, y)
        tx += tw + 8
      })
      y += 22
    }

    // 分隔线
    ctx.strokeStyle = '#EEEEEE'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PAD, y)
    ctx.lineTo(W - PAD, y)
    ctx.stroke()
    y += 22

    // 正文
    const images = note.images || []
    const audio = note.audio || []
    const hasImg = images.length > 0
    const raw = (note.content || '').replace(/- \[x\] ?/g, '☑ ').replace(/- \[ \] ?/g, '☐ ')
    const src = raw.trim() ? raw : '（无正文）'

    ctx.fillStyle = '#444444'
    ctx.font = '15px sans-serif'

    // 预留底部时间行；有图时图片区固定在底部
    const imgH = hasImg ? 220 : 0
    const imgY = H - 68 - imgH
    const audioReserve = audio.length ? 26 : 0
    const bottomLimit = hasImg ? imgY - 12 : H - 110 - audioReserve
    const maxLines = Math.max(1, Math.floor((bottomLimit - y) / 24))

    const lines = []
    src.split('\n').forEach(para => {
      if (para === '') {
        lines.push('')
        return
      }
      wrapText(ctx, para, W - PAD * 2, Infinity).forEach(l => lines.push(l))
    })
    let truncated = false
    if (lines.length > maxLines) {
      lines.length = maxLines
      truncated = true
    }
    for (let i = 0; i < lines.length; i++) {
      if (hasImg && y > imgY - 24) {
        truncated = true
        break
      }
      ctx.fillText(lines[i], PAD, y)
      y += 24
    }
    if (truncated) {
      ctx.fillStyle = '#AAAAAA'
      ctx.fillText('…… 更多内容见「天天记」', PAD, y)
      y += 24
    }

    if (audio.length) {
      ctx.fillStyle = '#888888'
      ctx.fillText('🎙 语音附件 ×' + audio.length, PAD, y)
      y += 26
    }

    // 图片（第一张）；devtools 下 usr 路径需转 data URL，否则 canvas 同样被 CORS 拦截
    if (hasImg) {
      const src = files.displaySrc(images[0])
      if (!src) {
        this.finishDraw(ctx)
        return
      }
      const img = canvas.createImage()
      img.onload = () => {
        drawCover(ctx, img, PAD, imgY, W - PAD * 2, imgH)
        this.finishDraw(ctx)
      }
      img.onerror = () => this.finishDraw(ctx)
      img.src = src
      return
    }
    this.finishDraw(ctx)
  },

  finishDraw(ctx) {
    ctx.fillStyle = '#AAAAAA'
    ctx.font = '12px sans-serif'
    ctx.fillText(util.formatTime(this.note.createdAt), PAD, H - 40)
    const brand = '— 天天记'
    ctx.fillText(brand, W - PAD - ctx.measureText(brand).width, H - 40)
    this.exportImage()
  },

  exportImage() {
    wx.canvasToTempFilePath({
      canvas: this.canvas,
      destWidth: W * 2,
      destHeight: H * 2,
      success: res => this.setData({ filePath: res.tempFilePath, ready: true }),
      fail: () => wx.showToast({ title: '生成图片失败', icon: 'none' })
    })
  },

  onSave() {
    if (!this.data.filePath) return
    wx.saveImageToPhotosAlbum({
      filePath: this.data.filePath,
      success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
      fail: err => {
        const msg = err && err.errMsg ? err.errMsg : ''
        if (msg.indexOf('auth') !== -1 || msg.indexOf('deny') !== -1) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中允许「添加到相册」后重试',
            confirmText: '去设置',
            success: r => { if (r.confirm) wx.openSetting() }
          })
        } else if (msg.indexOf('cancel') === -1) {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  },

  onShareChat() {
    if (!this.data.filePath) return
    if (!wx.showShareImageMenu) {
      wx.showToast({ title: '当前微信版本不支持，请保存后手动发送', icon: 'none' })
      return
    }
    wx.showShareImageMenu({
      path: this.data.filePath,
      fail: err => {
        const msg = err && err.errMsg ? err.errMsg : ''
        if (msg.indexOf('cancel') === -1) {
          wx.showToast({ title: '分享失败', icon: 'none' })
        }
      }
    })
  }
})
