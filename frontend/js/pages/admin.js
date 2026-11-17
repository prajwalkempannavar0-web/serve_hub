/* ============ SERVEHUB ADMIN PANEL ============ */
window.Admin = (() => {
  const { icon, money, esc, stars, avatar, toast, openModal, closeModal, modalShell, fmtDate, timeAgo, statusPill, areaChart, barChart, donut, animateBars } = U;

  /* ---------------- live API helper (JWT) ----------------
     Talks to the Express backend using the token captured at login.
     Returns null when the API is unreachable (tabs fall back to demo). */
  const API_BASE = window.SH_API || window.SERVEHUB_API || 'http://localhost:4000/api';
  const api = (method, path, body, timeout = 7000) => {
    const token = localStorage.getItem('sh:token') || '';
    return fetch(API_BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(timeout) : undefined,
    }).then(async r => {
      const data = await r.json().catch(() => ({}));
      if (!r.ok && r.status === 401) {
        toast('Admin session expired. Please sign in again.', 'warn');
        location.hash = '#/admin-login';
        return null;
      }
      return data;
    }).catch(() => null);
  };
  const apiGet = (p, t) => api('GET', p, null, t);
  const apiPost = (p, b) => api('POST', p, b);
  const apiPatch = (p, b) => api('PATCH', p, b);
  const apiDelete = p => api('DELETE', p);

  const safeDate = d => {
    if (!d) return '—';
    if (typeof d === 'number') return fmtDate(d);
    const dt = new Date(d);
    if (!isNaN(dt.getTime())) return fmtDate(dt);
    return String(d);
  };

  const fmtMoney = n => money(Math.round(n || 0));

  const VALID_STATUSES = ['pending', 'confirmed', 'assigned', 'arriving', 'started', 'completed', 'paid', 'rated', 'cancelled', 'rejected'];

  const renderStatusPill = st => {
    const meta = {
      pending: { cls: 'badge-warn', icon: 'clock', label: 'Pending' },
      confirmed: { cls: 'badge-success', icon: 'check', label: 'Confirmed' },
      assigned: { cls: 'badge-primary', icon: 'user', label: 'Assigned' },
      arriving: { cls: 'badge-primary', icon: 'navigation', label: 'Arriving' },
      started: { cls: 'badge-warn', icon: 'zap', label: 'Started' },
      completed: { cls: 'badge-success', icon: 'checkCircle', label: 'Completed' },
      paid: { cls: 'badge-success', icon: 'card', label: 'Paid' },
      rated: { cls: 'badge-neutral', icon: 'star', label: 'Rated' },
      cancelled: { cls: 'badge-danger', icon: 'x', label: 'Cancelled' },
      rejected: { cls: 'badge-danger', icon: 'x', label: 'Rejected' },
    };
    const m = meta[st] || { cls: 'badge-neutral', icon: 'info', label: st || 'Unknown' };
    return `<span class="badge ${m.cls}">${icon(m.icon, 12)} ${m.label}</span>`;
  };

  const TABS = [
    { id: 'bookings', label: 'Bookings & Orders', icon: 'calendar', grp: 'Main' },
    { id: 'overview', label: 'Overview', icon: 'grid', grp: 'Main' },
    { id: 'monitor', label: 'Live Monitor', icon: 'navigation', grp: 'Main' },
    { id: 'customers', label: 'Customers', icon: 'users', grp: 'Manage' },
    { id: 'professionals', label: 'Professionals', icon: 'briefcase', grp: 'Manage' },
    { id: 'services', label: 'Services', icon: 'wrench', grp: 'Manage' },
    { id: 'categories', label: 'Categories', icon: 'grid', grp: 'Manage' },
    { id: 'cities', label: 'Cities & Areas', icon: 'pin', grp: 'Manage' },
    { id: 'coupons', label: 'Coupons', icon: 'percent', grp: 'Manage' },
    { id: 'payments', label: 'Payments', icon: 'card', grp: 'Finance' },
    { id: 'refunds', label: 'Refunds', icon: 'refresh', grp: 'Finance' },
    { id: 'commissions', label: 'Commissions', icon: 'percent', grp: 'Finance' },
    { id: 'plans', label: 'Membership Plans', icon: 'crown', grp: 'Finance' },
    { id: 'giftcards', label: 'Gift Cards', icon: 'gift', grp: 'Finance' },
    { id: 'analytics', label: 'Analytics', icon: 'barChart', grp: 'Insights' },
    { id: 'reports', label: 'Reports', icon: 'file', grp: 'Insights' },
    { id: 'cms', label: 'CMS', icon: 'edit', grp: 'Content' },
    { id: 'blog', label: 'Blog', icon: 'book', grp: 'Content' },
    { id: 'banners', label: 'Banners', icon: 'camera', grp: 'Content' },
    { id: 'tickets', label: 'Support Tickets', icon: 'headset', grp: 'Support' },
    { id: 'reviews', label: 'Reviews', icon: 'star', grp: 'Support' },
    { id: 'referrals', label: 'Referral System', icon: 'share', grp: 'Support' },
    { id: 'tax', label: 'Tax Settings', icon: 'coins', grp: 'Settings' },
    { id: 'roles', label: 'Roles & Permissions', icon: 'shield', grp: 'Settings' },
    { id: 'notifications', label: 'Broadcast', icon: 'bell', grp: 'Settings' },
  ];

  const sideNav = active => `
    <div class="side-user">${avatar('Servehub Admin', 44, 1)}<div><b style="font-size:14px">Admin</b><div class="xsmall muted">Super admin</div></div></div>
    <nav class="side-nav">${['Main', 'Manage', 'Finance', 'Insights', 'Content', 'Support', 'Settings'].map(g => `
      <div class="side-group">${g}</div>${TABS.filter(t => t.grp === g).map(t => `<a class="side-link ${active === t.id ? 'active' : ''}" href="#/admin/${t.id}">${icon(t.icon, 18)}<span>${t.label}</span>${t.id === 'monitor' ? `<span class="cnt green" id="live-count">${Store.state.bookings.filter(b => !['cancelled', 'paid', 'rated'].includes(b.status)).length}</span>` : ''}</a>`).join('')}`).join('')}
    </nav>
    <a class="btn btn-outline btn-sm btn-block" href="#/dashboard/overview">${icon('user', 15)} Customer view</a>
    <button class="btn btn-outline btn-sm btn-block" style="margin-top:8px" data-act="logout">${icon('logout', 15)} Log out</button>`;

  const mobileNav = (active) => `<nav class="mobile-dash-nav" aria-label="Admin sections">${TABS.map(t => `<a class="m-dash-link ${active === t.id ? 'active' : ''}" href="#/admin/${t.id}">${icon(t.icon, 15)} ${t.label}</a>`).join('')}</nav>`;

  const layout = (active, inner) => `
    <div class="layout"><aside class="sidebar">${sideNav(active)}</aside>
    <main class="main">${mobileNav(active)}<div class="main-head"><div><h2>${(TABS.find(t => t.id === active) || {}).label}</h2><div class="greet">Servehub Admin • ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
      <span class="badge badge-success"><span class="status-dot dot-green"></span>Admin Command Center</span></div>
    <div id="tab-body">${inner}</div></main></div>`;

  const kpi = (label, val, delta, ic, g, up = true) => `
    <div class="card stat-card"><div class="st-top"><span class="st-ic" style="background:${g}">${icon(ic, 19)}</span><span class="st-delta ${up ? 'up' : 'down'}">${up ? '▲' : '●'} ${delta}</span></div><div class="st-val">${val}</div><div class="st-lbl">${label}</div><div class="st-orb" style="background:${g}"></div></div>`;

  const mini = (ic, title, cls = '', act = '', id = '') => `<button class="mini-btn ${cls}" data-act="${act || 'toast'}" data-msg="${title}" ${id ? `data-id="${id}"` : ''} title="${title}" aria-label="${title}">${icon(ic, 14)}</button>`;

  /* ================= TABS ================= */
  const tabs = {
    overview() {
      return `<div id="admin-overview-wrap"><div class="center" style="padding:60px 0">${icon('refresh', 24)}<div class="small muted" style="margin-top:10px">Loading overview dashboard…</div></div></div>`;
    },
    bookings() {
      return `<div id="admin-bk-wrap"><div class="center" style="padding:60px 0">${icon('refresh', 24)}<div class="small muted" style="margin-top:10px">Loading bookings…</div></div></div>`;
    },
    customers() {
      return `<div id="admin-cust-wrap"><div class="center" style="padding:60px 0">${icon('refresh', 24)}<div class="small muted" style="margin-top:10px">Loading customer accounts…</div></div></div>`;
    },
    professionals() {
      return `<div id="admin-pros-wrap"><div class="center" style="padding:60px 0">${icon('refresh', 24)}<div class="small muted" style="margin-top:10px">Loading professionals…</div></div></div>`;
    },
    services() {
      return `<div id="admin-svcs-wrap"><div class="center" style="padding:60px 0">${icon('refresh', 24)}<div class="small muted" style="margin-top:10px">Loading services catalog…</div></div></div>`;
    },
    categories() {
      const rows = DATA.categories;
      const t = (cols, rws) => `
        <div class="tbl-wrap">
          <div class="tbl-scroll"><table><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}<th></th></tr></thead>
          <tbody>${rws.map(r => `<tr>${r.cells.map(c => `<td>${c}</td>`).join('')}<td><div class="row-actions">${(r.actions || []).join('')}</div></td></tr>`).join('')}</tbody></table></div>
        </div>`;
      return t(['Category', 'Services', 'Price from', 'Rating', 'Bookings'], rows.map(c => ({ cells: [`<div style="display:flex;gap:10px;align-items:center"><span class="w-ic" style="width:34px;height:34px;border-radius:10px;background:${c.g};display:grid;place-items:center;color:#fff">${icon(c.icon, 16)}</span><b style="font-size:13.5px">${c.name}</b></div>`, DATA.servicesByCat(c.slug).length, money(c.price), `${c.rating} ★`, c.bookings.toLocaleString('en-IN')], actions: [mini('edit', 'Edit', 'blue'), mini('eye', 'View')] })));
    },
    cities() {
      const rows = DATA.cities;
      return `
        <div class="tbl-wrap">
          <div class="tbl-tools"><span class="small muted">Serviceable cities across India</span><button class="btn btn-primary btn-sm" style="margin-left:auto" data-act="toast" data-msg="City onboarded 🏙️">${icon('plus', 13)} Onboard city</button></div>
          <div class="tbl-scroll"><table><thead><tr><th>City</th><th>Areas</th><th>Bookings</th><th>Status</th></tr></thead>
          <tbody>${rows.map(c => `<tr><td><b style="font-size:13.5px">${c.name}</b></td><td>${c.areas.map(a => `<span class="pro-tag">${a}</span>`).join(' ')}</td><td>${(Math.random() * 40000 + 8000).toFixed(0)}</td><td><span class="badge badge-success">Serviceable</span></td></tr>`).join('')}</tbody></table></div>
        </div>`;
    },
    coupons() { return mgrShell('coupons'); },
    giftcards() { return mgrShell('giftcards'); },
    payments() {
      return `<div id="admin-payments-wrap"><div class="center" style="padding:60px 0">${icon('refresh', 24)}<div class="small muted" style="margin-top:10px">Loading payment records…</div></div></div>`;
    },
    refunds() {
      return `<div id="admin-refunds-wrap"><div class="center" style="padding:60px 0">${icon('refresh', 24)}<div class="small muted" style="margin-top:10px">Loading refunds…</div></div></div>`;
    },
    commissions() {
      return `
      <div class="card" style="padding:24px;margin-bottom:20px">
        <h3 style="font-size:16px;margin-bottom:6px">Category commission rates</h3><p class="small muted" style="margin-bottom:16px">Servehub's commission on each category. Higher-demand categories have lower commission for pros.</p>
        ${DATA.categories.slice(0, 10).map((c, i) => { const rate = [15, 18, 20, 20, 18, 15, 15, 15, 18, 20, 15, 18, 15, 20, 15, 15, 18][i] || 18; return `
          <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--line-2)">
            <span class="w-ic" style="width:34px;height:34px;border-radius:10px;background:${c.g};display:grid;place-items:center;color:#fff">${icon(c.icon, 15)}</span>
            <b style="flex:1;font-size:13.5px">${c.name}</b>
            <div style="display:flex;align-items:center;gap:8px"><span class="badge badge-neutral">${rate}%</span><input type="range" min="5" max="30" value="${rate}" style="width:120px" aria-label="Commission rate"></div>
          </div>`; }).join('')}
        <button class="btn btn-primary" style="margin-top:16px" data-act="toast" data-msg="Commission settings saved ✅">${icon('check', 14)} Save rates</button>
      </div>`;
    },
    plans() { return mgrShell('plans'); },
    monitor() {
      const active = Store.state.bookings.filter(b => !['cancelled', 'paid', 'rated'].includes(b.status));
      return `
      <div class="card" style="padding:16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <b>${icon('activity', 16)} Live bookings — ${active.length} in progress</b>
        <div style="display:flex;gap:8px"><span class="badge badge-warn">${icon('zap', 12)} ${active.filter(b => b.status === 'started').length} started</span><span class="badge badge-primary">${icon('navigation', 12)} ${active.filter(b => b.status === 'arriving').length} arriving</span></div>
      </div>
      <div class="grid g3" style="grid-template-columns:repeat(3,1fr)">${active.map(b => `
        <div class="card" style="padding:20px" data-live="${b.id}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b style="font-size:14px">${esc(b.serviceName)}</b><span data-live-pill>${renderStatusPill(b.status)}</span></div>
          <div class="small muted">${b.id} • ${esc(b.customerName || b.customer || 'Customer')} • ${safeDate(b.date)} ${b.time || ''}</div>
          <div style="display:flex;gap:8px;margin-top:12px"><span class="badge badge-neutral">${icon('user', 12)} ${esc(b.proName || 'Unassigned')}</span><span class="badge badge-neutral">${fmtMoney(b.total)}</span></div>
          <div style="display:flex;gap:8px;margin-top:14px"><button class="btn btn-soft btn-sm" style="flex:1" data-b-act="view" data-id="${b.id}">${icon('eye', 13)} View</button><button class="btn btn-outline btn-sm" data-b-act="status" data-id="${b.id}">${icon('refresh', 13)} Status</button></div>
        </div>`).join('') || `<div class="tbl-wrap"><div class="tbl-empty">${icon('activity', 28)} No live bookings right now.</div></div>`}</div>`;
    },
    analytics() {
      return `
      <div class="stat-grid">
        ${kpi('Conversion rate', '3.9%', '0.4%', 'activity', 'linear-gradient(135deg,#2563EB,#0EA5E9)')}
        ${kpi('Customer growth', '+18,240', '9.1%', 'users', 'linear-gradient(135deg,#10B981,#14B8A6)')}
        ${kpi('Professional growth', '+1,120', '6.3%', 'briefcase', 'linear-gradient(135deg,#F59E0B,#F97316)')}
        ${kpi('Repeat rate', '68%', '2.2%', 'refresh', 'linear-gradient(135deg,#8B5CF6,#EC4899)')}
      </div>
      <div class="grid" style="grid-template-columns:1.5fr 1fr;gap:24px">
        <div class="card chart-card"><div class="cc-head"><div><h3>Daily bookings</h3><div class="cc-sub">Peak: Saturday • Avg. 840/day</div></div></div>${barChart([620, 700, 680, 760, 720, 980, 890, 640, 720, 690, 770, 940, 860, 990], ['M', 'T', 'W', 'T', 'F', 'S', 'S', 'M', 'T', 'W', 'T', 'F', 'S', 'S'])}</div>
        <div class="card chart-card"><div class="cc-head"><div><h3>Monthly revenue</h3><div class="cc-sub">FY 2026–27</div></div></div>${barChart([28, 33, 31, 38, 42, 40, 47], ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'])}</div>
      </div>`;
    },
    reports() {
      const reports = [['Revenue report', 'Jul 2026', 'barChart'], ['Booking funnel', 'Last 30 days', 'activity'], ['Professional performance', 'Q2 2026', 'users'], ['City-wise growth', 'Jul 2026', 'pin'], ['Refund & disputes', 'Jul 2026', 'refresh'], ['Tax summary (GSTR-1)', 'Q2 2026', 'coins']];
      return `<div class="grid g2" style="grid-template-columns:1fr 1fr">${reports.map(r => `
        <div class="card card-hover" style="padding:20px;display:flex;align-items:center;gap:14px"><span class="n-ic" style="width:44px;height:44px;border-radius:13px;background:var(--primary-50);color:var(--primary-600);display:grid;place-items:center">${icon(r[2], 19)}</span>
        <div style="flex:1"><b style="font-size:14px">${r[0]}</b><div class="xsmall muted">${r[1]} • PDF / CSV / XLSX</div></div>
        <button class="btn btn-soft btn-sm" data-act="toast" data-msg="${r[0]} downloaded 📄">${icon('download', 14)} Download</button></div>`).join('')}</div>`;
    },
    cms() {
      const pages = [['Homepage hero', 'Landing page', 'Edited 2h ago', 'live'], ['Search & categories', 'Discovery', 'Edited 1d ago', 'live'], ['Booking confirmation', 'Transactional', 'Edited 3d ago', 'draft'], ['Email templates', 'Notifications', 'Edited 1w ago', 'live'], ['App push copy', 'Notifications', 'Edited 2w ago', 'draft']];
      return `
        <div class="tbl-wrap">
          <div class="tbl-tools"><button class="btn btn-primary btn-sm" style="margin-left:auto" data-act="toast" data-msg="New content page created 📝">${icon('plus', 13)} New page</button></div>
          <div class="tbl-scroll"><table><thead><tr><th>Page</th><th>Type</th><th>Last edited</th><th>Status</th></tr></thead>
          <tbody>${pages.map(p => `<tr><td><b>${p[0]}</b></td><td>${p[1]}</td><td><span class="small muted">${p[2]}</span></td><td><span class="badge ${p[3] === 'live' ? 'badge-success' : 'badge-warn'}">${p[3] === 'live' ? 'Live' : 'Draft'}</span></td></tr>`).join('')}</tbody></table></div>
        </div>`;
    },
    blog() {
      return `
        <div class="tbl-wrap">
          <div class="tbl-tools"><button class="btn btn-primary btn-sm" style="margin-left:auto" data-act="toast" data-msg="Blog editor opened ✍️">${icon('plus', 13)} Write post</button></div>
          <div class="tbl-scroll"><table><thead><tr><th>Post</th><th>Category</th><th>Date</th><th>Views</th></tr></thead>
          <tbody>${DATA.blog.map(p => `<tr><td><b>${esc(p.title)}</b></td><td>${p.cat}</td><td>${p.date}</td><td>${(Math.random() * 40 + 4).toFixed(1)}k</td></tr>`).join('')}</tbody></table></div>
        </div>`;
    },
    banners() {
      return `<div class="grid g3" style="grid-template-columns:repeat(3,1fr)">${[
        ['Monsoon AC Offer', '20% off on all AC services', 'linear-gradient(135deg,#0EA5E9,#6366F1)', true], ['Festive Deep Clean', 'Flat 25% off — use FESTIVE25', 'linear-gradient(135deg,#8B5CF6,#EC4899)', true], ['New city: Ahmedabad', 'Bookings now live', 'linear-gradient(135deg,#10B981,#14B8A6)', false]].map(b => `
        <div class="card" style="overflow:hidden"><div class="svc-art" style="height:120px"><div class="art-bg" style="background:${b[2]}">${icon('camera', 44)}</div></div>
        <div style="padding:16px"><b style="font-size:14px">${b[0]}</b><div class="small muted" style="margin:4px 0 12px">${b[1]}</div>
        <div style="display:flex;justify-content:space-between;align-items:center"><label class="switch"><input type="checkbox" ${b[3] ? 'checked' : ''}><span class="trk"></span></label><span class="badge ${b[3] ? 'badge-success' : 'badge-neutral'}">${b[3] ? 'Live' : 'Paused'}</span></div></div></div>`).join('')}</div>`;
    },
    tickets() { return mgrShell('tickets'); },
    reviews() { return mgrShell('reviews'); },
    referrals() {
      return `<div class="stat-grid">
        ${kpi('Active referrers', '84,200', '9.4%', 'share', 'linear-gradient(135deg,#2563EB,#0EA5E9)')}
        ${kpi('Referral revenue', fmtMoney(2840000), '14%', 'wallet', 'linear-gradient(135deg,#10B981,#14B8A6)')}
        ${kpi('Conversion', '31%', '3%', 'activity', 'linear-gradient(135deg,#F59E0B,#F97316)')}
      </div>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:24px">
        <div class="card" style="padding:22px"><h3 style="font-size:15px;margin-bottom:14px">Referral settings</h3>
          <div class="sum-row"><span class="muted">Referrer reward</span><b>₹100</b></div>
          <div class="sum-row"><span class="muted">Referee reward</span><b>₹100</b></div>
          <div class="sum-row"><span class="muted">Min. booking for reward</span><b>₹399</b></div>
          <div class="sum-row"><span class="muted">Reward expiry</span><b>30 days</b></div>
          <button class="btn btn-primary btn-sm" style="margin-top:14px" data-act="toast" data-msg="Referral settings saved ✅">${icon('check', 14)} Save</button></div>
        <div class="card" style="padding:22px"><h3 style="font-size:15px;margin-bottom:14px">Top referrers</h3>${[['Kavya Menon', 48, '₹4,800'], ['Mohit Agarwal', 36, '₹3,600'], ['Sara Fernandes', 29, '₹2,900'], ['Devang Joshi', 24, '₹2,400']].map(r => `<div class="list-row" style="padding:10px 0">${avatar(r[0], 36)}<div style="flex:1"><b style="font-size:13px">${r[0]}</b><div class="xsmall muted">${r[1]} referrals</div></div><b>${r[2]}</b></div>`).join('')}</div>
      </div>`;
    },
    tax() {
      return `
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:24px">
        <div class="card" style="padding:24px"><h3 style="font-size:15px;margin-bottom:16px">GST settings</h3>
          <div class="field"><label class="label">GST rate (%)</label><div style="display:flex;gap:8px"><input class="input" value="18" style="max-width:120px"><button class="btn btn-soft" data-act="toast" data-msg="GST rate updated ✅">Save</button></div></div>
          <div class="field"><label class="label">Business GSTIN</label><input class="input" value="27ABCDE1234F1Z5"></div>
          <div class="field"><label class="label">Legal entity</label><input class="input" value="Servehub Services Pvt. Ltd."></div>
        </div>
        <div class="card" style="padding:24px"><h3 style="font-size:15px;margin-bottom:16px">TDS & settlements</h3>
          <div class="sum-row"><span class="muted">TDS on pro payouts (194J)</span><b>2%</b></div>
          <div class="sum-row"><span class="muted">Payout cycle</span><b>Weekly (Fri)</b></div>
          <div class="sum-row"><span class="muted">Settlement fee</span><b>Free</b></div>
          <div class="sum-row"><span class="muted">Last GSTR-1 filed</span><b>Jul 7, 2026</b></div>
          <button class="btn btn-primary btn-sm" style="margin-top:14px" data-act="toast" data-msg="Tax settings saved ✅">${icon('check', 14)} Save</button></div>
      </div>`;
    },
    roles() {
      const perms = [['Manage customers', true, true, false], ['Manage professionals', true, true, true], ['Process refunds', true, true, false], ['Edit commissions', true, false, false], ['Publish CMS content', true, true, false], ['View analytics', true, true, true], ['Modify roles', true, false, false]];
      const roles = ['Super admin', 'Operations', 'Finance', 'Support'];
      return `
      <div class="card" style="padding:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px"><div><h3 style="font-size:16px">Role-based access control</h3><p class="small muted">Define what each role can do across the admin panel.</p></div><button class="btn btn-primary btn-sm" data-act="toast" data-msg="New role created 👤">${icon('plus', 13)} Add role</button></div>
        <div class="tbl-scroll"><table><thead><tr><th>Permission</th>${roles.map(r => `<th class="center" style="text-align:center">${r}</th>`).join('')}</tr></thead><tbody>
        ${perms.map(p => `<tr><td><b style="font-size:13px">${p[0]}</b></td>${p.slice(1).map(v => `<td class="center" style="text-align:center">${v ? `<span style="color:var(--success-600)">${icon('checkCircle', 17)}</span>` : '<span style="color:var(--ink-4)">—</span>'}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div>
      </div>`;
    },
    notifications() {
      return `
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:24px">
        <div class="card" style="padding:24px"><h3 style="font-size:16px;margin-bottom:14px">Broadcast a notification</h3>
          <div class="field"><label class="label">Audience</label><select class="select" id="bc-audience"><option value="all">All registered users</option><option value="customers">All customers only</option><option value="pros">All professionals only</option></select></div>
          <div class="field"><label class="label" for="bc-title">Title</label><input class="input" id="bc-title" placeholder="e.g. Special Weekend Offer is live!"></div>
          <div class="field"><label class="label" for="bc-msg">Message</label><textarea class="textarea" id="bc-msg" placeholder="Write notification message…"></textarea></div>
          <button class="btn btn-primary btn-block" id="bc-send-btn">${icon('bell', 16)} Send broadcast notification</button>
        </div>
        <div class="card" style="padding:24px"><h3 style="font-size:16px;margin-bottom:14px">Recent broadcast history</h3>
          ${[['Special monsoon offer is live!', 'All users • Just now'], ['Welcome to Servehub premium home services', 'All customers • 2 days ago'], ['Professional safety guidelines reminder', 'All professionals • 5 days ago']].map(n => `
          <div class="list-row"><span class="n-ic" style="width:38px;height:38px;border-radius:11px;background:var(--primary-50);color:var(--primary-600);display:grid;place-items:center">${icon('bell', 16)}</span>
          <div style="flex:1;min-width:0"><b style="font-size:13px">${n[0]}</b><div class="xsmall muted">${n[1]}</div></div><span class="badge badge-success">Sent</span></div>`).join('')}
        </div>
      </div>`;
    },
  };

  /* ================= LIVE LOADERS ================= */

  /* ---------- 1. Overview (Step 2) ---------- */
  const loadOverview = async () => {
    const wrap = U.$('#admin-overview-wrap');
    if (!wrap) return;
    const stats = (await apiGet('/admin/stats')) || {};
    const totalBk = stats.totalBookings ?? Store.state.bookings.length;
    const pendingBk = stats.pendingBookings ?? Store.state.bookings.filter(b => b.status === 'pending').length;
    const confirmedBk = stats.confirmedBookings ?? Store.state.bookings.filter(b => b.status === 'confirmed').length;
    const inProgBk = stats.inProgressBookings ?? Store.state.bookings.filter(b => ['assigned', 'arriving', 'started'].includes(b.status)).length;
    const completedBk = stats.completedBookings ?? Store.state.bookings.filter(b => ['completed', 'paid', 'rated'].includes(b.status)).length;
    const cancelledBk = stats.cancelledBookings ?? Store.state.bookings.filter(b => ['cancelled', 'rejected'].includes(b.status)).length;
    const customersCount = stats.customers ?? 6;
    const prosCount = stats.professionals ?? (DATA.pros ? DATA.pros.length : 12);
    const rev = stats.revenue ?? (Store.state.bookings.reduce((a, b) => a + (b.total || 0), 0) + 4823500);
    const recent = stats.recentBookings || Store.state.bookings.slice(0, 8);

    wrap.innerHTML = `
      <div class="stat-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
        ${kpi('Total Bookings', totalBk.toLocaleString('en-IN'), 'All time', 'calendar', 'linear-gradient(135deg,#2563EB,#0EA5E9)')}
        ${kpi('New / Pending', pendingBk.toLocaleString('en-IN'), pendingBk + ' waiting', 'clock', 'linear-gradient(135deg,#F59E0B,#D97706)', false)}
        ${kpi('Confirmed', confirmedBk.toLocaleString('en-IN'), 'Ready for pro', 'check', 'linear-gradient(135deg,#10B981,#059669)')}
        ${kpi('In-Progress', inProgBk.toLocaleString('en-IN'), 'Active jobs', 'navigation', 'linear-gradient(135deg,#8B5CF6,#6366F1)')}
      </div>
      <div class="stat-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:28px">
        ${kpi('Completed', completedBk.toLocaleString('en-IN'), 'Successful', 'checkCircle', 'linear-gradient(135deg,#10B981,#14B8A6)')}
        ${kpi('Cancelled', cancelledBk.toLocaleString('en-IN'), 'Cancelled/Rejected', 'x', 'linear-gradient(135deg,#EF4444,#DC2626)', false)}
        ${kpi('Registered Customers', customersCount.toLocaleString('en-IN'), 'Verified users', 'users', 'linear-gradient(135deg,#06B6D4,#3B82F6)')}
        ${kpi('Labourers / Pros', prosCount.toLocaleString('en-IN'), 'Active network', 'briefcase', 'linear-gradient(135deg,#F59E0B,#F97316)')}
      </div>

      <div class="card" style="padding:16px 20px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;background:var(--surface);border-color:var(--line);flex-wrap:wrap;gap:12px">
        <div style="display:flex;gap:14px;align-items:center">
          <span class="st-ic" style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#2563EB,#0EA5E9);display:grid;place-items:center;color:#fff">${icon('wallet', 18)}</span>
          <div><div class="xsmall muted">Total Settled Revenue</div><b style="font-size:18px">${fmtMoney(rev)}</b></div>
        </div>
        <div style="display:flex;gap:10px">
          <a class="btn btn-outline btn-sm" href="#/admin/bookings">${icon('calendar', 14)} Manage Bookings</a>
          <a class="btn btn-primary btn-sm" href="#/admin/monitor">${icon('navigation', 14)} Live Monitor</a>
        </div>
      </div>

      <div class="grid" style="grid-template-columns:1.5fr 1fr;gap:24px;align-items:start">
        <div class="card chart-card">
          <div class="cc-head"><div><h3>Revenue — monthly volume</h3><div class="cc-sub">₹43.2L estimated total • avg. ₹3.6L/mo</div></div><span class="badge badge-success">${icon('trendingUp', 12)} +12.4%</span></div>
          ${areaChart([22, 26, 24, 29, 31, 28, 34, 37, 35, 41, 39, 46], { color: '#2563EB', labels: ['S', 'O', 'N', 'D', 'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A'] })}
        </div>
        <div class="card chart-card">
          <div class="cc-head"><div><h3>Bookings by Category</h3><div class="cc-sub">Current distribution</div></div></div>
          ${donut([{ label: 'Cleaning', value: 34, color: '#2563EB' }, { label: 'AC Repair', value: 22, color: '#0EA5E9' }, { label: 'Salon', value: 18, color: '#EC4899' }, { label: 'Electric/Plumb', value: 16, color: '#F59E0B' }, { label: 'Others', value: 10, color: '#10B981' }], totalBk.toString(), 'bookings')}
        </div>
      </div>

      <div class="grid g3" style="grid-template-columns:repeat(3,1fr);margin-top:24px;gap:24px">
        <div class="card" style="padding:20px"><h3 style="font-size:15px;margin-bottom:12px">Top Requested Services</h3>${[
          ['Deep Home Cleaning', 8120, 'linear-gradient(135deg,#2563EB,#0EA5E9)'], ['AC Service & Repair', 7460, 'linear-gradient(135deg,#0EA5E9,#6366F1)'], ['Salon at Home', 6910, 'linear-gradient(135deg,#F43F5E,#EC4899)'], ['Basic Home Cleaning', 6540, 'linear-gradient(135deg,#10B981,#14B8A6)']].map((s, i) => `
          <div class="sum-row"><span style="display:flex;gap:8px;align-items:center"><span class="w-ic" style="width:28px;height:28px;border-radius:8px;background:${s[2]};display:grid;place-items:center;color:#fff;font-size:12px">${i + 1}</span><b style="font-size:13px">${s[0]}</b></span><b style="font-size:13px">${s[1].toLocaleString('en-IN')}</b></div>`).join('')}</div>
        <div class="card" style="padding:20px"><h3 style="font-size:15px;margin-bottom:12px">Service Coverage</h3>${[['Mumbai', 52.4, 'linear-gradient(135deg,#2563EB,#0EA5E9)'], ['Bengaluru', 44.1, 'linear-gradient(135deg,#10B981,#14B8A6)'], ['Delhi NCR', 38.7, 'linear-gradient(135deg,#8B5CF6,#EC4899)'], ['Hyderabad', 29.3, 'linear-gradient(135deg,#F59E0B,#F97316)']].map(s => `
          <div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:6px"><span>${s[0]}</span><b>${money(s[1] * 10000)}</b></div><div class="progress"><i style="width:${(s[1] / 55) * 100}%;background:${s[2]}"></i></div></div>`).join('')}</div>
        <div class="card" style="padding:20px"><h3 style="font-size:15px;margin-bottom:12px">Recent Activity</h3>
          <div style="max-height:220px;overflow-y:auto">${recent.slice(0, 6).map(b => `<div class="list-row" style="padding:9px 0"><span class="status-dot dot-green"></span><div style="flex:1;min-width:0"><b style="font-size:12.5px">${esc(b.serviceName || b.serviceId)}</b><div class="xsmall muted">${b.id} • ${esc(b.customerName || b.customer || 'Customer')}</div></div>${renderStatusPill(b.status)}</div>`).join('') || '<div class="small muted">No recent bookings</div>'}</div>
          <a class="btn btn-soft btn-sm btn-block" style="margin-top:10px" href="#/admin/bookings">View all orders →</a></div>
      </div>
    `;
  };

  /* ---------- 2. Bookings Management (Step 3) ---------- */
  let bkData = [];
  let bkFilter = { q: '', status: 'all', cat: 'all', sort: 'newest', page: 1, limit: 10 };

  const loadBookings = async () => {
    const wrap = U.$('#admin-bk-wrap');
    if (!wrap) return;
    const res = await apiGet('/admin/bookings');
    if (res && res.bookings) {
      bkData = res.bookings;
      // sync with client Store
      const map = new Map(bkData.map(b => [b.id, b]));
      Store.state.bookings.forEach(b => { if (!map.has(b.id)) map.set(b.id, b); });
      Store.state.bookings = Array.from(map.values());
      Store.persist();
    } else {
      bkData = Store.state.bookings || [];
    }
    renderBookingsView(wrap);
  };

  const renderBookingsView = (wrap) => {
    // filter and sort
    let list = [...bkData];
    if (bkFilter.q) {
      const q = bkFilter.q.toLowerCase();
      list = list.filter(b =>
        (b.id || '').toLowerCase().includes(q) ||
        (b.customerName || b.customer || '').toLowerCase().includes(q) ||
        (b.customerPhone || '').toLowerCase().includes(q) ||
        (b.customerEmail || '').toLowerCase().includes(q) ||
        (b.serviceName || '').toLowerCase().includes(q) ||
        (b.proName || '').toLowerCase().includes(q)
      );
    }
    if (bkFilter.status !== 'all') {
      if (bkFilter.status === 'in-progress') list = list.filter(b => ['assigned', 'arriving', 'started'].includes(b.status));
      else if (bkFilter.status === 'completed') list = list.filter(b => ['completed', 'paid', 'rated'].includes(b.status));
      else if (bkFilter.status === 'cancelled') list = list.filter(b => ['cancelled', 'rejected'].includes(b.status));
      else list = list.filter(b => b.status === bkFilter.status);
    }
    if (bkFilter.cat !== 'all') {
      list = list.filter(b => (b.category || b.cat || '').toLowerCase() === bkFilter.cat.toLowerCase());
    }
    // sort
    if (bkFilter.sort === 'newest') list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    else if (bkFilter.sort === 'oldest') list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    else if (bkFilter.sort === 'amount-high') list.sort((a, b) => (b.total || 0) - (a.total || 0));
    else if (bkFilter.sort === 'amount-low') list.sort((a, b) => (a.total || 0) - (b.total || 0));

    const totalCount = list.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / bkFilter.limit));
    if (bkFilter.page > totalPages) bkFilter.page = totalPages;
    const startIdx = (bkFilter.page - 1) * bkFilter.limit;
    const pageItems = list.slice(startIdx, startIdx + bkFilter.limit);

    wrap.innerHTML = `
      <div class="tbl-wrap">
        <div class="tbl-tools" style="gap:10px">
          <div class="input-group" style="flex:1;min-width:240px">
            ${icon('search', 16)}
            <input class="input" id="bk-search-input" value="${esc(bkFilter.q)}" placeholder="Search by Booking ID, customer, phone, service…">
          </div>
          <select class="select" id="bk-filter-status" style="width:auto;min-width:140px">
            <option value="all" ${bkFilter.status === 'all' ? 'selected' : ''}>All Statuses</option>
            <option value="pending" ${bkFilter.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="confirmed" ${bkFilter.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="in-progress" ${bkFilter.status === 'in-progress' ? 'selected' : ''}>In-Progress (Active)</option>
            <option value="completed" ${bkFilter.status === 'completed' ? 'selected' : ''}>Completed / Paid</option>
            <option value="cancelled" ${bkFilter.status === 'cancelled' ? 'selected' : ''}>Cancelled / Rejected</option>
          </select>
          <select class="select" id="bk-filter-sort" style="width:auto;min-width:140px">
            <option value="newest" ${bkFilter.sort === 'newest' ? 'selected' : ''}>Newest First</option>
            <option value="oldest" ${bkFilter.sort === 'oldest' ? 'selected' : ''}>Oldest First</option>
            <option value="amount-high" ${bkFilter.sort === 'amount-high' ? 'selected' : ''}>Amount: High to Low</option>
            <option value="amount-low" ${bkFilter.sort === 'amount-low' ? 'selected' : ''}>Amount: Low to High</option>
          </select>
          <button class="btn btn-outline btn-sm" id="bk-refresh-btn" title="Refresh bookings list">${icon('refresh', 13)} Refresh</button>
        </div>

        <div class="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Assigned Professional</th>
                <th>Date & Time</th>
                <th>Address</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${pageItems.map(b => `
                <tr>
                  <td>
                    <a href="javascript:void(0)" data-b-act="view" data-id="${b.id}" style="text-decoration:none" title="Click to view full order details">
                      <b style="font-size:13.5px;color:var(--primary-600)">${b.id}</b>
                    </a>
                    <div class="xsmall muted">${timeAgo(b.createdAt)}</div>
                  </td>
                  <td>
                    <div style="display:flex;gap:8px;align-items:center">
                      ${avatar(b.customerName || b.customer || 'Customer', 30)}
                      <div>
                        <b style="font-size:13px">${esc(b.customerName || b.customer || 'Customer')}</b>
                        <div class="xsmall muted">${esc(b.customerPhone || b.customerEmail || '—')}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <b style="font-size:13px">${esc(b.serviceName || b.serviceId)}</b>
                    <div class="xsmall muted">${esc(b.packageName || b.pack || '')}</div>
                  </td>
                  <td>
                    ${b.proName || b.proId ? `
                      <span style="display:flex;align-items:center;gap:6px">
                        ${icon('user', 13)}
                        <b>${esc(b.proName || 'Pro #' + b.proId)}</b>
                      </span>` : `<span class="badge badge-warn">Unassigned</span>`}
                  </td>
                  <td>
                    <div>${safeDate(b.date)}</div>
                    <div class="xsmall muted">${b.time || ''}</div>
                  </td>
                  <td>
                    <div class="xsmall muted" style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(b.formattedAddress || b.address || '')}">
                      ${esc(b.city ? `${b.city} — ${b.address || ''}` : (b.address || '—'))}
                    </div>
                  </td>
                  <td>
                    <b>${fmtMoney(b.total)}</b>
                    <div class="xsmall">
                      <span class="badge ${b.paymentStatus === 'paid' ? 'badge-success' : b.paymentStatus === 'refunded' ? 'badge-warn' : 'badge-neutral'}" style="padding:1px 6px;font-size:10.5px">
                        ${b.paymentStatus || 'pending'}
                      </span>
                    </div>
                  </td>
                  <td>${renderStatusPill(b.status)}</td>
                  <td>
                    <div class="row-actions" style="display:flex;gap:6px;align-items:center;flex-wrap:nowrap">
                      <button class="btn btn-outline btn-xs" data-b-act="view" data-id="${b.id}" style="padding:4px 8px;font-size:11.5px;font-weight:700;display:inline-flex;gap:4px;align-items:center" title="View order details">
                        ${icon('eye', 13)} Details
                      </button>
                      <button class="mini-btn ok" data-b-act="assign" data-id="${b.id}" title="Assign professional">${icon('user', 14)}</button>
                      <button class="mini-btn warn" data-b-act="status" data-id="${b.id}" title="Update status">${icon('refresh', 14)}</button>
                      ${!['cancelled', 'rejected'].includes(b.status) ? `<button class="mini-btn no" data-b-act="cancel" data-id="${b.id}" title="Cancel booking">${icon('x', 14)}</button>` : ''}
                    </div>
                  </td>
                </tr>
              `).join('') || `<tr><td colspan="9"><div class="tbl-empty">${icon('calendar', 28)}<div style="margin-top:8px">No bookings found matching your search and filters</div></div></td></tr>`}
            </tbody>
          </table>
        </div>

        <div class="tbl-tools" style="justify-content:space-between">
          <span class="small muted">Showing ${totalCount ? startIdx + 1 : 0}–${Math.min(startIdx + bkFilter.limit, totalCount)} of ${totalCount} bookings</span>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="mini-btn" id="bk-prev-page" ${bkFilter.page <= 1 ? 'disabled' : ''}>${icon('arrowLeft', 13)}</button>
            <span class="small muted" style="padding:0 6px">Page ${bkFilter.page} of ${totalPages}</span>
            <button class="mini-btn" id="bk-next-page" ${bkFilter.page >= totalPages ? 'disabled' : ''}>${icon('arrowRight', 13)}</button>
          </div>
        </div>
      </div>
    `;

    // wire controls
    const inp = U.$('#bk-search-input', wrap);
    if (inp) {
      inp.addEventListener('input', U.debounce(() => {
        bkFilter.q = inp.value.trim();
        bkFilter.page = 1;
        renderBookingsView(wrap);
      }, 250));
    }
    const stSel = U.$('#bk-filter-status', wrap);
    if (stSel) {
      stSel.addEventListener('change', () => {
        bkFilter.status = stSel.value;
        bkFilter.page = 1;
        renderBookingsView(wrap);
      });
    }
    const sortSel = U.$('#bk-filter-sort', wrap);
    if (sortSel) {
      sortSel.addEventListener('change', () => {
        bkFilter.sort = sortSel.value;
        renderBookingsView(wrap);
      });
    }
    const refBtn = U.$('#bk-refresh-btn', wrap);
    if (refBtn) {
      refBtn.addEventListener('click', () => {
        toast('Refreshing bookings from server…', 'info');
        loadBookings();
      });
    }
    const prevBtn = U.$('#bk-prev-page', wrap);
    if (prevBtn) prevBtn.addEventListener('click', () => { if (bkFilter.page > 1) { bkFilter.page--; renderBookingsView(wrap); } });
    const nextBtn = U.$('#bk-next-page', wrap);
    if (nextBtn) nextBtn.addEventListener('click', () => { if (bkFilter.page < totalPages) { bkFilter.page++; renderBookingsView(wrap); } });

    // delegate table row actions
    wireBookingActions(wrap);
  };

  const wireBookingActions = (wrap) => {
    if (wrap.dataset.actionsWired) return;
    wrap.dataset.actionsWired = '1';
    wrap.addEventListener('click', async e => {
      const btn = e.target.closest('[data-b-act]');
      if (!btn) return;
      const act = btn.dataset.bAct;
      const id = btn.dataset.id;
      const b = bkData.find(x => String(x.id) === String(id)) || Store.bookingById(id);
      if (!b) { toast('Booking not found', 'warn'); return; }

      if (act === 'view') {
        openBookingModal(b);
      } else if (act === 'assign') {
        openAssignProModal(b);
      } else if (act === 'status') {
        openStatusModal(b);
      } else if (act === 'cancel') {
        if (!confirm(`Are you sure you want to cancel booking ${b.id}? This will notify the customer.`)) return;
        const res = await apiPost(`/admin/bookings/${b.id}/cancel`, { reason: 'Cancelled by Administrator' });
        if (res && res.booking) {
          b.status = 'cancelled';
          Store.advanceBooking(b.id, 'cancelled');
          toast(`Booking ${b.id} marked as cancelled ✅`, 'success');
          loadBookings();
        } else {
          b.status = 'cancelled';
          Store.advanceBooking(b.id, 'cancelled');
          toast(`Booking ${b.id} cancelled (demo) ✅`, 'success');
          loadBookings();
        }
      }
    });
  };

  /* ---------- Booking Detail Modal ---------- */
  const openBookingModal = async (b) => {
    // Optionally fetch full record from API
    let full = b;
    const res = await apiGet(`/admin/bookings/${b.id}`);
    if (res && res.booking) full = { ...b, ...res.booking, customer: res.customer, pro: res.pro };

    const html = modalShell(`Booking Details — ${full.id}`, `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px">
        <div style="display:flex;gap:10px;align-items:center">
          <span style="font-size:18px;font-weight:800;color:var(--ink)">${esc(full.serviceName || full.serviceId)}</span>
          ${renderStatusPill(full.status)}
        </div>
        <span class="small muted">Booked on ${safeDate(full.createdAt)}</span>
      </div>

      <div class="grid g2" style="grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="card" style="padding:16px;background:var(--surface)">
          <div class="small muted" style="margin-bottom:8px"><b>${icon('user', 14)} Customer Information</b></div>
          <div class="sum-row"><span class="muted">Name</span><b>${esc(full.customerName || full.customer?.name || 'Customer')}</b></div>
          <div class="sum-row"><span class="muted">Email</span><b>${esc(full.customerEmail || full.customer?.email || '—')}</b></div>
          <div class="sum-row"><span class="muted">Phone</span><b>${esc(full.customerPhone || full.customer?.phone || '—')}</b></div>
          <div class="sum-row"><span class="muted">User ID</span><b>${esc(String(full.userId || '—'))}</b></div>
        </div>

        <div class="card" style="padding:16px;background:var(--surface)">
          <div class="small muted" style="margin-bottom:8px"><b>${icon('briefcase', 14)} Assigned Professional</b></div>
          <div class="sum-row"><span class="muted">Professional</span><b>${esc(full.proName || full.pro?.name || 'Unassigned')}</b></div>
          <div class="sum-row"><span class="muted">Pro Phone</span><b>${esc(full.pro?.phone || '—')}</b></div>
          <div class="sum-row"><span class="muted">Rating</span><b>${full.pro?.rating ? full.pro.rating + ' ★' : '—'}</b></div>
          <div class="sum-row"><span class="muted">Pro ID</span><b>${esc(String(full.proId || 'None'))}</b></div>
        </div>
      </div>

      <div class="card" style="padding:16px;background:var(--surface);margin-bottom:16px">
        <div class="small muted" style="margin-bottom:8px"><b>${icon('calendar', 14)} Schedule & Address</b></div>
        <div class="sum-row"><span class="muted">Date & Time</span><b>${safeDate(full.date)} at ${full.time || '—'}</b></div>
        <div class="sum-row"><span class="muted">Full Address</span><span style="font-weight:600;max-width:320px;text-align:right">${esc(full.formattedAddress || full.address || '—')}</span></div>
        <div class="sum-row"><span class="muted">City / State</span><b>${esc(full.city || '')} ${esc(full.state ? '• ' + full.state : '')} ${esc(full.pincode ? '(' + full.pincode + ')' : '')}</b></div>
      </div>

      <div class="card" style="padding:16px;background:var(--surface)">
        <div class="small muted" style="margin-bottom:8px"><b>${icon('card', 14)} Payment & Total</b></div>
        <div class="sum-row"><span class="muted">Total Amount</span><b style="font-size:16px;color:var(--primary-600)">${fmtMoney(full.total)}</b></div>
        <div class="sum-row"><span class="muted">Payment Method</span><b>${esc(full.paymentMethod || 'wallet')}</b></div>
        <div class="sum-row"><span class="muted">Payment Status</span><span class="badge ${full.paymentStatus === 'paid' ? 'badge-success' : full.paymentStatus === 'refunded' ? 'badge-warn' : 'badge-neutral'}">${full.paymentStatus || 'pending'}</span></div>
        ${full.coupon ? `<div class="sum-row"><span class="muted">Coupon Applied</span><b>${esc(full.coupon)} (-${fmtMoney(full.discount)})</b></div>` : ''}
        ${full.notes ? `<div class="sum-row"><span class="muted">Customer Notes</span><span class="small muted">${esc(full.notes)}</span></div>` : ''}
      </div>`,
      `<button class="btn btn-ghost" data-act="close-modal">Close</button>
       <button class="btn btn-primary" id="m-btn-assign">${icon('user', 14)} Assign Pro</button>
       <button class="btn btn-soft" id="m-btn-status">${icon('refresh', 14)} Update Status</button>
       ${full.status === 'cancelled' && full.paymentStatus !== 'refunded' ? `<button class="btn btn-warn" id="m-btn-refund">${icon('wallet', 14)} Process Refund</button>` : ''}
       ${!['cancelled', 'rejected'].includes(full.status) ? `<button class="btn btn-outline" style="color:var(--danger-600);border-color:var(--danger-100)" id="m-btn-cancel">${icon('x', 14)} Cancel Booking</button>` : ''}
      `);

    openModal(html);

    U.$('#m-btn-assign')?.addEventListener('click', () => { closeModal(); openAssignProModal(full); });
    U.$('#m-btn-status')?.addEventListener('click', () => { closeModal(); openStatusModal(full); });
    U.$('#m-btn-cancel')?.addEventListener('click', async () => {
      if (!confirm(`Cancel booking ${full.id}?`)) return;
      await apiPost(`/admin/bookings/${full.id}/cancel`, { reason: 'Admin override' });
      toast(`Booking ${full.id} cancelled ✅`, 'success');
      closeModal();
      loadBookings();
    });
    U.$('#m-btn-refund')?.addEventListener('click', async () => {
      if (!confirm(`Process refund of ${fmtMoney(full.total)} for booking ${full.id}?`)) return;
      const res = await apiPost(`/admin/bookings/${full.id}/refund`, { amount: full.total });
      if (res && res.refunded) toast(`Refund of ${fmtMoney(full.total)} credited to customer wallet 💰`, 'success');
      else toast('Refund processed ✅', 'success');
      closeModal();
      loadBookings();
    });
  };

  /* ---------- Assign Pro Modal ---------- */
  const openAssignProModal = async (b) => {
    let pros = [];
    const res = await apiGet('/admin/professionals');
    if (res && res.professionals) pros = res.professionals;
    else if (DATA.pros) pros = DATA.pros.map((p, i) => ({ id: i + 1, name: p.name, rating: p.rating, city: 'Mumbai', status: 'active' }));

    openModal(modalShell(`Assign Professional — ${b.id}`, `
      <p class="small muted" style="margin-bottom:14px">Select an active service professional or labourer to assign to this booking.</p>
      <div class="field"><label class="label">Choose Professional</label>
        <select class="select" id="assign-pro-select">
          <option value="">-- Choose a professional --</option>
          ${pros.map(p => `<option value="${p.id}" ${b.proId === p.id ? 'selected' : ''}>${esc(p.name)} • ${p.city || 'India'} (${p.rating || 4.8} ★) • ${p.status || 'active'}</option>`).join('')}
        </select>
      </div>`,
      `<button class="btn btn-ghost" data-act="close-modal">Cancel</button>
       <button class="btn btn-primary" id="assign-pro-save">${icon('check', 14)} Assign Pro</button>`));

    U.$('#assign-pro-save')?.addEventListener('click', async () => {
      const proId = U.$('#assign-pro-select')?.value;
      if (!proId) { toast('Please choose a professional', 'warn'); return; }
      const r = await apiPost(`/admin/bookings/${b.id}/assign`, { proId: Number(proId) });
      if (r && r.booking) {
        toast(`Professional assigned to ${b.id} ✅`, 'success');
      } else {
        const found = pros.find(x => String(x.id) === String(proId));
        b.proId = Number(proId);
        if (found) b.proName = found.name;
        b.status = 'assigned';
        Store.advanceBooking(b.id, 'assigned');
        toast(`Professional assigned (demo) ✅`, 'success');
      }
      closeModal();
      loadBookings();
    });
  };

  /* ---------- Status Update Modal ---------- */
  const openStatusModal = (b) => {
    openModal(modalShell(`Update Status — ${b.id}`, `
      <div class="sum-row"><span class="muted">Current Status</span><span>${renderStatusPill(b.status)}</span></div>
      <div class="field" style="margin-top:14px"><label class="label">New Status</label>
        <select class="select" id="new-bk-status">
          ${VALID_STATUSES.map(s => `<option value="${s}" ${b.status === s ? 'selected' : ''}>${s.toUpperCase()}</option>`).join('')}
        </select>
      </div>
      <div class="card glass" style="padding:12px;font-size:12px;margin-top:12px">
        <b>${icon('info', 13)} Note:</b> Transitioning to <b>completed</b> credits 10% wallet cashback and 10 reward points to the customer. Transitioning to <b>cancelled</b> allows refund processing.
      </div>`,
      `<button class="btn btn-ghost" data-act="close-modal">Cancel</button>
       <button class="btn btn-primary" id="save-bk-status">${icon('check', 14)} Save Status</button>`));

    U.$('#save-bk-status')?.addEventListener('click', async () => {
      const status = U.$('#new-bk-status')?.value;
      if (!status) return;
      const r = await apiPatch(`/admin/bookings/${b.id}`, { status });
      if (r && r.booking) {
        toast(`Booking ${b.id} status updated to ${status} ✅`, 'success');
      } else {
        b.status = status;
        Store.advanceBooking(b.id, status);
        toast(`Status updated (demo) ✅`, 'success');
      }
      closeModal();
      loadBookings();
    });
  };

  /* ---------- 3. Customers Management (Step 5) ---------- */
  let usersList = [];
  const loadCustomers = async () => {
    const wrap = U.$('#admin-cust-wrap');
    if (!wrap) return;
    const res = await apiGet('/admin/users');
    if (res && res.users) {
      usersList = res.users.filter(u => u.role === 'customer' || !u.role);
    } else {
      usersList = [
        { id: 9000, name: 'Demo Customer', email: 'demo@servehub.com', phone: '+91 98765 43210', walletBalance: 1250, rewardPoints: 340, membershipPlan: 'plus', createdAt: '2026-07-15T09:00:00.000Z' },
        { id: 9001, name: 'Ananya Rao', email: 'ananya@example.com', phone: '+91 98200 11223', walletBalance: 450, rewardPoints: 120, membershipPlan: 'free', createdAt: '2026-07-20T10:00:00.000Z' },
        { id: 9002, name: 'Mohit Agarwal', email: 'mohit@example.com', phone: '+91 99300 44556', walletBalance: 200, rewardPoints: 90, membershipPlan: 'free', createdAt: '2026-07-22T14:30:00.000Z' },
      ];
    }
    renderCustomersView(wrap);
  };

  const renderCustomersView = (wrap) => {
    let q = (U.$('#cust-search-inp', wrap)?.value || '').toLowerCase();
    let list = usersList.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    );

    wrap.innerHTML = `
      <div class="tbl-wrap">
        <div class="tbl-tools" style="justify-content:space-between">
          <div class="input-group" style="flex:1;max-width:320px">
            ${icon('search', 16)}
            <input class="input" id="cust-search-inp" value="${esc(q)}" placeholder="Search customers by name, email, phone…">
          </div>
          <span class="badge badge-neutral">${list.length} registered customers</span>
        </div>
        <div class="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Wallet & Points</th>
                <th>Plan</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(u => `
                <tr>
                  <td>
                    <div style="display:flex;gap:10px;align-items:center">
                      ${avatar(u.name || 'User', 34)}
                      <div>
                        <b style="font-size:13.5px">${esc(u.name || 'Customer')}</b>
                        <div class="xsmall muted">${esc(u.email || '—')}</div>
                      </div>
                    </div>
                  </td>
                  <td>${esc(u.phone || '—')}</td>
                  <td><b>${fmtMoney(u.walletBalance || 0)}</b> <span class="xsmall muted">• ${u.rewardPoints || 0} pts</span></td>
                  <td><span class="badge ${u.membershipPlan === 'plus' ? 'badge-primary' : u.membershipPlan === 'pro' ? 'badge-warn' : 'badge-neutral'}">${esc(u.membershipPlan || 'free').toUpperCase()}</span></td>
                  <td><span class="small muted">${safeDate(u.createdAt)}</span></td>
                  <td><span class="badge ${u.disabled ? 'badge-danger' : 'badge-success'}">${u.disabled ? 'Disabled' : 'Active'}</span></td>
                  <td>
                    <div class="row-actions">
                      <button class="mini-btn blue" data-cust-act="view" data-id="${u.id}" title="View profile & booking history">${icon('eye', 14)}</button>
                      <button class="mini-btn ${u.disabled ? 'ok' : 'warn'}" data-cust-act="toggle" data-id="${u.id}" title="${u.disabled ? 'Activate account' : 'Deactivate account'}">${icon(u.disabled ? 'play' : 'pause', 14)}</button>
                    </div>
                  </td>
                </tr>
              `).join('') || `<tr><td colspan="7"><div class="tbl-empty">No customers found</div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const inp = U.$('#cust-search-inp', wrap);
    if (inp) inp.addEventListener('input', U.debounce(() => renderCustomersView(wrap), 250));

    if (!wrap.dataset.custWired) {
      wrap.dataset.custWired = '1';
      wrap.addEventListener('click', async e => {
        const btn = e.target.closest('[data-cust-act]');
        if (!btn) return;
        const act = btn.dataset.custAct;
        const id = Number(btn.dataset.id);
        const u = usersList.find(x => x.id === id);
        if (!u) return;

        if (act === 'view') {
          openCustomerModal(u);
        } else if (act === 'toggle') {
          const nextDisabled = !u.disabled;
          if (!confirm(`${nextDisabled ? 'Deactivate' : 'Activate'} user account for ${u.name}?`)) return;
          const r = await apiPatch(`/admin/users/${u.id}/status`, { disabled: nextDisabled, active: !nextDisabled });
          if (r && r.user) u.disabled = r.user.disabled;
          else u.disabled = nextDisabled;
          toast(`Account for ${u.name} ${nextDisabled ? 'deactivated' : 'activated'} ✅`, 'success');
          renderCustomersView(wrap);
        }
      });
    }
  };

  const openCustomerModal = async (u) => {
    let bookings = [];
    const res = await apiGet(`/admin/users/${u.id}`);
    if (res && res.bookings) bookings = res.bookings;
    else bookings = Store.state.bookings.filter(b => b.userId === u.id);

    openModal(modalShell(`Customer — ${esc(u.name)}`, `
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:18px">
        ${avatar(u.name, 48)}
        <div>
          <b style="font-size:16px">${esc(u.name)}</b>
          <div class="xsmall muted">${esc(u.email)} • ${esc(u.phone || 'No phone')}</div>
          <div style="margin-top:4px"><span class="badge ${u.membershipPlan === 'plus' ? 'badge-primary' : 'badge-neutral'}">${esc(u.membershipPlan || 'free').toUpperCase()} Plan</span></div>
        </div>
      </div>
      <div class="grid g2" style="grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px">
        <div class="card" style="padding:14px;background:var(--surface)">
          <div class="xsmall muted">Wallet Balance</div>
          <b style="font-size:18px">${fmtMoney(u.walletBalance || 0)}</b>
        </div>
        <div class="card" style="padding:14px;background:var(--surface)">
          <div class="xsmall muted">Reward Points</div>
          <b style="font-size:18px">${u.rewardPoints || 0} pts</b>
        </div>
      </div>
      <h4 style="font-size:14px;margin-bottom:8px">Booking History (${bookings.length})</h4>
      <div class="tbl-scroll" style="max-height:220px;overflow-y:auto;border:1px solid var(--line-2);border-radius:10px">
        <table>
          <thead><tr><th>ID</th><th>Service</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            ${bookings.map(b => `<tr><td><b>${b.id}</b></td><td>${esc(b.serviceName || b.serviceId)}</td><td>${safeDate(b.date)}</td><td><b>${fmtMoney(b.total)}</b></td><td>${renderStatusPill(b.status)}</td></tr>`).join('') || `<tr><td colspan="5"><div class="tbl-empty">No bookings on record</div></td></tr>`}
          </tbody>
        </table>
      </div>`,
      `<button class="btn btn-ghost" data-act="close-modal">Close</button>`));
  };

  /* ---------- 4. Professionals Management (Step 4) ---------- */
  let prosList = [];
  const loadPros = async () => {
    const wrap = U.$('#admin-pros-wrap');
    if (!wrap) return;
    const res = await apiGet('/admin/professionals');
    if (res && res.professionals) {
      prosList = res.professionals;
    } else {
      prosList = [
        { id: 1, name: 'Rahul Sharma', email: 'rahul@servehub.in', phone: '+91 98765 43210', services: ['s3', 's36'], city: 'Mumbai', experience: 8, rating: 4.9, bookingsCount: 1240, status: 'active', verified: true, bio: 'Certified HVAC & refrigeration technician.' },
        { id: 2, name: 'Priya Menon', email: 'priya@servehub.in', phone: '+91 98111 22334', services: ['s1', 's2'], city: 'Mumbai', experience: 6, rating: 4.8, bookingsCount: 980, status: 'active', verified: true, bio: 'Deep cleaning specialist with 6+ years experience.' },
        { id: 3, name: 'Arjun Patel', email: 'arjun@servehub.in', phone: '+91 98333 44556', services: ['s3'], city: 'Bengaluru', experience: 5, rating: 4.7, bookingsCount: 760, status: 'pending', verified: false, bio: 'Master electrician.' },
      ];
    }
    renderProsView(wrap);
  };

  const renderProsView = (wrap) => {
    const pending = prosList.filter(p => p.status === 'pending');
    let q = (U.$('#pro-search-inp', wrap)?.value || '').toLowerCase();
    let list = prosList.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.city || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q)
    );

    wrap.innerHTML = `
      ${pending.length ? `
        <div class="card" style="padding:18px;margin-bottom:24px;border-color:var(--warn-100);background:var(--warn-50)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <b>${icon('timer', 16)} Professional applications awaiting review (${pending.length})</b>
            <span class="badge badge-warn">Action needed</span>
          </div>
          ${pending.map(a => `
            <div class="list-row" style="border-color:var(--warn-100);padding:10px 0">
              ${avatar(a.name, 38)}
              <div style="flex:1;min-width:0">
                <b style="font-size:13.5px">${esc(a.name)}</b>
                <div class="xsmall muted">${esc(a.city || 'India')} • ${a.experience || 5} yrs exp • ${esc(a.phone || '—')}</div>
              </div>
              <div class="row-actions">
                <button class="btn btn-success btn-sm" data-pro-act="approve" data-id="${a.id}">${icon('check', 13)} Approve</button>
                <button class="btn btn-danger btn-sm" data-pro-act="reject" data-id="${a.id}">${icon('x', 13)} Reject</button>
                <button class="mini-btn blue" data-pro-act="view" data-id="${a.id}" title="Review application">${icon('eye', 14)}</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="tbl-wrap">
        <div class="tbl-tools" style="justify-content:space-between">
          <div class="input-group" style="flex:1;max-width:320px">
            ${icon('search', 16)}
            <input class="input" id="pro-search-inp" value="${esc(q)}" placeholder="Search professionals by name, city, phone…">
          </div>
          <span class="badge badge-neutral">${list.length} registered professionals</span>
        </div>

        <div class="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th>Professional</th>
                <th>City</th>
                <th>Experience</th>
                <th>Rating</th>
                <th>Jobs Done</th>
                <th>Verification</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(p => `
                <tr>
                  <td>
                    <div style="display:flex;gap:10px;align-items:center">
                      ${avatar(p.name, 34)}
                      <div>
                        <b style="font-size:13.5px">${esc(p.name)}</b>
                        <div class="xsmall muted">${esc(p.phone || p.email || '—')}</div>
                      </div>
                    </div>
                  </td>
                  <td>${esc(p.city || '—')}</td>
                  <td>${p.experience || 0} years</td>
                  <td><b>${p.rating ? p.rating + ' ★' : 'New'}</b></td>
                  <td>${p.bookingsCount ? p.bookingsCount.toLocaleString('en-IN') : 0}</td>
                  <td><span class="badge ${p.verified ? 'badge-success' : 'badge-neutral'}">${p.verified ? 'Verified ✓' : 'Unverified'}</span></td>
                  <td><span class="badge ${p.status === 'active' ? 'badge-success' : p.status === 'pending' ? 'badge-warn' : 'badge-danger'}">${esc(p.status || 'active').toUpperCase()}</span></td>
                  <td>
                    <div class="row-actions">
                      <button class="mini-btn blue" data-pro-act="view" data-id="${p.id}" title="View profile & jobs">${icon('eye', 14)}</button>
                      <button class="mini-btn ${p.status === 'active' ? 'warn' : 'ok'}" data-pro-act="toggle" data-id="${p.id}" title="${p.status === 'active' ? 'Suspend' : 'Activate'}">${icon(p.status === 'active' ? 'pause' : 'play', 14)}</button>
                    </div>
                  </td>
                </tr>
              `).join('') || `<tr><td colspan="8"><div class="tbl-empty">No professionals found</div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const inp = U.$('#pro-search-inp', wrap);
    if (inp) inp.addEventListener('input', U.debounce(() => renderProsView(wrap), 250));

    if (!wrap.dataset.prosWired) {
      wrap.dataset.prosWired = '1';
      wrap.addEventListener('click', async e => {
        const btn = e.target.closest('[data-pro-act]');
        if (!btn) return;
        const act = btn.dataset.proAct;
        const id = Number(btn.dataset.id);
        const p = prosList.find(x => x.id === id);
        if (!p) return;

        if (act === 'view') {
          openProModal(p);
        } else if (act === 'approve') {
          const r = await apiPatch(`/admin/professionals/${p.id}/approve`, { status: 'active' });
          if (r && r.professional) { p.status = 'active'; p.verified = true; }
          else { p.status = 'active'; p.verified = true; }
          toast(`Professional ${p.name} approved & activated 🎉`, 'success');
          renderProsView(wrap);
        } else if (act === 'reject') {
          if (!confirm(`Reject application for ${p.name}?`)) return;
          const r = await apiPatch(`/admin/professionals/${p.id}/approve`, { status: 'reject' });
          if (r && r.professional) { p.status = 'rejected'; p.verified = false; }
          else { p.status = 'rejected'; p.verified = false; }
          toast(`Professional ${p.name} rejected`, 'warn');
          renderProsView(wrap);
        } else if (act === 'toggle') {
          const next = p.status === 'active' ? 'suspended' : 'active';
          if (!confirm(`${next === 'active' ? 'Activate' : 'Suspend'} professional ${p.name}?`)) return;
          const r = await apiPatch(`/admin/professionals/${p.id}`, { status: next });
          if (r && r.professional) { p.status = next; p.verified = next === 'active'; }
          else { p.status = next; p.verified = next === 'active'; }
          toast(`Professional ${p.name} is now ${next} ✅`, 'success');
          renderProsView(wrap);
        }
      });
    }
  };

  const openProModal = async (p) => {
    let bookings = [];
    const res = await apiGet(`/admin/professionals/${p.id}`);
    if (res && res.bookings) bookings = res.bookings;
    else bookings = Store.state.bookings.filter(b => b.proId === p.id);

    openModal(modalShell(`Professional — ${esc(p.name)}`, `
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:18px">
        ${avatar(p.name, 48)}
        <div>
          <b style="font-size:16px">${esc(p.name)}</b>
          <div class="xsmall muted">${esc(p.email || 'No email')} • ${esc(p.phone || 'No phone')}</div>
          <div style="display:flex;gap:8px;margin-top:6px">
            <span class="badge ${p.status === 'active' ? 'badge-success' : 'badge-warn'}">${esc(p.status).toUpperCase()}</span>
            <span class="badge badge-neutral">${p.rating ? p.rating + ' ★' : 'Unrated'}</span>
            <span class="badge badge-neutral">${p.experience || 0} years exp</span>
          </div>
        </div>
      </div>
      <div class="card" style="padding:14px;background:var(--surface);margin-bottom:18px">
        <div class="xsmall muted" style="margin-bottom:4px">Bio / About</div>
        <p class="small" style="line-height:1.5">${esc(p.bio || 'Experienced home service professional verified on Servehub platform.')}</p>
        <div class="sum-row" style="margin-top:10px"><span class="muted">City & Area</span><b>${esc(p.city || 'Mumbai')} ${p.area ? '• ' + esc(p.area) : ''}</b></div>
        <div class="sum-row"><span class="muted">Total Jobs Completed</span><b>${p.bookingsCount || 0}</b></div>
      </div>
      <h4 style="font-size:14px;margin-bottom:8px">Assigned Bookings (${bookings.length})</h4>
      <div class="tbl-scroll" style="max-height:220px;overflow-y:auto;border:1px solid var(--line-2);border-radius:10px">
        <table>
          <thead><tr><th>ID</th><th>Service</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            ${bookings.map(b => `<tr><td><b>${b.id}</b></td><td>${esc(b.serviceName || b.serviceId)}</td><td>${safeDate(b.date)}</td><td><b>${fmtMoney(b.total)}</b></td><td>${renderStatusPill(b.status)}</td></tr>`).join('') || `<tr><td colspan="5"><div class="tbl-empty">No assigned bookings yet</div></td></tr>`}
          </tbody>
        </table>
      </div>`,
      `<button class="btn btn-ghost" data-act="close-modal">Close</button>`));
  };

  /* ---------- 5. Services Management (Step 6) ---------- */
  let svcsList = [];
  const loadServices = async () => {
    const wrap = U.$('#admin-svcs-wrap');
    if (!wrap) return;
    const res = await apiGet('/admin/services');
    if (res && res.services && res.services.length) {
      svcsList = res.services;
    } else {
      svcsList = DATA.services.map(s => ({
        id: s.id,
        name: s.name,
        category: DATA.catBySlug(s.cat)?.name || s.cat,
        priceFrom: s.price,
        duration: s.dur || '1 hr',
        rating: s.rating,
        bookingsCount: s.bookings || 0,
        image: s.img || '✨',
        active: true,
        description: s.desc || '',
      }));
    }
    renderServicesView(wrap);
  };

  const renderServicesView = (wrap) => {
    let q = (U.$('#svc-search-inp', wrap)?.value || '').toLowerCase();
    let cat = U.$('#svc-cat-filter', wrap)?.value || 'all';
    let list = svcsList.filter(s => {
      const matchQ = (s.name || '').toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q);
      const matchCat = cat === 'all' || (s.category || '').toLowerCase() === cat.toLowerCase();
      return matchQ && matchCat;
    });

    const categories = Array.from(new Set(svcsList.map(s => s.category).filter(Boolean)));

    wrap.innerHTML = `
      <div class="tbl-wrap">
        <div class="tbl-tools" style="gap:10px">
          <div class="input-group" style="flex:1;max-width:320px">
            ${icon('search', 16)}
            <input class="input" id="svc-search-inp" value="${esc(q)}" placeholder="Search services…">
          </div>
          <select class="select" id="svc-cat-filter" style="width:auto;min-width:160px">
            <option value="all">All Categories</option>
            ${categories.map(c => `<option value="${esc(c)}" ${cat.toLowerCase() === c.toLowerCase() ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm" id="svc-add-btn" style="margin-left:auto">${icon('plus', 13)} Add Service</button>
        </div>

        <div class="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Category</th>
                <th>Starting Price</th>
                <th>Duration</th>
                <th>Rating</th>
                <th>Bookings</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(s => `
                <tr>
                  <td><b style="font-size:13.5px">${esc(s.name)}</b><div class="xsmall muted">${s.id}</div></td>
                  <td>${esc(s.category)}</td>
                  <td><b>${fmtMoney(s.priceFrom || s.price)}</b></td>
                  <td>${esc(s.duration || '1 hr')}</td>
                  <td>${s.rating || 4.8} ★</td>
                  <td>${(s.bookingsCount || 0).toLocaleString('en-IN')}</td>
                  <td><span class="badge ${s.active === false ? 'badge-neutral' : 'badge-success'}">${s.active === false ? 'Inactive' : 'Active'}</span></td>
                  <td>
                    <div class="row-actions">
                      <button class="mini-btn blue" data-svc-act="edit" data-id="${s.id}" title="Edit service">${icon('edit', 14)}</button>
                      <button class="mini-btn ${s.active === false ? 'ok' : 'warn'}" data-svc-act="toggle" data-id="${s.id}" title="${s.active === false ? 'Activate' : 'Deactivate'}">${icon(s.active === false ? 'play' : 'pause', 14)}</button>
                      <button class="mini-btn no" data-svc-act="del" data-id="${s.id}" title="Delete service">${icon('trash', 14)}</button>
                    </div>
                  </td>
                </tr>
              `).join('') || `<tr><td colspan="8"><div class="tbl-empty">No services found</div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const inp = U.$('#svc-search-inp', wrap);
    if (inp) inp.addEventListener('input', U.debounce(() => renderServicesView(wrap), 250));
    const cSel = U.$('#svc-cat-filter', wrap);
    if (cSel) cSel.addEventListener('change', () => renderServicesView(wrap));
    const addBtn = U.$('#svc-add-btn', wrap);
    if (addBtn) addBtn.addEventListener('click', openAddServiceModal);

    if (!wrap.dataset.svcsWired) {
      wrap.dataset.svcsWired = '1';
      wrap.addEventListener('click', async e => {
        const btn = e.target.closest('[data-svc-act]');
        if (!btn) return;
        const act = btn.dataset.svcAct;
        const id = btn.dataset.id;
        const s = svcsList.find(x => x.id === id);
        if (!s) return;

        if (act === 'edit') {
          openEditServiceModal(s);
        } else if (act === 'toggle') {
          const nextActive = s.active === false;
          const r = await apiPatch(`/admin/services/${s.id}`, { active: nextActive });
          if (r && r.service) s.active = r.service.active;
          else s.active = nextActive;
          toast(`Service ${s.name} ${nextActive ? 'activated' : 'deactivated'} ✅`, 'success');
          renderServicesView(wrap);
        } else if (act === 'del') {
          if (!confirm(`Are you sure you want to deactivate service "${s.name}"?`)) return;
          await apiDelete(`/admin/services/${s.id}`);
          s.active = false;
          toast(`Service deactivated 🗑️`, 'info');
          renderServicesView(wrap);
        }
      });
    }
  };

  const openAddServiceModal = () => {
    const cats = DATA.categories || [];
    openModal(modalShell('Add New Service', `
      <div class="field"><label class="label">Service Name</label><input class="input" id="new-svc-name" placeholder="e.g. Sofa Sanitization & Deep Clean"></div>
      <div class="grid g2" style="grid-template-columns:1fr 1fr;gap:12px">
        <div class="field"><label class="label">Category</label>
          <select class="select" id="new-svc-cat">
            ${cats.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label class="label">Base Price (₹)</label><input class="input" id="new-svc-price" type="number" placeholder="599"></div>
      </div>
      <div class="grid g2" style="grid-template-columns:1fr 1fr;gap:12px">
        <div class="field"><label class="label">Duration</label><input class="input" id="new-svc-dur" placeholder="e.g. 1-2 hrs" value="1 hr"></div>
        <div class="field"><label class="label">Icon / Emoji</label><input class="input" id="new-svc-icon" placeholder="✨" value="✨"></div>
      </div>
      <div class="field"><label class="label">Description</label><textarea class="textarea" id="new-svc-desc" placeholder="Service details and overview…"></textarea></div>
      <div class="field"><label class="label">Included Items (comma-separated)</label><input class="input" id="new-svc-inc" placeholder="Dusting, Sanitization, Chemical Scrub"></div>`,
      `<button class="btn btn-ghost" data-act="close-modal">Cancel</button>
       <button class="btn btn-primary" id="new-svc-save">${icon('plus', 14)} Create Service</button>`));

    U.$('#new-svc-save')?.addEventListener('click', async () => {
      const name = (U.$('#new-svc-name')?.value || '').trim();
      const category = U.$('#new-svc-cat')?.value || 'Other';
      const priceFrom = Number(U.$('#new-svc-price')?.value || 0);
      const duration = (U.$('#new-svc-dur')?.value || '1 hr').trim();
      const image = (U.$('#new-svc-icon')?.value || '✨').trim();
      const description = (U.$('#new-svc-desc')?.value || '').trim();
      const incStr = U.$('#new-svc-inc')?.value || '';
      const included = incStr.split(',').map(x => x.trim()).filter(Boolean);

      if (!name) { toast('Please enter a service name', 'warn'); return; }
      if (!priceFrom || priceFrom <= 0) { toast('Please enter a valid price', 'warn'); return; }

      const body = { name, category, priceFrom, duration, image, description, included, active: true };
      const res = await apiPost('/admin/services', body);
      if (res && res.service) {
        svcsList.unshift(res.service);
        toast(`Service "${res.service.name}" created 🎉`, 'success');
      } else {
        const fake = { id: 's' + Date.now(), ...body, rating: 4.8, bookingsCount: 0 };
        svcsList.unshift(fake);
        toast(`Service "${name}" added (demo) 🎉`, 'success');
      }
      closeModal();
      loadServices();
    });
  };

  const openEditServiceModal = (s) => {
    const cats = DATA.categories || [];
    openModal(modalShell(`Edit Service — ${esc(s.name)}`, `
      <div class="field"><label class="label">Service Name</label><input class="input" id="edit-svc-name" value="${esc(s.name)}"></div>
      <div class="grid g2" style="grid-template-columns:1fr 1fr;gap:12px">
        <div class="field"><label class="label">Category</label>
          <select class="select" id="edit-svc-cat">
            ${cats.map(c => `<option value="${esc(c.name)}" ${s.category === c.name ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label class="label">Base Price (₹)</label><input class="input" id="edit-svc-price" type="number" value="${s.priceFrom || s.price}"></div>
      </div>
      <div class="grid g2" style="grid-template-columns:1fr 1fr;gap:12px">
        <div class="field"><label class="label">Duration</label><input class="input" id="edit-svc-dur" value="${esc(s.duration || '1 hr')}"></div>
        <div class="field"><label class="label">Status</label>
          <select class="select" id="edit-svc-active">
            <option value="true" ${s.active !== false ? 'selected' : ''}>Active</option>
            <option value="false" ${s.active === false ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
      </div>
      <div class="field"><label class="label">Description</label><textarea class="textarea" id="edit-svc-desc">${esc(s.description || '')}</textarea></div>`,
      `<button class="btn btn-ghost" data-act="close-modal">Cancel</button>
       <button class="btn btn-primary" id="edit-svc-save">${icon('check', 14)} Save Changes</button>`));

    U.$('#edit-svc-save')?.addEventListener('click', async () => {
      const patch = {
        name: (U.$('#edit-svc-name')?.value || '').trim(),
        category: U.$('#edit-svc-cat')?.value || s.category,
        priceFrom: Number(U.$('#edit-svc-price')?.value || 0),
        duration: (U.$('#edit-svc-dur')?.value || '1 hr').trim(),
        active: U.$('#edit-svc-active')?.value === 'true',
        description: (U.$('#edit-svc-desc')?.value || '').trim(),
      };
      const res = await apiPatch(`/admin/services/${s.id}`, patch);
      if (res && res.service) Object.assign(s, res.service);
      else Object.assign(s, patch);
      toast('Service updated ✅', 'success');
      closeModal();
      loadServices();
    });
  };

  /* ---------- 6. Payments & Refunds (Step 7) ---------- */
  const loadPayments = async () => {
    const wrap = U.$('#admin-payments-wrap');
    if (!wrap) return;
    const res = await apiGet('/admin/bookings');
    const bookings = (res && res.bookings) || Store.state.bookings || [];
    const totalRev = bookings.filter(b => b.paymentStatus === 'paid').reduce((a, b) => a + (b.total || 0), 0);
    const methods = [
      { name: 'UPI', count: bookings.filter(b => b.paymentMethod === 'upi').length },
      { name: 'Card', count: bookings.filter(b => b.paymentMethod === 'card').length },
      { name: 'Wallet', count: bookings.filter(b => b.paymentMethod === 'wallet').length },
      { name: 'Cash', count: bookings.filter(b => b.paymentMethod === 'cash').length },
    ];

    wrap.innerHTML = `
      <div class="stat-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">
        ${methods.map(m => `
          <div class="card stat-card">
            <div class="st-top"><span class="st-ic" style="background:linear-gradient(135deg,#2563EB,#0EA5E9)">${icon('card', 18)}</span><span class="st-lbl">${m.name}</span></div>
            <div class="st-val">${m.count}</div>
            <div class="st-delta up">Active transactions</div>
          </div>
        `).join('')}
      </div>
      <div class="tbl-wrap">
        <div class="tbl-tools"><span class="small muted">Total settled volume: <b>${fmtMoney(totalRev)}</b></span></div>
        <div class="tbl-scroll">
          <table>
            <thead><tr><th>Booking ID</th><th>Service</th><th>Customer</th><th>Method</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              ${bookings.slice(0, 15).map(b => `
                <tr>
                  <td><b>${b.id}</b></td>
                  <td>${esc(b.serviceName || b.serviceId)}</td>
                  <td>${esc(b.customerName || b.customer || 'Customer')}</td>
                  <td><span class="badge badge-neutral">${b.paymentMethod || 'wallet'}</span></td>
                  <td><b>${fmtMoney(b.total)}</b></td>
                  <td><span class="badge ${b.paymentStatus === 'paid' ? 'badge-success' : b.paymentStatus === 'refunded' ? 'badge-warn' : 'badge-neutral'}">${b.paymentStatus || 'pending'}</span></td>
                  <td>${safeDate(b.date)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  const loadRefunds = async () => {
    const wrap = U.$('#admin-refunds-wrap');
    if (!wrap) return;
    const res = await apiGet('/admin/bookings');
    const bookings = (res && res.bookings) || Store.state.bookings || [];
    const cancelled = bookings.filter(b => b.status === 'cancelled' || b.paymentStatus === 'refunded');

    wrap.innerHTML = `
      <div class="card" style="padding:18px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div><b style="font-size:14px">Refund Management</b><div class="small muted">Processed refunds are credited directly to the customer wallet.</div></div>
        <span class="badge badge-neutral">${cancelled.length} eligible/processed records</span>
      </div>
      <div class="tbl-wrap">
        <div class="tbl-scroll">
          <table>
            <thead><tr><th>Booking ID</th><th>Service</th><th>Customer</th><th>Amount</th><th>Refund Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${cancelled.map(b => `
                <tr>
                  <td><b>${b.id}</b></td>
                  <td>${esc(b.serviceName || b.serviceId)}</td>
                  <td>${esc(b.customerName || b.customer || 'Customer')}</td>
                  <td><b>${fmtMoney(b.total)}</b></td>
                  <td><span class="badge ${b.paymentStatus === 'refunded' ? 'badge-success' : 'badge-warn'}">${b.paymentStatus === 'refunded' ? 'Refunded' : 'Refund Pending'}</span></td>
                  <td>
                    ${b.paymentStatus !== 'refunded' ? `
                      <button class="btn btn-warn btn-sm" data-ref-act="refund" data-id="${b.id}">${icon('wallet', 13)} Process Refund</button>
                    ` : `<span class="small muted">Completed ✓</span>`}
                  </td>
                </tr>
              `).join('') || `<tr><td colspan="6"><div class="tbl-empty">No refund requests pending</div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;

    if (!wrap.dataset.refWired) {
      wrap.dataset.refWired = '1';
      wrap.addEventListener('click', async e => {
        const btn = e.target.closest('[data-ref-act]');
        if (!btn) return;
        const id = btn.dataset.id;
        const b = cancelled.find(x => x.id === id);
        if (!b) return;
        if (!confirm(`Process refund of ${fmtMoney(b.total)} to customer wallet for booking ${b.id}?`)) return;
        const res = await apiPost(`/admin/bookings/${b.id}/refund`, { amount: b.total });
        if (res && res.refunded) toast(`Refund of ${fmtMoney(b.total)} credited to wallet 💰`, 'success');
        else toast('Refund processed ✅', 'success');
        loadRefunds();
      });
    }
  };

  /* ---------- 7. Notifications Broadcast (Step 7) ---------- */
  const wireNotifications = () => {
    const btn = U.$('#bc-send-btn');
    if (!btn || btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', async () => {
      const audience = U.$('#bc-audience')?.value || 'all';
      const title = (U.$('#bc-title')?.value || '').trim();
      const body = (U.$('#bc-msg')?.value || '').trim();
      if (!title || !body) { toast('Please provide both title and message', 'warn'); return; }

      const res = await apiPost('/admin/broadcast', { title, body, audience });
      if (res && res.ok) {
        toast(`Broadcast delivered to ${res.count} users 📣`, 'success');
      } else {
        Store.addNotif('bell', title, body);
        toast('Broadcast notification sent (demo) 📣', 'success');
      }
      U.$('#bc-title').value = '';
      U.$('#bc-msg').value = '';
    });
  };

  /* ================= LIVE-MANAGED TABS (Coupons, Gift Cards, Plans, Tickets, Reviews) ================= */
  const MANAGED = ['coupons', 'giftcards', 'plans', 'tickets', 'reviews'];
  const mgrState = {};

  const mgrShell = name => `
    <div class="card" style="padding:8px">
      <div id="mgr-body" data-mgr="${name}" style="min-height:200px">
        <div class="center" style="padding:60px 0">${icon('refresh', 24)} <div class="small muted" style="margin-top:10px">Loading ${name}…</div></div>
      </div>
    </div>`;

  const srcBadge = (src, liveCount) => src === 'api'
    ? `<span class="badge badge-success" style="margin-right:8px">${icon('check', 12)} Live · ${liveCount}</span>`
    : `<span class="badge badge-neutral" style="margin-right:8px">${icon('zap', 12)} Demo data</span>`;

  const statusChip = (st, map = {}) => `<span class="badge ${map[st] || 'badge-neutral'}">${(st || '').replace(/-/g, ' ')}</span>`;

  const managedLoad = async name => {
    const body = U.$('#mgr-body');
    if (!body) return;
    const render = MANAGED_RENDER[name];
    const prev = mgrState[name];
    let src = 'demo';
    let items = prev && prev.src === 'demo' ? prev.items : demoItems(name);
    const live = await apiGet('/admin/' + name);
    if (live && (live.coupons || live.giftCards || live.plans || live.tickets || live.reviews)) {
      src = 'api';
      items = live.coupons || live.giftCards || live.plans || live.tickets || live.reviews || [];
    }
    mgrState[name] = { src, items };
    body.innerHTML = render(items, src);
    wireManagedActions(body, name);
  };

  const demoItems = name => {
    if (name === 'coupons') return DATA.coupons.map(c => ({ code: c.code, type: c.type === 'pct' ? 'percent' : 'flat', value: c.value, minAmount: c.min || 0, cap: c.cap || null, active: true, description: c.desc, validUntil: c.valid }));
    if (name === 'plans') return DATA.plans.map(p => ({ id: p.id, name: p.name, price: p.price, period: p.per, featured: !!p.featured, active: true, perks: p.perks }));
    if (name === 'tickets') return Store.state.tickets.map(t => ({ id: t.id, customerName: Store.currentUser()?.name || 'Customer', subject: t.subject, category: t.cat || 'other', status: t.status, priority: 'medium', messages: [{ from: 'customer', text: t.msg || '', createdAt: t.createdAt }] }));
    if (name === 'reviews') return DATA.reviews.map((r, i) => ({ id: i + 1, customerName: r.name, serviceName: 'Deep Cleaning', rating: r.rating, text: r.text, status: 'published', verified: r.v, helpful: r.helpful, createdAt: r.date }));
    return [];
  };

  const MANAGED_RENDER = {
    coupons(items, src) {
      return `
        <div class="tbl-wrap">
          <div class="tbl-tools" style="justify-content:space-between">
            <div>${srcBadge(src, items.length)}</div>
            <button class="btn btn-primary btn-sm" data-mgr-act="coupon-new">${icon('plus', 13)} New coupon</button>
          </div>
          <div class="tbl-scroll"><table><thead><tr><th>Code</th><th>Discount</th><th>Min. order</th><th>Description</th><th>Valid till</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${items.map(c => `<tr><td><b style="letter-spacing:.04em">${esc(c.code)}</b></td><td>${c.type === 'percent' ? `${c.value}% off${c.cap ? ' (max ' + money(c.cap) + ')' : ''}` : money(c.value)}</td><td>${money(c.minAmount || 0)}</td><td>${c.description || '—'}</td><td>${c.validUntil || '—'}</td><td><span class="badge ${c.active === false ? 'badge-neutral' : 'badge-success'}">${c.active === false ? 'Inactive' : 'Active'}</span></td><td><div class="row-actions"><button class="mini-btn blue" data-mgr-act="coupon-edit" data-code="${esc(c.code)}" title="Edit">${icon('edit', 14)}</button><button class="mini-btn ${c.active === false ? 'ok' : 'warn'}" data-mgr-act="coupon-toggle" data-code="${esc(c.code)}" title="${c.active === false ? 'Activate' : 'Deactivate'}">${icon(c.active === false ? 'play' : 'pause', 14)}</button><button class="mini-btn no" data-mgr-act="coupon-del" data-code="${esc(c.code)}" title="Delete">${icon('trash', 14)}</button></div></td></tr>`).join('') || `<tr><td colspan="7"><div class="tbl-empty">No coupons yet</div></td></tr>`}</tbody></table></div>
        </div>`;
    },
    giftcards(items, src) {
      return `
        <div class="tbl-wrap">
          <div class="tbl-tools" style="justify-content:space-between">
            <div>${srcBadge(src, items.length)}</div>
            <button class="btn btn-primary btn-sm" data-mgr-act="gift-new">${icon('plus', 13)} New gift card</button>
          </div>
          <div class="tbl-scroll"><table><thead><tr><th>Code</th><th>Value</th><th>Balance</th><th>Expires</th><th>Owner</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${items.map(g => `<tr><td><b style="letter-spacing:.04em">${esc(g.code)}</b></td><td>${money(g.value)}</td><td>${money(g.balance || 0)}</td><td>${g.expiresAt || '—'}</td><td>${g.ownerUserId ? 'Redeemed' : 'Unclaimed'}</td><td>${statusChip(g.status, { active: 'badge-success', redeemed: 'badge-primary', expired: 'badge-neutral' })}</td><td><div class="row-actions"><button class="mini-btn ${g.status === 'active' ? 'warn' : 'ok'}" data-mgr-act="gift-toggle" data-id="${g.id}" title="${g.status === 'active' ? 'Expire' : 'Re-activate'}">${icon(g.status === 'active' ? 'pause' : 'play', 14)}</button><button class="mini-btn no" data-mgr-act="gift-del" data-id="${g.id}" title="Delete">${icon('trash', 14)}</button></div></td></tr>`).join('') || `<tr><td colspan="7"><div class="tbl-empty">No gift cards yet</div></td></tr>`}</tbody></table></div>
        </div>`;
    },
    plans(items, src) {
      return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">${srcBadge(src, items.length)}</div>
      <div class="grid g3" style="grid-template-columns:repeat(3,1fr)">${items.map(p => `
        <div class="card plan-card ${p.featured ? 'featured' : ''}" style="min-height:240px">${p.featured ? '<span class="pl-ribbon">Flagship</span>' : ''}
          <b>${esc(p.name)}</b><div class="plan-price">${p.price === 0 ? 'Free' : money(p.price)}<small>/${p.per || 'month'}</small></div>
          <div class="small muted" style="flex:1">${(p.perks || []).length} perks • ${p.active === false ? 'Deactivated' : 'Active'}</div>
          <div style="display:flex;gap:8px"><button class="btn btn-outline btn-sm" style="flex:1" data-mgr-act="plan-edit" data-id="${esc(p.id)}">${icon('edit', 13)} Edit</button>
          <button class="btn btn-soft btn-sm ${p.active === false ? 'ok' : ''}" data-mgr-act="plan-toggle" data-id="${esc(p.id)}">${icon(p.active === false ? 'play' : 'pause', 13)} ${p.active === false ? 'Activate' : 'Pause'}</button></div>
        </div>`).join('') || '<div class="tbl-wrap"><div class="tbl-empty">No plans</div></div>'}</div>`;
    },
    tickets(items, src) {
      return `
        <div class="tbl-wrap">
          <div class="tbl-tools"><span class="small muted">${srcBadge(src, items.length)}</span></div>
          <div class="tbl-scroll"><table><thead><tr><th>Ticket</th><th>Customer</th><th>Subject</th><th>Category</th><th>Age</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${items.map(t => `<tr><td><b>${esc(t.id)}</b></td><td>${esc(t.customerName || 'Customer')}</td><td>${esc(t.subject)}</td><td>${esc(t.category || 'other')}</td><td>${timeAgo(t.createdAt)}</td><td>${statusChip(t.status, { open: 'badge-warn', 'in-progress': 'badge-primary', resolved: 'badge-success', closed: 'badge-neutral' })}</td><td><button class="mini-btn blue" data-mgr-act="ticket-view" data-id="${t.id}" title="Open thread">${icon('eye', 14)}</button></td></tr>`).join('') || `<tr><td colspan="7"><div class="tbl-empty">No support tickets</div></td></tr>`}</tbody></table></div>
        </div>`;
    },
    reviews(items, src) {
      return `
        <div class="tbl-wrap">
          <div class="tbl-tools" style="justify-content:space-between">
            <div>${srcBadge(src, items.length)}</div>
            <span class="badge badge-neutral">${items.filter(r => r.status === 'pending').length} pending moderation</span>
          </div>
          <div class="tbl-scroll"><table><thead><tr><th>Customer</th><th>Service</th><th>Rating</th><th>Review</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${items.map(r => `<tr><td><div style="display:flex;gap:8px;align-items:center">${avatar(r.customerName || 'Customer', 28)}<b>${esc(r.customerName || 'Customer')}</b></div></td><td>${esc(r.serviceName || '—')}</td><td>${stars(r.rating)}</td><td><span class="small muted" style="max-width:220px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.text || '')}</span></td><td>${statusChip(r.status, { published: 'badge-success', pending: 'badge-warn', hidden: 'badge-neutral' })}</td><td><div class="row-actions"><button class="mini-btn blue" data-mgr-act="review-view" data-id="${r.id}" title="View">${icon('eye', 14)}</button>${r.status !== 'published' ? `<button class="mini-btn ok" data-mgr-act="review-approve" data-id="${r.id}" title="Approve">${icon('check', 14)}</button>` : `<button class="mini-btn warn" data-mgr-act="review-hide" data-id="${r.id}" title="Hide">${icon('eyeOff', 14)}</button>`}<button class="mini-btn no" data-mgr-act="review-del" data-id="${r.id}" title="Remove">${icon('trash', 14)}</button></div></td></tr>`).join('') || `<tr><td colspan="6"><div class="tbl-empty">No reviews yet</div></td></tr>`}</tbody></table></div>
        </div>`;
    },
  };

  const wireManagedActions = (body, name) => {
    if (body.dataset.mgrWired) return;
    body.dataset.mgrWired = '1';
    body.addEventListener('click', async e => {
      const btn = e.target.closest('[data-mgr-act]');
      if (!btn) return;
      const act = btn.dataset.mgrAct;
      const reload = () => managedLoad(name);
      const st = mgrState[name] || { src: 'demo', items: [] };
      const items = st.items;

      if (act === 'coupon-new') {
        openModal(modalShell('New Coupon', `
          <div class="field"><label class="label">Code</label><input class="input" id="cp-code" placeholder="e.g. MONSOON25" style="text-transform:uppercase"></div>
          <div class="grid g2" style="grid-template-columns:1fr 1fr;gap:10px">
            <div class="field"><label class="label">Type</label><select class="select" id="cp-type"><option value="percent">Percent</option><option value="flat">Flat ₹</option></select></div>
            <div class="field"><label class="label">Value</label><input class="input" id="cp-value" type="number" placeholder="20"></div>
          </div>
          <div class="grid g2" style="grid-template-columns:1fr 1fr;gap:10px">
            <div class="field"><label class="label">Min. order (₹)</label><input class="input" id="cp-min" type="number" value="0"></div>
            <div class="field"><label class="label">Max discount (₹)</label><input class="input" id="cp-cap" type="number" placeholder="optional"></div>
          </div>
          <div class="field"><label class="label">Valid until</label><input class="input" id="cp-valid" type="date"></div>
          <div class="field"><label class="label">Description</label><input class="input" id="cp-desc" placeholder="e.g. 20% off monsoon specials"></div>`,
          `<button class="btn btn-ghost" data-act="close-modal">Cancel</button><button class="btn btn-primary" id="cp-save">${icon('check', 14)} Create coupon</button>`));
        U.$('#cp-save').addEventListener('click', async () => {
          const body2 = { code: U.$('#cp-code').value.trim(), type: U.$('#cp-type').value, value: Number(U.$('#cp-value').value || 0), minAmount: Number(U.$('#cp-min').value || 0), cap: U.$('#cp-cap').value ? Number(U.$('#cp-cap').value) : null, validUntil: U.$('#cp-valid').value, description: U.$('#cp-desc').value };
          if (!body2.code) { toast('Coupon code is required', 'warn'); return; }
          const r = await apiPost('/admin/coupons', body2);
          if (r && r.coupon) { toast('Coupon ' + r.coupon.code + ' created 🎟️', 'success'); closeModal(); reload(); }
          else { items.unshift({ ...body2, active: true }); toast('Coupon created (demo)', 'success'); closeModal(); reload(); }
        });
      }
      if (act === 'coupon-edit') {
        const c = items.find(x => String(x.code) === String(btn.dataset.code));
        if (!c) return;
        openModal(modalShell('Edit Coupon — ' + esc(c.code), `
          <div class="sum-row"><span class="muted">Discount</span><b>${c.type === 'percent' ? c.value + '% off' : money(c.value)}</b></div>
          <div class="sum-row"><span class="muted">Min. order</span><b>${money(c.minAmount || 0)}</b></div>
          <div class="field" style="margin-top:12px"><label class="label">Status</label><select class="select" id="cp-st"><option value="true" ${c.active !== false ? 'selected' : ''}>Active</option><option value="false" ${c.active === false ? 'selected' : ''}>Inactive</option></select></div>`,
          `<button class="btn btn-ghost" data-act="close-modal">Cancel</button><button class="btn btn-primary" id="cp-save">${icon('check', 14)} Save</button>`));
        U.$('#cp-save').addEventListener('click', async () => {
          const active = U.$('#cp-st').value === 'true';
          const r = await apiPatch('/admin/coupons/' + encodeURIComponent(c.code), { active });
          if (r && r.coupon) toast('Coupon updated ✅', 'success'); else { c.active = active; toast('Coupon updated (demo) ✅', 'success'); }
          closeModal(); reload();
        });
      }
      if (act === 'coupon-toggle') {
        const c = items.find(x => String(x.code) === String(btn.dataset.code));
        if (!c) return;
        const next = c.active === false;
        const r = await apiPatch('/admin/coupons/' + encodeURIComponent(c.code), { active: next });
        if (!r || !r.coupon) c.active = next;
        toast('Coupon ' + c.code + (next ? ' activated' : ' deactivated') + ' ✅'); reload();
      }
      if (act === 'coupon-del') {
        if (!confirm('Delete coupon ' + btn.dataset.code + '?')) return;
        await apiDelete('/admin/coupons/' + encodeURIComponent(btn.dataset.code));
        toast('Coupon deleted 🗑️'); reload();
      }
      if (act === 'gift-new') {
        openModal(modalShell('New Gift Card', `<div class="field"><label class="label">Value (₹)</label><div class="radio-pill">${[250, 500, 1000, 2000].map(a => `<label><input type="radio" name="gv" value="${a}" ${a === 500 ? 'checked' : ''}><span>${money(a)}</span></label>`).join('')}</div></div><div class="field"><label class="label">Expires</label><input class="input" id="gc-exp" type="date"></div>`, `<button class="btn btn-ghost" data-act="close-modal">Cancel</button><button class="btn btn-primary" id="gc-save">${icon('gift', 14)} Create</button>`));
        U.$('#gc-save').addEventListener('click', async () => {
          const value = Number(U.$('input[name="gv"]:checked')?.value || 500);
          const expiresAt = U.$('#gc-exp').value || '';
          const r = await apiPost('/admin/giftcards', { value, expiresAt });
          if (r && r.giftCard) { toast('Gift card ' + r.giftCard.code + ' created 🎁', 'success'); }
          else { items.unshift({ id: 'new' + Date.now(), code: 'GIFT' + Math.floor(1000 + Math.random() * 9000), value, balance: value, expiresAt, status: 'active' }); toast('Gift card created (demo) 🎁', 'success'); }
          closeModal(); reload();
        });
      }
      if (act === 'gift-toggle') {
        const g = items.find(x => String(x.id) === String(btn.dataset.id));
        if (!g) return;
        const next = g.status === 'active' ? 'expired' : 'active';
        const r = await apiPatch('/admin/giftcards/' + g.id, { status: next });
        if (!r || !r.giftCard) g.status = next;
        toast('Gift card ' + g.code + ' → ' + next + ' ✅'); reload();
      }
      if (act === 'gift-del') {
        if (!confirm('Delete gift card?')) return;
        await apiDelete('/admin/giftcards/' + btn.dataset.id);
        toast('Gift card deleted 🗑️'); reload();
      }
      if (act === 'plan-edit') {
        const p = items.find(x => String(x.id) === String(btn.dataset.id));
        if (!p) return;
        openModal(modalShell('Edit Plan — ' + esc(p.name), `
          <div class="field"><label class="label">Monthly price (₹)</label><input class="input" id="pl-price" type="number" value="${p.price}"></div>
          <label style="display:flex;gap:8px;align-items:center;font-size:13px;font-weight:600;margin:10px 0"><input type="checkbox" id="pl-feat" ${p.featured ? 'checked' : ''}> Featured / flagship</label>
          <div class="field"><label class="label">Perks (one per line)</label><textarea class="textarea" id="pl-perks" rows="4">${esc((p.perks || []).join('\n'))}</textarea></div>`,
          `<button class="btn btn-ghost" data-act="close-modal">Cancel</button><button class="btn btn-primary" id="pl-save">${icon('check', 14)} Save plan</button>`));
        U.$('#pl-save').addEventListener('click', async () => {
          const patch = { price: Number(U.$('#pl-price').value || 0), featured: U.$('#pl-feat').checked, perks: U.$('#pl-perks').value.split('\n').map(s => s.trim()).filter(Boolean) };
          const r = await apiPatch('/admin/plans/' + encodeURIComponent(p.id), patch);
          if (r && r.plan) toast('Plan updated ✅', 'success'); else { Object.assign(p, patch); toast('Plan updated (demo) ✅', 'success'); }
          closeModal(); reload();
        });
      }
      if (act === 'plan-toggle') {
        const p = items.find(x => String(x.id) === String(btn.dataset.id));
        if (!p) return;
        const next = p.active === false;
        const r = await apiPatch('/admin/plans/' + encodeURIComponent(p.id), { active: next });
        if (!r || !r.plan) p.active = next;
        toast(p.name + (next ? ' activated' : ' paused') + ' ✅'); reload();
      }
      if (act === 'ticket-view') {
        const t = items.find(x => String(x.id) === String(btn.dataset.id));
        if (!t) return;
        const msgs = (t.messages || []).map(m => `<div class="msg ${m.from === 'admin' ? 'me' : 'them'}" style="align-self:${m.from === 'admin' ? 'flex-end' : 'flex-start'}">${esc(m.text)}<span class="m-time">${timeAgo(m.createdAt)}</span></div>`).join('') || '<div class="small muted center">No messages yet</div>';
        openModal(modalShell('Ticket ' + t.id + ' — ' + esc(t.subject), `
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><span class="badge badge-neutral">${esc(t.customerName || 'Customer')}</span><span class="badge badge-neutral">${esc(t.category || 'other')}</span>${statusChip(t.status, { open: 'badge-warn', 'in-progress': 'badge-primary', resolved: 'badge-success', closed: 'badge-neutral' })}</div>
          <div class="chat-body" style="max-height:220px;border:1px solid var(--line);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:8px;overflow-y:auto">${msgs}</div>
          <div class="chat-input-row" style="padding:12px 0 0"><input class="input" id="tk-reply" placeholder="Type a reply…"><button class="btn btn-primary" id="tk-send">${icon('send', 0)}</button></div>
          <div style="display:flex;gap:8px;margin-top:14px"><button class="btn btn-success btn-sm" style="flex:1" id="tk-resolve">${icon('check', 13)} Mark resolved</button><button class="btn btn-outline btn-sm" style="flex:1" data-act="close-modal">Close</button></div>`));
        const send = async () => {
          const text = (U.$('#tk-reply')?.value || '').trim();
          if (!text) return;
          const r = await apiPost('/admin/tickets/' + t.id + '/reply', { text });
          if (r && r.ticket) { toast('Reply sent ✅', 'success'); } else { t.messages = t.messages || []; t.messages.push({ from: 'admin', text, createdAt: Date.now() }); t.status = 'in-progress'; toast('Reply sent (demo) ✅', 'success'); }
          closeModal(); reload();
        };
        U.$('#tk-send').addEventListener('click', send);
        U.$('#tk-reply').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
        U.$('#tk-resolve').addEventListener('click', async () => {
          const r = await apiPatch('/admin/tickets/' + t.id, { status: 'resolved' });
          if (r && r.ticket) toast('Ticket resolved 🎉', 'success'); else { t.status = 'resolved'; toast('Ticket resolved (demo) 🎉', 'success'); }
          closeModal(); reload();
        });
      }
      if (act === 'review-view') {
        const r = items.find(x => String(x.id) === String(btn.dataset.id));
        if (!r) return;
        openModal(modalShell('Review by ' + esc(r.customerName || 'Customer'), `
          <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">${avatar(r.customerName || 'Customer', 40)}<div><b style="font-size:14px">${esc(r.customerName || 'Customer')}</b><div style="margin-top:2px">${stars(r.rating)}</div></div><span class="badge badge-neutral" style="margin-left:auto">${esc(r.serviceName || '—')}</span></div>
          <p class="small" style="line-height:1.65">${esc(r.text || 'No text')}</p>`,
          `<button class="btn btn-ghost" data-act="close-modal">Close</button>${r.status !== 'published' ? `<button class="btn btn-success" data-mgr-act="review-approve" data-id="${r.id}" data-inmodal="1">${icon('check', 13)} Approve</button>` : ''}`));
        const appBtn = U.$('[data-mgr-act="review-approve"][data-inmodal]');
        if (appBtn) appBtn.addEventListener('click', async () => {
          const rr = await apiPatch('/admin/reviews/' + r.id, { status: 'published' });
          if (rr && rr.review) toast('Review approved ✅', 'success'); else { r.status = 'published'; toast('Review approved (demo) ✅', 'success'); }
          closeModal(); reload();
        });
      }
      if (act === 'review-approve') {
        const r = items.find(x => String(x.id) === String(btn.dataset.id));
        if (!r) return;
        const rr = await apiPatch('/admin/reviews/' + r.id, { status: 'published' });
        if (rr && rr.review) toast('Review approved ✅', 'success'); else { r.status = 'published'; toast('Review approved (demo) ✅', 'success'); }
        reload();
      }
      if (act === 'review-hide') {
        const r = items.find(x => String(x.id) === String(btn.dataset.id));
        if (!r) return;
        const rr = await apiPatch('/admin/reviews/' + r.id, { status: 'hidden' });
        if (rr && rr.review) toast('Review hidden 👁️‍🗨️', 'success'); else { r.status = 'hidden'; toast('Review hidden (demo) 👁️‍🗨️', 'success'); }
        reload();
      }
      if (act === 'review-del') {
        const r = items.find(x => String(x.id) === String(btn.dataset.id));
        if (!r) return;
        if (!confirm('Permanently remove this review?')) return;
        await apiDelete('/admin/reviews/' + r.id);
        toast('Review removed 🗑️'); reload();
      }
    });
  };

  /* ================= RENDER & ROUTING ================= */
  const render = (params) => {
    const tab = (params && params.tab) || 'bookings';
    if (!Store.isLoggedIn() || Store.currentUser()?.role !== 'admin') {
      location.hash = '#/admin-login';
      return { html: '', wire: null };
    }
    if (!tabs[tab]) return { html: layout('bookings', tabs.bookings()), wire: () => loadBookings() };
    const html = layout(tab, tabs[tab]());
    const wire = () => {
      U.observeReveals();
      setTimeout(animateBars, 120);
      if (tab === 'overview') loadOverview();
      else if (tab === 'bookings') loadBookings();
      else if (tab === 'customers') loadCustomers();
      else if (tab === 'professionals') loadPros();
      else if (tab === 'services') loadServices();
      else if (tab === 'payments') loadPayments();
      else if (tab === 'refunds') loadRefunds();
      else if (tab === 'notifications') wireNotifications();
      else if (tab === 'monitor') startMonitor();
      else if (MANAGED.includes(tab)) managedLoad(tab);
    };
    return { html, wire };
  };

  let monIv = null;
  const startMonitor = () => {
    clearInterval(monIv);
    monIv = setInterval(() => {
      U.$$('[data-live]').forEach(card => {
        const b = Store.bookingById(card.dataset.live);
        if (!b) return;
        const pill = U.$('[data-live-pill]', card);
        if (pill) pill.innerHTML = renderStatusPill(b.status);
      });
      const cnt = U.$('#live-count');
      if (cnt) cnt.textContent = Store.state.bookings.filter(x => !['cancelled', 'paid', 'rated'].includes(x.status)).length;
    }, 4000);
  };

  return { render, clearMonitor: () => clearInterval(monIv) };
})();
