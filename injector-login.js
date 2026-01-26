// injector-login.js
(function() {
    const DEFAULT_ADMIN = { 
        email: 'tonaco92@gmail.com', 
        password: '12345678', 
        role: 'admin' 
    };
    
    // Guardar admin por defecto
    if (!localStorage.getItem('user_' + DEFAULT_ADMIN.email)) {
        localStorage.setItem('user_' + DEFAULT_ADMIN.email, JSON.stringify(DEFAULT_ADMIN));
    }
    
    window.loginUser = function(email, password) {
        const userData = localStorage.getItem('user_' + email);
        if (!userData) return { success: false, message: 'Usuario no encontrado' };
        
        const user = JSON.parse(userData);
        if (user.password !== password) return { success: false, message: 'Contraseña incorrecta' };
        
        window.currentUser = user;
        
        // Si es admin, añadir botón de administración
        if (user.role === 'admin') {
            const headerInfo = document.querySelector('.header-info');
            if (headerInfo && !document.getElementById('adminButton')) {
                const adminBtn = document.createElement('button');
                adminBtn.id = 'adminButton';
                adminBtn.className = 'btn btn-sm';
                adminBtn.textContent = '⚙️ Admin';
                adminBtn.onclick = () => window.openAdminPanel();
                headerInfo.appendChild(adminBtn);
            }
        }
        
        return { success: true, user };
    };
    
    // Auto-login para testing (comentar en producción)
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.loginUser(DEFAULT_ADMIN.email, DEFAULT_ADMIN.password);
        }, 1000);
    });
})();
