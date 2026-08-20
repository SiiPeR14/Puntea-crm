// ===========================================================
// PUNTEA — Control de acceso (Admins)
// ===========================================================

// Lista de emails autorizados (admins)
const ADMINS = [
    "sergi@puntea.app",
    "adam@puntea.app"
    // Añade aquí más emails de admins cuando los crees
];

// Verificar si el usuario actual es admin
function isAdminUser() {
    const user = firebase.auth().currentUser;
    
    if (!user) {
        return false;
    }
    
    return ADMINS.includes(user.email);
}

// Redirigir si no es admin
function requireAdmin() {
    return new Promise((resolve, reject) => {
        firebase.auth().onAuthStateChanged((user) => {
            if (!user) {
                window.location.href = 'login.html';
                reject(new Error('No autenticado'));
                return;
            }
            
            if (!ADMINS.includes(user.email)) {
                // Usuario no autorizado
                window.location.href = 'acceso-denegado.html';
                reject(new Error('Acceso denegado'));
                return;
            }
            
            // Usuario autorizado
            resolve(user);
        });
    });
}