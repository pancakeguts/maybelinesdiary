(() => {
  const startBtn = document.getElementById('startBtn');
  const startMenu = document.getElementById('startMenu');
  const statusText = document.getElementById('statusText');
  const searchResultsPanel = document.getElementById('searchResultsPanel');
  const savedTabs = document.querySelector('.saved-tabs');
  const browserFooter = document.querySelector('.browser-home-footer');
  let topZ = 10;

  function showBrowserHome() {
    searchResultsPanel.hidden = true;
    savedTabs.hidden = false;
    browserFooter.hidden = false;
    document.getElementById('searchInput').value = '';
    document.getElementById('pageFrame').scrollTop = 0;
    statusText.textContent = 'Done';
  }

  const apps = {
    browser: {
      window: document.getElementById('browserWindow'),
      shortcut: document.getElementById('siteShortcut'),
      task: document.getElementById('taskWindow'),
      titlebar: document.getElementById('titlebar'),
      minimized: false
    },
    files: {
      window: document.getElementById('filesWindow'),
      shortcut: document.getElementById('filesShortcut'),
      task: document.getElementById('taskFiles'),
      titlebar: document.getElementById('filesTitlebar'),
      minimized: false
    }
  };

  function closeStart() {
    startMenu.classList.remove('open');
    startMenu.setAttribute('aria-hidden', 'true');
    startBtn.classList.remove('active');
    startBtn.setAttribute('aria-expanded', 'false');
  }

  function focusApp(app) {
    topZ += 1;
    app.window.style.zIndex = topZ;
    Object.values(apps).forEach(item => item.task.classList.toggle('active', item === app && !item.minimized));
  }

  function openApp(name) {
    const app = apps[name];
    app.window.classList.add('open');
    app.window.setAttribute('aria-hidden', 'false');
    app.window.style.display = 'flex';
    app.task.hidden = false;
    app.minimized = false;
    focusApp(app);
    closeStart();
  }

  function closeApp(name) {
    const app = apps[name];
    app.window.classList.remove('open', 'maximized');
    app.window.setAttribute('aria-hidden', 'true');
    app.window.style.display = 'none';
    app.window.style.left = '';
    app.window.style.top = '';
    app.window.style.transform = '';
    app.task.hidden = true;
    app.minimized = false;
  }

  function minimizeApp(name) {
    const app = apps[name];
    app.window.style.display = 'none';
    app.task.classList.remove('active');
    app.minimized = true;
  }

  function toggleMaximize(name) {
    const app = apps[name];
    app.window.classList.toggle('maximized');
    if (!app.window.classList.contains('maximized')) {
      app.window.style.left = '';
      app.window.style.top = '';
      app.window.style.transform = '';
    }
    focusApp(app);
  }

  function bindShortcut(name) {
    const app = apps[name];
    app.shortcut.addEventListener('click', () => {
      document.querySelectorAll('.desktop-icon').forEach(icon => icon.classList.remove('selected'));
      app.shortcut.classList.add('selected');
    });
    app.shortcut.addEventListener('dblclick', () => openApp(name));
    app.shortcut.addEventListener('keydown', event => {
      if (event.key === 'Enter') openApp(name);
    });
    if (matchMedia('(pointer: coarse)').matches) app.shortcut.addEventListener('click', () => openApp(name));
    app.task.addEventListener('click', () => {
      if (app.minimized || app.window.style.display === 'none') openApp(name);
      else if (app.task.classList.contains('active')) minimizeApp(name);
      else focusApp(app);
    });
    app.window.addEventListener('pointerdown', () => focusApp(app));
  }

  function bindDrag(name) {
    const app = apps[name];
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;
    app.titlebar.addEventListener('pointerdown', event => {
      if (event.target.closest('button') || app.window.classList.contains('maximized')) return;
      dragging = true;
      const rect = app.window.getBoundingClientRect();
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;
      app.window.style.transform = 'none';
      app.window.style.left = rect.left + 'px';
      app.window.style.top = rect.top + 'px';
      app.titlebar.setPointerCapture(event.pointerId);
    });
    app.titlebar.addEventListener('pointermove', event => {
      if (!dragging) return;
      const maxX = innerWidth - app.window.offsetWidth;
      const maxY = innerHeight - 70;
      app.window.style.left = Math.max(0, Math.min(maxX, event.clientX - offsetX)) + 'px';
      app.window.style.top = Math.max(0, Math.min(maxY, event.clientY - offsetY)) + 'px';
    });
    app.titlebar.addEventListener('pointerup', () => { dragging = false; });
    app.titlebar.addEventListener('dblclick', () => toggleMaximize(name));
  }

  Object.keys(apps).forEach(name => {
    bindShortcut(name);
    bindDrag(name);
  });

  document.getElementById('closeBtn').addEventListener('click', () => closeApp('browser'));
  document.getElementById('minimizeBtn').addEventListener('click', () => minimizeApp('browser'));
  document.getElementById('maximizeBtn').addEventListener('click', () => toggleMaximize('browser'));
  document.querySelectorAll('[data-action][data-window]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      const action = button.dataset.action;
      const name = button.dataset.window;
      if (action === 'close') closeApp(name);
      if (action === 'minimize') minimizeApp(name);
      if (action === 'maximize') toggleMaximize(name);
    });
  });

  document.getElementById('homeBtn').addEventListener('click', () => {
    showBrowserHome();
    statusText.textContent = 'Home';
  });
  document.getElementById('backBtn').addEventListener('click', () => {
    if (!searchResultsPanel.hidden) showBrowserHome();
    else closeApp('browser');
  });
  document.getElementById('refreshBtn').addEventListener('click', () => {
    statusText.textContent = 'Refreshing...';
    setTimeout(() => statusText.textContent = 'Done', 450);
  });
  document.getElementById('goBtn').addEventListener('click', () => {
    document.getElementById('pageFrame').scrollTop = 0;
    statusText.textContent = 'Done';
  });
  document.getElementById('webSearch').addEventListener('submit', event => {
    event.preventDefault();
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;
    const searchElement = window.google?.search?.cse?.element?.getElement('maybelineSearch');
    if (!searchElement) {
      statusText.textContent = 'Search is still loading. Try again.';
      return;
    }
    savedTabs.hidden = true;
    browserFooter.hidden = true;
    searchResultsPanel.hidden = false;
    statusText.textContent = 'Searching selected sites...';
    searchElement.execute(query);
    document.getElementById('pageFrame').scrollTop = 0;
    setTimeout(() => statusText.textContent = 'Done', 500);
  });
  document.getElementById('clearSearchBtn').addEventListener('click', showBrowserHome);
  document.querySelectorAll('.saved-tab').forEach(link => {
    link.addEventListener('mouseenter', () => statusText.textContent = link.href);
    link.addEventListener('mouseleave', () => statusText.textContent = 'Done');
  });

  const folderAddress = document.getElementById('folderAddress');
  const fileList = document.getElementById('fileList');
  const folderEmpty = document.getElementById('folderEmpty');
  const retroGallery = document.getElementById('retroGallery');
  const photoViewer = document.getElementById('photoViewer');
  const photoViewerImage = document.getElementById('photoViewerImage');
  const photoViewerName = document.getElementById('photoViewerName');
  const filesStatus = document.getElementById('filesStatus');
  function showFolder(folder) {
    folderAddress.textContent = 'C:\\Maybeline\\' + folder;
    document.querySelectorAll('.side-location').forEach(button => button.classList.toggle('active', button.dataset.folder === folder));
    const isHome = folder === 'Media';
    const isGallery = folder === 'sick kvnt';
    fileList.hidden = !isHome;
    retroGallery.hidden = !isGallery;
    folderEmpty.hidden = isHome || isGallery;
    photoViewer.hidden = true;
    filesStatus.textContent = isHome ? '5 object(s)' : isGallery ? '15 picture(s)' : '0 object(s)';
  }
  document.querySelectorAll('.side-location').forEach(button => button.addEventListener('click', () => showFolder(button.dataset.folder)));
  document.querySelectorAll('.file-row').forEach(row => {
    row.addEventListener('click', () => {
      document.querySelectorAll('.file-row').forEach(item => item.classList.remove('selected'));
      row.classList.add('selected');
    });
    row.addEventListener('dblclick', () => showFolder(row.dataset.folder));
  });
  document.getElementById('filesBack').addEventListener('click', () => showFolder('Media'));
  document.getElementById('newFolderBtn').addEventListener('click', () => {
    filesStatus.textContent = 'New folders will be available when media is added.';
  });
  document.querySelectorAll('.retro-photo').forEach(photo => {
    const openPhoto = () => {
      photoViewerImage.src = photo.dataset.full;
      photoViewerName.textContent = photo.querySelector('b').textContent + ' - Picture Viewer';
      photoViewer.hidden = false;
      filesStatus.textContent = photo.querySelector('b').textContent;
    };
    photo.addEventListener('click', () => {
      document.querySelectorAll('.retro-photo').forEach(item => item.classList.remove('selected'));
      photo.classList.add('selected');
    });
    photo.addEventListener('dblclick', openPhoto);
    if (matchMedia('(pointer: coarse)').matches) photo.addEventListener('click', openPhoto);
    photo.addEventListener('keydown', event => {
      if (event.key === 'Enter') openPhoto();
    });
  });
  document.getElementById('closePhotoViewer').addEventListener('click', () => {
    photoViewer.hidden = true;
    filesStatus.textContent = '15 picture(s)';
  });

  startBtn.addEventListener('click', event => {
    event.stopPropagation();
    const open = startMenu.classList.toggle('open');
    startMenu.setAttribute('aria-hidden', String(!open));
    startBtn.classList.toggle('active', open);
    startBtn.setAttribute('aria-expanded', String(open));
  });
  document.getElementById('startInternet').addEventListener('click', () => openApp('browser'));
  document.getElementById('startFiles').addEventListener('click', () => openApp('files'));
  document.getElementById('shutDown').addEventListener('click', () => {
    document.getElementById('shutdown').classList.add('show');
    document.getElementById('shutdown').setAttribute('aria-hidden', 'false');
  });
  document.getElementById('restartBtn').addEventListener('click', () => location.reload());
  document.addEventListener('click', event => {
    if (!startMenu.contains(event.target) && event.target !== startBtn) closeStart();
    if (!event.target.closest('.desktop-icon')) document.querySelectorAll('.desktop-icon').forEach(icon => icon.classList.remove('selected'));
  });

  function updateClock() {
    document.getElementById('clock').textContent = new Date().toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
  }
  updateClock();
  setInterval(updateClock, 30000);
})();
