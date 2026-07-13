// --- State Variables & Config ---
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';
let activeTenantId = '';
let activeUserId = '';
let activeUser = null;
let activeTab = 'overview';

let tenantsList = [];
let profilesList = [];

// API Request Helper with context headers
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': activeTenantId,
    'X-User-ID': activeUserId,
    ...options.headers
  };

  const response = await fetch(API_BASE + endpoint, { ...options, headers });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

function showConnectionIssue() {
  const main = document.querySelector('.content-display');
  if (!main || document.getElementById('connection-issue')) return;

  const panel = document.createElement('section');
  panel.className = 'connection-issue';
  panel.id = 'connection-issue';
  panel.innerHTML = `
    <span class="connection-issue__eyebrow">Server connection unavailable</span>
    <h2>ChurchBook can’t reach its local server.</h2>
    <p>Open ChurchBook through the local server to load member, attendance, inventory, and finance data.</p>
    <div class="connection-issue__steps">
      <code>npm.cmd start</code>
      <span>Then visit</span>
      <a href="http://localhost:3000">http://localhost:3000</a>
    </div>
  `;
  main.prepend(panel);
}

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  setupTabListeners();
  setupModalListeners();
  setupFormListeners();
  
  // Set default date for attendance form
  document.getElementById('att-service-date').value = new Date().toISOString().split('T')[0];

  try {
    // 1. Load Tenants
    const response = await fetch(API_BASE + '/api/tenants');
    tenantsList = await response.json();
    
    const tenantSelector = document.getElementById('tenant-selector');
    tenantSelector.innerHTML = tenantsList.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    
    // Set default active tenant
    if (tenantsList.length > 0) {
      activeTenantId = tenantsList[0].id;
      tenantSelector.value = activeTenantId;
    }

    // Load profiles for current tenant
    await loadProfilesForTenant(activeTenantId);

    // Watch selectors for changes
    tenantSelector.addEventListener('change', async (e) => {
      activeTenantId = e.target.value;
      await loadProfilesForTenant(activeTenantId);
      refreshActiveTab();
    });

    document.getElementById('profile-selector').addEventListener('change', (e) => {
      selectUserProfile(e.target.value);
      refreshActiveTab();
    });

    // Trigger initial tab load
    refreshActiveTab();

  } catch (err) {
    console.error('Initialization error:', err);
    showConnectionIssue();
  }
});

// Load profiles under the active tenant
async function loadProfilesForTenant(tenantId) {
  try {
    const response = await fetch(API_BASE + `/api/auth/profiles?tenantId=${tenantId}`);
    profilesList = await response.json();
    
    const profileSelector = document.getElementById('profile-selector');
    profileSelector.innerHTML = profilesList.map(p => 
      `<option value="${p.id}">${p.name} (${p.position})</option>`
    ).join('');

    // Default to first profile
    if (profilesList.length > 0) {
      selectUserProfile(profilesList[0].id);
    }
  } catch (err) {
    console.error('Failed to load profiles for tenant:', err);
  }
}

// Switches active profile session context
function selectUserProfile(userId) {
  activeUserId = userId;
  document.getElementById('profile-selector').value = userId;
  
  activeUser = profilesList.find(p => p.id === userId);
  
  if (activeUser) {
    // Update sidebar card
    document.getElementById('current-user-name').textContent = activeUser.name;
    document.getElementById('current-user-badge').textContent = activeUser.role;
    document.getElementById('current-user-avatar').src = activeUser.profile_picture_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
    
    // Fetch unit name if assigned
    if (activeUser.unit_id) {
      // Find unit in background or default
      const unitLabels = {
        'unit_grace_pastorate': 'Pastorate',
        'unit_grace_ushering': 'Ushering Unit',
        'unit_grace_followup': 'Follow-up Unit',
        'unit_grace_tech': 'Technical Unit',
        'unit_grace_sanctuary': 'Sanctuary Keepers',
        'unit_grace_music': 'Music Unit',
        'unit_grace_finance': 'Finance Committee',
        'unit_hope_pastorate': 'Pastorate',
        'unit_hope_ushering': 'Ushering Team',
        'unit_hope_finance': 'Finance Team'
      };
      document.getElementById('current-user-dept').textContent = unitLabels[activeUser.unit_id] || 'Worker';
    } else {
      document.getElementById('current-user-dept').textContent = 'No Department Unit';
    }

    // Apply role-based authorization styling blocks
    applyRBACStyling();
  }
}

