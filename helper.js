// 简易 CSV 解析器：支持用双引号包裹、转义 "" => "
export function parseCSV(text) {
  // 去掉 BOM
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // 可能是转义或结束
        if (text[i + 1] === '"') {
          field += '"';
          i++; // 跳过转义的第二个引号
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (ch === '\r') {
        // 兼容 CRLF：忽略 \r，交给 \n 处理换行
      } else {
        field += ch;
      }
    }
  }

  // 收尾：最后一个字段/行
  if (field.length > 0 || inQuotes || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // 去除可能的全空行
  return rows.filter(r => r.some(c => String(c).trim() !== ''));
}

// 在单元格字符串中加粗匹配的子串；安全地转义 HTML

// 工具：转义 HTML
export function escapeHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 工具：转义正则特殊字符
export function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}