
// --- Configuration ---
// TO BE REPLACED WITH YOUR DEPLOYED WEB APP URL
const API_URL = "YOUR_GAS_DEPLOY_URL"; // Example: "https://script.google.com/macros/s/xxx/exec"

/* 
* Client-Side Logic
*/

// State
let currentMonth = new Date(); // default now
let currentType = 'Expense';
let currentAmount = '0';
let currentCategory = null;
let currentSubCategory = null;
let transactionQueue = []; // Queue for batch entry
let editingTransactionId = null; // ID of transaction being edited
let categories = [];
let transactions = [];

// Mock Mode Detection (Manual override or fallback if API_URL is invalid)
const isMock = API_URL === "YOUR_GAS_DEPLOY_URL";

// Mock Data
const MOCK_CATEGORIES = [
    // Income
    { name: '給与', type: 'Income', color: '#f7b731', icon: 'work', parent: '' },
    { name: '給与', type: 'Income', color: '#f7b731', icon: '', parent: '給与' },
    { name: '賞与', type: 'Income', color: '#f7b731', icon: '', parent: '給与' },
    { name: '投資', type: 'Income', color: '#20bf6b', icon: 'trending_up', parent: '' },
    { name: '配当', type: 'Income', color: '#20bf6b', icon: '', parent: '投資' },
    { name: '売却', type: 'Income', color: '#20bf6b', icon: '', parent: '投資' },
    { name: 'その他', type: 'Income', color: '#8854d0', icon: 'more_horiz', parent: '' },
    { name: 'その他', type: 'Income', color: '#8854d0', icon: '', parent: 'その他' },

    // Expenses
    { name: '食費', type: 'Expense', color: '#ff6b6b', icon: 'restaurant', parent: '' },
    { name: '一般', type: 'Expense', color: '#ff6b6b', icon: '', parent: '食費' },
    { name: '外食・おやつ', type: 'Expense', color: '#ff6b6b', icon: '', parent: '食費' },

    { name: '日用品', type: 'Expense', color: '#f7b731', icon: 'shopping_cart', parent: '' },
    { name: '一般', type: 'Expense', color: '#f7b731', icon: '', parent: '日用品' },
    { name: 'こども', type: 'Expense', color: '#f7b731', icon: '', parent: '日用品' },

    { name: '生活', type: 'Expense', color: '#a3cb38', icon: 'store', parent: '' },
    { name: '美容', type: 'Expense', color: '#a3cb38', icon: '', parent: '生活' },
    { name: '医療', type: 'Expense', color: '#a3cb38', icon: '', parent: '生活' },
    { name: '薬', type: 'Expense', color: '#a3cb38', icon: '', parent: '生活' },
    { name: 'アパレル', type: 'Expense', color: '#a3cb38', icon: '', parent: '生活' },

    { name: '交通費', type: 'Expense', color: '#45b7d1', icon: 'directions_car', parent: '' },
    { name: '一般', type: 'Expense', color: '#45b7d1', icon: '', parent: '交通費' },
    { name: '自動車', type: 'Expense', color: '#45b7d1', icon: '', parent: '交通費' },

    { name: '娯楽', type: 'Expense', color: '#ff9ff3', icon: 'hotel', parent: '' },
    { name: 'お出かけ', type: 'Expense', color: '#ff9ff3', icon: '', parent: '娯楽' },
    { name: 'ゲーム・メディア', type: 'Expense', color: '#ff9ff3', icon: '', parent: '娯楽' },
    { name: '交際費', type: 'Expense', color: '#ff9ff3', icon: '', parent: '娯楽' },
    { name: 'その他', type: 'Expense', color: '#ff9ff3', icon: '', parent: '娯楽' },

    { name: '教養', type: 'Expense', color: '#2d98da', icon: 'event_seat', parent: '' },
    { name: '本', type: 'Expense', color: '#2d98da', icon: '', parent: '教養' },
    { name: '習い事', type: 'Expense', color: '#2d98da', icon: '', parent: '教養' },
    { name: 'その他', type: 'Expense', color: '#2d98da', icon: '', parent: '教養' },

    { name: '固定費', type: 'Expense', color: '#8854d0', icon: 'bookmark', parent: '' },
    { name: '住宅', type: 'Expense', color: '#8854d0', icon: '', parent: '固定費' },
    { name: '公共料金', type: 'Expense', color: '#8854d0', icon: '', parent: '固定費' },
    { name: '通信費', type: 'Expense', color: '#8854d0', icon: '', parent: '固定費' },
    { name: 'サブスク', type: 'Expense', color: '#8854d0', icon: '', parent: '固定費' },

    { name: '資産形成', type: 'Expense', color: '#20bf6b', icon: 'attach_money', parent: '' },
    { name: '貯金', type: 'Expense', color: '#20bf6b', icon: '', parent: '資産形成' },
    { name: '投資', type: 'Expense', color: '#20bf6b', icon: '', parent: '資産形成' }
];

