// ========== 首页逻辑 ==========

let appData = null;
let allResources = [];

// 状态
const state = {
  activeCategory: 'all',
  searchKeyword: '',
  sortBy: 'date-desc',
};

// 防抖
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ========== 初始化 ==========
async function init() {
  showSkeleton();
  try {
    appData = await loadResources();
    const site = getSiteInfo(appData);
    document.getElementById('site-name').textContent = site.name;
    document.getElementById('site-title').textContent = site.name;
    document.getElementById('site-desc').textContent = site.description;
    document.getElementById('footer-text').textContent = site.footerText;
    document.title = site.name;

    allResources = getResources(appData, {});
    renderCategories();
    renderAll();
  } catch (err) {
    showError(err.message);
  }
}

// ========== 骨架屏 ==========
function showSkeleton() {
  const container = document.getElementById('skeletonGrid');
  container.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    container.innerHTML += `
      <div class="skeleton-card">
        <div class="skeleton-image"></div>
        <div class="skeleton-body">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
        </div>
      </div>`;
  }
  container.style.display = 'grid';
  document.getElementById('resourceGrid').style.display = 'none';
  document.getElementById('featuredGrid').style.display = 'none';
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('errorState').style.display = 'none';
}

function hideSkeleton() {
  document.getElementById('skeletonGrid').style.display = 'none';
}

// ========== 错误状态 ==========
function showError(msg) {
  hideSkeleton();
  document.getElementById('resourceGrid').style.display = 'none';
  document.getElementById('featuredGrid').style.display = 'none';
  document.getElementById('emptyState').style.display = 'none';
  const errEl = document.getElementById('errorState');
  errEl.style.display = 'block';
  document.getElementById('errorMsg').textContent = msg;
}

// ========== 分类标签 ==========
function renderCategories() {
  const cats = getCategories(appData);
  const container = document.getElementById('categoryFilter');

  let html = '<button class="category-tag active" data-cat="all">全部</button>';
  cats.forEach(c => {
    html += `<button class="category-tag" data-cat="${c.id}">${c.icon} ${c.name}</button>`;
  });
  container.innerHTML = html;

  // 事件委托
  container.addEventListener('click', e => {
    const btn = e.target.closest('.category-tag');
    if (!btn) return;
    container.querySelectorAll('.category-tag').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeCategory = btn.dataset.cat;
    renderAll();
  });
}

// ========== 渲染全部 ==========
function renderAll() {
  hideSkeleton();
  document.getElementById('errorState').style.display = 'none';

  const resources = getResources(appData, {
    category: state.activeCategory,
    search: state.searchKeyword,
    sort: state.sortBy,
  });

  const featured = resources.filter(r => r.featured);
  const normal = state.activeCategory === 'all' && !state.searchKeyword
    ? resources.filter(r => !r.featured)
    : resources; // 筛选时推荐和普通合并显示

  // 推荐区
  const featuredGrid = document.getElementById('featuredGrid');
  if (featured.length > 0 && state.activeCategory === 'all' && !state.searchKeyword) {
    featuredGrid.innerHTML = featured.map(r => buildCard(r, true)).join('');
    featuredGrid.style.display = 'grid';
  } else {
    featuredGrid.style.display = 'none';
  }

  // 主列表
  const mainGrid = document.getElementById('resourceGrid');
  if (normal.length > 0) {
    mainGrid.innerHTML = normal.map(r => buildCard(r, false)).join('');
    mainGrid.style.display = 'grid';
    document.getElementById('emptyState').style.display = 'none';
  } else {
    mainGrid.style.display = 'none';
    document.getElementById('emptyState').style.display = featured.length > 0 ? 'none' : 'block';
  }

  // 计数
  document.getElementById('resultCount').textContent = `共 ${resources.length} 个资源`;
}

// ========== 构建卡片 HTML ==========
function buildCard(resource, isFeatured) {
  const icon = getCategoryIcon(appData, resource.category);
  const catName = getCategoryName(appData, resource.category);
  const hasImage = resource.image && resource.image.trim();

  let imgHTML;
  if (hasImage) {
    imgHTML = `<div class="card-image-wrapper">
      ${isFeatured ? '<span class="featured-badge">推荐</span>' : ''}
      <div class="card-image"><img src="${escapeHTML(resource.image)}" alt="${escapeHTML(resource.title)}" loading="lazy" onerror="this.parentElement.innerHTML='${icon}'"></div>
    </div>`;
  } else {
    imgHTML = `<div class="card-image-wrapper">
      ${isFeatured ? '<span class="featured-badge">推荐</span>' : ''}
      <div class="card-image">${icon}</div>
    </div>`;
  }

  const tags = (resource.tags || []).slice(0, 3).map(t => `<span class="card-tag">${escapeHTML(t)}</span>`).join('');

  return `
    <div class="resource-card" data-id="${resource.id}">
      ${imgHTML}
      <div class="card-body">
        <span class="card-category cat-${resource.category}">${catName}</span>
        <div class="card-title">${escapeHTML(resource.title)}</div>
        <div class="card-meta">
          ${resource.size ? `<span>💾 ${escapeHTML(resource.size)}</span>` : ''}
          ${resource.date ? `<span>📅 ${resource.date}</span>` : ''}
        </div>
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
      </div>
    </div>`;
}

