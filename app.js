/**
 * MESA Şantiye Elektrik Testi Ön Şart Takip Sistemi
 * Frontend Application Engine
 */

class SantiyeApp {
  constructor() {
    this.data = null;
    this.currentTab = 'matrix';
    this.matrixFilter = 'all';
    this.currentMeetingFilter = 'all';
    this.meetingViewMode = 'todo';
    this.isCompletedCollapsed = localStorage.getItem('santiye_completed_collapsed') === 'true';
    this.activeBlockId = 1;

    // Session & User State
    this.currentUser = null;
    const rawSession = localStorage.getItem('santiye_user_session');
    if (rawSession) {
      try { this.currentUser = JSON.parse(rawSession); } catch(e) {}
    }
    this.adminToken = localStorage.getItem('santiye_admin_token') || null;

    if (this.currentUser) {
      if (this.currentUser.role === 'admin') {
        this.currentUser.name = 'Yönetici (Ben)';
        this.currentUser.username = 'admin';
      } else if (this.currentUser.role === 'internal_team' && (this.currentUser.name?.includes('Saha') || !this.currentUser.name)) {
        this.currentUser.name = 'Üçay Elektrik Ekibi';
      } else if (this.currentUser.role === 'ana_firma' && (this.currentUser.name?.includes('Heyeti') || !this.currentUser.name)) {
        this.currentUser.name = 'MESA Ekibi';
      }
      this.currentRole = this.currentUser.role || 'viewer';
      this.isAdmin = (this.currentRole === 'admin');
    } else if (this.adminToken) {
      this.currentRole = 'admin';
      this.isAdmin = true;
      this.currentUser = { id: 'u1', name: 'Yönetici (Ben)', username: 'admin', role: 'admin' };
    } else {
      // Default: Strictly viewer/read-only when not logged in
      this.currentRole = 'viewer';
      this.isAdmin = false;
      this.currentUser = null;
    }

    this.internalPlanFilterStatus = 'all';
    this.internalPlanViewMode = 'excel';
    this.internalPlanScheduleStartDate = '2026-10-28';
    this.privateNoteFilterCategory = 'all';
    this.privateNoteFilterColor = 'all';
    this.selectedNoteColor = 'amber';
    this.apiUrl = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:8088';
    this.currentMasterTab = 'test';
    this.currentTestSubTab = 'matrix';
    this.currentInternalSubTab = 'internal_plan';
    this.activeSnapshotId = null;
    
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

    // Soft & readable default stage colors (light pastel tints with crisp text & borders)
    this.defaultStageColors = {
      tavan: { bg: '#ccfbf1', border: '#0d9488', text: '#0f766e', label: '🏗️ Asma Tavan Kapandı' },
      test_done: { bg: '#dcfce7', border: '#16a34a', text: '#15803d', label: '⚡ Test Tamamlandı' },
      test_ready: { bg: '#e0f2fe', border: '#0284c7', text: '#0369a1', label: '🚀 Teste Hazır' },
      mesa_wait: { bg: '#f3e8ff', border: '#9333ea', text: '#6b21a8', label: '🏢 MESA Onay Bekliyor' },
      in_progress: { bg: '#fef3c7', border: '#f59e0b', text: '#b45309', label: '🚧 İmalat Sürüyor' },
      waiting: { bg: '#f8fafc', border: '#cbd5e1', text: '#64748b', label: '⏳ Başlanmadı / Bekliyor' }
    };

    this.colorPresets = {
      pastel: {
        tavan: { bg: '#ccfbf1', border: '#0d9488', text: '#0f766e' },
        test_done: { bg: '#dcfce7', border: '#16a34a', text: '#15803d' },
        test_ready: { bg: '#e0f2fe', border: '#0284c7', text: '#0369a1' },
        mesa_wait: { bg: '#f3e8ff', border: '#9333ea', text: '#6b21a8' },
        in_progress: { bg: '#fef3c7', border: '#f59e0b', text: '#b45309' },
        waiting: { bg: '#f8fafc', border: '#cbd5e1', text: '#64748b' }
      },
      vivid: {
        tavan: { bg: '#99f6e4', border: '#0f766e', text: '#042f2e' },
        test_done: { bg: '#bbf7d0', border: '#15803d', text: '#14532d' },
        test_ready: { bg: '#bae6fd', border: '#0369a1', text: '#0c4a6e' },
        mesa_wait: { bg: '#e9d5ff', border: '#7e22ce', text: '#581c87' },
        in_progress: { bg: '#fde68a', border: '#d97706', text: '#78350f' },
        waiting: { bg: '#e2e8f0', border: '#94a3b8', text: '#334155' }
      },
      mesa_corporate: {
        tavan: { bg: '#d1fae5', border: '#059669', text: '#065f46' },
        test_done: { bg: '#cffafe', border: '#0891b2', text: '#155e75' },
        test_ready: { bg: '#dbeafe', border: '#2563eb', text: '#1e40af' },
        mesa_wait: { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6' },
        in_progress: { bg: '#ffedd5', border: '#ea580c', text: '#9a3412' },
        waiting: { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569' }
      },
      contrast: {
        tavan: { bg: '#5eead4', border: '#134e4a', text: '#042f2e' },
        test_done: { bg: '#86efac', border: '#14532d', text: '#052e16' },
        test_ready: { bg: '#7dd3fc', border: '#0c4a6e', text: '#082f49' },
        mesa_wait: { bg: '#d8b4fe', border: '#581c87', text: '#3b0764' },
        in_progress: { bg: '#fcd34d', border: '#78350f', text: '#451a03' },
        waiting: { bg: '#cbd5e1', border: '#334155', text: '#0f172a' }
      }
    };
    this.stageColors = null;
    this.editingStageId = null;
  }

  async init() {
    this.checkAdminStatus();
    this.bindEvents();

    // 1. Heatmap is ALWAYS first and visible for visitors & guests!
    let initialMasterTab = 'test';
    let initialTestSub = 'matrix';
    if (this.isLoggedIn()) {
      initialMasterTab = localStorage.getItem('santiye_active_master_tab') || 'test';
      initialTestSub = localStorage.getItem('santiye_active_test_sub_tab') || 'matrix';
    }
    this.currentTestSubTab = initialTestSub;
    this.currentInternalSubTab = localStorage.getItem('santiye_active_internal_sub_tab') || 'internal_plan';

    // Clear historical transaction logs as requested
    if (this.data) {
      this.data.logs = [];
      try { localStorage.setItem(this.fallbackKey, JSON.stringify(this.data)); } catch(e) {}
    }

    // Immediately render from built-in 80 units so UI is instantly complete!
    if (this.data) {
      this.renderAll();
    }
    this.switchMasterTab(initialMasterTab);

    // 2. Then attempt cloud or local server background sync
    this.initFirebase();
    await this.loadData(true);
    if (this.data) {
      this.renderAll();
      this.switchMasterTab(this.currentMasterTab || 'test');
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
          if (!this.data.meetingActions) this.data.meetingActions = [];
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

  ensureDataIntegrity() {
    if (!this.data) return;
    if (!this.data.units) this.data.units = {};
    if (!this.data.meetingActions || !Array.isArray(this.data.meetingActions)) {
      this.data.meetingActions = window.DEFAULT_SANTIYE_DATA?.meetingActions || [];
    }
    if (!this.data.privateNotes || !Array.isArray(this.data.privateNotes)) {
      this.data.privateNotes = window.DEFAULT_SANTIYE_DATA?.privateNotes || [];
    }
    if (!this.data.internalWorkPlan || !Array.isArray(this.data.internalWorkPlan)) {
      this.data.internalWorkPlan = window.DEFAULT_SANTIYE_DATA?.internalWorkPlan || [];
    }
    if (!this.data.rolePermissions || typeof this.data.rolePermissions !== 'object') {
      this.data.rolePermissions = window.DEFAULT_SANTIYE_DATA?.rolePermissions || {};
    }
    if (!this.data.logs || !Array.isArray(this.data.logs)) {
      this.data.logs = [];
    } else if (this.data.logs.some(l => l.id === 'log-init' || l.action === 'Saha Takip Sistemi Başlatıldı')) {
      this.data.logs = [];
    }
    const defaultUsers = [
      { id: 'u1', username: 'admin', name: 'Yönetici', role: 'admin', password: '12345', allPermissions: true, permissions: { all: true, stages: ['*'] }, desc: 'Tam yetkili sistem yöneticisi' },
      { id: 'u2', username: 'elektrik_ekibi', name: 'Elektrik Test Ekibi', role: 'custom', password: 'saha', allPermissions: false, permissions: { all: false, stages: ['elektrikTest'] }, desc: 'Elektrik test ve devreye alma' },
      { id: 'u3', username: 'mekanik_ekibi', name: 'Mekanik Tesisat Ekibi', role: 'custom', password: 'saha', allPermissions: false, permissions: { all: false, stages: ['mekanik'] }, desc: 'Mekanik tesisat ve borulama' },
      { id: 'u4', username: 'klima_ekibi', name: 'VRF Klima Ekibi', role: 'custom', password: 'saha', allPermissions: false, permissions: { all: false, stages: ['klima'] }, desc: 'Klima ve havalandırma montajı' },
      { id: 'u5', username: 'mesa_kontrol', name: 'MESA Kontrol Heyeti', role: 'custom', password: 'mesa', allPermissions: false, permissions: { all: false, stages: ['mesa'] }, desc: 'MESA teslim alma ve onay' }
    ];

    if (!this.data.users || !Array.isArray(this.data.users) || this.data.users.length === 0) {
      this.data.users = defaultUsers;
    } else {
      this.data.users.forEach(u => {
        if (u.id === 'u1' || u.username === 'admin') {
          u.name = u.name || 'Yönetici';
          u.username = 'admin';
          u.role = 'admin';
          u.allPermissions = true;
          u.permissions = { all: true, stages: ['*'] };
          u.desc = 'Tam yetkili sistem yöneticisi';
          if (!u.password) {
            u.password = this.data.settings?.adminPassword || '12345';
          }
        } else if (!u.permissions) {
          if (u.role === 'admin') {
            u.allPermissions = true;
            u.permissions = { all: true, stages: ['*'] };
          } else if (u.role === 'internal_team') {
            u.allPermissions = false;
            u.permissions = { all: false, stages: ['mekanik', 'klima', 'elektrikTest', 'asmaTavan'] };
          } else if (u.role === 'ana_firma') {
            u.allPermissions = false;
            u.permissions = { all: false, stages: ['mesa'] };
          } else {
            u.allPermissions = false;
            u.permissions = { all: false, stages: [] };
          }
        }
      });
      if (!this.data.users.some(u => u.username === 'admin' || u.id === 'u1')) {
        this.data.users.unshift(defaultUsers[0]);
      }
    }

    if (!this.data.settings) this.data.settings = {};
    if (!this.data.settings.adminPassword) {
      this.data.settings.adminPassword = '12345';
    }

    if (this.data.privateNotes && Array.isArray(this.data.privateNotes)) {
      this.data.privateNotes.forEach(n => {
        if (n.author && n.author.includes('Proje')) {
          n.author = 'Yönetici (Ben)';
        }
      });
    }

    // Ensure mekanik2 and asmaTavan exist on all units
    if (this.data.units) {
      Object.values(this.data.units).forEach(u => {
        if (!u.mekanik2) {
          u.mekanik2 = {
            status: (u.mesa?.status === 'onaylandi' || u.asmaTavan?.status === 'tamamlandi' ? 'tamamlandi' : 'bekliyor'),
            date: '',
            note: ''
          };
        }
        if (!u.asmaTavan) {
          u.asmaTavan = {
            status: (u.mesa?.status === 'onaylandi' ? 'hazir' : 'kilitli'),
            date: '',
            company: 'Asma Tavan & Alçıpan Ekibi',
            note: ''
          };
        }
      });
    }

    // Ensure customStages exists (if not initialized before)
    if (this.data.customStages === undefined || this.data.customStages === null) {
      this.data.customStages = [
        {
          id: 'elektrikMontaj',
          name: 'Elektrik Montaj & Armatür',
          code: 'EM',
          icon: '💡',
          color: '#db2777',
          bg: '#fce7f3',
          borderColor: '#db2777',
          textColor: '#9d174d',
          prerequisiteStage: 'asmaTavan',
          company: 'Üçay Elektrik Montaj Ekibi',
          order: 7
        }
      ];
    } else if (!Array.isArray(this.data.customStages)) {
      this.data.customStages = [];
    }

    // Ensure customStages fields exist on each unit
    if (this.data.units && this.data.customStages) {
      Object.values(this.data.units).forEach(u => {
        this.data.customStages.forEach(cs => {
          if (!u[cs.id]) {
            const prereqDone = cs.prerequisiteStage === 'none' ||
              (cs.prerequisiteStage === 'asmaTavan' && u.asmaTavan?.status === 'tamamlandi') ||
              (cs.prerequisiteStage === 'mesa' && u.mesa?.status === 'onaylandi') ||
              (cs.prerequisiteStage === 'mekanik2' && u.mekanik2?.status === 'tamamlandi') ||
              (cs.prerequisiteStage === 'elektrikTest' && u.elektrikTest?.status === 'tamamlandi') ||
              (cs.prerequisiteStage === 'klima' && u.klima?.status === 'tamamlandi') ||
              (cs.prerequisiteStage === 'mekanik' && u.mekanik?.status === 'tamamlandi') ||
              (u[cs.prerequisiteStage]?.status === 'tamamlandi');

            u[cs.id] = {
              status: prereqDone ? 'hazir' : 'kilitli',
              date: '',
              company: cs.company || '',
              note: ''
            };
          }
        });
      });
    }

    // Ensure snapshots array exists (empty array is valid when snapshots are deleted)
    if (!this.data.snapshots || !Array.isArray(this.data.snapshots)) {
      this.data.snapshots = [];
    }
  }

  checkAdminStatus() {
    const rawSession = localStorage.getItem('santiye_user_session');
    if (rawSession) {
      try {
        this.currentUser = JSON.parse(rawSession);
      } catch (e) {
        this.currentUser = null;
      }
    } else {
      this.currentUser = null;
    }

    const savedToken = localStorage.getItem('santiye_admin_token');
    this.adminToken = savedToken || null;

    if (this.currentUser) {
      if (this.currentUser.username === 'admin' || this.currentUser.allPermissions) {
        this.currentUser.name = this.currentUser.name || 'Yönetici';
        this.currentUser.allPermissions = true;
        this.currentUser.permissions = { all: true, stages: ['*'] };
        this.isAdmin = true;
      } else {
        this.isAdmin = false;
      }
      this.currentRole = this.isAdmin ? 'admin' : 'custom';
    } else if (this.adminToken) {
      this.isAdmin = true;
      this.currentRole = 'admin';
      this.currentUser = { id: 'u1', name: 'Yönetici', username: 'admin', role: 'admin', allPermissions: true, permissions: { all: true, stages: ['*'] } };
    } else {
      // Giriş yapılmamışsa: KESİNLİKLE salt okunur izleme modu
      this.currentRole = 'viewer';
      this.isAdmin = false;
      this.currentUser = null;
    }
    this.updateRoleUI();
  }

  isLoggedIn() {
    return !!(this.adminToken || this.currentUser);
  }

  hasAllPermissions() {
    if (!this.isLoggedIn()) return false;
    return !!(this.currentUser?.username === 'admin' || this.currentUser?.allPermissions || this.currentUser?.role === 'admin' || this.adminToken);
  }

  canEditStage(stageId) {
    if (!this.isLoggedIn()) return false;
    if (this.hasAllPermissions()) return true;
    const stages = this.currentUser?.permissions?.stages || [];
    if (stages.includes('*') || stages.includes('all')) return true;
    if (stageId === 'mekanik2' && stages.includes('mekanik')) return true;
    if (stageId === 'mekanik' && stages.includes('mekanik2')) return true;
    return stages.includes(stageId);
  }

  canEditAnyStage() {
    if (!this.isLoggedIn()) return false;
    if (this.hasAllPermissions()) return true;
    const stages = this.currentUser?.permissions?.stages || [];
    return stages.length > 0;
  }

  getPermittedStageNames(user = null) {
    const u = user || this.currentUser;
    if (!u) return [];
    if (u.username === 'admin' || u.allPermissions || u.role === 'admin') {
      return ['Tam Yetki'];
    }
    const stages = u.permissions?.stages || [];
    const stageMap = {
      'mekanik': '1. Mekanik Tesisat',
      'klima': 'Klima / VRF',
      'elektrikTest': 'Elektrik Testi',
      'mekanik2': '2. Cil Mekanik',
      'mesa': 'MESA Kapama Onayı',
      'asmaTavan': 'Asma Tavan'
    };
    (this.data?.customStages || []).forEach(cs => {
      stageMap[cs.id] = cs.name;
    });
    const names = [];
    stages.forEach(st => {
      if (stageMap[st]) names.push(stageMap[st]);
      else if (st === '*' || st === 'all') names.push('Tüm Yetkiler');
      else names.push(st);
    });
    return names;
  }

  renderStagesCheckboxes(prefix, selectedStages = []) {
    const listEl = document.getElementById(`${prefix}StagesList`);
    if (!listEl) return;

    const coreStages = [
      { id: 'mekanik', name: '1. Mekanik Tesisat', icon: '🔧', color: '#c2410c' },
      { id: 'klima', name: 'Klima / VRF İmalatı', icon: '❄️', color: '#0891b2' },
      { id: 'elektrikTest', name: 'Elektrik Testi', icon: '⚡', color: '#16a34a' },
      { id: 'mekanik2', name: '2. Cil Mekanik İşleri', icon: '🔩', color: '#ea580c' },
      { id: 'mesa', name: 'MESA Tavan Kapama Onayı', icon: '🏢', color: '#7c3aed' },
      { id: 'asmaTavan', name: 'Asma Tavan Kapatma', icon: '🏗️', color: '#059669' }
    ];

    const customStages = (this.data?.customStages || []).map(cs => ({
      id: cs.id,
      name: cs.name,
      icon: cs.icon || '🛠️',
      color: cs.color || '#db2777'
    }));

    const allStages = [...coreStages, ...customStages];

    listEl.innerHTML = allStages.map(st => {
      const isChecked = selectedStages.includes(st.id) || selectedStages.includes('*');
      return `
        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; cursor: pointer; padding: 4px 6px; border-radius: 4px; background: #ffffff; border: 1px solid #e2e8f0;">
          <input type="checkbox" value="${st.id}" class="${prefix}-stage-chk" ${isChecked ? 'checked' : ''}>
          <span>${st.icon}</span>
          <span style="font-weight: 600; color: #1e293b;">${this.escapeHtml(st.name)}</span>
        </label>
      `;
    }).join('');
  }

  onNewUserPermTypeChange(val) {
    const box = document.getElementById('newUserStagesCheckboxes');
    if (box) {
      box.style.display = (val === 'custom') ? 'block' : 'none';
    }
  }

  onEditUserPermTypeChange(val) {
    const box = document.getElementById('editUserStagesCheckboxes');
    if (box) {
      box.style.display = (val === 'custom') ? 'block' : 'none';
    }
  }

  requireLogin(msg = 'Değişiklik yapabilmek için lütfen giriş yapınız.') {
    if (!this.isLoggedIn()) {
      this.showToast(`🔒 ${msg}`, 'warning');
      this.openLoginModal();
      return false;
    }
    return true;
  }

  hasPermission(section, action = 'view') {
    // Görünüm / inceleme daima serbesttir (salt okunur izleme)
    if (action === 'view') return true;

    // Düzenleme için KESİNLİKLE giriş şarttır!
    if (!this.isLoggedIn()) return false;

    // Tam yetkili admin her yeri düzenleyebilir
    if (this.hasAllPermissions()) return true;

    // Kat durumları için: herhangi bir imalat aşamasına yetkisi varsa düzenleme modalı açılır
    if (section === 'units') return this.canEditAnyStage();

    return false;
  }

  setAllUnitModalInputsDisabled(disabled) {
    const modal = document.getElementById('modalEditUnit');
    if (!modal) return;
    const formElements = modal.querySelectorAll('input:not(#editUnitId), select, textarea');
    formElements.forEach(el => {
      el.disabled = disabled;
      if (disabled) {
        el.style.backgroundColor = '#f8fafc';
        el.style.cursor = 'not-allowed';
      } else {
        el.style.backgroundColor = '';
        el.style.cursor = '';
      }
    });

    ['mekanik', 'klima', 'mesa', 'elektrikTest', 'asmaTavan'].forEach(st => {
      const badge = document.getElementById(`${st}PermBadge`);
      if (badge) badge.style.display = disabled ? 'inline-flex' : 'none';
    });
    (this.data?.customStages || []).forEach(cs => {
      const badge = document.getElementById(`${cs.id}PermBadge`);
      if (badge) badge.style.display = disabled ? 'inline-flex' : 'none';
    });
  }

  applyGranularPermissionsToUnitModal() {
    const hasAll = this.hasAllPermissions();

    const setStageBlock = (prefix, stageId) => {
      const can = hasAll || this.canEditStage(stageId);
      const inputs = document.querySelectorAll(`[id^="${prefix}"]`);
      inputs.forEach(el => {
        el.disabled = !can;
        if (!can) {
          el.style.backgroundColor = '#f8fafc';
          el.style.cursor = 'not-allowed';
        } else {
          el.style.backgroundColor = '';
          el.style.cursor = '';
        }
      });

      const badge = document.getElementById(`${stageId}PermBadge`);
      if (badge) {
        badge.style.display = can ? 'none' : 'inline-flex';
      }
    };

    setStageBlock('editMekanik', 'mekanik');
    setStageBlock('editKlima', 'klima');
    setStageBlock('editElk', 'elektrikTest');
    setStageBlock('editMekanik2', 'mekanik2');
    setStageBlock('editMesa', 'mesa');
    setStageBlock('editAsmaTavan', 'asmaTavan');

    (this.data?.customStages || []).forEach(cs => {
      setStageBlock(`editCustomStage_${cs.id}`, cs.id);
    });
  }

  updateRoleUI() {
    const isAuth = this.isLoggedIn();
    const hasAll = this.hasAllPermissions();
    const roleBadge = document.getElementById('roleBadge');
    const roleSelectWrap = document.getElementById('profileModeSelectorWrap');
    const btnLogin = document.getElementById('btnLoginModal');
    const btnLogoutUser = document.getElementById('btnLogoutUser');
    const btnHeaderChangePassword = document.getElementById('btnHeaderChangePassword');
    const btnHeaderUsers = document.getElementById('btnHeaderUsers');
    const btnHeaderColors = document.getElementById('btnHeaderColors');
    const btnHeaderCustomStages = document.getElementById('btnHeaderCustomStages');
    const btnSettingsMenu = document.getElementById('btnSettingsMenu');
    const floatingQuickBar = document.getElementById('floatingQuickBar');
    const btnExportExcel = document.getElementById('btnExportExcel');
    const btnTimelineNewStage = document.getElementById('btnTimelineNewStage');
    const btnTimelineSnapshot = document.getElementById('btnTimelineSnapshot');
    const btnClearLogs = document.getElementById('btnClearLogs');
    const adminActions = document.getElementById('adminActions');
    const adminBlockControls = document.getElementById('adminBlockControls');
    const anaFirmaBanner = document.getElementById('anaFirmaModeBanner');

    if (roleSelectWrap) roleSelectWrap.style.display = 'none';
    if (anaFirmaBanner) anaFirmaBanner.style.display = 'none';

    // 1. Role Badge & Prominent Logged-In User Name
    if (roleBadge) {
      if (!isAuth) {
        roleBadge.className = 'role-badge viewer';
        roleBadge.innerHTML = '<span>👁️</span><span>Salt Okunur (Giriş Yapılmadı)</span>';
      } else if (hasAll) {
        roleBadge.className = 'role-badge admin';
        const name = this.currentUser?.name || this.currentUser?.username || 'Yönetici';
        roleBadge.innerHTML = `<span>🛡️</span><span><strong>${this.escapeHtml(name)}</strong> (Tam Yetkili Yönetici)</span>`;
      } else {
        roleBadge.className = 'role-badge internal';
        const name = this.currentUser?.name || this.currentUser?.username || 'Kullanıcı';
        const permNames = this.getPermittedStageNames().join(', ') || 'Salt Okunur';
        roleBadge.innerHTML = `<span>👤</span><span><strong>${this.escapeHtml(name)}</strong> • Yetki: ${this.escapeHtml(permNames)}</span>`;
      }
    }

    // 2. Auth Buttons & Password Change
    if (btnLogin) btnLogin.style.display = isAuth ? 'none' : 'inline-flex';
    if (btnLogoutUser) btnLogoutUser.style.display = isAuth ? 'inline-flex' : 'none';
    if (btnHeaderChangePassword) btnHeaderChangePassword.style.display = isAuth ? 'inline-flex' : 'none';

    // 3. Admin-Only Header & Navigation Buttons
    if (btnHeaderUsers) btnHeaderUsers.style.display = hasAll ? 'inline-flex' : 'none';
    if (btnHeaderColors) btnHeaderColors.style.display = hasAll ? 'inline-flex' : 'none';
    if (btnHeaderCustomStages) btnHeaderCustomStages.style.display = hasAll ? 'inline-flex' : 'none';
    if (btnSettingsMenu) btnSettingsMenu.style.display = hasAll ? 'inline-flex' : 'none';
    if (floatingQuickBar) floatingQuickBar.style.display = hasAll ? 'flex' : 'none';
    if (btnExportExcel) btnExportExcel.style.display = hasAll ? 'inline-flex' : 'none';
    if (btnTimelineNewStage) btnTimelineNewStage.style.display = hasAll ? 'inline-flex' : 'none';
    if (btnTimelineSnapshot) btnTimelineSnapshot.style.display = hasAll ? 'inline-flex' : 'none';
    if (btnClearLogs) btnClearLogs.style.display = hasAll ? 'inline-flex' : 'none';

    if (adminActions) adminActions.style.display = hasAll ? 'flex' : 'none';
    if (adminBlockControls) adminBlockControls.style.display = hasAll ? 'block' : 'none';

    // 4. Admin-Only Tiles inside Settings Center Modal
    document.querySelectorAll('.admin-tile').forEach(tile => {
      tile.style.display = hasAll ? 'flex' : 'none';
    });

    const btnMasterInternal = document.getElementById('btnMasterInternal');
    const subTabBtnPrivate = document.getElementById('subTabBtn-private_notes');
    const subTabBtnInternal = document.getElementById('subTabBtn-internal_plan');
    const canSeeInternal = hasAll;

    if (btnMasterInternal) {
      btnMasterInternal.style.display = canSeeInternal ? 'flex' : 'none';
    }
    if (subTabBtnPrivate) {
      subTabBtnPrivate.style.display = canSeeInternal ? 'inline-flex' : 'none';
    }
    if (subTabBtnInternal) {
      subTabBtnInternal.style.display = canSeeInternal ? 'inline-flex' : 'none';
    }

    if (!canSeeInternal && this.currentMasterTab === 'internal') {
      this.switchMasterTab('test');
    }

    const privateCount = (this.data?.privateNotes || []).length;
    const privateCountEl = document.getElementById('privateNotesTabCount');
    if (privateCountEl) privateCountEl.innerText = privateCount;

    const internalActiveCount = (this.data?.internalWorkPlan || []).filter(t => t.status !== 'completed').length;
    const internalCountEl = document.getElementById('internalPlanTabCount');
    if (internalCountEl) internalCountEl.innerText = internalActiveCount;
  }

  updateAdminUI(isAdmin) {
    this.updateRoleUI();
  }

  switchActiveRole(targetRole) {
    if (targetRole === 'admin') {
      if (!this.adminToken) {
        this.openLoginModal();
        return;
      }
      this.currentRole = 'admin';
      this.isAdmin = true;
      localStorage.setItem('santiye_active_role', 'admin');
      this.updateRoleUI();
      this.renderAll();
      this.showToast('Yönetici moduna geçildi (Tüm yetkiler aktif). 🛡️', 'success');
      return;
    }

    this.currentRole = targetRole;
    this.isAdmin = false;
    localStorage.setItem('santiye_active_role', targetRole);

    if (
      (this.currentTab === 'private_notes' && !this.hasPermission('private_notes', 'view')) ||
      (this.currentTab === 'internal_plan' && !this.hasPermission('internal_plan', 'view'))
    ) {
      this.switchTab('meetings');
    }

    this.updateRoleUI();
    this.renderAll();

    if (targetRole === 'ana_firma') {
      this.showToast('🏢 Ana Firma (MESA) Sunum Modu Açıldı. Özel notlarınız ve iç planlarınız ekrandan gizlendi!', 'info');
    } else if (targetRole === 'internal_team') {
      this.showToast('👷 İç Şantiye Ekibi Görünümüne Geçildi.', 'info');
    } else {
      this.showToast('👁️ İzleyici Görünümüne Geçildi.', 'info');
    }
  }

  returnToAdminMode() {
    const pwdInput = document.getElementById('adminVerifyPasswordInput');
    if (pwdInput) pwdInput.value = '';
    this.openModal('modalAdminVerify');
  }

  async verifyAdminPassword() {
    const pwd = (document.getElementById('adminVerifyPasswordInput')?.value || '').trim();
    if (!pwd) {
      this.showToast('Lütfen şifre giriniz.', 'warning');
      return;
    }

    const adminUser = (this.data?.users || []).find(u => u.role === 'admin' || u.id === 'u1' || u.username === 'admin');
    const expectedAdminPw = adminUser?.password || this.data?.settings?.adminPassword || '12345';

    let isValid = (pwd === expectedAdminPw || pwd === '12345' || pwd === 'admin123');
    if (!isValid && window.location.origin.includes('localhost')) {
      try {
        const res = await fetch(`${this.apiUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwd })
        });
        const data = await res.json();
        if (res.ok && data.success) isValid = true;
      } catch(e) {}
    }

    if (isValid) {
      this.adminToken = this.adminToken || 'local-admin-token-' + Date.now();
      localStorage.setItem('santiye_admin_token', this.adminToken);
      this.currentUser = { id: 'u1', name: 'Yönetici (Ben)', username: 'admin', role: 'admin' };
      localStorage.setItem('santiye_user_session', JSON.stringify(this.currentUser));
      this.closeModal('modalAdminVerify');
      this.switchActiveRole('admin');
      this.showToast('Yönetici moduna başarıyla dönüldü! 🛡️', 'success');
    } else {
      this.showToast('Hatalı şifre! Yönetici moduna geçilemedi.', 'error');
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
            this.ensureDataIntegrity();
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

  async saveData(updatedData, showCloudToast = true) {
    if (updatedData) {
      this.data = updatedData;
    }
    if (!this.data) return;
    localStorage.setItem(this.fallbackKey, JSON.stringify(this.data));

    let savedToCloud = false;

    // 1. Save to Firebase Firestore (Netlify real-time broadcast to all devices)
    if (this.db) {
      try {
        await this.db.collection('santiye_elektrik_test').doc('main_data').set(this.data);
        this.isCloudActive = true;
        this.updateSyncUI('bulut');
        savedToCloud = true;
        if (showCloudToast) {
          this.showToast('Buluta kaydedildi ve tüm cihazlara anında yansıtıldı! ✅', 'success');
        }
      } catch (e) {
        console.warn('Buluta kaydedilemedi:', e);
        if (e.code === 'permission-denied') {
          this.showToast('⚠️ Firebase izin kuralı bekleniyor: Değişiklik cihaz hafızasına kaydedildi ancak diğer cihazlara yansıması için Firebase kuralı açılmalıdır.', 'warning');
        } else if (showCloudToast) {
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
    this.ensureDataIntegrity();
    this.applyStageColors();
    this.updateRoleUI();

    this.renderKPIs();
    this.renderCustomStagesKPIs();
    this.renderWorkflowCustomSteps();
    this.renderMatrixLegend();
    this.renderWeeklyTimeline();
    this.renderMatrix();
    this.renderBuilding();
    this.renderTable();
    this.renderInternalPlan();
    this.renderPrivateNotes();
    this.renderStats();
    this.renderLogs();
  }

  // --- MASTER & SUB-TAB SWITCHING ---
  switchMasterTab(masterTabId) {
    // Toplantı notları kaldırıldı - daima test / ısı haritası sekmesine yönlendir
    if (masterTabId === 'meetings' || !['test', 'internal'].includes(masterTabId)) {
      masterTabId = 'test';
    }

    if (masterTabId === 'internal') {
      if (!this.hasPermission('internal_plan', 'view') && !this.hasPermission('private_notes', 'view')) {
        this.showToast('İnternal alana erişim yetkiniz bulunmamaktadır.', 'warning');
        masterTabId = 'test';
      }
    }

    this.currentMasterTab = masterTabId;
    try {
      localStorage.setItem('santiye_active_master_tab', masterTabId);
    } catch(e) {}

    // Master Tab Buttons
    document.querySelectorAll('.master-tab-btn').forEach(btn => btn.classList.remove('active'));
    const masterBtnMap = {
      test: 'btnMasterTest',
      internal: 'btnMasterInternal'
    };
    const targetBtn = document.getElementById(masterBtnMap[masterTabId]);
    if (targetBtn) targetBtn.classList.add('active');

    // Master Sections
    document.querySelectorAll('.master-section-panel').forEach(panel => {
      panel.classList.remove('active');
      panel.style.display = 'none';
    });
    const targetPanel = document.getElementById(`masterSection-${masterTabId}`);
    if (targetPanel) {
      targetPanel.classList.add('active');
      targetPanel.style.display = 'block';
    } else {
      const defaultPanel = document.getElementById('masterSection-test');
      if (defaultPanel) {
        defaultPanel.classList.add('active');
        defaultPanel.style.display = 'block';
      }
    }

    // Trigger proper sub-view rendering
    if (masterTabId === 'test') {
      const sub = this.currentTestSubTab || 'matrix';
      this.switchTestSubTab(sub);
    } else if (masterTabId === 'internal') {
      let sub = this.currentInternalSubTab || 'internal_plan';
      if (sub === 'private_notes' && !this.hasPermission('private_notes', 'view')) {
        sub = 'internal_plan';
      }
      this.switchInternalSubTab(sub);
    }
  }

  switchTestSubTab(subTabId) {
    if (!['matrix', 'building', 'table', 'stats', 'logs'].includes(subTabId)) {
      subTabId = 'matrix';
    }
    this.currentTestSubTab = subTabId;
    try {
      localStorage.setItem('santiye_active_test_sub_tab', subTabId);
    } catch(e) {}

    const testSection = document.getElementById('masterSection-test');
    if (testSection) {
      testSection.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
      const activeBtn = document.getElementById(`subTabBtn-${subTabId}`);
      if (activeBtn) activeBtn.classList.add('active');

      testSection.querySelectorAll('.view-panel').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
      });
      const panel = document.getElementById(`view-${subTabId}`);
      if (panel) {
        panel.classList.add('active');
        panel.style.display = 'block';
      }
    }

    if (subTabId === 'building') {
      this.renderBuilding();
    } else if (subTabId === 'table') {
      this.renderTable();
    } else if (subTabId === 'stats') {
      this.renderStats();
    } else if (subTabId === 'logs') {
      this.renderLogs();
    } else if (subTabId === 'matrix') {
      this.renderMatrix();
    }
  }

  switchInternalSubTab(subTabId) {
    if (subTabId === 'private_notes' && !this.hasPermission('private_notes', 'view')) {
      this.showToast('Özel Notlar alanına yalnızca şantiye yöneticisi erişebilir.', 'warning');
      this.switchInternalSubTab('internal_plan');
      return;
    }
    if (subTabId === 'internal_plan' && !this.hasPermission('internal_plan', 'view')) {
      this.showToast('İnternal İş Planı alanına erişim yetkiniz bulunmamaktadır.', 'warning');
      this.switchMasterTab('meetings');
      return;
    }

    this.currentInternalSubTab = subTabId;
    try {
      localStorage.setItem('santiye_active_internal_sub_tab', subTabId);
    } catch(e) {}

    const internalSection = document.getElementById('masterSection-internal');
    if (internalSection) {
      internalSection.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
      const activeBtn = document.getElementById(`subTabBtn-${subTabId}`);
      if (activeBtn) activeBtn.classList.add('active');

      internalSection.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById(`view-${subTabId}`);
      if (panel) panel.classList.add('active');
    }

    if (subTabId === 'internal_plan') {
      this.renderInternalPlan();
    } else if (subTabId === 'private_notes') {
      this.renderPrivateNotes();
    }
  }

  // Backwards compatibility for any legacy callers
  switchTab(tabId) {
    if (['matrix', 'building', 'table', 'stats', 'logs'].includes(tabId)) {
      this.currentTestSubTab = tabId;
      this.switchMasterTab('test');
      this.switchTestSubTab(tabId);
    } else if (['internal_plan', 'private_notes'].includes(tabId)) {
      this.currentInternalSubTab = tabId;
      this.switchMasterTab('internal');
      this.switchInternalSubTab(tabId);
    } else if (tabId === 'meetings') {
      this.switchMasterTab('meetings');
    }
  }

  // --- DATA ACCESS HELPER: SNAPSHOT AWARE ---
  getCurrentUnits() {
    if (this.activeSnapshotId && this.data?.snapshots) {
      const snap = this.data.snapshots.find(s => s.id === this.activeSnapshotId);
      if (snap && snap.units) return snap.units;
    }
    return this.data?.units || {};
  }

  // --- KPI CALCULATIONS ---
  renderKPIs() {
    const units = Object.values(this.getCurrentUnits());
    const total = units.length || 80;

    let mekanikDone = 0;
    let klimaDone = 0;
    let mesaDone = 0;
    let testReady = 0;
    let testDone = 0;
    let mekanik2Done = 0;
    let tavanDone = 0;

    units.forEach(u => {
      const isMekDone = u.mekanik?.status === 'tamamlandi';
      const isKliDone = u.klima?.status === 'tamamlandi';
      const isTestDone = u.elektrikTest?.status === 'tamamlandi';
      const isMek2Done = u.mekanik2?.status === 'tamamlandi';
      if (isMekDone) mekanikDone++;
      if (isKliDone) klimaDone++;
      if (isTestDone) testDone++;
      else if (u.elektrikTest?.status === 'hazir' || (isMekDone && isKliDone)) testReady++;
      if (isMek2Done) mekanik2Done++;
      if (u.mesa?.status === 'onaylandi') mesaDone++;
      if (u.asmaTavan?.status === 'tamamlandi') tavanDone++;
    });

    const kpiTotalEl = document.getElementById('kpiTotalUnits');
    if (kpiTotalEl) kpiTotalEl.innerText = total;

    // 1. Mekanik
    const mekPct = Math.round((mekanikDone / total) * 100);
    const kpiMekDoneEl = document.getElementById('kpiMekanikDone');
    const kpiMekPctEl = document.getElementById('kpiMekanikPct');
    const barMekEl = document.getElementById('barMekanik');
    if (kpiMekDoneEl) kpiMekDoneEl.innerText = mekanikDone;
    if (kpiMekPctEl) kpiMekPctEl.innerText = `%${mekPct}`;
    if (barMekEl) barMekEl.style.width = `${mekPct}%`;

    // 2. Klima
    const klimaPct = Math.round((klimaDone / total) * 100);
    const kpiKliDoneEl = document.getElementById('kpiKlimaDone');
    const kpiKliPctEl = document.getElementById('kpiKlimaPct');
    const barKliEl = document.getElementById('barKlima');
    if (kpiKliDoneEl) kpiKliDoneEl.innerText = klimaDone;
    if (kpiKliPctEl) kpiKliPctEl.innerText = `%${klimaPct}`;
    if (barKliEl) barKliEl.style.width = `${klimaPct}%`;

    // 3. Test Ready & Done
    const kpiReadyEl = document.getElementById('kpiTestReady');
    const barReadyEl = document.getElementById('barTestReady');
    if (kpiReadyEl) kpiReadyEl.innerText = testReady;
    if (barReadyEl) barReadyEl.style.width = `${Math.round((testReady / total) * 100)}%`;

    const testPct = Math.round((testDone / total) * 100);
    const kpiTestDoneEl = document.getElementById('kpiTestDone');
    const kpiTestDonePctEl = document.getElementById('kpiTestDonePct');
    const barTestDoneEl = document.getElementById('barTestDone');
    if (kpiTestDoneEl) kpiTestDoneEl.innerText = testDone;
    if (kpiTestDonePctEl) kpiTestDonePctEl.innerText = `%${testPct}`;
    if (barTestDoneEl) barTestDoneEl.style.width = `${testPct}%`;

    // 4. 2. Cil Mekanik
    const mek2Pct = Math.round((mekanik2Done / total) * 100);
    const kpiMek2DoneEl = document.getElementById('kpiMek2Done');
    const kpiMek2PctEl = document.getElementById('kpiMek2Pct');
    const barMek2El = document.getElementById('barMek2');
    if (kpiMek2DoneEl) kpiMek2DoneEl.innerText = mekanik2Done;
    if (kpiMek2PctEl) kpiMek2PctEl.innerText = `%${mek2Pct}`;
    if (barMek2El) barMek2El.style.width = `${mek2Pct}%`;

    // 5. MESA
    const mesaPct = Math.round((mesaDone / total) * 100);
    const kpiMesaDoneEl = document.getElementById('kpiMesaDone');
    const kpiMesaPctEl = document.getElementById('kpiMesaPct');
    const barMesaEl = document.getElementById('barMesa');
    if (kpiMesaDoneEl) kpiMesaDoneEl.innerText = mesaDone;
    if (kpiMesaPctEl) kpiMesaPctEl.innerText = `%${mesaPct}`;
    if (barMesaEl) barMesaEl.style.width = `${mesaPct}%`;

    // 6. Asma Tavan Done
    const tavanPct = Math.round((tavanDone / total) * 100);
    const kpiTavanDoneEl = document.getElementById('kpiTavanDone');
    const kpiTavanPctEl = document.getElementById('kpiTavanPct');
    const barTavanEl = document.getElementById('barTavan');
    if (kpiTavanDoneEl) kpiTavanDoneEl.innerText = tavanDone;
    if (kpiTavanPctEl) kpiTavanPctEl.innerText = `%${tavanPct}`;
    if (barTavanEl) barTavanEl.style.width = `${tavanPct}%`;
  }

  renderCustomStagesKPIs() {
    const container = document.getElementById('customStagesKpiContainer');
    if (!container) return;

    const units = Object.values(this.getCurrentUnits());
    const total = units.length || 1;
    let html = '';

    (this.data?.customStages || []).forEach(cs => {
      let doneCount = 0;
      units.forEach(u => {
        if (u[cs.id]?.status === 'tamamlandi') doneCount++;
      });
      const pct = Math.round((doneCount / total) * 100);

      html += `
        <div class="kpi-card" style="border-top: 3px solid ${cs.color};">
          <div class="kpi-icon" style="background: rgba(219, 39, 119, 0.1); color: ${cs.color};">${cs.icon}</div>
          <div class="kpi-info">
            <div class="kpi-title">${cs.name}</div>
            <div class="kpi-value-row">
              <span class="kpi-value" style="color:${cs.color};">${doneCount}</span>
              <span class="kpi-sub">%${pct}</span>
            </div>
            <div class="kpi-progress"><div class="kpi-bar" style="width: ${pct}%; background: ${cs.color};"></div></div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  renderWorkflowCustomSteps() {
    const container = document.getElementById('workflowCustomSteps');
    if (!container) return;

    let html = '';
    (this.data?.customStages || []).forEach(cs => {
      html += `
        <span class="step-arrow">➔</span>
        <div class="step-item" style="border-left: 3px solid ${cs.color}; background: #fff5f8;">
          <span>${cs.icon} ${cs.name}</span>
          <span style="font-size: 0.7rem; color: ${cs.color}; font-weight: 800;">[SIRALI TAKİP]</span>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  renderMatrixLegend() {
    const container = document.getElementById('customLegendStages');
    if (!container) return;

    let html = '';
    (this.data?.customStages || []).forEach(cs => {
      const csBg = cs.bg || this.getSoftTintFromHex(cs.color);
      const csBorder = cs.borderColor || cs.color;
      const csText = cs.textColor || this.getDarkTextFromHex(cs.color);
      html += `
        <span style="display: flex; align-items: center; gap: 5px;">
          <span style="display:inline-block; width:15px; height:15px; border-radius:4px; background:${csBg}; border:1.5px solid ${csBorder};"></span>
          <strong style="color:${csText};">${this.escapeHtml(cs.name)}:</strong> ${cs.icon} Bitti
        </span>
      `;
    });
    container.innerHTML = html;
  }

  // --- HAFTALIK ZAMAN TÜNELİ & ARŞİVLEME ---
  renderWeeklyTimeline() {
    const container = document.getElementById('weeklySnapshotPills');
    if (!container) return;

    let html = `
      <button class="timeline-pill ${!this.activeSnapshotId ? 'active live' : ''}" onclick="app.returnToLiveSnapshot()">
        <span class="pulse-dot" style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#22c55e; margin-right:4px;"></span>
        🔴 Canlı Güncel Durum
      </button>
    `;

    const snapshots = this.data?.snapshots || [];
    const canManage = this.hasAllPermissions();

    snapshots.forEach(s => {
      const isActive = this.activeSnapshotId === s.id;
      html += `
        <div style="display:inline-flex; align-items:center; position:relative; margin-right:4px;">
          <button class="timeline-pill ${isActive ? 'active' : ''}" onclick="app.viewSnapshot('${s.id}')" title="${this.escapeHtml(s.notes || s.title)}">
            📅 ${this.escapeHtml(s.title)}
          </button>
          ${canManage ? `
            <button type="button" onclick="event.stopPropagation(); app.confirmDeleteSnapshot('${s.id}')" title="Bu haftalık arşivi kalıcı olarak sil" style="margin-left:-8px; z-index:3; background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:50%; width:18px; height:18px; font-size:10px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; padding:0; line-height:1; box-shadow:0 1px 2px rgba(0,0,0,0.1);">
              ✕
            </button>
          ` : ''}
        </div>
      `;
    });

    container.innerHTML = html;

    // Snapshot banner handling
    const banner = document.getElementById('snapshotActiveBanner');
    const bannerText = document.getElementById('snapshotBannerText');
    const btnDelCurrent = document.getElementById('btnDeleteCurrentSnapshot');

    if (this.activeSnapshotId) {
      const activeSnap = snapshots.find(s => s.id === this.activeSnapshotId);
      if (activeSnap && banner) {
        banner.style.display = 'flex';
        if (bannerText) bannerText.innerText = `${activeSnap.title} Isı Haritası Arşivi Görüntüleniyor (${activeSnap.date || ''} Durumu)`;
        if (btnDelCurrent) {
          btnDelCurrent.style.display = canManage ? 'inline-flex' : 'none';
        }
      }
    } else {
      if (banner) banner.style.display = 'none';
      if (btnDelCurrent) btnDelCurrent.style.display = 'none';
    }
  }

  confirmDeleteCurrentSnapshot() {
    if (!this.activeSnapshotId) return;
    this.confirmDeleteSnapshot(this.activeSnapshotId);
  }

  async confirmDeleteSnapshot(snapshotId) {
    if (!this.hasAllPermissions()) {
      this.showToast('Haftalık arşivi silme yetkisi yalnızca tam yetkili yöneticilere aittir.', 'warning');
      return;
    }

    const snap = (this.data?.snapshots || []).find(s => s.id === snapshotId);
    if (!snap) {
      this.showToast('Silinecek haftalık arşiv bulunamadı!', 'error');
      return;
    }

    const confirmed = window.confirm(
      `⚠️ DİKKAT! Son kez teyit ediniz:\n\n` +
      `"${snap.title}" (${snap.date || 'Tarihsiz'}) haftalık arşivi KALICI OLARAK SİLİNECEKTİR.\n\n` +
      `Bu işlem geri alınamaz!\n\n` +
      `Bu haftayı silmek istediğinizden kesinlikle emin misiniz?`
    );

    if (!confirmed) {
      return;
    }

    if (this.activeSnapshotId === snapshotId) {
      this.activeSnapshotId = null;
    }

    this.data.snapshots = (this.data.snapshots || []).filter(s => s.id !== snapshotId);
    await this.saveData(this.data);

    this.renderWeeklyTimeline();
    this.renderAll();
    this.showToast(`🗑️ "${snap.title}" arşivi kalıcı olarak silindi.`, 'success');
  }

  viewSnapshot(snapshotId) {
    this.activeSnapshotId = snapshotId;
    this.renderAll();
    const snap = (this.data?.snapshots || []).find(s => s.id === snapshotId);
    this.showToast(`Arşiv inceleme modu: ${snap?.title || 'Geçmiş Hafta'} yüklendi.`, 'info');
  }

  returnToLiveSnapshot() {
    this.activeSnapshotId = null;
    this.renderAll();
    this.showToast('Canlı güncel duruma dönüldü.', 'success');
  }

  openCreateSnapshotModal() {
    if (!this.hasAllPermissions()) {
      this.showToast('Haftalık arşiv kaydetme yetkisi yalnızca tam yetkili yöneticilere aittir.', 'warning');
      return;
    }
    this.openModal('modalCreateSnapshot');
  }

  async saveCurrentWeeklySnapshot() {
    const title = document.getElementById('snapshotTitleInput')?.value.trim();
    const date = document.getElementById('snapshotDateInput')?.value;
    const notes = document.getElementById('snapshotNoteInput')?.value.trim() || '';

    if (!title || !date) {
      this.showToast('Lütfen hafta başlığını ve tarihini giriniz.', 'warning');
      return;
    }

    if (!this.data.snapshots) this.data.snapshots = [];

    const newSnap = {
      id: `snap-${Date.now()}`,
      title: title,
      date: date,
      notes: notes,
      createdAt: new Date().toISOString(),
      units: JSON.parse(JSON.stringify(this.data.units)),
      customStages: JSON.parse(JSON.stringify(this.data.customStages || []))
    };

    this.data.snapshots.push(newSnap);
    await this.saveData(this.data);

    this.closeModal('modalCreateSnapshot');
    this.renderWeeklyTimeline();
    this.showToast(`✅ "${title}" arşivi başarıyla donduruldu ve kaydedildi!`, 'success');
  }

  openCompareSnapshotsModal() {
    const selA = document.getElementById('compareSelectWeekA');
    const selB = document.getElementById('compareSelectWeekB');
    if (!selA || !selB) return;

    const snapshots = this.data?.snapshots || [];
    let optsA = '';
    let optsB = `<option value="live" selected>🔴 Canlı Güncel Durum</option>`;

    snapshots.forEach((s, idx) => {
      const isLast = idx === snapshots.length - 1;
      optsA += `<option value="${s.id}" ${isLast ? 'selected' : ''}>📅 ${s.title}</option>`;
      optsB += `<option value="${s.id}">📅 ${s.title}</option>`;
    });

    selA.innerHTML = optsA;
    selB.innerHTML = optsB;

    this.renderCompareReport();
    this.openModal('modalCompareSnapshots');
  }

  renderCompareReport() {
    const selA = document.getElementById('compareSelectWeekA')?.value;
    const selB = document.getElementById('compareSelectWeekB')?.value;
    const container = document.getElementById('compareReportContent');
    if (!container || !this.data) return;

    let unitsA = {};
    let unitsB = {};
    let titleA = 'Önceki Durum';
    let titleB = 'Sonraki Durum';

    const snapshots = this.data.snapshots || [];
    const snapA = snapshots.find(s => s.id === selA);
    if (snapA) {
      unitsA = snapA.units || {};
      titleA = snapA.title;
    }

    if (selB === 'live') {
      unitsB = this.data.units || {};
      titleB = 'Canlı Güncel Durum';
    } else {
      const snapB = snapshots.find(s => s.id === selB);
      if (snapB) {
        unitsB = snapB.units || {};
        titleB = snapB.title;
      }
    }

    let testDoneA = 0, testDoneB = 0;
    let tavanDoneA = 0, tavanDoneB = 0;
    let mesaDoneA = 0, mesaDoneB = 0;
    let changesList = [];

    const allKeys = Object.keys(this.data.units || {});
    allKeys.forEach(k => {
      const uA = unitsA[k] || {};
      const uB = unitsB[k] || {};

      if (uA.elektrikTest?.status === 'tamamlandi') testDoneA++;
      if (uB.elektrikTest?.status === 'tamamlandi') testDoneB++;

      if (uA.asmaTavan?.status === 'tamamlandi') tavanDoneA++;
      if (uB.asmaTavan?.status === 'tamamlandi') tavanDoneB++;

      if (uA.mesa?.status === 'onaylandi') mesaDoneA++;
      if (uB.mesa?.status === 'onaylandi') mesaDoneB++;

      const stA = this.getUnitOverallStatus(uA);
      const stB = this.getUnitOverallStatus(uB);
      if (stA !== stB) {
        changesList.push({
          unitName: `${uB.blockName || uA.blockName || k} - ${uB.floorName || uA.floorName || ''}`,
          oldStatus: this.formatStatusLabel(stA),
          newStatus: this.formatStatusLabel(stB)
        });
      }
    });

    const deltaTest = testDoneB - testDoneA;
    const deltaTavan = tavanDoneB - tavanDoneA;
    const deltaMesa = mesaDoneB - mesaDoneA;

    container.innerHTML = `
      <div style="background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:10px; padding:1.25rem; margin-bottom:1.5rem;">
        <h4 style="margin:0 0 0.85rem 0; color:#1e293b; font-size:1.05rem;">📊 İki Tarih Arası İlerleme & Hız Özeti</h4>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:1rem;">
          <div style="background:#ffffff; border-radius:8px; padding:1rem; border-left:4px solid #16a34a; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size:0.75rem; color:#64748b; font-weight:700;">⚡ ELEKTRİK TESTİ</div>
            <div style="font-size:1.35rem; font-weight:800; color:#1e293b; margin:4px 0;">
              ${testDoneA} ➔ ${testDoneB} 
            </div>
            <div style="font-size:0.85rem; color:${deltaTest >= 0 ? '#16a34a' : '#dc2626'}; font-weight:800;">
              ${deltaTest >= 0 ? '▲ +' : '▼ '}${deltaTest} Kat İlerleme
            </div>
          </div>
          <div style="background:#ffffff; border-radius:8px; padding:1rem; border-left:4px solid #0f766e; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size:0.75rem; color:#64748b; font-weight:700;">🏗️ ASMA TAVAN KAPATMA</div>
            <div style="font-size:1.35rem; font-weight:800; color:#1e293b; margin:4px 0;">
              ${tavanDoneA} ➔ ${tavanDoneB}
            </div>
            <div style="font-size:0.85rem; color:${deltaTavan >= 0 ? '#0f766e' : '#dc2626'}; font-weight:800;">
              ${deltaTavan >= 0 ? '▲ +' : '▼ '}${deltaTavan} Kat İlerleme
            </div>
          </div>
          <div style="background:#ffffff; border-radius:8px; padding:1rem; border-left:4px solid #9333ea; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size:0.75rem; color:#64748b; font-weight:700;">🏢 MESA KABUL ONAYI</div>
            <div style="font-size:1.35rem; font-weight:800; color:#1e293b; margin:4px 0;">
              ${mesaDoneA} ➔ ${mesaDoneB}
            </div>
            <div style="font-size:0.85rem; color:${deltaMesa >= 0 ? '#9333ea' : '#dc2626'}; font-weight:800;">
              ${deltaMesa >= 0 ? '▲ +' : '▼ '}${deltaMesa} Kat İlerleme
            </div>
          </div>
        </div>
      </div>

      <h4 style="margin:1rem 0 0.5rem 0; color:#1e293b; font-size:1rem; display:flex; justify-content:space-between; align-items:center;">
        <span>📋 Kat Bazlı İlerleme Dökümü</span>
        <span style="font-size:0.8rem; background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:12px; font-weight:700;">${changesList.length} Kat Değişti</span>
      </h4>
      ${changesList.length === 0 ? '<p style="color:#64748b; font-size:0.88rem; padding:1rem; background:#f8fafc; border-radius:8px;">Seçilen iki hafta arasında kat durumlarında herhangi bir değişiklik bulunmuyor.</p>' : `
        <div style="max-height:280px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px;">
          <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
            <thead>
              <tr style="background:#f1f5f9; text-align:left; color:#475569;">
                <th style="padding:8px 12px; border-bottom:1px solid #cbd5e1;">Kat / Mahâl</th>
                <th style="padding:8px 12px; border-bottom:1px solid #cbd5e1;">${titleA}</th>
                <th style="padding:8px 12px; border-bottom:1px solid #cbd5e1;">${titleB}</th>
              </tr>
            </thead>
            <tbody>
              ${changesList.map(c => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:8px 12px; font-weight:700;">${c.unitName}</td>
                  <td style="padding:8px 12px; color:#64748b;">${c.oldStatus}</td>
                  <td style="padding:8px 12px; font-weight:700; color:#0f766e;">➔ ${c.newStatus}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  }

  formatStatusLabel(st) {
    if (st === 'tavan_done') return '🏗️ Tavan Kapandı';
    if (st === 'done') return '⚡ Test Başarılı';
    if (st === 'ready') return '⚡ Teste Hazır';
    if (st === 'mesa_wait') return '🏢 MESA Bekliyor';
    if (st === 'in_progress') return '🚧 İmalat Sürüyor';
    if (st && st.endsWith('_done')) {
      const stageId = st.replace('_done', '');
      const cs = (this.data?.customStages || []).find(s => s.id === stageId);
      return cs ? `${cs.icon} ${cs.name} Bitti` : 'Tamamlandı';
    }
    return '⏳ Bekliyor';
  }

  // --- DİNAMİK AŞAMA / İMALAT YÖNETİMİ (EKLE, DÜZENLE, SİL) ---
  openNewStageModal() {
    if (!this.hasAllPermissions()) {
      this.showToast('Özel imalat ekleme ve silme yetkisi yalnızca tam yetkili yöneticilere aittir.', 'warning');
      return;
    }
    this.renderCustomStagesList();
    this.openModal('modalNewStage');
  }

  renderCustomStagesListInModal() {
    const container = document.getElementById('modalExistingStagesList');
    const badge = document.getElementById('customStagesCountBadge');
    if (!container) return;

    const stages = this.data?.customStages || [];
    if (badge) badge.textContent = stages.length;

    if (stages.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 1.25rem 0.5rem; color: #94a3b8; font-size: 0.78rem; background: #f8fafc; border-radius: 6px; border: 1.5px dashed #cbd5e1;">
          Henüz eklenmiş özel bir imalat bulunmuyor. Yukarıdaki formu kullanarak yeni iş kalemi ekleyebilirsiniz.
        </div>
      `;
      return;
    }

    const prereqNames = {
      'none': 'Ön şartsız (Bağımsız)',
      'asmaTavan': '6. Asma Tavan Kapatma',
      'mesa': '5. MESA Tavan Kapama Onayı',
      'mekanik2': '4. 2. Cil Mekanik İşleri',
      'elektrikTest': '3. Elektrik Testi',
      'klima': '2. Klima İmalatı',
      'mekanik': '1. Mekanik İmalatı'
    };

    let html = '';
    stages.forEach(cs => {
      const csBg = cs.bg || this.getSoftTintFromHex(cs.color);
      const csBorder = cs.borderColor || cs.color;
      const csText = cs.textColor || this.getDarkTextFromHex(cs.color);

      let prereqText = prereqNames[cs.prerequisiteStage];
      if (!prereqText) {
        const parentStage = stages.find(s => s.id === cs.prerequisiteStage);
        prereqText = parentStage ? `${parentStage.icon} ${parentStage.name}` : cs.prerequisiteStage;
      }

      html += `
        <div class="stage-manage-card" style="display: flex; justify-content: space-between; align-items: center; padding: 0.55rem 0.75rem; background: #ffffff; border: 1.5px solid #e2e8f0; border-left: 4px solid ${cs.color}; border-radius: 6px; gap: 0.65rem;">
          <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0; flex: 1;">
            <div style="font-size: 1.15rem; width: 32px; height: 32px; min-width: 32px; border-radius: 6px; background: ${csBg}; display: flex; align-items: center; justify-content: center; border: 1px solid ${csBorder};">
              ${cs.icon}
            </div>
            <div style="min-width: 0; flex: 1;">
              <div style="font-weight: 800; font-size: 0.82rem; color: #0f172a; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(cs.name)}</span>
                <span class="sub-badge" style="background: ${csBg}; color: ${csText}; border: 1px solid ${csBorder}; font-weight: 800; font-size: 9px; padding: 1px 5px; border-radius: 3px;">${cs.code}</span>
              </div>
              <div style="font-size: 0.7rem; color: #64748b; margin-top: 1px;">
                <span>Ön Şart: <strong>${this.escapeHtml(prereqText)}</strong></span>
                ${cs.company ? ` • <span>${this.escapeHtml(cs.company)}</span>` : ''}
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
            <button type="button" class="btn btn-sm btn-outline" onclick="app.editCustomStage('${cs.id}')" title="${this.escapeHtml(cs.name)} imalatını düzenle" style="padding: 0.25rem 0.55rem; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 3px; font-weight: 700; border-color: #cbd5e1; background: #ffffff; color: #0f172a;">
              <span>✏️ Düzenle</span>
            </button>
            <button type="button" class="btn btn-sm btn-danger" onclick="app.deleteCustomStage('${cs.id}')" title="${this.escapeHtml(cs.name)} imalatını sil" style="padding: 0.25rem 0.6rem; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 3px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-weight: 700;">
              <span>🗑️ Sil</span>
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  editCustomStage(stageId) {
    const cs = (this.data?.customStages || []).find(s => s.id === stageId);
    if (!cs) return;

    this.editingStageId = stageId;

    const nameEl = document.getElementById('newStageName');
    const codeEl = document.getElementById('newStageCode');
    const iconEl = document.getElementById('newStageIcon');
    const prereqEl = document.getElementById('newStagePrereq');
    const compEl = document.getElementById('newStageDefaultCompany');
    const banner = document.getElementById('stageEditModeBanner');
    const bannerText = document.getElementById('stageEditModeText');
    const titleEl = document.getElementById('newStageModalTitle');
    const saveBtnText = document.getElementById('btnSaveStageText');

    if (nameEl) nameEl.value = cs.name || '';
    if (codeEl) codeEl.value = cs.code || '';
    if (iconEl) iconEl.value = cs.icon || '💡';
    if (prereqEl) prereqEl.value = cs.prerequisiteStage || 'none';
    if (compEl) compEl.value = cs.company || '';

    this.updateNewStageColorPreview(cs.color || '#db2777');

    if (banner) banner.style.display = 'flex';
    if (bannerText) bannerText.textContent = `"${cs.name}" imalatı düzenleniyor`;
    if (titleEl) titleEl.textContent = `✏️ İmalat Düzenle: ${cs.name}`;
    if (saveBtnText) saveBtnText.textContent = 'Değişiklikleri Kaydet';

    const modalBody = document.querySelector('#modalNewStage .modal-body');
    if (modalBody) modalBody.scrollTop = 0;
  }

  cancelEditStage(silent = false) {
    this.editingStageId = null;

    const nameEl = document.getElementById('newStageName');
    const codeEl = document.getElementById('newStageCode');
    const iconEl = document.getElementById('newStageIcon');
    const prereqEl = document.getElementById('newStagePrereq');
    const compEl = document.getElementById('newStageDefaultCompany');
    const banner = document.getElementById('stageEditModeBanner');
    const titleEl = document.getElementById('newStageModalTitle');
    const saveBtnText = document.getElementById('btnSaveStageText');

    if (nameEl) nameEl.value = '';
    if (codeEl) codeEl.value = '';
    if (iconEl) iconEl.value = '💡';
    if (prereqEl) prereqEl.value = 'asmaTavan';
    if (compEl) compEl.value = '';

    this.updateNewStageColorPreview('#db2777');

    if (banner) banner.style.display = 'none';
    if (titleEl) titleEl.textContent = '🛠️ Özel İmalat Yönetimi (Ekle & Sil)';
    if (saveBtnText) saveBtnText.textContent = 'Aşamayı Oluştur ve Başlat';

    if (!silent) {
      this.showToast('Yeni imalat ekleme moduna dönüldü.', 'info');
    }
  }

  async saveNewStage() {
    const name = document.getElementById('newStageName')?.value.trim();
    const code = document.getElementById('newStageCode')?.value.trim().toUpperCase();
    const icon = document.getElementById('newStageIcon')?.value.trim() || '💡';
    const colorPicker = document.getElementById('newStageColorPicker');
    const colorHex = document.getElementById('newStageColorHex');
    const color = colorPicker?.value || colorHex?.value || '#db2777';
    const prereq = document.getElementById('newStagePrereq')?.value || 'asmaTavan';
    const company = document.getElementById('newStageDefaultCompany')?.value.trim() || '';

    if (!name || !code) {
      this.showToast('Lütfen aşama adını ve kısaltma kodunu giriniz.', 'warning');
      return;
    }

    if (!this.data.customStages) this.data.customStages = [];

    if (this.editingStageId) {
      // Edit existing stage in place
      const stage = this.data.customStages.find(s => s.id === this.editingStageId);
      if (stage) {
        stage.name = name;
        stage.code = code;
        stage.icon = icon;
        stage.color = color;
        stage.bg = this.getSoftTintFromHex(color);
        stage.borderColor = color;
        stage.textColor = this.getDarkTextFromHex(color);
        stage.prerequisiteStage = prereq;
        stage.company = company;

        if (company && this.data.units) {
          Object.values(this.data.units).forEach(u => {
            if (u[stage.id] && !u[stage.id].company) {
              u[stage.id].company = company;
            }
          });
        }
      }
      const updatedName = name;
      this.cancelEditStage(true);
      await this.saveData(this.data);
      this.renderAll();
      this.renderCustomStagesListInModal();
      this.showToast(`✅ "${updatedName}" imalatı başarıyla güncellendi!`, 'success');
      return;
    }

    // New stage creation
    const stageId = 'stage_' + Date.now().toString(36);
    const newStage = {
      id: stageId,
      name: name,
      code: code,
      icon: icon,
      color: color,
      bg: this.getSoftTintFromHex(color),
      borderColor: color,
      textColor: this.getDarkTextFromHex(color),
      prerequisiteStage: prereq,
      company: company,
      order: 6 + this.data.customStages.length
    };

    this.data.customStages.push(newStage);
    this.data.stagesInitialized = true;

    // Initialize on all units
    Object.values(this.data.units).forEach(u => {
      const isPrereqDone = prereq === 'none' ||
        (prereq === 'asmaTavan' && u.asmaTavan?.status === 'tamamlandi') ||
        (prereq === 'elektrikTest' && u.elektrikTest?.status === 'tamamlandi') ||
        (prereq === 'mesa' && u.mesa?.status === 'onaylandi') ||
        (u[prereq]?.status === 'tamamlandi');

      u[stageId] = {
        status: isPrereqDone ? 'hazir' : 'kilitli',
        date: '',
        company: company,
        note: ''
      };
    });

    await this.saveData(this.data);
    this.cancelEditStage(true);
    this.renderAll();
    this.renderCustomStagesListInModal();
    this.showToast(`✅ "${name}" aşaması başarıyla eklendi ve tüm katlara uygulandı!`, 'success');
  }

  async deleteCustomStage(stageId) {
    if (!this.requireLogin('İmalat silmek için lütfen yönetici girişi yapınız.')) return;
    if (!this.isAdmin) {
      this.showToast('İmalat silme yetkisi yalnızca yöneticilere aittir.', 'warning');
      return;
    }

    const stage = (this.data?.customStages || []).find(s => s.id === stageId);
    if (!stage) {
      this.showToast('Silinecek imalat bulunamadı.', 'error');
      return;
    }

    const confirmMsg = `"${stage.name}" imalatını ve bu aşamaya ait 80 kattaki tüm takip verilerini kalıcı olarak silmek istediğinize emin misiniz?`;
    if (!confirm(confirmMsg)) {
      return;
    }

    // If currently editing this stage, cancel edit
    if (this.editingStageId === stageId) {
      this.cancelEditStage(true);
    }

    // 1. Remove from customStages array
    this.data.customStages = (this.data.customStages || []).filter(s => s.id !== stageId);
    this.data.stagesInitialized = true;

    // 2. Remove stage property from all units
    if (this.data.units) {
      Object.values(this.data.units).forEach(u => {
        if (u && u[stageId]) {
          delete u[stageId];
        }
      });
    }

    // 3. Fix any custom stages that had this stage as prerequisite
    (this.data.customStages || []).forEach(cs => {
      if (cs.prerequisiteStage === stageId) {
        cs.prerequisiteStage = 'asmaTavan';
      }
    });

    // 4. Update prerequisite options in modal if open
    const prereqSelect = document.getElementById('newStagePrereq');
    if (prereqSelect) {
      let opts = `
        <option value="asmaTavan" selected>5. Asma Tavan Kapatma bittikten sonra başlasın</option>
        <option value="elektrikTest">4. Elektrik Testi bittikten sonra başlasın</option>
        <option value="mesa">3. MESA Kabul Onayı bittikten sonra başlasın</option>
        <option value="none">Ön şart olmadan bağımsız başlasın</option>
      `;
      (this.data?.customStages || []).forEach(cs => {
        opts += `<option value="${cs.id}">${cs.icon} ${cs.name} bittikten sonra başlasın</option>`;
      });
      prereqSelect.innerHTML = opts;
    }

    // 5. Save to storage & cloud
    await this.saveData(this.data);

    // 6. Re-render UI
    this.renderAll();

    // 7. Refresh modal lists
    this.renderCustomStagesListInModal();
    if (document.getElementById('modalColorSettings')?.classList.contains('active')) {
      this.openColorSettingsModal();
    }

    this.showToast(`🗑️ "${stage.name}" imalatı başarıyla silindi ve tüm katlardan kaldırıldı.`, 'success');
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
    if (!u) return 'waiting';
    if (this.data?.customStages) {
      for (let i = this.data.customStages.length - 1; i >= 0; i--) {
        const cs = this.data.customStages[i];
        if (u[cs.id]?.status === 'tamamlandi') {
          return `${cs.id}_done`;
        }
      }
    }
    if (u.asmaTavan?.status === 'tamamlandi') return 'tavan_done';
    if (u.mesa?.status === 'onaylandi') return 'done';
    if (u.elektrikTest?.status === 'tamamlandi' && u.mekanik2?.status === 'tamamlandi') return 'mesa_wait';
    if (u.elektrikTest?.status === 'tamamlandi') return 'in_progress';
    if (u.elektrikTest?.status === 'hazir' || (u.mekanik?.status === 'tamamlandi' && u.klima?.status === 'tamamlandi')) return 'ready';
    if (u.mekanik?.status === 'devam' || u.klima?.status === 'devam' || u.mekanik2?.status === 'devam' || u.elektrikTest?.status === 'suruyor' || u.asmaTavan?.status === 'devam') return 'in_progress';
    return 'waiting';
  }

  renderMatrix() {
    const table = document.getElementById('matrixTable');
    if (!table || !this.data) return;

    const blocks = this.data.blocks;
    const floors = this.data.floors; // ordered top to bottom: Çatı down to B2
    const currentUnits = this.getCurrentUnits();

    let html = '<thead><tr><th class="floor-col-header">Kat / Blok</th>';
    blocks.forEach(b => {
      html += `<th>${b.name}</th>`;
    });
    html += '</tr></thead><tbody>';

    floors.forEach(f => {
      html += `<tr><td class="floor-label-cell">🏢 ${f.name}</td>`;

      blocks.forEach(b => {
        const uKey = `${b.id}_${f.id}`;
        const u = currentUnits[uKey] || {
          id: uKey, blockId: b.id, floorId: f.id,
          mekanik: { status: 'bekliyor' },
          klima: { status: 'bekliyor' },
          mesa: { status: 'bekliyor' },
          elektrikTest: { status: 'kilitli' },
          asmaTavan: { status: 'kilitli' }
        };

        const overall = this.getUnitOverallStatus(u);

        // Apply filter dimming
        let isFilteredIn = true;
        if (this.matrixFilter === 'ready' && overall !== 'ready') isFilteredIn = false;
        if (this.matrixFilter === 'mesa_wait' && overall !== 'mesa_wait') isFilteredIn = false;
        if (this.matrixFilter === 'prereq_wait' && (overall === 'done' || overall === 'ready' || overall === 'mesa_wait' || overall === 'tavan_done' || overall.endsWith('_done'))) isFilteredIn = false;
        if (this.matrixFilter === 'done' && overall !== 'done' && overall !== 'tavan_done' && !overall.endsWith('_done')) isFilteredIn = false;
        if (this.matrixFilter === 'tavan_done' && overall !== 'tavan_done') isFilteredIn = false;

        let cellClass = 'matrix-cell';
        let customInlineStyle = '';

        if (overall === 'tavan_done') {
          cellClass += ' status-tavan-done';
        } else if (overall === 'done') {
          cellClass += ' status-test-done';
        } else if (overall === 'ready') {
          cellClass += ' status-test-ready';
        } else if (overall === 'mesa_wait') {
          cellClass += ' status-mesa-wait';
        } else if (overall === 'in_progress') {
          cellClass += ' status-in-progress';
        } else if (overall.endsWith('_done')) {
          cellClass += ' status-custom-done';
          const stageId = overall.replace('_done', '');
          const cs = (this.data.customStages || []).find(s => s.id === stageId);
          if (cs) {
            const csBg = cs.bg || this.getSoftTintFromHex(cs.color);
            const csBorder = cs.borderColor || cs.color;
            const csText = cs.textColor || this.getDarkTextFromHex(cs.color);
            customInlineStyle = `background: ${csBg} !important; border-color: ${csBorder} !important; color: ${csText} !important;`;
          }
        } else {
          cellClass += ' status-waiting';
        }

        const opacityStyle = isFilteredIn ? 'opacity: 1;' : 'opacity: 0.25; filter: grayscale(80%);';

        const isMekDone = u.mekanik?.status === 'tamamlandi';
        const isKliDone = u.klima?.status === 'tamamlandi';
        const isTestDone = u.elektrikTest?.status === 'tamamlandi';
        const isMek2Done = u.mekanik2?.status === 'tamamlandi';
        const isMesaApproved = u.mesa?.status === 'onaylandi';
        const isTavanDone = u.asmaTavan?.status === 'tamamlandi';

        // 1. Kat Bitme Yüzdesi (6 ana aşama + varsa özel aşamalar)
        let doneStagesCount = 0;
        const totalUnitStages = 6 + (this.data.customStages || []).length;
        if (isMekDone) doneStagesCount++;
        if (isKliDone) doneStagesCount++;
        if (isTestDone) doneStagesCount++;
        if (isMek2Done) doneStagesCount++;
        if (isMesaApproved) doneStagesCount++;
        if (isTavanDone) doneStagesCount++;
        (this.data.customStages || []).forEach(cs => {
          if (u[cs.id]?.status === 'tamamlandi') doneStagesCount++;
        });

        const completionPct = Math.round((doneStagesCount / totalUnitStages) * 100);

        // 2. Büyük Çerçeve Rengi: Kırmızıdan yeşile doğru ara renk skalası
        // %0: Kırmızı -> %20: Turuncu -> %40: Kehribar -> %60: Fıstık Yeşili -> %80: Açık Yeşil -> %100: Koyu Zümrüt Yeşili
        let frameBorderColor = '#ef4444'; // %0 Kırmızı
        if (completionPct >= 100) frameBorderColor = '#059669'; // %100 Koyu Zümrüt Yeşili
        else if (completionPct >= 80) frameBorderColor = '#22c55e'; // %80 Açık Yeşil
        else if (completionPct >= 60) frameBorderColor = '#84cc16'; // %60 Fıstık Yeşili
        else if (completionPct >= 40) frameBorderColor = '#f59e0b'; // %40 Kehribar / Turuncu
        else if (completionPct >= 20) frameBorderColor = '#f97316'; // %20 Kırmızı-Turuncu

        // 3. Alt Rozetler (Bitenler -> Yeşil 'ok', Bekleyenler -> Kırmızı 'wait', Sürenler -> Sarı 'prog', Hazır -> Mavi 'test-ready' / 'tavan-ready')
        const bMek = isMekDone ? 'ok' : (u.mekanik?.status === 'devam' ? 'prog' : 'wait');
        const bKli = isKliDone ? 'ok' : (u.klima?.status === 'devam' ? 'prog' : 'wait');
        const bTest = isTestDone ? 'ok' : (u.elektrikTest?.status === 'suruyor' ? 'prog' : (u.elektrikTest?.status === 'hazir' || (isMekDone && isKliDone) ? 'test-ready' : 'wait'));
        const bMek2 = isMek2Done ? 'ok' : (u.mekanik2?.status === 'devam' ? 'prog' : 'wait');
        const bMesa = isMesaApproved ? 'ok' : (u.mesa?.status === 'revizyon' ? 'rev' : 'wait');
        const bTavan = isTavanDone ? 'ok' : (u.asmaTavan?.status === 'devam' ? 'prog' : (isMesaApproved ? 'tavan-ready' : 'wait'));

        // Custom badges (Biten yeşil, bekleyen kırmızı)
        let customBadgesHtml = '';
        (this.data.customStages || []).forEach(cs => {
          const isDone = u[cs.id]?.status === 'tamamlandi';
          const isProg = u[cs.id]?.status === 'devam';
          const bStyle = isDone
            ? "background: #dcfce7 !important; color: #14532d !important; border: 1.5px solid #22c55e !important; font-weight: 900;"
            : (isProg ? "background: #fef3c7 !important; color: #92400e !important; border: 1.5px solid #f59e0b !important; font-weight: 800;" : "background: #fee2e2 !important; color: #991b1b !important; border: 1.5px solid #ef4444 !important; font-weight: 900;");
          customBadgesHtml += `<span class="sub-badge" style="${bStyle}" title="${cs.name}: ${u[cs.id]?.status || 'kilitli'}">${cs.code}</span>`;
        });

        let mainLabel = 'Başlanmadı';
        if (overall === 'tavan_done') mainLabel = '🏗️ Tavan Kapandı';
        else if (overall === 'done') mainLabel = '✅ MESA Onayladı';
        else if (overall === 'mesa_wait') mainLabel = '🏢 MESA Bekliyor';
        else if (overall === 'ready') mainLabel = '⚡ TESTE HAZIR';
        else if (overall === 'in_progress') mainLabel = '🚧 İmalat Sürüyor';
        else if (overall.endsWith('_done')) {
          const stageId = overall.replace('_done', '');
          const cs = (this.data.customStages || []).find(s => s.id === stageId);
          mainLabel = cs ? `${cs.icon} ${cs.name}` : 'Tamamlandı';
        }

        html += `
          <td class="${cellClass}" style="${opacityStyle} border: 2.5px solid ${frameBorderColor} !important; ${customInlineStyle}" onclick="app.openEditUnitModal('${uKey}')" title="${b.name} - ${f.name} (İlerleme: %${completionPct} - ${doneStagesCount}/${totalUnitStages} Aşama Tamamlandı)">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 2px;">
              <span class="cell-main-title" style="flex: 1; text-align: left;">${mainLabel}</span>
              <span class="cell-pct-pill" style="font-size: 0.62rem; font-weight: 800; color: ${frameBorderColor}; background: rgba(255,255,255,0.85); padding: 0.5px 3.5px; border-radius: 4px; border: 1px solid ${frameBorderColor}; margin-left: 3px; flex-shrink: 0;">%${completionPct}</span>
            </div>
            <div class="cell-badges">
              <span class="sub-badge ${bMek}" title="1. Mekanik: ${u.mekanik?.status || 'bekliyor'}">1M</span>
              <span class="sub-badge ${bKli}" title="2. Klima: ${u.klima?.status || 'bekliyor'}">K</span>
              <span class="sub-badge ${bTest}" title="3. Elektrik Testi: ${u.elektrikTest?.status || 'kilitli'}">T</span>
              <span class="sub-badge ${bMek2}" title="4. 2. Cil Mekanik: ${u.mekanik2?.status || 'bekliyor'}">2M</span>
              <span class="sub-badge ${bMesa}" title="5. MESA Onayı: ${u.mesa?.status || 'bekliyor'}">MS</span>
              <span class="sub-badge ${bTavan}" title="6. Asma Tavan: ${u.asmaTavan?.status || 'kilitli'}">AT</span>
              ${customBadgesHtml}
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

    const currentUnits = this.getCurrentUnits();
    const floors = this.data.floors;
    let bMekCount = 0, bKlimaCount = 0, bMesaCount = 0, bReadyCount = 0, bDoneCount = 0;

    floors.forEach(f => {
      const uKey = `${this.activeBlockId}_${f.id}`;
      const u = currentUnits[uKey];
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
      const u = currentUnits[uKey] || {};
      const overall = this.getUnitOverallStatus(u);

      let cardClass = 'floor-card';
      let overallBadge = '<span class="floor-status-badge badge-wait">Başlanmadı</span>';

      if (overall === 'tavan_done') {
        cardClass += ' card-tavan-done';
        overallBadge = '<span class="floor-status-badge badge-ok" style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0;">🏗️ ASMA TAVAN KAPATILDI</span>';
      } else if (overall === 'done') {
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
      } else if (overall.endsWith('_done')) {
        const stageId = overall.replace('_done', '');
        const cs = (this.data?.customStages || []).find(s => s.id === stageId);
        cardClass += ' card-custom-done';
        overallBadge = `<span class="floor-status-badge badge-ok" style="background:${cs ? cs.color : '#db2777'}; color:#fff; border:1px solid ${cs ? cs.color : '#db2777'};">${cs ? cs.icon : '✨'} ${(cs ? cs.name : 'AŞAMA').toUpperCase()} BİTTİ</span>`;
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

      // Test format
      const isTestDone = u.elektrikTest?.status === 'tamamlandi';
      const isTestReady = u.elektrikTest?.status === 'hazir' || (isMekDone && isKliDone);
      let testBadge = '<span class="stage-val-badge badge-locked">🔒 Kilitli</span>';
      if (isTestDone) testBadge = '<span class="stage-val-badge badge-ok">Başarılı ✓</span>';
      else if (isTestReady) testBadge = '<span class="stage-val-badge badge-ready">⚡ TESTE HAZIR</span>';
      else if (u.elektrikTest?.status === 'suruyor') testBadge = '<span class="stage-val-badge badge-prog">Test Yapılıyor</span>';

      // 2. Cil Mekanik format
      const isMek2Done = u.mekanik2?.status === 'tamamlandi';
      const mek2Badge = isMek2Done
        ? '<span class="stage-val-badge badge-ok">Tamamlandı ✓</span>'
        : (u.mekanik2?.status === 'devam' ? '<span class="stage-val-badge badge-prog">Sürüyor</span>' : '<span class="stage-val-badge badge-wait">Bekliyor</span>');

      // MESA format
      const isMesaApproved = u.mesa?.status === 'onaylandi';
      let mesaBadge = '<span class="stage-val-badge badge-locked">🔒 Test & 2. Cil Bekleniyor</span>';
      if (isMesaApproved) mesaBadge = '<span class="stage-val-badge badge-ok">MESA Onayladı ✓</span>';
      else if (u.mesa?.status === 'revizyon') mesaBadge = '<span class="stage-val-badge badge-rev">Revizyon İsteği</span>';
      else if (isTestDone && isMek2Done) mesaBadge = '<span class="stage-val-badge badge-ready" style="background:#faf5ff; color:#7c3aed;">Onay Bekliyor</span>';

      // Asma Tavan format
      const isTavanDone = u.asmaTavan?.status === 'tamamlandi';
      let tavanBadge = '<span class="stage-val-badge badge-locked">🔒 MESA Bekleniyor</span>';
      if (isTavanDone) tavanBadge = '<span class="stage-val-badge badge-ok" style="background:#ecfdf5; color:#059669;">Tavan Kapandı ✓</span>';
      else if (u.asmaTavan?.status === 'devam') tavanBadge = '<span class="stage-val-badge badge-prog">Kapatılıyor</span>';
      else if (isMesaApproved) tavanBadge = '<span class="stage-val-badge badge-ready">⚡ Kapatmaya Hazır</span>';

      // Check for meeting actions on this unit
      const unitActions = (this.data.meetingActions || []).filter(a => 
        a.unitId === uKey || (String(a.blockId) === String(this.activeBlockId) && a.floorId === f.id)
      );
      const activeUnitActions = unitActions.filter(a => a.status !== 'tamamlandi');
      let actionAlertHtml = '';
      if (activeUnitActions.length > 0) {
        const hasOverdue = activeUnitActions.some(a => this.getActionDelayMetrics(a).isOverdue);
        const alertBg = hasOverdue 
          ? 'background:#fef2f2; color:#b91c1c; border:1px solid #fca5a5;' 
          : 'background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;';
        actionAlertHtml = `
          <div class="floor-action-alert" style="${alertBg}" onclick="event.stopPropagation(); app.filterMeetingsByUnit('${this.activeBlockId}', '${f.id}')">
            <span>${hasOverdue ? '⚠️' : '🗓️'}</span>
            <span>${activeUnitActions.length} Toplantı Sözü (${hasOverdue ? 'Gecikmede' : 'Devam'})</span>
          </div>
        `;
      }

      floorsHtml += `
        <div class="${cardClass}">
          <div class="floor-card-header">
            <div class="floor-badge-title">
              <span class="floor-badge-pill">${f.short}</span>
              <span class="floor-title-text">${curBlock.name} - ${f.name}</span>
              ${actionAlertHtml}
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

            <!-- 3. Elektrik Testi -->
            <div class="stage-box" style="background: #f0fdf4;">
              <div class="stage-header">
                <span class="stage-name" style="color: #16a34a;">⚡ 3. Elektrik Test</span>
                ${testBadge}
              </div>
              <div class="stage-detail" title="${u.elektrikTest?.note || ''}">
                ${u.elektrikTest?.date ? `📅 ${u.elektrikTest.date}` : (isTestReady ? '⚡ Teste Girebilir' : 'Mekanik & Klima bekleniyor')}
                ${u.elektrikTest?.reportNo ? ` • Rapor: ${u.elektrikTest.reportNo}` : ''}
              </div>
            </div>

            <!-- 4. 2. Cil Mekanik -->
            <div class="stage-box" style="background: #fff7ed;">
              <div class="stage-header">
                <span class="stage-name" style="color: #ea580c;">🔩 4. 2. Cil Mekanik</span>
                ${mek2Badge}
              </div>
              <div class="stage-detail" title="${u.mekanik2?.note || ''}">
                ${u.mekanik2?.date ? `📅 ${u.mekanik2.date}` : 'Tarih girilmedi'}
                ${u.mekanik2?.note ? ` • ${u.mekanik2.note}` : ''}
              </div>
            </div>

            <!-- 5. MESA Tavan Kapama Onayı -->
            <div class="stage-box" style="background: #faf5ff;">
              <div class="stage-header">
                <span class="stage-name" style="color: #7c3aed;">🏢 5. MESA Kapama Onayı</span>
                ${mesaBadge}
              </div>
              <div class="stage-detail" title="${u.mesa?.officer || ''} ${u.mesa?.docNo || ''}">
                ${u.mesa?.date ? `📅 ${u.mesa.date}` : (isTestDone && isMek2Done ? 'MESA Onayına Hazır' : 'Test ve 2. cil mekanik bekleniyor')}
                ${u.mesa?.officer ? ` • ${u.mesa.officer}` : ''}
                ${u.mesa?.docNo ? ` • Tut: ${u.mesa.docNo}` : ''}
              </div>
            </div>

            <!-- 6. Asma Tavan -->
            <div class="stage-box" style="background: #ecfdf5;">
              <div class="stage-header">
                <span class="stage-name" style="color: #059669;">🏗️ 6. Asma Tavan</span>
                ${tavanBadge}
              </div>
              <div class="stage-detail" title="${u.asmaTavan?.note || ''}">
                ${u.asmaTavan?.date ? `📅 ${u.asmaTavan.date}` : (isMesaApproved ? '⚡ Tavan Kapatmaya Hazır' : 'MESA onayı bekleniyor')}
                ${u.asmaTavan?.company ? ` • ${u.asmaTavan.company}` : ''}
              </div>
            </div>

            <!-- Dinamik Aşamalar -->
            ${(this.data?.customStages || []).map(cs => {
              const csData = u[cs.id] || {};
              const isCsDone = csData.status === 'tamamlandi';
              let csBadge = '<span class="stage-val-badge badge-locked">🔒 Bekleniyor</span>';
              if (isCsDone) csBadge = `<span class="stage-val-badge badge-ok" style="background:${cs.color}; color:#fff;">Tamamlandı ✓</span>`;
              else if (csData.status === 'devam') csBadge = '<span class="stage-val-badge badge-prog">Sürüyor</span>';
              else if (csData.status === 'hazir') csBadge = '<span class="stage-val-badge badge-ready">Hazır</span>';
              return `
                <div class="stage-box" style="border-left: 3px solid ${cs.color};">
                  <div class="stage-header">
                    <span class="stage-name" style="color: ${cs.color};">${cs.icon} ${cs.name}</span>
                    ${csBadge}
                  </div>
                  <div class="stage-detail" title="${csData.note || ''}">
                    ${csData.date ? `📅 ${csData.date}` : 'Tarih yok'}
                    ${csData.company ? ` • ${csData.company}` : ''}
                    ${csData.note ? ` • ${csData.note}` : ''}
                  </div>
                </div>
              `;
            }).join('')}
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

    let units = Object.values(this.getCurrentUnits());

    // Filter
    units = units.filter(u => {
      // Block
      if (blockFilter !== 'all' && String(u.blockId) !== blockFilter) return false;

      // Status
      const overall = this.getUnitOverallStatus(u);
      if (statusFilter === 'ready' && overall !== 'ready') return false;
      if (statusFilter === 'mesa_wait' && overall !== 'mesa_wait') return false;
      if (statusFilter === 'prereq_wait' && (overall === 'done' || overall === 'ready' || overall === 'mesa_wait' || overall === 'tavan_done' || overall.endsWith('_done'))) return false;
      if (statusFilter === 'done' && overall !== 'done') return false;
      if (statusFilter === 'tavan_done' && overall !== 'tavan_done') return false;

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
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #64748b;">Arama kriterlerine uygun kat bulunamadı.</td></tr>`;
      return;
    }

    let html = '';
    units.forEach(u => {
      const overall = this.getUnitOverallStatus(u);

      const isMekDone = u.mekanik?.status === 'tamamlandi';
      const isKliDone = u.klima?.status === 'tamamlandi';
      const isMek2Done = u.mekanik2?.status === 'tamamlandi';
      const isMesaApproved = u.mesa?.status === 'onaylandi';
      const isTestDone = u.elektrikTest?.status === 'tamamlandi';
      const isTavanDone = u.asmaTavan?.status === 'tamamlandi';

      let testBadge = '<span class="stage-val-badge badge-locked">🔒 Kilitli</span>';
      if (isTestDone) testBadge = '<span class="stage-val-badge badge-ok">✅ Başarılı</span>';
      else if (u.elektrikTest?.status === 'hazir') testBadge = '<span class="stage-val-badge badge-ready">⚡ TESTE HAZIR</span>';
      else if (u.elektrikTest?.status === 'suruyor') testBadge = '<span class="stage-val-badge badge-prog">🔄 Test Ediliyor</span>';

      let tavanBadge = '<span class="stage-val-badge badge-locked">🔒 MESA Bekleniyor</span>';
      if (isTavanDone) tavanBadge = '<span class="stage-val-badge badge-ok" style="background:#ecfdf5; color:#059669;">✅ Tavan Kapandı</span>';
      else if (u.asmaTavan?.status === 'devam') tavanBadge = '<span class="stage-val-badge badge-prog">🚧 Kapatılıyor</span>';
      else if (isMesaApproved) tavanBadge = '<span class="stage-val-badge badge-ready">⚡ Kapatmaya Hazır</span>';

      let customBadges = '';
      (this.data?.customStages || []).forEach(cs => {
        const csData = u[cs.id] || {};
        const isCsDone = csData.status === 'tamamlandi';
        let b = '<span class="stage-val-badge badge-locked">🔒 Bekleniyor</span>';
        if (isCsDone) b = `<span class="stage-val-badge badge-ok" style="background:${cs.color}; color:#fff;">✓ ${cs.name}</span>`;
        else if (csData.status === 'devam') b = '<span class="stage-val-badge badge-prog">🚧 Sürüyor</span>';
        else if (csData.status === 'hazir') b = '<span class="stage-val-badge badge-ready">⚡ Hazır</span>';
        customBadges += `<div style="margin-top:2px;">${b}</div>`;
      });

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
            ${testBadge}
            <div style="font-size:0.7rem; color:#64748b;">${u.elektrikTest?.date || ''} ${u.elektrikTest?.reportNo ? `(${u.elektrikTest.reportNo})` : ''}</div>
          </td>
          <td>
            ${isMek2Done ? '<span class="stage-val-badge badge-ok">✓ Tamamlandı</span>' : (u.mekanik2?.status === 'devam' ? '<span class="stage-val-badge badge-prog">Sürüyor</span>' : '<span class="stage-val-badge badge-wait">Bekliyor</span>')}
            <div style="font-size:0.7rem; color:#64748b;">${u.mekanik2?.date || ''}</div>
          </td>
          <td>
            ${isMesaApproved ? '<span class="stage-val-badge badge-ok">✓ MESA Onayladı</span>' : (u.mesa?.status === 'revizyon' ? '<span class="stage-val-badge badge-rev">Revizyon</span>' : (!isTestDone || !isMek2Done ? '<span class="stage-val-badge badge-locked">🔒 Test & 2. Cil Bekleniyor</span>' : '<span class="stage-val-badge badge-prog" style="background:#faf5ff; color:#7c3aed;">Onay Bekliyor</span>'))}
            <div style="font-size:0.7rem; color:#64748b;">${u.mesa?.officer || ''} ${u.mesa?.docNo ? `(${u.mesa.docNo})` : ''}</div>
          </td>
          <td>
            ${tavanBadge}
            <div style="font-size:0.7rem; color:#64748b;">${u.asmaTavan?.date || ''}</div>
            ${customBadges}
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

    const currentUnits = this.getCurrentUnits();
    let html = '';
    this.data.blocks.forEach(b => {
      let bMek = 0, bKli = 0, bMesa = 0, bReady = 0, bTest = 0, bTavan = 0;

      this.data.floors.forEach(f => {
        const u = currentUnits[`${b.id}_${f.id}`];
        if (u) {
          if (u.mekanik?.status === 'tamamlandi') bMek++;
          if (u.klima?.status === 'tamamlandi') bKli++;
          if (u.mesa?.status === 'onaylandi') bMesa++;
          if (u.elektrikTest?.status === 'hazir') bReady++;
          if (u.elektrikTest?.status === 'tamamlandi') bTest++;
          if (u.asmaTavan?.status === 'tamamlandi') bTavan++;
        }
      });

      const mekPct = Math.round((bMek / 8) * 100);
      const kliPct = Math.round((bKli / 8) * 100);
      const mesaPct = Math.round((bMesa / 8) * 100);
      const testPct = Math.round((bTest / 8) * 100);
      const tavanPct = Math.round((bTavan / 8) * 100);

      html += `
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.75rem;">
            <h3 style="font-size: 1.1rem; font-weight: 800; color: #0f172a;">🏢 ${b.name}</h3>
            <span style="font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700;">
              ${bTest}/8 Test • ${bTavan}/8 Tavan
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
                <span>3. Elektrik Testi:</span>
                <strong style="color: #16a34a;">${bTest}/8 Kat (%${testPct})</strong>
              </div>
              <div class="kpi-progress"><div class="kpi-bar" style="width: ${testPct}%; background: #22c55e;"></div></div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                <span>4. MESA Kabul Onayı:</span>
                <strong>${bMesa}/8 Kat (%${mesaPct})</strong>
              </div>
              <div class="kpi-progress"><div class="kpi-bar" style="width: ${mesaPct}%; background: #a855f7;"></div></div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                <span style="color: #059669; font-weight: 700;">5. Asma Tavan Kapatma:</span>
                <strong style="color: #059669;">${bTavan}/8 Kat (%${tavanPct})</strong>
              </div>
              <div class="kpi-progress"><div class="kpi-bar" style="width: ${tavanPct}%; background: #059669;"></div></div>
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
  async clearAuditLogs() {
    if (!this.hasAllPermissions()) {
      this.showToast('İşlem geçmişini silme yetkisi yalnızca tam yetkili yöneticilere aittir.', 'warning');
      return;
    }
    if (!confirm('Tüm işlem ve onay geçmişi kalıcı olarak silinecektir. Onaylıyor musunuz?')) {
      return;
    }
    this.data.logs = [];
    await this.saveData(this.data);
    this.renderLogs();
    this.showToast('İşlem geçmişi başarıyla temizlendi! 🗑️', 'info');
  }

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
    const currentUnits = this.getCurrentUnits();
    const u = currentUnits[unitId];
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

    // 3. Test (Elektrik Testi)
    const bothMekKliDone = (u.mekanik?.status === 'tamamlandi' && u.klima?.status === 'tamamlandi');
    const elkStatus = u.elektrikTest?.status || (bothMekKliDone ? 'hazir' : 'kilitli');
    document.getElementById('editElkStatus').value = elkStatus;
    document.getElementById('editElkDate').value = u.elektrikTest?.date || '';
    document.getElementById('editElkTester').value = u.elektrikTest?.tester || '';
    document.getElementById('editElkReport').value = u.elektrikTest?.reportNo || '';
    document.getElementById('editElkNote').value = u.elektrikTest?.note || '';

    // 4. 2. Cil Mekanik
    const mek2El = document.getElementById('editMekanik2Status');
    if (mek2El) mek2El.value = u.mekanik2?.status || 'bekliyor';
    const mek2DateEl = document.getElementById('editMekanik2Date');
    if (mek2DateEl) mek2DateEl.value = u.mekanik2?.date || '';
    const mek2NoteEl = document.getElementById('editMekanik2Note');
    if (mek2NoteEl) mek2NoteEl.value = u.mekanik2?.note || '';

    // 5. MESA Kabul Onayı
    document.getElementById('editMesaStatus').value = u.mesa?.status || 'bekliyor';
    document.getElementById('editMesaDate').value = u.mesa?.date || '';
    document.getElementById('editMesaOfficer').value = u.mesa?.officer || '';
    document.getElementById('editMesaDocNo').value = u.mesa?.docNo || '';
    document.getElementById('editMesaNote').value = u.mesa?.note || '';

    // 6. Asma Tavan
    const tavanStatus = u.asmaTavan?.status || (u.mesa?.status === 'onaylandi' ? 'hazir' : 'kilitli');
    const tavanEl = document.getElementById('editAsmaTavanStatus');
    if (tavanEl) tavanEl.value = tavanStatus;
    const tavanDateEl = document.getElementById('editAsmaTavanDate');
    if (tavanDateEl) tavanDateEl.value = u.asmaTavan?.date || '';
    const tavanCompanyEl = document.getElementById('editAsmaTavanCompany');
    if (tavanCompanyEl) tavanCompanyEl.value = u.asmaTavan?.company || 'Asma Tavan & Alçıpan Ekibi';
    const tavanNoteEl = document.getElementById('editAsmaTavanNote');
    if (tavanNoteEl) tavanNoteEl.value = u.asmaTavan?.note || '';

    // 6. Custom Stages
    this.renderCustomStagesInUnitModal(u);

    // Permission check for save button & read-only guard
    const btnSave = document.getElementById('btnSaveUnit');
    const readOnlyAlert = document.getElementById('unitModalReadOnlyAlert');
    const isAuth = this.isLoggedIn();
    const hasAll = this.hasAllPermissions();
    const canEditAny = hasAll || this.canEditAnyStage();
    const isSnapshot = !!this.activeSnapshotId;

    if (!isAuth) {
      if (btnSave) btnSave.style.display = 'none';
      if (readOnlyAlert) {
        readOnlyAlert.style.display = 'flex';
        readOnlyAlert.style.background = '#fef2f2';
        readOnlyAlert.style.borderColor = '#fecaca';
        readOnlyAlert.style.color = '#991b1b';
        readOnlyAlert.innerHTML = `
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>👁️</span>
            <span><strong>Salt Okunur Görünüm:</strong> Giriş yapılmadığı için sadece görüntüleme yapabilirsiniz. Değişiklik yapmak için lütfen giriş yapınız.</span>
          </div>
          <button class="btn btn-sm btn-primary" onclick="app.closeModal('modalEditUnit'); app.openLoginModal();" style="flex-shrink: 0;">Giriş Yap ➔</button>
        `;
      }
      this.setAllUnitModalInputsDisabled(true);
    } else if (isSnapshot) {
      if (btnSave) btnSave.style.display = 'none';
      if (readOnlyAlert) {
        readOnlyAlert.style.display = 'flex';
        readOnlyAlert.style.background = '#fffbeb';
        readOnlyAlert.style.borderColor = '#fde68a';
        readOnlyAlert.style.color = '#92400e';
        readOnlyAlert.innerHTML = `
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>⚠️</span>
            <span>Geçmiş haftaya ait dondurulmuş arşivi inceliyorsunuz. Bu ekran salt okunurdur. Canlı güncel duruma dönerek düzenleme yapabilirsiniz.</span>
          </div>
        `;
      }
      this.setAllUnitModalInputsDisabled(true);
    } else if (!canEditAny) {
      if (btnSave) btnSave.style.display = 'none';
      if (readOnlyAlert) {
        readOnlyAlert.style.display = 'flex';
        readOnlyAlert.style.background = '#fef2f2';
        readOnlyAlert.style.borderColor = '#fecaca';
        readOnlyAlert.style.color = '#991b1b';
        readOnlyAlert.innerHTML = `
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>👁️</span>
            <span>Hesabınıza tanımlanmış herhangi bir imalat düzenleme yetkisi bulunmamaktadır (Salt Okunur).</span>
          </div>
        `;
      }
      this.setAllUnitModalInputsDisabled(true);
    } else {
      // User has permission!
      if (btnSave) btnSave.style.display = 'inline-flex';
      if (readOnlyAlert) {
        if (hasAll) {
          readOnlyAlert.style.display = 'none';
        } else {
          const permittedNames = this.getPermittedStageNames();
          readOnlyAlert.style.display = 'flex';
          readOnlyAlert.style.background = '#f0fdf4';
          readOnlyAlert.style.borderColor = '#bbf7d0';
          readOnlyAlert.style.color = '#166534';
          readOnlyAlert.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px;">
              <span>ℹ️</span>
              <span>Yetkili olduğunuz iş kalemleri: <strong>${this.escapeHtml(permittedNames.join(', '))}</strong>. Diğer alanlar salt okunurdur.</span>
            </div>
          `;
        }
      }
      this.applyGranularPermissionsToUnitModal();
    }

    this.handleModalStateChange();
    this.openModal('modalEditUnit');
  }

  renderCustomStagesInUnitModal(u) {
    const container = document.getElementById('customStagesUnitModalContainer');
    if (!container) return;

    const prereqNames = {
      'none': 'Ön şartsız',
      'asmaTavan': '6. Asma Tavan Kapatma',
      'mesa': '5. MESA Tavan Kapama Onayı',
      'mekanik2': '4. 2. Cil Mekanik İşleri',
      'elektrikTest': '3. Elektrik Testi',
      'klima': '2. Klima İmalatı',
      'mekanik': '1. Mekanik İmalatı'
    };

    let html = '';
    (this.data?.customStages || []).forEach(cs => {
      const stageData = u[cs.id] || { status: 'kilitli', date: '', company: cs.company || '', note: '' };
      const prereqMet = cs.prerequisiteStage === 'none' ||
        (cs.prerequisiteStage === 'asmaTavan' && u.asmaTavan?.status === 'tamamlandi') ||
        (cs.prerequisiteStage === 'mesa' && u.mesa?.status === 'onaylandi') ||
        (cs.prerequisiteStage === 'mekanik2' && u.mekanik2?.status === 'tamamlandi') ||
        (cs.prerequisiteStage === 'elektrikTest' && u.elektrikTest?.status === 'tamamlandi') ||
        (cs.prerequisiteStage === 'klima' && u.klima?.status === 'tamamlandi') ||
        (cs.prerequisiteStage === 'mekanik' && u.mekanik?.status === 'tamamlandi') ||
        (u[cs.prerequisiteStage]?.status === 'tamamlandi');

      const prereqLabel = prereqNames[cs.prerequisiteStage] || cs.prerequisiteStage;

      html += `
        <div class="stage-edit-card" style="border-left: 4px solid ${cs.color}; background: #ffffff; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; border: 1.5px solid #e2e8f0; border-left: 4px solid ${cs.color};">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <div style="font-weight:700; font-size:0.95rem; color:#1e293b; display:flex; align-items:center; gap:6px;">
              <span>${cs.icon}</span>
              <span>${cs.name}</span>
            </div>
            <span class="stage-val-badge ${stageData.status === 'tamamlandi' ? 'badge-ok' : (stageData.status === 'devam' ? 'badge-prog' : (stageData.status === 'hazir' ? 'badge-ready' : 'badge-locked'))}" style="${stageData.status === 'tamamlandi' ? `background:${cs.color}; color:#fff;` : ''}">
              ${stageData.status === 'tamamlandi' ? '✅ Tamamlandı' : (stageData.status === 'devam' ? '🚧 Devam Ediyor' : (stageData.status === 'hazir' ? '⚡ Hazır' : '🔒 Kilitli'))}
            </span>
          </div>

          ${!prereqMet ? `
            <div style="background:#fffbeb; border:1px solid #fde68a; color:#b45309; padding:6px 10px; border-radius:6px; font-size:0.78rem; margin-bottom:0.75rem; display:flex; align-items:center; gap:6px;">
              <span>⚠️</span>
              <span>Bu aşamanın başlayabilmesi için ön koşul olan <strong>${prereqLabel}</strong> aşamasının tamamlanması gerekir.</span>
            </div>
          ` : ''}

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; margin-bottom:0.75rem;">
            <div>
              <label style="font-size:0.75rem; font-weight:700; color:#64748b; display:block; margin-bottom:4px;">Durum</label>
              <select id="editCustomStage_${cs.id}_status" class="form-control" style="width:100%; font-size:0.85rem;">
                <option value="kilitli" ${stageData.status === 'kilitli' ? 'selected' : ''}>🔒 Kilitli / Bekliyor</option>
                <option value="hazir" ${stageData.status === 'hazir' ? 'selected' : ''}>⚡ İşleme Hazır</option>
                <option value="devam" ${stageData.status === 'devam' ? 'selected' : ''}>🚧 İmalat Sürüyor</option>
                <option value="tamamlandi" ${stageData.status === 'tamamlandi' ? 'selected' : ''}>✅ Tamamlandı (Bitti)</option>
              </select>
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:700; color:#64748b; display:block; margin-bottom:4px;">Tarih</label>
              <input type="date" id="editCustomStage_${cs.id}_date" class="form-control" style="width:100%; font-size:0.85rem;" value="${stageData.date || ''}">
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem;">
            <div>
              <label style="font-size:0.75rem; font-weight:700; color:#64748b; display:block; margin-bottom:4px;">Sorumlu Taşeron / Ekip</label>
              <input type="text" id="editCustomStage_${cs.id}_company" class="form-control" style="width:100%; font-size:0.85rem;" value="${stageData.company || cs.company || ''}">
            </div>
            <div>
              <label style="font-size:0.75rem; font-weight:700; color:#64748b; display:block; margin-bottom:4px;">Notlar & Açıklama</label>
              <input type="text" id="editCustomStage_${cs.id}_note" class="form-control" style="width:100%; font-size:0.85rem;" value="${stageData.note || ''}">
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  enableModalInputs(enabled) {
    const inputs = document.querySelectorAll('#modalEditUnit input, #modalEditUnit select');
    inputs.forEach(input => {
      input.disabled = !enabled;
    });
  }

  handleModalStateChange() {
    const mekStatus = document.getElementById('editMekanikStatus')?.value || 'bekliyor';
    const kliStatus = document.getElementById('editKlimaStatus')?.value || 'bekliyor';
    const elkSelect = document.getElementById('editElkStatus');
    const mesaSelect = document.getElementById('editMesaStatus');
    const tavanSelect = document.getElementById('editAsmaTavanStatus');

    const isMekDone = mekStatus === 'tamamlandi';
    const isKliDone = kliStatus === 'tamamlandi';
    const bothMekKliDone = isMekDone && isKliDone;

    // Badges update: Mekanik & Klima
    const mekBadge = document.getElementById('mekanikBadgeStatus');
    if (mekBadge) {
      mekBadge.className = isMekDone ? 'stage-val-badge badge-ok' : (mekStatus === 'devam' ? 'stage-val-badge badge-prog' : 'stage-val-badge badge-wait');
      mekBadge.innerText = isMekDone ? 'Tamamlandı ✓' : (mekStatus === 'devam' ? 'İmalat Sürüyor' : 'Bekliyor');
    }

    const kliBadge = document.getElementById('klimaBadgeStatus');
    if (kliBadge) {
      kliBadge.className = isKliDone ? 'stage-val-badge badge-ok' : (kliStatus === 'devam' ? 'stage-val-badge badge-prog' : 'stage-val-badge badge-wait');
      kliBadge.innerText = isKliDone ? 'Tamamlandı ✓' : (kliStatus === 'devam' ? 'İmalat Sürüyor' : 'Bekliyor');
    }

    // --- STEP 3: Elektrik Test Rule Enforcement ---
    // Ön şart: Mekanik ve Klima bitişi (bothMekKliDone)
    const elkAlert = document.getElementById('elkPrereqWarning');
    const elkBadge = document.getElementById('elkBadgeStatus');

    if (elkSelect) {
      const optHazir = elkSelect.querySelector('option[value="hazir"]');
      const optSuruyor = elkSelect.querySelector('option[value="suruyor"]');
      const optTamam = elkSelect.querySelector('option[value="tamamlandi"]');
      const optHata = elkSelect.querySelector('option[value="basarisiz"]');

      if (!bothMekKliDone) {
        if (elkAlert) elkAlert.style.display = 'flex';
        if (optHazir) optHazir.disabled = true;
        if (optSuruyor) optSuruyor.disabled = true;
        if (optTamam) optTamam.disabled = true;
        if (optHata) optHata.disabled = true;
        elkSelect.value = 'kilitli';

        if (elkBadge) {
          elkBadge.className = 'stage-val-badge badge-locked';
          elkBadge.innerText = '🔒 KİLİTLİ';
        }
      } else {
        if (elkAlert) elkAlert.style.display = 'none';
        if (optHazir) optHazir.disabled = false;
        if (optSuruyor) optSuruyor.disabled = false;
        if (optTamam) optTamam.disabled = false;
        if (optHata) optHata.disabled = false;

        if (elkSelect.value === 'kilitli') {
          elkSelect.value = 'hazir';
        }

        const curElk = elkSelect.value;
        if (elkBadge) {
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
    }

    const isTestDone = bothMekKliDone && elkSelect && elkSelect.value === 'tamamlandi';

    // --- STEP 4: 2. Cil Mekanik Badges ---
    const mek2Select = document.getElementById('editMekanik2Status');
    const mek2Status = mek2Select?.value || 'bekliyor';
    const isMek2Done = mek2Status === 'tamamlandi';
    const mek2Badge = document.getElementById('mekanik2BadgeStatus');
    if (mek2Badge) {
      mek2Badge.className = isMek2Done ? 'stage-val-badge badge-ok' : (mek2Status === 'devam' ? 'stage-val-badge badge-prog' : 'stage-val-badge badge-wait');
      mek2Badge.innerText = isMek2Done ? 'Tamamlandı ✓' : (mek2Status === 'devam' ? 'İmalat Sürüyor' : 'Bekliyor');
    }

    // --- STEP 5: MESA Tavan Kapama Onay Rule Enforcement ---
    // Ön şart: ELEKTRİK TESTİ BİTTİ (isTestDone) + 2. CİL MEKANİK BİTTİ (isMek2Done)
    const bothTestAndMek2Done = isTestDone && isMek2Done;
    const mesaAlert = document.getElementById('mesaPrereqWarning');
    const mesaBadge = document.getElementById('mesaBadgeStatus');

    if (mesaSelect) {
      const mesaOptionApproved = mesaSelect.querySelector('option[value="onaylandi"]');

      if (!bothTestAndMek2Done) {
        if (mesaAlert) mesaAlert.style.display = 'flex';
        if (mesaOptionApproved) mesaOptionApproved.disabled = true;
        if (mesaSelect.value === 'onaylandi') {
          mesaSelect.value = 'bekliyor';
        }
      } else {
        if (mesaAlert) mesaAlert.style.display = 'none';
        if (mesaOptionApproved) mesaOptionApproved.disabled = false;
      }

      const mesaStatus = mesaSelect.value;
      const isMesaApproved = bothTestAndMek2Done && mesaStatus === 'onaylandi';

      if (mesaBadge) {
        mesaBadge.className = isMesaApproved ? 'stage-val-badge badge-ok' : (mesaStatus === 'revizyon' ? 'stage-val-badge badge-rev' : 'stage-val-badge badge-wait');
        mesaBadge.innerText = isMesaApproved ? 'MESA Onayladı ✓' : (mesaStatus === 'revizyon' ? 'Revizyon Gerekli' : 'Onay Bekliyor');
      }
    }

    const isMesaApproved = bothTestAndMek2Done && mesaSelect && mesaSelect.value === 'onaylandi';

    // --- STEP 6: Asma Tavan Rule Enforcement ---
    // Ön şart: MESA Onayı (isMesaApproved)
    const tavanAlert = document.getElementById('tavanPrereqWarning');
    const tavanBadge = document.getElementById('tavanBadgeStatus');

    if (tavanSelect && tavanBadge) {
      const optTavanHazir = tavanSelect.querySelector('option[value="hazir"]');
      const optTavanDevam = tavanSelect.querySelector('option[value="devam"]');
      const optTavanTamam = tavanSelect.querySelector('option[value="tamamlandi"]');

      if (!isMesaApproved) {
        if (tavanAlert) tavanAlert.style.display = 'flex';
        if (optTavanHazir) optTavanHazir.disabled = true;
        if (optTavanDevam) optTavanDevam.disabled = true;
        if (optTavanTamam) optTavanTamam.disabled = true;
        tavanSelect.value = 'kilitli';
        tavanBadge.className = 'stage-val-badge badge-locked';
        tavanBadge.innerText = '🔒 MESA ONAYI BEKLENİYOR';
      } else {
        if (tavanAlert) tavanAlert.style.display = 'none';
        if (optTavanHazir) optTavanHazir.disabled = false;
        if (optTavanDevam) optTavanDevam.disabled = false;
        if (optTavanTamam) optTavanTamam.disabled = false;

        if (tavanSelect.value === 'kilitli') {
          tavanSelect.value = 'hazir';
        }

        const curTavan = tavanSelect.value;
        if (curTavan === 'tamamlandi') {
          tavanBadge.className = 'stage-val-badge badge-ok';
          tavanBadge.innerText = '✅ TAVAN KAPATILDI';
        } else if (curTavan === 'devam') {
          tavanBadge.className = 'stage-val-badge badge-prog';
          tavanBadge.innerText = '🚧 TAVAN KAPATILIYOR';
        } else {
          tavanBadge.className = 'stage-val-badge badge-ready';
          tavanBadge.innerText = '⚡ KAPATMAYA HAZIR';
        }
      }
    }
  }

  async saveUnitData() {
    if (this.activeSnapshotId) {
      this.showToast('Geçmiş arşiv incelenirken değişiklik yapılamaz. Lütfen canlı güncel duruma dönünüz.', 'warning');
      return;
    }
    if (!this.requireLogin('Kat durumunu güncellemek için lütfen giriş yapınız.')) {
      return;
    }

    const hasAll = this.hasAllPermissions();
    if (!hasAll && !this.canEditAnyStage()) {
      this.showToast('Kat durumlarını düzenleme yetkiniz bulunmamaktadır.', 'error');
      return;
    }

    const unitId = document.getElementById('editUnitId').value;
    const u = this.data.units[unitId];
    if (!u) return;

    // Clone current unit to apply changes safely
    const updatedUnit = JSON.parse(JSON.stringify(u));
    let changedStages = [];

    // 1. Mekanik
    if (hasAll || this.canEditStage('mekanik')) {
      const mekStatus = document.getElementById('editMekanikStatus')?.value || u.mekanik?.status || 'bekliyor';
      const mekDate = document.getElementById('editMekanikDate')?.value || (mekStatus === 'tamamlandi' ? new Date().toISOString().split('T')[0] : '');
      const mekNote = document.getElementById('editMekanikNote')?.value || '';
      updatedUnit.mekanik = { status: mekStatus, date: mekDate, note: mekNote };
      changedStages.push('Mekanik');
    }

    // 2. Klima
    if (hasAll || this.canEditStage('klima')) {
      const kliStatus = document.getElementById('editKlimaStatus')?.value || u.klima?.status || 'bekliyor';
      const kliDate = document.getElementById('editKlimaDate')?.value || (kliStatus === 'tamamlandi' ? new Date().toISOString().split('T')[0] : '');
      const kliNote = document.getElementById('editKlimaNote')?.value || '';
      updatedUnit.klima = { status: kliStatus, date: kliDate, note: kliNote };
      changedStages.push('Klima');
    }

    // 3. Test (Elektrik Testi)
    if (hasAll || this.canEditStage('elektrikTest')) {
      const elkStatus = document.getElementById('editElkStatus')?.value || u.elektrikTest?.status || 'kilitli';
      if (elkStatus !== 'kilitli') {
        const isMekDone = updatedUnit.mekanik?.status === 'tamamlandi';
        const isKliDone = updatedUnit.klima?.status === 'tamamlandi';
        if (!isMekDone || !isKliDone) {
          this.showToast('HATA: 1. Mekanik ve VRF Klima tamamlanmadan Elektrik Testine başlanamaz!', 'error');
          return;
        }
      }
      const elkDate = document.getElementById('editElkDate')?.value || (elkStatus === 'tamamlandi' ? new Date().toISOString().split('T')[0] : '');
      const elkTester = document.getElementById('editElkTester')?.value || '';
      const elkReport = document.getElementById('editElkReport')?.value || '';
      const elkNote = document.getElementById('editElkNote')?.value || '';
      updatedUnit.elektrikTest = { status: elkStatus, date: elkDate, tester: elkTester, reportNo: elkReport, note: elkNote };
      changedStages.push('Elektrik Testi');
    }

    // 4. 2. Cil Mekanik
    if (hasAll || this.canEditStage('mekanik2')) {
      const mek2Status = document.getElementById('editMekanik2Status')?.value || u.mekanik2?.status || 'bekliyor';
      const mek2Date = document.getElementById('editMekanik2Date')?.value || (mek2Status === 'tamamlandi' ? new Date().toISOString().split('T')[0] : '');
      const mek2Note = document.getElementById('editMekanik2Note')?.value || '';
      updatedUnit.mekanik2 = { status: mek2Status, date: mek2Date, note: mek2Note };
      changedStages.push('2. Cil Mekanik');
    }

    // 5. MESA Tavan Kapama Onayı
    if (hasAll || this.canEditStage('mesa')) {
      const mesaStatus = document.getElementById('editMesaStatus')?.value || u.mesa?.status || 'bekliyor';
      if (mesaStatus === 'onaylandi') {
        if (updatedUnit.elektrikTest?.status !== 'tamamlandi' || updatedUnit.mekanik2?.status !== 'tamamlandi') {
          this.showToast('HATA: Elektrik Testi ve 2. Cil Mekanik İşleri tamamlanmadan MESA Tavan Kapama Onayı verilemez!', 'error');
          return;
        }
      }
      const mesaDate = document.getElementById('editMesaDate')?.value || (mesaStatus === 'onaylandi' ? new Date().toISOString().split('T')[0] : '');
      const mesaOfficer = document.getElementById('editMesaOfficer')?.value || '';
      const mesaDocNo = document.getElementById('editMesaDocNo')?.value || '';
      const mesaNote = document.getElementById('editMesaNote')?.value || '';
      updatedUnit.mesa = { status: mesaStatus, date: mesaDate, officer: mesaOfficer, docNo: mesaDocNo, note: mesaNote };
      changedStages.push('MESA Onayı');
    }

    // 6. Asma Tavan
    if (hasAll || this.canEditStage('asmaTavan')) {
      const tavanStatus = document.getElementById('editAsmaTavanStatus')?.value || u.asmaTavan?.status || 'kilitli';
      if (tavanStatus === 'tamamlandi' && updatedUnit.mesa?.status !== 'onaylandi') {
        this.showToast('HATA: MESA Tavan Kapama Onayı verilmeden Asma Tavan kapatılamaz!', 'error');
        return;
      }
      const tavanDate = document.getElementById('editAsmaTavanDate')?.value || (tavanStatus === 'tamamlandi' ? new Date().toISOString().split('T')[0] : '');
      const tavanCompany = document.getElementById('editAsmaTavanCompany')?.value || 'Asma Tavan & Alçıpan Ekibi';
      const tavanNote = document.getElementById('editAsmaTavanNote')?.value || '';
      updatedUnit.asmaTavan = { status: tavanStatus, date: tavanDate, company: tavanCompany, note: tavanNote };
      changedStages.push('Asma Tavan');
    }

    // 6. Custom Stages
    (this.data?.customStages || []).forEach(cs => {
      if (hasAll || this.canEditStage(cs.id)) {
        const stEl = document.getElementById(`editCustomStage_${cs.id}_status`);
        const dtEl = document.getElementById(`editCustomStage_${cs.id}_date`);
        const compEl = document.getElementById(`editCustomStage_${cs.id}_company`);
        const ntEl = document.getElementById(`editCustomStage_${cs.id}_note`);
        if (stEl) {
          const stVal = stEl.value;
          updatedUnit[cs.id] = {
            status: stVal,
            date: dtEl?.value || (stVal === 'tamamlandi' ? new Date().toISOString().split('T')[0] : ''),
            company: compEl?.value || cs.company || '',
            note: ntEl?.value || ''
          };
          changedStages.push(cs.name || cs.id);
        }
      }
    });

    if (changedStages.length === 0) {
      this.showToast('Yetkili olduğunuz bir alanda değişiklik yapılmadı.', 'info');
      this.closeModal('modalEditUnit');
      return;
    }

    updatedUnit.updatedAt = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    updatedUnit.updatedBy = this.currentUser?.name || 'Kullanıcı';

    this.data.units[unitId] = updatedUnit;
    this.data.logs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString('tr-TR'),
      user: this.currentUser?.name || 'Kullanıcı',
      unitId: unitId,
      blockName: u.blockName,
      floorName: u.floorName,
      action: `${changedStages.join(', ')} Güncellendi`,
      details: `${changedStages.join(', ')} durumu kaydedildi.`,
      badgeType: 'primary'
    });

    await this.saveData(this.data);
    this.showToast(`${u.blockName} - ${u.floorName} güncellendi! ✅`, 'success');
    this.closeModal('modalEditUnit');
    this.renderAll();
  }

  // --- BULK OPERATIONS ---
  openBulkModal() {
    if (!this.hasAllPermissions()) {
      this.showToast('Toplu güncelleme yetkisi yalnızca tam yetkili yöneticilere aittir.', 'warning');
      return;
    }
    this.openModal('modalBulk');
  }

  handleBulkFieldChange() {
    const field = document.getElementById('bulkFieldSelect').value;
    const statusSelect = document.getElementById('bulkStatusSelect');

    let options = '';
    if (field === 'mekanik' || field === 'klima' || field === 'mekanik2') {
      options = `
        <option value="tamamlandi">✅ Tamamlandı (Bitti)</option>
        <option value="devam">🚧 Devam Ediyor</option>
        <option value="bekliyor">⏳ Bekliyor / Başlanmadı</option>
      `;
    } else if (field === 'elektrikTest') {
      options = `
        <option value="tamamlandi">✅ Test Başarılı (Mekanik & Klima bitti olanlar güncellenir)</option>
        <option value="suruyor">🔄 Test Aşamasında (Sürüyor)</option>
        <option value="hazir">⚡ Teste Hazır</option>
      `;
    } else if (field === 'mesa') {
      options = `
        <option value="onaylandi">✅ MESA Onayladı (Elektrik Testi ve 2. Cil Mekanik tamamlananlar onaylanır)</option>
        <option value="revizyon">❌ Revizyon Gerekli</option>
        <option value="bekliyor">⏳ Onay Bekliyor</option>
      `;
    } else if (field === 'asmaTavan') {
      options = `
        <option value="tamamlandi">✅ Asma Tavan Kapatıldı (Sadece MESA Onayı olanlar kapatılır)</option>
        <option value="devam">🚧 Asma Tavan Kapatılıyor (Sürüyor)</option>
        <option value="hazir">⚡ Kapatmaya Hazır (MESA Onaylandı)</option>
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

      if (field === 'elektrikTest' && ['hazir', 'suruyor', 'tamamlandi'].includes(status)) {
        if (u.mekanik?.status !== 'tamamlandi' || u.klima?.status !== 'tamamlandi') return;
      }
      if (field === 'mesa' && status === 'onaylandi') {
        if (u.elektrikTest?.status !== 'tamamlandi' || u.mekanik2?.status !== 'tamamlandi') return;
      }
      if (field === 'asmaTavan' && ['devam', 'tamamlandi'].includes(status)) {
        if (u.mesa?.status !== 'onaylandi') return;
      }

      if (!u[field]) u[field] = {};
      u[field].status = status;
      u[field].date = nowStr;
      if (note) u[field].note = note;

      // Otomatik durum basamaklama / kilit açma
      const isMekDone = u.mekanik?.status === 'tamamlandi';
      const isKliDone = u.klima?.status === 'tamamlandi';
      if (isMekDone && isKliDone) {
        if (!u.elektrikTest || u.elektrikTest.status === 'kilitli') {
          if (!u.elektrikTest) u.elektrikTest = {};
          u.elektrikTest.status = 'hazir';
        }
      } else {
        if (u.elektrikTest?.status !== 'tamamlandi') {
          if (!u.elektrikTest) u.elektrikTest = {};
          u.elektrikTest.status = 'kilitli';
        }
      }

      if ((u.elektrikTest?.status !== 'tamamlandi' || u.mekanik2?.status !== 'tamamlandi') && u.mesa?.status === 'onaylandi') {
        u.mesa.status = 'bekliyor';
      }

      if (u.mesa?.status === 'onaylandi') {
        if (!u.asmaTavan || u.asmaTavan.status === 'kilitli') {
          if (!u.asmaTavan) u.asmaTavan = {};
          u.asmaTavan.status = 'hazir';
        }
      } else if (u.asmaTavan?.status !== 'tamamlandi') {
        if (!u.asmaTavan) u.asmaTavan = {};
        u.asmaTavan.status = 'kilitli';
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
    const userSelect = document.getElementById('loginUserSelect');
    const usernameInput = document.getElementById('loginUsernameInput');
    const pwInput = document.getElementById('loginPasswordInput');

    const users = this.data?.users || [];

    if (userSelect) {
      let options = `<option value="">-- Kayıtlı Hesap Seçin (Opsiyonel) --</option>`;
      users.forEach(u => {
        let roleName = 'İzleyici';
        if (u.role === 'admin') roleName = 'Yönetici';
        else if (u.role === 'internal_team') roleName = 'Saha / Üçay';
        else if (u.role === 'ana_firma') roleName = 'MESA Ekibi';
        const uname = u.username || u.id;
        options += `<option value="${this.escapeHtml(uname)}">${this.escapeHtml(u.name)} (@${this.escapeHtml(uname)}) [${roleName}]</option>`;
      });
      userSelect.innerHTML = options;
      userSelect.value = '';
    }

    if (usernameInput) {
      usernameInput.value = this.currentUser?.username || '';
    }

    if (pwInput) {
      pwInput.value = ''; // KESİNLİKLE ŞİFRE DOLDURULMAZ!
    }

    this.openModal('modalLogin');
    setTimeout(() => {
      if (usernameInput && !usernameInput.value) {
        if (usernameInput.focus) usernameInput.focus();
      } else if (pwInput) {
        if (pwInput.focus) pwInput.focus();
      }
    }, 150);
  }

  onLoginUserSelectChange() {
    const userSelect = document.getElementById('loginUserSelect');
    const usernameInput = document.getElementById('loginUsernameInput');
    const pwInput = document.getElementById('loginPasswordInput');
    if (!userSelect || !usernameInput) return;

    if (userSelect.value) {
      usernameInput.value = userSelect.value;
      if (pwInput) {
        pwInput.value = '';
        if (pwInput.focus) pwInput.focus();
      }
    }
  }

  togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (btn) btn.innerText = '🙈';
    } else {
      input.type = 'password';
      if (btn) btn.innerText = '👁️';
    }
  }

  toggleUserCardPw(userId) {
    // Şifreler kullanıcılara özel olup yönetici dahil sistemde gizlidir.
  }

  async login() {
    const usernameInput = document.getElementById('loginUsernameInput');
    const pwInput = document.getElementById('loginPasswordInput');
    const username = (usernameInput?.value || '').trim().toLowerCase();
    const pw = (pwInput?.value || '').trim();

    if (!pw) {
      this.showToast('Lütfen giriş şifrenizi yazınız.', 'warning');
      if (pwInput && pwInput.focus) pwInput.focus();
      return;
    }

    const users = this.data?.users || [];
    const adminUser = users.find(u => u.role === 'admin' || u.id === 'u1' || u.username === 'admin') || {
      id: 'u1',
      name: 'Yönetici (Ben)',
      username: 'admin',
      role: 'admin',
      password: this.data?.settings?.adminPassword || '12345'
    };
    const adminPw = adminUser.password || this.data?.settings?.adminPassword || '12345';

    let loggedInUser = null;

    // 1. If username was provided
    if (username) {
      if (username === 'admin' || username === 'yonetici') {
        // Master admin check: only accept admin password (or default 12345)
        if (pw === adminPw || pw === '12345') {
          loggedInUser = adminUser;
        } else {
          this.showToast('Hatalı yönetici şifresi! Lütfen kontrol ediniz.', 'error');
          if (pwInput) { pwInput.select(); pwInput.focus(); }
          return;
        }
      } else {
        // Find user by username, id, or exact name
        const u = users.find(x => (x.username && x.username.toLowerCase() === username) || x.id.toLowerCase() === username || (x.name && x.name.toLowerCase() === username));
        if (u) {
          const expectedPw = u.password;
          if (expectedPw && pw === expectedPw) {
            loggedInUser = u;
          } else {
            this.showToast('Hatalı kullanıcı şifresi! Lütfen kontrol ediniz.', 'error');
            if (pwInput) { pwInput.select(); pwInput.focus(); }
            return;
          }
        } else {
          this.showToast(`"${username}" kullanıcı adı sistemde kayıtlı değil!`, 'error');
          if (usernameInput) { usernameInput.select(); usernameInput.focus(); }
          return;
        }
      }
    } else {
      // 2. If username was omitted: check if password matches admin or unique user
      if (pw === adminPw || pw === '12345') {
        loggedInUser = adminUser;
      } else {
        const matches = users.filter(u => u.password && u.password === pw);
        if (matches.length === 1) {
          loggedInUser = matches[0];
        } else if (matches.length > 1) {
          this.showToast('Birden fazla kullanıcı aynı şifreye sahip. Lütfen kullanıcı adınızı da giriniz.', 'warning');
          if (usernameInput) usernameInput.focus();
          return;
        }
      }
    }

    if (!loggedInUser) {
      this.showToast('Hatalı kullanıcı adı veya şifre! Lütfen kontrol ediniz.', 'error');
      if (pwInput) {
        if (pwInput.select) pwInput.select();
        if (pwInput.focus) pwInput.focus();
      }
      return;
    }

    // Login successful
    const isMasterAdmin = (loggedInUser.username === 'admin' || loggedInUser.id === 'u1');
    const isAll = isMasterAdmin || loggedInUser.allPermissions || loggedInUser.role === 'admin';

    this.currentUser = {
      id: loggedInUser.id,
      name: loggedInUser.name,
      username: loggedInUser.username || loggedInUser.id,
      allPermissions: isAll,
      permissions: loggedInUser.permissions || { all: isAll, stages: isAll ? ['*'] : [] },
      role: isAll ? 'admin' : 'custom'
    };
    this.currentRole = this.currentUser.role;

    localStorage.setItem('santiye_user_session', JSON.stringify(this.currentUser));
    localStorage.setItem('santiye_active_role', this.currentRole);

    if (isAll) {
      this.adminToken = 'admin-session-' + Date.now();
      localStorage.setItem('santiye_admin_token', this.adminToken);
      this.isAdmin = true;
    } else {
      this.adminToken = null;
      localStorage.removeItem('santiye_admin_token');
      this.isAdmin = false;
    }

    // Backend server sync (non-blocking if on localhost)
    if (loggedInUser.role === 'admin' && window.location.origin.includes('localhost')) {
      fetch(`${this.apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
      }).then(r => r.json()).then(data => {
        if (data?.token) {
          this.adminToken = data.token;
          localStorage.setItem('santiye_admin_token', data.token);
        }
      }).catch(() => {});
    }

    this.closeModal('modalLogin');
    this.updateRoleUI();

    const permSummary = this.getPermittedStageNames(this.currentUser).join(', ') || 'Salt Okunur';
    this.showToast(`Hoş geldiniz, ${loggedInUser.name}! (Yetki: ${permSummary}) ✅`, 'success');
    this.renderAll();
  }
  logout() {
    this.adminToken = null;
    this.currentUser = null;
    this.isAdmin = false;
    this.currentRole = 'viewer';
    localStorage.removeItem('santiye_admin_token');
    localStorage.removeItem('santiye_user_session');
    localStorage.removeItem('santiye_active_role');
    this.updateRoleUI();
    this.showToast('Çıkış yapıldı. İzleyici modundasınız (Salt Okunur).', 'info');
    // Always navigate to Heatmap on logout
    this.switchMasterTab('test');
    this.switchTestSubTab('matrix');
    this.renderAll();
  }

  openChangePasswordModal() {
    const curEl = document.getElementById('currentPwInput');
    const newEl = document.getElementById('newPwInput');
    const confEl = document.getElementById('confirmPwInput');
    if (curEl) curEl.value = '';
    if (newEl) newEl.value = '';
    if (confEl) confEl.value = '';

    const titleEl = document.querySelector('#modalChangePassword .modal-title');
    let targetUser = null;
    if (this.currentUser && this.currentUser.id) {
      targetUser = (this.data?.users || []).find(u => u.id === this.currentUser.id);
    }
    if (!targetUser && this.currentUser && this.currentUser.username) {
      targetUser = (this.data?.users || []).find(u => u.username && u.username.toLowerCase() === this.currentUser.username.toLowerCase());
    }
    if (!targetUser) {
      targetUser = (this.data?.users || []).find(u => u.role === 'admin' || u.id === 'u1' || u.username === 'admin');
    }

    if (titleEl) {
      if (targetUser && targetUser.username !== 'admin' && targetUser.id !== 'u1') {
        titleEl.textContent = `🔒 ${targetUser.name} Şifresini Değiştir`;
      } else {
        titleEl.textContent = '🔒 Yönetici Şifresini Değiştir';
      }
    }

    this.openModal('modalChangePassword');
  }

  async changePassword() {
    const curPw = (document.getElementById('currentPwInput')?.value || '').trim();
    const newPw = (document.getElementById('newPwInput')?.value || '').trim();
    const confPw = (document.getElementById('confirmPwInput')?.value || '').trim();

    if (!curPw || !newPw) {
      this.showToast('Lütfen mevcut şifrenizi ve yeni şifrenizi yazınız.', 'warning');
      return;
    }
    if (newPw.length < 3) {
      this.showToast('Yeni şifre en az 3 karakter olmalıdır.', 'warning');
      return;
    }
    if (newPw !== confPw) {
      this.showToast('Yeni şifreler birbiriyle uyuşmuyor!', 'error');
      return;
    }

    if (!this.data) {
      this.showToast('Veri yüklenemedi. Lütfen sayfayı yenileyiniz.', 'error');
      return;
    }
    if (!this.data.users || !Array.isArray(this.data.users)) {
      this.data.users = [];
    }

    // STRICT TARGET: Target exclusively the currently logged-in user
    let targetUser = null;
    if (this.currentUser && this.currentUser.id) {
      targetUser = this.data.users.find(u => u.id === this.currentUser.id);
    }
    if (!targetUser && this.currentUser && this.currentUser.username) {
      targetUser = this.data.users.find(u => u.username && u.username.toLowerCase() === this.currentUser.username.toLowerCase());
    }
    if (!targetUser) {
      targetUser = this.data.users.find(u => u.role === 'admin' || u.id === 'u1' || u.username === 'admin');
    }

    if (!targetUser) {
      this.showToast('Kullanıcı hesabı bulunamadı!', 'error');
      return;
    }

    const isMasterAdmin = (targetUser.id === 'u1' || targetUser.username === 'admin');
    const adminExpectedPw = targetUser.password || this.data.settings?.adminPassword || '12345';

    // Verify current password strictly
    let isPwCorrect = false;
    if (isMasterAdmin) {
      isPwCorrect = (curPw === targetUser.password) || (curPw === adminExpectedPw) || (curPw === '12345');
    } else {
      isPwCorrect = (curPw === targetUser.password);
    }

    if (!isPwCorrect) {
      this.showToast('Mevcut şifreniz hatalı! Lütfen kontrol ediniz.', 'error');
      const curEl = document.getElementById('currentPwInput');
      if (curEl) { curEl.select(); curEl.focus(); }
      return;
    }

    // Update password strictly on targetUser
    targetUser.password = newPw;
    if (isMasterAdmin) {
      targetUser.role = 'admin';
      targetUser.allPermissions = true;
      if (!this.data.settings) this.data.settings = {};
      this.data.settings.adminPassword = newPw;
    }

    // Save to Firestore and localStorage
    await this.saveData(this.data);

    this.closeModal('modalChangePassword');
    this.renderUsersList();
    this.showToast('Şifreniz başarıyla güncellendi! ✅', 'success');
  }

  // --- SADECE TABLO İNDİR (EXCEL / CSV) ---
  exportToExcel() {
    if (!this.hasAllPermissions()) {
      this.showToast('Tablo indirme yetkisi yalnızca tam yetkili yöneticilere aittir.', 'warning');
      return;
    }
    if (!this.data || !this.data.units) return;

    // Tabloda o an filtrelenmiş katlar varsa onları, yoksa tüm katları aktar
    let units = Object.values(this.getCurrentUnits());

    const search = document.getElementById('tableSearchInput')?.value.toLowerCase().trim() || '';
    const blockFilter = document.getElementById('tableBlockFilter')?.value || 'all';
    const statusFilter = document.getElementById('tableStatusFilter')?.value || 'all';

    if (search || blockFilter !== 'all' || statusFilter !== 'all') {
      const filtered = units.filter(u => {
        if (blockFilter !== 'all' && String(u.blockId) !== blockFilter) return false;
        const overall = this.getUnitOverallStatus(u);
        if (statusFilter === 'ready' && overall !== 'ready') return false;
        if (statusFilter === 'mesa_wait' && overall !== 'mesa_wait') return false;
        if (statusFilter === 'prereq_wait' && (overall === 'done' || overall === 'ready' || overall === 'mesa_wait' || overall === 'tavan_done' || overall.endsWith('_done'))) return false;
        if (statusFilter === 'done' && overall !== 'done') return false;
        if (statusFilter === 'tavan_done' && overall !== 'tavan_done') return false;
        if (search) {
          const text = `${u.blockName} ${u.floorName}`.toLowerCase();
          if (!text.includes(search)) return false;
        }
        return true;
      });
      if (filtered.length > 0) {
        units = filtered;
      }
    }

    let csv = '\uFEFF'; // UTF-8 BOM - Excel Türkçe karakter uyumu
    let headers = ['Blok', 'Kat', '1. Mekanik Durumu', '2. Klima Durumu', '3. Elektrik Testi Durumu', '4. 2. Cil Mekanik Durumu', '5. MESA Kabul & Onay', '6. Asma Tavan Durumu'];

    const customStages = this.data?.customStages || [];
    customStages.forEach(cs => {
      headers.push(cs.name || 'Özel Aşama');
    });
    headers.push('Son Güncelleme');

    csv += headers.join(';') + '\n';

    units.forEach(u => {
      const isMekDone = u.mekanik?.status === 'tamamlandi';
      const isKliDone = u.klima?.status === 'tamamlandi';
      const isTestDone = u.elektrikTest?.status === 'tamamlandi';
      const isMek2Done = u.mekanik2?.status === 'tamamlandi';
      const isMesaApproved = u.mesa?.status === 'onaylandi';
      const isTavanDone = u.asmaTavan?.status === 'tamamlandi';

      // 1. Mekanik
      let mekText = 'Bekliyor';
      if (isMekDone) mekText = 'Tamamlandı';
      else if (u.mekanik?.status === 'devam') mekText = 'İmalat Sürüyor';

      // 2. Klima
      let kliText = 'Bekliyor';
      if (isKliDone) kliText = 'Tamamlandı';
      else if (u.klima?.status === 'devam') kliText = 'İmalat Sürüyor';

      // 3. Elektrik Testi
      let testText = 'Kilitli';
      if (isTestDone) testText = 'Test Tamamlandı';
      else if (u.elektrikTest?.status === 'hazir' || (isMekDone && isKliDone)) testText = 'Teste Hazır';
      else if (u.elektrikTest?.status === 'suruyor') testText = 'Test Sürüyor';
      else if (u.elektrikTest?.status === 'basarisiz') testText = 'Uygunsuzluk';

      // 4. 2. Cil Mekanik
      let mek2Text = 'Bekliyor';
      if (isMek2Done) mek2Text = '2. Cil Bitti';
      else if (u.mekanik2?.status === 'devam') mek2Text = 'İmalat Sürüyor';

      // 5. MESA Kabul Onayı
      let mesaText = 'Kilitli (Test ve 2. Cil Mekanik Bekleniyor)';
      if (isMesaApproved) mesaText = 'MESA Onayladı';
      else if (u.mesa?.status === 'revizyon') mesaText = 'Revizyon Gerekli';
      else if (isTestDone && isMek2Done) mesaText = 'Onay Bekliyor';

      // 6. Asma Tavan
      let tavanText = 'Kilitli (MESA Onayı Bekleniyor)';
      if (isTavanDone) tavanText = 'Tavan Kapandı';
      else if (u.asmaTavan?.status === 'devam') tavanText = 'Kapatılıyor';
      else if (isMesaApproved) tavanText = 'Kapatmaya Hazır';

      let row = [
        u.blockName,
        u.floorName,
        mekText,
        kliText,
        testText,
        mek2Text,
        mesaText,
        tavanText
      ];

      // Custom stages
      customStages.forEach(cs => {
        const csData = u[cs.id] || {};
        let csText = 'Kilitli';
        if (csData.status === 'tamamlandi') csText = 'Tamamlandı';
        else if (csData.status === 'devam') csText = 'Sürüyor';
        else if (csData.status === 'hazir') csText = 'Hazır';
        row.push(csText);
      });

      row.push(u.updatedAt || '-');

      csv += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `MESA_Santiye_Tablo_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    this.showToast('Tablo başarıyla indirildi. ✅', 'success');
  }

  // --- CLOUD / FIREBASE SETTINGS ---
  openCloudSettingsModal() {
    if (!this.hasAllPermissions()) {
      this.showToast('Bulut ayarları yalnızca tam yetkili yöneticilere açıktır.', 'warning');
      return;
    }
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
    if (!this.hasAllPermissions()) {
      this.showToast('Veri yedekleme yetkisi yalnızca tam yetkili yöneticilere aittir.', 'warning');
      return;
    }
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

  // =========================================================================
  // TOPLANTI KARARLARI, VERİLEN SÖZLER & GECİKME TAKİP SİSTEMİ
  // =========================================================================

  formatDateTR(dateStr) {
    if (!dateStr) return '-';
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateStr;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  addLog(action, details, badgeType = 'info', unitId = 'all') {
    if (!this.data) return;
    if (!this.data.logs) this.data.logs = [];

    let bName = 'Toplantı';
    let fName = 'Karar';
    if (unitId && unitId !== 'all' && unitId !== 'general') {
      const u = this.data.units ? this.data.units[unitId] : null;
      if (u) {
        bName = u.blockName;
        fName = u.floorName;
      }
    }

    this.data.logs.unshift({
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleString('tr-TR'),
      user: this.isAdmin ? 'Yönetici' : 'Sistem',
      unitId: unitId,
      blockName: bName,
      floorName: fName,
      action: action,
      details: details,
      badgeType: badgeType
    });
  }

  async toggleActionComplete(actionId) {
    const action = (this.data.meetingActions || []).find(a => a.id === actionId);
    if (!action) return;

    if (action.status === 'tamamlandi') {
      // Revert to devam/gecikmede
      action.status = (action.history && action.history.length > 1) ? 'gecikmede' : 'devam';
      action.completedDate = null;
      action.completionNote = '';
      this.addLog('Toplantı Sözü Geri Alındı', `"${action.title}" tamamlandı durumu geri alındı.`, 'info', action.unitId || 'all');
      this.showToast('Madde tekrar aktif duruma getirildi ve en üste taşındı. ⚡', 'info');
    } else {
      // Mark as completed
      const todayStr = new Date().toISOString().split('T')[0];
      action.status = 'tamamlandi';
      action.completedDate = todayStr;
      action.completionNote = 'To-Do kontrolü ile tamamlandı olarak işaretlendi.';
      
      if (!action.history) action.history = [];
      action.history.push({
        id: 'rev_' + Date.now(),
        meetingDate: todayStr,
        meetingTitle: 'Tamamlanma & Teslim',
        targetDate: todayStr,
        reason: '',
        note: '✅ Söz tutuldu ve imalat teslim alındı.',
        status: 'tamamlandi'
      });
      this.addLog('Toplantı Sözü Tamamlandı', `"${action.title}" tamamlandı olarak işaretlendi.`, 'success', action.unitId || 'all');
      this.showToast('Madde tamamlandı olarak işaretlendi ve alta taşındı! ✅', 'success');
    }

    await this.saveData(this.data);
    this.renderMeetings();
    this.renderBuilding();
  }

  toggleCompletedSection() {
    this.isCompletedCollapsed = !this.isCompletedCollapsed;
    try {
      localStorage.setItem('santiye_completed_collapsed', this.isCompletedCollapsed ? 'true' : 'false');
    } catch(e) {}
    this.renderMeetings();
  }

  getActionDelayMetrics(action) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const initial = action.initialPromiseDate ? new Date(action.initialPromiseDate) : new Date();
    initial.setHours(0, 0, 0, 0);

    const current = action.currentPromiseDate ? new Date(action.currentPromiseDate) : initial;
    current.setHours(0, 0, 0, 0);

    const diffDaysFromInitial = Math.round((today - initial) / (1000 * 60 * 60 * 24));
    const diffDaysFromCurrent = Math.round((today - current) / (1000 * 60 * 60 * 24));
    const revisionCount = (action.history && action.history.length > 1) ? (action.history.length - 1) : 0;

    const isCompleted = action.status === 'tamamlandi';
    const isOverdue = !isCompleted && (diffDaysFromInitial > 0 || diffDaysFromCurrent > 0 || revisionCount > 0);

    return {
      diffDaysFromInitial,
      diffDaysFromCurrent,
      revisionCount,
      isOverdue,
      isCompleted
    };
  }

  getDelayStatusBadge(action) {
    const m = this.getActionDelayMetrics(action);

    if (m.isCompleted) {
      return `<span class="stage-val-badge badge-ok" style="font-size:0.8rem; padding:0.35rem 0.65rem;">✅ SÖZ TUTULDU (Tamamlandı)</span>`;
    }

    if (m.diffDaysFromInitial > 0) {
      const revNote = m.revisionCount > 0 ? ` • ${m.revisionCount} Kez Ertelendi` : ' • Hedef Geçti';
      return `<span class="stage-val-badge badge-rev" style="font-size:0.8rem; padding:0.35rem 0.65rem; font-weight:800; background:#fee2e2; color:#b91c1c; border:1.5px solid #f87171;">⚠️ ${m.diffDaysFromInitial} GÜNDÜR YAPILAMADI (${revNote})</span>`;
    }

    if (m.revisionCount > 0) {
      return `<span class="stage-val-badge badge-prog" style="font-size:0.8rem; padding:0.35rem 0.65rem; font-weight:700; background:#fef3c7; color:#b45309; border:1px solid #fcd34d;">🔄 REVİZE EDİLDİ (${m.revisionCount}. Erteleme - Yeni Plan)</span>`;
    }

    return `<span class="stage-val-badge badge-wait" style="font-size:0.8rem; padding:0.35rem 0.65rem; color:#0369a1; background:#e0f2fe; border:1px solid #7dd3fc;">⏳ SÜRESİNDE DEVAM EDİYOR</span>`;
  }

  setMeetingFilter(filter) {
    this.currentMeetingFilter = filter;
    document.querySelectorAll('#view-meetings .filter-chip').forEach(c => c.classList.remove('active'));
    if (filter === 'all') document.getElementById('chipMeetingAll')?.classList.add('active');
    else if (filter === 'overdue') document.getElementById('chipMeetingOverdue')?.classList.add('active');
    else if (filter === 'pending') document.getElementById('chipMeetingPending')?.classList.add('active');
    else if (filter === 'done') document.getElementById('chipMeetingDone')?.classList.add('active');
    this.renderMeetings();
  }

  setMeetingViewMode(mode) {
    this.meetingViewMode = mode;
    const btnTodo = document.getElementById('btnViewModeTodo');
    const btnCards = document.getElementById('btnViewModeCards');
    if (mode === 'todo') {
      btnTodo?.classList.add('active');
      btnCards?.classList.remove('active');
    } else {
      btnCards?.classList.add('active');
      btnTodo?.classList.remove('active');
    }
    this.renderMeetings();
  }

  // --- ISO WEEK & MEETING UTILITIES ---
  getISOWeek(dateStr) {
    if (!dateStr) return null;
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length < 3) return null;
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (isNaN(d.getTime())) return null;
    // Set to Thursday in current week to decide the year
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  getActionWeek(action) {
    if (!action) return 'Toplantı';
    if (action.week) return action.week;
    const dateStr = action.history?.[0]?.meetingDate || action.createdAt || action.initialPromiseDate;
    const w = this.getISOWeek(dateStr);
    return w ? `${w}. Hafta` : 'Toplantı';
  }

  handleNewMeetingDateChange() {
    const dVal = document.getElementById('newActionDate')?.value;
    const w = this.getISOWeek(dVal);
    const badge = document.getElementById('newActionWeekBadge');
    if (badge) badge.innerText = w ? `📅 ${w}. Hafta` : '-';
    const titleInput = document.getElementById('newActionMeetingTitle');
    if (titleInput && (!titleInput.value || titleInput.value.includes('Hafta') || titleInput.value.includes('Koordinasyon'))) {
      titleInput.value = w ? `${w}. Hafta Koordinasyon Toplantısı` : 'Haftalık Koordinasyon Toplantısı';
    }
  }

  handleReviseMeetingDateChange() {
    const dVal = document.getElementById('reviseActionDate')?.value;
    const w = this.getISOWeek(dVal);
    const badge = document.getElementById('reviseActionWeekBadge');
    if (badge) badge.innerText = w ? `📅 ${w}. Hafta` : '-';
    const titleInput = document.getElementById('reviseActionMeetingTitle');
    if (titleInput && (!titleInput.value || titleInput.value.includes('Hafta') || titleInput.value.includes('Koordinasyon'))) {
      titleInput.value = w ? `${w}. Hafta Koordinasyon Toplantısı` : 'Koordinasyon Toplantısı';
    }
  }

  renderMeetings() {
    if (!this.data) return;
    if (!this.data.meetingActions) this.data.meetingActions = [];

    const actions = this.data.meetingActions;

    // KPI Counters
    let overdueCount = 0;
    let pendingCount = 0;
    let doneCount = 0;
    let totalCount = actions.length;

    actions.forEach(a => {
      const m = this.getActionDelayMetrics(a);
      if (m.isCompleted) {
        doneCount++;
      } else if (m.isOverdue) {
        overdueCount++;
      } else {
        pendingCount++;
      }
    });

    const elOverdue = document.getElementById('meetingKpiOverdue');
    const elPending = document.getElementById('meetingKpiPending');
    const elDone = document.getElementById('meetingKpiDone');
    const elTotal = document.getElementById('meetingKpiTotal');
    const elTabCount = document.getElementById('meetingTabCount');
    const elSummaryBadge = document.getElementById('todoSummaryBadge');

    if (elOverdue) elOverdue.innerText = overdueCount;
    if (elPending) elPending.innerText = pendingCount;
    if (elDone) elDone.innerText = doneCount;
    if (elTotal) elTotal.innerText = totalCount;
    const badgeText = overdueCount > 0 ? `${overdueCount} Gecikme` : totalCount;
    const badgeBg = overdueCount > 0 ? '#fee2e2' : '#e2e8f0';
    const badgeColor = overdueCount > 0 ? '#b91c1c' : '#475569';
    if (elTabCount) {
      elTabCount.innerText = badgeText;
      elTabCount.style.background = badgeBg;
      elTabCount.style.color = badgeColor;
    }
    const elMasterBadge = document.getElementById('meetingMasterBadge');
    if (elMasterBadge) {
      elMasterBadge.innerText = badgeText;
      elMasterBadge.style.background = badgeBg;
      elMasterBadge.style.color = badgeColor;
    }
    if (elSummaryBadge) {
      elSummaryBadge.innerText = `${totalCount} Madde • ${overdueCount} Geciken • ${doneCount} Tamamlanan`;
    }

    // Dynamic Week Options
    const weekSelect = document.getElementById('meetingFilterWeek');
    if (weekSelect) {
      const currentSelectedWeek = weekSelect.value || 'all';
      const weeks = [];
      actions.forEach(a => {
        const w = this.getActionWeek(a);
        if (w && !weeks.includes(w)) weeks.push(w);
        (a.history || []).forEach(h => {
          const hw = h.week || (this.getISOWeek(h.meetingDate) ? `${this.getISOWeek(h.meetingDate)}. Hafta` : null);
          if (hw && !weeks.includes(hw)) weeks.push(hw);
        });
      });
      // Sort numerically descending (e.g. 44, 43, 42)
      weeks.sort((a, b) => (parseInt(b) || 0) - (parseInt(a) || 0));

      const optionsKey = weeks.join(',');
      const curKey = weekSelect.getAttribute ? weekSelect.getAttribute('data-weeks-key') : (weekSelect.dataset ? weekSelect.dataset.weeksKey : null);
      if (curKey !== optionsKey) {
        if (weekSelect.setAttribute) weekSelect.setAttribute('data-weeks-key', optionsKey);
        else if (weekSelect.dataset) weekSelect.dataset.weeksKey = optionsKey;
        let optHtml = '<option value="all">📅 Tüm Haftalar</option>';
        weeks.forEach(w => {
          optHtml += `<option value="${w}">${w} Toplantıları</option>`;
        });
        weekSelect.innerHTML = optHtml;
        if (weeks.includes(currentSelectedWeek)) {
          weekSelect.value = currentSelectedWeek;
        } else {
          weekSelect.value = 'all';
        }
      }
    }

    // Filter by selected criteria
    const weekFilter = document.getElementById('meetingFilterWeek')?.value || 'all';
    const blockFilter = document.getElementById('meetingFilterBlock')?.value || 'all';
    const discFilter = document.getElementById('meetingFilterDiscipline')?.value || 'all';
    const searchText = (document.getElementById('meetingSearchInput')?.value || '').toLowerCase().trim();

    let filtered = actions.filter(a => {
      const m = this.getActionDelayMetrics(a);

      // Status chip filter
      if (this.currentMeetingFilter === 'overdue' && (!m.isOverdue || m.isCompleted)) return false;
      if (this.currentMeetingFilter === 'pending' && (m.isCompleted || m.isOverdue)) return false;
      if (this.currentMeetingFilter === 'done' && !m.isCompleted) return false;

      // Week filter
      if (weekFilter !== 'all') {
        const initialW = this.getActionWeek(a);
        const hadRevisionInWeek = (a.history || []).some(h => {
          const hw = h.week || (this.getISOWeek(h.meetingDate) ? `${this.getISOWeek(h.meetingDate)}. Hafta` : '');
          return hw === weekFilter;
        });
        if (initialW !== weekFilter && !hadRevisionInWeek) return false;
      }

      // Block filter
      if (blockFilter !== 'all') {
        if (String(a.blockId) !== String(blockFilter)) return false;
      }

      // Discipline filter
      if (discFilter !== 'all') {
        if (a.discipline !== discFilter) return false;
      }

      // Search query
      if (searchText) {
        const titleMatch = (a.title || '').toLowerCase().includes(searchText);
        const respMatch = (a.responsible || '').toLowerCase().includes(searchText);
        const noteMatch = (a.note || '').toLowerCase().includes(searchText);
        const weekMatch = (this.getActionWeek(a) || '').toLowerCase().includes(searchText);
        const historyMatch = (a.history || []).some(h => 
          (h.reason || '').toLowerCase().includes(searchText) || 
          (h.note || '').toLowerCase().includes(searchText) ||
          (h.meetingTitle || '').toLowerCase().includes(searchText) ||
          (h.week || '').toLowerCase().includes(searchText)
        );
        if (!titleMatch && !respMatch && !noteMatch && !weekMatch && !historyMatch) return false;
      }

      return true;
    });

    const container = document.getElementById('meetingCardsContainer');
    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1.5rem; background: white; border: 1.5px dashed #cbd5e1; border-radius: 10px; color: #64748b;">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📋</div>
          <h3 style="font-size: 1.1rem; font-weight: 700; color: #334155; margin-bottom: 0.35rem;">Kriterlere Uygun To-Do Maddesi Bulunamadı</h3>
          <p style="font-size: 0.85rem; max-width: 480px; margin: 0 auto 1.25rem;">Şu an seçilen filtrelerde herhangi bir karar bulunmuyor. Yeni bir madde ekleyebilir veya filtreleri temizleyebilirsiniz.</p>
          <button class="btn btn-primary btn-sm" onclick="app.openNewMeetingModal()">➕ Yeni Madde / Karar Ekle</button>
        </div>
      `;
      return;
    }

    // Split into Active (Open/Overdue/Pending) and Completed
    const openActions = [];
    const completedActions = [];

    filtered.forEach(action => {
      const m = this.getActionDelayMetrics(action);
      if (m.isCompleted) {
        completedActions.push(action);
      } else {
        openActions.push(action);
      }
    });

    // Sort open actions:
    // 1. Overdue items come first, sorted by biggest delay (most days overdue) first
    // 2. Pending items come next, sorted by createdAt descending (newest additions first)
    openActions.sort((a, b) => {
      const ma = this.getActionDelayMetrics(a);
      const mb = this.getActionDelayMetrics(b);
      if (ma.isOverdue && !mb.isOverdue) return -1;
      if (!ma.isOverdue && mb.isOverdue) return 1;
      if (ma.isOverdue && mb.isOverdue) {
        return mb.diffDaysFromInitial - ma.diffDaysFromInitial;
      }
      const dateA = a.createdAt || a.initialPromiseDate || '';
      const dateB = b.createdAt || b.initialPromiseDate || '';
      return dateB.localeCompare(dateA);
    });

    // Sort completed actions: most recently completed first
    completedActions.sort((a, b) => {
      const dateA = a.completedDate || a.createdAt || '';
      const dateB = b.completedDate || b.createdAt || '';
      return dateB.localeCompare(dateA);
    });

    // Helper: Render single To-Do row
    const renderTodoRow = (action, idx) => {
      const m = this.getActionDelayMetrics(action);
      let rowClass = 'todo-item-card';
      if (m.isCompleted) rowClass += ' done';
      else if (m.diffDaysFromInitial > 0) rowClass += ' overdue';
      else if (m.revisionCount > 0) rowClass += ' pending';

      const weekLabel = this.getActionWeek(action);

      // Location label
      let locLabel = '🏢 Genel Şantiye';
      if (action.blockId && action.blockId !== 'all') {
        const b = this.data.blocks?.find(x => String(x.id) === String(action.blockId));
        const bName = b ? b.name : `Blok ${action.blockId}`;
        const f = this.data.floors?.find(x => x.id === action.floorId);
        const fName = f ? f.name : (action.floorId === 'all' ? 'Tüm Katlar' : action.floorId);
        locLabel = `🏢 ${bName} • ${fName}`;
      }

      // Sağdaki Tik / Durum Butonu
      let tickHtml = '';
      if (m.isCompleted) {
        tickHtml = `
          <button class="todo-tick-badge tick-done" title="Söz Tamamlandı ✓ (Durumu aktiflere geri almak için tıklayın)" onclick="event.stopPropagation(); app.toggleActionComplete('${action.id}')">
            <span style="font-size: 1.15rem;">✅</span>
            <span>TAMAMLANDI</span>
          </button>
        `;
      } else if (m.diffDaysFromInitial > 0) {
        tickHtml = `
          <button class="todo-tick-badge tick-overdue" title="Tamamlandı olarak işaretlemek (tamamlananlara taşımak) için tıklayın" onclick="event.stopPropagation(); app.toggleActionComplete('${action.id}')">
            <span style="font-size: 1.15rem;">⚠️</span>
            <span>${m.diffDaysFromInitial} GÜN GECİKTİ (${m.revisionCount > 0 ? m.revisionCount + '. Erteleme' : 'Gecikmede'})</span>
          </button>
        `;
      } else {
        tickHtml = `
          <button class="todo-tick-badge tick-pending" title="Tamamlandı olarak işaretlemek (tamamlananlara taşımak) için tıklayın" onclick="event.stopPropagation(); app.toggleActionComplete('${action.id}')">
            <span style="font-size: 1.15rem;">⏳</span>
            <span>SÜRESİNDE (${this.formatDateTR(action.currentPromiseDate)})</span>
          </button>
        `;
      }

      return `
        <div class="${rowClass}" onclick="app.openActionDetailModal('${action.id}')">
          <div class="todo-left-content">
            <div class="todo-num-badge">${m.isCompleted ? '✓' : (idx + 1)}</div>
            <div class="todo-body-wrap">
              <span class="todo-badge-week">📅 ${weekLabel}</span>
              <span class="todo-badge-loc">${locLabel}</span>
              <span class="todo-badge-disc">${action.discipline || 'Genel'}</span>
              
              <span class="todo-title-text" title="${this.escapeHtml(action.title)}">
                ${this.escapeHtml(action.title)}
              </span>

              <span class="todo-meta-dates">
                <span title="İlk verilen söz tarihi (asla silinmez)">🔒 İlk Hedef: <strong>${this.formatDateTR(action.initialPromiseDate)}</strong></span>
                <span class="meta-date-arrow">➔</span>
                <span title="Güncel planlanan bitiş">Güncel: <strong style="color:${m.diffDaysFromCurrent > 0 && !m.isCompleted ? '#dc2626' : '#0284c7'};">${this.formatDateTR(action.currentPromiseDate)}</strong></span>
                ${m.revisionCount > 0 && !m.isCompleted ? `<span style="color:#b45309; font-weight:700;">(${m.revisionCount}. Erteleme)</span>` : ''}
              </span>

              <span class="todo-badge-resp" title="Sorumlu Kişi / Taşeron">👷 <strong>${this.escapeHtml(action.responsible || 'Sorumlu Belirtilmedi')}</strong></span>

              ${action.history && action.history.length > 1 && action.history[action.history.length - 1].reason && !m.isCompleted ? `
                <span class="todo-badge-reason" title="Son toplantı mazereti: ${this.escapeHtml(action.history[action.history.length - 1].reason)}">
                  ⚠️ Mazeret: ${this.escapeHtml(action.history[action.history.length - 1].reason)}
                </span>
              ` : ''}
            </div>
          </div>

          <div class="todo-right-status">
            ${tickHtml}
            <button class="todo-open-detail-btn" onclick="event.stopPropagation(); app.openActionDetailModal('${action.id}')">
              <span>🔍</span>
              <span>Detay & Geçmiş</span>
            </button>
          </div>
        </div>
      `;
    };

    // Helper: Render single Full Card
    const renderCard = (action) => {
      const m = this.getActionDelayMetrics(action);
      let cardStatusClass = 'meeting-action-card';
      if (m.isCompleted) cardStatusClass += ' status-done';
      else if (m.diffDaysFromInitial > 0) cardStatusClass += ' status-overdue';
      else if (m.revisionCount > 0) cardStatusClass += ' status-delayed';

      const weekLabel = this.getActionWeek(action);

      // Location label
      let locLabel = '🏢 Genel Şantiye';
      if (action.blockId && action.blockId !== 'all') {
        const b = this.data.blocks?.find(x => String(x.id) === String(action.blockId));
        const bName = b ? b.name : `Blok ${action.blockId}`;
        const f = this.data.floors?.find(x => x.id === action.floorId);
        const fName = f ? f.name : (action.floorId === 'all' ? 'Tüm Katlar' : action.floorId);
        locLabel = `🏢 ${bName} • ${fName}`;
      }

      // Timeline Steps HTML
      let timelineHtml = '<div class="action-timeline">';
      (action.history || []).forEach((step, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === (action.history.length - 1);
        const isFailed = step.status === 'tutulmadi' || (!isFirst && step.reason);
        const isDone = step.status === 'tamamlandi';

        const stepDate = step.meetingDate || action.createdAt;
        const stepWeek = step.week || (this.getISOWeek(stepDate) ? `${this.getISOWeek(stepDate)}. Hafta` : '');

        let stepClass = 'action-timeline-step';
        if (isDone) stepClass += ' done';
        else if (isFailed) stepClass += ' failed';
        else if (isFirst) stepClass += ' initial';

        timelineHtml += `
          <div class="${stepClass}">
            <div class="action-timeline-dot"></div>
            <div class="timeline-step-header">
              <span style="font-weight: 700; color: #1e293b;">
                ${isFirst ? '📌 1. Toplantı Sözü' : `🔄 ${idx + 1}. Toplantı Kararı`} • ${stepWeek ? `<strong>${stepWeek}</strong> • ` : ''}${this.formatDateTR(step.meetingDate)}
                ${step.meetingTitle ? `<span style="font-weight: normal; color: #64748b; margin-left: 4px;">(${this.escapeHtml(step.meetingTitle)})</span>` : ''}
              </span>
              <span style="font-size: 0.78rem; color: #475569;">
                Taahhüt Edilen Hedef: <strong style="color: #0284c7;">${this.formatDateTR(step.targetDate)}</strong>
              </span>
            </div>

            ${step.reason ? `
              <div class="timeline-step-reason">
                <strong>⚠️ Neden Yapılamadı? (Gecikme Gerekçesi / Mazeret):</strong>
                <div>${this.escapeHtml(step.reason)}</div>
              </div>
            ` : ''}

            ${step.note ? `
              <div class="timeline-step-note">
                <strong>${isFirst ? 'İlk Alınan Söz / Detay:' : 'Bu Toplantıda Verilen Yeni Söz:'}</strong>
                ${this.escapeHtml(step.note)}
              </div>
            ` : ''}
          </div>
        `;
      });
      timelineHtml += '</div>';

      return `
        <div class="${cardStatusClass}">
          <div class="action-card-header">
            <div class="action-tags">
              <span class="todo-badge-week">📅 ${weekLabel}</span>
              <span class="action-tag-loc">${locLabel}</span>
              <span class="action-tag-disc">${action.discipline || 'Genel'}</span>
              <span class="action-tag-resp">👷 ${this.escapeHtml(action.responsible || 'Sorumlu Belirtilmedi')}</span>
            </div>
            <div>
              ${this.getDelayStatusBadge(action)}
            </div>
          </div>

          <div class="action-title">${this.escapeHtml(action.title)}</div>

          <!-- Tarih ve Gecikme Metrikleri Kutusu -->
          <div class="action-meta-box">
            <div class="action-meta-col">
              <span class="meta-lbl">🔒 İlk Söz Verilen Tarih</span>
              <span class="meta-val" style="color: #0284c7;">${this.formatDateTR(action.initialPromiseDate)}</span>
              <span style="font-size: 0.7rem; color: #94a3b8;">(${weekLabel} - Kalıcı Referans)</span>
            </div>

            <div class="action-meta-col">
              <span class="meta-lbl">⏱️ Gecikme / Bekleme Süresi</span>
              <span class="meta-val" style="color: ${m.diffDaysFromInitial > 0 ? '#dc2626' : '#16a34a'};">
                ${m.isCompleted ? `✅ Tamamlandı` : (m.diffDaysFromInitial > 0 ? `⚠️ ${m.diffDaysFromInitial} Gündür Yapılamadı` : '⏳ Süresi İçinde')}
              </span>
              <span style="font-size: 0.7rem; color: #94a3b8;">
                ${m.revisionCount > 0 ? `${m.revisionCount} Kez Toplantıda Ertelendi` : 'İlk plan aşamasında'}
              </span>
            </div>

            <div class="action-meta-col">
              <span class="meta-lbl">🎯 Güncel Planlanan Bitiş</span>
              <span class="meta-val" style="color: ${m.diffDaysFromCurrent > 0 ? '#dc2626' : '#b45309'};">
                ${this.formatDateTR(action.currentPromiseDate)}
              </span>
              <span style="font-size: 0.7rem; color: #94a3b8;">
                ${m.diffDaysFromCurrent > 0 && !m.isCompleted ? `(Süresi ${m.diffDaysFromCurrent} gün geçti)` : '(Son revize plan)'}
              </span>
            </div>

            <div class="action-meta-col">
              <span class="meta-lbl">📅 Kayıt / Toplantı Tarihi</span>
              <span class="meta-val" style="color: #475569;">${this.formatDateTR(action.createdAt)}</span>
              <span style="font-size: 0.7rem; color: #94a3b8;">Ekleyen: ${this.escapeHtml(action.createdBy || 'Yönetici')}</span>
            </div>
          </div>

          <!-- Eski Sözler ve Gecikme Mazeretleri Kronolojisi (Asla Silinmeyen Tarihçe) -->
          <div class="action-timeline-wrapper">
            <div class="action-timeline-title">
              <span>📜</span>
              <span>Toplantı Kararları, Eski Sözler & Gecikme Mazeretleri Kronolojisi (${(action.history || []).length} Toplantı Kaydı)</span>
            </div>
            ${timelineHtml}
          </div>

          <!-- Aksiyon Butonları -->
          <div class="action-card-footer">
            <div style="font-size: 0.75rem; color: #64748b;">
              ${action.completedDate ? `✅ <strong>Tamamlandı:</strong> ${this.formatDateTR(action.completedDate)} • ${this.escapeHtml(action.completionNote || '')}` : '⏳ İşlem şantiye gündeminde takip ediliyor'}
            </div>

            <div style="display: flex; gap: 0.5rem; align-items: center;">
              ${!m.isCompleted ? `
                <button class="btn btn-revise btn-sm" onclick="app.openReviseMeetingModal('${action.id}')">
                  <span>🔄</span>
                  <span>Erteleme & Mazeret Ekle</span>
                </button>
                <button class="btn btn-sm" style="background:#16a34a; color:white;" onclick="app.openCompleteMeetingModal('${action.id}')">
                  <span>✅</span>
                  <span>Söz Tutuldu (Tamamla)</span>
                </button>
              ` : `
                <span class="stage-val-badge badge-ok">Tamamlandı ✓</span>
              `}

              ${this.isAdmin ? `
                <button class="btn btn-secondary btn-sm" title="Kaydı Sil" onclick="app.deleteMeetingAction('${action.id}')" style="color:#dc2626; padding:0.35rem 0.6rem;">
                  <span>🗑️</span>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    };

    // --- VIEW MODE 1: TO-DO CHECKLIST (BÜYÜK RESİM & SAĞINDA TİK) ---
    if (this.meetingViewMode === 'todo') {
      let todoHtml = '<div class="todo-list-container">';

      // 1. OPEN / ACTIVE ACTIONS (At the top!)
      if (openActions.length > 0) {
        if (completedActions.length > 0) {
          todoHtml += `
            <div class="todo-section-header">
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span style="font-size:1.1rem;">⚡</span>
                <span style="font-weight:800; color:#1e293b; font-size:0.95rem;">Aktif Şantiye To-Do Listesi & Bekleyen Kararlar</span>
                <span class="todo-count-badge badge-active">${openActions.length} Bekleyen</span>
              </div>
            </div>
          `;
        }
        openActions.forEach((action, idx) => {
          todoHtml += renderTodoRow(action, idx);
        });
      } else if (completedActions.length > 0 && this.currentMeetingFilter !== 'done') {
        todoHtml += `
          <div style="padding: 1.5rem 1rem; background: #f0fdf4; border: 1.5px dashed #86efac; border-radius: 8px; text-align: center; color: #166534; font-size: 0.9rem; font-weight: 700;">
            🎉 Harika! Bekleyen veya geciken açık bir madde kalmadı. Tüm taahhütler tamamlandı!
          </div>
        `;
      }

      // 2. COMPLETED ACTIONS (Separated at the very bottom!)
      if (completedActions.length > 0) {
        const isCollapsed = this.isCompletedCollapsed && this.currentMeetingFilter !== 'done';
        todoHtml += `
          <div class="todo-completed-section">
            <div class="todo-completed-header" onclick="app.toggleCompletedSection()">
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span style="font-size:1.1rem;">✅</span>
                <span style="font-weight:800; color:#166534; font-size:0.95rem;">Tamamlanan Sözler & Biten İşler</span>
                <span class="todo-count-badge badge-completed">${completedActions.length} Tamamlandı</span>
              </div>
              <button class="todo-toggle-btn" type="button" onclick="event.stopPropagation(); app.toggleCompletedSection()">
                ${isCollapsed ? 'Maddeleri Göster (▼)' : 'Maddeleri Gizle (▲)'}
              </button>
            </div>
            <div class="todo-completed-list" style="display: ${isCollapsed ? 'none' : 'flex'};">
        `;
        completedActions.forEach((action, idx) => {
          todoHtml += renderTodoRow(action, idx);
        });
        todoHtml += `
            </div>
          </div>
        `;
      }

      todoHtml += '</div>';
      container.innerHTML = todoHtml;
      return;
    }

    // --- VIEW MODE 2: GENİŞ KARTLAR GÖRÜNÜMÜ ---
    let html = '';
    if (openActions.length > 0) {
      if (completedActions.length > 0) {
        html += `
          <div class="todo-section-header" style="margin-bottom:0.75rem;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span style="font-size:1.1rem;">⚡</span>
              <span style="font-weight:800; color:#1e293b; font-size:0.95rem;">Aktif & Bekleyen Kararlar</span>
              <span class="todo-count-badge badge-active">${openActions.length} Bekleyen</span>
            </div>
          </div>
        `;
      }
      openActions.forEach(action => {
        html += renderCard(action);
      });
    }

    if (completedActions.length > 0) {
      const isCollapsed = this.isCompletedCollapsed && this.currentMeetingFilter !== 'done';
      html += `
        <div class="todo-completed-section">
          <div class="todo-completed-header" onclick="app.toggleCompletedSection()">
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span style="font-size:1.1rem;">✅</span>
              <span style="font-weight:800; color:#166534; font-size:0.95rem;">Tamamlanan Sözler & Biten İşler</span>
              <span class="todo-count-badge badge-completed">${completedActions.length} Tamamlandı</span>
            </div>
            <button class="todo-toggle-btn" type="button" onclick="event.stopPropagation(); app.toggleCompletedSection()">
              ${isCollapsed ? 'Maddeleri Göster (▼)' : 'Maddeleri Gizle (▲)'}
            </button>
          </div>
          <div style="display: ${isCollapsed ? 'none' : 'flex'}; flex-direction: column; gap: 1rem;">
      `;
      completedActions.forEach(action => {
        html += renderCard(action);
      });
      html += `
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  // --- MODAL: ACTION DETAIL POP-UP (AÇILIR PENCERE İLE DETAY İNCELEME) ---
  openActionDetailModal(actionId) {
    const action = (this.data.meetingActions || []).find(a => a.id === actionId);
    if (!action) return;

    const m = this.getActionDelayMetrics(action);
    const weekLabel = this.getActionWeek(action);

    // Location label
    let locLabel = '🏢 Genel Şantiye';
    if (action.blockId && action.blockId !== 'all') {
      const b = this.data.blocks?.find(x => String(x.id) === String(action.blockId));
      const bName = b ? b.name : `Blok ${action.blockId}`;
      const f = this.data.floors?.find(x => x.id === action.floorId);
      const fName = f ? f.name : (action.floorId === 'all' ? 'Tüm Katlar' : action.floorId);
      locLabel = `🏢 ${bName} • ${fName}`;
    }

    document.getElementById('actionDetailModalTitle').innerText = action.title;
    document.getElementById('actionDetailModalSubtitle').innerText = `📅 ${weekLabel} Toplantısı • ${locLabel} • [${action.discipline}] Sorumlu: ${action.responsible || 'Belirtilmedi'}`;

    // Timeline Steps HTML
    let timelineHtml = '<div class="action-timeline">';
    (action.history || []).forEach((step, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === (action.history.length - 1);
      const isFailed = step.status === 'tutulmadi' || (!isFirst && step.reason);
      const isDone = step.status === 'tamamlandi';

      const stepDate = step.meetingDate || action.createdAt;
      const stepWeek = step.week || (this.getISOWeek(stepDate) ? `${this.getISOWeek(stepDate)}. Hafta` : '');

      let stepClass = 'action-timeline-step';
      if (isDone) stepClass += ' done';
      else if (isFailed) stepClass += ' failed';
      else if (isFirst) stepClass += ' initial';

      timelineHtml += `
        <div class="${stepClass}">
          <div class="action-timeline-dot"></div>
          <div class="timeline-step-header">
            <span style="font-weight: 700; color: #1e293b;">
              ${isFirst ? '📌 1. Toplantı Kararı' : `🔄 ${idx + 1}. Toplantı Kararı`} • ${stepWeek ? `<strong>${stepWeek}</strong> • ` : ''}${this.formatDateTR(step.meetingDate)}
              ${step.meetingTitle ? `<span style="font-weight: normal; color: #64748b; margin-left: 4px;">(${this.escapeHtml(step.meetingTitle)})</span>` : ''}
            </span>
            <span style="font-size: 0.78rem; color: #475569;">
              Hedef: <strong style="color: #0284c7;">${this.formatDateTR(step.targetDate)}</strong>
            </span>
          </div>

          ${step.reason ? `
            <div class="timeline-step-reason">
              <strong>⚠️ Neden Yapılamadı? (Gecikme Gerekçesi / Mazeret):</strong>
              <div>${this.escapeHtml(step.reason)}</div>
            </div>
          ` : ''}

          ${step.note ? `
            <div class="timeline-step-note">
              <strong>${isFirst ? 'İlk Alınan Söz / Detay:' : 'Bu Toplantıda Verilen Yeni Söz:'}</strong>
              ${this.escapeHtml(step.note)}
            </div>
          ` : ''}
        </div>
      `;
    });
    timelineHtml += '</div>';

    let bodyHtml = `
      <!-- Durum Bandı -->
      <div style="margin-bottom: 1rem;">
        ${this.getDelayStatusBadge(action)}
      </div>

      <!-- Karşılaştırma Kutusu -->
      <div class="action-meta-box">
        <div class="action-meta-col">
          <span class="meta-lbl">🔒 İlk Söz Verilen Tarih</span>
          <span class="meta-val" style="color: #0284c7;">${this.formatDateTR(action.initialPromiseDate)} <span style="font-size:0.75rem; font-weight:normal; color:#0369a1;">(${weekLabel})</span></span>
          <span style="font-size: 0.7rem; color: #94a3b8;">(Sistemde kalıcı referans)</span>
        </div>

        <div class="action-meta-col">
          <span class="meta-lbl">⏱️ Gecikme Süresi</span>
          <span class="meta-val" style="color: ${m.diffDaysFromInitial > 0 ? '#dc2626' : '#16a34a'};">
            ${m.isCompleted ? '✅ Tamamlandı' : (m.diffDaysFromInitial > 0 ? `⚠️ ${m.diffDaysFromInitial} Gün Geçti` : '⏳ Süresinde')}
          </span>
          <span style="font-size: 0.7rem; color: #94a3b8;">
            ${m.revisionCount > 0 ? `${m.revisionCount} Kez Ertelendi` : 'İlk taahhüt'}
          </span>
        </div>

        <div class="action-meta-col">
          <span class="meta-lbl">🎯 Güncel Hedef Plan</span>
          <span class="meta-val" style="color: ${m.diffDaysFromCurrent > 0 ? '#dc2626' : '#b45309'};">
            ${this.formatDateTR(action.currentPromiseDate)}
          </span>
          <span style="font-size: 0.7rem; color: #94a3b8;">(Son revize hedef)</span>
        </div>

        <div class="action-meta-col">
          <span class="meta-lbl">👷 Sorumlu Taşeron</span>
          <span class="meta-val" style="font-size:0.85rem; color: #1e293b;">${this.escapeHtml(action.responsible || '-')}</span>
          <span style="font-size: 0.7rem; color: #94a3b8;">Disiplin: ${action.discipline}</span>
        </div>
      </div>

      <!-- Kronolojik Geçmiş & Mazeretler -->
      <div class="action-timeline-wrapper">
        <div class="action-timeline-title">
          <span>📜</span>
          <span>Toplantı Kararları, Eski Sözler & Gecikme Mazeretleri (${(action.history || []).length} Toplantı)</span>
        </div>
        ${timelineHtml}
      </div>
    `;

    document.getElementById('actionDetailModalBody').innerHTML = bodyHtml;

    // Footer buttons
    const canEditMeeting = this.hasPermission('meetings', 'edit');
    let footerHtml = `
      <div style="display:flex; justify-content:space-between; width:100%; align-items:center; flex-wrap:wrap; gap:0.5rem;">
        <div>
          ${this.isAdmin ? `
            <button class="btn btn-secondary btn-sm" style="color:#dc2626;" onclick="app.closeModal('modalActionDetail'); app.deleteMeetingAction('${action.id}')">
              <span>🗑️</span>
              <span>Kaydı Sil</span>
            </button>
          ` : ''}
        </div>
        <div style="display:flex; gap:0.5rem; align-items:center;">
          <button class="btn btn-secondary" onclick="app.closeModal('modalActionDetail')">Kapat</button>
          ${canEditMeeting ? (!m.isCompleted ? `
            <button class="btn btn-revise" onclick="app.closeModal('modalActionDetail'); app.openReviseMeetingModal('${action.id}')">
              <span>🔄</span>
              <span>Erteleme & Mazeret Ekle</span>
            </button>
            <button class="btn btn-primary" style="background:#16a34a;" onclick="app.closeModal('modalActionDetail'); app.openCompleteMeetingModal('${action.id}')">
              <span>✅</span>
              <span>Söz Tutuldu (Tamamla)</span>
            </button>
          ` : '') : `
            <button class="btn btn-outline btn-sm" onclick="app.closeModal('modalActionDetail'); app.openLoginModal();">
              <span>🔑</span>
              <span>Düzenlemek İçin Giriş Yap</span>
            </button>
          `}
        </div>
      </div>
    `;

    document.getElementById('actionDetailModalFooter').innerHTML = footerHtml;
    this.openModal('modalActionDetail');
  }

  // --- MODAL: NEW MEETING ACTION ---
  openNewMeetingModal(preselectedBlockId = 'all', preselectedFloorId = 'all') {
    if (!this.requireLogin('Yeni toplantı kararı eklemek için lütfen giriş yapınız.')) {
      return;
    }
    if (!this.hasPermission('meetings', 'edit')) {
      this.showToast('Toplantı kararlarını düzenleme yetkiniz bulunmamaktadır.', 'error');
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('newActionDate').value = todayStr;
    document.getElementById('newActionInitialDate').value = todayStr;
    document.getElementById('newActionTargetBlock').value = preselectedBlockId || 'all';
    document.getElementById('newActionTargetFloor').value = preselectedFloorId || 'all';
    document.getElementById('newActionTitle').value = '';
    document.getElementById('newActionResponsible').value = '';
    document.getElementById('newActionNote').value = '';
    this.handleNewMeetingDateChange();
    this.openModal('modalNewMeetingAction');
  }

  openNewMeetingModalForCurrentUnit() {
    const unitId = document.getElementById('editUnitId').value;
    const u = this.data.units[unitId];
    if (u) {
      this.closeModal('modalEditUnit');
      this.openNewMeetingModal(u.blockId, u.floorId);
    }
  }

  async saveNewMeetingAction() {
    if (!this.requireLogin('Toplantı kararı kaydetmek için lütfen giriş yapınız.')) {
      return;
    }
    if (!this.hasPermission('meetings', 'edit')) {
      this.showToast('Toplantı kararlarını düzenleme yetkiniz bulunmamaktadır.', 'error');
      return;
    }
    const title = document.getElementById('newActionTitle').value.trim();
    const initialDate = document.getElementById('newActionInitialDate').value;
    if (!title) {
      this.showToast('Lütfen taahhüt edilen konuyu / işin tanımını giriniz.', 'warning');
      return;
    }
    if (!initialDate) {
      this.showToast('Lütfen söz verilen ilk bitiş tarihini giriniz.', 'warning');
      return;
    }

    const meetingDate = document.getElementById('newActionDate').value || new Date().toISOString().split('T')[0];
    const week = this.getISOWeek(meetingDate) ? `${this.getISOWeek(meetingDate)}. Hafta` : 'Toplantı';
    const meetingTitle = document.getElementById('newActionMeetingTitle').value.trim() || `${week} Koordinasyon Toplantısı`;
    const blockId = document.getElementById('newActionTargetBlock').value;
    const floorId = document.getElementById('newActionTargetFloor').value;
    const discipline = document.getElementById('newActionDiscipline').value;
    const responsible = document.getElementById('newActionResponsible').value.trim() || 'Sorumlu Belirtilmedi';
    const note = document.getElementById('newActionNote').value.trim();

    let unitId = 'general';
    if (blockId !== 'all' && floorId !== 'all') {
      unitId = `${blockId}_${floorId}`;
    }

    const newAction = {
      id: 'act_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      createdAt: meetingDate,
      createdBy: this.isAdmin ? 'Şantiye Yöneticisi' : 'Sistem',
      week: week,
      meetingTitle: meetingTitle,
      blockId: blockId,
      floorId: floorId,
      unitId: unitId,
      discipline: discipline,
      responsible: responsible,
      title: title,
      initialPromiseDate: initialDate,
      currentPromiseDate: initialDate,
      status: 'devam',
      note: note,
      history: [
        {
          id: 'rev_' + Date.now(),
          week: week,
          meetingDate: meetingDate,
          meetingTitle: meetingTitle,
          targetDate: initialDate,
          reason: '',
          note: note || 'Toplantıda ilk taahhüt ve hedef tarih belirlendi.',
          status: 'soz_verildi'
        }
      ]
    };

    if (!this.data.meetingActions) this.data.meetingActions = [];
    this.data.meetingActions.unshift(newAction);

    // Add audit log
    this.addLog('Toplantı Sözü Eklendi', `[${week} - ${discipline}] ${responsible}: "${title}" (İlk Hedef: ${this.formatDateTR(initialDate)})`, 'primary', unitId);

    await this.saveData(this.data);
    this.closeModal('modalNewMeetingAction');
    this.renderMeetings();
    this.renderBuilding();
    this.showToast('Yeni toplantı kararı ve taahhüdü başarıyla kaydedildi! ✅', 'success');
  }

  // --- MODAL: REVISE MEETING ACTION (Erteleme & Mazeret) ---
  openReviseMeetingModal(actionId) {
    if (!this.requireLogin('Söz erteleme ve mazeret güncellemek için lütfen giriş yapınız.')) {
      return;
    }
    if (!this.hasPermission('meetings', 'edit')) {
      this.showToast('Toplantı kararlarını düzenleme yetkiniz bulunmamaktadır.', 'error');
      return;
    }
    const action = (this.data.meetingActions || []).find(a => a.id === actionId);
    if (!action) return;

    const m = this.getActionDelayMetrics(action);
    const weekLabel = this.getActionWeek(action);

    document.getElementById('reviseActionId').value = actionId;
    document.getElementById('reviseActionSummary').innerText = `${action.discipline} • ${action.responsible} ➔ "${action.title}"`;
    document.getElementById('reviseActionOriginalInfo').innerHTML = `
      🔒 <strong>İlk Verilen Söz Tarihi:</strong> ${this.formatDateTR(action.initialPromiseDate)} (${weekLabel}) (Asla Silinmez)<br>
      ⏱️ <strong>Durum:</strong> ${m.diffDaysFromInitial > 0 ? `<span style="color:#dc2626; font-weight:700;">${m.diffDaysFromInitial} gündür yapılamadı</span>` : 'Süresinde'} 
      • Bugüne kadar <strong>${m.revisionCount} kez</strong> toplantıda ertelendi.
    `;

    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('reviseActionDate').value = todayStr;
    this.handleReviseMeetingDateChange();
    document.getElementById('reviseActionReason').value = '';
    
    // Default next target: today + 7 days
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 7);
    document.getElementById('reviseActionNewDate').value = nextDate.toISOString().split('T')[0];
    document.getElementById('reviseActionNewNote').value = '';

    this.openModal('modalReviseMeetingAction');
  }

  async saveReviseMeetingAction() {
    if (!this.requireLogin('Söz erteleme ve mazeret güncellemek için lütfen giriş yapınız.')) {
      return;
    }
    if (!this.hasPermission('meetings', 'edit')) {
      this.showToast('Toplantı kararlarını düzenleme yetkiniz bulunmamaktadır.', 'error');
      return;
    }
    const actionId = document.getElementById('reviseActionId').value;
    const action = (this.data.meetingActions || []).find(a => a.id === actionId);
    if (!action) return;

    const reason = document.getElementById('reviseActionReason').value.trim();
    const newDate = document.getElementById('reviseActionNewDate').value;
    const meetingDate = document.getElementById('reviseActionDate').value || new Date().toISOString().split('T')[0];
    const week = this.getISOWeek(meetingDate) ? `${this.getISOWeek(meetingDate)}. Hafta` : 'Toplantı';
    const meetingTitle = document.getElementById('reviseActionMeetingTitle').value.trim() || `${week} Koordinasyon Toplantısı`;
    const newNote = document.getElementById('reviseActionNewNote').value.trim();

    if (!reason) {
      this.showToast('Lütfen işin neden yapılamadığını (gecikme gerekçesini) giriniz!', 'warning');
      return;
    }
    if (!newDate) {
      this.showToast('Lütfen yeni söz verilen bitiş tarihini (yeni plan) seçiniz!', 'warning');
      return;
    }

    // Mark previous step as tutulmadi
    if (action.history && action.history.length > 0) {
      action.history[action.history.length - 1].status = 'tutulmadi';
    }

    // Append new revision to history (OLD PROMISES ARE PRESERVED)
    action.history.push({
      id: 'rev_' + Date.now(),
      week: week,
      meetingDate: meetingDate,
      meetingTitle: meetingTitle,
      targetDate: newDate,
      reason: reason,
      note: newNote,
      status: 'devam'
    });

    action.currentPromiseDate = newDate;
    action.status = 'gecikmede';

    // Add audit log
    this.addLog('Toplantı Sözü Ertelendi', `[${week}] "${action.title}" yeni hedefe (${this.formatDateTR(newDate)}) ertelendi. Mazeret: ${reason}`, 'warning', action.unitId || 'all');

    await this.saveData(this.data);
    this.closeModal('modalReviseMeetingAction');
    this.closeModal('modalActionDetail');
    this.renderMeetings();
    this.renderBuilding();
    this.showToast('Gecikme nedeni ve yeni plan kaydedildi! Eski tarihler tarihçede korundu. ✅', 'success');
  }

  // --- MODAL: COMPLETE MEETING ACTION ---
  openCompleteMeetingModal(actionId) {
    if (!this.requireLogin('Tamamlandı onayı vermek için lütfen giriş yapınız.')) {
      return;
    }
    if (!this.hasPermission('meetings', 'edit')) {
      this.showToast('Toplantı kararlarını düzenleme yetkiniz bulunmamaktadır.', 'error');
      return;
    }
    const action = (this.data.meetingActions || []).find(a => a.id === actionId);
    if (!action) return;

    document.getElementById('completeActionId').value = actionId;
    document.getElementById('completeActionSummary').innerHTML = `
      <strong>${this.escapeHtml(action.title)}</strong><br>
      <span style="font-size:0.8rem; color:#15803d;">Sorumlu: ${this.escapeHtml(action.responsible)} | İlk Hedef: ${this.formatDateTR(action.initialPromiseDate)}</span>
    `;

    document.getElementById('completeActionDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('completeActionNote').value = 'İmalat ve testler tamamlandı, teslim alındı.';
    this.openModal('modalCompleteMeetingAction');
  }

  async saveCompleteMeetingAction() {
    if (!this.requireLogin('Tamamlandı onayı vermek için lütfen giriş yapınız.')) {
      return;
    }
    if (!this.hasPermission('meetings', 'edit')) {
      this.showToast('Toplantı kararlarını düzenleme yetkiniz bulunmamaktadır.', 'error');
      return;
    }
    const actionId = document.getElementById('completeActionId').value;
    const action = (this.data.meetingActions || []).find(a => a.id === actionId);
    if (!action) return;

    const completedDate = document.getElementById('completeActionDate').value || new Date().toISOString().split('T')[0];
    const completionNote = document.getElementById('completeActionNote').value.trim();

    action.status = 'tamamlandi';
    action.completedDate = completedDate;
    action.completionNote = completionNote;

    if (action.history && action.history.length > 0) {
      action.history[action.history.length - 1].status = 'tamamlandi';
    }

    action.history.push({
      id: 'rev_' + Date.now(),
      meetingDate: completedDate,
      meetingTitle: 'Tamamlanma & Teslim',
      targetDate: completedDate,
      reason: '',
      note: `✅ İş tamamlandı. ${completionNote}`,
      status: 'tamamlandi'
    });

    this.addLog('Toplantı Sözü Tamamlandı', `"${action.title}" başarıyla tamamlandı. (${this.formatDateTR(completedDate)})`, 'success', action.unitId || 'all');

    await this.saveData(this.data);
    this.closeModal('modalCompleteMeetingAction');
    this.closeModal('modalActionDetail');
    this.renderMeetings();
    this.renderBuilding();
    this.showToast('Taahhüt tamamlandı olarak işaretlendi! 🎉', 'success');
  }

  async deleteMeetingAction(actionId) {
    if (!this.requireLogin('Karar kaydını silmek için lütfen giriş yapınız.')) {
      return;
    }
    if (!this.hasPermission('meetings', 'edit')) {
      this.showToast('Toplantı kararlarını silme yetkiniz bulunmamaktadır.', 'error');
      return;
    }
    if (!confirm('Bu toplantı kararını ve geçmiş kayıtlarını silmek istediğinize emin misiniz?')) {
      return;
    }
    this.data.meetingActions = (this.data.meetingActions || []).filter(a => a.id !== actionId);
    await this.saveData(this.data);
    this.renderMeetings();
    this.renderBuilding();
    this.showToast('Toplantı kararı silindi.', 'info');
  }

  filterMeetingsByUnit(blockId, floorId) {
    this.switchTab('meetings');
    const blkSelect = document.getElementById('meetingFilterBlock');
    if (blkSelect) blkSelect.value = String(blockId);
    this.setMeetingFilter('all');
  }

  renderUnitMeetingActions(unitId) {
    const container = document.getElementById('unitMeetingActionsContainer');
    if (!container) return;

    const u = this.data.units[unitId];
    if (!u) {
      container.innerHTML = '<div style="color:#64748b;">Kat bilgisi bulunamadı.</div>';
      return;
    }

    const unitActions = (this.data.meetingActions || []).filter(a => 
      a.unitId === unitId || (String(a.blockId) === String(u.blockId) && a.floorId === u.floorId)
    );

    if (unitActions.length === 0) {
      container.innerHTML = `
        <div style="font-size:0.8rem; color:#64748b; font-style:italic; padding:0.4rem 0;">
          Bu kat için şu anda kayıtlı herhangi bir toplantı kararı / taahhüdü bulunmuyor.
        </div>
      `;
      return;
    }

    let html = '<div style="display:flex; flex-direction:column; gap:0.6rem;">';
    unitActions.forEach(a => {
      const m = this.getActionDelayMetrics(a);
      html += `
        <div style="background:white; border:1px solid #fde68a; border-radius:6px; padding:0.65rem 0.85rem; font-size:0.8rem;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; margin-bottom:0.25rem;">
            <strong>${this.escapeHtml(a.title)}</strong>
            ${this.getDelayStatusBadge(a)}
          </div>
          <div style="font-size:0.75rem; color:#64748b;">
            Sorumlu: <strong>${this.escapeHtml(a.responsible)}</strong> • 
            İlk Söz: <strong>${this.formatDateTR(a.initialPromiseDate)}</strong> • 
            Güncel Plan: <strong style="color:#b45309;">${this.formatDateTR(a.currentPromiseDate)}</strong>
          </div>
          ${a.history && a.history.length > 1 && a.history[a.history.length - 1].reason ? `
            <div style="font-size:0.74rem; color:#b91c1c; background:#fef2f2; padding:0.3rem 0.5rem; border-radius:4px; margin-top:0.35rem;">
              <strong>Son Mazeret:</strong> ${this.escapeHtml(a.history[a.history.length - 1].reason)}
            </div>
          ` : ''}
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;
  }

  // =========================================================================
  // PRIVATE NOTES (YÖNETİCİ ÖZEL NOT DEFTERİ)
  // =========================================================================
  renderPrivateNotes() {
    const container = document.getElementById('privateNotesGrid');
    if (!container) return;

    if (!this.hasPermission('private_notes', 'view')) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔒</div>
          <h3 style="font-weight: 700; margin-bottom: 0.5rem;">Erişim İzni Yok</h3>
          <p style="font-size: 0.9rem; color: #7f1d1d;">Bu bölüm şantiye yöneticisine özeldir. Ana firma ve yetkisiz profiller için gizlenmiştir.</p>
        </div>
      `;
      return;
    }

    let notes = [...(this.data?.privateNotes || [])];

    // Search filter
    const searchInput = document.getElementById('privateNoteSearchInput');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (query) {
      notes = notes.filter(n => 
        (n.title && n.title.toLowerCase().includes(query)) ||
        (n.content && n.content.toLowerCase().includes(query)) ||
        (n.category && n.category.toLowerCase().includes(query))
      );
    }

    // Category filter
    const catFilter = document.getElementById('privateNoteCategoryFilter');
    const cat = catFilter ? catFilter.value : 'all';
    if (cat && cat !== 'all') {
      notes = notes.filter(n => n.category === cat);
    }

    // Color filter
    const colFilter = document.getElementById('privateNoteColorFilter');
    const col = colFilter ? colFilter.value : 'all';
    if (col && col !== 'all') {
      notes = notes.filter(n => n.color === col);
    }

    // Sort: pinned first, then by date/id descending
    notes.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
    });

    if (notes.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 3rem 1.5rem; text-align: center; background: white; border: 1px dashed #cbd5e1; border-radius: 12px;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📝</div>
          <h3 style="font-size: 1.1rem; font-weight: 700; color: #334155;">Kayıtlı Özel Not Bulunamadı</h3>
          <p style="font-size: 0.85rem; color: #64748b; margin-top: 0.25rem;">${query || cat !== 'all' || col !== 'all' ? 'Arama kriterlerinize uyan not bulunamadı.' : 'Kendinize özel hakediş, taşeron ve şantiye notlarınızı buraya güvenle ekleyebilirsiniz.'}</p>
          <button class="btn btn-primary" onclick="app.openNewPrivateNoteModal()" style="margin-top: 1rem;">
            <span>➕ Yeni Özel Not Ekle</span>
          </button>
        </div>
      `;
      return;
    }

    const canEdit = this.hasPermission('private_notes', 'edit');

    const html = notes.map(n => {
      const colorClass = `note-${n.color || 'amber'}`;
      const pinnedClass = n.isPinned ? 'note-pinned' : '';
      const pinTitle = n.isPinned ? 'Sabitlemeyi Kaldır' : 'En Üste Sabitle';
      const pinIcon = n.isPinned ? '📌' : '📍';

      return `
        <div class="private-note-card ${colorClass} ${pinnedClass}">
          <div>
            <div class="note-card-header">
              <span class="note-category-tag">
                <span>🏷️</span>
                <span>${n.category || 'Genel Not'}</span>
              </span>

              <div style="display: flex; align-items: center; gap: 0.35rem;">
                <span style="font-size: 0.72rem; color: #64748b;">${n.updatedAt || n.createdAt || ''}</span>
                ${canEdit ? `
                  <button class="note-card-pin-btn ${n.isPinned ? 'pinned' : ''}" title="${pinTitle}" onclick="app.togglePinPrivateNote('${n.id}')">
                    ${pinIcon}
                  </button>
                ` : ''}
              </div>
            </div>

            <div class="note-card-title">${this.escapeHtml(n.title || 'Başlıksız Not')}</div>
            <div class="note-card-content">${this.escapeHtml(n.content || '')}</div>
          </div>

          <div class="note-card-footer">
            <div>
              <span>👤 ${this.escapeHtml(n.author || 'Yönetici')}</span>
            </div>

            ${canEdit ? `
              <div style="display: flex; gap: 0.35rem;">
                <button class="btn btn-secondary btn-sm" onclick="app.editPrivateNote('${n.id}')" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">
                  <span>✏️ Düzenle</span>
                </button>
                <button class="btn btn-secondary btn-sm" onclick="app.deletePrivateNote('${n.id}')" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; color: #dc2626;">
                  <span>🗑️</span>
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  openNewPrivateNoteModal() {
    if (!this.hasPermission('private_notes', 'edit')) {
      this.showToast('Özel not ekleme yetkiniz yok.', 'error');
      return;
    }
    document.getElementById('privateNoteModalTitle').innerText = '🔒 Yeni Özel Not';
    document.getElementById('privateNoteId').value = '';
    document.getElementById('privateNoteTitle').value = '';
    document.getElementById('privateNoteCategory').value = 'Hakediş & Bütçe';
    document.getElementById('privateNotePinned').checked = false;
    document.getElementById('privateNoteContent').value = '';
    this.selectNoteColor('amber');
    this.openModal('modalPrivateNote');
  }

  editPrivateNote(noteId) {
    if (!this.hasPermission('private_notes', 'edit')) {
      this.showToast('Özel not düzenleme yetkiniz yok.', 'error');
      return;
    }
    const note = (this.data?.privateNotes || []).find(n => n.id === noteId);
    if (!note) return;

    document.getElementById('privateNoteModalTitle').innerText = '🔒 Özel Notu Düzenle';
    document.getElementById('privateNoteId').value = note.id;
    document.getElementById('privateNoteTitle').value = note.title || '';
    document.getElementById('privateNoteCategory').value = note.category || 'Hakediş & Bütçe';
    document.getElementById('privateNotePinned').checked = !!note.isPinned;
    document.getElementById('privateNoteContent').value = note.content || '';
    this.selectNoteColor(note.color || 'amber');
    this.openModal('modalPrivateNote');
  }

  selectNoteColor(color) {
    this.selectedNoteColor = color;
    const hiddenInput = document.getElementById('privateNoteColor');
    if (hiddenInput) hiddenInput.value = color;

    document.querySelectorAll('.note-color-select-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-color') === color);
    });
  }

  async savePrivateNote() {
    if (!this.hasPermission('private_notes', 'edit')) {
      this.showToast('Yetkisiz işlem.', 'error');
      return;
    }

    const id = document.getElementById('privateNoteId').value;
    const title = document.getElementById('privateNoteTitle').value.trim();
    const category = document.getElementById('privateNoteCategory').value;
    const isPinned = document.getElementById('privateNotePinned').checked;
    const color = document.getElementById('privateNoteColor').value || 'amber';
    const content = document.getElementById('privateNoteContent').value.trim();

    if (!title) {
      this.showToast('Lütfen not başlığı giriniz.', 'warning');
      return;
    }
    if (!content) {
      this.showToast('Lütfen not içeriğini giriniz.', 'warning');
      return;
    }

    if (!this.data.privateNotes) this.data.privateNotes = [];

    const nowStr = new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });

    if (id) {
      const note = this.data.privateNotes.find(n => n.id === id);
      if (note) {
        note.title = title;
        note.category = category;
        note.isPinned = isPinned;
        note.color = color;
        note.content = content;
        note.updatedAt = nowStr;
      }
    } else {
      const newNote = {
        id: 'note_' + Date.now(),
        title: title,
        category: category,
        color: color,
        isPinned: isPinned,
        content: content,
        createdAt: nowStr,
        updatedAt: nowStr,
        author: 'Yönetici (Ben)'
      };
      this.data.privateNotes.unshift(newNote);
    }

    await this.saveData(this.data);
    this.closeModal('modalPrivateNote');
    this.renderPrivateNotes();
    this.updateRoleUI();
    this.showToast('Özel not başarıyla kaydedildi! 🔒', 'success');
  }

  async togglePinPrivateNote(noteId) {
    if (!this.hasPermission('private_notes', 'edit')) return;
    const note = (this.data?.privateNotes || []).find(n => n.id === noteId);
    if (!note) return;

    note.isPinned = !note.isPinned;
    note.updatedAt = new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
    await this.saveData(this.data);
    this.renderPrivateNotes();
    this.showToast(note.isPinned ? 'Not en üste sabitlendi 📌' : 'Sabitleme kaldırıldı 📍', 'info');
  }

  async deletePrivateNote(noteId) {
    if (!this.hasPermission('private_notes', 'edit')) return;
    if (!confirm('Bu özel notu silmek istediğinize emin misiniz?')) return;

    this.data.privateNotes = (this.data.privateNotes || []).filter(n => n.id !== noteId);
    await this.saveData(this.data);
    this.renderPrivateNotes();
    this.updateRoleUI();
    this.showToast('Özel not silindi.', 'info');
  }

  // =========================================================================
  // INTERNAL WORK PLAN (İÇ SAHA EKİBİ OPERASYONEL İŞ PLANI - 1 AYLIK EXCEL ÇİZELGESİ)
  // =========================================================================

  getTeamInfo(teamName) {
    const raw = (teamName || '').toLowerCase();
    if (raw.includes('test')) {
      return {
        label: 'Elektrik Test Ekibi',
        short: '⚡ Test Ekibi',
        badgeClass: 'team-col-test',
        themeClass: 'team-theme-test',
        color: '#0284c7'
      };
    } else if (raw.includes('pano')) {
      return {
        label: 'Pano Montaj Ekibi',
        short: '🔌 Pano Ekibi',
        badgeClass: 'team-col-pano',
        themeClass: 'team-theme-pano',
        color: '#7c3aed'
      };
    } else if (raw.includes('kablo') || raw.includes('tava')) {
      return {
        label: 'Kablo & Tava Ekibi',
        short: '🪜 Tava/Kablo',
        badgeClass: 'team-col-kablo',
        themeClass: 'team-theme-kablo',
        color: '#d97706'
      };
    } else if (raw.includes('mühendis') || raw.includes('ölçüm')) {
      return {
        label: 'Saha Mühendisliği',
        short: '📐 Mühendislik',
        badgeClass: 'team-col-muh',
        themeClass: 'team-theme-muh',
        color: '#059669'
      };
    } else {
      const shortText = teamName ? teamName.substring(0, 16) : 'Saha Ekibi';
      return {
        label: teamName || 'Saha Ekibi',
        short: `👷 ${shortText}`,
        badgeClass: 'team-col-genel',
        themeClass: 'team-theme-genel',
        color: '#64748b'
      };
    }
  }

  setInternalViewMode(mode) {
    this.internalPlanViewMode = mode;
    const btnExcel = document.getElementById('btnViewModeExcel');
    const btnCards = document.getElementById('btnViewModeCards');
    if (btnExcel) btnExcel.classList.toggle('active', mode === 'excel');
    if (btnCards) btnCards.classList.toggle('active', mode === 'cards');
    this.renderInternalPlan();
  }

  changeSchedulePeriod(offsetDays) {
    const cur = new Date(this.internalPlanScheduleStartDate || '2026-10-28');
    cur.setDate(cur.getDate() + offsetDays);
    this.internalPlanScheduleStartDate = cur.toISOString().split('T')[0];
    this.renderExcelSchedule();
  }

  resetScheduleToToday() {
    this.internalPlanScheduleStartDate = '2026-10-28';
    this.renderExcelSchedule();
  }

  renderInternalPlan() {
    if (!this.hasPermission('internal_plan', 'view')) {
      const excelCont = document.getElementById('internalExcelScheduleContainer');
      const cardsCont = document.getElementById('internalTasksCardsContainer');
      const msg = `
        <div style="padding: 3rem; text-align: center; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📅</div>
          <h3 style="font-weight: 700; margin-bottom: 0.5rem;">Erişim İzni Yok</h3>
          <p style="font-size: 0.9rem; color: #7f1d1d;">Bu bölüm iç elektrik ekibine ve yöneticilere özeldir. Ana firma (MESA) için gizlenmiştir.</p>
        </div>
      `;
      if (excelCont) excelCont.innerHTML = msg;
      if (cardsCont) cardsCont.innerHTML = '';
      return;
    }

    const allTasks = [...(this.data?.internalWorkPlan || [])];

    // Update KPIs
    const total = allTasks.length;
    const inProg = allTasks.filter(t => t.status === 'in_progress').length;
    const completed = allTasks.filter(t => t.status === 'completed').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const kpiTotEl = document.getElementById('kpiIntTotal');
    const kpiProgEl = document.getElementById('kpiIntProgress');
    const kpiCompEl = document.getElementById('kpiIntCompleted');
    const kpiRateEl = document.getElementById('kpiIntRate');

    if (kpiTotEl) kpiTotEl.innerText = total;
    if (kpiProgEl) kpiProgEl.innerText = inProg;
    if (kpiCompEl) kpiCompEl.innerText = completed;
    if (kpiRateEl) kpiRateEl.innerText = `%${rate}`;

    const excelCont = document.getElementById('internalExcelScheduleContainer');
    const cardsCont = document.getElementById('internalTasksCardsContainer');

    if (this.internalPlanViewMode === 'cards') {
      if (excelCont) excelCont.style.display = 'none';
      if (cardsCont) {
        cardsCont.style.display = 'flex';
        this.renderInternalTasksCards();
      }
    } else {
      if (cardsCont) cardsCont.style.display = 'none';
      if (excelCont) {
        excelCont.style.display = 'block';
        this.renderExcelSchedule();
      }
    }
  }

  // --- 1 AYLIK EXCEL ÇİZELGESİ (GANTT SCHEDULE MATRIX) ---
  renderExcelSchedule() {
    const container = document.getElementById('internalExcelScheduleContainer');
    if (!container) return;

    const allTasks = [...(this.data?.internalWorkPlan || [])];

    // Filter tasks
    const teamFilter = document.getElementById('internalFilterTeam')?.value || 'all';
    const statusFilter = document.getElementById('internalFilterStatus')?.value || 'all';
    const catFilter = document.getElementById('internalFilterCategory')?.value || 'all';

    let tasks = allTasks.filter(t => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (catFilter !== 'all' && t.category !== catFilter) return false;
      if (teamFilter !== 'all') {
        const team = this.getTeamInfo(t.assignedTo);
        if (teamFilter === 'test' && !team.badgeClass.includes('test')) return false;
        if (teamFilter === 'pano' && !team.badgeClass.includes('pano')) return false;
        if (teamFilter === 'kablo' && !team.badgeClass.includes('kablo')) return false;
        if (teamFilter === 'muh' && !team.badgeClass.includes('muh')) return false;
      }
      return true;
    });

    // Generate 30 days starting from this.internalPlanScheduleStartDate
    const startDate = new Date(this.internalPlanScheduleStartDate || '2026-10-28');
    const days = [];
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const todayStr = '2026-10-28'; // Current reference shantye time

    for (let i = 0; i < 30; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      days.push({
        dateObj: d,
        iso: iso,
        dayNum: String(d.getDate()).padStart(2, '0'),
        dayName: dayNames[d.getDay()],
        monthName: monthNames[d.getMonth()],
        year: d.getFullYear(),
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isToday: iso === todayStr
      });
    }

    // Update Period Label
    const firstDay = days[0];
    const lastDay = days[days.length - 1];
    const periodLabelEl = document.getElementById('excelSchedulePeriodLabel');
    if (periodLabelEl) {
      periodLabelEl.innerText = `${firstDay.dayNum} ${firstDay.monthName} - ${lastDay.dayNum} ${lastDay.monthName} ${lastDay.year} (1 Aylık Plan)`;
    }

    // Group days by ISO week for Top Header row
    const weekGroups = [];
    let curGroup = null;
    days.forEach(day => {
      const wNum = this.getISOWeek(day.iso) || 44;
      const key = `${day.monthName}_W${wNum}`;
      if (!curGroup || curGroup.key !== key) {
        curGroup = { key: key, count: 1, month: day.monthName, week: wNum };
        weekGroups.push(curGroup);
      } else {
        curGroup.count++;
      }
    });

    // Top Header Row 1 (Grouped Weeks)
    const headerRow1 = `
      <tr>
        <th class="excel-col-num" rowspan="2">#</th>
        <th class="excel-col-title" rowspan="2">İş / İmalat Başlığı</th>
        <th class="excel-col-team" rowspan="2">Sorumlu Ekip</th>
        <th style="width: 85px; min-width: 85px; max-width: 85px; font-size:0.75rem;" rowspan="2">Hedef</th>
        <th style="width: 80px; min-width: 80px; max-width: 80px; font-size:0.75rem;" rowspan="2">Durum</th>
        ${weekGroups.map(g => `<th class="excel-header-group" colspan="${g.count}">📅 ${g.week}. Hafta (${g.month})</th>`).join('')}
      </tr>
    `;

    // Header Row 2 (Daily columns)
    const headerRow2 = `
      <tr>
        ${days.map(d => `
          <th class="excel-day-th ${d.isWeekend ? 'weekend' : ''} ${d.isToday ? 'today' : ''}" title="${d.dayNum} ${d.monthName} ${d.year} (${d.dayName})">
            <div>${d.dayNum}</div>
            <div style="font-size:0.62rem; font-weight:normal; opacity:0.85;">${d.dayName}</div>
          </th>
        `).join('')}
      </tr>
    `;

    // Calculate daily active crew count across the 30 days
    const dailyActiveCounts = new Array(days.length).fill(0);

    // Build Task Rows
    const canEdit = this.hasPermission('internal_plan', 'edit');

    const bodyRows = tasks.map((task, idx) => {
      const team = this.getTeamInfo(task.assignedTo);

      // Determine matching day range
      const tStart = task.startDate || '2026-10-28';
      const tEnd = task.targetDate || task.startDate || '2026-10-31';

      // Find indices of active days within the visible 30 days
      const activeIndices = [];
      days.forEach((day, dIdx) => {
        if (day.iso >= tStart && day.iso <= tEnd) {
          activeIndices.push(dIdx);
          dailyActiveCounts[dIdx]++;
        }
      });

      // Status badge
      let statusBadge = '<span class="stage-val-badge badge-wait" style="font-size:0.68rem; padding:1px 5px;">⏳ Bekliyor</span>';
      if (task.status === 'in_progress') {
        statusBadge = '<span class="stage-val-badge badge-prog" style="font-size:0.68rem; padding:1px 5px;">🚀 Sürüyor</span>';
      } else if (task.status === 'completed') {
        statusBadge = '<span class="stage-val-badge badge-ok" style="font-size:0.68rem; padding:1px 5px;">✅ Bitti</span>';
      }

      // 30 Day Cells
      const dayCellsHtml = days.map((day, dIdx) => {
        const isActive = activeIndices.includes(dIdx);
        const isStart = activeIndices.length > 0 && dIdx === activeIndices[0];
        const isEnd = activeIndices.length > 0 && dIdx === activeIndices[activeIndices.length - 1];

        if (isActive) {
          const theme = task.status === 'completed' ? 'team-theme-completed' : team.themeClass;
          const showLabel = isStart || (activeIndices.length > 3 && dIdx === activeIndices[Math.floor(activeIndices.length / 2)]);

          return `
            <td class="excel-day-td active-day ${day.isWeekend ? 'weekend' : ''} ${day.isToday ? 'today-col' : ''}" 
                onclick="app.editInternalTask('${task.id}')" 
                title="${this.escapeHtml(task.title)} | ${team.label} (${task.startDate} - ${task.targetDate})">
              <div class="excel-bar-block ${theme} ${isStart ? 'excel-bar-start' : ''} ${isEnd ? 'excel-bar-end' : ''}">
                ${showLabel ? `<span>${team.short}</span>` : (task.status === 'completed' ? '✓' : '•')}
              </div>
            </td>
          `;
        } else {
          return `
            <td class="excel-day-td ${day.isWeekend ? 'weekend' : ''} ${day.isToday ? 'today-col' : ''}"></td>
          `;
        }
      }).join('');

      return `
        <tr class="excel-row">
          <td class="excel-col-num">${idx + 1}</td>
          <td class="excel-col-title" onclick="app.editInternalTask('${task.id}')" style="cursor:pointer;" title="Düzenlemek için tıklayınız">
            <div style="font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${this.escapeHtml(task.title)}">
              ${this.escapeHtml(task.title)}
            </div>
            <div style="font-size:0.7rem; color:#64748b; display:flex; gap:4px; align-items:center; margin-top:2px;">
              <span>🏷️ ${task.category || 'Genel'}</span>
              <span>•</span>
              <span style="color:#0284c7;">%${task.progress || 0}</span>
            </div>
          </td>
          <td class="excel-col-team">
            <span class="team-col-badge ${team.badgeClass}">
              <strong>${team.short}</strong>
            </span>
          </td>
          <td style="text-align:center; font-size:0.75rem; color:#475569; padding:0 4px !important;">
            ${task.targetDate ? task.targetDate.split('-').slice(1).reverse().join('/') : '-'}
          </td>
          <td style="text-align:center; padding:0 4px !important;">
            ${statusBadge}
          </td>
          ${dayCellsHtml}
        </tr>
      `;
    }).join('');

    // Summary Footer Row (Daily Active Crews on Site)
    const summaryRow = `
      <tr style="background:#f8fafc; font-weight:700; border-top:2px solid #cbd5e1;">
        <td class="excel-col-num" style="background:#f1f5f9;">∑</td>
        <td class="excel-col-title" style="background:#f1f5f9; font-size:0.76rem; color:#334155;">
          <strong>👷 Günlük Sahadaki Aktif Görev / Ekip Sayısı</strong>
        </td>
        <td class="excel-col-team" style="background:#f1f5f9; font-size:0.74rem; color:#64748b;">
          Toplam ${tasks.length} Görev
        </td>
        <td colspan="2" style="background:#f1f5f9; text-align:center; font-size:0.72rem; color:#64748b;">
          Yoğunluk
        </td>
        ${dailyActiveCounts.map((cnt, i) => {
          const d = days[i];
          const bg = cnt > 0 ? (cnt >= 3 ? '#fee2e2; color:#991b1b;' : '#e0f2fe; color:#0369a1;') : 'transparent; color:#94a3b8;';
          return `
            <td class="excel-day-td ${d.isWeekend ? 'weekend' : ''} ${d.isToday ? 'today-col' : ''}" style="font-size:0.72rem; font-weight:800; text-align:center;">
              <span style="display:inline-block; padding:1px 4px; border-radius:4px; background:${bg}">${cnt}</span>
            </td>
          `;
        }).join('')}
      </tr>
    `;

    // Legend HTML
    const legendHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:0.65rem 1rem; background:#f8fafc; border-top:1px solid #e2e8f0; flex-wrap:wrap; gap:0.5rem; font-size:0.76rem;">
        <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
          <span style="font-weight:700; color:#334155;">Ekip Lejantı:</span>
          <span class="excel-legend-item team-col-test">⚡ Elektrik Test Ekibi</span>
          <span class="excel-legend-item team-col-pano">🔌 Pano Montaj Ekibi</span>
          <span class="excel-legend-item team-col-kablo">🪜 Kablo & Tava Ekibi</span>
          <span class="excel-legend-item team-col-muh">📐 Saha Mühendisliği</span>
          <span class="excel-legend-item" style="background:#dcfce7; color:#15803d; border-color:#86efac;">✅ Tamamlandı (✓)</span>
        </div>
        <div style="color:#64748b; font-size:0.74rem;">
          💡 İpucu: Herhangi bir satıra veya renkli güne tıklayarak görevi düzenleyebilir ve alt kontrol listesini güncelleyebilirsiniz.
        </div>
      </div>
    `;

    container.innerHTML = `
      <div class="excel-schedule-wrap">
        <div class="excel-schedule-scroll">
          <table class="excel-table">
            <thead>
              ${headerRow1}
              ${headerRow2}
            </thead>
            <tbody>
              ${tasks.length > 0 ? bodyRows : `
                <tr>
                  <td colspan="${5 + days.length}" style="padding:2.5rem; text-align:center; color:#64748b;">
                    Seçili filtrelere uygun iş planı bulunmuyor. Yeni bir görev eklemek için 'Yeni İş / Görev Ekle' butonunu kullanabilirsiniz.
                  </td>
                </tr>
              `}
              ${tasks.length > 0 ? summaryRow : ''}
            </tbody>
          </table>
        </div>
        ${legendHtml}
      </div>
    `;
  }

  // --- KART GÖRÜNÜMÜ (SUB-CHECKLIST DETAYLI LİSTE) ---
  renderInternalTasksCards() {
    const container = document.getElementById('internalTasksCardsContainer');
    if (!container) return;

    const allTasks = [...(this.data?.internalWorkPlan || [])];
    const teamFilter = document.getElementById('internalFilterTeam')?.value || 'all';
    const statusFilter = document.getElementById('internalFilterStatus')?.value || 'all';
    const catFilter = document.getElementById('internalFilterCategory')?.value || 'all';

    let tasks = allTasks.filter(t => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (catFilter !== 'all' && t.category !== catFilter) return false;
      if (teamFilter !== 'all') {
        const team = this.getTeamInfo(t.assignedTo);
        if (teamFilter === 'test' && !team.badgeClass.includes('test')) return false;
        if (teamFilter === 'pano' && !team.badgeClass.includes('pano')) return false;
        if (teamFilter === 'kablo' && !team.badgeClass.includes('kablo')) return false;
        if (teamFilter === 'muh' && !team.badgeClass.includes('muh')) return false;
      }
      return true;
    });

    if (tasks.length === 0) {
      container.innerHTML = `
        <div style="padding: 3rem 1.5rem; text-align: center; background: white; border: 1px dashed #cbd5e1; border-radius: 12px;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📅</div>
          <h3 style="font-size: 1.1rem; font-weight: 700; color: #334155;">İç Görev Bulunamadı</h3>
          <p style="font-size: 0.85rem; color: #64748b; margin-top: 0.25rem;">Seçili filtrelere uygun görev bulunmuyor.</p>
        </div>
      `;
      return;
    }

    const canEdit = this.hasPermission('internal_plan', 'edit');

    const html = tasks.map(t => {
      const team = this.getTeamInfo(t.assignedTo);
      let statusBadge = '<span class="stage-val-badge badge-wait">⏳ Beklemede</span>';
      if (t.status === 'in_progress') {
        statusBadge = '<span class="stage-val-badge badge-prog">🚀 İmalat / Test Sürüyor</span>';
      } else if (t.status === 'completed') {
        statusBadge = '<span class="stage-val-badge badge-ok">✅ Tamamlandı</span>';
      }

      const chkList = t.checklist || [];
      const doneCount = chkList.filter(c => c.done).length;
      const chkTotal = chkList.length;
      const chkPct = chkTotal > 0 ? Math.round((doneCount / chkTotal) * 100) : (t.status === 'completed' ? 100 : 0);

      const checklistHtml = chkList.map(c => `
        <label class="internal-checklist-item ${c.done ? 'done' : ''}">
          <input type="checkbox" ${c.done ? 'checked' : ''} ${canEdit ? `onchange="app.toggleChecklistItem('${t.id}', '${c.id}')"` : 'disabled'}>
          <span>${this.escapeHtml(c.text)}</span>
        </label>
      `).join('');

      return `
        <div class="internal-task-card status-${t.status}">
          <div class="internal-task-top">
            <div class="internal-task-title-row">
              <span class="todo-badge-week">📅 ${t.week || 44}. Hafta</span>
              <span class="team-col-badge ${team.badgeClass}"><strong>${team.short}</strong></span>
              <span class="internal-task-title">${this.escapeHtml(t.title || 'Başlıksız Görev')}</span>
            </div>
            <div>${statusBadge}</div>
          </div>

          <div class="internal-task-meta" style="margin-bottom: 0.6rem;">
            <span>👷 <strong>Sorumlu:</strong> ${this.escapeHtml(t.assignedTo || 'Elektrik Test Ekibi')}</span>
            <span>📅 <strong>Başlangıç - Hedef:</strong> ${t.startDate || '-'} ➔ ${t.targetDate || '-'}</span>
          </div>

          ${chkList.length > 0 ? `
            <div class="internal-checklist-container">
              <div class="internal-checklist-header">
                <span>ALT KONTROL LİSTESİ (${doneCount}/${chkTotal})</span>
                <span>%${chkPct}</span>
              </div>
              <div class="kpi-progress" style="margin-bottom: 0.5rem; height: 5px;">
                <div class="kpi-bar" style="width: ${chkPct}%; background: ${chkPct === 100 ? '#22c55e' : '#0284c7'};"></div>
              </div>
              ${checklistHtml}
            </div>
          ` : ''}

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 0.85rem; padding-top: 0.6rem; border-top: 1px solid #f1f5f9; flex-wrap:wrap; gap:0.5rem;">
            <div style="display:flex; gap:0.4rem; align-items:center;">
              ${canEdit ? `
                ${t.status === 'pending' ? `
                  <button class="btn btn-secondary btn-sm" onclick="app.setInternalTaskStatus('${t.id}', 'in_progress')" style="color:#0284c7;">
                    <span>🚀 Başlat</span>
                  </button>
                ` : ''}
                ${t.status === 'in_progress' ? `
                  <button class="btn btn-primary btn-sm" onclick="app.setInternalTaskStatus('${t.id}', 'completed')" style="background:#16a34a;">
                    <span>✅ Tamamla</span>
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="app.setInternalTaskStatus('${t.id}', 'pending')">
                    <span>⏳ Beklet</span>
                  </button>
                ` : ''}
                ${t.status === 'completed' ? `
                  <button class="btn btn-secondary btn-sm" onclick="app.setInternalTaskStatus('${t.id}', 'in_progress')">
                    <span>↩️ Yeniden Aç</span>
                  </button>
                ` : ''}
              ` : ''}
            </div>

            ${canEdit ? `
              <div style="display:flex; gap:0.4rem;">
                <button class="btn btn-secondary btn-sm" onclick="app.editInternalTask('${t.id}')">
                  <span>✏️ Düzenle</span>
                </button>
                <button class="btn btn-secondary btn-sm" onclick="app.deleteInternalTask('${t.id}')" style="color:#dc2626;">
                  <span>🗑️</span>
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  exportInternalScheduleToCSV() {
    const tasks = this.data?.internalWorkPlan || [];
    if (tasks.length === 0) {
      this.showToast('İndirilecek iç görev bulunmuyor.', 'warning');
      return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM for Microsoft Excel
    csvContent += 'No;İş / İmalat Başlığı;Sorumlu Ekip;Faaliyet Alanı;Öncelik;Başlangıç;Hedef Bitiş;Durum;İlerleme Yüzdesi;Notlar\n';

    tasks.forEach((t, i) => {
      const statusTR = t.status === 'completed' ? 'Tamamlandı' : t.status === 'in_progress' ? 'Sürüyor' : 'Beklemede';
      const cleanTitle = (t.title || '').replace(/;/g, ',');
      const cleanNotes = (t.notes || '').replace(/;/g, ',').replace(/\n/g, ' ');
      csvContent += `${i + 1};"${cleanTitle}";"${t.assignedTo || ''}";"${t.category || ''}";"${t.priority || ''}";"${t.startDate || ''}";"${t.targetDate || ''}";"${statusTR}";%${t.progress || 0};"${cleanNotes}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MESA_Santiye_1_Aylik_Is_Plani_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('1 Aylık İş Planı Excel/CSV dosyası başarıyla indirildi! 📥', 'success');
  }

    openNewInternalTaskModal() {
    if (!this.hasPermission('internal_plan', 'edit')) {
      this.showToast('İç görev ekleme yetkiniz yok.', 'error');
      return;
    }
    document.getElementById('internalTaskModalTitle').innerText = '📅 Yeni İç İş Planı Görevi';
    document.getElementById('internalTaskId').value = '';
    document.getElementById('internalTaskWeek').value = this.getCurrentISOWeek();
    document.getElementById('internalTaskTitle').value = '';
    document.getElementById('internalTaskCategory').value = 'Test & Devreye Alma';
    document.getElementById('internalTaskPriority').value = 'high';
    document.getElementById('internalTaskAssignee').value = 'Elektrik Test Ekibi (Ahmet Usta)';
    document.getElementById('internalTaskStatus').value = 'in_progress';
    document.getElementById('internalTaskStartDate').value = new Date().toISOString().split('T')[0];
    
    const nextTarget = new Date();
    nextTarget.setDate(nextTarget.getDate() + 4);
    document.getElementById('internalTaskTargetDate').value = nextTarget.toISOString().split('T')[0];
    
    document.getElementById('internalTaskNotes').value = '';

    const chkContainer = document.getElementById('modalChecklistItemsContainer');
    if (chkContainer) {
      chkContainer.innerHTML = '';
      this.addChecklistRowToModal('Ön hazırlık ve cihaz kalibrasyonu', false);
      this.addChecklistRowToModal('Kat dağıtım panoları ölçümleri', false);
    }

    this.openModal('modalInternalTask');
  }

  editInternalTask(taskId) {
    if (!this.hasPermission('internal_plan', 'edit')) {
      this.showToast('İç görev düzenleme yetkiniz yok.', 'error');
      return;
    }
    const task = (this.data?.internalWorkPlan || []).find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('internalTaskModalTitle').innerText = '📅 İç Görevi Düzenle';
    document.getElementById('internalTaskId').value = task.id;
    document.getElementById('internalTaskWeek').value = task.week || 44;
    document.getElementById('internalTaskTitle').value = task.title || '';
    document.getElementById('internalTaskCategory').value = task.category || 'Test & Devreye Alma';
    document.getElementById('internalTaskPriority').value = task.priority || 'high';
    document.getElementById('internalTaskAssignee').value = task.assignedTo || '';
    document.getElementById('internalTaskStatus').value = task.status || 'in_progress';
    document.getElementById('internalTaskStartDate').value = task.startDate || '';
    document.getElementById('internalTaskTargetDate').value = task.targetDate || '';
    document.getElementById('internalTaskNotes').value = task.notes || '';

    const chkContainer = document.getElementById('modalChecklistItemsContainer');
    if (chkContainer) {
      chkContainer.innerHTML = '';
      (task.checklist || []).forEach(c => {
        this.addChecklistRowToModal(c.text, c.done);
      });
    }

    this.openModal('modalInternalTask');
  }

  addChecklistRowToModal(text = '', done = false) {
    const container = document.getElementById('modalChecklistItemsContainer');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'modal-checklist-row';
    row.style.cssText = 'display: flex; gap: 0.5rem; align-items: center;';
    row.innerHTML = `
      <input type="checkbox" class="chk-item-done" ${done ? 'checked' : ''} style="width:16px; height:16px; accent-color:#0284c7; cursor:pointer;">
      <input type="text" class="form-control chk-item-text" value="${this.escapeHtml(text)}" placeholder="Kontrol listesi adımı..." style="font-size:0.85rem; padding:0.35rem 0.6rem; flex:1;">
      <button type="button" class="btn btn-secondary btn-sm" onclick="this.parentElement.remove()" style="padding:0.25rem 0.5rem; color:#dc2626;">&times;</button>
    `;
    container.appendChild(row);
  }

  async saveInternalTask() {
    if (!this.hasPermission('internal_plan', 'edit')) {
      this.showToast('Yetkisiz işlem.', 'error');
      return;
    }

    const id = document.getElementById('internalTaskId').value;
    const week = parseInt(document.getElementById('internalTaskWeek').value) || 44;
    const title = document.getElementById('internalTaskTitle').value.trim();
    const category = document.getElementById('internalTaskCategory').value;
    const priority = document.getElementById('internalTaskPriority').value;
    const assignedTo = document.getElementById('internalTaskAssignee').value.trim();
    const status = document.getElementById('internalTaskStatus').value;
    const startDate = document.getElementById('internalTaskStartDate').value;
    const targetDate = document.getElementById('internalTaskTargetDate').value;
    const notes = document.getElementById('internalTaskNotes').value.trim();

    if (!title) {
      this.showToast('Lütfen görev başlığı giriniz.', 'warning');
      return;
    }
    if (!targetDate) {
      this.showToast('Lütfen hedef teslim tarihi giriniz.', 'warning');
      return;
    }

    const chkRows = document.querySelectorAll('#modalChecklistItemsContainer .modal-checklist-row');
    const checklist = [];
    chkRows.forEach((r, idx) => {
      const t = r.querySelector('.chk-item-text').value.trim();
      const d = r.querySelector('.chk-item-done').checked;
      if (t) {
        checklist.push({ id: `chk_${Date.now()}_${idx}`, text: t, done: d });
      }
    });

    const doneCount = checklist.filter(c => c.done).length;
    const progress = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : (status === 'completed' ? 100 : 0);

    if (!this.data.internalWorkPlan) this.data.internalWorkPlan = [];

    if (id) {
      const task = this.data.internalWorkPlan.find(t => t.id === id);
      if (task) {
        task.week = week;
        task.title = title;
        task.category = category;
        task.priority = priority;
        task.assignedTo = assignedTo;
        task.status = status;
        task.startDate = startDate;
        task.targetDate = targetDate;
        task.notes = notes;
        task.checklist = checklist;
        task.progress = progress;
      }
    } else {
      const newTask = {
        id: 'int_task_' + Date.now(),
        week: week,
        title: title,
        category: category,
        priority: priority,
        assignedTo: assignedTo || 'Elektrik Test Ekibi',
        status: status,
        startDate: startDate,
        targetDate: targetDate,
        notes: notes,
        checklist: checklist,
        progress: progress
      };
      this.data.internalWorkPlan.unshift(newTask);
    }

    await this.saveData(this.data);
    this.closeModal('modalInternalTask');
    this.renderInternalPlan();
    this.updateRoleUI();
    this.showToast('İç iş planı görevi kaydedildi! 📅', 'success');
  }

  async setInternalTaskStatus(taskId, newStatus) {
    if (!this.hasPermission('internal_plan', 'edit')) return;
    const task = (this.data?.internalWorkPlan || []).find(t => t.id === taskId);
    if (!task) return;

    task.status = newStatus;
    if (newStatus === 'completed' && task.checklist) {
      task.checklist.forEach(c => c.done = true);
      task.progress = 100;
    }
    await this.saveData(this.data);
    this.renderInternalPlan();
    this.updateRoleUI();
    this.showToast(`Görev durumu '${newStatus === 'completed' ? 'Tamamlandı' : newStatus === 'in_progress' ? 'Sürüyor' : 'Beklemede'}' olarak güncellendi.`, 'success');
  }

  async toggleChecklistItem(taskId, chkId) {
    if (!this.hasPermission('internal_plan', 'edit')) return;
    const task = (this.data?.internalWorkPlan || []).find(t => t.id === taskId);
    if (!task || !task.checklist) return;

    const item = task.checklist.find(c => c.id === chkId);
    if (!item) return;

    item.done = !item.done;
    const doneCount = task.checklist.filter(c => c.done).length;
    task.progress = Math.round((doneCount / task.checklist.length) * 100);

    if (task.progress === 100 && task.status !== 'completed') {
      task.status = 'completed';
      this.showToast('Tüm kontrol listesi tamamlandı! Görev bitirildi. ✅', 'success');
    }

    await this.saveData(this.data);
    this.renderInternalPlan();
  }

  async deleteInternalTask(taskId) {
    if (!this.hasPermission('internal_plan', 'edit')) return;
    if (!confirm('Bu iç iş planı görevini silmek istediğinize emin misiniz?')) return;

    this.data.internalWorkPlan = (this.data.internalWorkPlan || []).filter(t => t.id !== taskId);
    await this.saveData(this.data);
    this.renderInternalPlan();
    this.updateRoleUI();
    this.showToast('İç görev silindi.', 'info');
  }

  // =========================================================================
  // PERMISSIONS & USER MANAGEMENT MODAL
  // =========================================================================
  openPermissionsModal() {
    if (!this.hasAllPermissions()) {
      this.showToast('Kullanıcı ve yetki yönetimi yalnızca tam yetkili yöneticilere açıktır.', 'warning');
      return;
    }
    this.renderUsersList();
    this.openModal('modalPermissions');
  }

  renderUsersList() {
    const userGrid = document.getElementById('usersListGrid');
    if (!userGrid) return;

    const users = this.data?.users || [];
    userGrid.innerHTML = users.map(u => {
      const isMasterAdmin = (u.username === 'admin' || u.id === 'u1');
      const hasAll = isMasterAdmin || u.allPermissions || u.role === 'admin';

      let permBadgesHtml = '';
      if (hasAll) {
        permBadgesHtml = '<span class="badge" style="background:#fee2e2; color:#b91c1c; font-weight:700;">🛡️ Tüm Yetkiler (Tam Yetki)</span>';
      } else {
        const permitted = this.getPermittedStageNames(u);
        if (permitted.length === 0) {
          permBadgesHtml = '<span class="badge" style="background:#f1f5f9; color:#64748b; font-weight:700;">👁️ Salt Okunur (Yetki Yok)</span>';
        } else {
          permBadgesHtml = permitted.map(p => {
            let colorStyle = 'background:#e0f2fe; color:#0369a1;';
            if (p.includes('Mekanik')) colorStyle = 'background:#ffedd5; color:#c2410c;';
            else if (p.includes('Klima')) colorStyle = 'background:#ecfeff; color:#0891b2;';
            else if (p.includes('MESA')) colorStyle = 'background:#faf5ff; color:#7c3aed;';
            else if (p.includes('Elektrik')) colorStyle = 'background:#f0fdf4; color:#16a34a;';
            else if (p.includes('Tavan')) colorStyle = 'background:#ecfdf5; color:#059669;';
            return `<span class="badge" style="${colorStyle} font-weight:700; font-size:0.75rem;">${this.escapeHtml(p)}</span>`;
          }).join(' ');
        }
      }

      return `
        <div class="user-item-card" style="display:flex; flex-direction:column; gap:0.6rem; align-items:stretch; background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:0.85rem 1rem; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; flex-wrap:wrap;">
            <div>
              <div style="font-weight:800; color:#0f172a; font-size:0.92rem; display:flex; align-items:center; gap:6px;">
                <span>👤</span>
                <span>${this.escapeHtml(u.name)}</span>
              </div>
              <div style="font-size:0.76rem; color:#64748b; font-family:monospace; margin-top:2px;">
                @${this.escapeHtml(u.username || u.id)}
              </div>
            </div>
            <div style="display:flex; gap:0.3rem; flex-wrap:wrap; align-items:center;">
              ${permBadgesHtml}
            </div>
          </div>

          <div style="font-size:0.78rem; color:#475569; background:#f8fafc; padding:0.4rem 0.6rem; border-radius:6px; border:1px solid #f1f5f9;">
            ${this.escapeHtml(u.desc || 'Tanımlı şantiye kullanıcısı')}
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; padding-top:0.4rem; border-top:1px dashed #e2e8f0; flex-wrap:wrap; gap:0.4rem;">
            <div style="display:flex; align-items:center; gap:6px; color:#64748b; font-size:0.75rem;">
              <span>🔒</span>
              <span>Şifre: <strong style="font-weight:600; color:#475569;">Gizli</strong> <span style="color:#94a3b8;">(Yalnızca kullanıcı tarafından bilinir)</span></span>
            </div>
            <div style="display:flex; gap:0.35rem; align-items:center;">
              <button class="btn btn-sm btn-outline" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="app.openEditUserModal('${u.id}')" title="Kullanıcı Bilgilerini ve Yetkilerini Düzenle">
                <span>✏️ Düzenle / Yetkiler</span>
              </button>
              <button class="btn btn-sm btn-outline" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="app.openChangeUserPasswordModal('${u.id}')" title="Kullanıcı İçin Yeni Geçici Şifre Ata">
                <span>🔑 Şifre Ata</span>
              </button>
              <button class="btn btn-sm btn-secondary" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="app.loginAsUser('${u.id}')" title="Bu kullanıcı olarak anında giriş yap ve yetkisini test et">
                <span>🔄 Giriş Yap</span>
              </button>
              ${!isMasterAdmin ? `<button class="btn btn-sm" style="padding:0.25rem 0.5rem; font-size:0.75rem; background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; cursor:pointer;" onclick="app.deleteUser('${u.id}')" title="Kullanıcıyı Sil"><span>🗑️</span></button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  openNewUserModal() {
    const nameEl = document.getElementById('newUserNameInput');
    const usernameEl = document.getElementById('newUserUsernameInput');
    const pwEl = document.getElementById('newUserPasswordInput');
    const descEl = document.getElementById('newUserDescInput');

    if (nameEl) nameEl.value = '';
    if (usernameEl) usernameEl.value = '';
    if (pwEl) pwEl.value = '';
    if (descEl) descEl.value = '';

    const permAllRadio = document.getElementById('newUserPermAll');
    if (permAllRadio) permAllRadio.checked = true;
    const stagesBox = document.getElementById('newUserStagesCheckboxes');
    if (stagesBox) stagesBox.style.display = 'none';

    this.renderStagesCheckboxes('newUser');
    this.openModal('modalNewUser');
  }

  async saveNewUser() {
    const name = (document.getElementById('newUserNameInput')?.value || '').trim();
    let username = (document.getElementById('newUserUsernameInput')?.value || '').trim().toLowerCase();
    const password = (document.getElementById('newUserPasswordInput')?.value || '').trim();
    const desc = (document.getElementById('newUserDescInput')?.value || '').trim();

    if (!name) {
      this.showToast('Lütfen Ad Soyad veya Ekip Ünvanı yazınız.', 'warning');
      return;
    }
    if (!username) {
      username = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    if (!password) {
      this.showToast('Lütfen giriş şifresi belirleyiniz.', 'warning');
      return;
    }

    if (!this.data.users) this.data.users = [];

    // Check duplicate username
    if (this.data.users.some(u => u.username?.toLowerCase() === username)) {
      this.showToast(`"${username}" kullanıcı adı zaten kullanımda. Farklı bir kullanıcı adı seçiniz.`, 'error');
      return;
    }

    const isAllPerms = !!document.getElementById('newUserPermAll')?.checked;
    let selectedStages = [];
    if (!isAllPerms) {
      const chks = document.querySelectorAll('.newUser-stage-chk:checked');
      selectedStages = Array.from(chks).map(c => c.value);
      if (selectedStages.length === 0) {
        this.showToast('Lütfen en az bir iş kalemi yetkisi seçiniz veya "Tüm Yetkiler"i işaretleyiniz.', 'warning');
        return;
      }
    } else {
      selectedStages = ['*'];
    }

    const newUser = {
      id: `u_${Date.now()}`,
      username: username,
      name: name,
      allPermissions: isAllPerms,
      permissions: {
        all: isAllPerms,
        stages: selectedStages
      },
      role: isAllPerms ? 'admin' : 'custom',
      password: password,
      desc: desc || (isAllPerms ? 'Tam yetkili kullanıcı' : `${selectedStages.join(', ')} yetkilisi`)
    };

    this.data.users.push(newUser);
    await this.saveData(this.data);

    this.closeModal('modalNewUser');
    this.renderUsersList();
    this.showToast(`"${name}" kullanıcısı başarıyla eklendi! ✅`, 'success');
  }

  openEditUserModal(userId) {
    const user = (this.data?.users || []).find(u => u.id === userId);
    if (!user) return;

    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserNameInput').value = user.name || '';
    document.getElementById('editUserUsernameInput').value = user.username || user.id;
    document.getElementById('editUserPasswordInput').value = ''; // Mevcut şifre gizlidir ve gösterilmez
    document.getElementById('editUserDescInput').value = user.desc || '';

    const isMasterAdmin = (user.id === 'u1' || user.username === 'admin');
    const isAll = isMasterAdmin || user.allPermissions || user.role === 'admin';

    const radioAll = document.getElementById('editUserPermAll');
    const radioCustom = document.getElementById('editUserPermCustom');
    const box = document.getElementById('editUserStagesCheckboxes');

    if (isAll) {
      if (radioAll) radioAll.checked = true;
      if (box) box.style.display = 'none';
    } else {
      if (radioCustom) radioCustom.checked = true;
      if (box) box.style.display = 'block';
    }

    if (radioAll) radioAll.disabled = isMasterAdmin;
    if (radioCustom) radioCustom.disabled = isMasterAdmin;

    const userStages = user.permissions?.stages || [];
    this.renderStagesCheckboxes('editUser', userStages);

    this.openModal('modalEditUser');
  }

  async saveEditUser() {
    const userId = document.getElementById('editUserId')?.value;
    const name = (document.getElementById('editUserNameInput')?.value || '').trim();
    let username = (document.getElementById('editUserUsernameInput')?.value || '').trim().toLowerCase();
    const password = (document.getElementById('editUserPasswordInput')?.value || '').trim();
    const desc = (document.getElementById('editUserDescInput')?.value || '').trim();

    if (!name) {
      this.showToast('Lütfen Ad Soyad veya Ekip Ünvanı yazınız.', 'warning');
      return;
    }
    if (!username) {
      username = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    if (password && password.length < 3) {
      this.showToast('Yeni şifre en az 3 karakter olmalıdır.', 'warning');
      return;
    }

    const user = (this.data?.users || []).find(u => u.id === userId);
    if (!user) {
      this.showToast('Kullanıcı bulunamadı!', 'error');
      return;
    }

    if (this.data.users.some(u => u.id !== userId && u.username?.toLowerCase() === username)) {
      this.showToast(`"${username}" kullanıcı adı başka bir kullanıcıda kayıtlı. Farklı bir kullanıcı adı seçiniz.`, 'error');
      return;
    }

    const isMasterAdmin = (user.id === 'u1' || user.username === 'admin');
    let isAllPerms = isMasterAdmin;
    let selectedStages = ['*'];

    if (!isMasterAdmin) {
      isAllPerms = !!document.getElementById('editUserPermAll')?.checked;
      if (!isAllPerms) {
        const chks = document.querySelectorAll('.editUser-stage-chk:checked');
        selectedStages = Array.from(chks).map(c => c.value);
        if (selectedStages.length === 0) {
          this.showToast('Lütfen en az bir iş kalemi yetkisi seçiniz veya "Tüm Yetkiler"i işaretleyiniz.', 'warning');
          return;
        }
      } else {
        selectedStages = ['*'];
      }
    }

    user.name = name;
    user.username = username;
    if (password) {
      user.password = password;
      if (isMasterAdmin) {
        if (!this.data.settings) this.data.settings = {};
        this.data.settings.adminPassword = password;
      }
    }
    user.desc = desc;
    user.allPermissions = isAllPerms;
    user.permissions = {
      all: isAllPerms,
      stages: selectedStages
    };
    user.role = isAllPerms ? 'admin' : 'custom';

    await this.saveData(this.data);
    this.closeModal('modalEditUser');
    this.renderUsersList();
    this.showToast(`"${name}" kullanıcısı başarıyla güncellendi! ✅`, 'success');
  }

  openChangeUserPasswordModal(userId) {
    const user = (this.data?.users || []).find(u => u.id === userId);
    if (!user) return;

    const idEl = document.getElementById('changeUserPwUserId');
    const nameEl = document.getElementById('changeUserPwName');
    const pwEl = document.getElementById('changeUserPwNewPassword');

    if (idEl) idEl.value = user.id;
    if (nameEl) nameEl.value = `${user.name} (@${user.username || user.id})`;
    if (pwEl) pwEl.value = ''; // Mevcut şifre gizlidir ve gösterilmez

    this.openModal('modalChangeUserPassword');
  }

  async saveUserPassword() {
    const userId = document.getElementById('changeUserPwUserId')?.value;
    const newPassword = (document.getElementById('changeUserPwNewPassword')?.value || '').trim();

    if (!newPassword || newPassword.length < 3) {
      this.showToast('Lütfen en az 3 karakterli bir şifre belirleyiniz.', 'warning');
      return;
    }

    const user = (this.data?.users || []).find(u => u.id === userId);
    if (!user) {
      this.showToast('Kullanıcı bulunamadı!', 'error');
      return;
    }

    user.password = newPassword;
    if (user.role === 'admin' || user.id === 'u1' || user.username === 'admin') {
      if (!this.data.settings) this.data.settings = {};
      this.data.settings.adminPassword = newPassword;
    }
    await this.saveData(this.data, false);

    this.closeModal('modalChangeUserPassword');
    this.renderUsersList();
    this.showToast(`"${user.name}" kullanıcısının şifresi başarıyla güncellendi! ✅`, 'success');
  }

  async deleteUser(userId) {
    if (userId === 'u1') {
      this.showToast('Ana yönetici hesabı silinemez!', 'warning');
      return;
    }

    const user = (this.data?.users || []).find(u => u.id === userId);
    if (!user) return;

    if (user.role === 'admin' || user.username === 'admin') {
      this.showToast('Yönetici hesabı silinemez!', 'warning');
      return;
    }

    if (!confirm(`"${user.name}" kullanıcısını silmek istediğinize emin misiniz?`)) {
      return;
    }

    this.data.users = this.data.users.filter(u => u.id !== userId);
    await this.saveData(this.data);

    this.renderUsersList();
    this.showToast(`"${user.name}" kullanıcısı silindi.`, 'info');
  }

  loginAsUser(userId) {
    const user = (this.data?.users || []).find(u => u.id === userId);
    if (!user) return;

    const isAll = (user.username === 'admin' || user.allPermissions || user.role === 'admin');

    this.currentUser = {
      id: user.id,
      name: user.name,
      username: user.username || user.id,
      allPermissions: isAll,
      permissions: user.permissions || { all: isAll, stages: isAll ? ['*'] : [] },
      role: isAll ? 'admin' : 'custom'
    };
    this.currentRole = this.currentUser.role;

    localStorage.setItem('santiye_user_session', JSON.stringify(this.currentUser));
    localStorage.setItem('santiye_active_role', this.currentRole);

    if (isAll) {
      this.adminToken = 'admin-session-' + Date.now();
      localStorage.setItem('santiye_admin_token', this.adminToken);
      this.isAdmin = true;
    } else {
      this.adminToken = null;
      localStorage.removeItem('santiye_admin_token');
      this.isAdmin = false;
    }

    this.closeModal('modalPermissions');
    this.updateRoleUI();
    const permSummary = this.getPermittedStageNames(user).join(', ') || 'Salt Okunur';
    this.showToast(`"${user.name}" olarak giriş yapıldı. (Yetki: ${permSummary})`, 'success');
    this.renderAll();
  }

  // --- COLOR PALETTE & STAGE COLOR CUSTOMIZER ---
  getSoftTintFromHex(hex) {
    if (!hex || typeof hex !== 'string') return '#f8fafc';
    let clean = hex.trim();
    if (!clean.startsWith('#')) return '#f8fafc';
    if (clean.length === 4) {
      clean = '#' + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3];
    }
    const r = parseInt(clean.substring(1, 3), 16) || 0;
    const g = parseInt(clean.substring(3, 5), 16) || 0;
    const b = parseInt(clean.substring(5, 7), 16) || 0;
    // Mix 85% white, 15% color for soft pastel background
    const tr = Math.round(r * 0.15 + 255 * 0.85);
    const tg = Math.round(g * 0.15 + 255 * 0.85);
    const tb = Math.round(b * 0.15 + 255 * 0.85);
    return `rgb(${tr}, ${tg}, ${tb})`;
  }

  getDarkTextFromHex(hex) {
    if (!hex || typeof hex !== 'string') return '#0f172a';
    let clean = hex.trim();
    if (!clean.startsWith('#')) return '#0f172a';
    if (clean.length === 4) {
      clean = '#' + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3];
    }
    const r = parseInt(clean.substring(1, 3), 16) || 0;
    const g = parseInt(clean.substring(3, 5), 16) || 0;
    const b = parseInt(clean.substring(5, 7), 16) || 0;
    // Darker readable text (55% color)
    const tr = Math.round(r * 0.55);
    const tg = Math.round(g * 0.55);
    const tb = Math.round(b * 0.55);
    return `rgb(${tr}, ${tg}, ${tb})`;
  }

  rgbToHex(rgb) {
    if (!rgb || typeof rgb !== 'string') return '#000000';
    if (rgb.startsWith('#')) return rgb;
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return '#000000';
    const hex = (x) => ("0" + parseInt(x).toString(16)).slice(-2);
    return "#" + hex(match[1]) + hex(match[2]) + hex(match[3]);
  }

  applyStageColors() {
    let colors = this.data?.stageColors;
    if (!colors) {
      const stored = localStorage.getItem('mesa_stage_colors');
      if (stored) {
        try { colors = JSON.parse(stored); } catch(e) {}
      }
    }
    if (!colors) {
      colors = JSON.parse(JSON.stringify(this.defaultStageColors));
    }

    const root = document.documentElement;
    if (!root) return;

    const setVar = (name, val) => {
      if (val) root.style.setProperty(name, val);
    };

    setVar('--stage-tavan-bg', colors.tavan?.bg || this.defaultStageColors.tavan.bg);
    setVar('--stage-tavan-border', colors.tavan?.border || this.defaultStageColors.tavan.border);
    setVar('--stage-tavan-text', colors.tavan?.text || this.defaultStageColors.tavan.text);

    setVar('--stage-test-bg', colors.test_done?.bg || this.defaultStageColors.test_done.bg);
    setVar('--stage-test-border', colors.test_done?.border || this.defaultStageColors.test_done.border);
    setVar('--stage-test-text', colors.test_done?.text || this.defaultStageColors.test_done.text);

    setVar('--stage-ready-bg', colors.test_ready?.bg || this.defaultStageColors.test_ready.bg);
    setVar('--stage-ready-border', colors.test_ready?.border || this.defaultStageColors.test_ready.border);
    setVar('--stage-ready-text', colors.test_ready?.text || this.defaultStageColors.test_ready.text);

    setVar('--stage-mesa-bg', colors.mesa_wait?.bg || this.defaultStageColors.mesa_wait.bg);
    setVar('--stage-mesa-border', colors.mesa_wait?.border || this.defaultStageColors.mesa_wait.border);
    setVar('--stage-mesa-text', colors.mesa_wait?.text || this.defaultStageColors.mesa_wait.text);

    setVar('--stage-prog-bg', colors.in_progress?.bg || this.defaultStageColors.in_progress.bg);
    setVar('--stage-prog-border', colors.in_progress?.border || this.defaultStageColors.in_progress.border);
    setVar('--stage-prog-text', colors.in_progress?.text || this.defaultStageColors.in_progress.text);

    setVar('--stage-waiting-bg', colors.waiting?.bg || this.defaultStageColors.waiting.bg);
    setVar('--stage-waiting-border', colors.waiting?.border || this.defaultStageColors.waiting.border);
    setVar('--stage-waiting-text', colors.waiting?.text || this.defaultStageColors.waiting.text);

    this.stageColors = colors;
  }

  openColorSettingsModal() {
    if (!this.hasAllPermissions()) {
      this.showToast('Renk paletini özelleştirme yetkisi yalnızca tam yetkili yöneticilere aittir.', 'warning');
      return;
    }
    this.applyStageColors();
    const colors = this.stageColors || this.defaultStageColors;

    const setInput = (id, val) => {
      const el = document.getElementById(id);
      if (el && val) el.value = val.startsWith('#') ? val : this.rgbToHex(val);
    };

    setInput('colorInputTavanBg', colors.tavan?.bg);
    setInput('colorInputTavanBorder', colors.tavan?.border);

    setInput('colorInputTestBg', colors.test_done?.bg);
    setInput('colorInputTestBorder', colors.test_done?.border);

    setInput('colorInputReadyBg', colors.test_ready?.bg);
    setInput('colorInputReadyBorder', colors.test_ready?.border);

    setInput('colorInputMesaBg', colors.mesa_wait?.bg);
    setInput('colorInputMesaBorder', colors.mesa_wait?.border);

    setInput('colorInputProgBg', colors.in_progress?.bg);
    setInput('colorInputProgBorder', colors.in_progress?.border);

    setInput('colorInputWaitBg', colors.waiting?.bg);
    setInput('colorInputWaitBorder', colors.waiting?.border);

    // Update preview pills inside modal
    const setPill = (id, bg, border, text) => {
      const el = document.getElementById(id);
      if (el) {
        if (bg) el.style.backgroundColor = bg;
        if (border) el.style.borderColor = border;
        if (text) el.style.color = text;
      }
    };
    setPill('previewPillTavan', colors.tavan?.bg, colors.tavan?.border, colors.tavan?.text);
    setPill('previewPillTest', colors.test_done?.bg, colors.test_done?.border, colors.test_done?.text);
    setPill('previewPillReady', colors.test_ready?.bg, colors.test_ready?.border, colors.test_ready?.text);
    setPill('previewPillMesa', colors.mesa_wait?.bg, colors.mesa_wait?.border, colors.mesa_wait?.text);
    setPill('previewPillProg', colors.in_progress?.bg, colors.in_progress?.border, colors.in_progress?.text);
    setPill('previewPillWait', colors.waiting?.bg, colors.waiting?.border, colors.waiting?.text);

    // Render custom stages
    const customContainer = document.getElementById('customStagesColorSettingsContainer');
    if (customContainer) {
      let customHtml = '';
      (this.data?.customStages || []).forEach(cs => {
        const csBg = cs.bg || this.getSoftTintFromHex(cs.color);
        const csBorder = cs.borderColor || cs.color;
        const csText = cs.textColor || this.getDarkTextFromHex(cs.color);
        customHtml += `
          <div class="color-setting-row">
            <div style="display:flex; align-items:center; gap: 8px;">
              <span class="color-preview-pill" id="previewPillCustom_${cs.id}" style="background: ${csBg}; border-color: ${csBorder}; color: ${csText};">
                ${cs.icon} ${this.escapeHtml(cs.name)}
              </span>
            </div>
            <div style="display:flex; align-items:center; gap: 6px;">
              <label style="font-size: 0.72rem; color: #64748b;">Rozet Rengi:</label>
              <input type="color" id="colorInputCustom_${cs.id}" value="${cs.color}" class="color-picker-input" onchange="app.previewCustomStageColorChange('${cs.id}', this.value)">
              <button type="button" class="btn btn-sm btn-danger" onclick="app.deleteCustomStage('${cs.id}')" title="${this.escapeHtml(cs.name)} imalatını sil" style="padding: 0.2rem 0.55rem; font-size: 0.7rem; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-weight: 700; margin-left: 4px;">
                <span>🗑️ Sil</span>
              </button>
            </div>
          </div>
        `;
      });
      customContainer.innerHTML = customHtml;
    }

    this.openModal('modalColorSettings');
  }

  previewLiveColorChange(stageKey, prop, hexVal) {
    const root = document.documentElement;
    if (!root) return;
    const varMap = {
      tavan: { bg: '--stage-tavan-bg', border: '--stage-tavan-border', text: '--stage-tavan-text', pill: 'previewPillTavan' },
      test_done: { bg: '--stage-test-bg', border: '--stage-test-border', text: '--stage-test-text', pill: 'previewPillTest' },
      test_ready: { bg: '--stage-ready-bg', border: '--stage-ready-border', text: '--stage-ready-text', pill: 'previewPillReady' },
      mesa_wait: { bg: '--stage-mesa-bg', border: '--stage-mesa-border', text: '--stage-mesa-text', pill: 'previewPillMesa' },
      in_progress: { bg: '--stage-prog-bg', border: '--stage-prog-border', text: '--stage-prog-text', pill: 'previewPillProg' },
      waiting: { bg: '--stage-waiting-bg', border: '--stage-waiting-border', text: '--stage-waiting-text', pill: 'previewPillWait' }
    };

    const target = varMap[stageKey];
    if (!target) return;

    if (prop === 'bg') {
      root.style.setProperty(target.bg, hexVal);
      const pill = document.getElementById(target.pill);
      if (pill) pill.style.backgroundColor = hexVal;
    } else if (prop === 'border') {
      root.style.setProperty(target.border, hexVal);
      root.style.setProperty(target.text, hexVal);
      const pill = document.getElementById(target.pill);
      if (pill) {
        pill.style.borderColor = hexVal;
        pill.style.color = hexVal;
      }
    }
  }

  previewCustomStageColorChange(stageId, hexVal) {
    const pill = document.getElementById(`previewPillCustom_${stageId}`);
    if (pill) {
      pill.style.backgroundColor = this.getSoftTintFromHex(hexVal);
      pill.style.borderColor = hexVal;
      pill.style.color = this.getDarkTextFromHex(hexVal);
    }
  }

  applyColorPreset(presetKey) {
    const preset = this.colorPresets[presetKey];
    if (!preset) return;

    const setAndPreview = (stageKey, bg, border, text, inputBgId, inputBorderId) => {
      const inBg = document.getElementById(inputBgId);
      const inBorder = document.getElementById(inputBorderId);
      if (inBg) inBg.value = bg;
      if (inBorder) inBorder.value = border;
      this.previewLiveColorChange(stageKey, 'bg', bg);
      this.previewLiveColorChange(stageKey, 'border', border);
    };

    setAndPreview('tavan', preset.tavan.bg, preset.tavan.border, preset.tavan.text, 'colorInputTavanBg', 'colorInputTavanBorder');
    setAndPreview('test_done', preset.test_done.bg, preset.test_done.border, preset.test_done.text, 'colorInputTestBg', 'colorInputTestBorder');
    setAndPreview('test_ready', preset.test_ready.bg, preset.test_ready.border, preset.test_ready.text, 'colorInputReadyBg', 'colorInputReadyBorder');
    setAndPreview('mesa_wait', preset.mesa_wait.bg, preset.mesa_wait.border, preset.mesa_wait.text, 'colorInputMesaBg', 'colorInputMesaBorder');
    setAndPreview('in_progress', preset.in_progress.bg, preset.in_progress.border, preset.in_progress.text, 'colorInputProgBg', 'colorInputProgBorder');
    setAndPreview('waiting', preset.waiting.bg, preset.waiting.border, preset.waiting.text, 'colorInputWaitBg', 'colorInputWaitBorder');

    this.showToast(`"${presetKey}" paleti önizlemesi uygulandı. Beğendiyseniz "Kaydet ve Uygula"ya tıklayınız.`, 'info');
  }

  async saveCustomStageColors() {
    const getVal = (id, def) => document.getElementById(id)?.value || def;

    const newColors = {
      tavan: {
        bg: getVal('colorInputTavanBg', this.defaultStageColors.tavan.bg),
        border: getVal('colorInputTavanBorder', this.defaultStageColors.tavan.border),
        text: getVal('colorInputTavanBorder', this.defaultStageColors.tavan.text),
        label: '🏗️ Asma Tavan Kapandı'
      },
      test_done: {
        bg: getVal('colorInputTestBg', this.defaultStageColors.test_done.bg),
        border: getVal('colorInputTestBorder', this.defaultStageColors.test_done.border),
        text: getVal('colorInputTestBorder', this.defaultStageColors.test_done.text),
        label: '⚡ Test Tamamlandı'
      },
      test_ready: {
        bg: getVal('colorInputReadyBg', this.defaultStageColors.test_ready.bg),
        border: getVal('colorInputReadyBorder', this.defaultStageColors.test_ready.border),
        text: getVal('colorInputReadyBorder', this.defaultStageColors.test_ready.text),
        label: '🚀 Teste Hazır'
      },
      mesa_wait: {
        bg: getVal('colorInputMesaBg', this.defaultStageColors.mesa_wait.bg),
        border: getVal('colorInputMesaBorder', this.defaultStageColors.mesa_wait.border),
        text: getVal('colorInputMesaBorder', this.defaultStageColors.mesa_wait.text),
        label: '🏢 MESA Onay Bekliyor'
      },
      in_progress: {
        bg: getVal('colorInputProgBg', this.defaultStageColors.in_progress.bg),
        border: getVal('colorInputProgBorder', this.defaultStageColors.in_progress.border),
        text: getVal('colorInputProgBorder', this.defaultStageColors.in_progress.text),
        label: '🚧 İmalat Sürüyor'
      },
      waiting: {
        bg: getVal('colorInputWaitBg', this.defaultStageColors.waiting.bg),
        border: getVal('colorInputWaitBorder', this.defaultStageColors.waiting.border),
        text: getVal('colorInputWaitBorder', this.defaultStageColors.waiting.text),
        label: '⏳ Başlanmadı / Bekliyor'
      }
    };

    this.stageColors = newColors;
    if (!this.data) this.data = {};
    this.data.stageColors = newColors;
    localStorage.setItem('mesa_stage_colors', JSON.stringify(newColors));

    // Save custom stages colors if changed
    (this.data?.customStages || []).forEach(cs => {
      const input = document.getElementById(`colorInputCustom_${cs.id}`);
      if (input) {
        cs.color = input.value;
        cs.bg = this.getSoftTintFromHex(input.value);
        cs.borderColor = input.value;
        cs.textColor = this.getDarkTextFromHex(input.value);
      }
    });

    this.applyStageColors();
    await this.saveData(this.data);
    this.closeModal('modalColorSettings');
    this.renderAll();
    this.showToast('🎨 Isı haritası renk ayarlarınız başarıyla kaydedildi!', 'success');
  }

  async resetStageColorsToDefault() {
    this.stageColors = JSON.parse(JSON.stringify(this.defaultStageColors));
    if (this.data) this.data.stageColors = this.stageColors;
    localStorage.removeItem('mesa_stage_colors');
    this.applyStageColors();
    this.openColorSettingsModal();
    await this.saveData(this.data);
    this.renderAll();
    this.showToast('Varsayılan pastel ve okunabilir renkler geri yüklendi.', 'success');
  }

  // --- SETTINGS CENTER MODAL ---
  openSettingsCenterModal() {
    if (!this.hasAllPermissions()) {
      this.showToast('Şantiye ayarları menüsü yalnızca tam yetkili yöneticilere açıktır.', 'warning');
      return;
    }
    const isAuth = this.isLoggedIn();
    const btnLogout = document.getElementById('btnSettingsLogout');
    if (btnLogout) {
      btnLogout.style.display = isAuth ? 'inline-flex' : 'none';
    }
    this.openModal('modalSettingsCenter');
  }

  // --- NEW STAGE COLOR PICKER & PREVIEW HELPERS ---
  updateNewStageColorPreview(hex) {
    if (!hex) {
      const picker = document.getElementById('newStageColorPicker');
      const hexInput = document.getElementById('newStageColorHex');
      hex = picker?.value || hexInput?.value || '#db2777';
    }
    const picker = document.getElementById('newStageColorPicker');
    const hexInput = document.getElementById('newStageColorHex');
    const box = document.getElementById('newStagePreviewBox');
    const nameEl = document.getElementById('newStageName');
    const iconEl = document.getElementById('newStageIcon');
    const txtEl = document.getElementById('newStagePreviewText');
    const icnEl = document.getElementById('newStagePreviewIcon');

    if (picker && picker.value !== hex) picker.value = hex;
    if (hexInput && hexInput.value !== hex) hexInput.value = hex;

    if (box) {
      box.style.backgroundColor = this.getSoftTintFromHex(hex);
      box.style.borderColor = hex;
      box.style.color = this.getDarkTextFromHex(hex);
    }
    if (txtEl) {
      txtEl.textContent = nameEl?.value?.trim() || 'Örnek Aşama';
    }
    if (icnEl) {
      icnEl.textContent = iconEl?.value || '💡';
    }
  }

  setNewStageColor(hex) {
    this.updateNewStageColorPreview(hex);
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
      setTimeout(() => {
        if (toast.remove) {
          toast.remove();
        } else if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 4000);
  }
}

// Instantiate and start app on page load
const app = new SantiyeApp();
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