// --- API Client ---
// Replaces google.script.run
async function callApi(action, payload = {}) {
    if (isMock) {
        console.warn('Using Mock Data - API call skipped for:', action);
        return Promise.resolve({ status: 'success' }); // Dummy promise
    }

    try {
        const url = new URL(API_URL);
        url.searchParams.append('action', action); // pass action in query for GET routing if needed, but mainly we POST

        // Construct POST body
        const body = JSON.stringify({
            action: action,
            ...payload
        });

        const response = await fetch(url.toString(), {
            method: 'POST',
            body: body,
            // To avoid preflight OPTIONS request issues in GAS simple usage, we use text/plain or no content-type sometimes.
            // But standard is application/json. GAS "Anyone" web app handles text/plain reliably without preflight cors errors.
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        return json;
    } catch (e) {
        console.error("API Call Failed", e);
        throw e;
    }
}

// Initialization
window.addEventListener('DOMContentLoaded', () => {
    setupHandlers();
    // Pass loadTransactions as callback to ensure order
    loadCategories(() => {
        loadTransactions();
    });
    updateMonthDisplay();

    // Set default date in input
    document.getElementById('input-date').valueAsDate = new Date();
});

function setupHandlers() {
    // Modal toggle
    document.getElementById('add-btn').addEventListener('click', () => {
        openModal();
    });

    document.getElementById('close-modal').addEventListener('click', () => {
        closeModal();
    });

    // Menu toggle
    document.getElementById('menu-btn').addEventListener('click', () => {
        openMenu();
    });
    document.getElementById('close-menu').addEventListener('click', () => {
        closeMenu();
    });
    document.getElementById('menu-overlay').addEventListener('click', () => {
        closeMenu();
    });

    // Navigation (External Links now)
    document.getElementById('nav-archive').addEventListener('click', () => {
        window.location.href = 'archive.html';
    });

    document.getElementById('nav-statistics').addEventListener('click', () => {
        window.location.href = 'statistics.html';
    });

    document.getElementById('nav-assets').addEventListener('click', () => {
        window.location.href = 'assets.html';
    });

    document.querySelectorAll('.menu-item:not(#nav-archive):not(#nav-statistics):not(#nav-assets)').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Just close menu for now for other items
            closeMenu();
        });
    });

    // Type toggle
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentType = e.target.dataset.type;
            // Reset selections
            currentCategory = null;
            currentSubCategory = null;
            renderCategories();
            renderSubCategories(null); // Clear sub
        });
    });

    // Calculator
    document.querySelectorAll('.calc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Handle click on icon wrapper or button itself
            const target = e.target.closest('button');
            const val = target.dataset.val;
            handleCalcInput(val);
        });
    });

    // Month navigation
    document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeMonth(1));

    // Delete button handler
    const deleteBtn = document.getElementById('btn-mode-delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (confirm('この明細を削除しますか？')) {
                deleteTransaction();
            }
        });
    }
}

// Data Loading
function loadCategories(callback) {
    if (isMock) {
        categories = MOCK_CATEGORIES;
        renderCategories();
        if (callback) callback();
    } else {
        callApi('getCategories')
            .then(response => {
                if (response.status === 'success') {
                    categories = response.data;
                } else {
                    console.error('Category load error:', response);
                    categories = MOCK_CATEGORIES; // Fallback?
                }
                renderCategories();
                if (callback) callback();
            })
            .catch(err => {
                alert('カテゴリ読み込みエラー: ' + err);
            });
    }
}

