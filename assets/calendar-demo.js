'use strict';

const DOCTORS_KEY = 'demoDoctors_v1';
const SHIFTS_KEY = 'demoShifts_v1';
const XLSX_SRC = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

const demoDoctors = [
  { name: 'გიორგი ცინცაძე', specialty: 'გადაუდებელი მედიცინა', phone: '555 101 201' },
  { name: 'მარიამ კახიძე', specialty: 'კარდიოლოგია', phone: '555 202 303' },
  { name: 'ლაშა ბერიძე', specialty: 'ზოგადი ქირურგია', phone: '555 303 404' },
  { name: 'თამარ მესხი', specialty: 'ნევროლოგია', phone: '555 404 505' },
  { name: 'ირაკლი სულაშვილი', specialty: 'ტრავმატოლოგია', phone: '555 505 606' },
  { name: 'ანა მიქაძე', specialty: 'ექოსკოპია', phone: '555 606 707' },
  { name: 'ნიკა აბრამიშვილი', specialty: 'CT ოპერატორი', phone: '555 707 808' },
  { name: 'ელენე ჩხეტია', specialty: 'ინფექციური სნეულებები', phone: '555 808 909' },
  { name: 'დავით კვესიტაძე', specialty: 'უროლოგია', phone: '555 909 010' },
  { name: 'სოფო ღლონტი', specialty: 'X-ray რადიოლოგი', phone: '555 112 233' }
];

const monthNames = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];

let allShifts = getStoredArray(SHIFTS_KEY) || [];
let doctors = getStoredArray(DOCTORS_KEY) || [...demoDoctors];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;
let selectedDoctor = null;

const modal = document.getElementById('shift-modal');
const openBtn = document.getElementById('open-modal-btn');
const closeBtn = document.getElementById('close-modal');
const doctorSearch = document.getElementById('doctor-search');
const specialtyFilter = document.getElementById('specialty-filter');
const doctorList = document.getElementById('doctor-list');
const modalPhone = document.getElementById('modal-phone');
const modalDate = document.getElementById('modal-date');
const modalHours = document.getElementById('modal-hours');
const repeatType = document.getElementById('repeat-type');
const repeatUntil = document.getElementById('repeat-until');
const addFinalBtn = document.getElementById('add-shift-final');
const calendarGrid = document.getElementById('calendar-grid');
const monthYearEl = document.getElementById('month-year');
const selectedDateTitle = document.getElementById('selected-date-title');
const departmentsGrid = document.getElementById('departments-grid');
const selectedDateView = document.getElementById('selected-date-view');
const exportBtn = document.getElementById('export-excel');
const deptSearch = document.getElementById('dept-search');
const statusEl = document.getElementById('status');
const tabShift = document.getElementById('tab-shift');
const tabNewDoctor = document.getElementById('tab-new-doctor');
const shiftTabPanel = document.getElementById('shift-tab-panel');
const newDoctorTabPanel = document.getElementById('new-doctor-tab-panel');

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getStoredArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveDoctors() {
  localStorage.setItem(DOCTORS_KEY, JSON.stringify(doctors));
}

function saveShifts() {
  localStorage.setItem(SHIFTS_KEY, JSON.stringify(allShifts));
}

function updateStatus(message, color = '#f59e0b') {
  statusEl.textContent = message;
  statusEl.style.background = color;
}

function formatDateDDMMYYYY(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}

function populateSpecialties() {
  const specs = [...new Set(doctors.map((d) => d.specialty))].sort();
  specialtyFilter.innerHTML = '<option value="">ყველა</option>' + specs.map((s) => `<option value="${s}">${s}</option>`).join('');
}

function renderDoctorList() {
  const query = doctorSearch.value.toLowerCase().trim();
  const spec = specialtyFilter.value;
  const filtered = doctors.filter((d) => (d.name.toLowerCase().includes(query) || d.phone.includes(query)) && (!spec || d.specialty === spec));

  doctorList.innerHTML = filtered.length === 0 ? '<div style="padding:20px;text-align:center;color:#888;">ექიმი არ მოიძებნა</div>' : '';

  filtered.forEach((d) => {
    const initial = d.name.trim().charAt(0).toUpperCase();
    const div = document.createElement('div');
    div.className = 'doctor-item';
    if (selectedDoctor && selectedDoctor.name === d.name && selectedDoctor.phone === d.phone) div.classList.add('selected');
    div.innerHTML = `<div class="doctor-avatar">${initial}</div><div class="doctor-meta"><strong>${d.name}</strong><small>${d.specialty} • ${d.phone}</small></div>`;
    div.onclick = () => {
      selectedDoctor = d;
      modalPhone.value = d.phone;
      document.querySelectorAll('.doctor-item').forEach((i) => i.classList.remove('selected'));
      div.classList.add('selected');
    };
    doctorList.appendChild(div);
  });
}

