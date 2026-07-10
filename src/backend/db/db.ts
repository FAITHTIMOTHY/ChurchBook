import fs from 'fs';
import path from 'path';

// --- TypeScript Database Interfaces ---
export interface Tenant {
  id: string;
  name: string;
  logo_url: string;
}

export interface Unit {
  id: string;
  tenant_id: string;
  name: string;
  parent_unit_id: string | null;
  description: string;
}

export interface Member {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  profile_picture_url: string;
  dob_month: number;
  dob_day: number;
  role: 'Pastor' | 'HOD' | 'Usher' | 'FollowUp' | 'Member';
  position: string;
  unit_id: string | null;
  status: 'Active' | 'Inactive';
  joined_date: string;
}

export interface Attendance {
  id: string;
  tenant_id: string;
  member_id: string;
  service_date: string; // YYYY-MM-DD
  service_name: string;
  status: 'Present' | 'Absent';
  recorded_by: string | null;
  recorded_at: string;
}

export interface InventoryItem {
  id: string;
  tenant_id: string;
  item_name: string;
  description: string;
  status: 'Active' | 'Faulty' | 'Unavailable';
  unit_id: string | null; // e.g., Technical, Sanctuary
  updated_at: string;
}

export interface FinancialRecord {
  id: string;
  tenant_id: string;
  member_id: string | null; // can be null for anonymous
  amount: number;
  category: 'Offering' | 'Tithes' | 'Donations';
  payment_method: string;
  transaction_date: string;
  recorded_by: string | null;
}

export interface DatabaseSchema {
  tenants: Tenant[];
  units: Unit[];
  members: Member[];
  attendance: Attendance[];
  inventory: InventoryItem[];
  financials: FinancialRecord[];
}

const DB_FILE = path.resolve('database.json');

// --- In-Memory State and File Operations ---
let db: DatabaseSchema = {
  tenants: [],
  units: [],
  members: [],
  attendance: [],
  inventory: [],
  financials: [],
};

// Save to disk atomically
export function saveDB(): void {
  try {
    // Perform dynamic calculation: tagging members as active/inactive
    // Rules: "Anyone absent for a month is tagged inactive."
    updateMemberStatuses();
    
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

// Load database or seed initial values
export function loadDB(): void {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(data);
      // Run status reconciliation
      updateMemberStatuses();
    } catch (err) {
      console.error('Failed to parse database.json, seeding new database...', err);
      seedDB();
    }
  } else {
    seedDB();
  }
}

// Accessors for raw collections
export const collections = {
  getTenants: () => db.tenants,
  getUnits: () => db.units,
  getMembers: () => db.members,
  getAttendance: () => db.attendance,
  getInventory: () => db.inventory,
  getFinancials: () => db.financials,
};

// Automatic calculation logic for active/inactive member status
// Triggered on database load/save
function updateMemberStatuses(): void {
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

  // Group attendance records by member_id
  const memberAttendanceMap: Record<string, Attendance[]> = {};
  for (const record of db.attendance) {
    if (!memberAttendanceMap[record.member_id]) {
      memberAttendanceMap[record.member_id] = [];
    }
    memberAttendanceMap[record.member_id].push(record);
  }

  for (const member of db.members) {
    // Pastors and HODs/leaders bypass the automatic inactive tagging to ensure account availability
    if (member.role === 'Pastor' || member.role === 'HOD') {
      member.status = 'Active';
      continue;
    }

    const records = memberAttendanceMap[member.id] || [];
    
    // Find if the member has ANY 'Present' record within the last 30 days
    const hasPresentRecently = records.some(r => {
      const recDate = new Date(r.service_date);
      return r.status === 'Present' && recDate >= oneMonthAgo;
    });

    // Check if there was any service event logged at all in the system within the last 30 days.
    // If services were held but the member was not present, they are inactive.
    // If no services were logged at all in the database, we keep their current status.
    const systemHadServices = db.attendance.some(r => {
      const recDate = new Date(r.service_date);
      return recDate >= oneMonthAgo;
    });

    if (systemHadServices) {
      member.status = hasPresentRecently ? 'Active' : 'Inactive';
    } else {
      // Default to Active if no attendance data exists to base decision
      member.status = member.status || 'Active';
    }
  }
}

