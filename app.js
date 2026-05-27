// 工具数据
const tools = [
  // 系统工具
  { name: 'CCleaner', icon: '🧹', desc: '系统垃圾清理', category: 'system', url: 'https://www.ccleaner.com/' },
  { name: 'Geek Uninstaller', icon: '🗑️', desc: '软件彻底卸载', category: 'system', url: 'https://geekuninstaller.com/' },
  { name: 'Driver Booster', icon: '🔧', desc: '驱动程序更新', category: 'system', url: 'https://www.iobit.com/driver-booster.php' },
  { name: 'DiskGenius', icon: '💾', desc: '磁盘分区管理', category: 'system', url: 'https://www.diskgenius.com/' },
  { name: 'Dism++', icon: '⚡', desc: '系统优化工具', category: 'system', url: 'https://github.com/Chuyu-Team/Dism-Multi-language' },

  // 开发工具
  { name: 'VS Code', icon: '💻', desc: '代码编辑器', category: 'dev', url: 'https://code.visualstudio.com/' },
  { name: 'Git', icon: '🔀', desc: '版本控制系统', category: 'dev', url: 'https://git-scm.com/' },
  { name: 'Node.js', icon: '🟢', desc: 'JavaScript 运行时', category: 'dev', url: 'https://nodejs.org/' },
  { name: 'Postman', icon: '📡', desc: 'API 测试工具', category: 'dev', url: 'https://www.postman.com/' },
  { name: 'Xshell', icon: '🖥️', desc: 'SSH 终端工具', category: 'dev', url: 'https://www.xshell.com/' },

  // 办公软件
  { name: 'Microsoft Office', icon: '📄', desc: '办公套件', category: 'office', url: 'https://www.microsoft.com/office' },
  { name: 'Bandizip', icon: '📦', desc: '压缩解压软件', category: 'office', url: 'https://bandisoft.com/bandizip/' },
  { name: 'Adobe Acrobat', icon: '📑', desc: 'PDF 编辑器', category: 'office', url: 'https://www.adobe.com/acrobat.html' },
  { name: 'Typora', icon: '✏️', desc: 'Markdown 编辑器', category: 'office', url: 'https://typora.io/' },
  { name: 'Snipaste', icon: '📷', desc: '截图贴图工具', category: 'office', url: 'https://www.snipaste.com/' }
];

// DOM 元素
const toolsGrid = document.getElementById('toolsGrid');
const categoryBtns = document.querySelectorAll('.category-btn');

// 渲染工具卡片
function renderTools(category = 'all') {
  const filteredTools = category === 'all'
    ? tools
    : tools.filter(tool => tool.category === category);

  toolsGrid.innerHTML = filteredTools.map(tool => `
    <a href="${tool.url}" target="_blank" rel="noopener noreferrer" class="tool-card" data-category="${tool.category}">
      <span class="tool-icon">${tool.icon}</span>
      <h3 class="tool-name">${tool.name}</h3>
      <p class="tool-desc">${tool.desc}</p>
    </a>
  `).join('');
}

// 分类点击事件
categoryBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // 更新按钮状态
    categoryBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // 渲染对应分类
    renderTools(btn.dataset.category);
  });
});

// 初始化渲染
renderTools();
