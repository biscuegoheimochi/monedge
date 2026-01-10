
// -- Statistics Logic --

// Configuration
const API_URL = "YOUR_GAS_DEPLOY_URL"; // TO BE REPLACED

// State
let currentStatsMonth = new Date();
let statsChart = null;
let trendsChart = null;
let activeFilters = {};
let focusedMajor = null;
let allCategories = [];
let assetChart = null;
let assetGroupBy = 'type';
let assetDataCache = null;
let assetCategories = null;

// Helper API
async function callApi(action, payload = {}) {
    try {
        const url = new URL(API_URL);
        url.searchParams.append('action', action);

        const body = JSON.stringify({
            action: action,
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


document.addEventListener('DOMContentLoaded', () => {
    setupStatsHandlers();
    updateStatsMonthDisplay();
    loadStatistics();
});

function setupStatsHandlers() {
    // Navigation & FABs
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

    // Menu Links
    const navAssets = document.getElementById('nav-assets');
    if (navAssets) {
        navAssets.addEventListener('click', () => {
            window.location.href = 'assets.html';
        });
    }

    const navArch = document.getElementById('nav-archive');
    if (navArch) {
        navArch.addEventListener('click', () => {
            window.location.href = 'archive.html';
        });
    }

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;

            // Toggle Buttons
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            // Toggle Views
            if (tab === 'breakdown') {
                document.getElementById('view-breakdown').classList.remove('hidden');
                document.getElementById('view-trends').classList.add('hidden');
            } else if (tab === 'trends') {
                document.getElementById('view-breakdown').classList.add('hidden');
                document.getElementById('view-trends').classList.remove('hidden');

                // Load both charts
                loadTrends();
                loadAssetCategoriesAndTrends();
            }
        });
    });

    // Month Navigation (Only for Breakdown)
    document.getElementById('prev-month').addEventListener('click', () => {
        if (!document.getElementById('view-breakdown').classList.contains('hidden')) {
            currentStatsMonth.setMonth(currentStatsMonth.getMonth() - 1);
            updateStatsMonthDisplay();
            loadStatistics();
        }
    });
    document.getElementById('next-month').addEventListener('click', () => {
        if (!document.getElementById('view-breakdown').classList.contains('hidden')) {
            currentStatsMonth.setMonth(currentStatsMonth.getMonth() + 1);
            updateStatsMonthDisplay();
            loadStatistics();
        }
    });

    // Toggle Asset Group Buttons
    const btnType = document.getElementById('btn-asset-group-type');
    if (btnType) btnType.addEventListener('click', () => {
        assetGroupBy = 'type';
        toggleAssetBtns();
        renderAssetTrendsChart();
    });
    const btnHolder = document.getElementById('btn-asset-group-holder');
    if (btnHolder) btnHolder.addEventListener('click', () => {
        assetGroupBy = 'holder';
        toggleAssetBtns();
        renderAssetTrendsChart();
    });
}

function updateStatsMonthDisplay() {
    const y = currentStatsMonth.getFullYear();
    const m = currentStatsMonth.getMonth() + 1;
    document.getElementById('current-month-display').textContent = `${y}年${m}月`;
}

// --- Breakdown Logic ---
function loadStatistics() {
    const y = currentStatsMonth.getFullYear();
    const m = (currentStatsMonth.getMonth() + 1).toString().padStart(2, '0');
    const monthStr = `${y}-${m}`;

    callApi('getTransactions', { month: monthStr })
        .then(response => {
            if (response.status === 'success') {
                // response.data from new API is the array directly
                const transactions = response.data;
                renderPieChart(transactions);
            } else {
                alert('データ取得エラー: ' + (response.message || response.error));
            }
        })
        .catch(err => {
            alert('通信エラー: ' + err.message);
        });
}