// ========== 模态框 ==========
function openDetailModal(resource) {
  const overlay = document.getElementById('detailModal');
  const icon = getCategoryIcon(appData, resource.category);
  const catName = getCategoryName(appData, resource.category);

  // 图片
  const modalImage = document.getElementById('modalImage');
  if (resource.image && resource.image.trim()) {
    modalImage.innerHTML = `<img src="${escapeHTML(resource.image)}" alt="${escapeHTML(resource.title)}" onerror="this.parentElement.innerHTML='<span style=font-size:4rem>${icon}</span>'">`;
  } else {
    modalImage.innerHTML = `<span style="font-size:4rem">${icon}</span>`;
  }

  // 链接
  const linksHTML = (resource.links || []).map(link => `
    <div class="download-item">
      <div class="download-info">
        <span class="download-label">${escapeHTML(link.label)}</span>
        ${link.password ? `<span class="download-password">提取码: ${escapeHTML(link.password)}</span>` : ''}
      </div>
      <div class="download-actions">
        <button class="btn btn-primary btn-sm copy-link" data-url="${escapeHTML(link.url)}">📋 复制链接</button>
        ${link.password ? `<button class="btn btn-outline btn-sm copy-pass" data-pass="${escapeHTML(link.password)}">🔑 复制提取码</button>` : ''}
      </div>
    </div>
  `).join('');

  // 标签
  const tagsHTML = (resource.tags || []).map(t => `<span class="card-tag">${escapeHTML(t)}</span>`).join('');

  document.getElementById('modalBody').innerHTML = `
    <h2>${escapeHTML(resource.title)}</h2>
    <div class="modal-meta">
      <span class="card-category cat-${resource.category}">${catName}</span>
      ${resource.date ? `<span>📅 ${escapeHTML(resource.date)}</span>` : ''}
      ${resource.size ? `<span>💾 ${escapeHTML(resource.size)}</span>` : ''}
      ${resource.platform ? `<span>🖥 ${escapeHTML(resource.platform)}</span>` : ''}
    </div>
    ${resource.description ? `<div class="modal-desc">${escapeHTML(resource.description)}</div>` : ''}
    ${tagsHTML ? `<div class="modal-tags">${tagsHTML}</div>` : ''}
    <div class="download-section">
      <h3>📥 下载链接</h3>
      <div class="download-links">${linksHTML}</div>
    </div>
  `;

  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';

  // 绑定复制事件
  document.getElementById('modalBody').querySelectorAll('.copy-link').forEach(btn => {
    btn.addEventListener('click', () => copyText(btn.dataset.url, btn));
  });
  document.getElementById('modalBody').querySelectorAll('.copy-pass').forEach(btn => {
    btn.addEventListener('click', () => copyText(btn.dataset.pass, btn));
  });
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.remove('show');
  document.body.style.overflow = '';
}

// ========== 复制到剪贴板 ==========
async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const original = btn.textContent;
    btn.textContent = '✅ 已复制';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 1500);
  } catch (_) {
    showToast('复制失败，请手动复制', 'error');
  }
}

// ========== Toast ==========
function showToast(msg, type) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast ' + (type || '');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// ========== 事件绑定 ==========
function bindEvents() {
  // 搜索
  const searchInput = document.getElementById('searchInput');
  const debouncedSearch = debounce(() => {
    state.searchKeyword = searchInput.value;
    renderAll();
  }, 300);
  searchInput.addEventListener('input', debouncedSearch);

  // 排序
  document.getElementById('sortSelect').addEventListener('change', e => {
    state.sortBy = e.target.value;
    renderAll();
  });

  // 卡片点击 -> 模态框（事件委托）
  document.getElementById('resourceGrid').addEventListener('click', e => {
    const card = e.target.closest('.resource-card');
    if (!card) return;
    const resource = getResourceById(appData, card.dataset.id);
    if (resource) openDetailModal(resource);
  });

  document.getElementById('featuredGrid').addEventListener('click', e => {
    const card = e.target.closest('.resource-card');
    if (!card) return;
    const resource = getResourceById(appData, card.dataset.id);
    if (resource) openDetailModal(resource);
  });

  // 关闭模态框
  document.getElementById('modalClose').addEventListener('click', closeDetailModal);
  document.getElementById('detailModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDetailModal();
  });

  // ESC 关闭
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('detailModal').classList.contains('show')) {
      closeDetailModal();
    }
  });

  // 返回顶部
  const backBtn = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {
    backBtn.classList.toggle('show', window.scrollY > 500);
  });
  backBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ========== HTML 转义 ==========
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ========== 启动 ==========
bindEvents();
init();
