'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('error-message');

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = registerForm.username.value.trim();
        const password = registerForm.password.value.trim();

        if (username === '' || password === '') {
            errorMessage.textContent = 'ユーザー名とパスワードを入力してください。';
            return;
        }

        if (username.length < 3) {
            errorMessage.textContent = 'ユーザー名は3文字以上で入力してください。';
            return;
        }

        if (password.length < 6) {
            errorMessage.textContent = 'パスワードは6文字以上で入力してください。';
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // 登録成功
                errorMessage.textContent = '';
                
                // トークンとユーザー情報を保存
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                
                alert('ユーザー登録が完了しました！ゲーム画面に進みます。');
                window.location.href = 'index.html';
            } else {
                // 登録失敗
                errorMessage.textContent = data.error || '登録に失敗しました。';
            }
        } catch (error) {
            console.error('Registration error:', error);
            errorMessage.textContent = 'ネットワークエラーが発生しました。';
        }
    });
});