// --- Seeding Routine ---
function seedDB(): void {
  console.log('Seeding demo data into database.json...');
  
  const tenants: Tenant[] = [
    { id: 'tenant_grace', name: 'Grace Chapel International', logo_url: 'https://images.unsplash.com/photo-1548625361-155deee2627d?w=100&h=100&fit=crop' },
    { id: 'tenant_hope', name: 'Hope Community Church', logo_url: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=100&h=100&fit=crop' },
  ];

  const units: Unit[] = [
    // Grace Chapel Units
    { id: 'unit_grace_pastorate', tenant_id: 'tenant_grace', name: 'Pastorate', parent_unit_id: null, description: 'Senior oversight and spiritual lead.' },
    { id: 'unit_grace_ushering', tenant_id: 'tenant_grace', name: 'Ushering Unit', parent_unit_id: null, description: 'Managing seating arrangement, orderliness, and attendance registers.' },
    { id: 'unit_grace_followup', tenant_id: 'tenant_grace', name: 'Follow-up Unit', parent_unit_id: null, description: 'Caring for first-timers, visitations, and member retention.' },
    { id: 'unit_grace_tech', tenant_id: 'tenant_grace', name: 'Technical Unit', parent_unit_id: null, description: 'Sound setup, visual projections, media, and inventory control.' },
    { id: 'unit_grace_sanctuary', tenant_id: 'tenant_grace', name: 'Sanctuary Keepers', parent_unit_id: null, description: 'Beautification and cleanliness of the church auditorium.' },
    { id: 'unit_grace_music', tenant_id: 'tenant_grace', name: 'Music Unit (Choir)', parent_unit_id: null, description: 'Praise and worship team, and musical instruments management.' },
    { id: 'unit_grace_finance', tenant_id: 'tenant_grace', name: 'Finance Committee', parent_unit_id: null, description: 'Counting, recording, and auditing offerings, tithes, and donations.' },

    // Hope Community Units
    { id: 'unit_hope_pastorate', tenant_id: 'tenant_hope', name: 'Pastorate', parent_unit_id: null, description: 'Pastoral leadership.' },
    { id: 'unit_hope_ushering', tenant_id: 'tenant_hope', name: 'Ushering Team', parent_unit_id: null, description: 'Welcome and registration.' },
    { id: 'unit_hope_finance', tenant_id: 'tenant_hope', name: 'Finance Team', parent_unit_id: null, description: 'Managing Hope account and donations.' },
  ];

  const members: Member[] = [
    // Grace Chapel Members
    {
      id: 'm_grace_pastor',
      tenant_id: 'tenant_grace',
      name: 'Pastor Caleb Dondon',
      email: 'caleb@gracechapel.org',
      phone: '+1 234-567-8901',
      address: '77 Heaven’s Gate Way, Grace City',
      profile_picture_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
      dob_month: 8,
      dob_day: 24,
      role: 'Pastor',
      position: 'Senior Pastor',
      unit_id: 'unit_grace_pastorate',
      status: 'Active',
      joined_date: '2020-01-15T09:00:00Z',
    },
    {
      id: 'm_grace_hod_tech',
      tenant_id: 'tenant_grace',
      name: 'Bro. David Tech',
      email: 'david@gracechapel.org',
      phone: '+1 234-567-8902',
      address: '12 Silicon Alley, Grace City',
      profile_picture_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
      dob_month: 3,
      dob_day: 14,
      role: 'HOD',
      position: 'Technical Unit HOD',
      unit_id: 'unit_grace_tech',
      status: 'Active',
      joined_date: '2021-05-20T10:30:00Z',
    },
    {
      id: 'm_grace_usher',
      tenant_id: 'tenant_grace',
      name: 'Sis. Faith Welcome',
      email: 'faith@gracechapel.org',
      phone: '+1 234-567-8903',
      address: '34 Harmony Street, Grace City',
      profile_picture_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop',
      dob_month: 12,
      dob_day: 5,
      role: 'Usher',
      position: 'Lead Usher / Registrar',
      unit_id: 'unit_grace_ushering',
      status: 'Active',
      joined_date: '2022-09-01T08:00:00Z',
    },
    {
      id: 'm_grace_followup',
      tenant_id: 'tenant_grace',
      name: 'Bro. John Shepherd',
      email: 'john@gracechapel.org',
      phone: '+1 234-567-8904',
      address: '56 Restoration Crescent, Grace City',
      profile_picture_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
      dob_month: 5,
      dob_day: 18,
      role: 'FollowUp',
      position: 'Follow-up Coordinator',
      unit_id: 'unit_grace_followup',
      status: 'Active',
      joined_date: '2023-02-12T11:00:00Z',
    },
    {
      id: 'm_grace_member1',
      tenant_id: 'tenant_grace',
      name: 'Sarah Jenkins',
      email: 'sarah.j@gmail.com',
      phone: '+1 234-567-8905',
      address: '88 Meadowbrook Lane, Grace City',
      profile_picture_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
      dob_month: 10,
      dob_day: 12,
      role: 'Member',
      position: 'General Member',
      unit_id: null,
      status: 'Active',
      joined_date: '2024-06-01T10:00:00Z',
    },
    {
      id: 'm_grace_member2_inactive',
      tenant_id: 'tenant_grace',
      name: 'Thomas Miller',
      email: 'thomas.m@gmail.com',
      phone: '+1 234-567-8906',
      address: '102 Dusty Trail Road, Grace City',
      profile_picture_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&h=150&fit=crop',
      dob_month: 1,
      dob_day: 9,
      role: 'Member',
      position: 'General Member',
      unit_id: null,
      status: 'Inactive', // Toggled by lack of attendance in seed
      joined_date: '2023-11-15T09:30:00Z',
    },

    // Hope Community Members
    {
      id: 'm_hope_pastor',
      tenant_id: 'tenant_hope',
      name: 'Pastor Rachel Green',
      email: 'rachel@hopecommunity.org',
      phone: '+1 987-654-3210',
      address: '1 Hope Boulevard, Cityville',
      profile_picture_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop',
      dob_month: 4,
      dob_day: 30,
      role: 'Pastor',
      position: 'Senior Pastor',
      unit_id: 'unit_hope_pastorate',
      status: 'Active',
      joined_date: '2019-06-01T08:00:00Z',
    },
    {
      id: 'm_hope_usher',
      tenant_id: 'tenant_hope',
      name: 'Bro. Samuel Hopeful',
      email: 'sam@hopecommunity.org',
      phone: '+1 987-654-3211',
      address: '15 Peace Valley, Cityville',
      profile_picture_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop',
      dob_month: 7,
      dob_day: 19,
      role: 'Usher',
      position: 'Usher Admin',
      unit_id: 'unit_hope_ushering',
      status: 'Active',
      joined_date: '2022-03-10T12:00:00Z',
    }
  ];

  // Helper date generators relative to today's date
  const today = new Date();
  const getPastDateStr = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  // Seeding attendance records
  // Member 1 (Sarah) is Active: attended 4, 3, 2, and 1 week ago
  // Member 2 (Thomas) is Inactive: was present 5 and 6 weeks ago, but absent for 4, 3, 2, and 1 week ago (or has no records in the past month)
  const attendance: Attendance[] = [
    // Sarah's records
    { id: 'att_g_1', tenant_id: 'tenant_grace', member_id: 'm_grace_member1', service_date: getPastDateStr(28), service_name: 'Sunday Worship', status: 'Present', recorded_by: 'm_grace_usher', recorded_at: new Date().toISOString() },
    { id: 'att_g_2', tenant_id: 'tenant_grace', member_id: 'm_grace_member1', service_date: getPastDateStr(21), service_name: 'Sunday Worship', status: 'Present', recorded_by: 'm_grace_usher', recorded_at: new Date().toISOString() },
    { id: 'att_g_3', tenant_id: 'tenant_grace', member_id: 'm_grace_member1', service_date: getPastDateStr(14), service_name: 'Sunday Worship', status: 'Present', recorded_by: 'm_grace_usher', recorded_at: new Date().toISOString() },
    { id: 'att_g_4', tenant_id: 'tenant_grace', member_id: 'm_grace_member1', service_date: getPastDateStr(7), service_name: 'Sunday Worship', status: 'Present', recorded_by: 'm_grace_usher', recorded_at: new Date().toISOString() },
    
    // Thomas's records (Attended 35 days ago, then absent or unrecorded in the past month)
    { id: 'att_g_5', tenant_id: 'tenant_grace', member_id: 'm_grace_member2_inactive', service_date: getPastDateStr(35), service_name: 'Sunday Worship', status: 'Present', recorded_by: 'm_grace_usher', recorded_at: new Date().toISOString() },
    { id: 'att_g_6', tenant_id: 'tenant_grace', member_id: 'm_grace_member2_inactive', service_date: getPastDateStr(28), service_name: 'Sunday Worship', status: 'Absent', recorded_by: 'm_grace_usher', recorded_at: new Date().toISOString() },
    { id: 'att_g_7', tenant_id: 'tenant_grace', member_id: 'm_grace_member2_inactive', service_date: getPastDateStr(21), service_name: 'Sunday Worship', status: 'Absent', recorded_by: 'm_grace_usher', recorded_at: new Date().toISOString() },
    { id: 'att_g_8', tenant_id: 'tenant_grace', member_id: 'm_grace_member2_inactive', service_date: getPastDateStr(14), service_name: 'Sunday Worship', status: 'Absent', recorded_by: 'm_grace_usher', recorded_at: new Date().toISOString() },
    { id: 'att_g_9', tenant_id: 'tenant_grace', member_id: 'm_grace_member2_inactive', service_date: getPastDateStr(7), service_name: 'Sunday Worship', status: 'Absent', recorded_by: 'm_grace_usher', recorded_at: new Date().toISOString() },
    
    // Ushers/Workers attending workers' preparatory
    { id: 'att_g_10', tenant_id: 'tenant_grace', member_id: 'm_grace_usher', service_date: getPastDateStr(7), service_name: 'Workers Meeting', status: 'Present', recorded_by: 'm_grace_pastor', recorded_at: new Date().toISOString() },
    { id: 'att_g_11', tenant_id: 'tenant_grace', member_id: 'm_grace_hod_tech', service_date: getPastDateStr(7), service_name: 'Workers Meeting', status: 'Present', recorded_by: 'm_grace_pastor', recorded_at: new Date().toISOString() },
    { id: 'att_g_12', tenant_id: 'tenant_grace', member_id: 'm_grace_followup', service_date: getPastDateStr(7), service_name: 'Workers Meeting', status: 'Present', recorded_by: 'm_grace_pastor', recorded_at: new Date().toISOString() },
  ];

  const inventory: InventoryItem[] = [
    // Grace Chapel Inventory
    { id: 'inv_g_1', tenant_id: 'tenant_grace', item_name: 'Behringer X32 Sound Mixer', description: '32-channel digital mixer in sound box', status: 'Active', unit_id: 'unit_grace_tech', updated_at: new Date().toISOString() },
    { id: 'inv_g_2', tenant_id: 'tenant_grace', item_name: 'Epson Pro Projector', description: 'Auditorium main display projector', status: 'Active', unit_id: 'unit_grace_tech', updated_at: new Date().toISOString() },
    { id: 'inv_g_3', tenant_id: 'tenant_grace', item_name: 'Shure SM58 Wireless Microphones', description: 'Vocal microphones (4 pieces)', status: 'Faulty', unit_id: 'unit_grace_tech', updated_at: new Date().toISOString() },
    { id: 'inv_g_4', tenant_id: 'tenant_grace', item_name: 'Yamaha Montage 8 Keyboard', description: 'Main altar synthesizer', status: 'Active', unit_id: 'unit_grace_music', updated_at: new Date().toISOString() },
    { id: 'inv_g_5', tenant_id: 'tenant_grace', item_name: 'Altar Flowers and Carpets', description: 'Decorations for the main platform', status: 'Active', unit_id: 'unit_grace_sanctuary', updated_at: new Date().toISOString() },
    
    // Hope Community Inventory
    { id: 'inv_h_1', tenant_id: 'tenant_hope', item_name: 'Fender Frontman Guitar Amp', description: 'Hope community stage amplifier', status: 'Unavailable', unit_id: 'unit_hope_ushering', updated_at: new Date().toISOString() }
  ];

  const financials: FinancialRecord[] = [
    // Grace Chapel Financials
    { id: 'fin_g_1', tenant_id: 'tenant_grace', member_id: 'm_grace_member1', amount: 150.00, category: 'Tithes', payment_method: 'Card', transaction_date: getPastDateStr(25) + 'T10:00:00Z', recorded_by: 'm_grace_pastor' },
    { id: 'fin_g_2', tenant_id: 'tenant_grace', member_id: null, amount: 840.50, category: 'Offering', payment_method: 'Cash', transaction_date: getPastDateStr(21) + 'T12:00:00Z', recorded_by: 'm_grace_pastor' },
    { id: 'fin_g_3', tenant_id: 'tenant_grace', member_id: 'm_grace_member2_inactive', amount: 200.00, category: 'Donations', payment_method: 'Bank Transfer', transaction_date: getPastDateStr(18) + 'T14:30:00Z', recorded_by: 'm_grace_pastor' },
    { id: 'fin_g_4', tenant_id: 'tenant_grace', member_id: 'm_grace_member1', amount: 180.00, category: 'Tithes', payment_method: 'Card', transaction_date: getPastDateStr(11) + 'T10:15:00Z', recorded_by: 'm_grace_pastor' },
    { id: 'fin_g_5', tenant_id: 'tenant_grace', member_id: null, amount: 920.00, category: 'Offering', payment_method: 'Cash', transaction_date: getPastDateStr(7) + 'T11:45:00Z', recorded_by: 'm_grace_pastor' },
    { id: 'fin_g_6', tenant_id: 'tenant_grace', member_id: 'm_grace_pastor', amount: 500.00, category: 'Donations', payment_method: 'Bank Transfer', transaction_date: getPastDateStr(2) + 'T16:00:00Z', recorded_by: 'm_grace_pastor' },

    // Hope Community Financials
    { id: 'fin_h_1', tenant_id: 'tenant_hope', member_id: 'm_hope_usher', amount: 75.00, category: 'Offering', payment_method: 'Card', transaction_date: getPastDateStr(7) + 'T11:00:00Z', recorded_by: 'm_hope_pastor' }
  ];

  db = { tenants, units, members, attendance, inventory, financials };
  saveDB();
}

// Automatically load database on import
loadDB();