function renderPieChart(transactions) {
    const ctx = document.getElementById('breakdownChart').getContext('2d');

    // Filter Expenses
    const expenses = transactions.filter(t => t.type === 'Expense');

    // Aggregate by Category
    const totals = {};
    expenses.forEach(t => {
        const cat = t.category || '未分類';
        totals[cat] = (totals[cat] || 0) + Number(t.amount);
    });

    const labels = Object.keys(totals);
    const data = labels.map(l => Math.abs(totals[l]));

    // Palette
    const palette = {
        '食費': '#ff6b6b',
        '日用品': '#f7b731',
        '生活': '#a3cb38',
        '交通費': '#45b7d1',
        '娯楽': '#ff9ff3',
        '教養': '#2d98da',
        '固定費': '#8854d0',
        '資産形成': '#20bf6b'
    };
    const defaultColor = '#95a5a6';

    const bgColors = labels.map(l => palette[l] || defaultColor);

    // Update Center Text
    const totalAmount = data.reduce((sum, val) => sum + val, 0);
    const totalEl = document.getElementById('breakdown-total');
    if (totalEl) {
        totalEl.textContent = '¥' + totalAmount.toLocaleString();
    }

    if (statsChart) {
        statsChart.destroy();
    }

    if (data.length === 0) {
        statsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['データなし'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#f1f3f5']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { position: 'bottom' }, tooltip: { enabled: false } }
            }
        });
        return;
    }

    statsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { family: "'Inter', sans-serif" },
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(context.parsed);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}


// --- Trends Logic ---
function fetchCategories(callback) {
    if (allCategories.length > 0) {
        if (callback) callback();
        return;
    }
    console.log('[Statistics] Fetching categories...');
    callApi('getCategories')
        .then(response => {
            if (response.status === 'success') {
                allCategories = response.data;
                renderTrendsFilters();
                if (callback) callback();
            } else {
                console.error('[Statistics] Fetch Categories Error:', response);
            }
        })
        .catch(err => console.error('[Statistics] Fetch Categories Error:', err));
}

function loadTrends() {
    console.log('[Statistics] Loading trends...');
    fetchCategories(() => {
        console.log('[Statistics] Categories ready. Fetching trends data...');
        callApi('getTrendsData', { months: 6 })
            .then(response => {
                if (response.status === 'success') {
                    // New API returns data object directly if constructed properly?
                    // Code.js getTrendsData returns raw array/object structure?
                    // Let's assume response.data is the transactions list or trends structure.
                    // Wait, getTrendsData actually returned raw transactions in previous version? Or summary?
                    // Original Code.js: return data based on getTransactions logic, so likely List of transactions.
                    const transactions = response.data;
                    window.trendsTransactions = transactions;
                    renderTrendsChart(transactions);
                } else {
                    console.error('[Statistics] Trends Backend Error:', response.message);
                    alert('データ取得エラー: ' + response.message);
                }
            })
            .catch(err => {
                console.error('[Statistics] Trends Network Error:', err);
                alert('通信エラー: ' + err.message);
            });
    });
}

function renderTrendsFilters() {
    const container = document.getElementById('trends-filter-container');
    if (!container) return;

    container.innerHTML = `
        <div style="margin-top:20px;">
            <div id="trends-major-list" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px;"></div>
            <div id="trends-sub-container" class="${focusedMajor ? '' : 'hidden'}" style="padding-top:8px; border-top:1px solid #eee;">
                <div id="trends-sub-list" style="display:flex; flex-wrap:wrap; gap:8px;"></div>
            </div>
        </div>
    `;

    const majorList = document.getElementById('trends-major-list');
    const subList = document.getElementById('trends-sub-list');

    const majors = allCategories.filter(c => !c.parent && c.type === 'Expense');
    const allMajors = allCategories.filter(c => !c.parent);

    allMajors.forEach(cat => {
        const pill = document.createElement('div');
        pill.className = 'category-pill';

        const isSelected = activeFilters[cat.name];
        const isFocused = focusedMajor === cat.name;

        if (isSelected) {
            pill.style.background = cat.color + '20';
            pill.style.border = `1px solid ${cat.color}`;
            pill.innerHTML = `<div class="category-dot" style="background:${cat.color}"></div>${cat.name}`;
        } else {
            pill.style.background = '#f1f3f5';
            pill.style.border = '1px solid transparent';
            pill.innerHTML = `<div class="category-dot" style="background:${cat.color}"></div>${cat.name}`;
        }

        if (isFocused) {
            pill.style.fontWeight = 'bold';
        }

        pill.addEventListener('click', () => toggleMajorFilter(cat));
        majorList.appendChild(pill);
    });

    if (focusedMajor) {
        const subs = allCategories.filter(c => c.parent === focusedMajor);
        if (subs.length === 0) {
            subList.innerHTML = '<span style="color:#aaa; font-size:0.9rem;">小カテゴリなし</span>';
        } else {
            subs.forEach(cat => {
                const pill = document.createElement('div');
                pill.className = 'category-pill';

                const majorSet = activeFilters[focusedMajor];
                const isSelected = majorSet && majorSet.has(cat.name);

                if (isSelected) {
                    pill.style.background = cat.color + '20';
                    pill.style.border = `1px solid ${cat.color}`;
                    pill.innerHTML = `<div class="category-dot" style="background:${cat.color}"></div>${cat.name}`;
                } else {
                    pill.style.background = '#f1f3f5';
                    pill.style.border = '1px solid transparent';
                    pill.innerHTML = `<div class="category-dot" style="background:${cat.color}"></div>${cat.name}`;
                }

                pill.addEventListener('click', () => toggleSubFilter(cat));
                subList.appendChild(pill);
            });
        }
    } else {
        subList.style.display = 'none';
    }
}