// Toggles visibility of UI components based on the active role permissions
function applyRBACStyling() {
  if (!activeUser) return;
  const role = activeUser.role;

  // 1. Members tab: Registry button restricted to Pastors, HODs, FollowUp
  const canRegister = ['Pastor', 'HOD', 'FollowUp'].includes(role);
  document.getElementById('btn-open-member-modal').style.display = canRegister ? 'block' : 'none';

  // 2. Attendance tab: marking sheets restricted to Ushers and Pastors
  const isUsherOrPastor = ['Usher', 'Pastor'].includes(role);
  const attBanner = document.getElementById('attendance-restricted-banner');
  const attCloseBtn = document.getElementById('btn-close-service');
  
  if (isUsherOrPastor) {
    attBanner.style.display = 'none';
    attCloseBtn.style.display = 'inline-flex';
  } else {
    attBanner.style.display = 'block';
    attCloseBtn.style.display = 'none';
  }

  // 3. Inventory tab: adding items restricted to Pastor and HOD
  const isLeader = ['Pastor', 'HOD'].includes(role);
  document.getElementById('btn-open-inventory-modal').style.display = isLeader ? 'block' : 'none';
  
  // Show specialized banner for other roles
  const invBanner = document.getElementById('inventory-restricted-banner');
  if (role === 'Member' || role === 'Usher' || role === 'FollowUp') {
    invBanner.style.display = 'block';
  } else {
    invBanner.style.display = 'none';
  }

  // 4. Financial tab: Audit log panel visibility
  // Pastor and Finance Unit see audit panel. Others see Denied panel.
  const auditPanel = document.getElementById('finance-audit-panel');
  const deniedPanel = document.getElementById('finance-denied-panel');
  
  // Dynamic unit check for finance
  const isFinanceTeam = activeUser.unit_id && activeUser.unit_id.includes('finance');
  const canAccessFinance = role === 'Pastor' || isFinanceTeam;

  if (canAccessFinance) {
    auditPanel.style.display = 'block';
    deniedPanel.style.display = 'none';
  } else {
    auditPanel.style.display = 'none';
    deniedPanel.style.display = 'flex';
  }

  // 5. Broadcast Tab: compose form restricted to Pastor and HOD
  const broadcastArea = document.getElementById('broadcast-content-area');
  const broadcastBanner = document.getElementById('broadcast-restricted-banner');
  const isBroadcastAdmin = ['Pastor', 'HOD'].includes(role);

  if (isBroadcastAdmin) {
    broadcastArea.style.display = 'flex';
    broadcastBanner.style.display = 'none';
    // Toggle selector for entire church broadcasts (Pastor only)
    const targetSelect = document.getElementById('bc-target');
    const unitGroup = document.getElementById('bc-unit-group');
    
    if (role === 'Pastor') {
      targetSelect.options[0].disabled = false;
      unitGroup.style.display = 'block';
    } else {
      // HOD cannot choose "All Church"
      targetSelect.value = 'unit';
      targetSelect.options[0].disabled = true;
      unitGroup.style.display = 'none';
    }
  } else {
    broadcastArea.style.display = 'none';
    broadcastBanner.style.display = 'block';
  }
}

