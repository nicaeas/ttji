// constants.js - 天天记常量定义

// 心情标签
const MOODS = [
  { id: 'happy',     emoji: '😊', label: '开心',   color: '#F0C060' },
  { id: 'calm',      emoji: '😌', label: '平静',   color: '#7BA0A0' },
  { id: 'grateful',  emoji: '🥰', label: '感恩',   color: '#8BA07B' },
  { id: 'excited',   emoji: '🤩', label: '激动',   color: '#C47B6A' },
  { id: 'thoughtful',emoji: '🤔', label: '思考',   color: '#7B8BA0' },
  { id: 'sad',       emoji: '😢', label: '难过',   color: '#8B7BA0' },
  { id: 'anxious',   emoji: '😰', label: '焦虑',   color: '#A08B7B' },
  { id: 'tired',     emoji: '😴', label: '疲惫',   color: '#9B9B8B' },
  { id: 'inspired',  emoji: '💡', label: '灵感',   color: '#A0A07B' },
  { id: 'love',      emoji: '💕', label: '爱意',   color: '#C48B9B' },
];

// 默认日记模板
const DEFAULT_TEMPLATES = [
  {
    id: 'tpl_daily',
    name: '日常日记',
    icon: '📝',
    description: '记录日常生活的点滴',
    structure: {
      title: '',
      content: '## 今天发生了什么\n\n\n## 我的感受\n\n\n## 今日感悟\n\n',
      mood: 'calm',
    },
  },
  {
    id: 'tpl_mood',
    name: '心情日记',
    icon: '💭',
    description: '专注记录情绪与感受',
    structure: {
      title: '',
      content: '## 此刻心情\n\n\n## 原因分析\n\n\n## 应对方式\n\n',
      mood: 'calm',
    },
  },
  {
    id: 'tpl_travel',
    name: '旅行日记',
    icon: '✈️',
    description: '记录旅途中的见闻',
    structure: {
      title: '',
      content: '## 📍 目的地\n\n\n## 🗺️ 行程\n\n\n## 📸 见闻\n\n\n## 💰 花费\n\n',
      mood: 'excited',
    },
  },
  {
    id: 'tpl_work',
    name: '工作日志',
    icon: '💼',
    description: '梳理工作进展与计划',
    structure: {
      title: '',
      content: '## 今日完成\n\n\n## 遇到的问题\n\n\n## 明日计划\n\n\n## 需要协调\n\n',
      mood: 'thoughtful',
    },
  },
  {
    id: 'tpl_grateful',
    name: '感恩日记',
    icon: '🙏',
    description: '记录值得感恩的事',
    structure: {
      title: '',
      content: '## 今天感恩的三件事\n\n1. \n2. \n3. \n\n## 为什么感恩\n\n\n## 今日祝福\n\n',
      mood: 'grateful',
    },
  },
  {
    id: 'tpl_study',
    name: '学习笔记',
    icon: '📚',
    description: '整理学习内容与心得',
    structure: {
      title: '',
      content: '## 学习主题\n\n\n## 核心知识点\n\n\n## 个人理解\n\n\n## 待深入\n\n',
      mood: 'thoughtful',
    },
  },
  {
    id: 'tpl_review',
    name: '周/月回顾',
    icon: '🔄',
    description: '阶段性回顾与反思',
    structure: {
      title: '',
      content: '## 主要成就\n\n\n## 不足与遗憾\n\n\n## 经验教训\n\n\n## 下阶段目标\n\n',
      mood: 'thoughtful',
    },
  },
  {
    id: 'tpl_dream',
    name: '梦境记录',
    icon: '🌙',
    description: '记录奇妙的梦境',
    structure: {
      title: '',
      content: '## 梦境描述\n\n\n## 关键元素\n\n\n## 醒来感受\n\n\n## 可能的寓意\n\n',
      mood: 'calm',
    },
  },
];

// 日记排序方式
const SORT_OPTIONS = [
  { value: 'time-desc',  label: '最新优先' },
  { value: 'time-asc',   label: '最早优先' },
  { value: 'mood',       label: '按心情' },
  { value: 'title',      label: '按标题' },
];

module.exports = {
  MOODS,
  DEFAULT_TEMPLATES,
  SORT_OPTIONS,
};
