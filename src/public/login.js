'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = loginForm.username.value.trim();
        const password = loginForm.password.value.trim();

        if (username === '' || password === '') {
            errorMessage.textContent = 'ユーザー名とパスワードを入力してください。';
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // ログイン成功
                errorMessage.textContent = '';
                
                // トークンとユーザー情報を保存
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                
                alert('ログイン成功！ゲーム画面に進みます。');
                window.location.href = 'index.html';
            } else {
                // ログイン失敗
                errorMessage.textContent = data.error || 'ログインに失敗しました。';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = 'ネットワークエラーが発生しました。';
        }
    });
});