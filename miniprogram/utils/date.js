// date.js - 日期工具函数

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm
 */
function formatDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const dateStr = formatDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
}

/**
 * 获取相对时间描述
 */
function getRelativeTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diff = now - d;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  if (diff < 2 * day) return '昨天';
  if (diff < 3 * day) return '前天';
  if (diff < week) return `${Math.floor(diff / day)}天前`;
  if (diff < month) return `${Math.floor(diff / week)}周前`;
  if (diff < year) return formatDate(d);

  return formatDate(d);
}

/**
 * 判断两个日期是否为同一天
 */
function isSameDay(date1, date2) {
  return formatDate(date1) === formatDate(date2);
}

/**
 * 获取今天的日期字符串
 */
function getToday() {
  return formatDate(new Date());
}

/**
 * 获取当前时间戳 (ISO 格式)
 */
function now() {
  return new Date().toISOString();
}

/**
 * 获取本周的日期范围
 */
function getThisWeek() {
  const now = new Date();
  const dayOfWeek = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: formatDate(monday),
    end: formatDate(sunday),
  };
}

/**
 * 按日期分组日记 - 返回 [{ date, diaries }]
 */
function groupByDate(diaries) {
  const groups = {};
  diaries.forEach((diary) => {
    const dateKey = formatDate(diary.createdAt);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(diary);
  });

  return Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({
      date,
      diaries: groups[date],
    }));
}

/**
 * 获取友好的日期显示
 * 今天 → "今天"
 * 昨天 → "昨天"
 * 今年 → "MM月DD日"
 * 往年 → "YYYY年MM月DD日"
 */
function getFriendlyDate(dateStr) {
  const today = getToday();
  const d = new Date(dateStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today) return '今天';
  if (dateStr === formatDate(yesterday)) return '昨天';

  const currentYear = new Date().getFullYear();
  const diaryYear = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  if (diaryYear === currentYear) {
    return `${month}月${day}日`;
  }
  return `${diaryYear}年${month}月${day}日`;
}

module.exports = {
  formatDate,
  formatDateTime,
  getRelativeTime,
  isSameDay,
  getToday,
  now,
  getThisWeek,
  groupByDate,
  getFriendlyDate,
};
