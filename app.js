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
  const photos = [...document.querySelectorAll('.retro-photo')];
  const storageKey = 'maybeline-file-locations-v1';
  const allowedFolders = {
    image: ['Pictures', 'sick kvnt', 'Downloads', 'Archive'],
    video: ['Videos', 'Downloads', 'Archive'],
    audio: ['Music', 'Downloads', 'Archive'],
    document: ['Documents', 'Downloads', 'Archive']
  };
  let currentFolder = 'Media';
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

  function showFolder(folder) {
    currentFolder = folder;
    folderAddress.textContent = 'C:\\Maybeline\\' + folder;
    document.querySelectorAll('.side-location').forEach(button => button.classList.toggle('active', button.dataset.folder === folder));
    const isHome = folder === 'Media';
    const isMusic = folder === 'Music';
    const visiblePhotos = photos.filter(photo => fileLocations[photo.dataset.id] === folder);
    photos.forEach(photo => { photo.hidden = !visiblePhotos.includes(photo); });
    fileList.hidden = !isHome;
    retroGallery.hidden = isHome || isMusic || visiblePhotos.length === 0;
    musicLibrary.hidden = !isMusic || audioTracks.length === 0;
    folderEmpty.hidden = isHome || visiblePhotos.length > 0 || (isMusic && audioTracks.length > 0);
    photoViewer.hidden = true;
    galleryNote.textContent = `${visiblePhotos.length} picture(s) — double-click to open or drag to a folder`;
    const count = isMusic ? audioTracks.length : visiblePhotos.length;
    filesStatus.textContent = isHome ? '5 object(s)' : `${count} object(s)`;
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
  photos.forEach(photo => {
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