function loadTransactions() {
    // Clear list
    const listEl = document.getElementById('transaction-list');
    listEl.innerHTML = '<div class="loading">Loading...</div>';

    if (isMock) {
        // Mimic network delay
        setTimeout(() => {
            // Generate some dummy data for current month
            transactions = [
                { id: 1, date: '2026-01-05', category: '食費', subCategory: '外食・おやつ', amount: 1500, type: 'Expense', note: 'ランチ' },
                { id: 2, date: '2026-01-06', category: '交通費', subCategory: '一般', amount: 420, type: 'Expense', note: '電車' }
            ];
            console.log('Mock transactions:', transactions);
            renderTransactions();
            updateSummary();
        }, 500);
    } else {
        const monthStr = formatDate(currentMonth).substring(0, 7); // YYYY-MM
        callApi('getTransactions', { month: monthStr })
            .then(response => {
                if (response.status === 'success') {
                    // The API now returns array directly in data property?
                    // My refactored getAllTransactions returning row list as object? 
                    // Check Code.js: return { status: 'success', data: result }; result is array of objects.
                    transactions = response.data;
                } else {
                    console.error('Server error:', response);
                    transactions = [];
                }
                renderTransactions();
                updateSummary();
            })
            .catch(error => {
                console.error('Failed to fetch transactions:', error);
                document.getElementById('transaction-list').innerHTML = `<div class="error">エラーが発生しました: ${error.message}</div>`;
            });
    }
}

// Rendering
function renderCategories() {
    // Ensure container is flex column or block to stack lists
    const container = document.getElementById('category-selector');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    container.innerHTML = `
        <div style="width:100%;">
            <div id="major-category-list" class="category-list"></div>
        </div>
        <div id="minor-cat-container" class="hidden" style="width:100%; margin-top:0px; padding-top:0px;">
            <div id="sub-category-list" class="category-list"></div>
        </div>
    `;

    const majorList = document.getElementById('major-category-list');

    // Filter Major Categories (Parent is empty or null)
    const filtered = categories.filter(c => c.type === currentType && !c.parent);

    filtered.forEach((cat, index) => {
        const pill = document.createElement('div');
        pill.className = 'category-pill';
        if (cat.name === currentCategory) {
            pill.classList.add('selected');
        }

        // Just use text label for now, or fetch icon logic if needed
        pill.innerHTML = `<div class="category-dot" style="background:${cat.color}"></div>${cat.name}`;

        pill.addEventListener('click', () => {
            // Remove selection from others
            majorList.querySelectorAll('.category-pill').forEach(p => p.classList.remove('selected'));
            pill.classList.add('selected');

            currentCategory = cat.name;
            currentSubCategory = null; // Reset sub when major changes

            renderSubCategories(cat.name);
        });

        majorList.appendChild(pill);
    });

    // If currentCategory is already set, verify it still matches currentType and render subs
    if (currentCategory && filtered.find(c => c.name === currentCategory)) {
        renderSubCategories(currentCategory);
    }
}

