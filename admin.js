// ========== 后台管理逻辑 ==========

const CONFIG = {
  // "password" 的 SHA-256，部署时替换为你自己密码的哈希值
  passwordHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
  maxAttempts: 3,
  lockoutSeconds: 30,
  storageKey: 'resource-admin-edits',
};

let adminData = null;
let workingResources = [];
let originalJSON = '';
let editId = null;       // 正在编辑的资源 id，null = 新增模式
let deleteId = null;     // 待删除的资源 id

// ========== SHA-256（Web Crypto API）==========
async function sha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ========== 初始化 ==========
async function init() {
  if (sessionStorage.getItem('admin-logged-in') === 'true') {
    await showAdminPanel();
  } else {
    showLoginPanel();
  }
}

// ========== 登录 ==========
function showLoginPanel() {
  document.getElementById('loginPanel').style.display = 'block';
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('passwordInput').focus();
}

async function handleLogin() {
  const password = document.getElementById('passwordInput').value;
  const errorEl = document.getElementById('loginError');
  const timerEl = document.getElementById('lockoutTimer');

  // 检查锁定
  const lockoutUntil = sessionStorage.getItem('admin-lockout');
  if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
    const remaining = Math.ceil((parseInt(lockoutUntil) - Date.now()) / 1000);
    timerEl.textContent = `请等待 ${remaining} 秒后再试`;
    return;
  } else if (lockoutUntil) {
    sessionStorage.removeItem('admin-lockout');
    sessionStorage.removeItem('admin-attempts');
  }

  const hash = await sha256(password);
  if (hash === CONFIG.passwordHash) {
    sessionStorage.setItem('admin-logged-in', 'true');
    sessionStorage.removeItem('admin-attempts');
    sessionStorage.removeItem('admin-lockout');
    errorEl.textContent = '';
    timerEl.textContent = '';
    await showAdminPanel();
  } else {
    let attempts = parseInt(sessionStorage.getItem('admin-attempts') || '0') + 1;
    sessionStorage.setItem('admin-attempts', attempts.toString());
    if (attempts >= CONFIG.maxAttempts) {
      const lockoutUntil = Date.now() + CONFIG.lockoutSeconds * 1000;
      sessionStorage.setItem('admin-lockout', lockoutUntil.toString());
      timerEl.textContent = `密码错误次数过多，请等待 ${CONFIG.lockoutSeconds} 秒`;
      document.getElementById('passwordInput').value = '';
    } else {
      errorEl.textContent = `密码错误，还剩 ${CONFIG.maxAttempts - attempts} 次尝试机会`;
    }
  }
}

// ========== 管理面板 ==========
async function showAdminPanel() {
  document.getElementById('loginPanel').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';

  await loadData();
  renderTable();
  updateModCount();
}

async function loadData() {
  if (!adminData) {
    adminData = await loadResources();
  }

  const edits = localStorage.getItem(CONFIG.storageKey);
  if (edits) {
    workingResources = JSON.parse(edits);
  } else {
    workingResources = JSON.parse(JSON.stringify(adminData.resources));
  }
  originalJSON = JSON.stringify(adminData.resources);
}

function isModified() {
  return JSON.stringify(workingResources) !== originalJSON;
}

function updateModCount() {
  const el = document.getElementById('modCount');
  if (isModified()) {
    const count = countChanges();
    el.textContent = `⚠ 已修改 ${count} 项`;
  } else {
    el.textContent = '';
  }
}

function countChanges() {
  const orig = adminData.resources;
  let count = 0;
  // 统计新增+修改
  workingResources.forEach(wr => {
    const found = orig.find(r => r.id === wr.id);
    if (!found || JSON.stringify(found) !== JSON.stringify(wr)) count++;
  });
  // 统计删除
  orig.forEach(or => {
    if (!workingResources.find(r => r.id === or.id)) count++;
  });
  return count;
}

// ========== 表格渲染 ==========
function renderTable() {
  const tbody = document.getElementById('resourceTableBody');
  if (workingResources.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:var(--space-xl);color:var(--text-muted);">暂无资源，点击「新增资源」添加</td></tr>`;
    return;
  }

  tbody.innerHTML = workingResources.map(r => {
    const catName = getCategoryName(adminData, r.category);
    return `
      <tr>
        <td class="cell-title" title="${escapeHTML(r.title)}">${escapeHTML(r.title)}</td>
        <td><span class="card-category cat-${r.category}">${catName}</span></td>
        <td>${r.date || '-'}</td>
        <td>${r.featured ? '⭐' : '-'}</td>
        <td class="cell-actions">
          <button class="btn btn-outline btn-sm edit-btn" data-id="${r.id}">编辑</button>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${r.id}">删除</button>
        </td>
      </tr>`;
  }).join('');

  // 事件委托
  tbody.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openFormModal(btn.dataset.id));
  });
  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
  });
}