function toggleMajorFilter(cat) {
    if (activeFilters[cat.name]) {
        delete activeFilters[cat.name];
        if (focusedMajor === cat.name) {
            focusedMajor = null;
        }
    } else {
        focusedMajor = cat.name;
        const subs = allCategories.filter(c => c.parent === cat.name);
        const subSet = new Set(subs.map(s => s.name));
        activeFilters[cat.name] = subSet;
    }

    renderTrendsFilters();
    if (window.trendsTransactions) {
        renderTrendsChart(window.trendsTransactions);
    }
}

function toggleSubFilter(subCat) {
    const majorName = subCat.parent;
    if (!activeFilters[majorName]) {
        activeFilters[majorName] = new Set([subCat.name]);
    } else {
        const set = activeFilters[majorName];
        if (set.has(subCat.name)) {
            set.delete(subCat.name);
            if (set.size === 0) {
                delete activeFilters[majorName];
            }
        } else {
            set.add(subCat.name);
        }
    }

    renderTrendsFilters();
    if (window.trendsTransactions) {
        renderTrendsChart(window.trendsTransactions);
    }
}

function renderTrendsChart(transactions) {
    console.log('[Statistics] Rendering Trends Chart. Data size:', transactions.length);
    const canvas = document.getElementById('trends-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const isFiltering = Object.keys(activeFilters).length > 0;

    const filteredTransactions = isFiltering ? transactions.filter(t => {
        const major = t.category;
        const sub = t.subCategory;

        if (!activeFilters[major]) return false;

        const subSet = activeFilters[major];
        if (sub && subSet.size > 0) {
            return subSet.has(sub);
        }
        if (!sub) return true;
        return false;
    }) : transactions;

    const labels = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        labels.push(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
    }

    const datasetsMap = {};

    const getCatColor = (name) => {
        const c = allCategories.find(cat => cat.name === name);
        return c ? c.color : '#95a5a6';
    };

    filteredTransactions.forEach(t => {
        const dateObj = new Date(t.date);
        const ym = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthIndex = labels.indexOf(ym);

        if (monthIndex === -1) return;

        const cat = t.category || 'その他';
        if (!datasetsMap[cat]) {
            datasetsMap[cat] = new Array(6).fill(0);
        }

        let val = Number(t.amount);
        if (t.type === 'Expense') val = -Math.abs(val);
        else if (t.type === 'Income') val = Math.abs(val);

        datasetsMap[cat][monthIndex] += val;
    });

    const datasets = Object.keys(datasetsMap).map(cat => {
        return {
            label: cat,
            data: datasetsMap[cat],
            backgroundColor: getCatColor(cat),
            stack: 'Stack 0',
        };
    });

    if (trendsChart) {
        trendsChart.destroy();
    }

    trendsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            layout: { padding: { top: 30 } },
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, beginAtZero: true, grace: '10%', grid: { borderDash: [2, 4] } }
            },
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 16 } },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        },
        plugins: [{
            id: 'topLabels',
            afterDatasetsDraw(chart, args, pluginOptions) {
                const { ctx, scales: { x, y } } = chart;
                const totals = new Array(chart.data.labels.length).fill(0);
                chart.data.datasets.forEach(dataset => {
                    dataset.data.forEach((val, i) => {
                        totals[i] += val;
                    });
                });

                ctx.save();
                ctx.font = 'bold 10px Inter';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#666';

                totals.forEach((total, index) => {
                    const xPos = x.getPixelForValue(index);
                    let positiveSum = 0;
                    let negativeSum = 0;
                    chart.data.datasets.forEach(d => {
                        const v = d.data[index];
                        if (v > 0) positiveSum += v;
                        else negativeSum += v;
                    });

                    let yPos;
                    if (total >= 0) {
                        yPos = y.getPixelForValue(positiveSum) - 5;
                    } else {
                        yPos = y.getPixelForValue(negativeSum) + 15;
                    }

                    if (yPos < 10) yPos = 10;
                    ctx.fillText('¥' + total.toLocaleString(), xPos, yPos);
                });
                ctx.restore();
            }
        }]
    });
}
// --- Asset Trends Logic ---