// --- Tab Navigation Setup ---
function setupTabListeners() {
  const buttons = document.querySelectorAll('.nav-btn');
  const menuWrapper = document.getElementById('sidebar-menu-wrapper');
  const hamburgerBtn = document.getElementById('mobile-hamburger');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const tabId = btn.getAttribute('data-tab');
      activeTab = tabId;
      
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
      });
      document.getElementById(`pane-${tabId}`).classList.add('active');
      
      // Auto-collapse mobile navigation menu on button click
      if (menuWrapper && menuWrapper.classList.contains('active')) {
        menuWrapper.classList.remove('active');
      }
      if (hamburgerBtn && hamburgerBtn.classList.contains('active')) {
        hamburgerBtn.classList.remove('active');
      }
      
      refreshActiveTab();
    });
  });

  // Mobile Hamburger Toggle
  if (hamburgerBtn && menuWrapper) {
    hamburgerBtn.addEventListener('click', () => {
      hamburgerBtn.classList.toggle('active');
      menuWrapper.classList.toggle('active');
    });
  }
}

function refreshActiveTab() {
  if (!activeTenantId || !activeUserId) return;

  switch (activeTab) {
    case 'overview':
      loadOverviewData();
      break;
    case 'members':
      loadMembersData();
      break;
    case 'attendance':
      loadAttendanceSheet();
      loadWorkersPerformance();
      break;
    case 'inventory':
      loadInventoryData();
      break;
    case 'financials':
      loadFinancialsData();
      break;
    case 'broadcast':
      loadBroadcastContext();
      break;
  }
}

// --- TAB LOAD LOGICS ---

