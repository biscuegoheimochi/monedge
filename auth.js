/**
 * auth.js
 * Handles frontend password protection and authentication state.
 */

const Auth = {
    STORAGE_KEY: 'kakeibo_auth_token',

    // Check if user is authenticated
    check: function () {
        const token = localStorage.getItem(this.STORAGE_KEY);
        if (!token) {
            this.showLoginModal();
            return false;
        }
        return true;
    },

    // Get the current token (password)
    getToken: function () {
        return localStorage.getItem(this.STORAGE_KEY);
    },

    // Save token
    login: async function (password) {
        // Here we verify against server "login" action
        try {
            const btn = document.getElementById('auth-login-btn');
            if (btn) {
                btn.disabled = true;
                btn.textContent = '確認中...';
            }

            const response = await callApi('login', { password: password });

            if (response.status === 'success') {
                localStorage.setItem(this.STORAGE_KEY, password);
                this.hideLoginModal();
                // Reload or trigger callback?
                // For now, we just reload to ensure everything starts fresh with auth
                location.reload();
            } else {
                alert('パスワードが間違っています');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'ログイン';
                }
            }
        } catch (e) {
            alert('認証エラー: ' + e.message);
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'ログイン';
            }
        }
    },

    logout: function () {
        localStorage.removeItem(this.STORAGE_KEY);
        location.reload();
    },

    showLoginModal: function () {
        // If modal already exists, show it
        let modal = document.getElementById('auth-modal');
        if (modal) {
            modal.classList.remove('hidden');
            return;
        }

        // Create modal
        const div = document.createElement('div');
        div.id = 'auth-modal';
        div.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); z-index: 9999;
            display: flex; justify-content: center; align-items: center;
        `;

        div.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; width: 90%; max-width: 320px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="margin-bottom: 1rem; font-size: 3rem;">🔒</div>
                <h3 style="margin-bottom: 1rem;">パスワード認証</h3>
                <p style="margin-bottom: 1.5rem; color: #666; font-size: 0.9rem;">
                    この家計簿アプリにアクセスするには<br>パスワードを入力してください
                </p>
                <input type="password" id="auth-password-input" placeholder="パスワード" 
                    style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 1rem; font-size: 1rem; outline: none;">
                <button id="auth-login-btn" 
                    style="width: 100%; padding: 12px; background: #20bf6b; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 1rem; cursor: pointer;">
                    ログイン
                </button>
            </div>
        `;

        document.body.appendChild(div);

        // Bind events
        const btn = document.getElementById('auth-login-btn');
        const input = document.getElementById('auth-password-input');

        btn.addEventListener('click', () => {
            this.login(input.value);
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.login(input.value);
            }
        });

        // Focus input
        setTimeout(() => input.focus(), 100);
    },

    hideLoginModal: function () {
        const modal = document.getElementById('auth-modal');
        if (modal) modal.classList.add('hidden');
    }
};

// Auto-check on load (if DOM is ready, else wait)
// We wait for script.js to call api, but we can verify existence early.
// However, since we reload on successful login, blocking UI is enough.
window.addEventListener('DOMContentLoaded', () => {
    // We don't force check immediately here because we want to allow 'script.js' 
    // to init. But if we want to BLOCK viewing, we should check.
    // Let's check.
    Auth.check();
});