function setModalTab(tabName) {
  const isShiftTab = tabName === 'shift';
  tabShift.classList.toggle('active', isShiftTab);
  tabNewDoctor.classList.toggle('active', !isShiftTab);
  shiftTabPanel.classList.toggle('hidden', !isShiftTab);
  newDoctorTabPanel.classList.toggle('hidden', isShiftTab);
}

function renderCalendar() {
  const firstDay = new Date(currentYear, currentMonth, 1).getDay() || 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  while (calendarGrid.children.length > 7) calendarGrid.removeChild(calendarGrid.lastChild);

  for (let i = 0, day = 1; i < 6 * 7; i += 1) {
    if (i < firstDay - 1 || day > daysInMonth) {
      if (day > daysInMonth) break;
      const empty = document.createElement('div');
      empty.className = 'day-cell';
      calendarGrid.appendChild(empty);
      continue;
    }

    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const count = allShifts.filter((s) => s.date === dateStr).length;
    const cell = document.createElement('div');
    cell.className = `day-cell${dateStr === today ? ' today' : ''}${count > 0 ? ' has-shift' : ''}`;
    cell.innerHTML = `<div class="date-num">${day}</div>${count > 0 ? `<div class="shift-count">${count}</div>` : ''}`;
    cell.onclick = () => openDateView(dateStr);
    calendarGrid.appendChild(cell);
    day += 1;
  }

  monthYearEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;
}

function openDateView(dateStr) {
  selectedDate = dateStr;
  modalDate.value = dateStr;
  selectedDateTitle.textContent = `მორიგეები - ${formatDateDDMMYYYY(dateStr)}`;
  selectedDateView.classList.remove('hidden');
  renderShiftsForDate(dateStr);
}

function renderShiftsForDate(dateStr) {
  const shifts = allShifts.filter((s) => s.date === dateStr);
  const byDept = {};
  shifts.forEach((s) => {
    if (!byDept[s.specialty]) byDept[s.specialty] = [];
    byDept[s.specialty].push(s);
  });

  const search = deptSearch.value.toLowerCase();
  departmentsGrid.innerHTML = '';

  Object.keys(byDept)
    .filter((x) => x.toLowerCase().includes(search))
    .sort()
    .forEach((dept) => {
      const card = document.createElement('div');
      card.className = 'dept-card';
      card.innerHTML = `<div class="dept-header">${dept}</div>`;

      byDept[dept].forEach((s) => {
        const item = document.createElement('div');
        item.className = 'shift-item';
        item.innerHTML = `<div class="shift-info-line"><span class="shift-doctor-name">${s.name}</span><span class="shift-doctor-phone">${s.phone}</span></div><div class="shift-item-actions"><span class="shift-hours">${s.hours} სთ</span><button class="delete-btn" data-id="${s.id}">X</button></div>`;
        card.appendChild(item);
      });

      departmentsGrid.appendChild(card);
    });

  document.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.onclick = function onDeleteClick(e) {
      e.stopPropagation();
      if (confirm(`დარწმუნებული ხართ, რომ გინდათ წაშალოთ ${this.parentElement.parentElement.querySelector('strong').textContent}-ის მორიგეობა?`)) {
        allShifts = allShifts.filter((s) => s.id !== this.dataset.id);
        saveShifts();
        renderCalendar();
        renderShiftsForDate(dateStr);
      }
    };
  });
}

async function ensureXlsxLoaded() {
  if (window.XLSX) return;

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = XLSX_SRC;
    script.onload = resolve;
    script.onerror = () => reject(new Error('xlsx ჩაიტვირთა შეცდომით'));
    document.head.appendChild(script);
  });
}