function loadAssetCategoriesAndTrends() {
    callApi('getAssetCategories')
        .then(res => {
            if (res.status === 'success') {
                assetCategories = res.data;
            }
            loadAssetTrends();
        })
        .catch(err => {
            console.error('Category Load Fail:', err);
            loadAssetTrends();
        });
}

function loadAssetTrends() {
    console.log('[Statistics] Loading asset trends...');
    callApi('getAssetTrends', { months: 6 })
        .then(response => {
            if (response.status === 'success') {
                // response.data is the trends object?
                // GAS getAssetTrends returns JSON string?
                // Old Code.js: return ContentService.createTextOutput(JSON.stringify(result));
                // So response.data in fetch API return is likely the object itself if we parsed JSON in callApi.
                // However, user modified Code.js to return JSON object? 
                // Let's assume parsed object.
                const parsedData = response.data;
                assetDataCache = parsedData;
                renderAssetTrendsChart();
            } else {
                console.error('[Statistics] Asset Trends Error:', response.message);
            }
        })
        .catch(err => console.error('[Statistics] Asset Trends Failed:', err));
}

function toggleAssetBtns() {
    if (assetGroupBy === 'type') {
        document.getElementById('btn-asset-group-type').classList.add('active');
        document.getElementById('btn-asset-group-type').style.background = ''; // default primary
        document.getElementById('btn-asset-group-type').style.color = '';

        document.getElementById('btn-asset-group-holder').classList.remove('active');
        document.getElementById('btn-asset-group-holder').style.background = '#ddd';
        document.getElementById('btn-asset-group-holder').style.color = '#666';
    } else {
        document.getElementById('btn-asset-group-holder').classList.add('active');
        document.getElementById('btn-asset-group-holder').style.background = '';
        document.getElementById('btn-asset-group-holder').style.color = '';

        document.getElementById('btn-asset-group-type').classList.remove('active');
        document.getElementById('btn-asset-group-type').style.background = '#ddd';
        document.getElementById('btn-asset-group-type').style.color = '#666';
    }
}

function renderAssetTrendsChart() {
    if (!assetDataCache) return;
    const ctx = document.getElementById('asset-trends-chart');
    if (!ctx) return;

    if (assetChart) {
        assetChart.destroy();
    }

    const labels = assetDataCache.months;
    const accountsData = assetDataCache.datasets;

    const groupData = {};
    const groups = new Set();

    const getGroupKey = (acc) => {
        if (assetGroupBy === 'type') return acc.type;
        return acc.holder || '未分類';
    };

    accountsData.forEach(acc => {
        const key = getGroupKey(acc);
        groups.add(key);
        if (!groupData[key]) {
            groupData[key] = new Array(labels.length).fill(0);
        }

        acc.values.forEach((val, colIndex) => {
            let amount = Number(val);
            if (acc.type === 'Liability' && amount > 0) {
                amount = -amount;
            }
            groupData[key][colIndex] += amount;
        });
    });

    const groupList = Array.from(groups);

    const typeColors = {
        'Deposit': '#4cd137', 'Cash': '#fbc531', 'Stock': '#e84118', 'Trust': '#00a8ff',
        'Pension': '#9c88ff', 'Crypto': '#f5cd79', 'Points': '#f2f2f2', 'Liability': '#7f8fa6'
    };
    const holderColors = {
        '自分': '#3498db', '家': '#2ecc71', '配偶者': '#e74c3c', '共通': '#9b59b6',
        'Other': '#95a5a6'
    };

    const datasets = groupList.map(g => {
        let color;
        if (assetGroupBy === 'type') {
            if (assetCategories) {
                const cat = assetCategories.find(c => c.name === g);
                color = cat ? cat.color : (typeColors[g] || '#ccc');
            } else {
                color = typeColors[g] || '#ccc';
            }
        } else {
            color = holderColors[g] || '#7f8fa6';
        }

        return {
            label: g,
            data: groupData[g],
            backgroundColor: color,
            fill: true
        };
    });

    assetChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { stacked: true },
                x: { grid: { display: false } }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}
