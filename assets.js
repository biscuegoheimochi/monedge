
/* 
 * Assets Page Logic 
 */

// Configuration (Must match what is in script.js or be passed in)
// Ideally, reuse the same configuration method. For now, we define it here too or assume global.
// Configuration (Loaded from config.js)
// const API_URL = ... ; // Removed local definition

// State
let accounts = [];
let assetCategories = []; // Loaded from server
let currentDate = new Date();
let currentAssetType = 'Asset'; // For modal
let currentHistoryAccountId = null;

// Helper for API usage (similar to script.js)
async function callApi(action, payload = {}) {
    try {
        const url = new URL(CONFIG.API_URL);
        url.searchParams.append('action', action);

        const body = JSON.stringify({
            action: action,
            password: Auth.getToken(),
            ...payload
        });

        const response = await fetch(url.toString(), {
            method: 'POST',
            body: body,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error("API Call Failed", e);
        throw e;
    }
}


// Init
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Initializing Assets Page...');

        // 1. Setup Navigation & Buttons first
        const updateBtn = document.getElementById('update-all-btn');
        if (updateBtn) updateBtn.addEventListener('click', saveSnapshot);

        const addBtn = document.getElementById('add-account-btn');
        if (addBtn) {
            addBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent bubbling
                document.getElementById('history-modal').classList.add('hidden'); // Ensure history is closed
                document.getElementById('add-account-modal').classList.remove('hidden');
                // Reset or init selection
                renderCategoryPills(currentAssetType);
            });
        }

        const closeAddModalBtn = document.getElementById('close-add-modal');
        if (closeAddModalBtn) {
            closeAddModalBtn.addEventListener('click', () => {
                document.getElementById('add-account-modal').classList.add('hidden');
            });
        }

        const saveNewAccountBtn = document.getElementById('save-new-account');
        if (saveNewAccountBtn) {
            saveNewAccountBtn.addEventListener('click', createAccount);
        }

        // Asset Type Selector (Modal)
        const typeBtns = document.querySelectorAll('#asset-type-selector .type-btn');
        typeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                typeBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentAssetType = e.target.dataset.type;
                renderCategoryPills(currentAssetType);
            });
        });

        // 2. Setup Date Selector
        initDateSelector();

        // 3. Setup FAB & Menu
        const homeFab = document.getElementById('home-fab');
        if (homeFab) {
            homeFab.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }

        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                const menu = document.getElementById('side-menu');
                const overlay = document.getElementById('menu-overlay');
                if (menu) menu.classList.remove('hidden');
                if (overlay) overlay.classList.remove('hidden');
            });
        }

        const menuOverlay = document.getElementById('menu-overlay');
        if (menuOverlay) {
            menuOverlay.addEventListener('click', () => {
                const menu = document.getElementById('side-menu');
                if (menu) menu.classList.add('hidden');
                menuOverlay.classList.add('hidden');
            });
        }

        const closeMenuBtn = document.getElementById('close-menu'); // Added manually if missing
        if (closeMenuBtn) {
            closeMenuBtn.addEventListener('click', () => {
                document.getElementById('side-menu').classList.add('hidden');
                document.getElementById('menu-overlay').classList.add('hidden');
            });
        }

        // History Modal Handlers
        document.getElementById('close-history-modal').addEventListener('click', () => {
            document.getElementById('history-modal').classList.add('hidden');
        });

        document.getElementById('delete-account-btn').addEventListener('click', () => {
            if (currentHistoryAccountId) handleDeleteAccount(currentHistoryAccountId);
        });

        // Menu Links
        const navStats = document.getElementById('nav-statistics');
        if (navStats) {
            navStats.addEventListener('click', () => {
                window.location.href = 'statistics.html';
            });
        }

        const navArch = document.getElementById('nav-archive');
        if (navArch) {
            navArch.addEventListener('click', () => {
                window.location.href = 'archive.html';
            });
        }

        // 4. Load Data (Categories first, then Accounts)
        loadAssetCategories();

    } catch (e) {
        alert('初期化エラー: ' + e.message);
        console.error('Init Error:', e);
    }
});

function toDateInputValue(date) {
    const local = new Date(date);
    local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return local.toJSON().slice(0, 10);
}

function initDateSelector() {
    const input = document.getElementById('snapshot-date');
    // input.valueAsDate = currentDate; // Removed for safety
    input.value = toDateInputValue(currentDate);

    input.addEventListener('change', (e) => {
        if (e.target.value) {
            currentDate = new Date(e.target.value);
        }
    });

    document.getElementById('prev-day').addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1);
        input.value = toDateInputValue(currentDate);
    });
    document.getElementById('next-day').addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 1);
        input.value = toDateInputValue(currentDate);
    });
}

