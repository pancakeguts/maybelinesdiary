(() => {
  let started = false;
  let db;
  let session = null;
  let profile = null;
  let categories = [];
  let currentView = { type: 'home' };
  const content = () => document.getElementById('ventForum');
  const status = message => { document.getElementById('ventStatus').textContent = message; };
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const when = value => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  const staff = () => ['moderator', 'admin'].includes(profile?.role);
  const fakeEmail = username => `${username.trim().toLowerCase()}@vent.maybelinesdiary.com`;

  function showError(error) {
    console.error(error);
    status('Error');
    content().innerHTML = `<div class="vent-error"><b>Vent could not complete that.</b><br>${esc(error?.message || error)}</div>`;
  }

  async function loadIdentity() {
    const result = await db.auth.getSession();
    session = result.data.session;
    profile = null;
    if (session) {
      const found = await db.from('profiles').select('*').eq('id', session.user.id).single();
      if (found.error) throw found.error;
      profile = found.data;
    }
    document.getElementById('ventAuth').hidden = Boolean(session);
    document.getElementById('ventLogoutBtn').hidden = !session;
    document.getElementById('ventModerateBtn').hidden = !staff();
    document.getElementById('ventUserStatus').textContent = profile ? `Signed in: ${profile.username}` : 'Guest';
  }

  async function loadCategories() {
    const result = await db.from('categories').select('*').order('sort_order');
    if (result.error) throw result.error;
    categories = result.data;
    const select = document.querySelector('#ventPostForm select[name="category"]');
    select.replaceChildren(...categories.map(category => { const option = document.createElement('option'); option.value = category.id; option.textContent = category.name; return option; }));
  }

  async function renderHome() {
    currentView = { type: 'home' };
    status('Loading boards…');
    const [postsResult, repliesResult] = await Promise.all([
      db.from('posts').select('id,category_id,title,created_at,profiles!posts_author_id_fkey(username)').order('created_at', { ascending: false }),
      db.from('replies').select('id,post_id')
    ]);
    if (postsResult.error) return showError(postsResult.error);
    if (repliesResult.error) return showError(repliesResult.error);
    const posts = postsResult.data;
    const replies = repliesResult.data;
    content().innerHTML = `<div class="vent-board-head"><h2>Forum Index</h2><span>${posts.length} discussion${posts.length === 1 ? '' : 's'}</span></div><table class="vent-table"><thead><tr><th colspan="2">Board</th><th>Topics</th><th>Posts</th><th>Last post</th></tr></thead><tbody>${categories.map(category => {
      const boardPosts = posts.filter(post => post.category_id === category.id);
      const replyCount = replies.filter(reply => boardPosts.some(post => post.id === reply.post_id)).length;
      const latest = boardPosts[0];
      return `<tr><td class="vent-board-icon">▣</td><td><button data-category="${category.id}">${esc(category.name)}</button><div class="vent-meta">${esc(category.description)}</div></td><td>${boardPosts.length}</td><td>${boardPosts.length + replyCount}</td><td>${latest ? `${when(latest.created_at)}<div class="vent-meta">by ${esc(latest.profiles?.username || 'unknown')}</div>` : '—'}</td></tr>`;
    }).join('')}</tbody></table>`;
    content().querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => renderCategory(Number(button.dataset.category))));
    status('Ready');
  }

  async function renderCategory(categoryId, query = '') {
    const category = categories.find(item => item.id === categoryId);
    currentView = { type: 'category', categoryId, query };
    status('Loading discussions…');
    let request = db.from('posts').select('id,title,body,created_at,updated_at,is_locked,profiles!posts_author_id_fkey(username),replies(count),likes(count)').eq('category_id', categoryId).order('updated_at', { ascending: false });
    if (query) request = request.or(`title.ilike.%${query.replace(/[%_,()]/g, '')}%,body.ilike.%${query.replace(/[%_,()]/g, '')}%`);
    const result = await request;
    if (result.error) return showError(result.error);
    content().innerHTML = `<div class="vent-board-head"><div class="vent-breadcrumbs"><button data-home>Forum Index</button> » ${esc(category?.name || 'Search')}</div><button class="vent-action" data-compose>New Post</button></div><div class="vent-post-list">${result.data.length ? result.data.map(post => `<article class="vent-post-row"><div><button data-post="${post.id}">${post.is_locked ? '🔒 ' : ''}${esc(post.title)}</button><div class="vent-meta">by ${esc(post.profiles?.username || 'unknown')} · ${when(post.created_at)}</div></div><div>${post.replies?.[0]?.count || 0} replies<br><span class="vent-meta">${post.likes?.[0]?.count || 0} likes</span></div><div class="vent-meta">updated<br>${when(post.updated_at)}</div></article>`).join('') : '<div class="vent-empty">No discussions here yet.</div>'}</div>`;
    content().querySelector('[data-home]').addEventListener('click', renderHome);
    content().querySelector('[data-compose]').addEventListener('click', openComposer);
    content().querySelectorAll('[data-post]').forEach(button => button.addEventListener('click', () => renderThread(Number(button.dataset.post))));
    status(`${result.data.length} discussion(s)`);
  }

  function messageBlock(item, kind, original = false) {
    const mine = session?.user.id === item.author_id;
    return `<article class="vent-message"><aside class="vent-message-user"><b>${esc(item.profiles?.username || 'unknown')}</b><div class="vent-meta">${esc(item.profiles?.role || 'member')}<br>${when(item.created_at)}</div></aside><div class="vent-message-body">${esc(item.body)}${item.is_edited ? '<div class="vent-meta">edited</div>' : ''}<footer>${original ? `<button class="vent-action" data-like="${item.id}">♥ Like (${item.likes?.[0]?.count || 0})</button>` : ''}${mine || staff() ? `<button class="vent-action" data-edit-${kind}="${item.id}">Edit</button><button class="vent-action" data-delete-${kind}="${item.id}">Delete</button>` : ''}<button class="vent-action" data-report-${kind}="${item.id}">Report</button>${original && staff() ? `<button class="vent-action" data-lock="${item.id}">${item.is_locked ? 'Unlock' : 'Lock'} thread</button>` : ''}</footer></div></article>`;
  }

  async function renderThread(postId) {
    currentView = { type: 'thread', postId };
    status('Opening discussion…');
    const [postResult, repliesResult] = await Promise.all([
      db.from('posts').select('*,profiles!posts_author_id_fkey(username,role),categories(name),likes(count)').eq('id', postId).single(),
      db.from('replies').select('*,profiles!replies_author_id_fkey(username,role)').eq('post_id', postId).order('created_at')
    ]);
    if (postResult.error) return showError(postResult.error);
    if (repliesResult.error) return showError(repliesResult.error);
    const post = postResult.data;
    content().innerHTML = `<div class="vent-board-head"><div class="vent-breadcrumbs"><button data-home>Forum Index</button> » <button data-category="${post.category_id}">${esc(post.categories?.name)}</button></div><span>${post.is_locked ? 'Locked' : 'Open'}</span></div><div class="vent-thread-title">${esc(post.title)}</div>${messageBlock(post, 'post', true)}${repliesResult.data.map(reply => messageBlock(reply, 'reply')).join('')}${post.is_locked ? '<div class="vent-empty">This discussion is locked.</div>' : session ? '<form class="vent-reply-form" id="ventReplyForm"><b>Post a reply</b><textarea name="body" maxlength="5000" required></textarea><button class="vent-action" type="submit">Reply</button></form>' : '<div class="vent-empty">Log in above to reply.</div>'}`;
    content().querySelector('[data-home]').addEventListener('click', renderHome);
    content().querySelector('[data-category]').addEventListener('click', () => renderCategory(post.category_id));
    content().querySelector('#ventReplyForm')?.addEventListener('submit', async event => { event.preventDefault(); const body = new FormData(event.currentTarget).get('body').trim(); const result = await db.from('replies').insert({post_id:postId,author_id:session.user.id,body}); if (result.error) return alert(result.error.message); await db.from('posts').update({updated_at:new Date().toISOString()}).eq('id',postId); renderThread(postId); });
    bindThreadActions(post);
    status('Ready');
  }

  function bindThreadActions(post) {
    content().querySelector('[data-like]')?.addEventListener('click', async () => {
      if (!session) return focusLogin();
      const existing = await db.from('likes').select('post_id').eq('post_id',post.id).eq('user_id',session.user.id).maybeSingle();
      const result = existing.data ? await db.from('likes').delete().eq('post_id',post.id).eq('user_id',session.user.id) : await db.from('likes').insert({post_id:post.id,user_id:session.user.id});
      if (result.error) return alert(result.error.message); renderThread(post.id);
    });
    content().querySelectorAll('[data-report-post],[data-report-reply]').forEach(button => button.addEventListener('click', async () => { if (!session) return focusLogin(); const reason = prompt('Why are you reporting this?'); if (!reason?.trim()) return; const payload={reporter_id:session.user.id,reason:reason.trim()}; if (button.hasAttribute('data-report-post')) payload.post_id=Number(button.dataset.reportPost); else payload.reply_id=Number(button.dataset.reportReply); const result=await db.from('reports').insert(payload); alert(result.error ? result.error.message : 'Report sent privately to moderators.'); }));
    content().querySelectorAll('[data-edit-post],[data-edit-reply]').forEach(button => button.addEventListener('click', async () => { const isPost=button.hasAttribute('data-edit-post'); const id=Number(isPost?button.dataset.editPost:button.dataset.editReply); const current=isPost?post.body:button.closest('.vent-message').querySelector('.vent-message-body').childNodes[0].textContent; const body=prompt('Edit message:',current); if(!body?.trim())return; const result=await db.from(isPost?'posts':'replies').update({body:body.trim(),is_edited:true,updated_at:new Date().toISOString()}).eq('id',id); if(result.error)alert(result.error.message); else renderThread(post.id); }));
    content().querySelectorAll('[data-delete-post],[data-delete-reply]').forEach(button => button.addEventListener('click', async () => { if(!confirm('Delete this permanently?'))return; const isPost=button.hasAttribute('data-delete-post'); const id=Number(isPost?button.dataset.deletePost:button.dataset.deleteReply); const result=await db.from(isPost?'posts':'replies').delete().eq('id',id); if(result.error)alert(result.error.message); else isPost?renderHome():renderThread(post.id); }));
    content().querySelector('[data-lock]')?.addEventListener('click',async()=>{const result=await db.from('posts').update({is_locked:!post.is_locked}).eq('id',post.id);if(result.error)alert(result.error.message);else renderThread(post.id);});
  }

  function focusLogin() { document.getElementById('ventAuth').hidden=false; document.getElementById('ventAuth').scrollIntoView({behavior:'smooth'}); document.getElementById('ventAuthStatus').textContent='Log in to do that.'; }
  function openComposer() { if(!session)return focusLogin(); document.getElementById('ventComposer').showModal(); }

  async function renderProfile() {
    if(!session)return focusLogin(); currentView={type:'profile'};
    const posts=await db.from('posts').select('id',{count:'exact',head:true}).eq('author_id',session.user.id);
    content().innerHTML=`<div class="vent-profile"><h2>${esc(profile.username)}</h2><p>Joined ${when(profile.joined_at)} · ${posts.count || 0} discussions</p><form id="ventProfileForm"><label>Bio<textarea name="bio" maxlength="300">${esc(profile.bio)}</textarea></label><button class="vent-action" type="submit">Save profile</button></form></div>`;
    content().querySelector('#ventProfileForm').addEventListener('submit',async e=>{e.preventDefault();const bio=new FormData(e.currentTarget).get('bio').trim();const result=await db.from('profiles').update({bio}).eq('id',session.user.id);if(result.error)alert(result.error.message);else{profile.bio=bio;status('Profile saved.');}});
  }

  async function renderModeration() {
    if(!staff())return; currentView={type:'moderation'};
    const result=await db.from('reports').select('*,profiles!reports_reporter_id_fkey(username)').order('created_at',{ascending:false});
    if(result.error)return showError(result.error);
    content().innerHTML=`<div class="vent-board-head"><h2>Moderation Queue</h2><span>${result.data.filter(r=>r.status==='open').length} open</span></div><div class="vent-moderation">${result.data.length?result.data.map(report=>`<article class="vent-report"><b>Report #${report.id}</b> · ${esc(report.status)}<p>${esc(report.reason)}</p><span class="vent-meta">by ${esc(report.profiles?.username)} · ${when(report.created_at)}</span><br><button class="vent-action" data-review="${report.id}">Mark reviewed</button>${report.post_id?`<button class="vent-action" data-post="${report.post_id}">Open post</button>`:''}</article>`).join(''):'<div class="vent-empty">No reports.</div>'}</div>`;
    content().querySelectorAll('[data-review]').forEach(b=>b.addEventListener('click',async()=>{await db.from('reports').update({status:'reviewed'}).eq('id',Number(b.dataset.review));renderModeration();}));
    content().querySelectorAll('[data-post]').forEach(b=>b.addEventListener('click',()=>renderThread(Number(b.dataset.post))));
  }

  async function refreshCurrent() { if(currentView.type==='thread')return renderThread(currentView.postId);if(currentView.type==='category')return renderCategory(currentView.categoryId,currentView.query);if(currentView.type==='profile')return renderProfile();if(currentView.type==='moderation')return renderModeration();return renderHome(); }

  async function start() {
    if(started)return; started=true; content().hidden=false;
    if(!window.supabase||!window.VENT_CONFIG)return showError('The forum connection did not load. Refresh the page.');
    db=window.supabase.createClient(window.VENT_CONFIG.url,window.VENT_CONFIG.publishableKey);
    try{await loadIdentity();await loadCategories();document.getElementById('ventForum').hidden=false;await renderHome();}catch(error){showError(error);}
    db.auth.onAuthStateChange(async()=>{await loadIdentity();refreshCurrent();});
    db.channel('vent-live').on('postgres_changes',{event:'*',schema:'public',table:'posts'},()=>{status('New forum activity');}).on('postgres_changes',{event:'*',schema:'public',table:'replies'},()=>{status('New reply available');}).subscribe();
  }

  document.querySelectorAll('[data-auth-tab]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-auth-tab]').forEach(b=>b.classList.toggle('active',b===button));document.getElementById('ventLoginForm').hidden=button.dataset.authTab!=='login';document.getElementById('ventSignupForm').hidden=button.dataset.authTab!=='signup';}));
  document.getElementById('ventLoginForm').addEventListener('submit',async event=>{event.preventDefault();const data=new FormData(event.currentTarget);const result=await db.auth.signInWithPassword({email:fakeEmail(data.get('username')),password:data.get('password')});document.getElementById('ventAuthStatus').textContent=result.error?result.error.message:'Logged in.';});
  document.getElementById('ventSignupForm').addEventListener('submit',async event=>{event.preventDefault();const data=new FormData(event.currentTarget);const username=data.get('username').trim();if(data.get('password')!==data.get('confirm'))return document.getElementById('ventAuthStatus').textContent='Passwords do not match.';const result=await db.auth.signUp({email:fakeEmail(username),password:data.get('password'),options:{data:{username}}});document.getElementById('ventAuthStatus').textContent=result.error?result.error.message:'Account created.';});
  document.getElementById('ventPostForm').addEventListener('submit',async event=>{event.preventDefault();if(event.submitter?.value==='cancel')return;const data=new FormData(event.currentTarget);const result=await db.from('posts').insert({author_id:session.user.id,category_id:Number(data.get('category')),title:data.get('title').trim(),body:data.get('body').trim()}).select('id').single();if(result.error){event.preventDefault();return alert(result.error.message);}document.getElementById('ventComposer').close();event.currentTarget.reset();renderThread(result.data.id);});
  document.getElementById('ventComposerCancel').addEventListener('click',()=>document.getElementById('ventComposer').close());
  document.getElementById('ventHomeBtn').addEventListener('click',()=>renderHome());
  document.getElementById('ventNewBtn').addEventListener('click',openComposer);
  document.getElementById('ventProfileBtn').addEventListener('click',renderProfile);
  document.getElementById('ventModerateBtn').addEventListener('click',renderModeration);
  document.getElementById('ventLogoutBtn').addEventListener('click',()=>db.auth.signOut());
  document.getElementById('ventSearchForm').addEventListener('submit',async event=>{event.preventDefault();const query=document.getElementById('ventSearchInput').value.trim();if(!query)return renderHome();status('Searching…');const result=await db.from('posts').select('id,title,created_at,profiles!posts_author_id_fkey(username),categories(name)').or(`title.ilike.%${query.replace(/[%_,()]/g,'')}%,body.ilike.%${query.replace(/[%_,()]/g,'')}%`).order('created_at',{ascending:false});if(result.error)return showError(result.error);content().innerHTML=`<div class="vent-board-head"><h2>Search: ${esc(query)}</h2><span>${result.data.length} result(s)</span></div><div class="vent-post-list">${result.data.map(post=>`<article class="vent-post-row"><div><button data-post="${post.id}">${esc(post.title)}</button><div class="vent-meta">${esc(post.categories?.name)} · by ${esc(post.profiles?.username)}</div></div><div></div><div class="vent-meta">${when(post.created_at)}</div></article>`).join('')||'<div class="vent-empty">Nothing found.</div>'}</div>`;content().querySelectorAll('[data-post]').forEach(b=>b.addEventListener('click',()=>renderThread(Number(b.dataset.post))));status('Search complete');});
  window.initVent=start;
})();