// 1. Overview Tab
async function loadOverviewData() {
  try {
    const welcome = document.getElementById('overview-welcome');
    welcome.textContent = `Active user context: ${activeUser?.name || 'Loading'} (${activeUser?.position || ''})`;

    // Get members count
    const members = await apiFetch('/api/members');
    const total = members.length;
    const active = members.filter(m => m.status === 'Active').length;
    const activeRatio = total > 0 ? Math.round((active / total) * 100) : 0;

    document.getElementById('kpi-total-members').textContent = total;
    document.getElementById('kpi-active-members').textContent = active;
    document.getElementById('overview-active-ratio').textContent = `${activeRatio}%`;

    // Try loading financials to fetch totals
    const isFinanceTeam = activeUser.unit_id && activeUser.unit_id.includes('finance');
    const canAccessFinance = activeUser.role === 'Pastor' || isFinanceTeam;

    if (canAccessFinance) {
      const financeData = await apiFetch('/api/financials/projections');
      document.getElementById('kpi-finance-totals').textContent = `$${financeData.summary.Total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      document.getElementById('overview-finance-forecast').textContent = `$${financeData.projectedNextWeek.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      document.getElementById('overview-projection-status').textContent = `Avg Weekly Growth: ${financeData.growthRatePercent}%`;
    } else {
      document.getElementById('kpi-finance-totals').textContent = 'Restricted';
      document.getElementById('overview-finance-forecast').textContent = 'Restricted';
      document.getElementById('overview-projection-status').textContent = 'Vault Locked (Pastor/Finance Only)';
    }

    // Try loading attendance performance
    const isStatsAdmin = ['Pastor', 'HOD', 'FollowUp'].includes(activeUser.role);
    if (isStatsAdmin) {
      const stats = await apiFetch('/api/attendance/stats');
      document.getElementById('kpi-attendance-avg').textContent = `${stats.avgAttendanceRate}%`;
    } else {
      document.getElementById('kpi-attendance-avg').textContent = 'Restricted';
    }

    // Load Recent Services (Mock data summary table)
    const recentServices = [
      { name: 'Sunday Worship', date: '2026-07-05', status: 'Closed' },
      { name: 'Wednesday Midweek', date: '2026-07-01', status: 'Closed' },
      { name: 'Sunday Worship', date: '2026-06-28', status: 'Closed' },
    ];
    const tbody = document.getElementById('overview-services-tbody');
    tbody.innerHTML = recentServices.map(s => `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td>${s.date}</td>
        <td><span class="badge badge-active">${s.status}</span></td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Failed loading overview card states:', err);
  }
}

// 2. Members Registry Tab
async function loadMembersData() {
  try {
    const search = document.getElementById('member-search-input').value;
    const role = document.getElementById('member-role-filter').value;
    const status = document.getElementById('member-status-filter').value;

    let query = '?';
    if (search) query += `search=${encodeURIComponent(search)}&`;
    if (role) query += `role=${encodeURIComponent(role)}&`;
    if (status) query += `status=${encodeURIComponent(status)}&`;

    const members = await apiFetch(`/api/members${query}`);
    const tbody = document.getElementById('members-list-tbody');
    
    // Cache departments names
    const unitLabels = {
      'unit_grace_pastorate': 'Pastorate',
      'unit_grace_ushering': 'Ushering',
      'unit_grace_followup': 'Follow-up',
      'unit_grace_tech': 'Technical',
      'unit_grace_sanctuary': 'Sanctuary Keepers',
      'unit_grace_music': 'Music Unit',
      'unit_grace_finance': 'Finance Committee',
      'unit_hope_pastorate': 'Pastorate',
      'unit_hope_ushering': 'Ushering Team',
      'unit_hope_finance': 'Finance Team'
    };

    tbody.innerHTML = members.map(m => `
      <tr>
        <td><img src="${m.profile_picture_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}" alt="Avatar" class="table-avatar"></td>
        <td><strong>${m.name}</strong></td>
        <td><span class="badge badge-role">${m.role}</span></td>
        <td>${m.position || 'General Member'}</td>
        <td>${unitLabels[m.unit_id] || 'General Altar'}</td>
        <td><span class="badge ${m.status === 'Active' ? 'badge-active' : 'badge-inactive'}">${m.status}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="viewMemberDetail('${m.id}')">👁 View Details</button>
          ${activeUser.role === 'Pastor' ? `<button class="btn btn-danger btn-sm" onclick="deleteMemberProfile('${m.id}')">✖ Delete</button>` : ''}
        </td>
      </tr>
    `).join('');

    if (members.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center">No matching members found in database.</td></tr>`;
    }

  } catch (err) {
    console.error('Failed loading members registry list:', err);
  }
}

// View individual member details in popup card
window.viewMemberDetail = async function(id) {
  try {
    const member = await apiFetch(`/api/members/${id}`);
    
    document.getElementById('det-avatar').src = member.profile_picture_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop';
    document.getElementById('det-name').textContent = member.name;
    document.getElementById('det-role-badge').textContent = member.role;
    document.getElementById('det-position').textContent = member.position || 'General Member';
    
    // Status color
    const statusEl = document.getElementById('det-status');
    statusEl.textContent = member.status;
    statusEl.className = 'status-indicator badge ' + (member.status === 'Active' ? 'badge-active' : 'badge-inactive');

    // Resolve unit label
    const unitLabels = {
      'unit_grace_pastorate': 'Pastorate',
      'unit_grace_ushering': 'Ushering Unit',
      'unit_grace_followup': 'Follow-up Unit',
      'unit_grace_tech': 'Technical Unit',
      'unit_grace_sanctuary': 'Sanctuary Keepers',
      'unit_grace_music': 'Music Unit',
      'unit_grace_finance': 'Finance Committee',
      'unit_hope_pastorate': 'Pastorate',
      'unit_hope_ushering': 'Ushering Team',
      'unit_hope_finance': 'Finance Team'
    };
    document.getElementById('det-unit').textContent = unitLabels[member.unit_id] || 'No Department assigned';

    // Pruned fields checkers (Will show "Pruned / Hidden for Privacy" if undefined)
    document.getElementById('det-email').textContent = member.email || '🔒 Pruned/Hidden for Privacy';
    document.getElementById('det-phone').textContent = member.phone || '🔒 Pruned/Hidden for Privacy';
    document.getElementById('det-address').textContent = member.address || '🔒 Pruned/Hidden for Privacy';
    
    if (member.dob_month && member.dob_day) {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      document.getElementById('det-dob').textContent = `${months[member.dob_month - 1]} ${member.dob_day}`;
    } else {
      document.getElementById('det-dob').textContent = '🔒 Pruned/Hidden for Privacy';
    }

    if (member.joined_date) {
      document.getElementById('det-joined').textContent = new Date(member.joined_date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } else {
      document.getElementById('det-joined').textContent = '🔒 Pruned/Hidden for Privacy';
    }

    document.getElementById('profile-detail-modal').classList.add('active');
  } catch (err) {
    alert(err.message);
  }
};

window.deleteMemberProfile = async function(id) {
  if (!confirm('Are you absolutely sure you want to permanently delete this member profile? This will cascade delete their attendance and financial records.')) return;
  try {
    const res = await apiFetch(`/api/members/${id}`, { method: 'DELETE' });
    alert(res.message);
    loadMembersData();
  } catch (err) {
    alert(err.message);
  }
};

// 3. Attendance Tab
async function loadAttendanceSheet() {
  // Only Ushers or Pastors can view attendance marking sheets
  if (!['Usher', 'Pastor'].includes(activeUser.role)) {
    document.getElementById('attendance-sheet-tbody').innerHTML = `
      <tr><td colspan="3" class="text-center">mark sheets are restricted to Ushering Staff.</td></tr>
    `;
    document.getElementById('btn-close-service').disabled = true;
    return;
  }

  try {
    const serviceName = document.getElementById('att-service-name').value;
    const date = document.getElementById('att-service-date').value;

    const data = await apiFetch(`/api/attendance/sheet?date=${date}&serviceName=${encodeURIComponent(serviceName)}`);
    
    document.getElementById('active-sheet-title').textContent = `${data.serviceName} checklist (${data.serviceDate})`;
    document.getElementById('btn-close-service').disabled = false;

    const tbody = document.getElementById('attendance-sheet-tbody');
    tbody.innerHTML = data.sheet.map(m => `
      <tr>
        <td><strong>${m.memberName}</strong></td>
        <td><span class="badge badge-role">${m.role}</span> (${m.position || 'Member'})</td>
        <td>
          <div class="flex-row gap-2">
            <input type="checkbox" id="check-${m.memberId}" ${m.status === 'Present' ? 'checked' : ''} 
              onchange="markMemberAttendance('${m.memberId}', '${data.serviceDate}', '${data.serviceName}', this.checked ? 'Present' : 'Absent')">
            <label for="check-${m.memberId}">${m.status === 'Present' ? 'Present' : 'Absent'}</label>
          </div>
        </td>
      </tr>
    `).join('');

    if (data.sheet.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center">No members found in church registry to mark.</td></tr>`;
      document.getElementById('btn-close-service').disabled = true;
    }

  } catch (err) {
    console.error('Failed to load attendance checklist sheet:', err);
  }
}

window.markMemberAttendance = async function(memberId, serviceDate, serviceName, status) {
  try {
    await apiFetch('/api/attendance/mark', {
      method: 'POST',
      body: JSON.stringify({ memberId, serviceDate, serviceName, status })
    });
    
    // Reload label text next to checkbox
    const label = document.querySelector(`label[for="check-${memberId}"]`);
    if (label) label.textContent = status;
    
  } catch (err) {
    alert(`Failed to save attendance: ${err.message}`);
  }
};

async function loadWorkersPerformance() {
  // restricted to Pastors, HODs, or FollowUp
  if (!['Pastor', 'HOD', 'FollowUp'].includes(activeUser.role)) {
    document.getElementById('workers-performance-tbody').innerHTML = `
      <tr><td colspan="4" class="text-center">Reports restricted to church leaders.</td></tr>
    `;
    document.getElementById('workers-activeness-rate').textContent = 'Locked';
    return;
  }

  try {
    const data = await apiFetch('/api/attendance/stats?type=workers');
    document.getElementById('workers-activeness-rate').textContent = `${data.avgAttendanceRate}%`;

    const tbody = document.getElementById('workers-performance-tbody');
    tbody.innerHTML = data.memberPerformance.map(w => `
      <tr>
        <td><strong>${w.name}</strong></td>
        <td><span class="badge badge-role">${w.role}</span></td>
        <td>${w.presentCount}/${w.totalServices}</td>
        <td><strong>${w.attendanceRate}%</strong></td>
      </tr>
    `).join('');

    if (data.memberPerformance.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center">No worker logs seeded in database.</td></tr>`;
    }
  } catch (err) {
    console.error('Failed loading workers performance data stats:', err);
  }
}

// 4. Inventory Tab
async function loadInventoryData() {
  try {
    const items = await apiFetch('/api/inventory');
    const grid = document.getElementById('inventory-items-grid');
    
    // Check if role is authorized to update status (Pastor, HOD, and specific departments)
    const isTechDept = activeUser.unit_id && (
      activeUser.unit_id.includes('tech') || 
      activeUser.unit_id.includes('sanctuary') || 
      activeUser.unit_id.includes('music') ||
      activeUser.unit_id.includes('choir')
    );
    const isAuthorizedToEdit = activeUser.role === 'Pastor' || (activeUser.role === 'HOD' && isTechDept) || isTechDept;

    const unitLabels = {
      'unit_grace_tech': 'Technical Unit',
      'unit_grace_music': 'Music Unit',
      'unit_grace_sanctuary': 'Sanctuary Keepers',
      'unit_hope_ushering': 'Ushering Team'
    };

    grid.innerHTML = items.map(item => {
      const isSelectedStatus = (statusVal) => item.status === statusVal ? 'selected' : '';
      
      const badgeClass = item.status === 'Active' ? 'badge-active' : (item.status === 'Faulty' ? 'badge-faulty' : 'badge-inactive');
      
      return `
        <div class="inventory-card">
          <div>
            <h3>${item.item_name}</h3>
            <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px;">${item.description || 'No description provided.'}</p>
          </div>
          
          <div class="inv-meta">
            <span class="inv-dept">${unitLabels[item.unit_id] || 'General Inventory'}</span>
            <span class="badge ${badgeClass}">${item.status}</span>
          </div>

          ${isAuthorizedToEdit ? `
            <div class="inv-controls">
              <select onchange="updateInventoryStatus('${item.id}', this.value)" class="form-input select-input btn-sm flex-1">
                <option value="Active" ${isSelectedStatus('Active')}>Active</option>
                <option value="Faulty" ${isSelectedStatus('Faulty')}>Faulty</option>
                <option value="Unavailable" ${isSelectedStatus('Unavailable')}>Unavailable</option>
              </select>
              ${activeUser.role === 'Pastor' ? `
                <button class="btn btn-danger btn-sm" onclick="deleteInventoryItem('${item.id}')">✖ Delete</button>
              ` : ''}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    if (items.length === 0) {
      grid.innerHTML = `<div class="text-center" style="grid-column: 1/-1;">No equipment item registered under active church.</div>`;
    }

  } catch (err) {
    console.error('Failed to load inventory assets:', err);
  }
}

window.updateInventoryStatus = async function(id, status) {
  try {
    await apiFetch(`/api/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    loadInventoryData();
  } catch (err) {
    alert(err.message);
  }
};

window.deleteInventoryItem = async function(id) {
  if (!confirm('Remove this equipment from the church registries permanently?')) return;
  try {
    const res = await apiFetch(`/api/inventory/${id}`, { method: 'DELETE' });
    alert(res.message);
    loadInventoryData();
  } catch (err) {
    alert(err.message);
  }
};

// 5. Financial Tab
async function loadFinancialsData() {
  const isFinanceTeam = activeUser.unit_id && activeUser.unit_id.includes('finance');
  const canAccessFinance = activeUser.role === 'Pastor' || isFinanceTeam;

  if (!canAccessFinance) return; // UI panels toggled automatically by RBAC

  try {
    // Load Ledger
    const ledger = await apiFetch('/api/financials');
    const tbody = document.getElementById('finance-ledger-tbody');
    
    tbody.innerHTML = ledger.map(l => `
      <tr>
        <td>${new Date(l.transaction_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</td>
        <td><strong>${l.contributorName}</strong></td>
        <td><span class="badge badge-role">${l.category}</span></td>
        <td>${l.payment_method}</td>
        <td><strong>$${l.amount.toFixed(2)}</strong></td>
      </tr>
    `).join('');

    if (ledger.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center">No transaction logged under active church.</td></tr>`;
    }

    // Load Projections Calculations
    const projections = await apiFetch('/api/financials/projections');
    document.getElementById('finance-growth-rate').textContent = `${projections.growthRatePercent}%`;
    document.getElementById('finance-next-projection').textContent = `$${projections.projectedNextWeek.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

  } catch (err) {
    console.error('Failed loading financials ledger reports:', err);
  }
}

// 6. Broadcast Tab
async function loadBroadcastContext() {
  const isBroadcastAdmin = ['Pastor', 'HOD'].includes(activeUser.role);
  if (!isBroadcastAdmin) return;

  try {
    const units = await apiFetch('/api/units');
    const select = document.getElementById('bc-unit-id');
    
    select.innerHTML = units.map(u => 
      `<option value="${u.id}">${u.name}</option>`
    ).join('');

    // Toggle specific unit selectors based on target value
    const targetSelect = document.getElementById('bc-target');
    const unitGroup = document.getElementById('bc-unit-group');

    targetSelect.onchange = (e) => {
      if (e.target.value === 'unit' && activeUser.role === 'Pastor') {
        unitGroup.style.display = 'block';
      } else {
        unitGroup.style.display = 'none';
      }
    };
  } catch (err) {
    console.error('Failed loading units list in broadcast hub:', err);
  }
}

// --- POPUPS & FORM HANDLERS ---

function setupModalListeners() {
  // Member registry Modal
  const mModal = document.getElementById('member-modal');
  document.getElementById('btn-open-member-modal').onclick = async () => {
    // Load units dropdown inside modal
    try {
      const units = await apiFetch('/api/units');
      const select = document.getElementById('reg-unit');
      select.innerHTML = '<option value="">No Department Assigned</option>' + 
        units.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    } catch (err) {
      console.error(err);
    }
    mModal.classList.add('active');
  };
  document.getElementById('btn-close-member-modal').onclick = () => mModal.classList.remove('active');
  document.getElementById('btn-cancel-member-modal').onclick = () => mModal.classList.remove('active');

  // Inventory Modal
  const iModal = document.getElementById('inventory-modal');
  document.getElementById('btn-open-inventory-modal').onclick = async () => {
    try {
      const units = await apiFetch('/api/units');
      const select = document.getElementById('inv-unit');
      select.innerHTML = '<option value="">No Specific Department</option>' +
        units.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    } catch (err) {
      console.error(err);
    }
    iModal.classList.add('active');
  };
  document.getElementById('btn-close-inventory-modal').onclick = () => iModal.classList.remove('active');
  document.getElementById('btn-cancel-inventory-modal').onclick = () => iModal.classList.remove('active');

  // Details Modal close
  document.getElementById('btn-close-detail-modal').onclick = () => {
    document.getElementById('profile-detail-modal').classList.remove('active');
  };
}

function setupFormListeners() {
  // Members search bar filter keyup
  document.getElementById('member-search-input').onkeyup = loadMembersData;
  document.getElementById('member-role-filter').onchange = loadMembersData;
  document.getElementById('member-status-filter').onchange = loadMembersData;

  // Mark attendance setups form
  document.getElementById('attendance-setup-form').onsubmit = (e) => {
    e.preventDefault();
    loadAttendanceSheet();
  };

  // Close & submit attendance service
  document.getElementById('btn-close-service').onclick = async () => {
    const serviceName = document.getElementById('att-service-name').value;
    const serviceDate = document.getElementById('att-service-date').value;

    if (!confirm(`Are you sure you want to close the checklist registry for ${serviceName} on ${serviceDate}? Anyone unmarked will be automatically recorded as Absent.`)) return;

    try {
      const res = await apiFetch('/api/attendance/close-service', {
        method: 'POST',
        body: JSON.stringify({ serviceDate, serviceName })
      });
      alert(res.message);
      loadAttendanceSheet();
      loadWorkersPerformance();
    } catch (err) {
      alert(err.message);
    }
  };

  // Member Registration Submit
  document.getElementById('member-register-form').onsubmit = async (e) => {
    e.preventDefault();
    
    const body = {
      name: document.getElementById('reg-name').value,
      email: document.getElementById('reg-email').value,
      phone: document.getElementById('reg-phone').value,
      address: document.getElementById('reg-address').value,
      dob_month: Number(document.getElementById('reg-dob-month').value),
      dob_day: Number(document.getElementById('reg-dob-day').value) || 1,
      role: document.getElementById('reg-role').value,
      position: document.getElementById('reg-position').value || 'Member',
      unit_id: document.getElementById('reg-unit').value || null,
    };

    try {
      await apiFetch('/api/members', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      alert('New member successfully registered in ChurchBook database.');
      document.getElementById('member-modal').classList.remove('active');
      document.getElementById('member-register-form').reset();
      loadMembersData();
    } catch (err) {
      alert(`Registration failed: ${err.message}`);
    }
  };

  // Inventory Item Submit
  document.getElementById('inventory-add-form').onsubmit = async (e) => {
    e.preventDefault();

    const body = {
      item_name: document.getElementById('inv-name').value,
      description: document.getElementById('inv-description').value,
      status: document.getElementById('inv-status').value,
      unit_id: document.getElementById('inv-unit').value || null,
    };

    try {
      await apiFetch('/api/inventory', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      alert('Equipment registered successfully in inventories database.');
      document.getElementById('inventory-modal').classList.remove('active');
      document.getElementById('inventory-add-form').reset();
      loadInventoryData();
    } catch (err) {
      alert(`Inventory failed: ${err.message}`);
    }
  };

  // Payment Form Submit (Contributions)
  const payForm = document.getElementById('payment-gateway-form');
  const payMethod = document.getElementById('pay-method');
  const cardFields = document.getElementById('card-fields');

  payMethod.onchange = (e) => {
    cardFields.style.display = e.target.value === 'Card' ? 'block' : 'none';
  };

  payForm.onsubmit = async (e) => {
    e.preventDefault();

    const body = {
      amount: Number(document.getElementById('pay-amount').value),
      category: document.getElementById('pay-category').value,
      payment_method: payMethod.value,
      card_number: document.getElementById('pay-card-number').value,
      card_expiry: document.getElementById('pay-card-expiry').value,
      card_cvv: document.getElementById('pay-card-cvv').value,
      anonymous: document.getElementById('pay-anonymous').checked,
    };

    try {
      const res = await apiFetch('/api/financials/pay', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      alert(res.message);
      payForm.reset();
      cardFields.style.display = 'block'; // reset view
      loadFinancialsData();
    } catch (err) {
      alert(`Transaction Rejected: ${err.message}`);
    }
  };

  // Broadcast Compose Form Submit
  const bcLogs = document.getElementById('broadcast-logs-container');
  document.getElementById('broadcast-compose-form').onsubmit = async (e) => {
    e.preventDefault();

    const body = {
      target: document.getElementById('bc-target').value,
      unitId: document.getElementById('bc-unit-id').value || null,
      message: document.getElementById('bc-message').value,
    };

    try {
      const res = await apiFetch('/api/messaging/send', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      // Log success in mock terminal view
      const timestamp = new Date().toLocaleTimeString();
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML = `
        <span class="log-time" style="color:var(--text-muted)">[${timestamp}]</span> 
        <strong style="color:var(--accent-sapphire)">SMS Broadcast Success:</strong> ${res.message}<br>
        <span style="font-size:0.75rem; color:var(--text-secondary)">Recipients (${res.recipientCount}): ${res.recipients.join(', ') || 'None'}</span>
      `;
      bcLogs.insertBefore(entry, bcLogs.firstChild);
      
      document.getElementById('bc-message').value = '';
    } catch (err) {
      // Log error in terminal
      const timestamp = new Date().toLocaleTimeString();
      const entry = document.createElement('div');
      entry.className = 'log-entry error';
      entry.innerHTML = `
        <span class="log-time" style="color:var(--text-muted)">[${timestamp}]</span> 
        <strong>Error:</strong> ${err.message}
      `;
      bcLogs.insertBefore(entry, bcLogs.firstChild);
    }
  };
}
