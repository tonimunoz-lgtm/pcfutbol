// injector-login.js
(function() {
    const DEFAULT_ADMIN = { email: 'tonaco92@gmail.com', password: '12345678', role: 'admin' };
    if (!localStorage.getItem('user_' + DEFAULT_ADMIN.email)) {
        localStorage.setItem('user_' + DEFAULT_ADMIN.email, JSON.stringify(DEFAULT_ADMIN));
    }

    window.loginUser = function(email, password) {
        const userData = localStorage.getItem('user_' + email);
        if (!userData) return { success: false, message: 'Usuario no encontrado' };
        const user = JSON.parse(userData);
        if (user.password !== password) return { success: false, message: 'Contraseña incorrecta' };
        window.currentUser = user; // variable global para saber quién está logueado
        if (user.role === 'admin') {
            const adminMenu = document.createElement('li');
            adminMenu.innerHTML = `<a href="#" onclick="window.openAdminPanel()">Administrar</a>`;
            const infoMenu = document.querySelector('#menuInformacion ul');
            if (infoMenu && !document.querySelector('#menuInformacion li.admin')) {
                adminMenu.classList.add('admin');
                infoMenu.appendChild(adminMenu);
            }
        }
        return { success: true, user };
    };
})();