function renderSubCategories(parentName) {
    const container = document.getElementById('minor-cat-container');
    const list = document.getElementById('sub-category-list');
    list.innerHTML = '';

    if (!parentName) {
        container.classList.add('hidden');
        return;
    }

    const subs = categories.filter(c => c.parent === parentName);

    if (subs.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');

    subs.forEach(cat => {
        const pill = document.createElement('div');
        pill.className = 'category-pill';
        if (cat.name === currentSubCategory) {
            pill.classList.add('selected');
        }

        pill.innerHTML = `<div class="category-dot" style="background:${cat.color}"></div>${cat.name}`;

        pill.addEventListener('click', () => {
            list.querySelectorAll('.category-pill').forEach(p => p.classList.remove('selected'));
            pill.classList.add('selected');
            currentSubCategory = cat.name;
        });

        list.appendChild(pill);
    });
}

function renderTransactions() {
    const listEl = document.getElementById('transaction-list');
    listEl.innerHTML = '';

    if (!transactions || transactions.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><p>取引がありません</p></div>';
        return;
    }

    // Sort by date desc
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    transactions.forEach(t => {
        const item = document.createElement('div');
        // Implement Card Style
        item.style.background = 'white';
        item.style.padding = '12px 16px';
        item.style.borderRadius = '12px';
        item.style.boxShadow = 'var(--shadow)';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';

        const isExp = t.type === 'Expense';
        const amountClass = isExp ? 'expense' : 'income';
        const amountPrefix = isExp ? '-' : '+';

        const catColor = getCategoryColor(t.category);
        const catIcon = getCategoryIcon(t.category);

        const displayCat = t.subCategory ? `${t.category} <span style="font-size:0.8em; color:#666;">(${t.subCategory})</span>` : t.category;

        item.innerHTML = `
  <div style="display:flex; align-items:center; gap:12px;">
     <div style="width:40px; height:40px; border-radius:50%; background:${catColor}20; display:flex; align-items:center; justify-content:center; color:${catColor}; font-size:1.2rem;">
       <span class="material-symbols-outlined">${catIcon}</span>
     </div>
     <div>
       <div style="font-weight:600; font-size:1rem;">${displayCat}</div>
       <div style="font-size:0.8rem; color:#888;">${formatDate(new Date(t.date))} ${t.note ? '・' + t.note : ''}</div>
     </div>
  </div>
  <div class="value ${amountClass}" style="font-size:1rem;">${amountPrefix}¥${Math.abs(t.amount).toLocaleString()}</div>
`;
        // Add click listener for editing
        item.addEventListener('click', () => editTransaction(t));
        listEl.appendChild(item);
    });
}

function editTransaction(t) {
    editingTransactionId = t.id;

    // 1. Set Data
    currentType = t.type;
    currentCategory = t.category;
    currentSubCategory = t.subCategory;
    currentAmount = String(Math.abs(t.amount));

    // 2. Update UI inputs
    document.getElementById('input-date').value = t.date; // YYYY-MM-DD
    document.getElementById('amount-value').textContent = Number(currentAmount).toLocaleString();
    document.getElementById('input-note').value = t.note || '';

    // 3. Update Category UI
    renderCategories();

    // 4. Update Type UI
    document.querySelectorAll('.type-btn').forEach(btn => {
        if (btn.dataset.type === currentType) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // 5. Toggle Buttons (Edit Mode)
    document.getElementById('btn-mode-continuous').classList.add('hidden');
    document.getElementById('btn-mode-delete').classList.remove('hidden');
    document.getElementById('save-btn').textContent = '更新';

    // 6. Open Modal
    const modal = document.getElementById('input-modal');
    modal.classList.remove('hidden');
}

function updateSummary() {
    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
        if (t.type === 'Income') income += Math.abs(Number(t.amount));
        else expense += Math.abs(Number(t.amount));
    });

    document.querySelector('.value.income').textContent = `¥${income.toLocaleString()}`;
    document.querySelector('.value.expense').textContent = `¥${expense.toLocaleString()}`;
    document.querySelector('.value.balance').textContent = `¥${(income - expense).toLocaleString()}`;
}

// Logic
function handleCalcInput(val) {
    if (val === 'clear') {
        currentAmount = '0';
    } else if (val === 'back') {
        if (currentAmount.length > 1) {
            if (currentAmount.startsWith("-") && currentAmount.length === 2) {
                currentAmount = '0'
            } else {
                currentAmount = currentAmount.slice(0, -1);
            }
        } else {
            currentAmount = '0';
        }
    } else if (val === 'queue') {
        addToQueue();
        return;
    } else if (val === 'save') {
        if (currentAmount !== '0') {
            addToQueue();
        } else if (transactionQueue.length === 0) {
            addToQueue(); // Trigger validation alert
            return;
        }
        sendBatch();
        return;
    } else {
        // Number input
        if (currentAmount === '0') {
            currentAmount = val;
        } else {
            currentAmount += val;
        }
    }

    document.getElementById('amount-value').textContent = Number(currentAmount).toLocaleString();
}

function addToQueue() {
    if (currentAmount === '0' && transactionQueue.length === 0) {
        alert('金額を入力してください');
        return;
    }
    if (currentAmount === '0') return;

    if (!currentCategory) {
        alert('カテゴリを選択してください');
        return;
    }

    const date = document.getElementById('input-date').value;
    const note = document.getElementById('input-note').value;

    if (!date) {
        alert('日付を入力してください');
        return;
    }

    const hasSubs = categories.some(c => c.parent === currentCategory);
    if (hasSubs && !currentSubCategory) {
        alert('詳細カテゴリを選択してください');
        return;
    }

    const transaction = {
        date: date,
        type: currentType,
        category: currentCategory,
        subCategory: currentSubCategory || '',
        amount: Number(currentType === 'Expense' ? -currentAmount : currentAmount),
        note: note
    };

    transactionQueue.push(transaction);

    // Reset inputs
    currentAmount = '0';
    currentCategory = null;
    currentSubCategory = null;
    document.getElementById('input-note').value = '';
    document.getElementById('amount-value').textContent = '0';

    document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('selected'));
    document.getElementById('minor-cat-container').classList.add('hidden');

    updateSaveButtonState();
}