async function exportExcel() {
  try {
    updateStatus('Excel ბიბლიოთეკა იტვირთება...', '#3b82f6');
    await ensureXlsxLoaded();

    const wb = XLSX.utils.book_new();
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthShifts = allShifts.filter((s) => s.date.startsWith(monthPrefix));
    const byDept = {};

    monthShifts.forEach((s) => {
      if (!byDept[s.specialty]) byDept[s.specialty] = [];
      byDept[s.specialty].push(s);
    });

    Object.keys(byDept).sort().forEach((dept) => {
      const deptData = [];
      const doctorMap = {};

      byDept[dept].forEach((s) => {
        const key = `${s.name}|||${s.phone}`;
        if (!doctorMap[key]) doctorMap[key] = { name: s.name, phone: s.phone, hours: Array(32).fill('') };
        const day = parseInt(s.date.split('-')[2], 10);
        doctorMap[key].hours[day] = s.hours;
      });

      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const header = ['ექიმი', 'ტელეფონი'];

      for (let d = 1; d <= daysInMonth; d += 1) {
        const date = new Date(currentYear, currentMonth, d);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        header.push({ v: d, t: 'n', s: isWeekend ? { fill: { fgColor: { rgb: 'E5E7EB' } } } : {} });
      }

      header.push('მორიგეების რ-ბა', 'საათები');
      deptData.push(header);

      Object.values(doctorMap).forEach((doc) => {
        let count = 0;
        let total = 0;
        const row = [doc.name, doc.phone];

        for (let d = 1; d <= daysInMonth; d += 1) {
          const h = doc.hours[d];
          if (h) {
            count += 1;
            total += parseInt(h, 10);
          }
          row.push(h || '');
        }

        row.push(count, total);
        deptData.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(deptData);
      ws['!cols'] = [{ wch: 25 }, { wch: 15 }, ...Array(daysInMonth).fill({ wch: 5 }), { wch: 14 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws, dept.length > 30 ? dept.substring(0, 30) : dept);
    });

    const monthName = monthNames[currentMonth];
    XLSX.writeFile(wb, `მორიგეები_დემო_${monthName}_${currentYear}.xlsx`);
    updateStatus('დემო მზადაა!', '#10b981');
    alert('Excel წარმატებით გადმოწერილია!');
  } catch (err) {
    console.error(err);
    updateStatus('ექსპორტის შეცდომა', '#ef4444');
    alert('Excel ექსპორტის დროს მოხდა შეცდომა.');
  }
}

function addShift() {
  if (!selectedDoctor) return alert('აირჩიეთ ექიმი');
  if (!modalDate.value || !modalHours.value) return alert('შეავსეთ ყველა ველი');

  const base = {
    name: selectedDoctor.name,
    specialty: selectedDoctor.specialty,
    phone: selectedDoctor.phone,
    hours: modalHours.value
  };

  const days = parseInt(repeatUntil.value, 10) || 30;
  let added = 0;
  let current = new Date(modalDate.value);

  if (repeatType.value === 'none') {
    allShifts.push({ ...base, date: modalDate.value, id: makeId('shift') });
    added += 1;
  } else if (repeatType.value === 'daily') {
    for (let i = 0; i < days; i += 1) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dateStr = current.toISOString().split('T')[0];
        allShifts.push({ ...base, date: dateStr, id: makeId('shift') });
        added += 1;
      }
      current.setDate(current.getDate() + 1);
    }
  } else if (repeatType.value === 'every2') {
    for (let i = 0; i < days; i += 2) {
      current = new Date(modalDate.value);
      current.setDate(current.getDate() + i);
      const dateStr = current.toISOString().split('T')[0];
      allShifts.push({ ...base, date: dateStr, id: makeId('shift') });
      added += 1;
    }
  } else if (repeatType.value === 'every4') {
    for (let i = 0; i < days; i += 4) {
      current = new Date(modalDate.value);
      current.setDate(current.getDate() + i);
      const dateStr = current.toISOString().split('T')[0];
      allShifts.push({ ...base, date: dateStr, id: makeId('shift') });
      added += 1;
    }
  }

  saveShifts();
  modal.classList.remove('active');
  renderCalendar();
  if (selectedDate) renderShiftsForDate(selectedDate);
  alert(`დაემატა ${added} მორიგეობა!`);
}

function addNewDoctor() {
  const name = document.getElementById('new-name').value.trim();
  const specialty = document.getElementById('new-specialty-select').value;
  const phone = document.getElementById('new-phone').value.trim();

  if (!name || !specialty || !phone) return alert('შეავსეთ ყველა ველი');

  doctors.push({ id: makeId('doctor'), name, specialty, phone });
  saveDoctors();

  document.getElementById('new-name').value = '';
  document.getElementById('new-phone').value = '';
  document.getElementById('new-specialty-select').value = '';

  populateSpecialties();
  renderDoctorList();
  alert('ექიმი დაემატა!');
}

openBtn.onclick = () => {
  modal.classList.add('active');
  selectedDoctor = null;
  modalPhone.value = '';
  setModalTab('shift');
  renderDoctorList();
};

closeBtn.onclick = () => {
  modal.classList.remove('active');
};

tabShift.onclick = () => setModalTab('shift');
tabNewDoctor.onclick = () => setModalTab('new-doctor');

document.getElementById('prev-month').onclick = () => {
  currentMonth = (currentMonth - 1 + 12) % 12;
  if (currentMonth === 11) currentYear -= 1;
  renderCalendar();
};

document.getElementById('next-month').onclick = () => {
  currentMonth = (currentMonth + 1) % 12;
  if (currentMonth === 0) currentYear += 1;
  renderCalendar();
};

document.getElementById('today-btn').onclick = () => {
  const t = new Date();
  currentMonth = t.getMonth();
  currentYear = t.getFullYear();
  renderCalendar();
};

doctorSearch.oninput = renderDoctorList;
specialtyFilter.onchange = renderDoctorList;
deptSearch.oninput = () => {
  if (selectedDate) renderShiftsForDate(selectedDate);
};

repeatType.onchange = () => {
  repeatUntil.classList.toggle('hidden', repeatType.value === 'none');
};

addFinalBtn.onclick = addShift;
document.getElementById('add-new-doctor').onclick = addNewDoctor;
exportBtn.onclick = exportExcel;

populateSpecialties();
renderDoctorList();
renderCalendar();
updateStatus('დემო მზადაა!', '#10b981');
