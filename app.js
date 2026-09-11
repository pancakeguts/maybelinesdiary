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
    },
    trash: {
      window: document.getElementById('trashWindow'),
      shortcut: document.getElementById('trashShortcut'),
      task: document.getElementById('taskTrash'),
      titlebar: document.getElementById('trashTitlebar'),
      minimized: false
    },
    vent: {
      window: document.getElementById('ventWindow'),
      shortcut: document.getElementById('ventShortcut'),
      task: document.getElementById('taskVent'),
      titlebar: document.getElementById('ventTitlebar'),
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
    if (name === 'trash') renderTrash();
    if (name === 'vent') window.initVent?.();
    window.dispatchEvent(new CustomEvent('desktopappopen', { detail: { name } }));
    closeStart();
  }

  window.openDesktopApp = openApp;

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

  function bindShortcutDrag(name) {
    const shortcut = apps[name].shortcut;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let offsetX = 0;
    let offsetY = 0;
    let moved = false;
    const saved = localStorage.getItem(`desktop-icon-${name}`);
    if (saved) {
      try {
        const position = JSON.parse(saved);
        shortcut.style.left = `${position.left}px`;
        shortcut.style.top = `${position.top}px`;
        shortcut.style.right = 'auto';
        shortcut.style.bottom = 'auto';
      } catch (_) { localStorage.removeItem(`desktop-icon-${name}`); }
    }
    shortcut.style.touchAction = 'none';
    shortcut.addEventListener('pointerdown', event => {
      if (event.button !== 0 || pointerId !== null) return;
      const rect = shortcut.getBoundingClientRect();
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;
      moved = false;
      shortcut.setPointerCapture(pointerId);
    });
    shortcut.addEventListener('pointermove', event => {
      if (event.pointerId !== pointerId) return;
      if (!moved && Math.hypot(event.clientX - startX, event.clientY - startY) < 5) return;
      moved = true;
      const maxX = Math.max(0, innerWidth - shortcut.offsetWidth);
      const maxY = Math.max(0, innerHeight - 42 - shortcut.offsetHeight);
      shortcut.style.left = `${Math.max(0, Math.min(maxX, event.clientX - offsetX))}px`;
      shortcut.style.top = `${Math.max(0, Math.min(maxY, event.clientY - offsetY))}px`;
      shortcut.style.right = 'auto';
      shortcut.style.bottom = 'auto';
      shortcut.style.zIndex = '4';
    });
    shortcut.addEventListener('pointerup', event => {
      if (event.pointerId !== pointerId) return;
      if (moved) localStorage.setItem(`desktop-icon-${name}`, JSON.stringify({left:parseFloat(shortcut.style.left),top:parseFloat(shortcut.style.top)}));
      pointerId = null;
      shortcut.style.zIndex = '';
    });
    shortcut.addEventListener('pointercancel', () => { pointerId = null; moved = false; shortcut.style.zIndex = ''; });
    shortcut.addEventListener('click', event => {
      if (!moved) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      moved = false;
    }, true);
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
    bindShortcutDrag(name);
    bindDrag(name);
  });

  function makeFloatingDraggable(panel, handle) {
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;
    handle.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      dragging = true;
      topZ += 1;
      panel.style.zIndex = topZ + 30;
      const rect = panel.getBoundingClientRect();
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;
      panel.style.transform = 'none';
      panel.style.left = rect.left + 'px';
      panel.style.top = rect.top + 'px';
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      if (!dragging) return;
      const maxX = Math.max(0, innerWidth - panel.offsetWidth);
      const maxY = Math.max(0, innerHeight - 40 - panel.offsetHeight);
      panel.style.left = Math.max(0, Math.min(maxX, event.clientX - offsetX)) + 'px';
      panel.style.top = Math.max(0, Math.min(maxY, event.clientY - offsetY)) + 'px';
    });
    handle.addEventListener('pointerup', () => { dragging = false; });
    panel.addEventListener('pointerdown', () => {
      topZ += 1;
      panel.style.zIndex = topZ + 30;
    });
  }

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
    const value = document.getElementById('addressInput').value.trim();
    if (!value || /maybelinesdiary\.com/i.test(value)) { showBrowserHome(); return; }
    document.getElementById('searchInput').value = value.replace(/^https?:\/\//, '');
    document.getElementById('webSearch').requestSubmit();
  });
  document.getElementById('addressInput').addEventListener('keydown', event => { if (event.key === 'Enter') document.getElementById('goBtn').click(); });
  document.getElementById('forwardBtn').addEventListener('click', () => { document.getElementById('webSearch').requestSubmit(); });
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
  const nestedFolderList = document.getElementById('nestedFolderList');
  const folderEmpty = document.getElementById('folderEmpty');
  const retroGallery = document.getElementById('retroGallery');
  const galleryNote = document.getElementById('galleryNote');
  const musicLibrary = document.getElementById('musicLibrary');
  const musicGrid = document.getElementById('musicGrid');
  const musicNote = document.getElementById('musicNote');
  const photoViewer = document.getElementById('photoViewer');
  const photoViewerImage = document.getElementById('photoViewerImage');
  const photoViewerName = document.getElementById('photoViewerName');
  const filesStatus = document.getElementById('filesStatus');
  const mediaPlayer = document.getElementById('mediaPlayer');
  const audioElement = document.getElementById('audioElement');
  const playerTrackName = document.getElementById('playerTrackName');
  const playerEffectLabel = document.getElementById('playerEffectLabel');
  const playerSeek = document.getElementById('playerSeek');
  const playerPlay = document.getElementById('playerPlay');
  const playerCurrent = document.getElementById('playerCurrent');
  const playerDuration = document.getElementById('playerDuration');
  const effectKnobs = [...document.querySelectorAll('.effect-knob')];
  // Audio files are added here when Maybeline uploads them.
  const audioTracks = [
    {
      title: 'the way i act makes me hurl (prod. me)',
      src: 'the-way-i-act-makes-me-hurl-prod-me.mp3'
    },
    {
      title: 'kingdom (fairoh)',
      src: 'kingdom-fairoh.mp3'
    },
    {
      title: 'karma (prod. eflen)',
      src: 'karma-prod-eflen.mp3'
    }
  ];
  let currentTrackIndex = -1;
  let audioContext;
  let audioSource;
  let lowpassFilter;
  let distortionFilter;
  let bassFilter;
  let trebleFilter;
  let dryGain;
  let delayNode;
  let delayFeedback;
  let delayWet;
  let convolverNode;
  let reverbWet;
  let gainNode;
  const galleryGrid = document.querySelector('.gallery-grid');
  let photos = [...document.querySelectorAll('.retro-photo')];
  const storageKey = 'maybeline-file-locations-v1';
  const trackLocationsKey = 'maybeline-track-locations-v1';
  const customFoldersKey = 'maybeline-custom-folders-v1';
  const allowedFolders = {
    image: ['Pictures', 'sick kvnt', 'Downloads', 'Archive'],
    video: ['Videos', 'Downloads', 'Archive'],
    audio: ['Music', 'Downloads', 'Archive'],
    document: ['Documents', 'Downloads', 'Archive']
  };
  let currentFolder = 'Media';
  let customFolders = [];
  try { customFolders = JSON.parse(localStorage.getItem(customFoldersKey)) || []; } catch (error) { customFolders = []; }
  let trackLocations = {};
  try { trackLocations = JSON.parse(localStorage.getItem(trackLocationsKey)) || {}; } catch (error) { trackLocations = {}; }
  audioTracks.forEach((track, index) => { if (!trackLocations[index]) trackLocations[index] = 'Music'; });
  let folderHistory = ['Media'];
  let folderHistoryIndex = 0;
  let fileClipboard = null;
  let deletedPhotoIds = new Set(JSON.parse(localStorage.getItem('maybeline-deleted-photos') || '[]'));
  let deletedTrackIndexes = new Set(JSON.parse(localStorage.getItem('maybeline-deleted-tracks') || '[]'));
  let purgedPhotoIds = new Set(JSON.parse(localStorage.getItem('maybeline-purged-photos') || '[]'));
  let purgedTrackIndexes = new Set(JSON.parse(localStorage.getItem('maybeline-purged-tracks') || '[]'));
  const undoStack = [];
  const redoStack = [];
  function snapshotFiles() {
    return { locations: { ...fileLocations }, trackLocations: { ...trackLocations }, photos: [...deletedPhotoIds], tracks: [...deletedTrackIndexes], folders: customFolders.map(folder => ({ ...folder })) };
  }
  function persistFileState() {
    saveFileLocations();
    localStorage.setItem('maybeline-deleted-photos', JSON.stringify([...deletedPhotoIds]));
    localStorage.setItem('maybeline-deleted-tracks', JSON.stringify([...deletedTrackIndexes]));
    localStorage.setItem('maybeline-purged-photos', JSON.stringify([...purgedPhotoIds]));
    localStorage.setItem('maybeline-purged-tracks', JSON.stringify([...purgedTrackIndexes]));
    localStorage.setItem(customFoldersKey, JSON.stringify(customFolders));
    localStorage.setItem(trackLocationsKey, JSON.stringify(trackLocations));
  }
  function renderTrash() {
    const content = document.getElementById('trashContent');
    content.replaceChildren();
    const deleted = [
      ...photos.filter(photo => deletedPhotoIds.has(photo.dataset.id) && !purgedPhotoIds.has(photo.dataset.id)).map(photo => ({ kind: 'image', id: photo.dataset.id, name: photo.querySelector('b').textContent })),
      ...audioTracks.map((track, index) => ({ kind: 'audio', id: String(index), name: track.title })).filter(item => deletedTrackIndexes.has(Number(item.id)) && !purgedTrackIndexes.has(Number(item.id)))
    ];
    if (!deleted.length) {
      const empty = document.createElement('div');
      empty.className = 'trash-empty';
      empty.textContent = 'Recycle Bin is empty.';
      content.append(empty);
    }
    deleted.forEach(item => {
      const row = document.createElement('button');
      row.className = 'trash-item';
      row.type = 'button';
      row.dataset.kind = item.kind;
      row.dataset.id = item.id;
      row.innerHTML = `<span>${item.kind === 'image' ? '🖼' : '♫'}</span><b></b><span>${item.kind} file</span>`;
      row.querySelector('b').textContent = item.name;
      row.addEventListener('click', () => {
        document.querySelectorAll('.trash-item').forEach(entry => entry.classList.remove('selected'));
        row.classList.add('selected');
      });
      content.append(row);
    });
    document.getElementById('trashStatus').textContent = `${deleted.length} object(s)`;
  }
  function restoreTrashItem() {
    const item = document.querySelector('.trash-item.selected');
    if (!item) { document.getElementById('trashStatus').textContent = 'Select an item to restore.'; return; }
    recordFileChange();
    if (item.dataset.kind === 'image') deletedPhotoIds.delete(item.dataset.id);
    else deletedTrackIndexes.delete(Number(item.dataset.id));
    persistFileState();
    renderTrash();
    showFolder(currentFolder, false);
  }
  function emptyTrash() {
    deletedPhotoIds.forEach(id => purgedPhotoIds.add(id));
    deletedTrackIndexes.forEach(id => purgedTrackIndexes.add(id));
    deletedPhotoIds.clear();
    deletedTrackIndexes.clear();
    persistFileState();
    renderTrash();
    showFolder(currentFolder, false);
  }
  document.getElementById('restoreTrashBtn').addEventListener('click', restoreTrashItem);
  document.getElementById('emptyTrashBtn').addEventListener('click', emptyTrash);
  function recordFileChange() { undoStack.push(snapshotFiles()); redoStack.length = 0; }
  function restoreFileState(state) {
    fileLocations = { ...state.locations };
    trackLocations = { ...(state.trackLocations || trackLocations) };
    deletedPhotoIds = new Set(state.photos);
    deletedTrackIndexes = new Set(state.tracks);
    customFolders = (state.folders || []).map(folder => ({ ...folder }));
    persistFileState();
    showFolder(currentFolder, false);
    if (apps.trash.window.classList.contains('open')) renderTrash();
  }
  function undoFileChange() {
    if (!undoStack.length) { filesStatus.textContent = 'Nothing to undo.'; return; }
    redoStack.push(snapshotFiles());
    restoreFileState(undoStack.pop());
    filesStatus.textContent = 'Undo complete.';
  }
  function redoFileChange() {
    if (!redoStack.length) { filesStatus.textContent = 'Nothing to redo.'; return; }
    undoStack.push(snapshotFiles());
    restoreFileState(redoStack.pop());
    filesStatus.textContent = 'Redo complete.';
  }
  let fileLocations = {};
  try { fileLocations = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch (error) { fileLocations = {}; }
  photos.forEach((photo, index) => {
    photo.dataset.id = photo.dataset.id || `photo-${String(index + 1).padStart(2, '0')}`;
    photo.dataset.kind = photo.dataset.kind || 'image';
    photo.draggable = true;
    if (!fileLocations[photo.dataset.id]) fileLocations[photo.dataset.id] = 'sick kvnt';
  });
  function saveFileLocations() {
    try { localStorage.setItem(storageKey, JSON.stringify(fileLocations)); } catch (error) { /* Storage can be disabled. */ }
  }
  saveFileLocations();

  function customFolder(folder) { return customFolders.find(item => item.id === folder); }
  function folderParent(folder) { return customFolder(folder)?.parent || 'Media'; }
  function folderLabel(folder) { return customFolder(folder)?.name || folder; }
  function folderPath(folder) {
    const parts = [];
    let cursor = folder;
    while (cursor && cursor !== 'Media') {
      parts.unshift(folderLabel(cursor));
      cursor = folderParent(cursor);
    }
    return `C:\\Maybeline\\${parts.length ? parts.join('\\') : 'Media'}`;
  }
  function folderAccepts(kind, folder) {
    if (folder === 'Media' || folder === 'Downloads' || folder === 'Archive') return true;
    const custom = customFolder(folder);
    if (custom) return folderAccepts(kind, custom.parent);
    return (allowedFolders[kind] || []).includes(folder);
  }
  function renderNestedFolders(parent) {
    const children = customFolders.filter(folder => folder.parent === parent);
    nestedFolderList.replaceChildren();
    children.forEach(folder => {
      const row = document.createElement('button');
      row.className = 'file-row nested-folder-row';
      row.type = 'button';
      row.dataset.folder = folder.id;
      row.innerHTML = '<span><i class="list-folder"></i><b></b></span><time></time><em>File Folder</em>';
      row.querySelector('b').textContent = folder.name;
      row.querySelector('time').textContent = folder.modified || new Date().toLocaleString();
      row.addEventListener('click', () => {
        document.querySelectorAll('.file-row').forEach(item => item.classList.remove('selected'));
        row.classList.add('selected');
      });
      row.addEventListener('dblclick', () => showFolder(folder.id));
      nestedFolderList.append(row);
    });
    nestedFolderList.hidden = children.length === 0;
    return children;
  }

  function showFolder(folder, addToHistory = true) {
    if (folder !== 'Media' && !customFolder(folder) && !document.querySelector(`[data-folder="${CSS.escape(folder)}"]`)) folder = 'Media';
    currentFolder = folder;
    if (addToHistory && folderHistory[folderHistoryIndex] !== folder) {
      folderHistory = folderHistory.slice(0, folderHistoryIndex + 1);
      folderHistory.push(folder);
      folderHistoryIndex = folderHistory.length - 1;
    }
    folderAddress.textContent = folderPath(folder);
    document.querySelectorAll('.side-location').forEach(button => button.classList.toggle('active', button.dataset.folder === folder));
    const isHome = folder === 'Media';
    const isMusic = folder === 'Music';
    const visiblePhotos = photos.filter(photo => fileLocations[photo.dataset.id] === folder && !deletedPhotoIds.has(photo.dataset.id) && !purgedPhotoIds.has(photo.dataset.id));
    const visibleTracks = audioTracks.filter((track, index) => trackLocations[index] === folder && !deletedTrackIndexes.has(index) && !purgedTrackIndexes.has(index));
    const childFolders = renderNestedFolders(folder);
    photos.forEach(photo => { photo.hidden = !visiblePhotos.includes(photo); });
    document.querySelectorAll('.music-file').forEach(button => { button.hidden = !visibleTracks.includes(audioTracks[Number(button.dataset.trackIndex)]); });
    fileList.hidden = !isHome;
    retroGallery.hidden = isHome || isMusic || visiblePhotos.length === 0;
    musicLibrary.hidden = visibleTracks.length === 0;
    folderEmpty.hidden = isHome || childFolders.length > 0 || visiblePhotos.length > 0 || visibleTracks.length > 0;
    photoViewer.hidden = true;
    galleryNote.textContent = `${visiblePhotos.length} picture(s) — double-click to open or drag to a folder`;
    const count = (isHome ? 5 : visibleTracks.length + visiblePhotos.length) + childFolders.length;
    filesStatus.textContent = `${count} object(s)`;
  }
  document.querySelectorAll('.side-location').forEach(button => button.addEventListener('click', () => showFolder(button.dataset.folder)));
  document.querySelectorAll('.file-row').forEach(row => {
    row.addEventListener('click', () => {
      document.querySelectorAll('.file-row').forEach(item => item.classList.remove('selected'));
      row.classList.add('selected');
    });
    row.addEventListener('dblclick', () => showFolder(row.dataset.folder));
  });
  document.getElementById('filesBack').addEventListener('click', () => {
    if (folderHistoryIndex > 0) { folderHistoryIndex -= 1; showFolder(folderHistory[folderHistoryIndex], false); }
    else showFolder('Media');
  });
  document.getElementById('filesForward').addEventListener('click', () => {
    if (folderHistoryIndex < folderHistory.length - 1) { folderHistoryIndex += 1; showFolder(folderHistory[folderHistoryIndex], false); }
  });
  document.getElementById('filesUp').addEventListener('click', () => showFolder(folderParent(currentFolder)));
  document.getElementById('newFolderBtn').addEventListener('click', () => {
    const name = prompt('New folder name:');
    const cleanName = name?.trim();
    if (!cleanName) { filesStatus.textContent = 'Folder creation cancelled.'; return; }
    if (customFolders.some(folder => folder.parent === currentFolder && folder.name.toLowerCase() === cleanName.toLowerCase())) {
      filesStatus.textContent = 'A folder with that name already exists here.';
      return;
    }
    recordFileChange();
    customFolders.push({ id: `folder-${Date.now()}`, name: cleanName, parent: currentFolder, modified: new Date().toLocaleString() });
    persistFileState();
    showFolder(currentFolder, false);
    filesStatus.textContent = `${cleanName} created inside ${folderLabel(currentFolder)}.`;
  });
  function bindPhotoInteractions(photo) {
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
    photo.addEventListener('dragstart', event => {
      event.dataTransfer.setData('text/plain', photo.dataset.id);
      event.dataTransfer.effectAllowed = 'move';
      photo.classList.add('dragging');
      document.querySelectorAll('.side-location').forEach(button => {
        button.classList.toggle('drag-allowed', (allowedFolders[photo.dataset.kind] || []).includes(button.dataset.folder));
      });
    });
    photo.addEventListener('dragend', () => {
      photo.classList.remove('dragging');
      document.querySelectorAll('.side-location').forEach(button => button.classList.remove('drag-allowed', 'drag-over'));
    });
  }
  photos.forEach(bindPhotoInteractions);
  retroGallery.addEventListener('dblclick', event => {
    const photo = event.target.closest('.retro-photo');
    if (!photo) return;
    photoViewerImage.src = photo.dataset.full;
    photoViewerName.textContent = photo.querySelector('b').textContent + ' - Picture Viewer';
    photoViewer.hidden = false;
    topZ += 1;
    photoViewer.style.zIndex = topZ + 30;
  });
  makeFloatingDraggable(photoViewer, document.getElementById('photoViewerBar'));

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  }
  function distortionCurve(amount = 55) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i += 1) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * Math.PI / 180) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }
  function setupAudioEffects() {
    if (audioContext) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioSource = audioContext.createMediaElementSource(audioElement);
    lowpassFilter = audioContext.createBiquadFilter();
    lowpassFilter.type = 'lowpass';
    lowpassFilter.frequency.value = 22000;
    distortionFilter = audioContext.createWaveShaper();
    distortionFilter.oversample = '4x';
    bassFilter = audioContext.createBiquadFilter();
    bassFilter.type = 'lowshelf';
    bassFilter.frequency.value = 240;
    trebleFilter = audioContext.createBiquadFilter();
    trebleFilter.type = 'highshelf';
    trebleFilter.frequency.value = 3200;
    dryGain = audioContext.createGain();
    delayNode = audioContext.createDelay(1.5);
    delayNode.delayTime.value = .28;
    delayFeedback = audioContext.createGain();
    delayFeedback.gain.value = .32;
    delayWet = audioContext.createGain();
    delayWet.gain.value = 0;
    convolverNode = audioContext.createConvolver();
    const impulseLength = audioContext.sampleRate * 2;
    const impulse = audioContext.createBuffer(2, impulseLength, audioContext.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < impulseLength; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 2.6);
    }
    convolverNode.buffer = impulse;
    reverbWet = audioContext.createGain();
    reverbWet.gain.value = 0;
    gainNode = audioContext.createGain();
    gainNode.gain.value = Number(document.getElementById('playerVolume').value);
    audioSource.connect(lowpassFilter).connect(bassFilter).connect(trebleFilter).connect(distortionFilter);
    distortionFilter.connect(dryGain).connect(gainNode);
    distortionFilter.connect(delayNode).connect(delayWet).connect(gainNode);
    delayNode.connect(delayFeedback).connect(delayNode);
    distortionFilter.connect(convolverNode).connect(reverbWet).connect(gainNode);
    gainNode.connect(audioContext.destination);
  }
  function updateEffectLabel() {
    const effects = effectKnobs.filter(knob => {
      const value = Number(knob.dataset.value);
      return ['bass', 'treble', 'speed', 'pitch'].includes(knob.dataset.effect) ? value !== 50 : value > 0;
    }).map(knob => knob.dataset.effect.toUpperCase());
    playerEffectLabel.textContent = effects.join(' + ') || 'STEREO';
  }
  function applyEffect(effect, value) {
    setupAudioEffects();
    const amount = value / 100;
    if (effect === 'muffle') lowpassFilter.frequency.value = 22000 - amount * 21400;
    if (effect === 'distortion') distortionFilter.curve = value ? distortionCurve(value * 1.2) : null;
    if (effect === 'bass') bassFilter.gain.value = (value - 50) * .3;
    if (effect === 'treble') trebleFilter.gain.value = (value - 50) * .3;
    if (effect === 'echo') delayWet.gain.value = amount * .7;
    if (effect === 'reverb') reverbWet.gain.value = amount * .75;
    if (effect === 'speed' || effect === 'pitch') {
      const speedValue = Number(document.querySelector('[data-effect="speed"]').dataset.value);
      const pitchValue = Number(document.querySelector('[data-effect="pitch"]').dataset.value);
      const speed = .5 + speedValue / 100;
      const semitones = (pitchValue - 50) * .24;
      audioElement.preservesPitch = false;
      audioElement.webkitPreservesPitch = false;
      audioElement.playbackRate = speed * Math.pow(2, semitones / 12);
      document.querySelector('[data-effect="pitch"]').setAttribute('aria-valuetext', `${semitones >= 0 ? '+' : ''}${semitones.toFixed(1)} semitones`);
    }
    updateEffectLabel();
  }
  function setKnobValue(knob, value) {
    const next = Math.max(0, Math.min(100, Math.round(value)));
    knob.dataset.value = String(next);
    knob.setAttribute('aria-valuenow', String(next));
    knob.style.setProperty('--turn', `${-135 + next * 2.7}deg`);
    knob.classList.toggle('active', ['bass', 'treble', 'speed', 'pitch'].includes(knob.dataset.effect) ? next !== 50 : next > 0);
    applyEffect(knob.dataset.effect, next);
  }
  async function togglePlayback() {
    if (currentTrackIndex < 0) return;
    setupAudioEffects();
    await audioContext.resume();
    if (audioElement.paused) await audioElement.play(); else audioElement.pause();
  }
  function loadTrack(index, autoplay = true) {
    if (!audioTracks.length) return;
    currentTrackIndex = (index + audioTracks.length) % audioTracks.length;
    const track = audioTracks[currentTrackIndex];
    audioElement.src = track.src;
    playerTrackName.textContent = track.title;
    mediaPlayer.hidden = false;
    topZ += 1;
    mediaPlayer.style.zIndex = topZ + 30;
    if (autoplay) togglePlayback().catch(() => { playerPlay.textContent = '▶'; });
  }
  function renderMusicLibrary() {
    musicGrid.replaceChildren();
    audioTracks.forEach((track, index) => {
      const button = document.createElement('button');
      button.className = 'music-file';
      button.type = 'button';
      button.dataset.kind = 'audio';
      button.dataset.trackIndex = String(index);
      button.innerHTML = `<span class="media-file-icon" aria-hidden="true">♫</span><b></b>`;
      button.querySelector('b').textContent = track.title;
      button.addEventListener('click', () => {
        document.querySelectorAll('.music-file').forEach(item => item.classList.remove('selected'));
        button.classList.add('selected');
      });
      button.addEventListener('dblclick', () => loadTrack(index));
      button.addEventListener('keydown', event => { if (event.key === 'Enter') loadTrack(index); });
      if (matchMedia('(pointer: coarse)').matches) button.addEventListener('click', () => loadTrack(index));
      musicGrid.append(button);
    });
    musicNote.textContent = `${audioTracks.length} song(s) — double-click to play`;
  }
  renderMusicLibrary();

  function selectedFileItem() {
    return document.querySelector('.retro-photo.selected:not([hidden]), .music-file.selected:not([hidden])');
  }
  function copyOrCut(mode) {
    const item = selectedFileItem();
    if (!item) { filesStatus.textContent = 'Select a file first.'; return; }
    fileClipboard = {
      mode,
      kind: item.dataset.kind || 'image',
      id: item.dataset.id || null,
      trackIndex: item.dataset.trackIndex || null
    };
    if (mode === 'cut') {
      recordFileChange();
      if (fileClipboard.kind === 'image') deletedPhotoIds.add(fileClipboard.id);
      if (fileClipboard.kind === 'audio') deletedTrackIndexes.add(Number(fileClipboard.trackIndex));
      persistFileState();
      showFolder(currentFolder, false);
      if (apps.trash.window.classList.contains('open')) renderTrash();
      filesStatus.textContent = 'Cut to clipboard. Paste or Undo to restore it.';
    } else filesStatus.textContent = 'Copied to clipboard.';
  }
  function pasteClipboard() {
    if (!fileClipboard) { filesStatus.textContent = 'The clipboard is empty.'; return; }
    if (!folderAccepts(fileClipboard.kind, currentFolder)) {
      filesStatus.textContent = `${currentFolder} does not accept ${fileClipboard.kind} files.`;
      return;
    }
    if (fileClipboard.kind === 'image') {
      const source = photos.find(photo => photo.dataset.id === fileClipboard.id);
      if (!source) return;
      recordFileChange();
      if (fileClipboard.mode === 'cut') {
        deletedPhotoIds.delete(source.dataset.id);
        fileLocations[source.dataset.id] = currentFolder;
      }
      else {
        const clone = source.cloneNode(true);
        clone.classList.remove('selected', 'dragging');
        clone.dataset.id = `${source.dataset.id}-copy-${Date.now()}`;
        clone.querySelector('b').textContent = `COPY_${source.querySelector('b').textContent}`;
        galleryGrid.append(clone);
        photos.push(clone);
        fileLocations[clone.dataset.id] = currentFolder;
        bindPhotoInteractions(clone);
      }
      persistFileState();
    } else {
      if (fileClipboard.mode === 'cut') {
        recordFileChange();
        deletedTrackIndexes.delete(Number(fileClipboard.trackIndex));
        trackLocations[Number(fileClipboard.trackIndex)] = currentFolder;
        persistFileState();
      } else { filesStatus.textContent = 'The song is already in the Music library.'; return; }
    }
    if (fileClipboard.mode === 'cut') fileClipboard = null;
    showFolder(currentFolder, false);
    filesStatus.textContent = 'Paste complete.';
  }
  document.getElementById('cutBtn').addEventListener('click', () => copyOrCut('cut'));
  document.getElementById('copyBtn').addEventListener('click', () => copyOrCut('copy'));
  document.getElementById('pasteBtn').addEventListener('click', pasteClipboard);
  function deleteSelected() {
    const item = selectedFileItem();
    if (!item) { filesStatus.textContent = 'Select a file first.'; return; }
    recordFileChange();
    if ((item.dataset.kind || 'image') === 'image') deletedPhotoIds.add(item.dataset.id);
    else deletedTrackIndexes.add(Number(item.dataset.trackIndex));
    persistFileState();
    showFolder(currentFolder, false);
    if (apps.trash.window.classList.contains('open')) renderTrash();
    filesStatus.textContent = 'Deleted. Use Undo to bring it back.';
  }
  document.getElementById('deleteBtn').addEventListener('click', deleteSelected);
  makeFloatingDraggable(mediaPlayer, document.getElementById('mediaPlayerBar'));
  playerPlay.addEventListener('click', () => togglePlayback());
  document.getElementById('playerStop').addEventListener('click', () => { audioElement.pause(); audioElement.currentTime = 0; });
  document.getElementById('playerPrevious').addEventListener('click', () => loadTrack(currentTrackIndex - 1));
  document.getElementById('playerNext').addEventListener('click', () => loadTrack(currentTrackIndex + 1));
  document.getElementById('closeMediaPlayer').addEventListener('click', () => { audioElement.pause(); mediaPlayer.hidden = true; });
  audioElement.addEventListener('play', () => { playerPlay.textContent = '❚❚'; });
  audioElement.addEventListener('pause', () => { playerPlay.textContent = '▶'; });
  audioElement.addEventListener('ended', () => loadTrack(currentTrackIndex + 1));
  audioElement.addEventListener('loadedmetadata', () => { playerDuration.textContent = formatTime(audioElement.duration); });
  audioElement.addEventListener('timeupdate', () => {
    playerCurrent.textContent = formatTime(audioElement.currentTime);
    playerSeek.value = audioElement.duration ? String((audioElement.currentTime / audioElement.duration) * 1000) : '0';
  });
  playerSeek.addEventListener('input', () => { if (audioElement.duration) audioElement.currentTime = (Number(playerSeek.value) / 1000) * audioElement.duration; });
  document.getElementById('playerVolume').addEventListener('input', event => {
    setupAudioEffects();
    gainNode.gain.value = Number(event.target.value);
  });
  effectKnobs.forEach(knob => {
    let startY = 0;
    let startValue = Number(knob.dataset.value);
    knob.style.setProperty('--turn', `${-135 + startValue * 2.7}deg`);
    knob.addEventListener('pointerdown', event => {
      startY = event.clientY;
      startValue = Number(knob.dataset.value);
      knob.setPointerCapture(event.pointerId);
    });
    knob.addEventListener('pointermove', event => {
      if (!knob.hasPointerCapture(event.pointerId)) return;
      setKnobValue(knob, startValue + (startY - event.clientY));
    });
    knob.addEventListener('wheel', event => {
      event.preventDefault();
      setKnobValue(knob, Number(knob.dataset.value) + (event.deltaY < 0 ? 4 : -4));
    }, { passive: false });
    knob.addEventListener('keydown', event => {
      if (!['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') setKnobValue(knob, 0);
      else if (event.key === 'End') setKnobValue(knob, 100);
      else setKnobValue(knob, Number(knob.dataset.value) + (['ArrowUp', 'ArrowRight'].includes(event.key) ? 2 : -2));
    });
  });
  document.querySelectorAll('.side-location').forEach(button => {
    button.addEventListener('dragover', event => {
      const photo = photos.find(item => item.dataset.id === event.dataTransfer.getData('text/plain')) || document.querySelector('.retro-photo.dragging');
      if (photo && (allowedFolders[photo.dataset.kind] || []).includes(button.dataset.folder)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        button.classList.add('drag-over');
      }
    });
    button.addEventListener('dragleave', () => button.classList.remove('drag-over'));
    button.addEventListener('drop', event => {
      event.preventDefault();
      const id = event.dataTransfer.getData('text/plain');
      const photo = photos.find(item => item.dataset.id === id);
      const targetFolder = button.dataset.folder;
      document.querySelectorAll('.side-location').forEach(item => item.classList.remove('drag-allowed', 'drag-over'));
      if (!photo || !(allowedFolders[photo.dataset.kind] || []).includes(targetFolder)) {
        filesStatus.textContent = `${targetFolder} does not accept that file type.`;
        return;
      }
      fileLocations[id] = targetFolder;
      saveFileLocations();
      showFolder(targetFolder);
      filesStatus.textContent = `${photo.querySelector('b').textContent} moved to ${targetFolder}.`;
    });
  });
  document.getElementById('closePhotoViewer').addEventListener('click', () => {
    photoViewer.hidden = true;
    filesStatus.textContent = `${photos.filter(photo => fileLocations[photo.dataset.id] === currentFolder).length} picture(s)`;
  });

  const dropdownMenu = document.getElementById('dropdownMenu');
  const helpWindow = document.getElementById('helpWindow');
  const helpPlaceInput = document.getElementById('helpPlaceInput');
  const helpStatus = document.getElementById('helpStatus');
  const helpContacts = {
    WORLD: { name: 'WORLDWIDE', links: [['Browse verified support worldwide', 'https://findahelpline.com/']] },
    AU: { name: 'LIFELINE AUSTRALIA', links: [['CALL 13 11 14', 'tel:131114'], ['TEXT 0477 13 11 14', 'sms:0477131114'], ['OPEN 24/7 CHAT', 'https://www.lifeline.org.au/chat']] },
    US: { name: '988 SUICIDE & CRISIS LIFELINE — U.S.', links: [['CALL 988', 'tel:988'], ['TEXT 988', 'sms:988'], ['OPEN 988 LIFELINE', 'https://988lifeline.org/']] },
    CA: { name: '9-8-8 SUICIDE CRISIS HELPLINE — CANADA', links: [['CALL 9-8-8', 'tel:988'], ['TEXT 9-8-8', 'sms:988'], ['OPEN 9-8-8 CANADA', 'https://988.ca/']] },
    GB: { name: 'SAMARITANS — UNITED KINGDOM', links: [['CALL 116 123', 'tel:116123'], ['OPEN SAMARITANS', 'https://www.samaritans.org/how-we-can-help/contact-samaritan/']] },
    IE: { name: 'SAMARITANS — IRELAND', links: [['CALL 116 123', 'tel:116123'], ['OPEN SAMARITANS', 'https://www.samaritans.org/how-we-can-help/contact-samaritan/']] },
    NZ: { name: '1737 — NEW ZEALAND', links: [['CALL OR TEXT 1737', 'tel:1737'], ['OPEN 1737', 'https://1737.org.nz/']] }
  };
  const countryCodes = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
  const regionNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames([navigator.language || 'en'], { type: 'region' }) : null;
  const countries = countryCodes.map(code => ({ code, name: regionNames?.of(code) || code })).sort((a, b) => a.name.localeCompare(b.name));
  const placeList = document.getElementById('helpPlaceList');
  ['Worldwide', ...countries.map(country => country.name)].forEach(name => { const option = document.createElement('option'); option.value = name; placeList.append(option); });
  function renderHelpContact(region = 'WORLD', placeName = '') {
    const contact = helpContacts[region];
    const displayPlace = placeName || countries.find(country => country.code === region)?.name || 'Worldwide';
    document.getElementById('helpContactName').textContent = contact?.name || `OPTIONS NEAR ${displayPlace.toUpperCase()}`;
    const links = document.getElementById('helpContactLinks');
    links.replaceChildren();
    const choices = contact?.links || [
      [`Verified services for ${displayPlace}`, 'https://findahelpline.com/'],
      [`Search local community support`, `https://www.google.com/search?q=${encodeURIComponent(`${displayPlace} community peer mental health support`)}`]
    ];
    choices.forEach(([label, href]) => {
      const link = document.createElement('a');
      link.textContent = label;
      link.href = href;
      if (href.startsWith('http')) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
      links.append(link);
    });
    helpStatus.textContent = displayPlace === 'Worldwide' ? 'Showing worldwide options' : `Showing: ${displayPlace}`;
  }
  function detectHelpRegion() {
    const languageRegion = (navigator.language.split('-')[1] || '').toUpperCase();
    if (countryCodes.includes(languageRegion)) return languageRegion;
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (zone.startsWith('Australia/')) return 'AU';
    return 'WORLD';
  }
  const detectedHelpRegion = detectHelpRegion();
  helpPlaceInput.value = detectedHelpRegion === 'WORLD' ? 'Worldwide' : countries.find(country => country.code === detectedHelpRegion)?.name || 'Worldwide';
  renderHelpContact(detectedHelpRegion, helpPlaceInput.value);
  function searchHelpPlace() {
    const query = helpPlaceInput.value.trim();
    if (!query || query.toLowerCase() === 'worldwide') { helpPlaceInput.value = 'Worldwide'; renderHelpContact('WORLD', 'Worldwide'); return; }
    const match = countries.find(country => country.name.toLowerCase() === query.toLowerCase() || country.code.toLowerCase() === query.toLowerCase());
    renderHelpContact(match?.code || '', match?.name || query);
  }
  document.getElementById('searchHelpPlace').addEventListener('click', searchHelpPlace);
  helpPlaceInput.addEventListener('keydown', event => { if (event.key === 'Enter') searchHelpPlace(); });
  document.querySelectorAll('[data-help-jump]').forEach(button => button.addEventListener('click', () => { document.getElementById(button.dataset.helpJump).scrollIntoView({ behavior: 'smooth', block: 'start' }); helpStatus.textContent = button.textContent; }));
  document.querySelectorAll('[data-help-action]').forEach(button => button.addEventListener('click', async () => {
    const output = document.getElementById('helpActionOutput');
    if (button.dataset.helpAction === 'breathe') {
      let seconds = 30; output.textContent = `Breathe in slowly. ${seconds} seconds.`;
      const timer = setInterval(() => { seconds -= 1; output.textContent = seconds > 0 ? `${seconds % 8 > 3 ? 'Breathe out slowly.' : 'Breathe in slowly.'} ${seconds} seconds.` : 'Done. You made it through that half-minute.'; if (seconds <= 0) clearInterval(timer); }, 1000);
    } else if (button.dataset.helpAction === 'music') {
      helpWindow.hidden = true; openApp('files'); showFolder('Music'); filesStatus.textContent = 'Pick a song. No rush.';
    } else if (button.dataset.helpAction === 'message') {
      const message = 'hey, i do not need you to fix anything. can you just stay with me for a bit?';
      try { await navigator.clipboard.writeText(message); output.textContent = `Copied: “${message}”`; } catch (error) { output.textContent = message; }
    } else output.textContent = 'This window will stay here. You can move it aside and come back whenever you want.';
  }));
  function openHelp() {
    helpWindow.hidden = false;
    topZ += 1;
    helpWindow.style.zIndex = topZ + 30;
  }
  makeFloatingDraggable(helpWindow, document.getElementById('helpTitlebar'));
  document.getElementById('closeHelp').addEventListener('click', () => { helpWindow.hidden = true; });
  const menuDefinitions = {
    'browser-file': [['Print…', () => print()], ['Close', () => closeApp('browser')]],
    'browser-edit': [['Copy address', () => navigator.clipboard?.writeText(document.getElementById('addressInput').value)], ['Select address', () => document.getElementById('addressInput').select()]],
    'browser-view': [['Zoom in', () => { document.querySelector('.web-page').style.zoom = String((Number(document.querySelector('.web-page').style.zoom) || 1) + .1); }], ['Zoom out', () => { document.querySelector('.web-page').style.zoom = String(Math.max(.6, (Number(document.querySelector('.web-page').style.zoom) || 1) - .1)); }], ['Full screen', () => document.documentElement.requestFullscreen?.()]],
    'browser-favorites': [['Show Saved Tabs', () => showBrowserHome()]],
    'browser-help': [['Call for help…', openHelp], ['About Explorer', () => { statusText.textContent = 'Maybeline Explorer · 1999'; }]],
    'files-file': [['Open', () => { const item = selectedFileItem() || document.querySelector('.nested-folder-row.selected'); if (item) item.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); else filesStatus.textContent = 'Select a file or folder first.'; }], ['New Folder…', () => document.getElementById('newFolderBtn').click()], ['Properties', () => { const item = selectedFileItem() || document.querySelector('.nested-folder-row.selected'); filesStatus.textContent = item ? `${item.innerText.trim().split('\\n')[0]} · ${item.dataset.kind || 'File Folder'}` : `${folderLabel(currentFolder)} · File Folder`; }], ['Close', () => closeApp('files')]],
    'files-edit': [['Undo', undoFileChange], ['Redo', redoFileChange], ['Cut', () => copyOrCut('cut')], ['Copy', () => copyOrCut('copy')], ['Paste', pasteClipboard], ['Delete', deleteSelected], ['Select all', () => document.querySelectorAll('.retro-photo:not([hidden]),.music-file:not([hidden])').forEach(item => item.classList.add('selected'))]],
    'files-view': [['Large icons', () => { document.querySelectorAll('.gallery-grid,.music-grid').forEach(grid => grid.classList.remove('list-view')); filesStatus.textContent = 'Large icons view.'; }], ['List', () => { document.querySelectorAll('.gallery-grid,.music-grid').forEach(grid => grid.classList.add('list-view')); filesStatus.textContent = 'List view.'; }], ['Refresh', () => { showFolder(currentFolder, false); filesStatus.textContent = 'Folder refreshed.'; }]],
    'files-tools': [['Sort by name', () => { [galleryGrid, musicGrid, nestedFolderList].forEach(grid => [...grid.children].sort((a,b) => a.innerText.localeCompare(b.innerText)).forEach(item => grid.append(item))); filesStatus.textContent = 'Sorted by name.'; }], ['Reset file locations', () => { if (!confirm('Reset all moved files, created folders, and deleted items?')) { filesStatus.textContent = 'Reset cancelled.'; return; } localStorage.removeItem(storageKey); localStorage.removeItem(trackLocationsKey); localStorage.removeItem(customFoldersKey); localStorage.removeItem('maybeline-deleted-photos'); localStorage.removeItem('maybeline-deleted-tracks'); localStorage.removeItem('maybeline-purged-photos'); localStorage.removeItem('maybeline-purged-tracks'); location.reload(); }]],
    'files-help': [['Call for help…', openHelp], ['About Files', () => { filesStatus.textContent = 'FILES.EXE · Maybeline system archive'; }]]
  };
  document.getElementById('undoBtn').addEventListener('click', undoFileChange);
  document.getElementById('redoBtn').addEventListener('click', redoFileChange);
  document.getElementById('browserHelpBtn').addEventListener('click', openHelp);
  document.getElementById('filesHelpBtn').addEventListener('click', openHelp);
  document.querySelectorAll('[data-menu]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      dropdownMenu.replaceChildren();
      (menuDefinitions[button.dataset.menu] || []).forEach(([label, action]) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.textContent = label;
        item.addEventListener('click', () => { dropdownMenu.hidden = true; action(); });
        dropdownMenu.append(item);
      });
      const rect = button.getBoundingClientRect();
      dropdownMenu.style.left = `${Math.min(rect.left, innerWidth - 180)}px`;
      dropdownMenu.style.top = `${rect.bottom}px`;
      dropdownMenu.hidden = false;
    });
  });

  const contextMenu = document.getElementById('contextMenu');
  function showContextMenu(event, item) {
    event.preventDefault();
    if (item) {
      document.querySelectorAll('.retro-photo,.music-file').forEach(file => file.classList.remove('selected'));
      item.classList.add('selected');
    }
    contextMenu.replaceChildren();
    const actions = item ? [
      ['↗', 'Open', () => item.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))],
      ['✂', 'Cut', () => copyOrCut('cut')],
      ['▣', 'Copy', () => copyOrCut('copy')],
      ['▤', 'Paste', pasteClipboard],
      ['🗑', 'Delete', deleteSelected],
      ['↶', 'Undo', undoFileChange],
      ['↷', 'Redo', redoFileChange],
      ['ⓘ', 'Properties', () => { filesStatus.textContent = `${item.innerText.trim()} · ${item.dataset.kind || 'image'} file`; }]
    ] : [
      ['▦', 'View: icons/list', () => document.querySelectorAll('.gallery-grid,.music-grid').forEach(grid => grid.classList.toggle('list-view'))],
      ['↕', 'Sort by name', () => menuDefinitions['files-tools'][0][1]()],
      ['↻', 'Refresh', () => showFolder(currentFolder, false)],
      ['📁', 'New folder…', () => document.getElementById('newFolderBtn').click()],
      ['▤', 'Paste', pasteClipboard],
      ['↶', 'Undo', undoFileChange],
      ['↷', 'Redo', redoFileChange],
      ['ⓘ', 'Properties', () => { filesStatus.textContent = `C:\\Maybeline\\${currentFolder}`; }]
    ];
    actions.forEach(([icon, label, action], index) => {
      if ([3, 5, 7].includes(index)) contextMenu.append(document.createElement('hr'));
      const button = document.createElement('button');
      button.type = 'button';
      button.innerHTML = `<span aria-hidden="true">${icon}</span><span>${label}</span>`;
      button.addEventListener('click', () => { contextMenu.hidden = true; action(); });
      contextMenu.append(button);
    });
    contextMenu.style.left = `${Math.min(event.clientX, innerWidth - 215)}px`;
    contextMenu.style.top = `${Math.min(event.clientY, innerHeight - 320)}px`;
    contextMenu.hidden = false;
  }
  document.querySelector('.files-content').addEventListener('contextmenu', event => showContextMenu(event, event.target.closest('.retro-photo,.music-file')));

  const trayPanels = [...document.querySelectorAll('.tray-panel')];
  function toggleTrayPanel(panel, trigger) {
    const willOpen = panel.hidden;
    trayPanels.forEach(item => { item.hidden = true; });
    document.querySelectorAll('.tray-tools button').forEach(button => button.classList.remove('active'));
    panel.hidden = !willOpen;
    trigger.classList.toggle('active', willOpen);
  }
  const brightnessOverlay = document.getElementById('brightnessOverlay');
  const brightnessRange = document.getElementById('brightnessRange');
  const systemVolumeRange = document.getElementById('systemVolumeRange');
  document.getElementById('brightnessBtn').addEventListener('click', event => toggleTrayPanel(document.getElementById('brightnessPanel'), event.currentTarget));
  document.getElementById('systemVolumeBtn').addEventListener('click', event => toggleTrayPanel(document.getElementById('volumePanel'), event.currentTarget));
  document.getElementById('settingsBtn').addEventListener('click', event => toggleTrayPanel(document.getElementById('settingsPanel'), event.currentTarget));
  document.getElementById('weatherBtn').addEventListener('click', event => toggleTrayPanel(document.getElementById('weatherPanel'), event.currentTarget));
  brightnessRange.addEventListener('input', () => { brightnessOverlay.style.opacity = String((100 - Number(brightnessRange.value)) / 100 * .65); });
  systemVolumeRange.addEventListener('input', () => {
    const volume = Number(systemVolumeRange.value) / 100;
    document.getElementById('playerVolume').value = String(volume);
    if (gainNode) gainNode.gain.value = volume;
    else audioElement.volume = volume;
    document.getElementById('systemVolumeBtn').textContent = volume === 0 ? '🔇' : volume < .5 ? '🔉' : '🔊';
  });
  document.getElementById('scanlinesToggle').addEventListener('change', event => { document.querySelector('.desktop-noise').hidden = !event.target.checked; });
  let use24HourClock = false;
  document.getElementById('clockFormatToggle').addEventListener('change', event => { use24HourClock = event.target.checked; updateClock(); });
  document.getElementById('resetDesktopBtn').addEventListener('click', () => {
    localStorage.removeItem(storageKey);
    localStorage.removeItem('maybeline-deleted-photos');
    localStorage.removeItem('maybeline-deleted-tracks');
    localStorage.removeItem('maybeline-purged-photos');
    localStorage.removeItem('maybeline-purged-tracks');
    location.reload();
  });

  async function loadWeather(latitude = -37.8136, longitude = 144.9631, label = 'Melbourne') {
    const details = document.getElementById('weatherDetails');
    details.textContent = `Loading ${label} weather…`;
    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`);
      const data = await response.json();
      const temp = Math.round(data.current.temperature_2m);
      const wet = [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(data.current.weather_code);
      document.getElementById('weatherIcon').textContent = wet ? '☂' : data.current.weather_code <= 3 ? '☀' : '☁';
      document.getElementById('weatherTemp').textContent = `${temp}°`;
      details.textContent = `${label}: ${temp}°C · Wind ${Math.round(data.current.wind_speed_10m)} km/h`;
    } catch (error) { details.textContent = 'Weather is temporarily unavailable.'; }
  }
  document.getElementById('useLocationBtn').addEventListener('click', () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(position => loadWeather(position.coords.latitude, position.coords.longitude, 'Current location'), () => loadWeather());
  });
  loadWeather();

  startBtn.addEventListener('click', event => {
    event.stopPropagation();
    const open = startMenu.classList.toggle('open');
    startMenu.setAttribute('aria-hidden', String(!open));
    startBtn.classList.toggle('active', open);
    startBtn.setAttribute('aria-expanded', String(open));
  });
  document.getElementById('startInternet').addEventListener('click', () => openApp('browser'));
  document.getElementById('startFiles').addEventListener('click', () => openApp('files'));
  document.getElementById('startVent').addEventListener('click', () => openApp('vent'));
  document.getElementById('shutDown').addEventListener('click', () => {
    document.getElementById('shutdown').classList.add('show');
    document.getElementById('shutdown').setAttribute('aria-hidden', 'false');
  });
  document.getElementById('restartBtn').addEventListener('click', () => location.reload());
  document.addEventListener('click', event => {
    if (!startMenu.contains(event.target) && event.target !== startBtn) closeStart();
    if (!event.target.closest('[data-menu]') && !event.target.closest('#dropdownMenu')) dropdownMenu.hidden = true;
    if (!event.target.closest('#contextMenu')) contextMenu.hidden = true;
    if (!event.target.closest('.tray-panel') && !event.target.closest('.tray-tools')) {
      trayPanels.forEach(panel => { panel.hidden = true; });
      document.querySelectorAll('.tray-tools button').forEach(button => button.classList.remove('active'));
    }
    if (!event.target.closest('.desktop-icon')) document.querySelectorAll('.desktop-icon').forEach(icon => icon.classList.remove('selected'));
  });

  function updateClock() {
    document.getElementById('clock').textContent = new Date().toLocaleTimeString([], {hour: 'numeric', minute: '2-digit', hour12: !use24HourClock});
  }
  updateClock();
  setInterval(updateClock, 30000);
})();