function loadAccounts() {
    console.log('[Assets] Requesting accounts...');
    const container = document.getElementById('assets-list-container');
    if (container) container.innerHTML = '<div class="loading" style="text-align:center; padding:20px; color:#888;"><ion-icon name="sync-outline" class="spin"></ion-icon> Loading accounts...</div>';

    callApi('getAssetAccounts')
        .then(response => {
            console.log('[Assets] Response received:', response);
            if (response && response.status === 'success') {
                // response.data is expected to be the array directly per refactoring? 
                // Wait, in previous Code.js logic: returns {status:'success', data: accounts}
                // Check if data is string or object. Code.js previously had JSON.stringify?
                // The new Code.js uses ContentService with JSON.stringify(result).
                // If result itself was {status:..., data: accounts}, then response matches.
                // If accounts were already an object in 'data', no need for JSON.parse unless double encoded.
                // Assuming standard JSON response now.
                const accountsData = response.data; // Should handle object or string parsing if double encoded.
                renderAccounts(accountsData);
            } else {
                console.error('[Assets] Server Error:', response);
                if (container) container.innerHTML = '<div style="text-align:center; padding:20px; color:red;">読み込みエラー: データ形式が不正です</div>';
            }
        })
        .catch(err => {
            console.error('[Assets] Failed to load accounts:', err);
            if (container) container.innerHTML = '<div style="text-align:center; padding:20px; color:red;">読み込みエラー: ' + err.message + '</div>';
        });
}

