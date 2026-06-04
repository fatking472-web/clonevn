/** Auth Module - Cổng Dịch vụ công Quốc gia */
const Auth = {
  TOKEN_KEY: 'cdvc_token', USER_KEY: 'cdvc_user',
  saveSession(token, user) { localStorage.setItem(this.TOKEN_KEY, token); localStorage.setItem(this.USER_KEY, JSON.stringify(user)); },
  clearSession() { localStorage.removeItem(this.TOKEN_KEY); localStorage.removeItem(this.USER_KEY); },
  getToken() { return localStorage.getItem(this.TOKEN_KEY); },
  getUser() { const s = localStorage.getItem(this.USER_KEY); return s ? JSON.parse(s) : null; },
  isLoggedIn() { return !!this.getToken(); },
  async request(url, method='GET', data=null) {
    const opts = { method, headers: {'Content-Type':'application/json'}, credentials:'include' };
    if (this.getToken()) opts.headers['Authorization'] = 'Bearer ' + this.getToken();
    if (data) opts.body = JSON.stringify(data);
    const r = await fetch(url, opts);
    return { ok: r.ok, data: await r.json() };
  },
  async login(cccd, password) {
    const {ok, data} = await this.request('/api/auth/login','POST',{cccd,password});
    if (ok && data.success) { this.saveSession(data.token, data.user); return {success:true,user:data.user}; }
    return {success:false,message:data.message};
  },
  async register(fd) {
    const {ok, data} = await this.request('/api/auth/register','POST',fd);
    if (ok && data.success) { this.saveSession(data.token, data.user); return {success:true,user:data.user}; }
    return {success:false,message:data.message};
  },
  async logout() {
    await this.request('/api/auth/logout','POST');
    this.clearSession();
    AuthUI.updateHeader();
    AuthUI.showToast('Đã đăng xuất thành công.','success');
  }
};

