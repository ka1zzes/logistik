/* ====== НАСТРОЙКА ====== */
const AUTH_ENABLED = true;

/* ====== ДАННЫЕ ====== */
let orders   = JSON.parse(localStorage.getItem('profit_orders')   || '[]');
let payrolls = JSON.parse(localStorage.getItem('profit_payrolls') || '[]');
let history  = JSON.parse(localStorage.getItem('profit_history')  || '[]');

const TARIFFS = {
  'Фура':         { base: 5000, perKm: 30, perTon: 200, maxWeight: 25 },
  'Газель':       { base: 2000, perKm: 20, perTon: 150, maxWeight: 3  },
  'Рефрижератор': { base: 8000, perKm: 45, perTon: 250, maxWeight: 20 },
  'Тент':         { base: 4000, perKm: 25, perTon: 180, maxWeight: 22 }
};

/* ====== АВТОРИЗАЦИЯ ====== */
function doLogin(){
  const email = document.getElementById('loginUser').value.trim();
  const pass  = document.getElementById('loginPass').value;
  
  if (email === 'm.ivanov@profit.ru' && pass === 'admin123'){
    sessionStorage.setItem('profitUser', JSON.stringify({ name:'Иванов Максим Денисович' }));
    enterApp();
  } else {
    document.getElementById('authError').textContent = 'Неверный email или пароль!';
  }
}

function doLogout(){ sessionStorage.removeItem('profitUser'); location.reload(); }

function enterApp(){
  document.getElementById('authModal').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  document.getElementById('userName').textContent = 'Иванов Максим Денисович';
  renderAll();
}

function checkAuth(){
  if (!AUTH_ENABLED){ enterApp(); return; }
  if (sessionStorage.getItem('profitUser')){ enterApp(); }
}

/* ====== ХРАНЕНИЕ ====== */
function saveOrders()   { localStorage.setItem('profit_orders',   JSON.stringify(orders));   }
function savePayrolls() { localStorage.setItem('profit_payrolls', JSON.stringify(payrolls)); }
function saveHistory()  { localStorage.setItem('profit_history',  JSON.stringify(history));  }

function addHistory(action){
  const now = new Date();
  const time = now.toLocaleDateString('ru-RU') + ' ' + now.toLocaleTimeString('ru-RU');
  history.unshift({ time, action });
  if (history.length > 50) history = history.slice(0, 50);
  saveHistory();
}

/* ====== ВКЛАДКИ ====== */
function switchTab(name, btn){
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  document.getElementById('tab-' + name).style.display = 'block';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (name === 'calc')      renderCalc();
  if (name === 'analytics') renderAnalytics();
  if (name === 'archive')   renderArchive();
  if (name === 'profile')   renderHistory();
}

/* ====== ЗАЯВКИ ====== */
function renderOrders(){
  const q = document.getElementById('searchOrders').value.toLowerCase();
  const body = document.getElementById('ordersBody');
  body.innerHTML = '';
  orders.filter(o => o.client.toLowerCase().includes(q)).forEach(o => {
    body.innerHTML += `<tr>
      <td>${o.id}</td><td>${o.client}</td><td>${o.route}</td>
      <td>${o.distance}</td><td>${o.weight}</td><td>${o.vehicleType}</td>
      <td>${o.createdAt}</td>
      <td><button class="btn btn-danger" onclick="deleteOrder(${o.id})">Удалить</button></td>
    </tr>`;
  });
}
function openOrderModal(){
  document.getElementById('orderModal').classList.add('show');
  document.getElementById('oDate').value = new Date().toISOString().slice(0,10);
}
function closeOrderModal(){ document.getElementById('orderModal').classList.remove('show'); }

function saveOrder(){
  const client      = document.getElementById('oClient').value.trim();
  const route       = document.getElementById('oRoute').value.trim();
  const distance    = +document.getElementById('oDistance').value;
  const weight      = +document.getElementById('oWeight').value;
  const vehicleType = document.getElementById('oVehicle').value;
  const date        = document.getElementById('oDate').value || new Date().toISOString().slice(0,10);
  if (!client || !route || !distance || !weight){ alert('Заполните все поля'); return; }
  orders.push({ id: Date.now(), client, route, distance, weight, vehicleType, createdAt: date });
  saveOrders();
  addHistory('Добавлена заявка: ' + client);
  closeOrderModal();
  renderOrders();
}
function deleteOrder(id){
  if (payrolls.some(p => p.orderId === id)){ alert('Нельзя удалить: есть расчёты в архиве'); return; }
  if (!confirm('Удалить заявку?')) return;
  orders = orders.filter(o => o.id !== id);
  saveOrders();
  addHistory('Удалена заявка #' + id);
  renderOrders();
}