// ========== 表单模态框 ==========
function openFormModal(id) {
  editId = id || null;
  const isEdit = !!id;
  document.getElementById('formTitle').textContent = isEdit ? '编辑资源' : '新增资源';

  // 填充分类下拉
  const catSelect = document.getElementById('fCategory');
  catSelect.innerHTML = getCategories(adminData).map(c =>
    `<option value="${c.id}">${c.icon} ${c.name}</option>`
  ).join('');

  // 填充表单
  if (isEdit) {
    const r = workingResources.find(r => r.id === id);
    if (!r) return;
    document.getElementById('fTitle').value = r.title || '';
    document.getElementById('fCategory').value = r.category || 'game';
    document.getElementById('fDate').value = r.date || '';
    document.getElementById('fDesc').value = r.description || '';
    document.getElementById('fImage').value = r.image || '';
    document.getElementById('fSize').value = r.size || '';
    document.getElementById('fPlatform').value = r.platform || '';
    document.getElementById('fTags').value = (r.tags || []).join(', ');
    document.getElementById('fFeatured').checked = r.featured || false;
    renderLinksEditor(r.links || []);
    previewImage(r.image);
  } else {
    document.getElementById('fTitle').value = '';
    document.getElementById('fCategory').value = 'game';
    document.getElementById('fDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('fDesc').value = '';
    document.getElementById('fImage').value = '';
    document.getElementById('fSize').value = '';
    document.getElementById('fPlatform').value = '';
    document.getElementById('fTags').value = '';
    document.getElementById('fFeatured').checked = false;
    renderLinksEditor([{ label: '', url: '', password: '' }]);
    document.getElementById('imagePreview').innerHTML = '<span class="placeholder">输入URL后预览</span>';
  }

  document.getElementById('formModal').classList.add('show');
  document.body.style.overflow = 'hidden';
  document.getElementById('fTitle').focus();
}

function closeFormModal() {
  document.getElementById('formModal').classList.remove('show');
  document.body.style.overflow = '';
}

// ========== 链接编辑器 ==========
function renderLinksEditor(links) {
  const container = document.getElementById('linksEditor');
  if (!links || links.length === 0) links = [{ label: '', url: '', password: '' }];

  container.innerHTML = links.map((link, i) => `
    <div class="link-row">
      <input type="text" class="link-label" value="${escapeHTML(link.label || '')}" placeholder="网盘名称" data-idx="${i}">
      <input type="url" class="link-url" value="${escapeHTML(link.url || '')}" placeholder="下载链接" data-idx="${i}">
      <input type="text" class="link-pass" value="${escapeHTML(link.password || '')}" placeholder="提取码" data-idx="${i}">
      <button type="button" class="btn-remove-link" data-idx="${i}" ${links.length <= 1 ? 'disabled' : ''}>✕</button>
    </div>
  `).join('');

  // 删除链接
  container.querySelectorAll('.btn-remove-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const links = getLinksFromEditor();
      if (links.length <= 1) return;
      links.splice(parseInt(btn.dataset.idx), 1);
      renderLinksEditor(links);
    });
  });
}

function getLinksFromEditor() {
  const labels = document.querySelectorAll('#linksEditor .link-label');
  const urls = document.querySelectorAll('#linksEditor .link-url');
  const passes = document.querySelectorAll('#linksEditor .link-pass');
  const links = [];
  for (let i = 0; i < labels.length; i++) {
    links.push({
      label: labels[i].value.trim(),
      url: urls[i].value.trim(),
      password: passes[i].value.trim(),
    });
  }
  return links;
}

// ========== 图片预览 ==========
function previewImage(url) {
  const preview = document.getElementById('imagePreview');
  if (url && url.trim()) {
    preview.innerHTML = `<img src="${escapeHTML(url.trim())}" alt="预览" onerror="this.parentElement.innerHTML='<span class=placeholder>图片加载失败</span>'">`;
  } else {
    preview.innerHTML = '<span class="placeholder">输入URL后预览</span>';
  }
}

