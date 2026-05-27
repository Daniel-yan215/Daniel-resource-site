// ========== 数据层：加载、缓存、筛选 ==========

let _cache = null;

// 加载 resources.json（带 sessionStorage 缓存）
async function loadResources() {
  if (_cache) return _cache;

  const cached = sessionStorage.getItem('resource-data');
  if (cached) {
    _cache = JSON.parse(cached);
    return _cache;
  }

  try {
    const resp = await fetch('resources.json');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    _cache = data;
    try {
      sessionStorage.setItem('resource-data', JSON.stringify(data));
    } catch (_) { /* sessionStorage 满则忽略 */ }
    return data;
  } catch (fetchErr) {
    // file:// 协议下 fetch 会失败，使用内嵌数据兜底
    if (window.__RESOURCES__) {
      _cache = window.__RESOURCES__;
      return _cache;
    }
    throw new Error('数据加载失败，请使用本地服务器打开（如 Live Server）');
  }
}

// 清除缓存（管理端修改数据后调用）
function clearCache() {
  _cache = null;
  sessionStorage.removeItem('resource-data');
}

// 获取站点信息
function getSiteInfo(data) {
  return data.site;
}

// 获取分类列表
function getCategories(data) {
  return data.categories;
}

// 获取资源列表（支持筛选、搜索、排序）
function getResources(data, opts = {}) {
  let list = [...data.resources];
  const { category, search, sort, featured } = opts;

  // 分类筛选
  if (category && category !== 'all') {
    list = list.filter(r => r.category === category);
  }

  // 关键词搜索
  if (search && search.trim()) {
    const kw = search.trim().toLowerCase();
    list = list.filter(r => {
      return (
        r.title.toLowerCase().includes(kw) ||
        r.description.toLowerCase().includes(kw) ||
        (r.tags && r.tags.some(t => t.toLowerCase().includes(kw)))
      );
    });
  }

  // 仅推荐
  if (featured) {
    list = list.filter(r => r.featured);
  }

  // 排序
  if (sort === 'date-asc') {
    list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  } else if (sort === 'date-desc') {
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  } else if (sort === 'title') {
    list.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
  } else {
    // 默认按日期倒序
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  return list;
}

// 按 ID 查找资源
function getResourceById(data, id) {
  return data.resources.find(r => r.id === id);
}

// 生成唯一 ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// 获取分类名称
function getCategoryName(data, categoryId) {
  const cat = data.categories.find(c => c.id === categoryId);
  return cat ? cat.name : categoryId;
}

// 获取分类图标
function getCategoryIcon(data, categoryId) {
  const cat = data.categories.find(c => c.id === categoryId);
  return cat ? cat.icon : '📁';
}