/* ====== РАСЧЁТ ====== */
function calcCost(o){
  const t = TARIFFS[o.vehicleType] || TARIFFS['Фура'];
  const cost = t.base + o.distance * t.perKm + o.weight * t.perTon;
  return Math.round(cost * 100) / 100;
}
function renderCalc(){
  const body = document.getElementById('calcBody');
  body.innerHTML = '';
  let total = 0;
  orders.forEach(o => {
    const cost = calcCost(o);
    total += cost;
    body.innerHTML += `<tr>
      <td>${o.client}</td><td>${o.route}</td><td>${o.distance}</td>
      <td>${o.weight}</td><td>${o.vehicleType}</td><td>—</td>
      <td>${cost.toFixed(2)} ₽</td>
    </tr>`;
  });
  document.getElementById('calcFooter').innerHTML = `<tr class="total-row">
    <td colspan="6"><b>ИТОГО:</b></td><td><b>${total.toFixed(2)} ₽</b></td></tr>`;
  document.getElementById('statCount').textContent = orders.length;
  document.getElementById('statTotal').textContent = total.toFixed(2) + ' ₽';
  document.getElementById('statAvg').textContent  = orders.length ? (total/orders.length).toFixed(2)+' ₽' : '0 ₽';
}
function savePayroll(){
  if (!orders.length){ alert('Нет заявок'); return; }
  const now = new Date();
  orders.forEach(o => {
    payrolls.push({
      id: Date.now() + Math.random(),
      orderId: o.id,
      cost: calcCost(o),
      savedAt: now.toLocaleDateString('ru-RU') + ' ' + now.toLocaleTimeString('ru-RU')
    });
  });
  savePayrolls();
  addHistory('Сохранён расчёт (' + orders.length + ' записей)');
  alert('Расчёт сохранён в архив');
}

/* ====== АНАЛИТИКА ====== */
function renderAnalytics() {
  const count = orders.length;
  const timeManualPerOrder = 4.33; 
  const timeAutoPerOrder = 0.56;   

  const totalManual = Math.max(count * timeManualPerOrder, 0);
  const totalAuto = Math.max(count * timeAutoPerOrder, 0);

  document.getElementById('valManual').textContent = totalManual > 0 ? totalManual.toFixed(1) + ' мин' : '0 мин';
  document.getElementById('valAuto').textContent = totalAuto > 0 ? totalAuto.toFixed(1) + ' мин' : '0 мин';

  const maxVal = Math.max(totalManual, 1); 
  const hManual = (totalManual / maxVal) * 100;
  const hAuto = (totalAuto / maxVal) * 100;

  document.getElementById('barManual').style.height = hManual + '%';
  document.getElementById('barAuto').style.height = Math.max(hAuto, 2) + '%';

  const legend = document.getElementById('legendText');
  if (totalManual > 0 && totalAuto > 0) {
    const ratio = (totalManual / totalAuto).toFixed(1);
    legend.textContent = `↓ Сокращение времени в ${ratio} раза ↓`;
  } else {
    legend.textContent = `Добавьте заявки для расчёта экономии`;
  }
}

/* ====== АРХИВ ====== */
function renderArchive(){
  const m = document.getElementById('archMonth').value;
  const y = document.getElementById('archYear').value;
  const body = document.getElementById('archiveBody');
  body.innerHTML = '';
  payrolls.filter(p => {
    const d = new Date(p.savedAt);
    if (m && (d.getMonth()+1) != m) return false;
    if (y && d.getFullYear() != y) return false;
    return true;
  }).forEach(p => {
    const o = orders.find(x => x.id === p.orderId) || { client:'—', route:'—' };
    body.innerHTML += `<tr>
      <td>${p.savedAt}</td><td>${o.client}</td><td>${o.route}</td>
      <td>${p.savedAt.split(' ')[0]}</td><td>${p.cost.toFixed(2)} ₽</td>
      <td><button class="btn btn-danger" onclick="deleteArchive(${p.id})">Удалить</button></td>
    </tr>`;
  });
}
function deleteArchive(id){
  payrolls = payrolls.filter(p => p.id !== id);
  savePayrolls(); renderArchive();
}
function clearArchive(){
  if (!confirm('Очистить весь архив?')) return;
  payrolls = []; savePayrolls(); renderArchive();
}

/* ====== ИСТОРИЯ ====== */
function renderHistory(){
  const list = document.getElementById('historyList');
  list.innerHTML = history.map(h => `<div class="history-item">${h.time} — ${h.action}</div>`).join('');
}
function clearHistory(){ history = []; saveHistory(); renderHistory(); }

/* ====== ЭКСПОРТ / ИМПОРТ ====== */
function exportOrdersJSON(){
  const blob = new Blob([JSON.stringify(orders, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'orders_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
}
function exportFullBackup(){
  const data = { orders, payrolls, history };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'full_backup_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  addHistory('Экспорт базы данных');
}
function importFullBackup(e){
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      orders   = data.orders   || [];
      payrolls = data.payrolls || [];
      history  = data.history  || [];
      saveOrders(); savePayrolls(); saveHistory();
      addHistory('Импорт базы данных');
      renderAll();
      alert('Данные успешно импортированы');
    } catch { alert('Ошибка чтения файла'); }
  };
  reader.readAsText(file);
}
function resetAll(){
  if (!confirm('Сбросить все данные? Будут восстановлены тестовые примеры.')) return;
  localStorage.clear(); sessionStorage.clear(); location.reload();
}

/* ====== СТАРТ ====== */
function renderAll(){ renderOrders(); renderCalc(); renderAnalytics(); renderArchive(); renderHistory(); }
checkAuth();