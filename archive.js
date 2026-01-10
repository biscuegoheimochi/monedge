
// -- Archive Logic --

// Configuration
const API_URL = "https://script.google.com/macros/s/AKfycbz9swpCcYyiAeOUT6uRudRHAoJXaVjf6FwoIRzsfDg644pY84H5Lxmh0RkPdDy89m8JPw/exec"; // TO BE REPLACED

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
    setupHandlers();
});

function setupHandlers() {
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

    const closeMenuBtn = document.getElementById('close-menu');
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', () => {
            document.getElementById('side-menu').classList.add('hidden');
            document.getElementById('menu-overlay').classList.add('hidden');
        });
    }

    const navAssets = document.getElementById('nav-assets');
    if (navAssets) {
        navAssets.addEventListener('click', () => {
            window.location.href = 'assets.html';
        });
    }

    const navStats = document.getElementById('nav-statistics');
    if (navStats) {
        navStats.addEventListener('click', () => {
            window.location.href = 'statistics.html';
        });
    }

    const archiveBtn = document.getElementById('exec-archive-btn');
    if (archiveBtn) {
        archiveBtn.addEventListener('click', executeArchive);
    }
}

function executeArchive() {
    const btn = document.getElementById('exec-archive-btn');
    const statusEl = document.getElementById('status-message');

    btn.disabled = true;
    btn.textContent = '処理中...';
    statusEl.textContent = '';
    statusEl.className = 'status-message'; // reset

    callApi('archiveOldTransactions')
        .then(result => {
            btn.disabled = false;
            btn.textContent = '過去データをアーカイブ';

            if (result.success) {
                if (result.count > 0) {
                    statusEl.textContent = result.message;
                    statusEl.classList.add('success');
                } else {
                    statusEl.textContent = result.message; // "No need"
                    statusEl.classList.add('info');
                }
            } else {
                statusEl.textContent = 'エラー: ' + (result.message || result.error);
                statusEl.classList.add('error');
            }
        })
        .catch(err => {
            btn.disabled = false;
            btn.textContent = '過去データをアーカイブ';
            statusEl.textContent = '通信エラー: ' + err.message;
            statusEl.classList.add('error');
        });
}