function updateSaveButtonState() {
    const btn = document.getElementById('save-btn');
    if (!btn) return;

    if (transactionQueue.length > 0) {
        btn.textContent = `保存 (${transactionQueue.length})`;
        btn.style.background = '#ff9800'; // Orange
    } else {
        btn.textContent = '保存';
        btn.style.background = ''; // Default
    }
}

function sendBatch() {
    if (transactionQueue.length === 0) {
        return;
    }

    const btn = document.getElementById('save-btn');
    if (btn.disabled) return;

    btn.textContent = '保存中...';
    btn.disabled = true;
    btn.style.background = '#9e9e9e';

    if (isMock) {
        // Mock Save logic...
    } else {
        if (editingTransactionId) {
            // Update
            if (transactionQueue.length > 0) {
                const t = transactionQueue[0];
                if (!t.id) t.id = editingTransactionId;
                callApi('updateTransaction', { transaction: t })
                    .then(res => {
                        if (res.success) {
                            btn.disabled = false;
                            closeModal();
                            loadTransactions();
                        } else {
                            alert('保存失敗: ' + (res.error || '不明'));
                            btn.disabled = false;
                            updateSaveButtonState();
                        }
                    });
            }
        } else {
            // Batch Add
            callApi('addTransactions', { transactions: transactionQueue })
                .then(res => {
                    if (res.success) {
                        btn.disabled = false;
                        transactionQueue = [];
                        updateSaveButtonState();
                        closeModal();
                        loadTransactions();
                    } else {
                        alert('保存失敗: ' + (res.error || '不明'));
                        btn.disabled = false;
                        updateSaveButtonState();
                    }
                });
        }
    }
}

// Utils
function changeMonth(delta) {
    currentMonth.setMonth(currentMonth.getMonth() + delta);
    updateMonthDisplay();
    loadTransactions();
}

function updateMonthDisplay() {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth() + 1;
    document.getElementById('current-month-display').textContent = `${y}年${m}月`;
}

function formatDate(d) {
    return d.toISOString().split('T')[0];
}

function getCategoryColor(name) {
    const c = categories.find(cat => cat.name === name);
    return c ? c.color : '#999';
}

function getCategoryIcon(name) {
    const c = categories.find(cat => cat.name === name);
    return (c && c.icon) ? c.icon : 'category';
}

function openModal() {
    // Reset to default state
    editingTransactionId = null;
    currentAmount = '0';
    document.getElementById('amount-value').textContent = '0';
    document.getElementById('input-note').value = '';
    document.getElementById('input-date').valueAsDate = new Date();

    currentCategory = null;
    currentSubCategory = null;
    renderCategories();
    renderSubCategories(null);

    document.querySelectorAll('.type-btn').forEach(btn => {
        if (btn.dataset.type === 'Expense') btn.classList.add('active');
        else btn.classList.remove('active');
    });
    currentType = 'Expense';

    document.getElementById('btn-mode-continuous').classList.remove('hidden');
    document.getElementById('btn-mode-delete').classList.add('hidden');
    document.getElementById('save-btn').textContent = '保存';
    document.getElementById('save-btn').style.background = ''; // Default

    document.getElementById('input-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('input-modal').classList.add('hidden');
    currentAmount = '0';
    document.getElementById('amount-value').textContent = '0';
    document.getElementById('btn-mode-continuous').classList.remove('hidden');
    document.getElementById('btn-mode-delete').classList.add('hidden');
    document.getElementById('save-btn').textContent = '保存';
    document.getElementById('save-btn').style.background = '';
    editingTransactionId = null;
    transactionQueue = [];
    updateSaveButtonState();
}

function openMenu() {
    document.getElementById('side-menu').classList.remove('hidden');
    document.getElementById('menu-overlay').classList.remove('hidden');
}

function closeMenu() {
    document.getElementById('side-menu').classList.add('hidden');
    document.getElementById('menu-overlay').classList.add('hidden');
}

function deleteTransaction() {
    if (!editingTransactionId) return;
    const btn = document.getElementById('btn-mode-delete');
    btn.disabled = true;
    btn.textContent = '削除中...';

    callApi('deleteTransaction', { id: editingTransactionId })
        .then(res => {
            btn.disabled = false;
            btn.textContent = '削除';
            if (res.success) {
                closeModal();
                loadTransactions();
            } else {
                alert('削除失敗: ' + res.error);
            }
        });
}
