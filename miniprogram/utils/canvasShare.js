// utils/canvasShare.js — Canvas 日记卡片分享
// 把日记渲染成精美图片，可保存到相册或发送给好友

var MOODS_FALLBACK = {
  happy: '😊', calm: '😌', grateful: '🥰', excited: '🤩',
  thoughtful: '🤔', sad: '😢', anxious: '😰', tired: '😴',
  inspired: '💡', love: '💕'
};

/**
 * 生成日记分享卡片
 * @param {Object} diary - { title, content, mood, moodLabel, createdAt }
 * @param {Object} canvasCtx - canvas 2d context
 * @param {Object} canvasInfo - { width, height }
 * @returns {Promise<string>} 临时图片路径
 */
function drawDiaryCard(canvasCtx, canvasInfo, diary) {
  var ctx = canvasCtx;
  var w = canvasInfo.width;
  var h = canvasInfo.height;
  var dpr = canvasInfo.dpr || 2;

  // 清空
  ctx.clearRect(0, 0, w, h);

  // 背景 — 温暖纸张色
  ctx.fillStyle = '#F5F0E8';
  ctx.fillRect(0, 0, w, h);

  // 顶部装饰条
  var gradient = ctx.createLinearGradient(0, 0, w, 0);
  gradient.addColorStop(0, '#C4956A');
  gradient.addColorStop(1, '#E8D5C4');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, 8 * dpr);

  // 内容区域
  var padding = 40 * dpr;
  var y = 60 * dpr;

  // 日期
  ctx.fillStyle = '#B8A99A';
  ctx.font = 12 * dpr + 'px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(formatDate(diary.createdAt), padding, y);
  y += 30 * dpr;

  // 标题
  if (diary.title) {
    ctx.fillStyle = '#3D3226';
    ctx.font = 'bold ' + 22 * dpr + 'px serif';
    var titleLines = wrapText(ctx, diary.title, w - padding * 2, 2);
    titleLines.forEach(function (line) {
      ctx.fillText(line, padding, y);
      y += 32 * dpr;
    });
    y += 10 * dpr;
  }

  // 心情标签
  if (diary.moodLabel) {
    var emoji = MOODS_FALLBACK[diary.mood] || '💭';
    ctx.fillStyle = '#E8D5C4';
    var labelWidth = ctx.measureText(emoji + ' ' + diary.moodLabel).width + 24 * dpr;
    roundRect(ctx, padding, y - 18 * dpr, labelWidth, 28 * dpr, 14 * dpr);
    ctx.fill();
    ctx.fillStyle = '#8B5E3C';
    ctx.font = 13 * dpr + 'px sans-serif';
    ctx.fillText(emoji + ' ' + diary.moodLabel, padding + 12 * dpr, y);
    y += 36 * dpr;
  }

  // 分隔线
  ctx.strokeStyle = '#E8D5C4';
  ctx.lineWidth = 1 * dpr;
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(w - padding, y);
  ctx.stroke();
  y += 24 * dpr;

  // 正文预览（纯文本，去掉 markdown 标记）
  ctx.fillStyle = '#3D3226';
  ctx.font = 15 * dpr + 'px sans-serif';
  ctx.lineHeight = 1.8;
  var plainText = stripMarkdown(diary.content || '');
  var lines = wrapText(ctx, plainText, w - padding * 2, 12);
  lines.forEach(function (line) {
    ctx.fillText(line, padding, y);
    y += 26 * dpr;
  });

  // 底部水印
  var footerY = h - 40 * dpr;
  ctx.fillStyle = '#C4956A';
  ctx.font = 12 * dpr + 'px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('天天记 · 记录生活的每一刻', padding, footerY);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#B8A99A';
  ctx.fillText('扫码下载天天记', w - padding, footerY);
}

/**
 * 生成分享图片并返回临时路径
 */
function generateShareImage(canvasNode, diary) {
  var ctx = canvasNode.getContext('2d');
  var dpr = wx.getWindowInfo().pixelRatio || 2;
  var width = 600;
  var height = 900;
  canvasNode.width = width * dpr;
  canvasNode.height = height * dpr;

  drawDiaryCard(ctx, { width: width * dpr, height: height * dpr, dpr: dpr }, diary);

  return new Promise(function (resolve, reject) {
    wx.canvasToTempFilePath({
      canvas: canvasNode,
      success: function (res) {
        resolve(res.tempFilePath);
      },
      fail: reject
    });
  });
}

/**
 * 保存图片到相册
 */
function saveToAlbum(tempFilePath) {
  return new Promise(function (resolve, reject) {
    wx.saveImageToPhotosAlbum({
      filePath: tempFilePath,
      success: resolve,
      fail: function (err) {
        if (err.errMsg.indexOf('auth deny') > -1) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中允许保存到相册',
            confirmText: '去设置',
            success: function (res) {
              if (res.confirm) wx.openSetting();
            }
          });
        }
        reject(err);
      }
    });
  });
}

// ── 工具函数 ──

function formatDate(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/!\[.*?\]\(.*?\)/g, '[图片]')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^[-*+]\s/gm, '· ')
    .replace(/^\d+\.\s/gm, '')
    .replace(/```[\s\S]*?```/g, '[代码]')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function wrapText(ctx, text, maxWidth, maxLines) {
  var chars = text.split('');
  var lines = [];
  var currentLine = '';
  for (var i = 0; i < chars.length; i++) {
    var testLine = currentLine + chars[i];
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = chars[i];
      if (lines.length >= maxLines - 1) {
        // 最后一行加省略号
        var remaining = chars.slice(i).join('');
        while (ctx.measureText(currentLine + '...').width > maxWidth && currentLine) {
          currentLine = currentLine.slice(0, -1);
        }
        lines.push(currentLine + '...');
        return lines;
      }
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

module.exports = {
  drawDiaryCard: drawDiaryCard,
  generateShareImage: generateShareImage,
  saveToAlbum: saveToAlbum
};