const AuthUI = {
  showToast(msg, type='info') {
    const old = document.getElementById('auth-toast'); if(old) old.remove();
    const colors = {success:'#27ae60',error:'#c0392b',info:'#2980b9',warning:'#e67e22'};
    const icons = {success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};
    const t = document.createElement('div');
    t.id = 'auth-toast';
    t.innerHTML = `<span style="margin-right:8px">${icons[type]}</span>${msg}`;
    t.style.cssText = `position:fixed;top:20px;right:20px;background:white;padding:14px 20px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.15);z-index:999999;font-size:14px;font-family:inherit;border-left:4px solid ${colors[type]};max-width:360px;display:flex;align-items:center;animation:slideInR .3s ease`;
    if (!document.getElementById('_auth_anim')) {
      const s = document.createElement('style'); s.id='_auth_anim';
      s.textContent='@keyframes slideInR{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}';
      document.head.appendChild(s);
    }
    document.body.appendChild(t);
    setTimeout(()=>{ if(t.parentNode) t.remove(); }, 3500);
  },
  openLoginModal() {
    document.getElementById('_auth_overlay').style.display='flex';
    document.getElementById('_modal_login').style.display='block';
    document.getElementById('_modal_register').style.display='none';
    document.body.style.overflow='hidden';
  },
  openRegisterModal() {
    document.getElementById('_auth_overlay').style.display='flex';
    document.getElementById('_modal_login').style.display='none';
    document.getElementById('_modal_register').style.display='block';
    document.body.style.overflow='hidden';
  },
  closeModal() {
    document.getElementById('_auth_overlay').style.display='none';
    document.body.style.overflow='';
    document.getElementById('_form_login').reset();
    document.getElementById('_form_register').reset();
    document.querySelectorAll('._auth_err').forEach(e=>e.textContent='');
  },
  updateHeader() {
    const btnLogin = document.getElementById('_btn_login');
    const btnReg = document.getElementById('_btn_register');
    const userInfo = document.getElementById('_user_info');
    const userName = document.getElementById('_username');
    const btnAdmin = document.getElementById('_btn_admin');
    // Các nút Đăng nhập/Đăng ký gốc trong HTML trang chủ
    const nativeBtnLogins = document.querySelectorAll('.btn-login, .btn-white[href="/login"], a[href="/login"]');
    const nativeBtnRegs = document.querySelectorAll('.btn-register');
    if (Auth.isLoggedIn()) {
      const u = Auth.getUser();
      if(btnLogin) btnLogin.style.display='none';
      if(btnReg) btnReg.style.display='none';
      if(userInfo) userInfo.style.display='flex';
      if(userName) userName.textContent = u.full_name || u.cccd;
      if(btnAdmin) btnAdmin.style.display = u.role==='admin' ? 'inline-flex' : 'none';
      // Ẩn nút Đăng nhập/Đăng ký gốc trong HTML
      nativeBtnLogins.forEach(el => el.style.display='none');
      nativeBtnRegs.forEach(el => el.style.display='none');
    } else {
      if(btnLogin) btnLogin.style.display='';
      if(btnReg) btnReg.style.display='';
      if(userInfo) userInfo.style.display='none';
      // Hiện lại nút gốc khi chưa đăng nhập
      nativeBtnLogins.forEach(el => el.style.display='');
      nativeBtnRegs.forEach(el => el.style.display='');
    }
  },
  async handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('_login_btn');
    const err = document.getElementById('_login_err');
    btn.disabled=true; btn.textContent='Đang đăng nhập...'; err.textContent='';
    const result = await Auth.login(document.getElementById('_login_cccd').value, document.getElementById('_login_pass').value);
    if (result.success) {
      this.closeModal(); this.updateHeader();
      this.showToast('Chào mừng '+result.user.full_name+'!','success');
      if (result.user.role==='admin') setTimeout(()=>this.showToast('Bạn có quyền quản trị. <a href="/admin" style="color:#27ae60">Vào Admin</a>','info'), 1000);
    } else { err.textContent = result.message; }
    btn.disabled=false; btn.textContent='Đăng nhập';
  },
  async handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('_reg_btn');
    const err = document.getElementById('_reg_err');
    btn.disabled=true; btn.textContent='Đang đăng ký...'; err.textContent='';
    const result = await Auth.register({
      full_name: document.getElementById('_reg_name').value,
      cccd: document.getElementById('_reg_cccd').value,
      phone: document.getElementById('_reg_phone').value,
      password: document.getElementById('_reg_pass').value,
      confirm_password: document.getElementById('_reg_cpass').value
    });
    if (result.success) { this.closeModal(); this.updateHeader(); this.showToast('Đăng ký thành công! Chào mừng bạn.','success'); }
    else { err.textContent = result.message; }
    btn.disabled=false; btn.textContent='Đăng ký tài khoản';
  },
  injectStyles() {
    const s = document.createElement('style');
    s.textContent = `
    #_auth_overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:99998;align-items:center;justify-content:center;backdrop-filter:blur(5px)}
    ._auth_box{background:#fff;border-radius:10px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;animation:authIn .3s ease;overflow:hidden}
    @keyframes authIn{from{transform:translateY(-24px) scale(0.95);opacity:0}to{transform:none;opacity:1}}
    ._auth_box_header{background:linear-gradient(135deg,#8e1a0e,#c0392b);padding:22px 28px;color:white;display:flex;align-items:center;gap:12px}
    ._auth_box_header img{height:44px;border-radius:4px;background:white;padding:3px}
    ._auth_box_header h2{font-size:17px;font-weight:700;line-height:1.3}
    ._auth_box_header p{font-size:12px;opacity:0.8;margin-top:2px}
    ._auth_box_body{padding:24px 28px}
    ._auth_close{position:absolute;top:12px;right:14px;font-size:20px;cursor:pointer;color:rgba(255,255,255,0.7);background:none;border:none;line-height:1}
    ._auth_close:hover{color:white}
    ._fg{margin-bottom:14px}
    ._fg label{display:block;font-size:12px;font-weight:700;color:#444;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.3px}
    ._fg input{width:100%;height:42px;border:1.5px solid #ddd;border-radius:6px;padding:0 12px;font-size:14px;font-family:inherit;outline:none;transition:all .2s;background:#fafafa}
    ._fg input:focus{border-color:#c0392b;box-shadow:0 0 0 3px rgba(192,57,43,.1);background:#fff}
    ._auth_submit{width:100%;height:44px;background:linear-gradient(135deg,#8e1a0e,#c0392b);color:white;border:none;border-radius:7px;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;margin-top:6px;transition:all .2s;letter-spacing:0.3px}
    ._auth_submit:hover:not(:disabled){opacity:.92;transform:translateY(-1px);box-shadow:0 4px 16px rgba(192,57,43,.3)}
    ._auth_submit:disabled{opacity:.6;cursor:not-allowed}
    ._auth_err{color:#c0392b;font-size:13px;min-height:18px;margin-top:10px;text-align:center}
    ._auth_switch{text-align:center;margin-top:16px;font-size:13px;color:#777;padding-bottom:4px}
    ._auth_switch a{color:#c0392b;cursor:pointer;font-weight:600;text-decoration:none}
    ._auth_switch a:hover{text-decoration:underline}
    ._fg .hint{font-size:11px;color:#aaa;margin-top:4px}
    /* Header buttons - trang nghiêm */
    #_auth_header_wrap{position:fixed;top:10px;right:14px;z-index:9999;display:flex;align-items:center;gap:8px}
    #_btn_login{padding:7px 18px;border-radius:5px;font-size:13px;font-weight:700;cursor:pointer;border:2px solid #8e1a0e;background:transparent;color:#8e1a0e;font-family:inherit;transition:all .2s;letter-spacing:0.2px}
    #_btn_login:hover{background:#8e1a0e;color:white}
    #_btn_register{padding:7px 18px;border-radius:5px;font-size:13px;font-weight:700;cursor:pointer;border:2px solid #8e1a0e;background:#8e1a0e;color:white;font-family:inherit;transition:all .2s;letter-spacing:0.2px}
    #_btn_register:hover{background:#c0392b;border-color:#c0392b}
    #_btn_admin{padding:7px 16px;border-radius:5px;font-size:13px;font-weight:700;cursor:pointer;border:2px solid #27ae60;background:#27ae60;color:white;font-family:inherit;transition:all .2s;display:none;align-items:center;gap:5px}
    #_btn_admin:hover{background:#229954}
    #_user_info{display:none;align-items:center;gap:10px;background:rgba(255,255,255,0.95);border:1.5px solid #ddd;padding:5px 14px;border-radius:6px;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
    #_username{font-weight:700;color:#8e1a0e;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #_btn_logout{background:none;border:none;color:#999;font-size:13px;cursor:pointer;font-family:inherit;padding:0}
    #_btn_logout:hover{color:#c0392b}
    ._divider{height:1px;background:#f0f0f0;margin:6px 0}
    `;
    document.head.appendChild(s);
  },
  injectModal() {
    const el = document.createElement('div');
    el.id = '_auth_overlay';
    el.innerHTML = `
    <!-- LOGIN -->
    <div class="_auth_box" id="_modal_login">
      <button class="_auth_close" onclick="AuthUI.closeModal()">✕</button>
      <div class="_auth_box_header">
        <img src="/favicon.ico" onerror="this.style.display='none'">
        <div><h2>ĐĂNG NHẬP HỆ THỐNG</h2><p>Cổng Dịch vụ công Quốc gia</p></div>
      </div>
      <div class="_auth_box_body">
        <form id="_form_login">
          <div class="_fg">
            <label>Số CCCD / CMND</label>
            <input id="_login_cccd" type="text" placeholder="Nhập số CCCD 9 hoặc 12 chữ số" maxlength="12" required>
            <div class="hint">Số Căn cước công dân hoặc Chứng minh nhân dân</div>
          </div>
          <div class="_fg">
            <label>Mật khẩu</label>
            <input id="_login_pass" type="password" placeholder="Nhập mật khẩu" required autocomplete="current-password">
          </div>
          <div class="_auth_err _auth_err" id="_login_err"></div>
          <button type="submit" class="_auth_submit" id="_login_btn">ĐĂNG NHẬP</button>
        </form>
        <div class="_auth_switch">Chưa có tài khoản? <a onclick="AuthUI.openRegisterModal()">Đăng ký ngay</a></div>
      </div>
    </div>
    <!-- REGISTER -->
    <div class="_auth_box" id="_modal_register" style="display:none;max-height:92vh;overflow-y:auto">
      <button class="_auth_close" onclick="AuthUI.closeModal()">✕</button>
      <div class="_auth_box_header">
        <img src="/favicon.ico" onerror="this.style.display='none'">
        <div><h2>ĐĂNG KÝ TÀI KHOẢN</h2><p>Cổng Dịch vụ công Quốc gia</p></div>
      </div>
      <div class="_auth_box_body">
        <form id="_form_register">
          <div class="_fg">
            <label>Họ và tên <span style="color:#c0392b">*</span></label>
            <input id="_reg_name" type="text" placeholder="NGUYỄN VĂN A" required>
          </div>
          <div class="_fg">
            <label>Số CCCD / CMND <span style="color:#c0392b">*</span></label>
            <input id="_reg_cccd" type="text" placeholder="Số Căn cước công dân (9 hoặc 12 chữ số)" maxlength="12" required>
            <div class="hint">Dùng để đăng nhập hệ thống</div>
          </div>
          <div class="_fg">
            <label>Số điện thoại</label>
            <input id="_reg_phone" type="tel" placeholder="0912 345 678">
          </div>
          <div class="_divider"></div>
          <div class="_fg">
            <label>Mật khẩu <span style="color:#c0392b">*</span></label>
            <input id="_reg_pass" type="password" placeholder="Ít nhất 6 ký tự" required autocomplete="new-password">
          </div>
          <div class="_fg">
            <label>Xác nhận mật khẩu <span style="color:#c0392b">*</span></label>
            <input id="_reg_cpass" type="password" placeholder="Nhập lại mật khẩu" required autocomplete="new-password">
          </div>
          <div class="_auth_err" id="_reg_err"></div>
          <button type="submit" class="_auth_submit" id="_reg_btn">ĐĂNG KÝ TÀI KHOẢN</button>
        </form>
        <div class="_auth_switch">Đã có tài khoản? <a onclick="AuthUI.openLoginModal()">Đăng nhập</a></div>
      </div>
    </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', e => { if(e.target===el) this.closeModal(); });
  },
  injectHeaderButtons() {
    const wrap = document.createElement('div');
    wrap.id = '_auth_header_wrap';
    wrap.innerHTML = `
      <a href="/admin" id="_btn_admin">🛡️ Quản trị</a>
      <button id="_btn_login" onclick="AuthUI.openLoginModal()">🔐 Đăng nhập</button>
      <button id="_btn_register" onclick="AuthUI.openRegisterModal()">📝 Đăng ký</button>
      <div id="_user_info">
        <span>👤</span>
        <span id="_username"></span>
        <button id="_btn_logout" onclick="Auth.logout()">✕</button>
      </div>`;
    document.body.appendChild(wrap);
  },
  bindEvents() {
    document.addEventListener('submit', e => {
      if(e.target.id==='_form_login') this.handleLogin(e);
      if(e.target.id==='_form_register') this.handleRegister(e);
    });
    document.addEventListener('keydown', e => { if(e.key==='Escape') this.closeModal(); });
  },
  init() {
    this.injectStyles();
    this.injectModal();
    this.injectHeaderButtons();
    this.bindEvents();
    this.updateHeader();
  }
};

if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>AuthUI.init());
else AuthUI.init();