// ========== 保存资源 ==========
function saveResource() {
  const title = document.getElementById('fTitle').value.trim();
  if (!title) {
    showToast('请输入资源标题', 'error');
    return;
  }

  const links = getLinksFromEditor().filter(l => l.label && l.url);
  if (links.length === 0) {
    showToast('请至少添加一个下载链接', 'error');
    return;
  }

  const resource = {
    id: editId || generateId(),
    title: title,
    category: document.getElementById('fCategory').value,
    description: document.getElementById('fDesc').value.trim(),
    image: document.getElementById('fImage').value.trim(),
    size: document.getElementById('fSize').value.trim(),
    platform: document.getElementById('fPlatform').value.trim(),
    tags: document.getElementById('fTags').value.split(',').map(t => t.trim()).filter(Boolean),
    featured: document.getElementById('fFeatured').checked,
    date: document.getElementById('fDate').value,
    links: links,
  };

  if (editId) {
    const idx = workingResources.findIndex(r => r.id === editId);
    if (idx !== -1) workingResources[idx] = resource;
  } else {
    workingResources.unshift(resource);
  }

  saveToLocalStorage();
  closeFormModal();
  renderTable();
  updateModCount();
  showToast(editId ? '资源已更新' : '资源已添加');
}

function saveToLocalStorage() {
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(workingResources));
}

// ========== 删除 ==========
function openDeleteModal(id) {
  deleteId = id;
  const r = workingResources.find(r => r.id === id);
  document.getElementById('deleteItemTitle').textContent = r ? r.title : '';
  document.getElementById('deleteModal').classList.add('show');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('show');
  deleteId = null;
}

function confirmDelete() {
  workingResources = workingResources.filter(r => r.id !== deleteId);
  saveToLocalStorage();
  closeDeleteModal();
  renderTable();
  updateModCount();
  showToast('资源已删除');
}

// ========== 导出 ==========
function exportJSON() {
  const data = {
    site: adminData.site,
    categories: adminData.categories,
    resources: workingResources,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'resources.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('JSON 文件已下载');
}

// ========== 撤销修改 ==========
function discardEdits() {
  if (!isModified()) return;
  if (!confirm('确定要撤销所有修改吗？此操作不可恢复。')) return;
  localStorage.removeItem(CONFIG.storageKey);
  workingResources = JSON.parse(JSON.stringify(adminData.resources));
  renderTable();
  updateModCount();
  showToast('已恢复原始数据');
}

// ========== 退出登录 ==========
function logout() {
  sessionStorage.removeItem('admin-logged-in');
  workingResources = [];
  adminData = null;
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('loginPanel').style.display = 'block';
  document.getElementById('passwordInput').value = '';
}

// ========== Toast ==========
function showToast(msg, type) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast ' + (type || '');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// ========== HTML 转义 ==========
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ========== 事件绑定 ==========
document.getElementById('loginBtn').addEventListener('click', handleLogin);
document.getElementById('passwordInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleLogin();
});

document.getElementById('addResourceBtn').addEventListener('click', () => openFormModal(null));
document.getElementById('exportBtn').addEventListener('click', exportJSON);
document.getElementById('discardBtn').addEventListener('click', discardEdits);
document.getElementById('logoutBtn').addEventListener('click', logout);

// 表单模态框
document.getElementById('formModalClose').addEventListener('click', closeFormModal);
document.getElementById('formModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeFormModal();
});
document.getElementById('formCancelBtn').addEventListener('click', closeFormModal);
document.getElementById('formSaveBtn').addEventListener('click', saveResource);
document.getElementById('addLinkBtn').addEventListener('click', () => {
  const links = getLinksFromEditor();
  links.push({ label: '', url: '', password: '' });
  renderLinksEditor(links);
});

// 图片预览
document.getElementById('fImage').addEventListener('input', e => {
  previewImage(e.target.value);
});

// 键盘关闭表单
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.getElementById('formModal').classList.contains('show')) closeFormModal();
    if (document.getElementById('deleteModal').classList.contains('show')) closeDeleteModal();
  }
});

// 删除模态框
document.getElementById('deleteModalClose').addEventListener('click', closeDeleteModal);
document.getElementById('deleteModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeDeleteModal();
});
document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);
document.getElementById('deleteConfirmBtn').addEventListener('click', confirmDelete);

// 启动
init();
