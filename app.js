/**
 * MESA Şantiye Elektrik Testi Ön Şart Takip Sistemi
 * Frontend Application Engine
 */

class SantiyeApp {
  constructor() {
    this.data = null;
    this.currentTab = 'matrix';
    this.matrixFilter = 'all';
    this.activeBlockId = 1;
    this.isAdmin = false;
    this.adminToken = localStorage.getItem('santiye_admin_token') || null;
    this.apiUrl = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:8088';
    
    this.fallbackKey = 'santiye_data_v2';
    localStorage.removeItem('santiye_offline_backup_data');

    // Cloud / Firebase state
    this.isCloudActive = false;
    this.db = null;
    this.syncMode = 'yerel_hafiza';

    // Instant local data setup from clean initial state
    const cached = localStorage.getItem(this.fallbackKey);
    if (cached) {
      try { this.data = JSON.parse(cached); } catch(e) {}
    }
    if (!this.data && window.DEFAULT_SANTIYE_DATA) {
      this.data = JSON.parse(JSON.stringify(window.DEFAULT_SANTIYE_DATA));
    }
  }

  async init() {
    this.checkAdminStatus();
    this.bindEvents();

    // 1. Immediately render from built-in 80 units so UI is instantly complete!
    if (this.data) {
      this.renderAll();
    }

    // 2. Then attempt cloud or local server background sync
    this.initFirebase();
    await this.loadData(true);
    if (this.data) {
      this.renderAll();
    }
    
    // Auto sync every 30 seconds if not on Firebase real-time
    setInterval(() => {
      if (!this.isCloudActive) {
        this.loadData(true);
      }
    }, 30000);
  }

