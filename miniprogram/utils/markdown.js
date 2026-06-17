// markdown.js - 轻量级 Markdown 解析器
// 为微信小程序定制的 Markdown → WXML 数据转换

/**
 * 解析 Markdown 文本为结构化数据
 * 返回 tokens 数组，供 WXML 模板渲染使用
 */
function parseMarkdown(text) {
  if (!text) return [];

  const lines = text.split('\n');
  const tokens = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 空行
    if (!line.trim()) {
      tokens.push({ type: 'blank' });
      i++;
      continue;
    }

    // 代码块 ```
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      tokens.push({
        type: 'code',
        lang: lang || '',
        content: codeLines.join('\n'),
      });
      continue;
    }

    // 引用 >
    if (line.trim().startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      tokens.push({
        type: 'quote',
        content: quoteLines.join('\n'),
      });
      continue;
    }

    // 分隔线 ---
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      tokens.push({ type: 'hr' });
      i++;
      continue;
    }

    // 标题 # ## ###
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      tokens.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: parseInline(headingMatch[2]),
      });
      i++;
      continue;
    }

    // 无序列表
    if (/^[\s]*[-*+]\s+/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^[\s]*[-*+]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^[\s]*[-*+]\s+/, '');
        listItems.push({
          type: 'li',
          content: parseInline(itemText),
        });
        i++;
      }
      tokens.push({ type: 'unordered-list', items: listItems });
      continue;
    }

    // 有序列表
    if (/^[\s]*\d+\.\s+/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^[\s]*\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^[\s]*\d+\.\s+/, '');
        listItems.push({
          type: 'li',
          content: parseInline(itemText),
        });
        i++;
      }
      tokens.push({ type: 'ordered-list', items: listItems });
      continue;
    }

    // 普通段落
    const paraLines = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    tokens.push({
      type: 'paragraph',
      content: parseInline(paraLines.join('\n')),
    });
  }

  return tokens;
}

/**
 * 判断是否为块级元素起始
 */
function isBlockStart(line) {
  return (
    /^#{1,6}\s+/.test(line) ||
    /^[\s]*[-*+]\s+/.test(line) ||
    /^[\s]*\d+\.\s+/.test(line) ||
    line.trim().startsWith('>') ||
    line.trim().startsWith('```') ||
    /^[-*_]{3,}\s*$/.test(line.trim())
  );
}

/**
 * 解析内联元素 (加粗、斜体、代码、链接等)
 * 返回 [{ type, content/text, ... }] 数组
 */
function parseInline(text) {
  if (!text) return [];

  const tokens = [];
  let remaining = text;

  while (remaining.length > 0) {
    // 粗体 **text** 或 __text__
    let match = remaining.match(/^(\*\*|__)(.*?)\1/);
    if (match) {
      if (match.index > 0) {
        tokens.push({ type: 'text', text: remaining.slice(0, match.index) });
      }
      tokens.push({ type: 'bold', content: parseInline(match[2]) });
      remaining = remaining.slice(match.index + match[0].length);
      continue;
    }

    // 行内代码 `code`
    match = remaining.match(/^`([^`]+)`/);
    if (match) {
      if (match.index > 0) {
        tokens.push({ type: 'text', text: remaining.slice(0, match.index) });
      }
      tokens.push({ type: 'inline-code', text: match[1] });
      remaining = remaining.slice(match.index + match[0].length);
      continue;
    }

    // 斜体 *text* 或 _text_ (单星号)
    match = remaining.match(/^(\*|_)(.*?)\1/);
    if (match) {
      if (match.index > 0) {
        tokens.push({ type: 'text', text: remaining.slice(0, match.index) });
      }
      tokens.push({ type: 'italic', content: parseInline(match[2]) });
      remaining = remaining.slice(match.index + match[0].length);
      continue;
    }

    // 删除线 ~~text~~
    match = remaining.match(/^~~(.*?)~~/);
    if (match) {
      if (match.index > 0) {
        tokens.push({ type: 'text', text: remaining.slice(0, match.index) });
      }
      tokens.push({ type: 'strikethrough', text: match[1] });
      remaining = remaining.slice(match.index + match[0].length);
      continue;
    }

    // 链接 [text](url)
    match = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      if (match.index > 0) {
        tokens.push({ type: 'text', text: remaining.slice(0, match.index) });
      }
      tokens.push({ type: 'link', text: match[1], url: match[2] });
      remaining = remaining.slice(match.index + match[0].length);
      continue;
    }

    // 普通文本 - 取到下一个特殊标记
    const nextSpecial = remaining.search(/[*_~`\[\]]/);
    if (nextSpecial === -1) {
      tokens.push({ type: 'text', text: remaining });
      break;
    }
    if (nextSpecial > 0) {
      tokens.push({ type: 'text', text: remaining.slice(0, nextSpecial) });
      remaining = remaining.slice(nextSpecial);
    } else {
      // nextSpecial === 0：特殊字符在开头但未被上述规则匹配
      // 将其作为普通文本消费掉，避免死循环
      tokens.push({ type: 'text', text: remaining[0] });
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

/**
 * 去除 Markdown 标记，获取纯文本预览
 */
function getPlainText(text) {
  if (!text) return '';

  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/```[\s\S]*?```/g, '[代码]')
    .replace(/[-*+]\s/g, '')
    .replace(/^\d+\.\s/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = {
  parseMarkdown,
  parseInline,
  getPlainText,
};