function renderAccounts(accountsList) {
    // Calculate Total
    let totalNet = 0;
    if (accountsList) {
        accountsList.forEach(acc => {
            let cat = assetCategories.find(c => c.name === acc.type);
            // Fallback logic
            if (!cat) {
                if (acc.type === 'Liability') cat = { type: 'Liability' };
                else cat = { type: 'Asset' }; // Default
            }

            const val = Number(acc.latestBalance) || 0;
            if (cat.type === 'Liability') totalNet -= val;
            else totalNet += val;
        });
    }
    const totalEl = document.getElementById('total-assets-amount');
    if (totalEl) totalEl.textContent = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(totalNet);

    const container = document.getElementById('assets-list-container');
    container.innerHTML = '';

    if (!accountsList || accountsList.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:#888;">資産・負債口座が登録されていません。<br>「口座を追加」ボタンから登録してください。</div>';
        return;
    }

    // Group by Holder
    const groups = {};
    accountsList.forEach(acc => {
        const h = acc.holder || '未分類';
        if (!groups[h]) groups[h] = [];
        groups[h].push(acc);
    });

    Object.keys(groups).forEach(holder => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'asset-group';
        groupDiv.innerHTML = `<div class="asset-group-title"><ion-icon name="person-outline"></ion-icon> ${holder}</div>`;

        // Sort: Category Order -> Name
        groups[holder].sort((a, b) => {
            const idxA = assetCategories.findIndex(c => c.name === a.type);
            const idxB = assetCategories.findIndex(c => c.name === b.type);
            const realIdxA = idxA === -1 ? 999 : idxA;
            const realIdxB = idxB === -1 ? 999 : idxB;

            if (realIdxA !== realIdxB) return realIdxA - realIdxB;
            return (a.name || '').localeCompare(b.name || '');
        });

        groups[holder].forEach(acc => {
            // Find category info
            const cat = assetCategories.find(c => c.name === acc.type) || { name: acc.type, icon: 'ellipse', color: '#666' };

            const row = document.createElement('div');
            row.className = 'account-row';

            row.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px; flex:1;">
                    <div style="display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:50%; background:${cat.color}; color:white; font-size:1.2rem; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                        <ion-icon name="${cat.icon}"></ion-icon>
                    </div>
                    <div style="display:flex; flex-direction:column;">
                       <div class="account-name" style="font-size:1rem;">${acc.name}</div>
                       <div style="font-size:0.75rem; color:${cat.color}; font-weight:600;">${cat.name}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                     <div class="balance-input-container" style="width:120px; background:#f0f2f5;">
                         <span class="currency-symbol">¥</span>
                         <input type="number" class="balance-input" id="bal-${acc.id}" data-id="${acc.id}" value="${acc.latestBalance}" placeholder="0" style="color:#333; font-weight:600;"> 
                     </div>
                     <button class="save-single-btn" data-id="${acc.id}" style="background:${cat.color}; color:white; border:none; width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                        <ion-icon name="save-outline"></ion-icon>
                     </button>
                </div>
            `;
            // Add listener for single save
            row.querySelector('.save-single-btn').addEventListener('click', function (e) {
                e.stopPropagation(); // Prevent row click
                updateSingleAccount(this, this.dataset.id);
            });

            // Allow input click without triggering row
            row.querySelector('.balance-input').addEventListener('click', (e) => e.stopPropagation());

            // Row click for history
            row.addEventListener('click', () => {
                openHistoryModal(acc);
            });

            groupDiv.appendChild(row);
        });

        container.appendChild(groupDiv);
    });
}

function updateSingleAccount(btn, id) {
    const input = document.getElementById('bal-' + id);
    const val = input.value;
    if (val === '') {
        alert('金額を入力してください');
        return;
    }

    const dateEl = document.getElementById('snapshot-date');
    const dateStr = dateEl.value; // YYYY-MM-DD

    btn.disabled = true;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<ion-icon name="sync-outline" class="spin"></ion-icon>';

    callApi('saveAssetSnapshot', { dateStr: dateStr, balances: [{ accountId: id, amount: val }] })
        .then(res => {
            btn.disabled = false;
            btn.innerHTML = originalContent;
            if (res.success) {
                // Success feedback
                const oldHtml = btn.innerHTML;
                btn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon>';
                setTimeout(() => btn.innerHTML = oldHtml, 2000);
            } else {
                alert('保存エラー: ' + res.error);
            }
        })
        .catch(err => {
            btn.disabled = false;
            btn.innerHTML = originalContent;
            alert('通信エラー: ' + err.message);
        });
}

function saveSnapshot() {
    const inputs = document.querySelectorAll('.balance-input');
    const balances = [];
    let hasValue = false;

    inputs.forEach(input => {
        const val = input.value;
        if (val !== '') {
            hasValue = true;
            balances.push({
                accountId: input.dataset.id,
                amount: val
            });
        }
    });

    if (!hasValue) {
        alert('金額を入力してください');
        return;
    }

    const btn = document.getElementById('update-all-btn');
    btn.disabled = true;
    btn.innerHTML = '保存中...';

    const dateStr = document.getElementById('snapshot-date').value;

    callApi('saveAssetSnapshot', { dateStr: dateStr, balances: balances })
        .then(res => {
            btn.disabled = false;
            btn.innerHTML = '<ion-icon name="save-outline"></ion-icon> 一括更新';
            if (res.success) {
                alert('保存しました');
            } else {
                alert('保存失敗: ' + res.error);
            }
        })
        .catch(err => {
            btn.disabled = false;
            alert('通信エラー: ' + err.message);
        });
}

function createAccount() {
    const name = document.getElementById('new-acc-name').value;
    const type = document.getElementById('new-acc-category-val').value; // Category Name
    const holder = document.getElementById('new-acc-holder').value;


    if (!name) {
        alert('名前を入力してください');
        return;
    }
    if (!type) {
        alert('カテゴリを選択してください');
        return;
    }

    const btn = document.getElementById('save-new-account');
    btn.disabled = true;

    const newAccount = {
        name: name,
        type: type, // Stores the category name (e.g. 'Deposit')
        holder: holder
    };

    callApi('addAssetAccount', { account: newAccount })
        .then(res => {
            btn.disabled = false;
            if (res.success) {
                document.getElementById('add-account-modal').classList.add('hidden');
                // Reset inputs
                document.getElementById('new-acc-name').value = '';
                document.getElementById('new-acc-holder').value = '';
                loadAccounts(); // Reload
            } else {
                alert('追加エラー: ' + res.error);
            }
        })
        .catch(err => {
            btn.disabled = false;
            alert('通信エラー: ' + err.message);
        });
}

// --- Category Logic ---
function loadAssetCategories() {
    callApi('getAssetCategories')
        .then(res => {
            if (res.status === 'success') {
                assetCategories = res.data; // Assuming direct array/object
                loadAccounts();
            } else {
                console.error('Category Load Error:', res);
                loadAccounts(); // Proceed even if fails
            }
        })
        .catch(err => {
            console.error('Category Load Fail:', err);
            loadAccounts();
        });
}

function renderCategoryPills(type) {
    const container = document.getElementById('asset-category-list');
    container.innerHTML = '';
    if (!assetCategories) return;

    const filtered = assetCategories.filter(c => c.type === type);
    filtered.forEach(c => {
        const pill = document.createElement('div');
        pill.className = 'category-pill';
        pill.innerHTML = `<div class="category-dot" data-origin-color="${c.color}" style="background:${c.color}"></div> ${c.name}`;

        pill.onclick = () => {
            document.querySelectorAll('#asset-category-list .category-pill').forEach(p => {
                p.classList.remove('active');
                p.style.background = '#ffffff';
                p.style.color = '';
                p.style.borderColor = '#eee';
                const d = p.querySelector('.category-dot');
                if (d) d.style.background = d.dataset.originColor;
            });
            pill.classList.add('active');
            pill.style.background = c.color;
            pill.style.color = 'white';
            pill.style.borderColor = c.color;
            const d = pill.querySelector('.category-dot');
            if (d) d.style.background = 'white';

            document.getElementById('new-acc-category-val').value = c.name;
        };
        container.appendChild(pill);
    });
}

// --- History Logic ---

function openHistoryModal(account) {
    currentHistoryAccountId = account.id;
    document.getElementById('history-account-name').textContent = account.name;
    document.getElementById('history-account-type').textContent = account.type + ' / ' + account.holder;

    document.getElementById('add-account-modal').classList.add('hidden'); // Ensure add modal is closed
    document.getElementById('history-modal').classList.remove('hidden');
    loadAssetHistory(account.id);
}

function loadAssetHistory(accountId) {
    const list = document.getElementById('history-list');
    list.innerHTML = '<div style="text-align:center; padding:20px; color:#888;"><ion-icon name="sync-outline" class="spin"></ion-icon> Loading history...</div>';

    callApi('getAssetHistory', { accountId: accountId })
        .then(res => {
            if (res.status === 'success') {
                renderHistory(res.data);
            } else {
                list.innerHTML = '<div style="text-align:center; color:red;">エラー: ' + res.error + '</div>';
            }
        })
        .catch(err => {
            list.innerHTML = '<div style="text-align:center; color:red;">通信エラー</div>';
        });
}

function renderHistory(history) {
    const list = document.getElementById('history-list');
    list.innerHTML = '';

    if (!history || history.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">履歴がありません</div>';
        return;
    }

    history.forEach(rec => {
        const item = document.createElement('div');
        item.className = 'history-item';

        const dateStr = rec.date; // YYYY-MM-DD
        const amountStr = Number(rec.amount).toLocaleString();

        item.innerHTML = `
            <div class="history-info">
                <div class="history-date">${dateStr}</div>
                <div class="history-amount">¥${amountStr}</div>
            </div>
            <div class="history-actions">
                <button class="action-btn edit"><ion-icon name="create-outline"></ion-icon></button>
                <button class="action-btn delete"><ion-icon name="trash-outline"></ion-icon></button>
            </div>
        `;

        // Handlers
        item.querySelector('.edit').addEventListener('click', () => {
            const newAmount = prompt('金額を修正してください', rec.amount);
            if (newAmount !== null && newAmount !== '') {
                // Date editing optional? User might want to edit date.
                // For now ask simple amount.
                updateHistoryRecord(rec.id, dateStr, newAmount);
            }
        });

        item.querySelector('.delete').addEventListener('click', () => {
            if (confirm('この履歴を削除しますか？')) {
                deleteHistoryRecord(rec.id);
            }
        });

        list.appendChild(item);
    });
}

function updateHistoryRecord(id, date, amount) {
    callApi('updateAssetHistory', { recordId: id, date: date, amount: amount })
        .then(res => {
            if (res.success) {
                loadAssetHistory(currentHistoryAccountId);
                // Also reload main accounts to reflect latest balance if changed
                loadAccounts();
            } else {
                alert('更新失敗: ' + res.error);
            }
        });
}

function deleteHistoryRecord(id) {
    callApi('deleteAssetHistory', { recordId: id })
        .then(res => {
            if (res.success) {
                loadAssetHistory(currentHistoryAccountId);
                loadAccounts();
            } else {
                alert('削除失敗: ' + res.error);
            }
        });
}

function handleDeleteAccount(accountId) {
    if (confirm('本当にこの口座を削除しますか？\n関連するすべての履歴も削除されます。\nこの操作は取り消せません。')) {
        const btn = document.getElementById('delete-account-btn');
        btn.disabled = true;
        btn.textContent = '削除中...';

        callApi('deleteAssetAccount', { accountId: accountId })
            .then(res => {
                btn.disabled = false;
                btn.innerHTML = '<ion-icon name="trash-outline"></ion-icon> この口座を削除';

                if (res.success) {
                    document.getElementById('history-modal').classList.add('hidden');
                    loadAccounts();
                    alert('口座を削除しました');
                } else {
                    alert('削除失敗: ' + res.error);
                }
            })
            .catch(err => {
                btn.disabled = false;
                btn.innerHTML = '<ion-icon name="trash-outline"></ion-icon> この口座を削除';
                alert('通信エラー');
            });
    }
}
