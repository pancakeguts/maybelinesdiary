(() => {
  const win = document.getElementById('browserWindow');
  const shortcut = document.getElementById('siteShortcut');
  const taskWindow = document.getElementById('taskWindow');
  const titlebar = document.getElementById('titlebar');
  const startBtn = document.getElementById('startBtn');
  const startMenu = document.getElementById('startMenu');
  const statusText = document.getElementById('statusText');
  let minimized = false;
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  function openBrowser() {
    win.classList.add('open');
    win.setAttribute('aria-hidden', 'false');
    win.style.display = 'flex';
    taskWindow.hidden = false;
    taskWindow.classList.add('active');
    minimized = false;
    closeStart();
  }

  function closeBrowser() {
    win.classList.remove('open', 'maximized');
    win.setAttribute('aria-hidden', 'true');
    win.style.display = 'none';
    win.style.left = '';
    win.style.top = '';
    win.style.transform = '';
    taskWindow.hidden = true;
    minimized = false;
  }

  function minimizeBrowser() {
    win.style.display = 'none';
    taskWindow.classList.remove('active');
    minimized = true;
  }

  function toggleMaximize() {
    win.classList.toggle('maximized');
    if (!win.classList.contains('maximized')) {
      win.style.left = '';
      win.style.top = '';
      win.style.transform = '';
    }
  }

  function closeStart() {
    startMenu.classList.remove('open');
    startMenu.setAttribute('aria-hidden', 'true');
    startBtn.classList.remove('active');
    startBtn.setAttribute('aria-expanded', 'false');
  }

  shortcut.addEventListener('click', () => shortcut.classList.add('selected'));
  shortcut.addEventListener('dblclick', openBrowser);
  shortcut.addEventListener('keydown', event => {
    if (event.key === 'Enter') openBrowser();
  });
  if (matchMedia('(pointer: coarse)').matches) {
    shortcut.addEventListener('click', openBrowser);
  }

  document.getElementById('closeBtn').addEventListener('click', closeBrowser);
  document.getElementById('minimizeBtn').addEventListener('click', minimizeBrowser);
  document.getElementById('maximizeBtn').addEventListener('click', toggleMaximize);
  document.getElementById('homeBtn').addEventListener('click', () => {
    document.getElementById('pageFrame').scrollTop = 0;
    statusText.textContent = 'Home';
  });
  document.getElementById('backBtn').addEventListener('click', closeBrowser);
  document.getElementById('refreshBtn').addEventListener('click', () => {
    statusText.textContent = 'Refreshing...';
    setTimeout(() => statusText.textContent = 'Done', 450);
  });
  document.getElementById('goBtn').addEventListener('click', () => {
    document.getElementById('pageFrame').scrollTop = 0;
    statusText.textContent = 'Done';
  });

  taskWindow.addEventListener('click', () => {
    if (minimized) openBrowser(); else minimizeBrowser();
  });

  startBtn.addEventListener('click', event => {
    event.stopPropagation();
    const open = startMenu.classList.toggle('open');
    startMenu.setAttribute('aria-hidden', String(!open));
    startBtn.classList.toggle('active', open);
    startBtn.setAttribute('aria-expanded', String(open));
  });
  document.getElementById('startInternet').addEventListener('click', openBrowser);
  document.getElementById('shutDown').addEventListener('click', () => {
    document.getElementById('shutdown').classList.add('show');
    document.getElementById('shutdown').setAttribute('aria-hidden', 'false');
  });
  document.getElementById('restartBtn').addEventListener('click', () => location.reload());
  document.addEventListener('click', event => {
    if (!startMenu.contains(event.target) && event.target !== startBtn) closeStart();
    if (!shortcut.contains(event.target)) shortcut.classList.remove('selected');
  });

  titlebar.addEventListener('pointerdown', event => {
    if (event.target.closest('button') || win.classList.contains('maximized')) return;
    isDragging = true;
    const rect = win.getBoundingClientRect();
    dragOffsetX = event.clientX - rect.left;
    dragOffsetY = event.clientY - rect.top;
    win.style.transform = 'none';
    win.style.left = rect.left + 'px';
    win.style.top = rect.top + 'px';
    titlebar.setPointerCapture(event.pointerId);
  });
  titlebar.addEventListener('pointermove', event => {
    if (!isDragging) return;
    const maxX = innerWidth - win.offsetWidth;
    const maxY = innerHeight - 70;
    win.style.left = Math.max(0, Math.min(maxX, event.clientX - dragOffsetX)) + 'px';
    win.style.top = Math.max(0, Math.min(maxY, event.clientY - dragOffsetY)) + 'px';
  });
  titlebar.addEventListener('pointerup', () => { isDragging = false; });
  titlebar.addEventListener('dblclick', toggleMaximize);

  document.querySelectorAll('.web-link').forEach(link => {
    link.addEventListener('mouseenter', () => statusText.textContent = link.href);
    link.addEventListener('mouseleave', () => statusText.textContent = 'Done');
  });

  function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
  }
  updateClock();
  setInterval(updateClock, 30000);
})();