  initFirebase() {
    if (typeof firebase === 'undefined') return;
    const config = window.DEFAULT_FIREBASE_CONFIG;
    if (!config || !config.apiKey) return;

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      this.db = firebase.firestore();
      this.isCloudActive = true;
      this.updateSyncUI('bulut');

      // Real-time listener: broadcasts updates across Netlify to all phones!
      this.db.collection('santiye_elektrik_test').doc('main_data').onSnapshot((doc) => {
        if (doc.exists) {
          this.data = doc.data();
          localStorage.setItem(this.fallbackKey, JSON.stringify(this.data));
          this.updateSyncUI('bulut');
          this.renderAll();
        } else {
          // If Firestore document doesn't exist yet, seed it with current local data
          if (this.data && this.data.units) {
            this.db.collection('santiye_elektrik_test').doc('main_data').set(this.data);
          }
        }
      }, (err) => {
        console.warn('Firestore onSnapshot hatası (kurallar veya kota):', err);
        this.isCloudActive = false;
        this.updateSyncUI('yerel_sunucu');
      });
    } catch (e) {
      console.warn('Firebase başlatılamadı:', e);
      this.isCloudActive = false;
    }
  }

  updateSyncUI(mode) {
    this.syncMode = mode;
    const syncBadge = document.getElementById('syncBadge');
    const syncIcon = document.getElementById('syncIcon');
    const syncText = document.getElementById('syncText');
    const headerTime = document.getElementById('headerSyncTime');
    if (!syncBadge) return;

    if (mode === 'bulut') {
      syncBadge.style.background = 'rgba(22, 163, 74, 0.2)';
      syncBadge.style.color = '#4ade80';
      syncBadge.style.borderColor = 'rgba(74, 222, 128, 0.4)';
      syncIcon.innerText = '☁️';
      syncText.innerText = 'Bulut Canlı (Netlify/Firebase)';
      if (headerTime) headerTime.innerText = `Bulut Canlı: ${new Date().toLocaleTimeString('tr-TR')}`;
    } else if (mode === 'yerel_sunucu') {
      syncBadge.style.background = 'rgba(14, 165, 233, 0.15)';
      syncBadge.style.color = '#38bdf8';
      syncBadge.style.borderColor = 'rgba(56, 189, 248, 0.3)';
      syncIcon.innerText = '💻';
      syncText.innerText = 'Yerel Sunucu (Python)';
      if (headerTime) headerTime.innerText = `Yerel Sunucu: ${new Date().toLocaleTimeString('tr-TR')}`;
    } else {
      syncBadge.style.background = 'rgba(245, 158, 11, 0.15)';
      syncBadge.style.color = '#fbbf24';
      syncBadge.style.borderColor = 'rgba(245, 158, 11, 0.3)';
      syncIcon.innerText = '📱';
      syncText.innerText = 'Çevrimdışı (Tarayıcı Hafızası)';
      if (headerTime) headerTime.innerText = `Çevrimdışı Mod`;
    }
  }

  checkAdminStatus() {
    if (this.adminToken) {
      this.isAdmin = true;
      this.updateAdminUI(true);
    } else {
      this.isAdmin = false;
      this.updateAdminUI(false);
    }
  }

  updateAdminUI(isAdmin) {
    const roleBadge = document.getElementById('roleBadge');
    const roleText = document.getElementById('roleText');
    const btnLogin = document.getElementById('btnLoginModal');
    const adminActions = document.getElementById('adminActions');
    const adminBlockControls = document.getElementById('adminBlockControls');

    if (isAdmin) {
      roleBadge.className = 'role-badge admin';
      roleBadge.innerHTML = '<span>🛡️</span><span>Yönetici (Admin)</span>';
      btnLogin.style.display = 'none';
      adminActions.style.display = 'flex';
      if (adminBlockControls) adminBlockControls.style.display = 'block';
    } else {
      roleBadge.className = 'role-badge viewer';
      roleBadge.innerHTML = '<span>👁️</span><span>İzleyici (Salt Okunur)</span>';
      btnLogin.style.display = 'inline-flex';
      adminActions.style.display = 'none';
      if (adminBlockControls) adminBlockControls.style.display = 'none';
    }
  }

  async loadData(isSilent = false) {
    // 1. Try Firebase Firestore if active
    if (this.isCloudActive && this.db) {
      try {
        const doc = await this.db.collection('santiye_elektrik_test').doc('main_data').get();
        if (doc.exists) {
          const cloudData = doc.data();
          if (cloudData && cloudData.units) {
            this.data = cloudData;
            localStorage.setItem(this.fallbackKey, JSON.stringify(this.data));
            this.updateSyncUI('bulut');
            if (!isSilent) this.renderAll();
            return;
          }
        }
      } catch (e) {
        console.warn('Firestore get uyarısı:', e);
      }
    }

    // 2. Try Python server API (/api/data)
    try {
      const response = await fetch(`${this.apiUrl}/api/data`, { cache: 'no-store' });
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const serverData = await response.json();
        if (serverData && serverData.units) {
          this.data = serverData;
          localStorage.setItem(this.fallbackKey, JSON.stringify(this.data));
          this.updateSyncUI('yerel_sunucu');
          if (!isSilent) this.renderAll();
          return;
        }
      }
    } catch (e) {
      // Python server not reachable (e.g. static hosting on Cloudflare/Netlify)
    }

    // 3. Try static JSON file (data/santiye_data.json)
    try {
      const staticRes = await fetch('data/santiye_data.json', { cache: 'no-store' });
      const contentType = staticRes.headers.get('content-type') || '';
      if (staticRes.ok && (contentType.includes('application/json') || contentType.includes('text/plain'))) {
        const staticData = await staticRes.json();
        if (staticData && staticData.units) {
          const cached = localStorage.getItem(this.fallbackKey);
          this.data = cached ? JSON.parse(cached) : staticData;
          this.updateSyncUI('yerel_hafiza');
          if (!isSilent) this.renderAll();
          return;
        }
      }
    } catch (e) {
      console.warn('Statik JSON okunamadı:', e);
    }

    // 4. Try localStorage fallback or built-in default
    const cached = localStorage.getItem(this.fallbackKey);
    if (cached) {
      try { this.data = JSON.parse(cached); } catch(e) {}
    }
    if (!this.data && window.DEFAULT_SANTIYE_DATA) {
      this.data = JSON.parse(JSON.stringify(window.DEFAULT_SANTIYE_DATA));
    }
    this.updateSyncUI('yerel_hafiza');
    if (!isSilent && this.data) this.renderAll();
  }

  async saveData(updatedData) {
    this.data = updatedData;
    localStorage.setItem(this.fallbackKey, JSON.stringify(this.data));

    let savedToCloud = false;

    // 1. Save to Firebase Firestore (Netlify real-time broadcast to all devices)
    if (this.db) {
      try {
        await this.db.collection('santiye_elektrik_test').doc('main_data').set(this.data);
        this.isCloudActive = true;
        this.updateSyncUI('bulut');
        savedToCloud = true;
        this.showToast('Buluta kaydedildi ve tüm cihazlara anında yansıtıldı! ✅', 'success');
      } catch (e) {
        console.warn('Buluta kaydedilemedi:', e);
        if (e.code === 'permission-denied') {
          this.showToast('⚠️ Firebase izin kuralı bekleniyor: Değişiklik telefonun hafızasına kaydedildi ancak diğer cihazlara yansıması için Firebase kuralı açılmalıdır.', 'warning');
        } else {
          this.showToast('Değişiklik bu cihaza kaydedildi.', 'info');
        }
      }
    }

    // 2. Save to Python server API if running locally
    if (!savedToCloud && (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))) {
      try {
        await fetch(`${this.apiUrl}/api/data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.adminToken}`
          },
          body: JSON.stringify(this.data)
        });
      } catch (e) {
        // Python server not active
      }
    }
  }

  bindEvents() {
    // Setup bulk fields default
    this.handleBulkFieldChange();

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });
  }

  renderAll() {
    if (!this.data || !this.data.units) return;

    this.renderKPIs();
    this.renderMatrix();
    this.renderBuilding();
    this.renderTable();
    this.renderStats();
    this.renderLogs();
  }

  // --- TAB SWITCHING ---
  switchTab(tabId) {
    this.currentTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));

    const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(tabId));
    if (btn) btn.classList.add('active');

    const panel = document.getElementById(`view-${tabId}`);
    if (panel) panel.classList.add('active');

    if (tabId === 'building') {
      this.renderBuilding();
    } else if (tabId === 'table') {
      this.renderTable();
    } else if (tabId === 'stats') {
      this.renderStats();
    }
  }

  // --- KPI CALCULATIONS ---
  renderKPIs() {
    const units = Object.values(this.data.units);
    const total = units.length;

    let mekanikDone = 0;
    let klimaDone = 0;
    let mesaDone = 0;
    let testReady = 0;
    let testDone = 0;

    units.forEach(u => {
      if (u.mekanik?.status === 'tamamlandi') mekanikDone++;
      if (u.klima?.status === 'tamamlandi') klimaDone++;
      if (u.mesa?.status === 'onaylandi') mesaDone++;
      if (u.elektrikTest?.status === 'hazir') testReady++;
      if (u.elektrikTest?.status === 'tamamlandi') testDone++;
    });

    document.getElementById('kpiTotalUnits').innerText = total;

    // Mekanik
    const mekPct = Math.round((mekanikDone / total) * 100);
    document.getElementById('kpiMekanikDone').innerText = mekanikDone;
    document.getElementById('kpiMekanikPct').innerText = `%${mekPct}`;
    document.getElementById('barMekanik').style.width = `${mekPct}%`;

    // Klima
    const klimaPct = Math.round((klimaDone / total) * 100);
    document.getElementById('kpiKlimaDone').innerText = klimaDone;
    document.getElementById('kpiKlimaPct').innerText = `%${klimaPct}`;
    document.getElementById('barKlima').style.width = `${klimaPct}%`;

    // MESA
    const mesaPct = Math.round((mesaDone / total) * 100);
    document.getElementById('kpiMesaDone').innerText = mesaDone;
    document.getElementById('kpiMesaPct').innerText = `%${mesaPct}`;
    document.getElementById('barMesa').style.width = `${mesaPct}%`;

    // Test Ready & Done
    document.getElementById('kpiTestReady').innerText = testReady;
    document.getElementById('barTestReady').style.width = `${Math.round((testReady / total) * 100)}%`;

    const testPct = Math.round((testDone / total) * 100);
    document.getElementById('kpiTestDone').innerText = testDone;
    document.getElementById('kpiTestDonePct').innerText = `%${testPct}`;
    document.getElementById('barTestDone').style.width = `${testPct}%`;
  }

  // --- TAB 1: MATRIX / HEATMAP ---
  setMatrixFilter(filter) {
    this.matrixFilter = filter;
    document.querySelectorAll('#view-matrix .filter-chip').forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('onclick')?.includes(filter));
    });
    this.renderMatrix();
  }

  getUnitOverallStatus(u) {
    if (u.elektrikTest?.status === 'tamamlandi') return 'done';
    if (u.elektrikTest?.status === 'hazir') return 'ready';
    if (u.mesa?.status === 'onaylandi') return 'ready';
    if (u.mekanik?.status === 'tamamlandi' && u.klima?.status === 'tamamlandi') return 'mesa_wait';
    if (u.mekanik?.status === 'devam' || u.klima?.status === 'devam') return 'in_progress';
    return 'waiting';
  }

  renderMatrix() {
    const table = document.getElementById('matrixTable');
    if (!table || !this.data) return;

    const blocks = this.data.blocks;
    const floors = this.data.floors; // ordered top to bottom: Çatı down to B2

    let html = '<thead><tr><th class="floor-col-header">Kat / Blok</th>';
    blocks.forEach(b => {
      html += `<th>${b.name}</th>`;
    });
    html += '</tr></thead><tbody>';

    floors.forEach(f => {
      html += `<tr><td class="floor-label-cell">🏢 ${f.name}</td>`;

      blocks.forEach(b => {
        const uKey = `${b.id}_${f.id}`;
        const u = this.data.units[uKey] || {
          id: uKey, blockId: b.id, floorId: f.id,
          mekanik: { status: 'bekliyor' },
          klima: { status: 'bekliyor' },
          mesa: { status: 'bekliyor' },
          elektrikTest: { status: 'kilitli' }
        };

        const overall = this.getUnitOverallStatus(u);

        // Apply filter dimming
        let isFilteredIn = true;
        if (this.matrixFilter === 'ready' && overall !== 'ready') isFilteredIn = false;
        if (this.matrixFilter === 'mesa_wait' && overall !== 'mesa_wait') isFilteredIn = false;
        if (this.matrixFilter === 'prereq_wait' && (overall === 'done' || overall === 'ready' || overall === 'mesa_wait')) isFilteredIn = false;
        if (this.matrixFilter === 'done' && overall !== 'done') isFilteredIn = false;

        let cellClass = 'matrix-cell';
        if (overall === 'done') cellClass += ' status-test-done';
        else if (overall === 'ready') cellClass += ' status-test-ready';
        else if (overall === 'mesa_wait') cellClass += ' status-mesa-wait';
        else if (overall === 'in_progress') cellClass += ' status-in-progress';
        else cellClass += ' status-waiting';

        const opacityStyle = isFilteredIn ? 'opacity: 1;' : 'opacity: 0.25; filter: grayscale(80%);';

        // Badges for the 4 stages
        const bMek = u.mekanik?.status === 'tamamlandi' ? 'ok' : (u.mekanik?.status === 'devam' ? 'prog' : 'wait');
        const bKli = u.klima?.status === 'tamamlandi' ? 'ok' : (u.klima?.status === 'devam' ? 'prog' : 'wait');
        const bMesa = u.mesa?.status === 'onaylandi' ? 'ok' : (u.mesa?.status === 'revizyon' ? 'rev' : 'wait');
        const bTest = u.elektrikTest?.status === 'tamamlandi' ? 'test-ok' : (u.elektrikTest?.status === 'hazir' ? 'test-ready' : 'wait');

        let mainLabel = 'Başlanmadı';
        if (overall === 'done') mainLabel = '⚡ Test Bitti';
        else if (overall === 'ready') mainLabel = '⚡ TESTE HAZIR';
        else if (overall === 'mesa_wait') mainLabel = '🏢 MESA Bekliyor';
        else if (overall === 'in_progress') mainLabel = '🚧 İmalat Sürüyor';

        html += `
          <td class="${cellClass}" style="${opacityStyle}" onclick="app.openEditUnitModal('${uKey}')" title="${b.name} - ${f.name} Detayı için tıklayın">
            <span class="cell-main-title">${mainLabel}</span>
            <div class="cell-badges">
              <span class="sub-badge ${bMek}" title="1. Mekanik: ${u.mekanik?.status || 'bekliyor'}">M</span>
              <span class="sub-badge ${bKli}" title="2. Klima: ${u.klima?.status || 'bekliyor'}">K</span>
              <span class="sub-badge ${bMesa}" title="3. MESA: ${u.mesa?.status || 'bekliyor'}">MS</span>
              <span class="sub-badge ${bTest}" title="4. Test: ${u.elektrikTest?.status || 'kilitli'}">T</span>
            </div>
          </td>
        `;
      });

      html += '</tr>';
    });

    html += '</tbody>';
    table.innerHTML = html;
  }

  // --- TAB 2: BUILDING ELEVATION & CARDS ---
  selectBlock(blockId) {
    this.activeBlockId = blockId;
    this.renderBuilding();
  }

  renderBuilding() {
    const blockBar = document.getElementById('blockButtonsBar');
    if (!blockBar || !this.data) return;

    // Render Block buttons (1 .. 10)
    let barHtml = '';
    this.data.blocks.forEach(b => {
      const activeClass = b.id === this.activeBlockId ? 'active' : '';
      barHtml += `
        <button class="block-select-btn ${activeClass}" onclick="app.selectBlock(${b.id})">
          🏢 ${b.name}
        </button>
      `;
    });
    blockBar.innerHTML = barHtml;

    // Sidebar Summary
    const curBlock = this.data.blocks.find(b => b.id === this.activeBlockId) || this.data.blocks[0];
    document.getElementById('activeBlockTitle').innerText = `${curBlock.name} Durumu`;

    const floors = this.data.floors;
    let bMekCount = 0, bKlimaCount = 0, bMesaCount = 0, bReadyCount = 0, bDoneCount = 0;

    floors.forEach(f => {
      const uKey = `${this.activeBlockId}_${f.id}`;
      const u = this.data.units[uKey];
      if (u) {
        if (u.mekanik?.status === 'tamamlandi') bMekCount++;
        if (u.klima?.status === 'tamamlandi') bKlimaCount++;
        if (u.mesa?.status === 'onaylandi') bMesaCount++;
        if (u.elektrikTest?.status === 'hazir') bReadyCount++;
        if (u.elektrikTest?.status === 'tamamlandi') bDoneCount++;
      }
    });

    document.getElementById('blockMekanikCount').innerText = `${bMekCount}/8`;
    document.getElementById('blockKlimaCount').innerText = `${bKlimaCount}/8`;
    document.getElementById('blockMesaCount').innerText = `${bMesaCount}/8`;
    document.getElementById('blockReadyCount').innerText = `${bReadyCount} Kat`;
    document.getElementById('blockDoneCount').innerText = `${bDoneCount} Kat`;

    const progressPct = Math.round((bDoneCount / 8) * 100);
    document.getElementById('activeBlockProgressText').innerText = `${bDoneCount} / 8 Kat (%${progressPct})`;
    document.getElementById('activeBlockProgressBar').style.width = `${progressPct}%`;

    // Render Floor Cards (Top to bottom: Çatı down to B2)
    const listContainer = document.getElementById('buildingFloorsList');
    let floorsHtml = '';

    floors.forEach(f => {
      const uKey = `${this.activeBlockId}_${f.id}`;
      const u = this.data.units[uKey] || {};
      const overall = this.getUnitOverallStatus(u);

      let cardClass = 'floor-card';
      let overallBadge = '<span class="floor-status-badge badge-wait">Başlanmadı</span>';

      if (overall === 'done') {
        cardClass += ' card-test-done';
        overallBadge = '<span class="floor-status-badge badge-ok">✅ TEST BAŞARILI / BİTTİ</span>';
      } else if (overall === 'ready') {
        cardClass += ' card-test-ready';
        overallBadge = '<span class="floor-status-badge badge-ready">⚡ TESTE HAZIR!</span>';
      } else if (overall === 'mesa_wait') {
        cardClass += ' card-mesa-wait';
        overallBadge = '<span class="floor-status-badge badge-prog" style="background:#f3e8ff; color:#7c3aed; border:1px solid #d8b4fe;">🏢 MESA ONAYI BEKLİYOR</span>';
      } else if (overall === 'in_progress') {
        cardClass += ' card-prereq-wait';
        overallBadge = '<span class="floor-status-badge badge-prog">🚧 İMALAT DEVAM EDİYOR</span>';
      }

      // Mekanik format
      const isMekDone = u.mekanik?.status === 'tamamlandi';
      const mekBadge = isMekDone
        ? '<span class="stage-val-badge badge-ok">Tamamlandı ✓</span>'
        : (u.mekanik?.status === 'devam' ? '<span class="stage-val-badge badge-prog">Sürüyor</span>' : '<span class="stage-val-badge badge-wait">Bekliyor</span>');

      // Klima format
      const isKliDone = u.klima?.status === 'tamamlandi';
      const kliBadge = isKliDone
        ? '<span class="stage-val-badge badge-ok">Tamamlandı ✓</span>'
        : (u.klima?.status === 'devam' ? '<span class="stage-val-badge badge-prog">Sürüyor</span>' : '<span class="stage-val-badge badge-wait">Bekliyor</span>');

      // MESA format
      const isMesaApproved = u.mesa?.status === 'onaylandi';
      let mesaBadge = '<span class="stage-val-badge badge-wait">Bekliyor</span>';
      if (isMesaApproved) mesaBadge = '<span class="stage-val-badge badge-ok">MESA Onayladı ✓</span>';
      else if (u.mesa?.status === 'revizyon') mesaBadge = '<span class="stage-val-badge badge-rev">Revizyon İsteği</span>';
      else if (!isMekDone || !isKliDone) mesaBadge = '<span class="stage-val-badge badge-wait">Ön Şart Bekliyor</span>';

      // Test format
      const isTestDone = u.elektrikTest?.status === 'tamamlandi';
      let testBadge = '<span class="stage-val-badge badge-locked">🔒 Kilitli</span>';
      if (isTestDone) testBadge = '<span class="stage-val-badge badge-ok">Başarılı ✓</span>';
      else if (u.elektrikTest?.status === 'hazir') testBadge = '<span class="stage-val-badge badge-ready">⚡ TESTE HAZIR</span>';
      else if (u.elektrikTest?.status === 'suruyor') testBadge = '<span class="stage-val-badge badge-prog">Test Yapılıyor</span>';

      floorsHtml += `
        <div class="${cardClass}">
          <div class="floor-card-header">
            <div class="floor-badge-title">
              <span class="floor-badge-pill">${f.short}</span>
              <span class="floor-title-text">${curBlock.name} - ${f.name}</span>
            </div>
            <div>
              ${overallBadge}
            </div>
          </div>

          <div class="stages-grid">
            <!-- 1. Mekanik -->
            <div class="stage-box">
              <div class="stage-header">
                <span class="stage-name">🔧 1. Mekanik</span>
                ${mekBadge}
              </div>
              <div class="stage-detail" title="${u.mekanik?.note || ''}">
                ${u.mekanik?.date ? `📅 ${u.mekanik.date}` : 'Tarih girilmedi'}
                ${u.mekanik?.note ? ` • ${u.mekanik.note}` : ''}
              </div>
            </div>

            <!-- 2. Klima -->
            <div class="stage-box">
              <div class="stage-header">
                <span class="stage-name">❄️ 2. Klima / VRF</span>
                ${kliBadge}
              </div>
              <div class="stage-detail" title="${u.klima?.note || ''}">
                ${u.klima?.date ? `📅 ${u.klima.date}` : 'Tarih girilmedi'}
                ${u.klima?.note ? ` • ${u.klima.note}` : ''}
              </div>
            </div>

            <!-- 3. MESA Kabul Onayı -->
            <div class="stage-box" style="background: #faf5ff;">
              <div class="stage-header">
                <span class="stage-name" style="color: #7c3aed;">🏢 3. MESA Kabul</span>
                ${mesaBadge}
              </div>
              <div class="stage-detail" title="${u.mesa?.officer || ''} ${u.mesa?.docNo || ''}">
                ${u.mesa?.date ? `📅 ${u.mesa.date}` : 'Teslim tarihi yok'}
                ${u.mesa?.officer ? ` • ${u.mesa.officer}` : ''}
                ${u.mesa?.docNo ? ` • Tut: ${u.mesa.docNo}` : ''}
              </div>
            </div>

            <!-- 4. Elektrik Testi -->
            <div class="stage-box" style="background: #f0fdf4;">
              <div class="stage-header">
                <span class="stage-name" style="color: #16a34a;">⚡ 4. Elektrik Test</span>
                ${testBadge}
              </div>
              <div class="stage-detail" title="${u.elektrikTest?.note || ''}">
                ${u.elektrikTest?.date ? `📅 ${u.elektrikTest.date}` : (isMesaApproved ? '⚡ Teste Girebilir' : 'MESA bekleniyor')}
                ${u.elektrikTest?.reportNo ? ` • Rapor: ${u.elektrikTest.reportNo}` : ''}
              </div>
            </div>
          </div>

          <div class="floor-card-footer">
            <div>
              <span>Son Değişiklik: <strong>${u.updatedAt || 'Kayıtlı Değil'}</strong></span>
              ${u.updatedBy ? ` (${u.updatedBy})` : ''}
            </div>

            <div>
              <button class="btn btn-secondary btn-sm" onclick="app.openEditUnitModal('${uKey}')">
                <span>${this.isAdmin ? '✏️ Durumu Güncelle' : '🔍 İncele / Detay'}</span>
              </button>
            </div>
          </div>
        </div>
      `;
    });

    listContainer.innerHTML = floorsHtml;
  }

  // --- TAB 3: TABLE VIEW ---
  renderTable() {
    const tbody = document.getElementById('dataTableBody');
    if (!tbody || !this.data) return;

    const search = document.getElementById('tableSearchInput')?.value.toLowerCase().trim() || '';
    const blockFilter = document.getElementById('tableBlockFilter')?.value || 'all';
    const statusFilter = document.getElementById('tableStatusFilter')?.value || 'all';

    let units = Object.values(this.data.units);

    // Filter
    units = units.filter(u => {
      // Block
      if (blockFilter !== 'all' && String(u.blockId) !== blockFilter) return false;

      // Status
      const overall = this.getUnitOverallStatus(u);
      if (statusFilter === 'ready' && overall !== 'ready') return false;
      if (statusFilter === 'mesa_wait' && overall !== 'mesa_wait') return false;
      if (statusFilter === 'prereq_wait' && (overall === 'done' || overall === 'ready' || overall === 'mesa_wait')) return false;
      if (statusFilter === 'done' && overall !== 'done') return false;

      // Search
      if (search) {
        const text = `${u.blockName} ${u.floorName} ${u.mekanik?.note || ''} ${u.klima?.note || ''} ${u.mesa?.officer || ''} ${u.mesa?.docNo || ''}`.toLowerCase();
        if (!text.includes(search)) return false;
      }

      return true;
    });

    // Update count badge
    document.getElementById('tableTabCount').innerText = units.length;

    if (units.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: #64748b;">Arama kriterlerine uygun kat bulunamadı.</td></tr>`;
      return;
    }

    let html = '';
    units.forEach(u => {
      const overall = this.getUnitOverallStatus(u);

      const isMekDone = u.mekanik?.status === 'tamamlandi';
      const isKliDone = u.klima?.status === 'tamamlandi';
      const isMesaApproved = u.mesa?.status === 'onaylandi';
      const isTestDone = u.elektrikTest?.status === 'tamamlandi';

      let testBadge = '<span class="stage-val-badge badge-locked">🔒 Kilitli</span>';
      if (isTestDone) testBadge = '<span class="stage-val-badge badge-ok">✅ Başarılı</span>';
      else if (u.elektrikTest?.status === 'hazir') testBadge = '<span class="stage-val-badge badge-ready">⚡ TESTE HAZIR</span>';
      else if (u.elektrikTest?.status === 'suruyor') testBadge = '<span class="stage-val-badge badge-prog">🔄 Test Ediliyor</span>';

      html += `
        <tr>
          <td>
            <strong>${u.blockName}</strong> - <span>${u.floorName}</span>
          </td>
          <td>
            ${isMekDone ? '<span class="stage-val-badge badge-ok">✓ Tamamlandı</span>' : (u.mekanik?.status === 'devam' ? '<span class="stage-val-badge badge-prog">Sürüyor</span>' : '<span class="stage-val-badge badge-wait">Bekliyor</span>')}
            <div style="font-size:0.7rem; color:#64748b;">${u.mekanik?.date || ''}</div>
          </td>
          <td>
            ${isKliDone ? '<span class="stage-val-badge badge-ok">✓ Tamamlandı</span>' : (u.klima?.status === 'devam' ? '<span class="stage-val-badge badge-prog">Sürüyor</span>' : '<span class="stage-val-badge badge-wait">Bekliyor</span>')}
            <div style="font-size:0.7rem; color:#64748b;">${u.klima?.date || ''}</div>
          </td>
          <td>
            ${isMesaApproved ? '<span class="stage-val-badge badge-ok">✓ MESA Onayladı</span>' : (u.mesa?.status === 'revizyon' ? '<span class="stage-val-badge badge-rev">Revizyon</span>' : (!isMekDone || !isKliDone ? '<span class="stage-val-badge badge-wait">Ön Şart Bekleniyor</span>' : '<span class="stage-val-badge badge-prog" style="background:#faf5ff; color:#7c3aed;">Onay Bekliyor</span>'))}
            <div style="font-size:0.7rem; color:#64748b;">${u.mesa?.officer || ''} ${u.mesa?.docNo ? `(${u.mesa.docNo})` : ''}</div>
          </td>
          <td>
            ${testBadge}
            <div style="font-size:0.7rem; color:#64748b;">${u.elektrikTest?.reportNo ? `Rapor: ${u.elektrikTest.reportNo}` : ''}</div>
          </td>
          <td style="font-size: 0.78rem; color: #64748b;">
            ${u.updatedAt || '-'}
          </td>
          <td style="text-align: right;">
            <button class="btn btn-secondary btn-sm" onclick="app.openEditUnitModal('${u.id}')">
              ${this.isAdmin ? '✏️ Düzenle' : '🔍 İncele'}
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  // --- TAB 4: STATS & PROGRESS PER BLOCK ---
  renderStats() {
    const container = document.getElementById('blockStatsGrid');
    if (!container || !this.data) return;

    let html = '';
    this.data.blocks.forEach(b => {
      let bMek = 0, bKli = 0, bMesa = 0, bReady = 0, bTest = 0;

      this.data.floors.forEach(f => {
        const u = this.data.units[`${b.id}_${f.id}`];
        if (u) {
          if (u.mekanik?.status === 'tamamlandi') bMek++;
          if (u.klima?.status === 'tamamlandi') bKli++;
          if (u.mesa?.status === 'onaylandi') bMesa++;
          if (u.elektrikTest?.status === 'hazir') bReady++;
          if (u.elektrikTest?.status === 'tamamlandi') bTest++;
        }
      });

      const mekPct = Math.round((bMek / 8) * 100);
      const kliPct = Math.round((bKli / 8) * 100);
      const mesaPct = Math.round((bMesa / 8) * 100);
      const testPct = Math.round((bTest / 8) * 100);

      html += `
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.75rem;">
            <h3 style="font-size: 1.1rem; font-weight: 800; color: #0f172a;">🏢 ${b.name}</h3>
            <span style="font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700;">
              ${bTest}/8 Kat Tamamlandı
            </span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.65rem; font-size: 0.8rem;">
            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                <span>1. Mekanik:</span>
                <strong>${bMek}/8 Kat (%${mekPct})</strong>
              </div>
              <div class="kpi-progress"><div class="kpi-bar" style="width: ${mekPct}%; background: #f59e0b;"></div></div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                <span>2. Klima / VRF:</span>
                <strong>${bKli}/8 Kat (%${kliPct})</strong>
              </div>
              <div class="kpi-progress"><div class="kpi-bar" style="width: ${kliPct}%; background: #6366f1;"></div></div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                <span>3. MESA Kabul Onayı:</span>
                <strong>${bMesa}/8 Kat (%${mesaPct})</strong>
              </div>
              <div class="kpi-progress"><div class="kpi-bar" style="width: ${mesaPct}%; background: #a855f7;"></div></div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                <span>4. Elektrik Testi:</span>
                <strong style="color: #16a34a;">${bTest}/8 Kat (%${testPct})</strong>
              </div>
              <div class="kpi-progress"><div class="kpi-bar" style="width: ${testPct}%; background: #22c55e;"></div></div>
            </div>
          </div>

          <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size: 0.75rem; color: #64748b;">Teste Hazır: <strong style="color: #0284c7;">${bReady} Kat</strong></span>
            <button class="btn btn-secondary btn-sm" onclick="app.selectBlock(${b.id}); app.switchTab('building');">
              Katları İncele ➔
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // --- TAB 5: AUDIT LOGS ---
  renderLogs() {
    const tbody = document.getElementById('auditLogsBody');
    if (!tbody || !this.data) return;

    const logs = this.data.logs || [];
    document.getElementById('logTabCount').innerText = logs.length;

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem; color: #64748b;">Henüz bir işlem kaydı bulunmamaktadır.</td></tr>';
      return;
    }

    let html = '';
    logs.slice(0, 50).forEach(log => {
      let badgeStyle = 'background: #e2e8f0; color: #334155;';
      if (log.badgeType === 'success') badgeStyle = 'background: #dcfce7; color: #15803d;';
      else if (log.badgeType === 'warning') badgeStyle = 'background: #fef3c7; color: #b45309;';
      else if (log.badgeType === 'primary') badgeStyle = 'background: #e0f2fe; color: #0369a1;';

      html += `
        <tr>
          <td style="white-space: nowrap; font-size: 0.8rem; color: #64748b;">${log.timestamp}</td>
          <td><strong>${log.user}</strong></td>
          <td>${log.blockName || ''} - ${log.floorName || ''}</td>
          <td>
            <span style="padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.75rem; ${badgeStyle}">
              ${log.action}
            </span>
          </td>
          <td style="font-size: 0.8rem; color: #334155;">${log.details}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  // --- MODAL: EDIT UNIT ---
  openEditUnitModal(unitId) {
    const u = this.data.units[unitId];
    if (!u) return;

    document.getElementById('editUnitId').value = unitId;
    document.getElementById('editModalTitle').innerText = `${u.blockName} - ${u.floorName} Durumu`;
    document.getElementById('editModalSubtitle').innerText = `Son Güncelleme: ${u.updatedAt || '-'} (${u.updatedBy || 'Sistem'})`;

    // 1. Mekanik
    document.getElementById('editMekanikStatus').value = u.mekanik?.status || 'bekliyor';
    document.getElementById('editMekanikDate').value = u.mekanik?.date || '';
    document.getElementById('editMekanikNote').value = u.mekanik?.note || '';

    // 2. Klima
    document.getElementById('editKlimaStatus').value = u.klima?.status || 'bekliyor';
    document.getElementById('editKlimaDate').value = u.klima?.date || '';
    document.getElementById('editKlimaNote').value = u.klima?.note || '';

    // 3. MESA
    document.getElementById('editMesaStatus').value = u.mesa?.status || 'bekliyor';
    document.getElementById('editMesaDate').value = u.mesa?.date || '';
    document.getElementById('editMesaOfficer').value = u.mesa?.officer || '';
    document.getElementById('editMesaDocNo').value = u.mesa?.docNo || '';
    document.getElementById('editMesaNote').value = u.mesa?.note || '';

    // 4. Test
    document.getElementById('editElkStatus').value = u.elektrikTest?.status || 'kilitli';
    document.getElementById('editElkDate').value = u.elektrikTest?.date || '';
    document.getElementById('editElkTester').value = u.elektrikTest?.tester || '';
    document.getElementById('editElkReport').value = u.elektrikTest?.reportNo || '';
    document.getElementById('editElkNote').value = u.elektrikTest?.note || '';

    // Role check for save button
    const btnSave = document.getElementById('btnSaveUnit');
    if (this.isAdmin) {
      btnSave.style.display = 'inline-flex';
      this.enableModalInputs(true);
    } else {
      btnSave.style.display = 'none';
      this.enableModalInputs(false);
    }

    this.handleModalStateChange();
    this.openModal('modalEditUnit');
  }

  enableModalInputs(enabled) {
    const inputs = document.querySelectorAll('#modalEditUnit input, #modalEditUnit select');
    inputs.forEach(input => {
      input.disabled = !enabled;
    });
  }

  handleModalStateChange() {
    const mekStatus = document.getElementById('editMekanikStatus').value;
    const kliStatus = document.getElementById('editKlimaStatus').value;
    const mesaSelect = document.getElementById('editMesaStatus');
    const elkSelect = document.getElementById('editElkStatus');

    const isMekDone = mekStatus === 'tamamlandi';
    const isKliDone = kliStatus === 'tamamlandi';
    const bothPrereqsDone = isMekDone && isKliDone;

    // Badges update
    const mekBadge = document.getElementById('mekanikBadgeStatus');
    mekBadge.className = isMekDone ? 'stage-val-badge badge-ok' : (mekStatus === 'devam' ? 'stage-val-badge badge-prog' : 'stage-val-badge badge-wait');
    mekBadge.innerText = isMekDone ? 'Tamamlandı ✓' : (mekStatus === 'devam' ? 'İmalat Sürüyor' : 'Bekliyor');

    const kliBadge = document.getElementById('klimaBadgeStatus');
    kliBadge.className = isKliDone ? 'stage-val-badge badge-ok' : (kliStatus === 'devam' ? 'stage-val-badge badge-prog' : 'stage-val-badge badge-wait');
    kliBadge.innerText = isKliDone ? 'Tamamlandı ✓' : (kliStatus === 'devam' ? 'İmalat Sürüyor' : 'Bekliyor');

    // MESA Rule Enforcement
    const mesaAlert = document.getElementById('mesaPrereqWarning');
    const mesaOptionApproved = mesaSelect.querySelector('option[value="onaylandi"]');

    if (!bothPrereqsDone) {
      mesaAlert.style.display = 'flex';
      mesaOptionApproved.disabled = true;
      if (mesaSelect.value === 'onaylandi') {
        mesaSelect.value = 'bekliyor';
      }
    } else {
      mesaAlert.style.display = 'none';
      mesaOptionApproved.disabled = false;
    }

    const mesaStatus = mesaSelect.value;
    const isMesaApproved = mesaStatus === 'onaylandi';

    const mesaBadge = document.getElementById('mesaBadgeStatus');
    mesaBadge.className = isMesaApproved ? 'stage-val-badge badge-ok' : (mesaStatus === 'revizyon' ? 'stage-val-badge badge-rev' : 'stage-val-badge badge-wait');
    mesaBadge.innerText = isMesaApproved ? 'MESA Onayladı ✓' : (mesaStatus === 'revizyon' ? 'Revizyon Gerekli' : 'Onay Bekliyor');

    // Elektrik Test Rule Enforcement
    const elkAlert = document.getElementById('elkPrereqWarning');
    const elkBadge = document.getElementById('elkBadgeStatus');

    const optHazir = elkSelect.querySelector('option[value="hazir"]');
    const optSuruyor = elkSelect.querySelector('option[value="suruyor"]');
    const optTamam = elkSelect.querySelector('option[value="tamamlandi"]');
    const optHata = elkSelect.querySelector('option[value="basarisiz"]');

    if (!isMesaApproved) {
      elkAlert.style.display = 'flex';
      optHazir.disabled = true;
      optSuruyor.disabled = true;
      optTamam.disabled = true;
      optHata.disabled = true;
      elkSelect.value = 'kilitli';

      elkBadge.className = 'stage-val-badge badge-locked';
      elkBadge.innerText = '🔒 KİLİTLİ';
    } else {
      elkAlert.style.display = 'none';
      optHazir.disabled = false;
      optSuruyor.disabled = false;
      optTamam.disabled = false;
      optHata.disabled = false;

      if (elkSelect.value === 'kilitli') {
        elkSelect.value = 'hazir';
      }

      const curElk = elkSelect.value;
      if (curElk === 'tamamlandi') {
        elkBadge.className = 'stage-val-badge badge-ok';
        elkBadge.innerText = '✅ TEST BAŞARILI';
      } else if (curElk === 'hazir') {
        elkBadge.className = 'stage-val-badge badge-ready';
        elkBadge.innerText = '⚡ TESTE HAZIR';
      } else if (curElk === 'suruyor') {
        elkBadge.className = 'stage-val-badge badge-prog';
        elkBadge.innerText = '🔄 TEST SÜRÜYOR';
      } else {
        elkBadge.className = 'stage-val-badge badge-rev';
        elkBadge.innerText = '❌ UYGUNSUZLUK';
      }
    }
  }

  async saveUnitData() {
    if (!this.isAdmin) {
      this.showToast('Değişiklik yapabilmek için yönetici girişi yapmalısınız.', 'error');
      return;
    }

    const unitId = document.getElementById('editUnitId').value;
    const u = this.data.units[unitId];
    if (!u) return;

    const mekStatus = document.getElementById('editMekanikStatus').value;
    const kliStatus = document.getElementById('editKlimaStatus').value;
    const mesaStatus = document.getElementById('editMesaStatus').value;
    const elkStatus = document.getElementById('editElkStatus').value;

    // Strict validation
    if (mesaStatus === 'onaylandi' && (mekStatus !== 'tamamlandi' || kliStatus !== 'tamamlandi')) {
      this.showToast('HATA: Mekanik ve Klima tamamlanmadan MESA onayı kaydedilemez!', 'error');
      return;
    }

    if (elkStatus !== 'kilitli' && mesaStatus !== 'onaylandi') {
      this.showToast('HATA: MESA onayı olmadan Elektrik Testine başlanamaz!', 'error');
      return;
    }

    // Build updated object
    const updatedUnit = {
      ...u,
      mekanik: {
        status: mekStatus,
        date: document.getElementById('editMekanikDate').value || (mekStatus === 'tamamlandi' ? new Date().toISOString().split('T')[0] : ''),
        note: document.getElementById('editMekanikNote').value
      },
      klima: {
        status: kliStatus,
        date: document.getElementById('editKlimaDate').value || (kliStatus === 'tamamlandi' ? new Date().toISOString().split('T')[0] : ''),
        note: document.getElementById('editKlimaNote').value
      },
      mesa: {
        status: mesaStatus,
        date: document.getElementById('editMesaDate').value || (mesaStatus === 'onaylandi' ? new Date().toISOString().split('T')[0] : ''),
        officer: document.getElementById('editMesaOfficer').value,
        docNo: document.getElementById('editMesaDocNo').value,
        note: document.getElementById('editMesaNote').value
      },
      elektrikTest: {
        status: elkStatus,
        date: document.getElementById('editElkDate').value || (elkStatus === 'tamamlandi' ? new Date().toISOString().split('T')[0] : ''),
        tester: document.getElementById('editElkTester').value,
        reportNo: document.getElementById('editElkReport').value,
        note: document.getElementById('editElkNote').value
      },
      updatedAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      updatedBy: 'Admin'
    };

    this.data.units[unitId] = updatedUnit;
    this.data.logs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString('tr-TR'),
      user: 'Admin',
      unitId: unitId,
      blockName: u.blockName,
      floorName: u.floorName,
      action: 'Kat Güncellendi',
      details: `Mekanik: ${mekStatus}, Klima: ${kliStatus}, MESA: ${mesaStatus}, Test: ${elkStatus}`,
      badgeType: 'success'
    });

    // Save to Firestore and Local
    await this.saveData(this.data);
    this.closeModal('modalEditUnit');
    this.renderAll();
  }

  // --- BULK OPERATIONS ---
  openBulkModal() {
    this.openModal('modalBulk');
  }

  handleBulkFieldChange() {
    const field = document.getElementById('bulkFieldSelect').value;
    const statusSelect = document.getElementById('bulkStatusSelect');

    let options = '';
    if (field === 'mekanik' || field === 'klima') {
      options = `
        <option value="tamamlandi">✅ Tamamlandı (Bitti)</option>
        <option value="devam">🚧 Devam Ediyor</option>
        <option value="bekliyor">⏳ Bekliyor / Başlanmadı</option>
      `;
    } else if (field === 'mesa') {
      options = `
        <option value="onaylandi">✅ MESA Onayladı (Sadece Mekanik & Klima bitti olanlar kabul edilir)</option>
        <option value="revizyon">❌ Revizyon Gerekli</option>
        <option value="bekliyor">⏳ Onay Bekliyor</option>
      `;
    } else if (field === 'elektrikTest') {
      options = `
        <option value="tamamlandi">✅ Test Başarılı (Tamamlandı)</option>
        <option value="suruyor">🔄 Test Aşamasında (Sürüyor)</option>
        <option value="hazir">⚡ Teste Hazır</option>
      `;
    }

    statusSelect.innerHTML = options;
  }

  async executeBulkUpdate() {
    const blockVal = document.getElementById('bulkBlockSelect').value;
    const field = document.getElementById('bulkFieldSelect').value;
    const status = document.getElementById('bulkStatusSelect').value;
    const note = document.getElementById('bulkNoteInput').value;

    let targetUnitIds = [];
    Object.values(this.data.units).forEach(u => {
      if (blockVal === 'all' || String(u.blockId) === blockVal) {
        targetUnitIds.push(u.id);
      }
    });

    if (targetUnitIds.length === 0) {
      this.showToast('Hedef kat bulunamadı.', 'error');
      return;
    }

    let updatedCount = 0;
    const nowStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    targetUnitIds.forEach(uid => {
      const u = this.data.units[uid];
      if (!u) return;

      if (field === 'mesa' && status === 'onaylandi') {
        if (u.mekanik?.status !== 'tamamlandi' || u.klima?.status !== 'tamamlandi') return;
      }
      if (field === 'elektrikTest' && ['hazir', 'suruyor', 'tamamlandi'].includes(status)) {
        if (u.mesa?.status !== 'onaylandi') return;
      }

      u[field].status = status;
      u[field].date = nowStr;
      if (note) u[field].note = note;

      if (u.mesa?.status === 'onaylandi' && u.elektrikTest?.status === 'kilitli') {
        u.elektrikTest.status = 'hazir';
      } else if (u.mesa?.status !== 'onaylandi') {
        u.elektrikTest.status = 'kilitli';
      }

      u.updatedAt = timeStr;
      u.updatedBy = 'Admin';
      updatedCount++;
    });

    this.data.logs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString('tr-TR'),
      user: 'Admin',
      unitId: 'bulk',
      blockName: `${updatedCount} Kat`,
      floorName: 'Toplu İşlem',
      action: `Toplu Güncelleme`,
      details: `${updatedCount} kat için ${field} durumu '${status}' yapıldı.`,
      badgeType: 'warning'
    });

    await this.saveData(this.data);
    this.showToast(`${updatedCount} kat başarıyla güncellendi!`, 'success');
    this.closeModal('modalBulk');
    this.renderAll();
  }

  async quickCompleteBlockMekanik() {
    if (!this.isAdmin) {
      this.showToast('Yönetici girişi gereklidir.', 'error');
      return;
    }

    const curBlock = this.data.blocks.find(b => b.id === this.activeBlockId);
    if (!curBlock) return;

    if (!confirm(`${curBlock.name} bloğundaki tüm katların mekanik işini "Tamamlandı" olarak kaydetmek istediğinize emin misiniz?`)) {
      return;
    }

    document.getElementById('bulkBlockSelect').value = String(this.activeBlockId);
    document.getElementById('bulkFieldSelect').value = 'mekanik';
    this.handleBulkFieldChange();
    document.getElementById('bulkStatusSelect').value = 'tamamlandi';
    document.getElementById('bulkNoteInput').value = `${curBlock.name} saha kontrolü ile mekanik tamamlandı`;

    await this.executeBulkUpdate();
  }

  // --- AUTHENTICATION ---
  openLoginModal() {
    document.getElementById('loginPasswordInput').value = '';
    this.openModal('modalLogin');
  }

  async login() {
    const pw = document.getElementById('loginPasswordInput').value;
    if (!pw) {
      this.showToast('Lütfen şifre giriniz.', 'warning');
      return;
    }

    try {
      const res = await fetch(`${this.apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        this.adminToken = resData.token;
        localStorage.setItem('santiye_admin_token', this.adminToken);
        this.isAdmin = true;
        this.updateAdminUI(true);
        this.closeModal('modalLogin');
        this.showToast('Yönetici girişi başarılı! Artık düzenleme yapabilirsiniz.', 'success');
        this.renderAll();
      } else {
        this.showToast(resData.message || 'Hatalı şifre!', 'error');
      }
    } catch (e) {
      // Offline fallback login for default password 'admin123'
      if (pw === 'admin123') {
        this.adminToken = 'local-admin-token';
        localStorage.setItem('santiye_admin_token', this.adminToken);
        this.isAdmin = true;
        this.updateAdminUI(true);
        this.closeModal('modalLogin');
        this.showToast('Yönetici girişi başarılı (Yerel Mod).', 'success');
        this.renderAll();
      } else {
        this.showToast('Hatalı şifre!', 'error');
      }
    }
  }

  logout() {
    this.adminToken = null;
    this.isAdmin = false;
    localStorage.removeItem('santiye_admin_token');
    this.updateAdminUI(false);
    this.showToast('Çıkış yapıldı. İzleyici modundasınız.', 'info');
    this.renderAll();
  }

  openChangePasswordModal() {
    document.getElementById('currentPwInput').value = '';
    document.getElementById('newPwInput').value = '';
    document.getElementById('confirmPwInput').value = '';
    this.openModal('modalChangePassword');
  }

  async changePassword() {
    const curPw = document.getElementById('currentPwInput').value;
    const newPw = document.getElementById('newPwInput').value;
    const confPw = document.getElementById('confirmPwInput').value;

    if (!curPw || !newPw) {
      this.showToast('Lütfen alanları doldurunuz.', 'warning');
      return;
    }
    if (newPw !== confPw) {
      this.showToast('Yeni şifreler uyuşmuyor!', 'error');
      return;
    }

    try {
      const res = await fetch(`${this.apiUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        this.showToast('Şifreniz başarıyla değiştirildi.', 'success');
        this.closeModal('modalChangePassword');
      } else {
        this.showToast(resData.message || 'Şifre değiştirilemedi!', 'error');
      }
    } catch (e) {
      this.showToast('Sunucu hatası!', 'error');
    }
  }

  // --- EXPORT TO EXCEL / CSV ---
  exportToExcel() {
    if (!this.data || !this.data.units) return;

    const units = Object.values(this.data.units);
    let csv = '\uFEFF'; // UTF-8 BOM for proper Turkish characters in Excel
    csv += 'Blok;Kat;Mekanik Durumu;Mekanik Bitiş;Mekanik Not;Klima Durumu;Klima Bitiş;Klima Not;MESA Durumu;MESA Onay Tarihi;MESA Yetkilisi;MESA Tutanak No;MESA Not;Elektrik Test Durumu;Test Tarihi;Test Ekibi;Test Rapor No;Test Sonuç Notu;Son Güncelleme\n';

    units.forEach(u => {
      const row = [
        u.blockName,
        u.floorName,
        u.mekanik?.status || '',
        u.mekanik?.date || '',
        `"${(u.mekanik?.note || '').replace(/"/g, '""')}"`,
        u.klima?.status || '',
        u.klima?.date || '',
        `"${(u.klima?.note || '').replace(/"/g, '""')}"`,
        u.mesa?.status || '',
        u.mesa?.date || '',
        `"${(u.mesa?.officer || '').replace(/"/g, '""')}"`,
        `"${(u.mesa?.docNo || '').replace(/"/g, '""')}"`,
        `"${(u.mesa?.note || '').replace(/"/g, '""')}"`,
        u.elektrikTest?.status || '',
        u.elektrikTest?.date || '',
        `"${(u.elektrikTest?.tester || '').replace(/"/g, '""')}"`,
        `"${(u.elektrikTest?.reportNo || '').replace(/"/g, '""')}"`,
        `"${(u.elektrikTest?.note || '').replace(/"/g, '""')}"`,
        u.updatedAt || ''
      ];
      csv += row.join(';') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `MESA_Santiye_Elektrik_Test_Takip_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    this.showToast('Excel / CSV raporu başarıyla indirildi.', 'success');
  }

  // --- CLOUD / FIREBASE SETTINGS ---
  openCloudSettingsModal() {
    const statusText = document.getElementById('firebaseStatusText');
    if (this.isCloudActive) {
      statusText.innerHTML = '<span style="color: #16a34a;">🟢 Firebase Firestore Bulut Senkronizasyonu Aktif!</span> (Netlify üzerinde tüm telefonlar canlı senkronize olur)';
    } else {
      statusText.innerHTML = '<span style="color: #d97706;">⚠️ Bulut bağlantısı yerel ağda deneniyor veya offline moddasınız.</span>';
    }
    this.openModal('modalCloudSettings');
  }

  async syncCurrentDataToCloud() {
    if (!this.data) return;
    try {
      this.initFirebase();
      if (this.db) {
        await this.db.collection('santiye_elektrik_test').doc('main_data').set(this.data);
        this.isCloudActive = true;
        this.updateSyncUI('bulut');
        this.showToast('Mevcut 80 kat verisi Firebase bulutuna başarıyla yüklendi!', 'success');
        this.closeModal('modalCloudSettings');
      } else {
        this.showToast('Firebase başlatılamadı. İnternet bağlantınızı kontrol edin.', 'error');
      }
    } catch (e) {
      this.showToast('Buluta yükleme hatası: ' + e.message, 'error');
    }
  }

  // --- BACKUP & RESTORE ---
  openBackupModal() {
    this.openModal('modalBackup');
  }

  downloadBackupJSON() {
    if (!this.data) return;
    const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `MESA_Santiye_Yedek_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    this.showToast('Yedek JSON dosyası indirildi.', 'success');
  }

  restoreBackupJSON() {
    const fileInput = document.getElementById('backupFileInput');
    if (!fileInput.files || fileInput.files.length === 0) {
      this.showToast('Lütfen bir .json yedek dosyası seçiniz.', 'warning');
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.units || Object.keys(parsed.units).length === 0) {
          this.showToast('Geçersiz yedek dosyası! Kat verisi bulunamadı.', 'error');
          return;
        }

        this.data = parsed;
        await this.saveData(this.data);
        this.renderAll();
        this.showToast('Yedek başarıyla geri yüklendi ve uygulandı!', 'success');
        this.closeModal('modalBackup');
      } catch (err) {
        this.showToast('JSON okuma hatası: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  // --- UTILS: MODALS & TOASTS ---
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Instantiate and start app on page load
const app = new SantiyeApp();
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
