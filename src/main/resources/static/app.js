/* --- 1. API CONFIGURATION UPDATED --- */
/* --- 1. API CONFIGURATION UPDATED --- */
const API_BASE = "http://localhost:8080/api";
// ✅ CORRECTION : On pointe vers la racine du serveur, car l'image contient déjà "uploads/"
const UPLOADS_BASE_URL = "http://localhost:8080/";

const ENDPOINTS = {
    // Existing User Routes
    LOGIN: `${API_BASE}/users/login`,
    REGISTER: `${API_BASE}/users/register`,
    PROFILE: `${API_BASE}/users/profile`,
    verifyUser: `${API_BASE}/users/verify`, // Often needed for verification code
    
    // --- MISSING ROUTES (FIX FOR 404 ERROR) ---
    RESET_REQ: `${API_BASE}/users/reset-password/request`, 
    RESET_CONFIRM: `${API_BASE}/users/reset-password/confirm`,
    VERIFY: `${API_BASE}/users/verify`,
    
    // Admin Specific Routes
    ADMIN_STATS: `${API_BASE}/admin/stats`,
    ADMIN_USERS: `${API_BASE}/users/all`,
    ADMIN_ORDERS: `${API_BASE}/payment/history`,
    ADMIN_DELETE_BIKE: `${API_BASE}/admin/delete`,
    
    // Resource Routes
    BIKES: `${API_BASE}/bikes`,
    ACCESSORIES: `${API_BASE}/accessories`,
    RENTALS: `${API_BASE}/rentals`,
    REVIEWS: `${API_BASE}/reviews`, // Often needed for reviews
    WAITING_LIST: `${API_BASE}/waiting-list`,
    PAYMENT_INTENT: `${API_BASE}/payment/create-payment-intent`,
    SUBSCRIPTION: `${API_BASE}/users/subscribe`,
    SUPPORT: `${API_BASE}/support/contact`
};

/* --- 2. API SERVICE --- */
const API = {
    async post(url, data) {
        try {
            const r = await fetch(url, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
            if(r.status === 409) throw new Error("This email is already used or conflict detected.");
            if(r.status === 403) throw new Error("Unauthorized action.");
            if(!r.ok) { 
                const errText = await r.text(); 
                throw new Error(errText || "Server Error"); 
            }
            const text = await r.text();
            try { return JSON.parse(text); } catch(e) { return { message: text }; }
        } catch(e) { throw e; }
    },

    async get(url) { 
        try { 
            const r = await fetch(url); 
            if(!r.ok) return []; 
            return await r.json(); 
        } catch(e) { return []; } 
    },

    async put(url, data) { 
        const r = await fetch(url, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }); 
        if(!r.ok) throw new Error("Update Error"); 
        return await r.json(); 
    },
    
    login: (e, p) => API.post(`${ENDPOINTS.LOGIN}?email=${encodeURIComponent(e)}&password=${encodeURIComponent(p)}`, {}),
    register: (d) => API.post(ENDPOINTS.REGISTER, d),
    verifyUser: (email, code) => API.post(ENDPOINTS.VERIFY, { email: email, code: code }),
    
    requestResetCode: (email) => API.post(`${ENDPOINTS.RESET_REQ}?email=${encodeURIComponent(email)}`, {}),
    confirmResetPassword: (email, code, newPass) => API.post(ENDPOINTS.RESET_CONFIRM, {email: email, code: code, newPassword: newPass}),
    updateProfile: (d) => API.put(ENDPOINTS.PROFILE, d),
	
	getWaitingList: (bikeId) => API.get(`${API_BASE}/waiting-list/bike/${bikeId}`),
    createBike: (d) => API.post(ENDPOINTS.BIKES, d),
    createRental: (d) => API.post(ENDPOINTS.RENTALS, d),
    createPaymentIntent: (amount) => API.post(ENDPOINTS.PAYMENT_INTENT, { amount: amount }),
    
    getUserRentals: (email) => API.get(`${ENDPOINTS.RENTALS}/user/${email}`),
    getBikeRentals: (bikeId) => API.get(`${ENDPOINTS.RENTALS}/bike/${bikeId}`),
    returnRental: (id) => API.post(`${ENDPOINTS.RENTALS}/${id}/return`, {}),
   fetchAllBikes: () => API.get(`${ENDPOINTS.BIKES}`),
   fetchAllAccessories: () => API.get(`${ENDPOINTS.ACCESSORIES}`),
    joinWaitingList: (email, bikeId) => API.post(ENDPOINTS.WAITING_LIST, { email: email, bikeId: bikeId }),
fetchAllOrders: () => API.get(ENDPOINTS.ADMIN_ORDERS),
fetchAdminStats: () => API.get(ENDPOINTS.ADMIN_STATS),
    getReviews: (bikeId) => API.get(`${ENDPOINTS.REVIEWS}/${bikeId}`),
  fetchAllUsers: () => API.get(ENDPOINTS.ADMIN_USERS),
    addReview: (data) => API.post(`${ENDPOINTS.REVIEWS}/add`, data),
	subscribeUser: (email, plan) => API.post(ENDPOINTS.SUBSCRIPTION, { email, plan }),
	toggleUserBan: (userId) => API.put(`${API_BASE}/users/${userId}/toggle-ban`, {}),
	    processProposal: (id, status, price) => API.put(`${API_BASE}/bikes/proposals/${id}`, { status, salePrice: price }),
		buyAccessoryItem: (id) => API.post(`${ENDPOINTS.ACCESSORIES}/buy/${id}`, {}),
	sendSupportMessage: (data) => API.post(ENDPOINTS.SUPPORT, data)
};

/* --- 3. APP CONTROLLER --- */
const App = {
    user: null, cart: [], products: [], accessories: [], tempImg: null, editImg: null, 
    currentRental: { bike: null, days: 1, delivery: false, rentalPrice: 0, deposit: 200, totalToPay: 0, address: '', startDate: '', endDate: '' },
    existingRentalsForBike: [], 
    filters: { type: 'ALL', sort: 'ASC', search: '' }, 
    stripe: null, elements: null,
	ollamaUrl: "http://localhost:11434/api/chat", // Ollama default URL
	chatHistory: [],
	userSearch: '',
	userFilter: 'ALL', 
	// On récupère les filtres sauvegardés OU on met les défauts
	    fleetFilter: JSON.parse(sessionStorage.getItem('gb_fleet_filter')) || { type: 'ALL', owner: 'ALL', search: '', mode: 'RENT' },

	// Ajoutez cette petite fonction pour changer le filtre et rafraîchir :

    
	currency: 'EUR',
	currencyRates: { EUR: 1 },
    currencySymbols: { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF' },
	async init() {
	        // 1. Initialiser Stripe (optionnel, erreur HTTPS non critique en localhost)
	        try { 
	            this.stripe = Stripe("pk_test_51SiiMUDc47zz6AkfsSZd137MfKx455JFMvsjMJXn77AMoHOPwBs0FUPmhbG9ua0yZEPxV4LVUBjR0cYD3TymdLGm00KYaDseCG"); 
	        } catch(e) { console.warn("Stripe not loaded"); }
			
			await this.fetchRates();
	        
	        // 2. RÉCUPÉRER LA SESSION UTILISATEUR (C'est ici la correction)
	        const sess = sessionStorage.getItem('gb_sess');
	        if (sess) { 
	            try { 
	                this.user = JSON.parse(sess); 
	            } catch(e) { 
	                sessionStorage.clear(); 
	                this.user = null;
	            } 
	        }

	        const savedCart = sessionStorage.getItem('gb_cart');
	        if(savedCart) this.cart = JSON.parse(savedCart);
	        
	        this.updateCartBadge();
	        this.setupEvents();

	        // 3. CHARGER LES DONNÉES (Attendre que ce soit fini)
	        await this.loadDataFromDB();
	        
	        // 4. CHARGER L'INTERFACE (Seulement maintenant)
			this.loadSessionUI();
	    },
	// --- CURRENCY FUNCTIONS ---
	    
	    async fetchRates() {
	        try {
	            const r = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CHF');
	            const data = await r.json();
	            this.currencyRates = { EUR: 1, ...data.rates };
	        } catch (e) { console.log("Currency API Error, default to EUR mode"); }
	    },

	    getCurrencySelectorHTML() {
	        return `
	        <select class="form-select form-select-sm bg-dark text-white border-0" style="width:auto; display:inline-block;" onchange="App.changeCurrency(this.value)">
	            <option value="EUR" ${this.currency==='EUR'?'selected':''}>€ EUR</option>
	            <option value="USD" ${this.currency==='USD'?'selected':''}>$ USD</option>
	            <option value="GBP" ${this.currency==='GBP'?'selected':''}>£ GBP</option>
	            <option value="CHF" ${this.currency==='CHF'?'selected':''}>CHF</option>
	        </select>`;
	    },

	    changeCurrency(curr) {
	        this.currency = curr;
	        this.updateCartBadge(); // Update total in header
	        const activeView = document.querySelector('.nav-item.active')?.dataset.view;
	        if(activeView) this.nav(activeView); // Reload current page
	        if(document.getElementById('cart-offcanvas').classList.contains('show')) this.openCart(); // Reload cart if open
	    },

		async loadDataFromDB() {
		        try {
		            const [bikesData, accData] = await Promise.all([API.fetchAllBikes(), API.fetchAllAccessories()]);
		            this.products = bikesData.filter(b => b.status !== 'DELETED' && b.status !== 'SOLD');
		            this.accessories = accData;
		            
		            if(this.user && this.isAdminUser()) {
		                const [usersData, ordersData] = await Promise.all([API.fetchAllUsers(), API.fetchAllOrders()]);
		                this.users = usersData;
		                this.orders = ordersData;
		            }
		        } catch (e) { 
		            console.error("API Error:", e); 
		        }
		        // NOTE: Pas de navigation forcée ici ! Elle se fait dans login() ou init()
		    },
    setupEvents() {
        // Event delegation for dynamic buttons
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('.nav-item, [data-view]');
            if (link && link.id !== 'btn-logout' && link.dataset.view) {
                e.preventDefault();
                this.nav(link.dataset.view);
            }
        });
        
        const loginForm = document.getElementById('loginForm'); 
        if(loginForm) loginForm.onsubmit = async (e) => { 
            e.preventDefault(); 
            const btn = loginForm.querySelector('button'); if(btn) btn.disabled = true;
            try { 
                const u = await API.login(document.getElementById('loginId').value, document.getElementById('loginPass').value); 
                this.login(u); 
            } catch (err) { 
                Swal.fire('Error', "Incorrect credentials.", 'error'); 
                if(btn) btn.disabled = false;
            } 
        };

        const regForm = document.getElementById('registerForm'); 
        if(regForm) regForm.onsubmit = async (e) => { 
            e.preventDefault(); 
            const email = document.getElementById('regEmail').value;
            const btn = regForm.querySelector('button'); if(btn) btn.disabled = true;
            try { 
                const form = { username: document.getElementById('regName').value, email: email, password: document.getElementById('regPass').value, firstName: "User", lastName: "" }; 
                await API.register(form); 
                
                const { value: code } = await Swal.fire({
                    title: 'Verification',
                    html: `<p>A code has been sent to <b>${email}</b></p><input id="v-code" class="form-control text-center fs-4" placeholder="123456" maxlength="6">`,
                    preConfirm: () => document.getElementById('v-code').value
                });

                if(code) {
                    await API.verifyUser(email, code);
                    Swal.fire('Success', 'Account verified!', 'success'); 
                    this.toggleAuth(); 
                }
            } catch (err) { Swal.fire('Error', err.message || "Registration error.", 'error'); } 
            finally { if(btn) btn.disabled = false; }
        };
        
		const resetForm = document.getElementById('resetForm'); 
		        if(resetForm) resetForm.onsubmit = async (e) => {
		            e.preventDefault();
		            const email = document.getElementById('resetEmail').value;
		            
		            // On désactive le bouton pour éviter le double-clic
		            const btn = resetForm.querySelector('button');
		            if(btn) { btn.disabled = true; btn.innerText = "Sending..."; }

		            try {
		                // 1. Demande du code au serveur
		                await API.requestResetCode(email);
		                
		                // 2. Affichage de la modale de saisie (Code + Nouveau MDP)
		                const { value: formValues } = await Swal.fire({
		                    title: 'Code Sent',
		                    text: `Please check your email: ${email}`,
		                    html: `
		                        <input id="swal-code" class="form-control mb-3 text-center fs-4" placeholder="123456" maxlength="6">
		                        <input id="swal-pass" type="password" class="form-control" placeholder="New Password">
		                    `,
		                    focusConfirm: false,
		                    showCancelButton: true,
		                    confirmButtonText: 'Reset Password',
		                    preConfirm: () => {
		                        const code = document.getElementById('swal-code').value;
		                        const pass = document.getElementById('swal-pass').value;
		                        if (!code || !pass) {
		                            Swal.showValidationMessage('Please enter both code and password');
		                            return false;
		                        }
		                        return [code, pass];
		                    }
		                });

		                // 3. Si l'utilisateur a validé
		                if (formValues) {
		                    await API.confirmResetPassword(email, formValues[0], formValues[1]);
		                    
		                    await Swal.fire({
		                        icon: 'success',
		                        title: 'Success',
		                        text: 'Password changed successfully! You can now login.',
		                        timer: 3000,
		                        showConfirmButton: false
		                    });

		                    // 4. Retour à l'écran de connexion
		                    this.toggleReset(); // Cache le formulaire reset et montre le login
		                }

		            } catch (err) { 
		                Swal.fire('Error', err.message || "Failed to send code", 'error'); 
		            } finally {
		                // Réactivation du bouton
		                if(btn) { btn.disabled = false; btn.innerText = "Send Reset Link"; }
		            }
		        };

        const btnLogout = document.getElementById('btn-logout'); if(btnLogout) btnLogout.onclick = () => { sessionStorage.clear(); location.reload(); };
        
        const fileInput = document.getElementById('l-file'); if(fileInput) fileInput.onchange = (e) => { const reader = new FileReader(); reader.onload = () => { this.tempImg = reader.result; }; reader.readAsDataURL(e.target.files[0]); };
        
        // --- 1. INFO AUTO-FILL MANAGEMENT (SWITCH) ---
        const useProfileSwitch = document.getElementById('use-profile-info');
        if(useProfileSwitch) {
            useProfileSwitch.onchange = (e) => {
                if (e.target.checked) {
                    document.getElementById('l-phone').value = this.user.phone || '';
                    document.getElementById('l-iban').value = this.user.iban || '';
                } else {
                    document.getElementById('l-phone').value = '';
                    document.getElementById('l-iban').value = '';
                }
            };
        }

        // --- 2. LISTING PUBLICATION LOGIC (ADMIN/UNIVERSITY) with VALIDATION & REGEX ---
        const listingForm = document.getElementById('form-listing');
        if(listingForm) listingForm.onsubmit = async (e) => {
            e.preventDefault();

            // Validation Regex
            const phoneInput = document.getElementById('l-phone');
            const ibanInput = document.getElementById('l-iban');
            const phoneVal = phoneInput.value.replace(/\s/g, ''); 
            const ibanVal = ibanInput.value.replace(/\s/g, '').toUpperCase();

            // Regex France
            const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/; 
            const ibanRegex = /^FR\d{2}[A-Z0-9]{23}$/; 

            let isValid = true;

            // Check Phone
            if (!phoneRegex.test(phoneVal)) {
                document.getElementById('err-phone').style.display = 'block';
                phoneInput.classList.add('is-invalid');
                isValid = false;
            } else {
                document.getElementById('err-phone').style.display = 'none';
                phoneInput.classList.remove('is-invalid');
            }

            // Check IBAN
            if (!ibanRegex.test(ibanVal)) {
                document.getElementById('err-iban').style.display = 'block';
                ibanInput.classList.add('is-invalid');
                isValid = false;
            } else {
                document.getElementById('err-iban').style.display = 'none';
                ibanInput.classList.remove('is-invalid');
            }

            if (!isValid) return; // Stop if invalid
            if (!this.tempImg) return Swal.fire('Error', 'Image required', 'error');

            // Save Profile (if checked)
            const saveInfo = document.getElementById('save-listing-info').checked;
            if (saveInfo) {
                try {
                    const updatedUser = await API.updateProfile({
                        email: this.user.email,
                        phone: phoneVal,
                        iban: ibanVal
                    });
                    this.login({ ...this.user, ...updatedUser }); 
                } catch (err) { console.error("Error saving profile", err); }
            }

            bootstrap.Modal.getInstance(document.getElementById('modal-listing')).hide();
            
            const p = parseFloat(document.getElementById('l-price').value);
            const b = { 
                model: document.getElementById('l-model').value, 
                type: document.getElementById('l-power').value === 'ELEC' ? 'Electrique' : 'Mécanique', 
                price: p, 
                image: this.tempImg, 
                description: `Proposed by ${this.user.username}. Contact: ${phoneVal}`, 
                ownerName: this.user.username, 
                status: "AVAILABLE", 
                rentCount: 0, 
                forSale: false // Default = Renting for university
            };
            this.triggerPayment('LISTING', 2.00, b);
        };
    },
	isAdminUser() {
	    if (!this.user) return false;
	    const r = this.user.role; 
	    const rs = this.user.roles; // Support pour tableaux
	    // Vérifie "ADMIN", "ROLE_ADMIN", "admin", ou dans un tableau
	    if (typeof r === 'string' && (r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'ROLE_ADMIN')) return true;
	    if (Array.isArray(rs) && (rs.includes('ADMIN') || rs.includes('ROLE_ADMIN'))) return true;
	    return false;
	},
	
	logout() {
	        // 1. Supprimer les données de session
	        sessionStorage.removeItem('gb_sess');
	        sessionStorage.removeItem('gb_last_view'); // On oublie la dernière page vue
	        this.user = null;

	        // 2. Cacher tous les modules d'application
	        document.getElementById('admin-module').classList.add('d-none');
	        document.getElementById('app-module').classList.add('d-none');

	        // 3. Afficher le module de login
	        document.getElementById('auth-module').classList.remove('d-none');
	        
	        // 4. Réinitialiser les formulaires ET LE BOUTON
	        const loginForm = document.getElementById('loginForm');
	        if(loginForm) {
	            loginForm.reset();
	            // CORRECTION ICI : On réactive le bouton de soumission
	            const btn = loginForm.querySelector('button');
	            if(btn) btn.disabled = false;
	        }

	        // 5. Feedback visuel
	        Swal.fire({
	            toast: true,
	            icon: 'success',
	            title: 'Logged out successfully',
	            position: 'top-end',
	            timer: 2000,
	            showConfirmButton: false
	        });
	    },

	async login(u) { 
	    this.user = u; 
	    sessionStorage.setItem('gb_sess', JSON.stringify(u)); 
	    
	    // On attend que les données (Users, Orders) soient chargées
	    await this.loadDataFromDB(); 
	    
	    // Une fois chargé, on affiche l'interface
	    this.loadSessionUI(); 
	},
    
	loadSessionUI() { 
	        // Fonction de sécurité : ne plante pas si l'ID n'existe pas dans le HTML
	        const safeToggle = (id, action) => {
	            const el = document.getElementById(id);
	            if (el) {
	                if (action === 'show') el.classList.remove('d-none');
	                else el.classList.add('d-none');
	            }
	        };
			if (!this.user) {
			                safeToggle('auth-module', 'show');
			                safeToggle('app-module', 'hide');
			                safeToggle('admin-module', 'hide');
			                return;
			            }

	        // 1. Cacher l'écran de connexion
	        safeToggle('auth-module', 'hide');
	        
	        // 2. Détection du rôle
	        const role = this.user.role;
	        const roles = this.user.roles;
	        const isAdmin = (typeof role === 'string' && (role.toUpperCase() === 'ADMIN' || role.toUpperCase() === 'ROLE_ADMIN')) || 
	                        (Array.isArray(roles) && (roles.includes('ADMIN') || roles.includes('ROLE_ADMIN')));

	        // --- CAS ADMIN ---
	        if (isAdmin) {
	            safeToggle('app-module', 'hide'); // Cacher interface client
	            
	            const adminMod = document.getElementById('admin-module');
	            if (adminMod) {
	                adminMod.classList.remove('d-none');
	                
	                // === CORRECTION : RESTAURATION DE LA DERNIÈRE VUE ===
	                const lastView = sessionStorage.getItem('gb_last_view');
	                // Si on a une vue sauvegardée et qu'elle commence par 'admin-', on y retourne
	                if (lastView && lastView.startsWith('admin-')) {
	                    this.nav(lastView); 
	                } else {
	                    this.renderAdminDashboard(); // Sinon, dashboard par défaut
	                }
	                // ====================================================
	            } else {
	                console.error("ERREUR CRITIQUE : <div id='admin-module'> introuvable");
	            }
	            return; // On arrête là pour l'admin
	        }

	        // --- CAS CLIENT (Membre ou Externe) ---
	        safeToggle('admin-module', 'hide');
	        safeToggle('app-module', 'show'); // Afficher interface client
	        
	        // Affichage Infos Utilisateur
	        const badgePro = this.user.isPro ? '<span class="badge bg-warning text-dark ms-2"><i class="fas fa-crown"></i> PRO</span>' : '';
	        const userDisplay = document.getElementById('user-display');
	        if (userDisplay) userDisplay.innerHTML = `${this.user.username} ${badgePro}`;
	        
	        const roleDisplay = document.getElementById('role-display');
	        if (roleDisplay) roleDisplay.innerText = 'Membre';

	        // Gestion Menu Admin
	        const menuAdmin = document.getElementById('menu-admin');
	        if(menuAdmin) menuAdmin.classList.add('d-none'); 

	        // Variables contextuelles
	        const isGustave = this.user.email.endsWith('@edu.univ-eiffel.fr');

	        // Bouton Devenir Pro
	        const containerPro = document.getElementById('pro-btn-container');
	        if(containerPro) {
	            containerPro.innerHTML = '';
	            if (isGustave && !this.user.isPro) {
	                const btn = document.createElement('button');
	                btn.className = 'btn btn-warning btn-sm fw-bold shadow-sm animate__animated animate__fadeIn';
	                btn.innerHTML = '<i class="fas fa-crown me-1"></i> Devenir Pro';
	                btn.onclick = () => this.nav('subscription');
	                containerPro.appendChild(btn);
	            }
	        }

	        // Éléments de navigation
	        const navRent = document.querySelector('[data-view="rent"]');
	        const navListings = document.querySelector('[data-view="listings"]');
	        const navRentals = document.querySelector('[data-view="my-rentals"]');
			const menu = document.querySelector('.nav-content:not(#menu-admin)');
			        if (menu && !menu.querySelector('[data-view="profile"]')) {
			            const profileLink = document.createElement('a');
			            profileLink.href = "#";
			            profileLink.className = "nav-item";
			            profileLink.dataset.view = "profile";
			            profileLink.innerHTML = '<i class="fas fa-user-circle me-2"></i> My Profile';
			            
			            // Insérer en premier dans le menu
			            menu.insertBefore(profileLink, menu.firstChild);
			        }
					
					if (menu && !menu.querySelector('[data-view="support"]')) {
					    const supportLink = document.createElement('a');
					    supportLink.href = "#";
					    supportLink.className = "nav-item";
					    supportLink.dataset.view = "support";
					    // Tu peux changer l'icône si tu veux (ex: fa-headset, fa-envelope)
					    supportLink.innerHTML = '<i class="fas fa-life-ring me-2"></i> Support';
					    
					    // On l'ajoute à la fin du menu
					    menu.appendChild(supportLink);
					}

	        // === CORRECTION : RÉCUPÉRATION VUE CLIENT ===
	        const lastView = sessionStorage.getItem('gb_last_view');
	        // ============================================

	        if (isGustave) {
	            // -- ÉTUDIANT INTERNE --
	            if(navRent) navRent.classList.remove('d-none');
	            if(navListings) navListings.classList.remove('d-none');
	            if(navRentals) navRentals.classList.remove('d-none');
	            
	            const sellBtn = document.getElementById('btn-sell-gustave');
	            if(sellBtn) sellBtn.classList.add('d-none');
	            
	            // Restauration ou défaut 'rent'
	            if (lastView && !lastView.startsWith('admin-')) this.nav(lastView);
	            else this.nav('rent'); 

	        } else {
	            // -- VISITEUR EXTERNE --
	            if(navRent) navRent.classList.add('d-none');
	            if(navListings) navListings.classList.add('d-none');
	            if(navRentals) navRentals.classList.add('d-none');
	            
	            const menu = document.querySelector('.nav-content:not(#menu-admin)');
	            if(menu && !document.getElementById('btn-sell-gustave')) {
	                menu.insertAdjacentHTML('beforeend', `
	                    <div id="external-seller-menu">
	                        <div class="nav-label mt-3">Seller</div>
	                        <a href="#" class="nav-item" id="btn-sell-gustave" data-view="sell-proposal"><i class="fa-solid fa-hand-holding-dollar"></i> Selling a bike</a>
	                        <a href="#" class="nav-item" id="btn-my-proposals" data-view="my-proposals"><i class="fa-solid fa-list-check"></i> Offer tracking</a>
	                    </div>
	                `);
	            }
	            
	            // Restauration ou défaut 'buy'
	            if (lastView && !lastView.startsWith('admin-')) this.nav(lastView);
	            else this.nav('buy'); 
	        }
	    },
    toggleAuth() { document.getElementById('login-container').classList.toggle('d-none'); document.getElementById('register-container').classList.toggle('d-none'); document.getElementById('reset-container').classList.add('d-none'); },
    toggleReset() { document.getElementById('login-container').classList.toggle('d-none'); document.getElementById('reset-container').classList.toggle('d-none'); },

	nav(view) {
	        if (!view) return;

	        // --- CORRECTION : SAUVEGARDE DE LA VUE ACTUELLE ---
	        sessionStorage.setItem('gb_last_view', view);
	        // --------------------------------------------------

	        // 1. Nettoyage global de la classe 'active'
	        document.querySelectorAll('.nav-item, .admin-nav-item').forEach(el => {
	            el.classList.remove('active');
	        });

	        // 2. Ciblage précis du lien cliqué
	        const activeLink = document.querySelector(`[data-view="${view}"], [onclick*="'${view}'"]`);
	        if (activeLink) {
	            activeLink.classList.add('active');
	        }

	        // 3. Logique de rendu
	        const c = document.getElementById('views-container');
	        
	        // Cas Admin
	        if (view.startsWith('admin-')) {
	            if (view === 'admin-dash') this.renderAdminDashboard();
	            else if (view === 'admin-users') this.renderAdminUsers();
	            else if (view === 'admin-bikes') this.renderAdminBikes();
	            else if (view === 'admin-offers') this.renderAdminOffers();
				else if (view === 'admin-acc') this.renderAdminAccessories();
	            return; 
	        }

	        // Cas Client
	        if (c) {
	            c.innerHTML = '';
	            const title = document.getElementById('page-title');
				const titles = { 
				                rent: 'Rent', 
				                buy: 'Buy', 
				                acc: 'Accessories', 
				                listings: 'My Listings', 
				                'my-rentals': 'My Rentals', 
				                profile: 'Profile', 
				                inbox: 'Assistant', 
				                support: 'Support',
				                'sell-proposal': 'Sell my Bike',      // <--- English
				                'my-proposals': 'Track my Offers'     // <--- English
				            };
	            if (title) title.innerText = titles[view] || 'Home';

	            if (view === 'rent') this.renderRent(c);
	            else if (view === 'listings') this.renderListings(c);
	            else if (view === 'my-rentals') this.renderMyRentals(c);
	            else if (view === 'profile') this.renderProfile(c);
	            else if (view === 'acc') this.renderAcc(c);
	            else if (view === 'buy') this.renderBuy(c);
	            else if (view === 'inbox') this.renderInbox(c);
	            else if (view === 'support') this.renderSupport(c);
	            else if (view === 'subscription') this.renderSubscription(c);
				else if (view === 'sell-proposal') this.renderSellProposal(c);
			 else if (view === 'my-proposals') this.renderMyProposals(c);
				
	        }
	    },
		// --- ADMIN: ACCESSORIES MANAGEMENT ---
		    async renderAdminAccessories() {
		        const c = document.getElementById('admin-content');
		        if(!c) return;
		        document.getElementById('admin-page-title').innerText = "Accessories Stock";

		        // 1. Refresh Data
		        try {
		            this.accessories = await API.fetchAllAccessories();
		        } catch(e) { console.error("Acc fetch error", e); }

		        // Helper Image
		        const getImg = (url) => (url && !url.startsWith('http') && !url.startsWith('data:')) ? UPLOADS_BASE_URL + url : (url || 'https://via.placeholder.com/150');

		        // 2. HTML Injection
		        c.innerHTML = `
		            <div class="animate__animated animate__fadeIn">
		                <div class="d-flex justify-content-between align-items-center mb-4 bg-dark p-3 rounded shadow border border-secondary">
		                    <div>
		                        <h5 class="text-white m-0">Inventory</h5>
		                        <small class="text-muted">${this.accessories.length} items available</small>
		                    </div>
		                    <button class="btn btn-warning fw-bold shadow-sm" onclick="App.openAccessoryModal()">
		                        <i class="fas fa-plus me-2"></i> New Accessory
		                    </button>
		                </div>

		                ${this.accessories.length === 0 ? 
		                    '<div class="text-center text-muted py-5">No accessories in stock.</div>' : 
		                    `<div class="row row-cols-1 row-cols-md-3 row-cols-xl-4 g-4">
		                        ${this.accessories.map(a => `
		                            <div class="col">
		                                <div class="card h-100 bg-dark border border-secondary text-white shadow-sm hover-effect">
		                                    <div class="position-relative bg-white bg-opacity-10 d-flex align-items-center justify-content-center" style="height: 180px; overflow: hidden;">
		                                        <span class="badge bg-info text-dark position-absolute top-0 start-0 m-2 shadow-sm">${a.category || 'General'}</span>
		                                        <img src="${getImg(a.image)}" class="mw-100 mh-100" style="object-fit:contain;">
		                                    </div>
		                                    <div class="card-body d-flex flex-column">
		                                        <h6 class="fw-bold text-truncate mb-1" title="${a.name}">${a.name}</h6>
		                                        <p class="small text-muted mb-3 text-truncate" style="max-height:40px;">${a.description || 'No description'}</p>
		                                        
		                                        <div class="mt-auto d-flex justify-content-between align-items-center pt-3 border-top border-secondary">
		                                            <span class="text-success fw-bold fs-5">${a.price} €</span>
		                                            <div>
		                                                <button class="btn btn-sm btn-outline-light border-0 me-1" onclick="App.openAccessoryModal(${a.id})" title="Edit">
		                                                    <i class="fas fa-edit"></i>
		                                                </button>
		                                                <button class="btn btn-sm btn-outline-danger border-0" onclick="App.deleteAccessory(${a.id})" title="Delete">
		                                                    <i class="fas fa-trash"></i>
		                                                </button>
		                                            </div>
		                                        </div>
		                                    </div>
		                                </div>
		                            </div>
		                        `).join('')}
		                    </div>`
		                }
		            </div>
		        `;
		    },
	// --- MODULES DE RENDU ADMIN ---

	    async renderAdminDashboard() {
	        const c = document.getElementById('admin-content');
	        if(!c) return;
	        document.getElementById('admin-page-title').innerText = "Dashboard Overview";

	        // 1. Data Loading (Ensure orders are loaded for calculation)
	        if (!this.orders || this.orders.length === 0) {
	            try { this.orders = await API.fetchAllOrders(); } catch(e) { this.orders = []; }
	        }

	        // 2. Data Calculation
	        const usersCount = this.users?.length || 0;
	        const totalBikes = this.products.length;
	        const bikesRented = this.products.filter(b => b.status === 'RENTED').length;
	        const bikesAvailable = this.products.filter(b => b.status === 'AVAILABLE').length;
	        const pendingOffers = this.products.filter(p => p.status === 'PROPOSAL').length;

	        // Calculate Initial Total Revenue (All sources)
			// Calculate Initial Total Revenue (All sources)
			// CORRECTION ICI : on utilise 'b.amount' et non 'b.totalAmount'
			const initialRevenue = this.orders ? this.orders.reduce((a, b) => a + (b.amount || 0), 0) : 0;

	        // 3. HTML Injection
	        c.innerHTML = `
	            <div class="animate__animated animate__fadeIn">
	                
	                <div class="row g-4 mb-5">
	                    <div class="col-md-3">
	                        <div class="card border-0 shadow-lg text-white h-100" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); border-radius: 15px;">
	                            <div class="card-body p-4 d-flex flex-column justify-content-between">
	                                <div>
	                                    <div class="d-flex justify-content-between align-items-start">
	                                        <h6 class="text-white-50 text-uppercase small fw-bold mb-2">Revenue</h6>
	                                        <div class="dropdown">
	                                            <button class="btn btn-sm btn-link text-white p-0" type="button" data-bs-toggle="dropdown" title="Filter Revenue">
	                                                <i class="fas fa-filter"></i>
	                                            </button>
	                                            <ul class="dropdown-menu dropdown-menu-dark shadow small">
	                                                <li><a class="dropdown-item active" href="#" onclick="App.updateDashboardRevenue('ALL', this)">All Sources</a></li>
	                                                <li><a class="dropdown-item" href="#" onclick="App.updateDashboardRevenue('RENTAL', this)">Rentals</a></li>
	                                                <li><a class="dropdown-item" href="#" onclick="App.updateDashboardRevenue('SALE', this)">Sales (Bike/Acc)</a></li>
	                                                <li><a class="dropdown-item" href="#" onclick="App.updateDashboardRevenue('SUBSCRIPTION', this)">Subscriptions</a></li>
	                                            </ul>
	                                        </div>
	                                    </div>
	                                    <h2 class="fw-bold mb-0" id="dash-revenue-display">${initialRevenue.toFixed(2)} €</h2>
	                                    <small class="text-white-50" id="dash-revenue-label">Total Earnings</small>
	                                </div>
	                                <div class="mt-3 text-end"><i class="fas fa-wallet fa-2x text-white-50"></i></div>
	                            </div>
	                        </div>
	                    </div>

	                    <div class="col-md-3">
	                        <div class="card border-0 shadow-lg text-white h-100" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 15px;">
	                            <div class="card-body p-4 d-flex flex-column justify-content-between">
	                                <div>
	                                    <h6 class="text-white-50 text-uppercase small fw-bold mb-2">Community</h6>
	                                    <h2 class="fw-bold mb-0">${usersCount} <small class="fs-6">Users</small></h2>
	                                </div>
	                                <div class="mt-3 text-end"><i class="fas fa-users fa-2x text-white-50"></i></div>
	                            </div>
	                        </div>
	                    </div>

	                    <div class="col-md-3">
	                        <div class="card border-0 shadow-lg text-white h-100" style="background: #222; border-radius: 15px; border-left: 5px solid #ffc107;">
	                            <div class="card-body p-4">
	                                <h6 class="text-muted text-uppercase small fw-bold mb-3">Fleet Status</h6>
	                                <div class="d-flex justify-content-between mb-2">
	                                    <span><i class="fas fa-bicycle text-success me-2"></i>Available</span>
	                                    <span class="fw-bold">${bikesAvailable}</span>
	                                </div>
	                                <div class="d-flex justify-content-between">
	                                    <span><i class="fas fa-clock text-warning me-2"></i>Rented</span>
	                                    <span class="fw-bold">${bikesRented}</span>
	                                </div>
	                            </div>
	                        </div>
	                    </div>

	                    <div class="col-md-3">
	                        <div class="card border-0 shadow-lg bg-dark text-white h-100" style="border-radius: 15px; border: 1px solid #444;">
	                            <div class="card-body p-4 text-center">
	                                <h6 class="text-muted text-uppercase small fw-bold mb-3">Pending Actions</h6>
	                                <button class="btn btn-outline-light w-100 py-2 position-relative" onclick="App.nav('admin-offers')">
	                                    <i class="fas fa-inbox me-2"></i> Seller Proposals
	                                    ${pendingOffers > 0 ? `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">${pendingOffers}</span>` : ''}
	                                </button>
	                            </div>
	                        </div>
	                    </div>
	                </div>

	                <div class="row g-4">
	                    <div class="col-lg-8">
	                        <div class="card bg-dark border-0 shadow-sm text-white" style="border-radius: 15px;">
	                            <div class="card-header bg-transparent border-secondary py-3">
	                                <h6 class="m-0 fw-bold"><i class="fas fa-chart-pie me-2 text-info"></i> Fleet Distribution</h6>
	                            </div>
	                            <div class="card-body" style="height: 300px; position: relative;">
	                                <canvas id="dashboardChart"></canvas>
	                            </div>
	                        </div>
	                    </div>

	                    <div class="col-lg-4">
	                        <div class="card bg-dark border-0 shadow-sm text-white h-100" style="border-radius: 15px;">
	                            <div class="card-header bg-transparent border-secondary py-3">
	                                <h6 class="m-0 fw-bold"><i class="fas fa-bolt me-2 text-warning"></i> Quick Actions</h6>
	                            </div>
	                            <div class="card-body d-flex flex-column gap-3">
	                                <button class="btn btn-dark border-secondary text-start p-3 hover-effect" onclick="App.openAddBikeModal()">
	                                    <div class="d-flex align-items-center">
	                                        <div class="bg-success bg-opacity-25 p-2 rounded me-3 text-success"><i class="fas fa-plus"></i></div>
	                                        <div>
	                                            <div class="fw-bold">Add New Bike</div>
	                                            <div class="small text-muted">Expand the official fleet</div>
	                                        </div>
	                                    </div>
	                                </button>
	                                
	                                <button class="btn btn-dark border-secondary text-start p-3 hover-effect" onclick="App.nav('admin-users')">
	                                    <div class="d-flex align-items-center">
	                                        <div class="bg-info bg-opacity-25 p-2 rounded me-3 text-info"><i class="fas fa-user-shield"></i></div>
	                                        <div>
	                                            <div class="fw-bold">Manage Users</div>
	                                            <div class="small text-muted">Ban/Unban accounts</div>
	                                        </div>
	                                    </div>
	                                </button>

	                                <button class="btn btn-dark border-secondary text-start p-3 hover-effect" onclick="App.openAccessoryModal()">
	                                    <div class="d-flex align-items-center">
	                                        <div class="bg-warning bg-opacity-25 p-2 rounded me-3 text-warning"><i class="fas fa-tag"></i></div>
	                                        <div>
	                                            <div class="fw-bold">New Accessory</div>
	                                            <div class="small text-muted">Add helmet, lock...</div>
	                                        </div>
	                                    </div>
	                                </button>
	                            </div>
	                        </div>
	                    </div>
	                </div>
	            </div>
	        `;

	        // 3. Initialize Chart
	        setTimeout(() => {
	            const ctx = document.getElementById('dashboardChart');
	            if (ctx && typeof Chart !== 'undefined') {
	                if (this.dashboardChartInstance) this.dashboardChartInstance.destroy();

	                this.dashboardChartInstance = new Chart(ctx, {
	                    type: 'doughnut',
	                    data: {
	                        labels: ['Available', 'Rented', 'Maintenance'],
	                        datasets: [{
	                            data: [
	                                bikesAvailable, 
	                                bikesRented, 
	                                this.products.filter(b => b.status === 'MAINTENANCE').length
	                            ],
	                            backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
	                            borderWidth: 0
	                        }]
	                    },
	                    options: {
	                        responsive: true,
	                        maintainAspectRatio: false,
	                        plugins: {
	                            legend: { position: 'right', labels: { color: 'white' } }
	                        }
	                    }
	                });
	            }
	        }, 100);
	    },

	    // --- HELPER: REVENUE FILTERING LOGIC ---
		// --- HELPER: REVENUE FILTERING LOGIC (BASED ON INVOICE TABLE) ---
		    updateDashboardRevenue(filterType, element) {
		        // "this.orders" doit contenir la liste des factures (Invoices) récupérées de l'API
		        if (!this.orders) return;

		        // 1. Update Active Menu State (Visuel)
		        const links = element.closest('.dropdown-menu').querySelectorAll('.dropdown-item');
		        links.forEach(l => l.classList.remove('active'));
		        element.classList.add('active');

		        // 2. Calcul du Total
		        let total = 0;
		        let label = "Total Earnings";

		        // NOTE : Les types dans la BDD Java sont "RENTAL", "SALE", "SUBSCRIPTION"
		        // Le paramètre 'filterType' vient de vos boutons HTML (ALL, RENTAL, SALE, SUBSCRIPTION)

		        if (filterType === 'ALL') {
		            // On additionne tout simplement le champ 'amount' de toutes les factures
		            total = this.orders.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
		        } 
		        else {
		            // On filtre les factures où le type correspond exactement (ex: inv.type === 'RENTAL')
		            const filtered = this.orders.filter(invoice => invoice.type === filterType);
		            total = filtered.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
		            
		            // Mise à jour du texte du label pour faire joli
		            label = filterType.charAt(0).toUpperCase() + filterType.slice(1).toLowerCase() + ' Revenue';
		        }

		        // 3. Mise à jour de l'affichage
		        // On s'assure d'avoir 2 décimales (ex: 12.50 €)
		        document.getElementById('dash-revenue-display').innerText = total.toFixed(2) + " €";
		        document.getElementById('dash-revenue-label').innerText = label;
		    },
		    async openAccessoryModal(id = null) {
		        const item = id ? this.accessories.find(a => a.id === id) : null;
		        
		        const { value: formValues } = await Swal.fire({
		            title: item ? 'Edit Item' : 'New Item',
		            html: `
		                <div class="text-start">
		                    <label class="small fw-bold">Name</label>
		                    <input id="acc-name" class="form-control mb-2" value="${item ? item.name : ''}" placeholder="Product Name">
		                    
		                    <div class="row g-2 mb-2">
		                        <div class="col-6">
		                            <label class="small fw-bold">Category</label>
		                            <select id="acc-cat" class="form-select">
		                                <option value="Sécurité" ${item?.category==='Sécurité'?'selected':''}>🔒 Security</option>
		                                <option value="Protection" ${item?.category==='Protection'?'selected':''}>⛑️ Protection</option>
		                                <option value="Confort" ${item?.category==='Confort'?'selected':''}>🎒 Comfort</option>
		                                <option value="Éclairage" ${item?.category==='Éclairage'?'selected':''}>💡 Lighting</option>
		                            </select>
		                        </div>
		                        <div class="col-6">
		                            <label class="small fw-bold">Price (€)</label>
		                            <input type="number" id="acc-price" class="form-control" value="${item ? item.price : ''}" step="0.01">
		                        </div>
		                    </div>

		                    <label class="small fw-bold">Description</label>
		                    <textarea id="acc-desc" class="form-control mb-2" rows="2">${item?.description || ''}</textarea>

		                    <label class="small fw-bold">Image</label>
		                    <input type="file" id="acc-file" class="form-control" accept="image/*">
		                </div>
		            `,
		            focusConfirm: false,
		            showCancelButton: true,
		            confirmButtonText: 'Save',
		            preConfirm: () => {
		                return new Promise((resolve) => {
		                    const name = document.getElementById('acc-name').value;
		                    const price = document.getElementById('acc-price').value;
		                    const cat = document.getElementById('acc-cat').value;
		                    const desc = document.getElementById('acc-desc').value;
		                    const fileInput = document.getElementById('acc-file');

		                    if (!name || !price) { Swal.showValidationMessage('Name and Price required'); resolve(false); return; }

		                    if (fileInput.files.length > 0) {
		                        const reader = new FileReader();
		                        reader.onload = (e) => resolve({ id: item?.id, name, category: cat, price: parseFloat(price), description: desc, image: e.target.result });
		                        reader.readAsDataURL(fileInput.files[0]);
		                    } else {
		                        if (!item) { Swal.showValidationMessage('Image required'); resolve(false); }
		                        else resolve({ id: item.id, name, category: cat, price: parseFloat(price), description: desc, image: item.image });
		                    }
		                });
		            }
		        });

		        if (formValues) {
		            try {
		                // Utilisation de API.post pour envoyer vers /api/accessories
		                // Note : On utilise POST même pour l'update car Spring Data JPA save() gère les deux si l'ID est présent
		                await fetch(`${API_BASE}/accessories`, {
		                    method: 'POST',
		                    headers: {'Content-Type': 'application/json'},
		                    body: JSON.stringify(formValues)
		                });
		                
		                await Swal.fire('Saved!', '', 'success');
		                this.renderAdminAccessories(); 
		            } catch (e) { Swal.fire('Error', 'Save failed', 'error'); }
		        }
		    },

		    async deleteAccessory(id) {
		        if((await Swal.fire({title:'Delete?', icon:'warning', showCancelButton:true})).isConfirmed) {
		            try {
		                await fetch(`${API_BASE}/accessories/${id}`, { method: 'DELETE' });
		                Swal.fire('Deleted!', '', 'success');
		                this.renderAdminAccessories();
		            } catch(e) { Swal.fire('Error', 'Delete failed', 'error'); }
		        }
		    },
		// --- GESTION DE LA FLOTTE (ADMIN) ---
		async renderAdminBikes() {
		        const c = document.getElementById('admin-content');
		        if(!c) return;
		        document.getElementById('admin-page-title').innerText = "Fleet Manager";

		        // Chargement de sécurité
		        if (this.products.length === 0) await this.loadDataFromDB();

		        const f = this.fleetFilter;

		        // Structure HTML (Notez bien les oninput/onchange)
		        c.innerHTML = `
		            <div class="animate__animated animate__fadeIn">
		                <div class="d-flex flex-wrap gap-3 mb-4 bg-dark p-3 rounded-3 shadow border border-secondary align-items-center">
		                    
		                    <div class="btn-group" role="group">
		                        <input type="radio" class="btn-check" name="modeRadio" id="mode-rent" ${f.mode==='RENT'?'checked':''} onchange="App.setFleetFilter('mode','RENT')">
		                        <label class="btn btn-outline-info fw-bold" for="mode-rent"><i class="fas fa-bicycle me-2"></i>Rental Fleet</label>

		                        <input type="radio" class="btn-check" name="modeRadio" id="mode-sale" ${f.mode==='SALE'?'checked':''} onchange="App.setFleetFilter('mode','SALE')">
		                        <label class="btn btn-outline-warning fw-bold" for="mode-sale"><i class="fas fa-tag me-2"></i>For Sale</label>
		                    </div>

		                    <div class="vr bg-secondary mx-2"></div>

		                    <div class="flex-grow-1 position-relative">
		                        <i class="fas fa-search position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary"></i>
		                        <input type="text" id="fleet-search-input" 
		                               class="form-control bg-black text-white border-secondary ps-5 rounded-pill placeholder-gray" 
		                               placeholder="Search model..." 
		                               value="${f.search}"
		                               oninput="App.setFleetFilter('search', this.value)" 
		                               autofocus>
		                    </div>
		                    
		                    <div class="d-flex gap-2">
		                        <select class="form-select form-select-sm bg-black text-white border-secondary rounded-3" style="width: auto;" onchange="App.setFleetFilter('type', this.value)">
		                            <option value="ALL" ${f.type==='ALL'?'selected':''}>Type: All</option>
		                            <option value="ELEC" ${f.type==='ELEC'?'selected':''}>⚡ Electric</option>
		                            <option value="MECA" ${f.type==='MECA'?'selected':''}>⚙️ Mechanical</option>
		                        </select>

		                        <select class="form-select form-select-sm bg-black text-white border-secondary rounded-3" style="width: auto;" onchange="App.setFleetFilter('owner', this.value)">
		                            <option value="ALL" ${f.owner==='ALL'?'selected':''}>All Owners</option>
		                            <option value="GUSTAVE" ${f.owner==='GUSTAVE'?'selected':''}>Gustave Only</option>
		                            <option value="EXTERNAL" ${f.owner==='EXTERNAL'?'selected':''}>External</option>
		                        </select>
		                    </div>
		                    
		                    <button class="btn btn-success btn-sm fw-bold rounded-pill px-3 shadow-sm" onclick="App.openAddBikeModal()">
		                        <i class="fas fa-plus me-2"></i> New
		                    </button>
		                </div>

		                <div id="admin-bikes-grid" class="row row-cols-1 row-cols-md-3 row-cols-xl-4 g-4"></div>
		            </div>
		        `;

		        // APPEL IMPORTANT : On remplit la grille immédiatement
		        this.updateAdminBikesGrid();

		        // Focus management
		        const input = document.getElementById('fleet-search-input');
		        if(input && f.search) {
		            input.focus();
		            const len = input.value.length; 
		            input.setSelectionRange(len, len);
		        }
		    },	
			async markForSale(id) {
			        const bike = this.products.find(b => b.id == id);
			        if(!bike) return;
			        
			        const { value: price } = await Swal.fire({
			            title: 'Sell this bike',
			            text: `It has been rented ${bike.rentCount} times. Set a selling price:`,
			            input: 'number',
			            inputValue: Math.round(bike.price * 15), // Suggestion de prix (ex: 15 jours de loc)
			            showCancelButton: true,
			            confirmButtonText: 'Put on Sale',
			            confirmButtonColor: '#198754'
			        });

			        if (price) {
			            try {
			                // On met à jour le vélo : forSale=true, prix de vente, et on le retire de la loc
			                await API.createBike({ 
			                    ...bike, 
			                    forSale: true, 
			                    price: parseFloat(price), // Le prix devient le prix de vente
			                    status: 'AVAILABLE' // Doit être dispo pour être acheté
			                });
			                Swal.fire('Done!', 'Bike is now in the "Buy" section.', 'success');
			                await this.loadDataFromDB();
							this.fleetFilter.mode = 'SALE';
			                this.renderAdminBikes();
			            } catch(e) { Swal.fire('Error', 'Update failed', 'error'); }
			        }
			    },

				/* REPLACE showWaitingList IN app.js */
				/* REPLACE showWaitingList IN app.js */
				/* REPLACE THE ENTIRE showWaitingList FUNCTION IN app.js */
				async showWaitingList(bikeId) {
				    // 1. Loading Spinner
				    Swal.fire({ 
				        title: 'Loading...', 
				        didOpen: () => Swal.showLoading(), 
				        background: '#1a1a1a', color: '#fff' 
				    });

				    try {
				        // 2. Fetch Data from API
				        let list = await API.getWaitingList(bikeId);
				        
				        // Safety: Ensure it is an array
				        if (!Array.isArray(list)) list = [];

				        // 3. Smart Sort: PROs first, then by date
				        list.sort((a, b) => {
				            if (a.isPro && !b.isPro) return -1; // PRO goes up
				            if (!a.isPro && b.isPro) return 1;  // Non-PRO goes down
				            return new Date(a.requestDate) - new Date(b.requestDate); // Oldest date first
				        });

				        let html = `<div class="list-group text-start bg-dark" style="max-height: 400px; overflow-y: auto;">`;
				        
				        if(list.length === 0) {
				            html += `
				            <div class="p-5 text-center text-muted opacity-50">
				                <i class="fas fa-wind fa-3x mb-3"></i><br>
				                No one is waiting for this bike.
				            </div>`;
				        } else {
				            html += list.map((w, index) => {
				                const rank = index + 1;
				                
				                // Rank Colors (#1 Gold, #2 Silver, etc.)
				                let rankColor = 'bg-secondary';
				                let borderColor = 'border-secondary';
				                if (rank === 1) { rankColor = 'bg-warning text-dark'; borderColor = 'border-warning'; }
				                else if (rank === 2) { rankColor = 'bg-light text-dark'; borderColor = 'border-white'; }
				                else if (rank === 3) { rankColor = 'bg-danger text-white'; borderColor = 'border-danger'; }

				                const dateStr = w.requestDate ? new Date(w.requestDate).toLocaleString('fr-FR', { day:'numeric', month:'short' }) : 'Recently';
				                
				                // --- ROBUST NAME DISPLAY ---
				                // 1. Try username from DB. 2. Try email prefix. 3. Fallback to "User"
				                const safeEmail = w.email || ""; 
				                const displayName = w.username || (safeEmail.includes('@') ? safeEmail.split('@')[0] : "User");
				                
				                // --- PRO BADGE LOGIC ---
				                const statusBadge = w.isPro 
				                    ? '<span class="badge bg-warning text-dark border border-warning"><i class="fas fa-crown me-1"></i>PRO</span>' 
				                    : '<span class="badge bg-secondary bg-opacity-25 border border-secondary" style="font-size:0.7em">Student</span>';

				                return `
				                <div class="list-group-item bg-black border-secondary d-flex align-items-center p-3 mb-1 rounded shadow-sm">
				                    <div class="me-3">
				                        <span class="badge rounded-circle ${rankColor} d-flex align-items-center justify-content-center shadow" 
				                              style="width: 35px; height: 35px; font-size: 1.1em; border: 2px solid ${borderColor ? 'var(--bs-' + borderColor + ')' : '#555'};">
				                            #${rank}
				                        </span>
				                    </div>

				                    <div class="flex-grow-1 overflow-hidden">
				                        <div class="d-flex align-items-center mb-1">
				                            <span class="fw-bold text-white fs-5 me-2 text-truncate">${displayName}</span>
				                            ${statusBadge}
				                        </div>
				                        <div class="small text-white text-truncate">
				                            <i class="fas fa-envelope me-1"></i> ${safeEmail || 'No email'}
				                        </div>
				                    </div>

				                    <div class="text-end ms-3" style="min-width: 80px;">
				                        <div class="small text-secondary fw-bold" style="font-size:0.65rem">WAITING SINCE</div>
				                        <div class="text-info small">${dateStr}</div>
				                    </div>
				                </div>
				                `;
				            }).join('');
				        }
				        html += `</div>`;

				        Swal.fire({
				            title: `<span class="text-white"><i class="fas fa-list-ol text-primary me-2"></i>Waiting List Priority</span>`,
				            html: html,
				            background: '#1a1a1a',
				            color: '#fff',
				            showCloseButton: true,
				            showConfirmButton: false,
				            width: '700px'
				        });

				    } catch (e) {
				        console.error("ShowWaitingList Error:", e);
				        Swal.fire('Error', 'Could not load waiting list', 'error');
				    }
				},
			    notifyUser(email) {
			        Swal.fire('Sent', `Notification sent to ${email}`, 'success');
			    },
			    
			    showBikeHistory(id) {
			       // Affiche qui loue le vélo actuellement
			       // Nécessite de filtrer this.rentals (si chargé) ou appel API
			       Swal.fire('Info', 'Rental details feature coming soon.', 'info');
			    },
				
				setFleetFilter(key, val) {
				        this.fleetFilter[key] = val;
				        sessionStorage.setItem('gb_fleet_filter', JSON.stringify(this.fleetFilter)); // SAUVEGARDE ICI
				        
				        // Rafraîchissement intelligent
				        if (key === 'mode') {
				             // Si on change de mode, on redessine tout pour mettre à jour les boutons actifs
				             this.renderAdminBikes(); 
				        } else {
				             // Sinon juste la grille
				             this.updateAdminBikesGrid();
				        }
				    },
					// ============================================================
					    // NOUVELLE FONCTION : AJOUTER UN VÉLO (ADMIN)
					    // ============================================================
						// ============================================================
						    // NOUVELLE FONCTION : AJOUTER UN VÉLO (ADMIN) - MODIFIÉE
						    // ============================================================
							// ============================================================
							    // VERSION CORRIGÉE ET ROBUSTE DE L'AJOUT (ADMIN)
							    // ============================================================
							    async openAddBikeModal() {
							        this.tempImg = null; // Reset

							        const modalHtml = `
							            <div class="text-start bg-dark text-white p-3 rounded">
							                <p class="text-info small mb-4 fw-bold">
							                    <i class="fas fa-info-circle me-1"></i> Adding to "Eiffel Corp" fleet.
							                </p>
							                
							                <div class="row g-3">
							                    <div class="col-md-8">
							                        <label class="form-label fw-bold small text-white">Model Name <span class="text-danger">*</span></label>
							                        <input id="add-model" class="form-control bg-black text-white border-secondary" placeholder="e.g., Rockrider ST 100">
							                    </div>
							                    
							                    <div class="col-md-4">
							                         <label class="form-label fw-bold small text-white">Type</label>
							                         <select id="add-type" class="form-select bg-black text-white border-secondary">
							                             <option value="Mécanique">⚙️ Mechanical</option>
							                             <option value="Electrique">⚡ Electric</option>
							                         </select>
							                    </div>

							                     <div class="col-md-6">
							                         <label class="form-label fw-bold small text-success">Daily Rent Price (€) <span class="text-danger">*</span></label>
							                         <input type="number" id="add-price" class="form-control bg-black text-white border-secondary fw-bold" placeholder="0.00" min="0" step="1">
							                     </div>
							                     
							                     <div class="col-md-6">
							                         <label class="form-label fw-bold small text-warning">Image File <span class="text-danger">*</span></label>
							                         <input type="file" id="add-file" class="form-control bg-black text-white border-secondary" accept="image/png, image/jpeg, image/jpg">
							                     </div>

							                    <div class="col-12">
							                        <label class="form-label fw-bold small text-white">Description</label>
							                        <textarea id="add-desc" class="form-control bg-black text-white border-secondary" rows="3" placeholder="Details about the bike..." maxlength="255"></textarea>
							                    </div>
							                </div>
							            </div>
							        `;

							        const { value: newBikeData } = await Swal.fire({
							            title: '<span class="text-white"><i class="fas fa-plus-circle text-success me-2"></i>Add New Bike</span>',
							            html: modalHtml,
							            background: '#1a1a1a',
							            width: '700px',
							            showCancelButton: true,
							            confirmButtonText: 'Add to Fleet',
							            confirmButtonColor: '#198754',
							            cancelButtonColor: '#343a40',
							            
							            // Cette fonction s'exécute quand on clique sur "Add to Fleet"
							            preConfirm: () => {
							                return new Promise((resolve, reject) => {
							                    // 1. Récupération des valeurs
							                    const modelVal = document.getElementById('add-model').value.trim();
							                    const priceVal = document.getElementById('add-price').value;
							                    const typeVal = document.getElementById('add-type').value;
							                    const descVal = document.getElementById('add-desc').value.trim();
							                    const fileInput = document.getElementById('add-file');

							                    // 2. Validation
							                    if (!modelVal) {
							                        Swal.showValidationMessage('Model name is missing');
							                        resolve(false); 
							                        return;
							                    }
							                    if (!priceVal || parseFloat(priceVal) <= 0) {
							                        Swal.showValidationMessage('Invalid rental price');
							                        resolve(false);
							                        return;
							                    }
							                    if (fileInput.files.length === 0) {
							                        Swal.showValidationMessage('Please select an image file');
							                        resolve(false);
							                        return;
							                    }

							                    // 3. Lecture du fichier (C'est ici la correction : on lit DANS le confirm)
							                    const file = fileInput.files[0];
							                    const reader = new FileReader();
							                    
							                    reader.onload = (e) => {
							                        const base64Image = e.target.result;
							                        
							                        // 4. Construction de l'objet final
							                        const bikeObject = {
							                            model: modelVal,
							                            type: typeVal,
							                            price: parseFloat(priceVal),
							                            description: descVal || 'No description provided.',
							                            image: base64Image,
							                            // Données Admin forcées
							                            ownerName: "Eiffel Corp",
							                            status: "AVAILABLE",
							                            rentCount: 0,
							                            forSale: false,
							                            salePrice: 0
							                        };
							                        resolve(bikeObject); // On renvoie l'objet valide
							                    };

							                    reader.onerror = (error) => {
							                        Swal.showValidationMessage('Error reading image file');
							                        resolve(false);
							                    };

							                    reader.readAsDataURL(file); // Déclenche la lecture
							                });
							            }
							        });

							        // 5. Envoi à l'API si tout est bon
							        if (newBikeData) {
							            console.log("Sending Bike Data:", newBikeData); // Debug console
							            
							            Swal.fire({ 
							                title: 'Adding...', 
							                didOpen: () => Swal.showLoading(), 
							                background: '#1a1a1a', 
							                color:'#fff' 
							            });
							            
							            try {
							                await API.createBike(newBikeData);
							                await this.loadDataFromDB();
							                
							                // On s'assure d'être sur la bonne vue
							                this.fleetFilter.mode = 'RENT'; // On force l'affichage location pour voir le nouveau vélo
							                this.renderAdminBikes(); 
							                
							                Swal.fire({
							                    icon: 'success',
							                    title: 'Bike Added!',
							                    text: `${newBikeData.model} is now available.`,
							                    background: '#1a1a1a', color: '#fff',
							                    timer: 2000, showConfirmButton: false
							                });

							            } catch (e) {
							                console.error("ADD BIKE ERROR:", e);
							                Swal.fire({ 
							                    icon: 'error', 
							                    title: 'Error', 
							                    text: 'Could not add bike. Check console.', 
							                    background: '#1a1a1a', 
							                    color: '#fff' 
							                });
							            }
							        }
							    },
					    // ============================================================
					
						getAdminBikeCard(b) {
						        let img = b.image;
						        if (img && !img.startsWith('http') && !img.startsWith('data:')) img = UPLOADS_BASE_URL + img;
						        
						        // Status Badges
						        let statusBadge;
						        if(b.status === 'AVAILABLE') statusBadge = 'bg-success text-white';
						        else if(b.status === 'MAINTENANCE') statusBadge = 'bg-danger text-white';
						        else if(b.status === 'RENTED') statusBadge = 'bg-primary text-white';
						        else statusBadge = 'bg-secondary text-white';

						        const isRentMode = this.fleetFilter.mode === 'RENT';
						        
						        // --- NOUVEAU : Vérification Propriétaire ---
						        const isEiffelOwner = (b.ownerName === 'Eiffel Corp');

						        return `
						        <div class="col animate__animated animate__fadeIn">
						            <div class="card h-100 bg-dark border border-secondary shadow-lg overflow-hidden text-white">
						                
						                <div class="position-relative">
						                    <img src="${img}" class="card-img-top" style="height:180px; object-fit:cover; filter: brightness(0.85);" onerror="this.src='https://via.placeholder.com/300'">
						                    
						                    <div class="position-absolute top-0 end-0 m-2">
						                        <span class="badge ${statusBadge} shadow-sm border border-light">${b.status}</span>
						                    </div>
						                    
						                    <div class="position-absolute bottom-0 start-0 w-100 p-2" 
						                         style="background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);">
						                        <h6 class="fw-bold mb-0 text-white text-truncate">${b.model}</h6>
						                        <small class="text-info fw-bold">${b.type}</small>
						                        <div class="small text-muted" style="font-size:0.7em">${b.ownerName}</div>
						                    </div>
						                </div>
						                
						                <div class="card-body p-3 d-flex flex-column">
						                    <div class="d-flex justify-content-between align-items-center mb-3 p-2 rounded bg-white bg-opacity-10 border border-secondary">
						                        <div class="text-center flex-fill border-end border-secondary">
						                            <div class="small text-secondary fw-bold text-uppercase" style="font-size:0.65rem">PRICE</div>
						                            <div class="fw-bold text-success">${b.price}€</div>
						                        </div>
						                        <div class="text-center flex-fill">
						                            <div class="small text-secondary fw-bold text-uppercase" style="font-size:0.65rem">RENTALS</div>
						                            <div class="fw-bold text-white">${b.rentCount || 0}</div>
						                        </div>
						                    </div>

						                    <div class="mt-auto d-grid gap-2">
						                        ${isRentMode ? `
						                            ${b.status === 'RENTED' ? 
						                                `<button class="btn btn-sm btn-outline-info" disabled><i class="fas fa-clock"></i> Currently Rented</button>` 
						                                : 
						                                `<div class="btn-group w-100">
						                                    <button class="btn btn-sm btn-outline-light" onclick="App.toggleStatus(${b.id}, '${b.status==='AVAILABLE'?'MAINTENANCE':'AVAILABLE'}')">
						                                        ${b.status==='AVAILABLE' ? '<i class="fas fa-tools text-warning me-1"></i>' : '<i class="fas fa-check text-success me-1"></i>'}
						                                    </button>
						                                    
						                                    <button class="btn btn-sm btn-outline-light" 
						                                            onclick="App.openEditModal(${b.id})" 
						                                            ${isEiffelOwner ? '' : 'disabled'}
						                                            title="${isEiffelOwner ? 'Edit Bike' : 'Only Eiffel Corp bikes can be edited'}">
						                                        <i class="fas fa-edit ${isEiffelOwner ? 'text-info' : 'text-secondary opacity-25'}"></i>
						                                    </button>

						                                    <button class="btn btn-sm btn-outline-danger" onclick="App.deleteBike(${b.id})"><i class="fas fa-trash"></i></button>
						                                </div>`
						                            }
						                            
						                            ${b.rentCount > 0 && b.status !== 'RENTED' ? 
						                                `<button class="btn btn-sm btn-success fw-bold" onclick="App.markForSale(${b.id})">
						                                    <i class="fas fa-tag me-1"></i> Move to Sale
						                                </button>` : ''}
						                        ` : `
						                            <button class="btn btn-sm btn-outline-info fw-bold" onclick="App.returnToFleet(${b.id})">
						                                <i class="fas fa-undo me-1"></i> Back to Fleet
						                            </button>
						                            <button class="btn btn-sm btn-outline-danger" onclick="App.deleteBike(${b.id})">Delete</button>
						                        `}
						                    </div>
						                </div>

						                <div class="card-footer bg-black border-top border-secondary p-1 text-center">
						                    <button class="btn btn-link btn-sm text-decoration-none text-info fw-bold w-100" onclick="App.showWaitingList(${b.id})">
						                        <i class="fas fa-users me-2"></i> View Waiting List
						                    </button>
						                </div>
						            </div>
						        </div>`;
						    },
							// Met à jour SEULEMENT la grille des vélos (Correction Filtres)
							    updateAdminBikesGrid() {
							        const grid = document.getElementById('admin-bikes-grid');
							        if (!grid) return;

							        const f = this.fleetFilter;
							        // On repart toujours de la liste complète (non supprimée)
							        let bikes = this.products.filter(p => p.status !== 'DELETED');

							        // 1. Filtre Mode (Location / Vente)
							        if (f.mode === 'RENT') bikes = bikes.filter(b => !b.forSale);
							        else bikes = bikes.filter(b => b.forSale);

							        // 2. Filtre Recherche
							        if(f.search) bikes = bikes.filter(b => b.model.toLowerCase().includes(f.search.toLowerCase()));
							        
							        // 3. Filtre Type (Robuste : gère "Electrique" et "Electric")
							        if(f.type !== 'ALL') {
							            bikes = bikes.filter(b => {
							                // On normalise pour être sûr
							                const type = (b.type || '').trim();
							                const isElec = (type === 'Electrique' || type === 'Electric' || type === 'ELEC');
							                
							                if (f.type === 'ELEC') return isElec;
							                if (f.type === 'MECA') return !isElec;
							            });
							        }

							        // 4. Filtre Propriétaire (CORRECTION : Ajout de 'Eiffel Corp')
							        const officials = ['GustaveBike', 'ADMIN', 'Université', 'Admin', 'Eiffel Corp'];
							        
							        if(f.owner === 'GUSTAVE') {
							            bikes = bikes.filter(b => officials.includes(b.ownerName));
							        } else if(f.owner === 'EXTERNAL') {
							            bikes = bikes.filter(b => !officials.includes(b.ownerName));
							        }

							        // Injection du HTML
							        grid.innerHTML = bikes.length > 0 
							            ? bikes.map(b => this.getAdminBikeCard(b)).join('') 
							            : '<div class="col-12 text-center py-5 text-muted opacity-50"><i class="fas fa-bicycle fa-3x mb-3"></i><br>No bikes found for these filters.</div>';
							    },									// --- ADMIN: OFFERS MANAGEMENT (PREMIUM DARK UI) ---
									    async renderAdminOffers() {
									        const c = document.getElementById('admin-content');
									        if(!c) return;
									        document.getElementById('admin-page-title').innerText = "Offers Management";
									        
									        // 1. Refresh & Filter Data
									        if(this.products.length === 0) await this.loadDataFromDB();
									        const pending = this.products.filter(p => p.status === 'PROPOSAL');
									        const history = this.products.filter(p => ['ACCEPTED_BY_ADMIN', 'REFUSED'].includes(p.status));

									        // Helper image
									        const getImg = (url) => (url && !url.startsWith('http') && !url.startsWith('data:')) ? UPLOADS_BASE_URL + url : (url || 'https://via.placeholder.com/300?text=No+Image');

									        c.innerHTML = `
									            <div class="animate__animated animate__fadeIn">
									                
									                <ul class="nav nav-pills mb-4 gap-2" id="pills-tab" role="tablist">
									                    <li class="nav-item">
									                        <button class="nav-link active rounded-pill px-4 fw-bold shadow-sm" id="pills-pending-tab" data-bs-toggle="pill" data-bs-target="#pills-pending" type="button">
									                            <i class="fas fa-inbox me-2"></i> New Requests 
									                            ${pending.length > 0 ? `<span class="badge bg-danger ms-2 rounded-pill">${pending.length}</span>` : ''}
									                        </button>
									                    </li>
									                    <li class="nav-item">
									                        <button class="nav-link rounded-pill px-4 fw-bold text-secondary border border-secondary" id="pills-history-tab" data-bs-toggle="pill" data-bs-target="#pills-history" type="button" style="background: transparent;">
									                            <i class="fas fa-history me-2"></i> Archive
									                        </button>
									                    </li>
									                </ul>

									                <div class="tab-content">
									                    
									                    <div class="tab-pane fade show active" id="pills-pending">
									                        ${pending.length > 0 ? `
									                            <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
									                                ${pending.map(p => `
									                                    <div class="col">
									                                        <div class="card h-100 border-0 shadow-lg text-white" 
									                                             style="background: #121212; border: 1px solid #333; border-radius: 16px; overflow: hidden;">
									                                            
									                                            <div class="position-relative">
									                                                <img src="${getImg(p.image)}" style="height: 220px; width: 100%; object-fit: cover; opacity: 0.9;">
									                                                <div class="position-absolute top-0 end-0 m-3">
									                                                    <span class="badge bg-black bg-opacity-75 border border-secondary backdrop-blur shadow-sm">
									                                                        ${p.type || 'Bike'}
									                                                    </span>
									                                                </div>
									                                                <div class="position-absolute bottom-0 start-0 w-100 p-3" 
									                                                     style="background: linear-gradient(to top, rgba(0,0,0,0.95), transparent);">
									                                                    <h4 class="fw-bold m-0">${p.model}</h4>
									                                                    <div class="text-success fw-bold fs-5 mt-1">
									                                                        Asking: ${p.price} €
									                                                    </div>
									                                                </div>
									                                            </div>

									                                            <div class="card-body p-4">
									                                                <div class="d-flex align-items-center mb-3 pb-3 border-bottom border-secondary">
									                                                    <div class="bg-dark rounded-circle d-flex align-items-center justify-content-center me-3 border border-secondary" style="width:40px; height:40px;">
									                                                        <i class="fas fa-user text-muted"></i>
									                                                    </div>
									                                                    <div>
									                                                        <div class="small text-secondary text-uppercase fw-bold" style="font-size:0.7rem">SELLER</div>
									                                                        <div class="fw-bold">${p.ownerName}</div>
									                                                    </div>
									                                                </div>

									                                                <div class="bg-black bg-opacity-50 p-3 rounded border border-secondary mb-4">
									                                                    <small class="text-muted fw-bold d-block mb-1">DETAILS & PAYMENT INFO</small>
									                                                    <p class="small text-light m-0 font-monospace" style="word-break: break-all;">
									                                                        ${p.description || 'No specific details provided.'}
									                                                    </p>
									                                                </div>

									                                                <div class="d-grid gap-2">
									                                                    <button class="btn btn-success py-2 fw-bold shadow-sm" onclick="App.processOffer(${p.id}, 'ACCEPT', ${p.price})">
									                                                        <i class="fas fa-check-circle me-2"></i> Accept & Pay ${p.price}€
									                                                    </button>
									                                                    <button class="btn btn-outline-danger py-2 fw-bold" onclick="App.processOffer(${p.id}, 'REFUSE', 0)">
									                                                        <i class="fas fa-times-circle me-2"></i> Decline Offer
									                                                    </button>
									                                                </div>
									                                            </div>
									                                        </div>
									                                    </div>
									                                `).join('')}
									                            </div>
									                        ` : `
									                            <div class="d-flex flex-column align-items-center justify-content-center py-5 text-muted" style="min-height: 400px;">
									                                <div class="bg-dark p-4 rounded-circle mb-3 border border-secondary">
									                                    <i class="fas fa-check fa-3x text-success"></i>
									                                </div>
									                                <h4 class="fw-bold text-white">All Clear!</h4>
									                                <p>There are no new offers to review.</p>
									                            </div>
									                        `}
									                    </div>

									                    <div class="tab-pane fade" id="pills-history">
									                        <div class="card bg-dark border border-secondary shadow-sm">
									                            <div class="table-responsive">
									                                <table class="table admin-table table-dark table-hover align-middle mb-0">
									                                    <thead class="bg-black">
									                                        <tr class="text-uppercase small text-muted">
									                                            <th class="ps-4 py-3">Bike</th>
									                                            <th>Seller</th>
									                                            <th>Final Price</th>
									                                            <th>Status</th>
									                                        </tr>
									                                    </thead>
									                                    <tbody>
									                                        ${history.length > 0 ? history.map(p => `
									                                            <tr>
									                                                <td class="ps-4">
									                                                    <div class="d-flex align-items-center">
									                                                        <img src="${getImg(p.image)}" class="rounded me-3 border border-secondary" style="width: 40px; height: 40px; object-fit: cover;">
									                                                        <span class="fw-bold text-white">${p.model}</span>
									                                                    </div>
									                                                </td>
									                                                <td class="text-secondary">${p.ownerName}</td>
									                                                <td class="fw-bold text-white">${p.price} €</td>
									                                                <td>
									                                                    ${p.status === 'ACCEPTED_BY_ADMIN' 
									                                                        ? '<span class="badge bg-success bg-opacity-25 text-success border border-success"><i class="fas fa-check me-1"></i> PURCHASED</span>' 
									                                                        : '<span class="badge bg-danger bg-opacity-25 text-danger border border-danger"><i class="fas fa-ban me-1"></i> REJECTED</span>'}
									                                                </td>
									                                            </tr>
									                                        `).join('') : '<tr><td colspan="4" class="text-center py-4 text-muted">History is empty.</td></tr>'}
									                                    </tbody>
									                                </table>
									                            </div>
									                        </div>
									                    </div>
									                </div>
									            </div>
									        `;
									    },
					// --- ADMIN ACTION: PROCESS WITHOUT PRICE EDIT ---
					// --- ADMIN ACTION: PROCESS WITHOUT PRICE EDIT ---
					async processOffer(id, action, fixedPrice) {
					    
					    let rentalPriceVal = 0; // Variable to store the result

					    if (action === 'ACCEPT') {
					        // CONFIRMATION WITH INPUT (Correction: Added the Input field)
					        const result = await Swal.fire({
					            title: 'Confirm Purchase?',
					            html: `
					                <div class="text-center">
					                    <p class="text-muted mb-1">You are about to transfer:</p>
					                    <h1 class="display-4 fw-bold text-success mb-3">${fixedPrice} €</h1>
					                    <p class="small text-white mb-3">To the seller's IBAN provided in the description.</p>
					                    
					                    <hr class="border-secondary">
					                    <label class="form-label text-white small fw-bold">Set Daily Rental Price (€)</label>
					                    <input id="new-rental-price" type="number" class="form-control text-center text-white bg-dark border-secondary" value="10" step="0.5">
					                </div>
					            `,
					            icon: 'question',
					            showCancelButton: true,
					            confirmButtonText: 'Confirm Payment',
					            confirmButtonColor: '#198754',
					            cancelButtonColor: '#333',
					            background: '#1a1a1a', 
					            color: '#fff',
					            focusConfirm: false, // Changed to false to avoid focusing the button instead of input
					            preConfirm: () => {
					                // Now this element exists!
					                const priceEl = document.getElementById('new-rental-price');
					                const price = priceEl ? priceEl.value : null;

					                if (!price || price <= 0) {
					                    Swal.showValidationMessage('Please define a valid rental price');
					                    return false; // Prevent closing
					                }
					                return price;
					            }
					        });

					        if (!result.isConfirmed) return; // Stop if cancelled
					        rentalPriceVal = result.value;   // Retrieve the value from Swal
					    } 
					    else {
					        // REFUS
					        const result = await Swal.fire({
					            title: 'Decline Offer?',
					            text: "The user will be notified and can try again.",
					            icon: 'warning',
					            showCancelButton: true,
					            confirmButtonColor: '#d33',
					            confirmButtonText: 'Yes, Decline',
					            background: '#1a1a1a', color: '#fff'
					        });
					        if (!result.isConfirmed) return;
					    }

					    // ENVOI API
					    try {
					        await API.put(`${API_BASE}/bikes/proposals/${id}`, { 
					            status: action, // 'ACCEPT' or 'REFUSE' (Passed via argument)
					            salePrice: fixedPrice,
					            rentalPrice: parseFloat(rentalPriceVal) // Use the retrieved value
					        });
					        
					        Swal.fire({
					            icon: 'success',
					            title: action === 'ACCEPT' ? 'Payment Successful!' : 'Offer Declined',
					            text: action === 'ACCEPT' ? 'The bike has been added to the fleet.' : '',
					            timer: 2000, showConfirmButton: false,
					            background: '#1a1a1a', color: '#fff'
					        });
					        
					        // Rafraîchir
					        if (typeof this.refreshAllData === 'function') await this.refreshAllData(); // Safety check
					        await this.loadDataFromDB();
					        this.renderAdminOffers(); 

					    } catch (e) {
					        console.error(e);
					        Swal.fire('Error', 'Action failed. Check console.', 'error');
					    }
					},
					async showUserDetails(userId) {
			        // 1. Récupération des données
			        const users = await API.get(`${API_BASE}/users/all`);
			        const u = users.find(user => user.id === userId);
			        if(!u) return;

			        // Récupération de l'historique
			        const rentals = await API.get(`${API_BASE}/rentals/user/${u.email}`).catch(() => []);
			        
			        const content = document.getElementById('user-details-content');
			        if(!content) return; 

			        // 2. Génération du HTML
			        content.innerHTML = `
			            <div class="modal-header border-secondary bg-black">
			                <h5 class="modal-title fw-bold text-white">
			                    <i class="fas fa-id-card me-2 text-primary"></i> User File: ${u.username}
			                </h5>
			                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
			            </div>
			            <div class="modal-body p-4 bg-dark text-white">
			                <div class="row g-4">
			                    
			                    <div class="col-md-4">
			                        <div class="p-3 rounded bg-black border border-secondary h-100">
			                            <h6 class="text-primary text-uppercase small fw-bold mb-4">Sensitive Information</h6>
			                            
			                            <div class="mb-3">
			                                <label class="text-secondary small fw-bold d-block mb-1">ADDRESS</label>
			                                <div class="fw-bold text-white fs-6">${u.address || 'Not provided'}</div>
			                            </div>
			                            
			                            <div class="mb-3">
			                                <label class="text-secondary small fw-bold d-block mb-1">PHONE NUMBER</label>
			                                <div class="fw-bold text-white fs-6">${u.phone || 'Not provided'}</div>
			                            </div>
			                            
			                            <div class="mb-3">
			                                <label class="text-secondary small fw-bold d-block mb-1">IBAN</label>
			                                <code class="text-info fs-6 bg-dark border border-secondary px-2 py-1 rounded d-block">
			                                    ${u.iban || 'Not provided'}
			                                </code>
			                            </div>
			                        </div>
			                    </div>

			                    <div class="col-md-8">
			                        <div class="p-3 rounded bg-black border border-secondary h-100">
			                            <h6 class="text-primary text-uppercase small fw-bold mb-3">Activity History</h6>
			                            
			                            <ul class="nav nav-pills nav-justified mb-3 bg-dark rounded p-1" role="tablist">
			                                <li class="nav-item">
			                                    <button class="nav-link active btn-sm py-1" data-bs-toggle="pill" data-bs-target="#tab-rentals">Rentals</button>
			                                </li>
			                                <li class="nav-item">
			                                    <button class="nav-link btn-sm py-1" data-bs-toggle="pill" data-bs-target="#tab-purchases">Purchases</button>
			                                </li>
			                            </ul>

			                            <div class="tab-content pt-2" style="max-height: 300px; overflow-y: auto;">
			                                <div class="tab-pane fade show active" id="tab-rentals">
			                                    ${rentals.length ? rentals.map(r => `
			                                        <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary mb-2 bg-white bg-opacity-10 rounded hover-effect">
			                                            <div>
			                                                <div class="fw-bold text-white mb-1">
			                                                    <span class="text-secondary fw-normal small me-1">MODEL:</span> 
			                                                    ${r.bike.model}
			                                                </div>
			                                                <div class="small text-light">
			                                                    <span class="text-secondary me-1">DATE:</span> 
			                                                    ${r.startDate} <i class="fas fa-arrow-right mx-1 text-secondary" style="font-size:0.8em"></i> ${r.endDate}
			                                                </div>
			                                            </div>
			                                            <div class="text-end">
			                                                <div class="text-secondary small" style="font-size:0.7rem;">TOTAL</div>
			                                                <div class="text-success fw-bold fs-5">${r.totalPrice}€</div>
			                                            </div>
			                                        </div>
			                                    `).join('') : '<div class="text-secondary text-center py-5 opacity-50"><i class="fas fa-folder-open fa-2x mb-2"></i><br>No rental history found.</div>'}
			                                </div>

			                                <div class="tab-pane fade" id="tab-purchases">
			                                    <div class="text-secondary text-center py-5 opacity-50">
			                                        <i class="fas fa-shopping-bag fa-2x mb-2"></i><br>No purchase history.
			                                    </div>
			                                </div>
			                            </div>
			                        </div>
			                    </div>
			                </div>
			            </div>
			        `;

			        const myModal = new bootstrap.Modal(document.getElementById('userModal'));
			        myModal.show();
			    },
				setAdminFilter(filterType) {
				        this.userFilter = filterType;
				        this.renderAdminUsers(); 
				    }, // <-- GARDEZ CETTE VIRGULE
				async renderAdminUsers() {
				        const c = document.getElementById('admin-content');
				        if(!c) return;
				        document.getElementById('admin-page-title').innerText = "User Management";
				        
				        // 1. Récupération des données
				        let users = await API.get(`${API_BASE}/users/all`);

				        // 2. LOGIQUE DE FILTRAGE
				        if (this.userFilter === 'STUDENT') {
				            users = users.filter(u => u.role === 'STUDENT');
				        } else if (this.userFilter === 'PRO') {
				            users = users.filter(u => u.isPro === true);
				        } else if (this.userFilter === 'EXTERNAL') {
				            users = users.filter(u => u.role === 'USER'); // 'USER' = Externe dans votre DB
				        } else if (this.userFilter === 'ADMIN') {
				            users = users.filter(u => u.role === 'ADMIN' || u.role === 'ROLE_ADMIN');
				        }
				        // Si 'ALL', on garde tout.

				        // 3. Génération des Boutons de Filtre (État Actif/Inactif)
				        const getBtnClass = (filter) => this.userFilter === filter 
				            ? 'btn-dark fw-bold shadow-sm' 
				            : 'btn-light text-muted border bg-white';

				        c.innerHTML = `
				            <div class="animate__animated animate__fadeIn">
				                <div class="d-flex gap-2 mb-4 overflow-auto pb-2">
				                    <button class="btn btn-sm rounded-pill px-3 ${getBtnClass('ALL')}" onclick="App.setAdminFilter('ALL')">
				                        All Users
				                    </button>
				                    <button class="btn btn-sm rounded-pill px-3 ${getBtnClass('STUDENT')}" onclick="App.setAdminFilter('STUDENT')">
				                        <i class="fas fa-graduation-cap me-1"></i> Students
				                    </button>
				                    <button class="btn btn-sm rounded-pill px-3 ${getBtnClass('PRO')}" onclick="App.setAdminFilter('PRO')">
				                        <i class="fas fa-crown me-1 text-warning"></i> PRO Members
				                    </button>
				                    <button class="btn btn-sm rounded-pill px-3 ${getBtnClass('EXTERNAL')}" onclick="App.setAdminFilter('EXTERNAL')">
				                        <i class="fas fa-user me-1"></i> Externals
				                    </button>
				                   
				                  
				                </div>

				                <div class="col-md-12">
				                    <div class="admin-card-stat mb-4 p-0 overflow-hidden shadow-sm border-0">
				                        <div class="table-responsive">
				                            <table class="table admin-table table-hover align-middle mb-0"> 
				                                <thead class="bg-light border-bottom">
				                                    <tr>
				                                        <th class="ps-4 py-3" style="width: 30%">User Profile</th>
				                                        <th style="width: 15%">Account Type</th>
				                                        <th style="width: 30%">Contact Details</th>
				                                        <th style="width: 10%">Status</th>
				                                        <th class="text-end pe-4" style="width: 15%">Actions</th>
				                                    </tr>
				                                </thead>
				                                <tbody>
				                                    ${users.length > 0 ? users.map(u => {
				                                        // Badge Logic
				                                        let typeBadge = '';
				                                        const role = u.role ? u.role.toUpperCase() : 'USER';
				                                        
				                                        if (role === 'STUDENT') {
				                                            if (u.isPro) typeBadge = '<span class="badge bg-warning text-dark border border-warning"><i class="fas fa-crown me-1"></i>Student PRO</span>';
				                                            else typeBadge = '<span class="badge bg-info bg-opacity-10 text-info border border-info"><i class="fas fa-graduation-cap me-1"></i>Student</span>';
				                                        } else if (role === 'USER') {
				                                            if (u.isPro) typeBadge = '<span class="badge bg-warning text-dark border border-warning"><i class="fas fa-crown me-1"></i>Member PRO</span>';
				                                            else typeBadge = '<span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary"><i class="fas fa-user me-1"></i>External</span>';
				                                        } else if (role.includes('ADMIN')) {
				                                            typeBadge = '<span class="badge bg-danger bg-opacity-10 text-danger border border-danger"><i class="fas fa-shield-alt me-1"></i>Admin</span>';
				                                        }

				                                        const phoneDisplay = u.phone ? `<div class="text-dark"><i class="fas fa-phone-alt text-muted me-2" style="font-size:0.8em"></i>${u.phone}</div>` : '<div class="text-muted small italic">No phone</div>';
				                                        const addrDisplay = u.address ? `<div class="small text-muted text-truncate" style="max-width: 250px;"><i class="fas fa-map-marker-alt text-muted me-2" style="font-size:0.8em"></i>${u.address}</div>` : '';

				                                        return `
				                                        <tr onclick="App.showUserDetails(${u.id})" style="cursor:pointer; transition: all 0.2s;">
				                                            <td class="ps-4">
				                                                <div class="d-flex align-items-center">
				                                                    <div class="avatar shadow-sm me-3 bg-white text-primary border fw-bold rounded-circle d-flex align-items-center justify-content-center" style="width:45px;height:45px; font-size:1.1em;">
				                                                        ${u.username.charAt(0).toUpperCase()}
				                                                    </div>
				                                                    <div>
				                                                        <div class="fw-bold text-dark">${u.username}</div>
				                                                        <div class="small text-muted">${u.email}</div>
				                                                    </div>
				                                                </div>
				                                            </td>
				                                            <td>${typeBadge}</td>
				                                            <td><div class="d-flex flex-column justify-content-center">${phoneDisplay}${addrDisplay}</div></td>
				                                            <td><span class="badge rounded-pill ${u.active ? 'bg-success' : 'bg-danger'}">${u.active ? 'Active' : 'Banned'}</span></td>
				                                            <td class="text-end pe-4">
				                                                <button class="btn btn-sm btn-light border hover-shadow" onclick="event.stopPropagation(); App.toggleUserStatus(${u.id})"><i class="fas ${u.active ? 'fa-ban text-danger' : 'fa-check text-success'}"></i></button>
				                                                <button class="btn btn-sm btn-light border hover-shadow ms-1"><i class="fas fa-eye text-primary"></i></button>
				                                            </td>
				                                        </tr>`;
				                                    }).join('') : '<tr><td colspan="5" class="text-center py-5 text-muted">No users found for this filter.</td></tr>'}
				                                </tbody>
				                            </table>
				                        </div>
				                    </div>
				                </div>
				            </div>
				            
				            <div class="modal fade" id="userModal" tabindex="-1">
				                <div class="modal-dialog modal-xl modal-dialog-centered">
				                    <div class="modal-content border-0 bg-dark text-white shadow-lg">
				                        <div id="user-details-content"></div>
				                    </div>
				                </div>
				            </div>`;
				    },
					async triggerPayment(type, amount, data) { 
						        // 1. Calcul du montant TOTAL de base (en EUR)
						        if (type === 'CART') { 
						            if(this.cart.length === 0) return Swal.fire('Cart empty'); 
						            amount = this.cart.reduce((a,b) => a + (b.price * b.qty), 0); 
						            data = this.cart; 
						        }
						        
						        this.pendingPayment = { type, amount, data }; 
						        
						        // 2. Conversion monétaire (Taux actuel)
						        const rate = this.currencyRates[this.currency] || 1;
						        const symbol = this.currencySymbols[this.currency] || '€';
						        
						        // Montant converti (pour affichage ET pour Stripe)
						        const finalAmount = (amount * rate).toFixed(2);

						        let title = 'Payment';
						        if(type==='BUY' || type==='BUY_ACC') title = 'Purchase';
						        else if(type==='RENTAL') title = 'Rental';

					            // Affichage dans la pop-up
						        document.getElementById('pay-desc').innerText = title; 
						        document.getElementById('pay-amount').innerText = `${symbol} ${finalAmount}`; 
						        
						        try {
						            // 3. Appel API modifié : On envoie le montant converti ET la devise
						            // Attention : Stripe attend souvent les montants en centimes (x100)
						            // Mais votre backend gère peut-être déjà ça. Vérifions le backend.
					                
					                // Pour l'instant, envoyons le montant converti à votre backend
					                // Il faudra adapter le backend Java pour accepter la devise
						            const res = await API.post(`${API_BASE}/payment/create-payment-intent`, { 
					                    amount: parseFloat(finalAmount), 
					                    currency: this.currency 
					                });
					                
						            const appearance = { theme: 'stripe' };
						            this.elements = this.stripe.elements({ appearance, clientSecret: res.clientSecret });
						            const paymentElement = this.elements.create("payment");
						            if(document.getElementById("payment-element")) {
						                paymentElement.mount("#payment-element");
						                new bootstrap.Modal(document.getElementById('modal-pay')).show(); 
						            }
						        } catch(e) { 
					                console.error(e);
					                Swal.fire('Error', 'Impossible to initialize payment.', 'error'); 
					            }
						    },
							async confirmPayment() {
							    const btn = document.querySelector('#modal-pay .btn-success');
							    if (btn) {
							        btn.disabled = true;
							        btn.innerText = "Processing...";
							    }

							    try {
							        const { error } = await this.stripe.confirmPayment({ elements: this.elements, redirect: "if_required" });

							        if (error) {
							            document.getElementById("payment-message").innerText = error.message;
							            if (btn) {
							                btn.disabled = false;
							                btn.innerText = "Pay now";
							            }
							            return;
							        }

							        // Fermeture propre de la modale
							        bootstrap.Modal.getInstance(document.getElementById('modal-pay')).hide();
							        document.body.classList.remove('modal-open');
							        document.body.style = '';
							        document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());

							        const p = this.pendingPayment;

							        // --- LISTING (Mise en vente) ---
							        if (p.type === 'LISTING') {
							            await API.createBike(p.data);
							            Swal.fire('Success', 'Listing Online!', 'success');
							            await this.loadDataFromDB();
							            this.nav('listings');
							        } 
							        // --- LOCATION ---
							        else if (p.type === 'RENTAL') {
							            await API.createRental({
							                bikeId: p.data.bike.id,
							                userEmail: this.user.email,
							                startDate: p.data.startDate,
							                endDate: p.data.endDate,
							                totalPrice: p.data.totalToPay,
							                deposit: p.data.deposit,
							                delivery: p.data.delivery,
							                address: p.data.address
							            });
							            this.showInvoice(p.data, 'RENTAL');
							            await this.loadDataFromDB();
							            this.nav('my-rentals');
							        } 
							        // --- ABONNEMENT PRO ---
							        else if (p.type === 'SUBSCRIPTION') {
							            this.user.isPro = true;
							            this.user.subscriptionPlan = p.data.plan;
							            sessionStorage.setItem('gb_sess', JSON.stringify(this.user));
							            await API.subscribeUser(this.user.email, p.data.plan);
							            this.showInvoice({ amount: p.amount, plan: p.data.plan }, 'SUBSCRIPTION');
							            this.login(this.user);
							        } 
							        // --- ACHAT DIRECT (Vélo ou Accessoire) ---
							        else if (p.type === 'BUY' || p.type === 'BUY_ACC') {
							            if (p.type === 'BUY') {
							                // Vélo : On marque VENDU
							                await API.createBike({ ...p.data.bike, status: 'SOLD', forSale: false });
							                this.showInvoice({ amount: p.amount, bike: p.data.bike }, 'BUY_BIKE');
							                await this.loadDataFromDB();
							                this.nav('buy');
							            } else {
							                // Accessoire : On achète sans supprimer (stock)
							                await API.buyAccessoryItem(p.data.accessory.id);
							                this.showInvoice({ amount: p.amount, accessory: p.data.accessory }, 'BUY_ACC');
							                await this.loadDataFromDB();
							                this.nav('acc');
							            }
							            // J'ai supprimé ici le code en double qui posait problème
							        } 
							        // --- PANIER (CART) ---
							        else if (p.type === 'CART') {
							            for (const item of this.cart) {
							                if (item.type === 'bike') {
							                    // Vélo -> VENDU
							                    await API.createBike({ ...item, status: 'SOLD', forSale: false });
							                } 
							                else if (item.type === 'accessory') {
							                    // Accessoire -> ACHAT (ne supprime pas de la BDD)
							                    await API.buyAccessoryItem(item.id);
							                }
							            }
							            
							            const cartBackup = [...this.cart];
							            this.cart = [];
							            this.saveCart();
							            bootstrap.Offcanvas.getInstance(document.getElementById('cart-offcanvas')).hide();
							            
							            this.showInvoice(cartBackup, 'CART');
							            await this.loadDataFromDB();
							            this.nav('buy'); 
							        }

							    } catch (e) {
							        console.error(e);
							        Swal.fire('Error', 'Transaction recorded but an error occurred.', 'warning');
							    } finally {
							        if (btn) {
							            btn.disabled = false;
							            btn.innerText = "Pay now";
							        }
							    }
							},
    // --- 4. REVIEW MANAGEMENT (SMART & ADAPTIVE) ---
    async renderReviews(bikeId, isReadOnly = false, targetId = 'reviews-container') {
        const container = document.getElementById(targetId);
        if(!container) return;
        
        container.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary spinner-border-sm" role="status"></div></div>';
        
        try {
            const reviews = await API.getReviews(bikeId);
            
            // A. STATISTICS
            const ratedReviews = reviews.filter(r => r.rating > 0);
            const totalRatings = ratedReviews.length;
            const avg = totalRatings ? (ratedReviews.reduce((a,b)=>a+b.rating,0)/totalRatings).toFixed(1) : "0.0";
            const distribution = {5:0, 4:0, 3:0, 2:0, 1:0};
            ratedReviews.forEach(r => { if(distribution[r.rating] !== undefined) distribution[r.rating]++; });

            let statsHtml = `
            <div class="row align-items-center mb-4 bg-light p-3 rounded mx-0">
                <div class="col-4 text-center border-end">
                    <h1 class="display-4 fw-bold text-primary mb-0">${avg}</h1>
                    <div class="text-warning small">${'★'.repeat(Math.round(avg))}${'☆'.repeat(5-Math.round(avg))}</div>
                    <small class="text-muted">${totalRatings} reviews</small>
                </div>
                <div class="col-8">
                    ${[5,4,3,2,1].map(star => {
                        const count = distribution[star];
                        const pct = totalRatings ? (count / totalRatings * 100) : 0;
                        return `
                        <div class="d-flex align-items-center mb-1 small">
                            <span class="me-2" style="width:10px">${star}</span> <i class="fas fa-star text-warning me-2" style="font-size:10px"></i>
                            <div class="progress flex-grow-1" style="height: 6px;">
                                <div class="progress-bar bg-warning" style="width: ${pct}%"></div>
                            </div>
                            <span class="ms-2 text-muted" style="width:30px; text-align:right">${count}</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;

            // B. LIST OF REVIEWS
            let listHtml = '';
            if (reviews.length === 0) {
                listHtml = '<div class="text-center text-muted py-4 small bg-light rounded mb-3">No reviews yet.</div>';
            } else {
                listHtml = '<div class="d-flex flex-column gap-2 mb-3 border-bottom pb-3" style="max-height: 300px; overflow-y: auto; padding-right:5px;">';
                listHtml += reviews.map(r => {
                    const isRating = r.rating > 0;
                    const badge = isRating 
                        ? `<span class="text-warning" style="font-size:10px">${'★'.repeat(r.rating)}</span>` 
                        : `<span class="badge bg-secondary bg-opacity-25 text-dark border" style="font-size:9px">COMMENT</span>`;

                    return `
                    <div class="d-flex w-100">
                        <div class="me-2">
                            <div class="bg-secondary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center fw-bold text-dark" style="width:32px; height:32px; font-size:12px">
                                ${(r.authorName||'U').charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div class="bg-light p-2 px-3 rounded-3 flex-fill position-relative">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <strong class="small text-dark">${r.authorName || 'User'}</strong>
                                ${badge}
                            </div>
                            <p class="m-0 small text-secondary" style="line-height:1.4;">${r.content}</p>
                        </div>
                    </div>`;
                }).join('');
                listHtml += '</div>';
            }

            // C. INPUT BAR
            let formHtml = '';

            // CASE 1: SELL MODE (Read Only)
            if (isReadOnly) {
                formHtml = `<div class="alert alert-light border text-center small text-muted"><i class="fas fa-history"></i> History of rental reviews (Read only for sale)</div>`;
            } 
            // CASE 2: RENT MODE
            else {
                if (this.user) {
                    const myRentals = await API.getUserRentals(this.user.email);
                    const hasRented = myRentals.some(rent => rent.bike.id == bikeId && rent.status === 'FINISHED');

                    if (hasRented) {
                        formHtml = `
                        <form onsubmit="event.preventDefault(); App.submitReview(${bikeId})" class="mt-auto">
                            <div class="d-flex align-items-center bg-white border rounded-pill p-1 shadow-sm">
                                <select id="review-rating" class="form-select form-select-sm me-2 bg-light border-0" style="max-width: 80px; cursor:pointer;" title="Note">
                                    <option value="5">★ 5</option>
                                    <option value="4">★ 4</option>
                                    <option value="3">★ 3</option>
                                    <option value="2">★ 2</option>
                                    <option value="1">★ 1</option>
                                </select>
                                <input type="text" id="review-content" class="form-control border-0 shadow-none" placeholder="Give your review..." required autocomplete="off">
                                <button class="btn btn-dark rounded-circle ms-1" style="width:38px; height:38px; padding:0; display:flex; align-items:center; justify-content:center;" type="submit">
                                    <i class="fas fa-paper-plane" style="font-size:14px"></i>
                                </button>
                            </div>
                        </form>`;
                    } else {
                        formHtml = '<div class="text-center text-muted small mt-2 fst-italic">Only users who rented this bike can leave a review.</div>';
                    }
                } else {
                    formHtml = '<div class="text-center mt-2"><small><a href="#" onclick="bootstrap.Modal.getInstance(document.getElementById(\'modal-detail\'))?.hide(); App.toggleAuth()">Log in</a> to see your rights.</small></div>';
                }
            }

            container.innerHTML = statsHtml + listHtml + formHtml;

        } catch (e) { 
            console.error(e);
            container.innerHTML = '<div class="text-danger small">Error loading reviews.</div>'; 
        }
    },

    async submitReview(bikeId) {
        const ratingEl = document.getElementById('review-rating');
        const contentEl = document.getElementById('review-content');
        if(!ratingEl || !contentEl) return;

        const rating = ratingEl.value;
        const content = contentEl.value;

        try {
            await API.addReview({ bikeId, userEmail: this.user.email, authorName: this.user.username, rating, content });
            contentEl.value = '';
            const msg = (rating > 0) ? 'Review published!' : 'Comment sent!';
            Swal.fire({ toast: true, icon: 'success', title: msg, position: 'top-end', timer: 2000, showConfirmButton: false });
            this.renderReviews(bikeId, false, 'reviews-container'); 
        } catch (e) { Swal.fire('Oops', e.message || "Sending error", 'warning'); }
    },

    // --- 5. NEW MODAL FOR PURCHASE (Read Only Mode) ---
    async openBuyDetails(id) {
        const bike = this.products.find(i => i.id == id); if(!bike) return;
        let imageUrl = bike.image;
        if (bike.image && !bike.image.startsWith('http') && !bike.image.startsWith('data:')) { imageUrl = UPLOADS_BASE_URL + bike.image; }

        const modalHtml = `
        <div class="modal fade" id="modal-buy-detail" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content border-0 shadow">
                    <div class="modal-header border-0 pb-0"><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6 mb-3"><img src="${imageUrl}" class="img-fluid rounded shadow-sm w-100" style="object-fit: cover; aspect-ratio: 4/3;"></div>
                            <div class="col-md-6">
                                <h3 class="fw-bold mb-1">${bike.model}</h3>
                                <h4 class="text-primary fw-bold mb-3">${bike.price} €</h4>
                                <p class="text-muted small">${bike.description || "No description."}</p>
                                <div class="d-grid gap-2 mb-4"><button class="btn btn-success fw-bold py-2 w-100" onclick="App.initDirectBuy(${bike.id})">Buy now</button></div>
                                <hr>
                                <div id="reviews-container-buy" class="mt-3" style="max-height: 300px; overflow-y: auto;">
                                    <div class="text-center py-3">Loading...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        
        const old = document.getElementById('modal-buy-detail'); if(old) old.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('modal-buy-detail'));
        modal.show();
        
        // UNIQUE ID CALL
        this.renderReviews(bike.id, true, 'reviews-container-buy');
    },

    initDirectBuy(id) {
        const bike = this.products.find(b => b.id == id);
        // Clean closing to avoid Z-Index conflict with Stripe
        const buyModal = bootstrap.Modal.getInstance(document.getElementById('modal-buy-detail'));
        if(buyModal) buyModal.hide();
        // Safety delay before opening payment
        setTimeout(() => {
            this.triggerPayment('BUY', bike.price, {bike});
        }, 300);
    },
    

	async renderProfile(c) {
	        if (!this.user) return;

	        // --- 1. CALCUL INTELLIGENT DU CO2 ---
	        let co2Saved = 0;
	        let totalDays = 0;
	        let mechanicalDays = 0;
	        let electricDays = 0;

	        try {
	            // On récupère l'historique complet
	            const rentals = await API.getUserRentals(this.user.email);
	            
	            rentals.forEach(r => {
	                // Calcul durée
	                const start = new Date(r.startDate);
	                const end = r.endDate ? new Date(r.endDate) : new Date(); // Si en cours, jusqu'à aujourd'hui
	                const days = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
	                
	                // Logique CO2 : 
	                // Voiture moyenne = ~0.15kg CO2/km. Trajet moyen étudiant = 10km/jour.
	                // Vélo Mécanique : 0 émission => 1.5kg économisés/jour.
	                // Vélo Electrique : Petite conso élec => 1.2kg économisés/jour.
	                
	                // Sécurisation : on vérifie si le type existe, sinon on suppose Mécanique
	                const type = (r.bike.type || "Mécanique").toLowerCase();
	                
	                if (type.includes('elec')) {
	                    co2Saved += (days * 1.2);
	                    electricDays += days;
	                } else {
	                    co2Saved += (days * 1.5);
	                    mechanicalDays += days;
	                }
	                totalDays += days;
	            });
	        } catch (e) {
	            console.warn("Impossible de calculer le CO2", e);
	        }

	        // Arrondi à 1 décimale (ex: 12.5 kg)
	        const finalCo2 = co2Saved.toFixed(1);

	        // --- 2. INTERFACE GRAPHIQUE ---
	        const u = this.user;
	        
	        c.innerHTML = `
	        <div class="container animate__animated animate__fadeIn" style="max-width: 850px;">
	            <div class="card border-0 shadow-lg overflow-hidden mb-5">
	                
	                <div class="p-4 text-white text-center position-relative" style="background: linear-gradient(135deg, #2b5876 0%, #4e4376 100%);">
	                    <div class="profile-avatar-xl bg-white text-dark fw-bold rounded-circle shadow mx-auto d-flex align-items-center justify-content-center mb-3" style="width: 100px; height: 100px; font-size: 3rem; border: 4px solid rgba(255,255,255,0.2);">
	                        ${(u.username || 'U').charAt(0).toUpperCase()}
	                    </div>
	                    <h3 class="fw-bold mb-1">${u.username}</h3>
	                    <div class="mb-4">
	                        ${u.isPro ? '<span class="badge bg-warning text-dark shadow-sm"><i class="fas fa-crown"></i> PRO Member</span>' : '<span class="badge bg-light text-dark bg-opacity-25">Standard Member</span>'}
	                    </div>

	                    <div class="row g-2 justify-content-center text-dark">
	                        <div class="col-4 col-md-3">
	                            <div class="bg-white p-2 rounded shadow-sm">
	                                <div class="fw-bold text-success fs-5">${finalCo2} kg</div>
	                                <div class="small text-muted" style="font-size:0.7rem">CO2 SAVED</div>
	                            </div>
	                        </div>
	                        <div class="col-4 col-md-3">
	                            <div class="bg-white p-2 rounded shadow-sm">
	                                <div class="fw-bold text-primary fs-5">${totalDays}</div>
	                                <div class="small text-muted" style="font-size:0.7rem">DAYS RIDDEN</div>
	                            </div>
	                        </div>
	                        <div class="col-4 col-md-3">
	                            <div class="bg-white p-2 rounded shadow-sm">
	                                <div class="fw-bold text-info fs-5">${mechanicalDays}/${electricDays}</div>
	                                <div class="small text-muted" style="font-size:0.7rem">MECH / ELEC</div>
	                            </div>
	                        </div>
	                    </div>
	                </div>

	                <div class="card-body p-5">
	                    <h5 class="mb-4 fw-bold text-secondary border-bottom pb-2">Edit Profile</h5>
	                    
	                    <form id="form-profile">
	                        <div class="row g-3">
	                            
	                            <div class="col-md-6">
	                                <label class="form-label small fw-bold">Username</label>
	                                <input type="text" id="p-name" class="form-control" value="${u.username || ''}" required>
	                            </div>

	                            <div class="col-md-6">
	                                <label class="form-label small fw-bold">Email</label>
	                                <input type="email" class="form-control bg-light" value="${u.email}" disabled readonly>
	                            </div>

	                            <div class="col-md-6">
	                                <label class="form-label small fw-bold">Phone (FR)</label>
	                                <div class="input-group has-validation">
	                                    <span class="input-group-text"><i class="fas fa-phone"></i></span>
	                                    <input type="tel" id="p-tel" class="form-control" value="${u.phone || ''}" placeholder="06 12 34 56 78">
	                                    <div id="err-phone" class="invalid-feedback">Invalid French format (starts with 06/07/09...).</div>
	                                </div>
	                            </div>

	                            <div class="col-md-6">
	                                <label class="form-label small fw-bold">IBAN (FR)</label>
	                                <div class="input-group has-validation">
	                                    <span class="input-group-text"><i class="fas fa-university"></i></span>
	                                    <input type="text" id="p-iban" class="form-control" value="${u.iban || ''}" placeholder="FR76 ...." style="text-transform:uppercase;">
	                                    <div id="err-iban" class="invalid-feedback">Invalid IBAN (Must start with FR + 27 chars).</div>
	                                </div>
	                            </div>

	                            <div class="col-12">
	                                <label class="form-label small fw-bold">Address</label>
	                                <input type="text" id="p-addr" class="form-control" value="${u.address || ''}" placeholder="Type your address...">
	                            </div>

	                            <div class="col-12 text-end mt-4">
	                                <button type="submit" class="btn btn-dark px-4 fw-bold">
	                                    <i class="fas fa-save me-2"></i> Update Profile
	                                </button>
	                            </div>
	                        </div>
	                    </form>
	                </div>
	            </div>
	        </div>`;

	        // --- 3. AUTO-COMPLETION ADRESSE ---
	        this.setupAddress('p-addr');

	        // --- 4. GESTION DU SUBMIT & VALIDATION ---
	        document.getElementById('form-profile').onsubmit = async (e) => {
	            e.preventDefault();

	            // Récupération des champs
	            const nameEl = document.getElementById('p-name');
	            const phoneEl = document.getElementById('p-tel');
	            const ibanEl = document.getElementById('p-iban');
	            const addrEl = document.getElementById('p-addr');

	            // Nettoyage valeurs
	            const phoneVal = phoneEl.value.replace(/\s/g, ''); 
	            const ibanVal = ibanEl.value.replace(/\s/g, '').toUpperCase();

	            // --- REGEX FRANCAIS ---
	            const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/; 
	            const ibanRegex = /^FR\d{2}[A-Z0-9]{23}$/; 

	            let isValid = true;

	            // Validation Téléphone
	            if (phoneVal && !phoneRegex.test(phoneVal)) {
	                phoneEl.classList.add('is-invalid');
	                isValid = false;
	            } else {
	                phoneEl.classList.remove('is-invalid');
	            }

	            // Validation IBAN
	            if (ibanVal && !ibanRegex.test(ibanVal)) {
	                ibanEl.classList.add('is-invalid');
	                isValid = false;
	            } else {
	                ibanEl.classList.remove('is-invalid');
	            }

	            if (!isValid) return; // On arrête si erreur

	            // Envoi API
	            const btn = e.target.querySelector('button');
	            const oldText = btn.innerHTML;
	            btn.disabled = true;
	            btn.innerText = 'Saving...';

	            try {
	                const updatedData = {
	                    email: this.user.email,
	                    username: nameEl.value,
	                    phone: phoneVal,
	                    iban: ibanVal,
	                    address: addrEl.value
	                };

	                const res = await API.updateProfile(updatedData);
	                this.login({ ...this.user, ...res }); // Mise à jour locale
	                
	                Swal.fire({
	                    toast: true, icon: 'success', title: 'Profile Updated', 
	                    position: 'top-end', showConfirmButton: false, timer: 2000
	                });

	            } catch (err) {
	                Swal.fire('Error', 'Update failed.', 'error');
	            } finally {
	                btn.disabled = false;
	                btn.innerHTML = oldText;
	            }
	        };
	    },
   
	
	renderSubscription(c) {
	        // Prices (can be changed)
	        const prices = { MONTHLY: 9.99, QUARTERLY: 24.99, YEARLY: 89.99 };
	        
	        c.innerHTML = `
	        <div class="text-center mb-5">
	            <span class="badge bg-warning text-dark mb-2 px-3 py-2 rounded-pill"><i class="fas fa-crown"></i> BECOME A PRO MEMBER</span>
	            <h2 class="fw-bold">Step up to the next level</h2>
	            <p class="text-muted">Enjoy maximum visibility and priority access.</p>
	        </div>

	        <div class="row g-4 justify-content-center">
	            <div class="col-md-4">
	                <div class="card h-100 border-0 shadow-sm text-center p-4">
	                    <h5 class="fw-bold text-muted">Monthly</h5>
	                    <h1 class="display-5 fw-bold my-3 text-dark">${prices.MONTHLY}€</h1>
	                    <button class="btn btn-outline-dark w-100 fw-bold mt-3" onclick="App.triggerPayment('SUBSCRIPTION', ${prices.MONTHLY}, {plan:'MONTHLY'})">Select</button>
	                </div>
	            </div>
	            <div class="col-md-4">
	                <div class="card h-100 border border-2 border-warning shadow text-center p-4">
	                    <span class="badge bg-warning text-dark mb-2">POPULAR</span>
	                    <h5 class="fw-bold text-dark">Quarterly</h5>
	                    <h1 class="display-5 fw-bold my-3 text-dark">${prices.QUARTERLY}€</h1>
	                    <button class="btn btn-warning w-100 fw-bold mt-3" onclick="App.triggerPayment('SUBSCRIPTION', ${prices.QUARTERLY}, {plan:'QUARTERLY'})">Select</button>
	                </div>
	            </div>
	            <div class="col-md-4">
	                <div class="card h-100 border-0 shadow-sm text-center p-4">
	                    <h5 class="fw-bold text-muted">Yearly</h5>
	                    <h1 class="display-5 fw-bold my-3 text-dark">${prices.YEARLY}€</h1>
	                    <button class="btn btn-dark w-100 fw-bold mt-3" onclick="App.triggerPayment('SUBSCRIPTION', ${prices.YEARLY}, {plan:'YEARLY'})">Select</button>
	                </div>
	            </div>
	        </div>
	        <div class="text-center mt-4"><a href="#" onclick="App.nav('rent')">No thanks</a></div>`;
	    },

	// --- RENT PAGE (CORRECTED) ---
	// --- RENT PAGE (CORRECTED: EXTENDED FILTER) ---
	renderRent(c) {
	        // 1. Access verification
	        if (!this.user || !this.user.email.endsWith('@edu.univ-eiffel.fr')) { 
	            c.innerHTML = `<div class="d-flex flex-column align-items-center justify-content-center h-100 py-5">
	                <div class="alert alert-warning shadow-sm border-0 p-4 text-center">
	                    <i class="fas fa-user-graduate fa-3x mb-3 text-warning"></i>
	                    <h4 class="fw-bold">Restricted Access</h4>
	                    <p class="mb-0">Please log in with a student email (@edu.univ-eiffel.fr).</p>
	                </div>
	            </div>`; 
	            return; 
	        }

	        // 2. Retrieval and global filtering
	        let items = this.products.filter(p => !p.forSale && p.status !== 'MAINTENANCE');

	        if(this.filters.search) {
	            items = items.filter(i => i.model.toLowerCase().includes(this.filters.search.toLowerCase()));
	        }
	        if(this.filters.type !== 'ALL') {
	            items = items.filter(i => (this.filters.type === 'ELEC' && i.type === 'Electrique') || (this.filters.type === 'MECA' && i.type !== 'Electrique'));
	        }
	        
	        // 3. List separation
	        const officialNames = ['GustaveBike', 'ADMIN', 'Admin', 'Université', 'Eiffel Corp'];
	        
	        // Official Fleet (Admin)
	        let fleet = items.filter(i => officialNames.includes(i.ownerName));
	        
	        // Student offers (Standard + Pros)
	        let studentBikes = items.filter(i => !officialNames.includes(i.ownerName));

	        // 4. SPECIFIC SORT FOR STUDENTS: PROS FIRST
	        studentBikes.sort((a, b) => {
	            // Criterion 1: PRO status
	            // If A is Pro and B is not, A goes ahead (-1)
	            if (a.ownerIsPro && !b.ownerIsPro) return -1;
	            if (!a.ownerIsPro && b.ownerIsPro) return 1;
	            
	            // Criterion 2: Price (if both are Pro or both are Standard)
	            if (this.filters.sort === 'ASC') return a.price - b.price;
	            return b.price - a.price;
	        });

	        // Simple sort by price for the official fleet
	        fleet.sort((a,b) => this.filters.sort === 'ASC' ? a.price - b.price : b.price - a.price);

	        // --- Display preparation ---
	        const rate = this.currencyRates[this.currency] || 1;
	        const symbol = this.currencySymbols[this.currency] || '€';

	        let html = `
	        <div class="d-flex justify-content-between mb-4 align-items-center flex-wrap gap-2 border-bottom pb-3">
	            <div>
	                <h3 class="fw-bold m-0 text-dark">Rent a bike</h3>
	                <span class="badge bg-primary bg-opacity-10 text-primary">Campus</span>
	            </div>
	            <div class="d-flex gap-2">
	                <input class="form-control form-control-sm" placeholder="Search..." oninput="App.setSearch(this.value, 'rent')">
	                <select class="form-select form-select-sm" onchange="App.setSort(this.value, 'rent')">
	                    <option value="ASC">Price ascending</option>
	                    <option value="DESC">Price descending</option>
	                </select>
	                ${this.getCurrencySelectorHTML()}
	            </div>
	        </div>
	        
	        <div class="d-flex gap-2 mb-5 justify-content-center">
	            <button class="btn btn-sm px-3 rounded-pill ${this.filters.type==='ALL'?'btn-dark':'btn-light border'}" onclick="App.setFilter('ALL')">All</button>
	            <button class="btn btn-sm px-3 rounded-pill ${this.filters.type==='ELEC'?'btn-success text-white':'btn-light border'}" onclick="App.setFilter('ELEC')">⚡ Electric</button>
	            <button class="btn btn-sm px-3 rounded-pill ${this.filters.type==='MECA'?'btn-info text-white':'btn-light border'}" onclick="App.setFilter('MECA')">⚙️ Mechanical</button>
	        </div>`;

	        // Card generator function
	        const renderList = (list) => list.map(i => {
	            const price = (i.price * rate).toFixed(2);
	            let img = i.image; if(img && !img.startsWith('http') && !img.startsWith('data:')) img = UPLOADS_BASE_URL + img;
	            
	            // --- BADGE MANAGEMENT ---
	            let badge = '';
	            if (officialNames.includes(i.ownerName)) {
	                badge = '<span class="badge bg-warning text-dark position-absolute m-2 shadow-sm"><i class="fas fa-certificate"></i> Official</span>';
	            } else if (i.ownerIsPro) {
	                // Violet PRO Badge for subscribed students
	                badge = '<span class="badge position-absolute m-2 shadow-sm text-white" style="background-color:#6f42c1"><i class="fas fa-crown"></i> PRO Student</span>';
	            } else {
	                // Normal badge
	                badge = '<span class="badge bg-info position-absolute m-2 shadow-sm">Student</span>';
	            }

	            return `
	            <div class="col">
	                <div class="card h-100 border-0 shadow-sm product-card bg-white">
	                    <div class="position-relative overflow-hidden bg-light" style="height:200px">
	                        ${badge}
	                        <img src="${img}" class="w-100 h-100 object-fit-cover" onerror="this.src='https://via.placeholder.com/300x200?text=Bike'">
	                    </div>
	                    <div class="card-body">
	                        <div class="d-flex justify-content-between mb-1">
	                            <small class="text-uppercase text-muted fw-bold">${i.type}</small>
	                            <span class="fw-bold text-primary">${symbol} ${price} /d</span>
	                        </div>
	                        <h6 class="fw-bold text-truncate text-dark">${i.model}</h6>
	                        <button class="btn btn-outline-dark w-100 mt-3 fw-bold btn-sm" onclick="App.openRentalWizard(${i.id})">Rent</button>
	                    </div>
	                </div>
	            </div>`;
	        }).join('');

	        // --- FINAL DISPLAY ---
	        
	        // 1. Official Section (Always first if exists)
	        if(fleet.length > 0) {
	            html += `<h5 class="fw-bold mb-3 text-dark border-start border-4 border-warning ps-2">GustaveBike Official Fleet</h5>
	                     <div class="row row-cols-1 row-cols-md-3 row-cols-lg-4 g-4 mb-5">${renderList(fleet)}</div>`;
	        }

	        // 2. Student Section (Mixed: Pros first + Standards)
	        if(studentBikes.length > 0) {
	            html += `<h5 class="fw-bold mb-3 text-dark border-start border-4 border-info ps-2">Offers between Students</h5>
	                     <p class="text-muted small mb-3">Community rentals on campus.</p>
	                     <div class="row row-cols-1 row-cols-md-3 row-cols-lg-4 g-4">${renderList(studentBikes)}</div>`;
	        } else if (fleet.length === 0) {
	            html += `<div class="text-center py-5 text-muted"><i class="fas fa-search fa-2x mb-3"></i><br>No bikes available.</div>`;
	        }

	        c.innerHTML = html;
	    },
		setSearch(val, context) { 
		        this.filters.search = val; 
		        // Relauch navigation towards context (rent or buy) to refresh
		        this.nav(context);
		        
		        // FOCUS CORRECTION: Put cursor back in search bar after refresh
		        setTimeout(() => {
		            const input = document.querySelector(`input[oninput*="${context}"]`);
		            if(input) {
		                input.focus();
		                // Trick to put cursor at end of text
		                const temp = input.value;
		                input.value = '';
		                input.value = temp;
		            }
		        }, 0);
		    },
		    
		    setSort(val, context) { 
		        this.filters.sort = val; 
		        this.nav(context); 
		    },
		    
			setFilter(t, context) { 
			        this.filters.type = t; 
			        // If context given (e.g., 'buy'), go there, otherwise default to 'rent'
			        this.nav(context || 'rent'); 
			    },
    renderListings(c) {
        if(!this.user) { c.innerHTML = '<div class="text-center mt-5">Please log in.</div>'; return; }
        const myItems = this.products.filter(p => p.ownerName === this.user.username);
        c.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4"><h3>My Listings</h3><button class="btn btn-primary" onclick="App.openListingModal()">+ Publish</button></div>${myItems.length ? `<div class="grid-container">${myItems.map(i => this.getCardHTML(i, 'listings')).join('')}</div>` : '<div class="text-center p-5 bg-light rounded">No listings.</div>'}`;
    },

    getCardHTML(item, context) {
        const isAvailable = (item.status === 'AVAILABLE');
        const isRented = (item.status === 'RENTED');
        const isMine = this.user && this.user.username === item.ownerName;
        const officials = ['GustaveBike', 'ADMIN', 'Eiffel Corp'];
        const isOfficial = officials.includes(item.ownerName);
        
        let imageUrl = item.image;
        if (item.image && !item.image.startsWith('http') && !item.image.startsWith('data:')) {
            imageUrl = UPLOADS_BASE_URL + item.image;
        }
        const safeImg = `onerror="this.src='https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=500&q=60'"` 
        
        if (context === 'listings') {
             let statusBadge, actionBtn;
             if (isAvailable) {
                 statusBadge = `<span class="badge bg-success">ONLINE</span>`;
                 actionBtn = `<button class="btn btn-outline-danger btn-sm w-100" onclick="event.stopPropagation(); App.toggleStatus(${item.id}, 'MAINTENANCE')">Hide</button>`;
             } else if (isRented) {
                 statusBadge = `<span class="badge bg-danger">RENTED</span>`;
                 actionBtn = `<button class="btn btn-secondary btn-sm w-100" disabled>Currently Rented</button>`;
             } else {
                 statusBadge = `<span class="badge bg-secondary text-white">HIDDEN</span>`;
                 actionBtn = `<button class="btn btn-success btn-sm w-100" onclick="event.stopPropagation(); App.toggleStatus(${item.id}, 'AVAILABLE')">Publish</button>`;
             }
             return `<div class="product-card h-100 shadow-sm border-0"><div class="card-img position-relative" style="height:180px; overflow:hidden;"><span class="position-absolute top-0 start-0 m-2 badge bg-primary">YOUR LISTING</span><img src="${imageUrl}" style="width:100%; height:100%; object-fit:cover;" ${safeImg}></div><div class="p-3"><div class="d-flex justify-content-between align-items-center mb-2">${statusBadge}<small class="text-muted">${item.rentCount||0} rentals</small></div><h6 class="fw-bold text-truncate">${item.model}</h6><div class="d-grid gap-2 mt-3">${actionBtn}<div class="btn-group"><button class="btn btn-light btn-sm border" onclick="event.stopPropagation(); App.openEditModal(${item.id})" ${isRented?'disabled':''}>Edit</button><button class="btn btn-light btn-sm border text-danger" onclick="event.stopPropagation(); App.deleteBike(${item.id})" ${isRented?'disabled':''}>Delete</button></div></div></div></div>`;
        }
        
        let badgeHtml = '';
        if (isOfficial) badgeHtml = `<span class="position-absolute top-0 start-0 m-2 badge bg-warning text-dark shadow-sm"><i class="fas fa-certificate"></i> GustaveBike Certified</span>`;
        else badgeHtml = `<span class="position-absolute top-0 start-0 m-2 badge bg-info text-white shadow-sm"><i class="fas fa-user-graduate"></i> Student</span>`;
        
        if(isMine) badgeHtml = `<span class="position-absolute top-0 start-0 m-2 badge bg-primary" style="z-index:2">YOUR LISTING</span>`;

        let actionBtn = '';
        if (context === 'rent') {
            actionBtn = `<button class="btn ${isOfficial ? 'btn-dark' : 'btn-outline-dark'} w-100 fw-bold shadow-sm" style="border-radius: 10px;">Rent • ${item.price}€ <small>/d</small></button>`;
        } else if (context === 'buy') {
             actionBtn = `<div class="d-flex gap-2"><button class="btn btn-light border shadow-sm flex-fill" onclick="event.stopPropagation(); App.addToCart(${item.id}, 'bike')" title="Add to cart"><i class="fas fa-cart-plus"></i></button><button class="btn btn-success shadow-sm flex-fill fw-bold w-100" onclick="App.openBuyDetails(${item.id})">Buy</button></div>`;
        }

        const clickAction = context === 'rent' ? `App.openRentalWizard(${item.id})` : `App.openBuyDetails(${item.id})`;

        return `<div class="product-card card h-100 shadow-sm border-0" style="border-radius: 15px; cursor: pointer; overflow:hidden;" onclick="${clickAction}"><div class="position-relative" style="aspect-ratio: 4/3; overflow: hidden; background-color: #f8f9fa;">${badgeHtml}<button class="btn btn-light btn-sm position-absolute top-0 end-0 m-2 rounded-circle shadow-sm" style="width:32px; height:32px; z-index:2" onclick="event.stopPropagation(); App.toggleFavorite(${item.id})"><i class="${(JSON.parse(localStorage.getItem('gb_favs')||'[]').includes(item.id)) ? 'fa-solid text-danger' : 'fa-regular text-secondary'} fa-heart"></i></button><img src="${imageUrl}" style="width:100%; height:100%; object-fit:cover;" ${safeImg}></div><div class="card-body d-flex flex-column p-3"><div class="d-flex justify-content-between align-items-start mb-1"><div class="text-uppercase text-muted small fw-bold" style="font-size: 0.75rem; letter-spacing: 1px;">${item.type || 'BIKE'}</div>${context === 'buy' ? `<span class="fw-bold text-danger fs-5">${item.price}€</span>` : ''}</div><h6 class="fw-bold text-dark mb-1 text-truncate">${item.model}</h6>${isOfficial ? `<small class="text-success mb-3"><i class="fas fa-check-circle"></i> Revised & Guaranteed</small>` : `<small class="text-muted mb-3">Offered by ${item.ownerName}</small>`}<div class="mt-auto">${actionBtn}</div></div></div>`;
    },
    
	async toggleStatus(id, newStatus) {
	        // 1. MISE À JOUR LOCALE (Immédiate)
	        const bike = this.products.find(b => b.id === id);
	        if (!bike) return;
	        
	        const oldStatus = bike.status; // Sauvegarde en cas d'erreur
	        bike.status = newStatus;       // Changement immédiat en mémoire

	        // 2. DÉTECTION DU CONTEXTE (Admin vs Front)
	        const adminModule = document.getElementById('admin-module');
	        const isAdminActive = adminModule && !adminModule.classList.contains('d-none');

	        // 3. RAFRAÎCHISSEMENT VISUEL IMMÉDIAT
	        if (isAdminActive) {
	            // --- CAS ADMIN ---
	            // Si la fonction de grille optimisée existe, on l'utilise
	            if (typeof this.updateAdminBikesGrid === 'function' && document.getElementById('admin-bikes-grid')) {
	                this.updateAdminBikesGrid();
	            } else {
	                this.renderAdminBikes();
	            }
	        } else {
	            // --- CAS USER (FRONT) ---
	            const container = document.getElementById('views-container');
	            if (container) {
	                // On vérifie sur quelle page on est pour rafraîchir la bonne
	                const isListingsPage = document.querySelector('[data-view="listings"]')?.classList.contains('active');
	                
	                if (isListingsPage) {
	                    this.renderListings(container); // Rafraîchit "My Listings"
	                } else {
	                    // Par sécurité, si on est ailleurs (ex: page Rent), on recharge la vue courante
	                    const activeView = document.querySelector('.nav-item.active')?.dataset.view;
	                    if(activeView) this.nav(activeView);
	                }
	            }
	        }

	        // 4. APPEL API (En arrière-plan)
	        try {
	            await API.createBike(bike); // Sauvegarde en base de données
	            
	            // Feedback visuel discret
	            Swal.fire({
	                toast: true,
	                icon: 'success',
	                title: newStatus === 'MAINTENANCE' ? 'Visibility Hidden' : 'Now Online',
	                position: 'top-end',
	                showConfirmButton: false,
	                timer: 1500
	            });

	        } catch (e) {
	            console.error("API Error", e);
	            // En cas d'erreur, on annule le changement local
	            bike.status = oldStatus;
	            Swal.fire('Oups', 'Update failed. Check connection.', 'error');
	            
	            // On remet l'affichage comme avant
	            if (isAdminActive) this.renderAdminBikes();
	            else this.nav('listings');
	        }
	    },
		async returnToFleet(id) {
		        const bike = this.products.find(b => b.id === id);
		        if(!bike) return;

		        // 1. On demande le nouveau prix de LOCATION
		        const { value: rentalPrice } = await Swal.fire({
		            title: 'Back to Rental Fleet',
		            html: `
		                <p>This bike is currently for sale at <b>${bike.price}€</b>.</p>
		                <label class="form-label fw-bold">Set Daily Rental Price (€):</label>
		                <input id="swal-rent-price" type="number" class="form-control text-center fs-4" value="10" step="0.5">
		            `,
		            showCancelButton: true,
		            confirmButtonText: 'Confirm & Publish',
		            confirmButtonColor: '#0dcaf0', // Couleur Info (Bleu clair)
		            preConfirm: () => {
		                const p = document.getElementById('swal-rent-price').value;
		                if (!p || p <= 0) Swal.showValidationMessage('Please enter a valid price');
		                return p;
		            }
		        });

		        // 2. Si l'utilisateur a confirmé un prix
		        if (rentalPrice) {
		            try {
		                // On met à jour le vélo :
		                // - forSale = false (plus à vendre)
		                // - status = AVAILABLE (prêt à louer)
		                // - price = rentalPrice (le prix devient le prix de location)
		                await API.createBike({ 
		                    ...bike, 
		                    forSale: false, 
		                    status: 'AVAILABLE',
		                    price: parseFloat(rentalPrice) // <--- C'est ici la correction critique
		                });

		                Swal.fire({
		                    toast: true,
		                    icon: 'success',
		                    title: 'Moved back to Rental Fleet',
		                    position: 'top-end',
		                    timer: 2000,
		                    showConfirmButton: false
		                });
		                
		                // 3. Rafraîchissement automatique
		                await this.loadDataFromDB();
		                
		                // On force la vue sur l'onglet "Location" pour voir le changement
		                this.fleetFilter.mode = 'RENT'; 
		                this.renderAdminBikes(); 

		            } catch(e) { 
		                console.error(e);
		                Swal.fire('Error', 'Action failed', 'error'); 
		            }
		        }
		    },
			// --- FONCTION MAGIQUE DE RAFRAÎCHISSEMENT ---
			    async refreshUI() {
			        // 1. On affiche un petit chargement discret (optionnel)
			        // Swal.showLoading(); 

			        // 2. On retélécharge les données fraîches depuis la base de données
			        await this.loadDataFromDB(); 

			        // 3. On regarde sur quelle page on est (Rent ? Buy ? Admin ?)
			        const activeBtn = document.querySelector('.nav-item.active, .admin-nav-item.active');
			        
			        if (activeBtn) {
			            // 4. On redessine la page actuelle avec les nouvelles données
			            const viewName = activeBtn.dataset.view || activeBtn.getAttribute('onclick').match(/'([^']+)'/)[1];
			            this.nav(viewName);
			        } else {
			            // Par défaut si on ne trouve pas
			            this.nav('rent');
			        }
			    },
			async openEditModal(id) {
			        const bike = this.products.find(b => b.id == id);
			        if (!bike) return;

			        // --- SÉCURITÉ ADMIN : EIFFEL CORP UNIQUEMENT ---
			        // On vérifie si on est en mode Admin pour appliquer la restriction
			        const isAdminMode = !document.getElementById('admin-module').classList.contains('d-none');
			        
			        if (isAdminMode && bike.ownerName !== 'Eiffel Corp') {
			            return Swal.fire({
			                icon: 'warning',
			                title: 'Restricted Action',
			                text: 'You can only edit official "Eiffel Corp" bikes. Student or external bikes cannot be modified by admin.',
			                background: '#1a1a1a', 
			                color: '#fff'
			            });
			        }
			        // -----------------------------------------------

			        this.editImg = bike.image; 
			        const isAdmin = (this.user && (this.user.role === 'ADMIN' || this.user.role === 'ROLE_ADMIN'));
			        
			        let sellHtml = '';
			        if (isAdmin) {
			            sellHtml = `<div class="form-check text-start bg-warning bg-opacity-25 p-2 rounded border border-warning mb-3"><input class="form-check-input" type="checkbox" id="swal-forsale" ${bike.forSale ? 'checked' : ''}><label class="form-check-label fw-bold text-dark" for="swal-forsale">Put on sale (Exit rental)</label><div class="small text-dark mt-1">⚠ This bike will go to the "Buy" tab.</div></div>`;
			        }

			        const { value: formValues } = await Swal.fire({ 
			            title: isAdmin ? 'Manage Fleet Bike' : 'Edit Listing', 
			            html: `
			                <label class="small fw-bold">Model</label>
			                <input id="swal-model" class="form-control mb-2" value="${bike.model}">
			                <label class="small fw-bold">Price</label>
			                <input id="swal-price" type="number" class="form-control mb-2" value="${bike.price}">
			                ${sellHtml}
			                <input id="swal-file" type="file" class="form-control">
			            `, 
			            preConfirm: () => { 
			                const saleCheckbox = document.getElementById('swal-forsale'); 
			                return { 
			                    model: document.getElementById('swal-model').value, 
			                    price: document.getElementById('swal-price').value, 
			                    forSale: saleCheckbox ? saleCheckbox.checked : false 
			                }; 
			            } 
			        }); 

			        if (formValues) { 
			            // Si une nouvelle image est chargée (logique à ajouter si besoin, sinon on garde l'ancienne)
			            const updatedBike = { 
			                ...bike, 
			                model: formValues.model, 
			                price: parseFloat(formValues.price), 
			                forSale: formValues.forSale, 
			                image: this.editImg // Note: Pour l'instant l'upload image edit n'est pas implémenté complètement ici, on garde l'ancienne
			            }; 
			            
			            try { 
			                await API.createBike(updatedBike); 
			                await this.loadDataFromDB(); 
			                
			                // Rafraîchissement intelligent
			                if(isAdminMode) this.renderAdminBikes();
			                else this.nav('listings'); 
			                
			                Swal.fire('Success', 'Bike updated', 'success'); 
			            } catch(e){
			                Swal.fire('Error', 'Update failed', 'error');
			            } 
			        } 
			    },
				

    async deleteBike(id) { 
        if(await Swal.fire({title:'Delete?', icon:'warning', showCancelButton:true}).then(r=>r.isConfirmed)) { 
            const bike = this.products.find(b => b.id == id);
            try { await API.createBike({...bike, status:'DELETED'}); await this.loadDataFromDB(); this.nav('listings'); Swal.fire('Deleted'); } catch(e) {}
        }
    },
    
	/* REPLACE YOUR EXISTING joinWaitingList FUNCTION WITH THIS */

	async joinWaitingList(id) {
	    // 1. Vérification de la connexion
	    if(!this.user) return Swal.fire('Info', 'Please log in to join the waiting list.', 'info');
	    
	    // 2. Parse ID to ensure it is a number
	    const numericId = parseInt(id, 10);

	    // Debug log to check data types
	    console.log("Sending to API:", { email: this.user.email, bikeId: numericId });
	    
	    if (!this.user.email || !numericId) {
	        return Swal.fire('Error', 'User email or Bike ID is missing/invalid.', 'error');
	    }

	    try {
	        // We use the numericId here
	        await API.joinWaitingList(this.user.email, numericId);
	        
	        if(this.user.isPro) {
	            Swal.fire('Priority Confirmed', 'As a PRO member, you are placed at the top of the waiting list 👑', 'success');
	        } else {
	            Swal.fire('Signed up', 'You will be notified when the bike is available.', 'success');
	        }
	    } catch(e) { 
	        console.error("API Error:", e);
	        // Show the actual error message from server if available
	        Swal.fire('Error', e.message || 'Unable to join list.', 'error'); 
	    }
	},

    async openRentalWizard(id) {
        if(!this.user) return Swal.fire('Error', 'Log in to rent.', 'warning');
        const bike = this.products.find(i => i.id == id); if(!bike) return;
        
        this.existingRentalsForBike = await API.getBikeRentals(id);
        this.currentRental = { bike: bike, delivery: false, days: 1, rentalPrice: 0, deposit: 200, totalToPay: 0, address: '', startDate: '', endDate: '' };
        const modal = new bootstrap.Modal(document.getElementById('modal-detail'));
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('d-title').innerText = bike.model; document.getElementById('d-price').innerText = bike.price + " € / day"; document.getElementById('d-owner').innerText = bike.ownerName; 
        
        let imageUrl = bike.image;
        if (bike.image && !bike.image.startsWith('http') && !bike.image.startsWith('data:')) { imageUrl = UPLOADS_BASE_URL + bike.image; }
        document.getElementById('d-img').src = imageUrl; 

        const container = document.getElementById('d-actions');
        if (bike.status === 'MAINTENANCE') {
            container.innerHTML = `<div class="alert alert-warning">This bike is no longer available.</div>`;
        } else {
            const userAddr = this.user.address || "";
            // --- CLEANED MODAL ---
            const reviewHtml = `<hr class="my-4"><div id="reviews-container" class="mt-3"></div>`;
            
            container.innerHTML = `<div class="bg-light p-3 rounded mb-3"><div class="alert alert-info py-2 small mb-3">€200 Caution retained.</div><label class="small fw-bold mb-1">Dates</label><div class="input-group mb-3"><input type="date" id="rent-start" class="form-control form-control-sm" min="${today}" onchange="App.updateRentalCalc()"><span class="input-group-text">-</span><input type="date" id="rent-end" class="form-control form-control-sm" min="${today}" onchange="App.updateRentalCalc()"></div><div id="date-error" class="small mb-2 d-none"></div><label class="small fw-bold mb-1">Logistics</label><div class="btn-group w-100 mb-3"><input type="radio" class="btn-check" name="logistics" id="mode-pickup" checked onchange="App.updateRentalCalc()"><label class="btn btn-outline-secondary btn-sm" for="mode-pickup">Pickup</label><input type="radio" class="btn-check" name="logistics" id="mode-deliv" onchange="App.updateRentalCalc()"><label class="btn btn-outline-secondary btn-sm" for="mode-deliv">Delivery (+25€)</label></div><div id="delivery-box" class="d-none"><label class="small fw-bold">Address</label><input id="rent-address" class="form-control form-control-sm mb-2" placeholder="Address..." value="${userAddr}"><div class="form-check"><input class="form-check-input" type="checkbox" id="save-addr"><label class="form-check-label small text-muted">Update profile</label></div></div></div><div class="d-flex justify-content-between align-items-center mb-1"><span class="small">Loc + Deliv :</span><span class="fw-bold" id="rent-cost">0.00 €</span></div><div class="d-flex justify-content-between align-items-center mb-3"><span class="small">Caution :</span><span class="fw-bold text-muted">200.00 €</span></div><div class="d-flex justify-content-between align-items-center mb-3 pt-2 border-top"><span class="fw-bold">TOTAL :</span><span class="fs-4 fw-bold text-primary" id="rent-total">200.00 €</span></div><button id="btn-rent-confirm" class="btn btn-dark w-100 py-2" disabled onclick="App.processRentalPayment()">Pay</button> ${reviewHtml}`;
            setTimeout(() => this.setupAddress('rent-address'), 500);
        }
        modal.show();
        // Rental Mode: Read/Write possible (false) -> Uses "reviews-container"
        this.renderReviews(bike.id, false, 'reviews-container');
    },

	updateRentalCalc() {
	        const sVal = document.getElementById('rent-start').value; 
	        const eVal = document.getElementById('rent-end').value; 
	        const deliv = document.getElementById('mode-deliv').checked;
	        const box = document.getElementById('delivery-box'); 
	        const btn = document.getElementById('btn-rent-confirm');
	        const errDiv = document.getElementById('date-error');

	        // --- 1. Gestion Affichage Livraison ---
	        if(deliv) box.classList.remove('d-none'); else box.classList.add('d-none');
	        
	        // --- 2. Validation de base ---
	        if (!sVal || !eVal) { 
	            btn.disabled = true; 
	            document.getElementById('rent-total').innerText = "---"; 
	            return; 
	        }
	        
	        const s = new Date(sVal); const e = new Date(eVal);
	        if (e < s) { 
	            btn.disabled = true; 
	            return Swal.fire('Error', 'Invalid dates', 'error'); 
	        }

	        // --- 3. Vérification Conflits ---
	        const isConflict = this.existingRentalsForBike.some(r => {
	            if(['FINISHED','CANCELLED'].includes(r.status)) return false; 
	            const rStart = new Date(r.startDate); const rEnd = new Date(r.endDate);
	            return (s <= rEnd && e >= rStart);
	        });

	        if (isConflict) {
	            btn.disabled = true;
	            errDiv.classList.remove('d-none');
	            errDiv.innerHTML = `<div class="alert alert-warning mt-2"><strong>Unavailable.</strong><br>This bike is already rented.<br><button class="btn btn-sm btn-outline-dark mt-2" onclick="App.joinWaitingList(${this.currentRental.bike.id})"><i class="far fa-bell"></i> Alert me</button></div>`;
	            return;
	        } else {
	            errDiv.classList.add('d-none');
	            errDiv.innerHTML = "";
	        }

	        // --- 4. CALCUL FINANCIER (C'est ici la correction) ---
	        
	        // A. Récupération des taux et devises
	        const rate = this.currencyRates[this.currency] || 1;
	        const symbol = this.currencySymbols[this.currency] || '€';

	        // B. Calculs de base (en EUROS)
	        const days = Math.ceil(Math.abs(e - s) / (86400000)) + 1;
	        const baseRentalPrice = (days * this.currentRental.bike.price);
	        const baseDeliveryPrice = (deliv ? 25 : 0);
	        const baseDeposit = 200.0; // Caution de base en EUR

	        // C. Conversion dans la devise choisie
	        // On convertit chaque partie pour l'affichage et le total
	        const finalRentalPrice = (baseRentalPrice * rate);
	        const finalDeliveryPrice = (baseDeliveryPrice * rate);
	        const finalDeposit = (baseDeposit * rate);
	        
	        // Total à payer dans la devise choisie
	        const totalToPay = finalRentalPrice + finalDeliveryPrice + finalDeposit;

	        // D. Mise à jour de l'objet global (pour l'envoi au backend)
	        this.currentRental.days = days; 
	        // Note: On stocke les valeurs converties pour que le paiement Stripe corresponde
	        this.currentRental.rentalPrice = (finalRentalPrice + finalDeliveryPrice); 
	        this.currentRental.deposit = finalDeposit; 
	        this.currentRental.totalToPay = totalToPay; 
	        this.currentRental.delivery = deliv; 
	        this.currentRental.startDate = sVal; 
	        this.currentRental.endDate = eVal;
	        
	        // --- 5. Mise à jour de l'AFFICHAGE (HTML) ---
	        // Affichage Location + Livraison
	        document.getElementById('rent-cost').innerText = (finalRentalPrice + finalDeliveryPrice).toFixed(2) + " " + symbol; 
	        
	        // Affichage de la Caution (C'était fixe à 200, maintenant c'est dynamique)
	        // Il faut s'assurer que le HTML contient un ID ou le cibler correctement.
	        // Dans votre renderRent précédent, la caution était en dur dans le HTML.
	        // Je vais cibler l'élément qui contient "Caution :"
	        const cautionElement = document.querySelector('#d-actions .text-muted'); 
	        if(cautionElement) cautionElement.innerText = finalDeposit.toFixed(2) + " " + symbol;

	        // Affichage du Total
	        document.getElementById('rent-total').innerText = totalToPay.toFixed(2) + " " + symbol; 
	        
	        btn.disabled = false; 
	        btn.innerHTML = `Pay ${totalToPay.toFixed(2)} ${symbol}`;
	    },

    processRentalPayment() {
        if (this.currentRental.delivery) {
            const addr = document.getElementById('rent-address').value;
            if (addr.length < 5) return Swal.fire('Oops', 'Address required', 'warning');
            this.currentRental.address = addr;
            if (document.getElementById('save-addr').checked) API.updateProfile({ email: this.user.email, address: addr }).then(u => this.login({...this.user, ...u}));
        }
        const detailModal = bootstrap.Modal.getInstance(document.getElementById('modal-detail'));
        if(detailModal) detailModal.hide();
        setTimeout(() => { this.triggerPayment('RENTAL', this.currentRental.totalToPay, this.currentRental); }, 300);
    },

	// --- HISTORY AND ACTIVE RENTALS ---
	    renderMyRentals(c) {
	        if(!this.user) { c.innerHTML = '<div class="text-center mt-5">Log in to see your rentals.</div>'; return; }
	        
	        API.getUserRentals(this.user.email).then(rentals => {
	            const active = rentals.filter(r => r.status === 'ACTIVE');
	            const history = rentals.filter(r => r.status === 'FINISHED');
	            
	            let html = '<h3 class="mb-4 fw-bold">My Rentals</h3>';
	            
	            // --- 1. ACTIVE SECTION ---
	            html += '<h5 class="text-primary mb-3"><i class="fas fa-clock"></i> Current</h5>';
	            if (active.length === 0) html += '<div class="alert alert-light border mb-5">No active rentals.</div>';
	            else {
	                html += '<div class="d-flex flex-column gap-3 mb-5">';
	                html += active.map(r => {
	                    let img = r.bike.image; 
	                    if (img && !img.startsWith('http') && !img.startsWith('data:')) img = UPLOADS_BASE_URL + img;
	                    
	                    return `
	                    <div class="card border-0 shadow-sm overflow-hidden">
	                        <div class="row g-0">
	                            <div class="col-md-3 bg-light d-flex align-items-center justify-content-center">
	                                <img src="${img}" style="width:100%; height:140px; object-fit:cover;" onerror="this.src='https://via.placeholder.com/150'">
	                            </div>
	                            <div class="col-md-6 p-3 d-flex flex-column justify-content-center">
	                                <h5 class="fw-bold mb-1">${r.bike.model}</h5>
	                                <div class="text-muted small mb-2">
	                                    <i class="fas fa-calendar-alt"></i> From <b>${r.startDate}</b> to <b>${r.endDate}</b>
	                                </div>
	                                <div><span class="badge bg-success bg-opacity-10 text-success border border-success">ACTIVE</span></div>
	                            </div>
	                            <div class="col-md-3 p-3 bg-light d-flex align-items-center justify-content-center">
	                                <button class="btn btn-outline-danger fw-bold w-100" onclick="App.returnBike(${r.id})">Return bike</button>
	                            </div>
	                        </div>
	                    </div>`;
	                }).join('');
	                html += '</div>';
	            }

	            // --- 2. HISTORY SECTION (IMPROVED) ---
	            html += '<h5 class="text-secondary mb-3 pt-3 border-top"><i class="fas fa-history"></i> History</h5>';
	            
	            if (history.length === 0) {
	                html += '<p class="text-muted small">You don\'t have a history yet.</p>';
	            } else {
	                html += '<div class="row row-cols-1 row-cols-md-2 g-4">';
	                
	                html += history.map(r => {
	                    let img = r.bike.image; 
	                    if (img && !img.startsWith('http') && !img.startsWith('data:')) img = UPLOADS_BASE_URL + img;
	                    
	                    // VERIFICATION : Does this bike still exist in current catalogue?
	                    // We search in 'this.products' which contains available/rented bikes (not deleted/sold)
	                    const bikeStillExists = this.products.find(b => b.id === r.bike.id);
	                    
	                    let actionButton;
	                    if (bikeStillExists) {
	                        // Bike is here -> Button to re-rent
	                        actionButton = `
	                        <button class="btn btn-sm btn-outline-primary w-100 mt-2" onclick="App.openRentalWizard(${r.bike.id})">
	                            <i class="fas fa-redo"></i> Rent again
	                        </button>`;
	                    } else {
	                        // Bike is no longer in the list -> Message
	                        actionButton = `
	                        <div class="alert alert-secondary py-1 px-2 mt-2 mb-0 small text-center text-muted" style="font-size: 0.8rem;">
	                            <i class="fas fa-ban"></i> This bike is no longer available
	                        </div>`;
	                    }

	                    return `
	                    <div class="col">
	                        <div class="card h-100 shadow-sm border-0">
	                            <div class="row g-0 h-100">
	                                <div class="col-4">
	                                    <img src="${img}" class="img-fluid rounded-start h-100" style="object-fit:cover; min-height:120px;" onerror="this.src='https://via.placeholder.com/150'">
	                                </div>
	                                <div class="col-8">
	                                    <div class="card-body p-3 d-flex flex-column h-100">
	                                        <h6 class="card-title fw-bold text-truncate mb-1">${r.bike.model}</h6>
	                                        <p class="card-text small text-muted mb-2">Finished on ${r.endDate}</p>
	                                        <div class="mt-auto">
	                                            ${actionButton}
	                                        </div>
	                                    </div>
	                                </div>
	                            </div>
	                        </div>
	                    </div>`;
	                }).join('');
	                
	                html += '</div>';
	            }
	            
	            c.innerHTML = html;
	        });
	    },

    async returnBike(id) {
        if(await Swal.fire({title:'Return ?', showCancelButton:true}).then(r=>r.isConfirmed)) {
            try { await API.returnRental(id); Swal.fire('Returned !'); await this.loadDataFromDB(); this.nav('my-rentals'); } catch(e) {}
        }
    },

    // --- UPDATE : IMPROVED ACCESSORIES DISPLAY ---
	renderAcc(c) {
	        // --- HTML HEADER WITH SELECTOR ---
	        const header = `<div class="d-flex justify-content-between align-items-center mb-4"><div><h3 class="fw-bold m-0">Accessories</h3><p class="text-muted small">Equip your journey.</p></div><div>${this.getCurrencySelectorHTML()}</div></div>`;
	        
	        const grid = this.accessories.length ? `<div class="row row-cols-1 row-cols-md-3 row-cols-lg-4 g-4">${this.accessories.map(i => {
	            // --- PRICE CALCULATION ---
	            const convertedPrice = (i.price * (this.currencyRates[this.currency]||1)).toFixed(2);
	            const symbol = this.currencySymbols[this.currency] || '€';
	            
	            let img = i.image; if(img && !img.startsWith('http') && !img.startsWith('data:')) img = UPLOADS_BASE_URL + img;
	            return `
	            <div class="col">
	                <div class="card h-100 border-0 shadow-sm product-card">
	                    <div class="card-img-top p-4 d-flex align-items-center justify-content-center position-relative" style="height: 220px; background:#ffffff;">
	                        <img src="${img}" style="max-width:100%; max-height:100%; object-fit:contain;">
	                    </div>
	                    <div class="card-body d-flex flex-column p-4 border-top">
	                        <h6 class="card-title fw-bold text-dark text-truncate mb-3">${i.name}</h6>
	                        <div class="mt-auto">
	                            <div class="d-flex justify-content-between align-items-center mb-3">
	                                <span class="fs-4 fw-bold text-primary">${symbol} ${convertedPrice}</span>
	                            </div>
	                            <div class="d-flex gap-2">
	                                <button class="btn btn-outline-dark flex-fill shadow-sm" onclick="event.stopPropagation(); App.addToCart(${i.id},'accessory')"><i class="fas fa-cart-plus me-1"></i></button>
	                                <button class="btn btn-success flex-fill fw-bold shadow-sm" onclick="event.stopPropagation(); App.buyAccessory(${i.id})">Buy</button>
	                            </div>
	                        </div>
	                    </div>
	                </div>
	            </div>`;
	        }).join('')}</div>` : '<div class="text-center p-5 bg-light rounded">No accessories.</div>';
	        c.innerHTML = header + grid;
	    },

		// --- BUY PAGE (USED) ---
		// --- BUY PAGE (CORRECTED) ---
		// --- BUY PAGE (MODIFIED : TYPE FILTER ADDED) ---
		// --- BUY PAGE (CORRECTED: SHOWS DETAILS/REVIEWS BEFORE PAYMENT) ---
		renderBuy(c) {
		    let items = this.products.filter(p => p.forSale === true && p.status !== 'SOLD');
		    
		    // 1. Search Filter
		    if (this.filters.search) {
		        items = items.filter(i => i.model.toLowerCase().includes(this.filters.search.toLowerCase()));
		    }

		    // 2. Type Filter
		    if (this.filters.type === 'ELEC') {
		        items = items.filter(i => i.type === 'Electrique');
		    } else if (this.filters.type === 'MECA') {
		        items = items.filter(i => i.type !== 'Electrique');
		    }

		    // 3. Sort
		    const sortMode = this.filters.sort || 'ASC';
		    items.sort((a, b) => {
		        const isA_Pro = a.ownerIsPro ? true : false;
		        const isB_Pro = b.ownerIsPro ? true : false;
		        if (isA_Pro && !isB_Pro) return -1;
		        if (!isA_Pro && isB_Pro) return 1;
		        if (sortMode === 'ASC') return a.price - b.price;
		        if (sortMode === 'DESC') return b.price - a.price;
		        return 0;
		    });

		    const rate = this.currencyRates[this.currency] || 1;
		    const symbol = this.currencySymbols[this.currency] || '€';

		    let html = `
		    <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3 border-bottom pb-3">
		        <div>
		            <h3 class="fw-bold m-0 text-dark">Buy a bike</h3>
		            <span class="badge bg-success bg-opacity-10 text-success">Guaranteed Used</span>
		        </div>
		        
		        <div class="d-flex gap-2">
		            <input type="text" class="form-control form-control-sm" placeholder="Search..." 
		                   value="${this.filters.search}" 
		                   oninput="App.setSearch(this.value, 'buy')" 
		                   autocomplete="off">
		            
		            <select class="form-select form-select-sm" style="width:auto;" onchange="App.setFilter(this.value, 'buy')">
		                <option value="ALL" ${this.filters.type==='ALL'?'selected':''}>All types</option>
		                <option value="ELEC" ${this.filters.type==='ELEC'?'selected':''}>⚡ Electric</option>
		                <option value="MECA" ${this.filters.type==='MECA'?'selected':''}>⚙️ Mechanical</option>
		            </select>

		            <select class="form-select form-select-sm" style="width:auto;" onchange="App.setSort(this.value, 'buy')">
		                <option value="ASC" ${sortMode==='ASC'?'selected':''}>Price Ascending</option>
		                <option value="DESC" ${sortMode==='DESC'?'selected':''}>Price Descending</option>
		            </select>

		            ${this.getCurrencySelectorHTML()}
		        </div>
		    </div>`;

		    if (items.length === 0) {
		        html += '<div class="text-center p-5 text-muted bg-light rounded">No bikes match your criteria.</div>';
		    } else {
		        html += '<div class="row row-cols-1 row-cols-md-3 row-cols-lg-4 g-4">';
		        html += items.map(i => {
		            const convertedPrice = (i.price * rate).toFixed(2);
		            let img = i.image;
		            if (img && !img.startsWith('http') && !img.startsWith('data:')) img = UPLOADS_BASE_URL + img;

		            return `
		            <div class="col">
		                <div class="card h-100 border-0 shadow-sm product-card bg-white" style="cursor: pointer;" onclick="App.openBuyDetails(${i.id})">
		                    <div class="position-relative overflow-hidden bg-light" style="height:220px;">
		                        <span class="badge bg-success position-absolute top-0 start-0 m-2 shadow-sm">For Sale</span>
		                        <img src="${img}" class="w-100 h-100 object-fit-cover" onerror="this.src='https://via.placeholder.com/300x200?text=Bike'">
		                        
		                        <div class="position-absolute bottom-0 end-0 m-2">
		                            <button class="btn btn-light btn-sm rounded-circle shadow-sm"><i class="fas fa-eye text-primary"></i></button>
		                        </div>
		                    </div>
		                    <div class="card-body d-flex flex-column">
		                        <div class="d-flex justify-content-between mb-2">
		                            <small class="text-muted fw-bold text-uppercase" style="font-size:0.7rem">${i.type}</small>
		                            <span class="fw-bold text-success fs-5">${symbol} ${convertedPrice}</span>
		                        </div>
		                        <h5 class="card-title fw-bold mb-3 text-truncate text-dark">${i.model}</h5>
		                        
		                        <div class="mt-auto d-grid gap-2">
		                            <button class="btn btn-success fw-bold btn-sm py-2" onclick="event.stopPropagation(); App.openBuyDetails(${i.id})">
		                                View Details & Buy
		                            </button>
		                            <button class="btn btn-outline-dark btn-sm" onclick="event.stopPropagation(); App.addToCart(${i.id}, 'bike')">
		                                <i class="fas fa-cart-plus"></i>
		                            </button>
		                        </div>
		                    </div>
		                </div>
		            </div>`;
		        }).join('');
		        html += '</div>';
		    }

		    c.innerHTML = html;
		    
		    // Focus search restoration
		    const input = document.querySelector('input[placeholder="Search..."]');
		    if (input && this.filters.search) {
		        input.focus();
		        const val = input.value;
		        input.value = '';
		        input.value = val;
		    }
		},

			// A ajouter dans l'objet App
			getFilteredBikes() {
			    const f = this.fleetFilter;
			    let bikes = this.products.filter(p => p.status !== 'DELETED');

			    // 1. Mode (Location vs Vente)
			    if (f.mode === 'RENT') bikes = bikes.filter(b => !b.forSale);
			    else bikes = bikes.filter(b => b.forSale);

			    // 2. Recherche (Insensible à la casse)
			    if (f.search) {
			        const s = f.search.toLowerCase();
			        bikes = bikes.filter(b => b.model.toLowerCase().includes(s));
			    }

			    // 3. Type (Gestion robuste des synonymes)
			    if (f.type !== 'ALL') {
			        bikes = bikes.filter(b => {
			            const t = (b.type || '').toUpperCase(); // Normalisation
			            const isElec = t.includes('ELEC') || t.includes('ELECTRIQUE') || t.includes('ELECTRIC');
			            return (f.type === 'ELEC') ? isElec : !isElec;
			        });
			    }

			    // 4. Propriétaire (Liste unifiée ici !)
			    const officials = ['GustaveBike', 'ADMIN', 'Université', 'Admin', 'Eiffel Corp', 'ROLE_ADMIN'];
			    if (f.owner === 'GUSTAVE') bikes = bikes.filter(b => officials.includes(b.ownerName));
			    else if (f.owner === 'EXTERNAL') bikes = bikes.filter(b => !officials.includes(b.ownerName));

			    return bikes;
			},
			// --- Prépare les données pour ressaisir une offre refusée ---
			    retryProposal(id) {
			        const bike = this.products.find(p => p.id === id);
			        if (bike) {
			            // On sauvegarde le vélo dans une variable temporaire de l'app
			            this.proposalToRetry = bike;
			            // On redirige vers le formulaire de vente
			            this.nav('sell-proposal');
			        }
			    },
    // --- EXTERNAL PROPOSALS MANAGEMENT (SELL A BIKE) ---
	// 2. FORM: Handle New Proposal OR Modification
	    renderSellProposal(c) {
	        // --- A. PRE-FILL LOGIC ---
	        const retryData = this.proposalToRetry;
	        this.proposalToRetry = null; // Clear after use

	        let defModel = '', defType = 'Mecanique', defPrice = '', defPhone = '', defIban = '', defImg = null;
	        
	        if (retryData) {
	            defModel = retryData.model;
	            // Adjust type matching based on your DB values
	            defType = (retryData.type === 'Electrique' || retryData.type === 'Electric') ? 'Electrique' : 'Mecanique'; 
	            defPrice = retryData.price;
	            defImg = retryData.image; 

	            // Parse Description to recover IBAN and Phone
	            if (retryData.description) {
	                const parts = retryData.description.split('|');
	                parts.forEach(part => {
	                    if (part.trim().startsWith('TEL:')) defPhone = part.replace('TEL:', '').trim();
	                    if (part.trim().startsWith('IBAN:')) defIban = part.replace('IBAN:', '').trim();
	                });
	            }
	            
	            Swal.fire({
	                toast: true, position: 'top-end', icon: 'info', 
	                title: 'Editing Offer', text: 'Update the necessary information.',
	                showConfirmButton: false, timer: 3000
	            });
	        }

	        // --- B. HTML INJECTION (ENGLISH) ---
	        c.innerHTML = `
	        <div class="row justify-content-center animate__animated animate__fadeIn">
	            <div class="col-md-8">
	                <div class="card border-0 shadow-sm p-4">
	                    <h3 class="fw-bold mb-3 text-success">
	                        ${retryData ? '<i class="fas fa-redo me-2"></i>Modify & Resubmit' : 'Sell my bike'}
	                    </h3>
	                    <p class="text-muted mb-4">Fill out this form. Our team will review your bike.</p>
	                    
	                    <form id="form-proposal">
	                        <div class="row g-3">
	                            <div class="col-md-6">
	                                <label class="small fw-bold">Model / Brand</label>
	                                <input type="text" id="prop-model" class="form-control" required value="${defModel}" placeholder="Ex: Rockrider ST100">
	                            </div>
	                            <div class="col-md-6">
	                                <label class="small fw-bold">Type</label>
	                                <select id="prop-type" class="form-select">
	                                    <option value="Mecanique" ${defType==='Mecanique'?'selected':''}>Mechanical</option>
	                                    <option value="Electrique" ${defType==='Electrique'?'selected':''}>Electric</option>
	                                </select>
	                            </div>
	                            <div class="col-md-6">
	                                <label class="small fw-bold">Requested Price (€)</label>
	                                <input type="number" id="prop-price" class="form-control" required value="${defPrice}" placeholder="Your price?">
	                            </div>

	                            <div class="col-12 mt-4">
	                                <div class="d-flex justify-content-between align-items-center mb-2">
	                                    <h6 class="small fw-bold text-primary m-0">Contact & Payment</h6>
	                                    <div class="form-check form-switch">
	                                        <input class="form-check-input" type="checkbox" id="use-profile-prop">
	                                        <label class="form-check-label small" for="use-profile-prop">Use my profile info</label>
	                                    </div>
	                                </div>
	                            </div>

	                            <div class="col-md-6">
	                                <label class="small fw-bold">Phone Number</label>
	                                <input type="tel" id="prop-phone" class="form-control" required value="${defPhone}" placeholder="06 12 34 56 78">
	                                <div id="err-phone-prop" class="text-danger small" style="display:none; font-size:0.75rem;">Invalid Number</div>
	                            </div>

	                            <div class="col-12">
	                                <label class="small fw-bold">IBAN (for transfer)</label>
	                                <input type="text" id="prop-iban" class="form-control" required value="${defIban}" placeholder="FR76 ...." style="text-transform:uppercase;">
	                                <div id="err-iban-prop" class="text-danger small" style="display:none; font-size:0.75rem;">Invalid IBAN</div>
	                            </div>
	                            
	                            <div class="col-12">
	                                <div class="form-check">
	                                    <input class="form-check-input" type="checkbox" id="save-prop-info">
	                                    <label class="form-check-label small text-muted" for="save-prop-info">
	                                        Update my profile with this data
	                                    </label>
	                                </div>
	                            </div>

	                            <div class="col-12 mt-3">
	                                <label class="small fw-bold">Bike Photo</label>
	                                ${retryData ? '<div class="small text-success mb-1"><i class="fas fa-check"></i> Previous image kept (upload new to change)</div>' : ''}
	                                <input type="file" id="prop-file" class="form-control" ${retryData ? '' : 'required'}>
	                            </div>
	                            
	                            <div class="col-12 mt-4">
	                                <button type="submit" class="btn btn-success w-100 py-2 fw-bold">
	                                    ${retryData ? 'Update & Resend' : 'Send Proposal'}
	                                </button>
	                            </div>
	                        </div>
	                    </form>
	                </div>
	            </div>
	        </div>`;

	        // --- C. LOGIC HANDLERS ---
	        let propImg = defImg; 
	        const propFileInput = document.getElementById('prop-file');
	        if (propFileInput) {
	             propFileInput.onchange = (e) => { 
	                const reader = new FileReader(); 
	                reader.onload = () => { propImg = reader.result; }; 
	                reader.readAsDataURL(e.target.files[0]); 
	            };
	        }

	        const switchProp = document.getElementById('use-profile-prop');
	        if(switchProp) {
	            switchProp.onchange = (e) => {
	                if (e.target.checked) {
	                    document.getElementById('prop-phone').value = this.user.phone || '';
	                    document.getElementById('prop-iban').value = this.user.iban || '';
	                } else {
	                    document.getElementById('prop-phone').value = defPhone;
	                    document.getElementById('prop-iban').value = defIban;
	                }
	            };
	        }

	        // --- D. SUBMISSION ---
	        const formProp = document.getElementById('form-proposal');
	        if (formProp) {
	            formProp.onsubmit = async (e) => {
	                e.preventDefault(); 

	                if (!propImg) return Swal.fire('Oops', 'Photo required.', 'warning');
	                
	                // Profile update if checked
	                if (document.getElementById('save-prop-info').checked) {
	                    try {
	                        const updatedUser = await API.updateProfile({
	                            email: this.user.email,
	                            phone: document.getElementById('prop-phone').value,
	                            iban: document.getElementById('prop-iban').value
	                        });
	                        this.login({ ...this.user, ...updatedUser }); 
	                    } catch (err) {}
	                }

	                const proposal = { 
	                    // CRITICAL: Send ID if updating, null if new
	                    id: retryData ? retryData.id : null, 
	                    model: document.getElementById('prop-model').value, 
	                    type: document.getElementById('prop-type').value, 
	                    price: parseFloat(document.getElementById('prop-price').value), 
	                    salePrice: 0, 
	                    image: propImg,
	                    description: `IBAN: ${document.getElementById('prop-iban').value} | TEL: ${document.getElementById('prop-phone').value}`, 
	                    ownerName: this.user.username, 
	                    status: "PROPOSAL", // Force status back to PROPOSAL
	                    forSale: false 
	                };
	                
	                try { 
	                    await API.createBike(proposal); 
	                    Swal.fire({
	                        icon: 'success', title: 'Sent!', 
	                        text: 'Your offer is under review.', 
	                        timer: 2000, showConfirmButton: false
	                    });
	                    this.nav('my-proposals'); 
	                } catch(err) { 
	                    Swal.fire('Error', 'Submission failed.', 'error'); 
	                }
	            };
	        }
	    },
	renderMyProposals(c) {
	        const myProps = this.products.filter(p => p.ownerName === this.user.username && ['PROPOSAL', 'REFUSED', 'ACCEPTED_BY_ADMIN'].includes(p.status));
	        
	        c.innerHTML = `
	            <div class="d-flex justify-content-between align-items-center mb-4">
	                <h3 class="fw-bold m-0">Offer Tracking</h3>
	                <button class="btn btn-outline-success btn-sm" onclick="App.nav('sell-proposal')">+ New offer</button>
	            </div>
	            ${myProps.length === 0 
	                ? '<div class="alert alert-light text-center py-5 border">You have no offers in progress.</div>' 
	                : `<div class="d-flex flex-column gap-3 animate__animated animate__fadeIn">
	                    ${myProps.map(p => { 
	                        let badge, statusText, actionHtml = '';
	                        
	                        if(p.status === 'ACCEPTED_BY_ADMIN') { 
	                            badge = '<span class="badge bg-success">Accepted & Paid</span>'; 
	                            statusText = "Congratulations! The transfer is in progress."; 
	                        } 
	                        else if (p.status === 'REFUSED') { 
	                            badge = '<span class="badge bg-danger">Refused</span>'; 
	                            statusText = "This offer was not accepted.";
	                            // BOUTON AJOUTÉ ICI POUR LE REFUS
	                            actionHtml = `
	                                <button class="btn btn-sm btn-outline-dark mt-2" onclick="App.retryProposal(${p.id})">
	                                    <i class="fas fa-redo me-1"></i> Modify & Retry
	                                </button>`;
	                        } 
	                        else {
	                            badge = '<span class="badge bg-warning text-dark">Pending</span>'; 
	                            statusText = "The GustaveBike team is reviewing your offer.";
	                        }
	                        
	                        // Gestion de l'image
	                        let img = p.image;
	                        if (img && !img.startsWith('http') && !img.startsWith('data:')) img = UPLOADS_BASE_URL + img;

	                        return `
	                        <div class="card border-0 shadow-sm overflow-hidden">
	                            <div class="row g-0 align-items-center">
	                                <div class="col-md-2">
	                                    <img src="${img}" style="width:100%; height:100px; object-fit:cover;" onerror="this.src='https://via.placeholder.com/150'">
	                                </div>
	                                <div class="col-md-8 p-3">
	                                    <div class="d-flex align-items-center gap-2 mb-1">
	                                        <h5 class="fw-bold m-0">${p.model}</h5>
	                                        ${badge}
	                                    </div>
	                                    <div class="d-flex justify-content-between align-items-center">
	                                        <div>
	                                            <div class="small text-muted">Proposed price: <strong>${p.price}€</strong></div>
	                                            <div class="small mt-1 text-secondary">${statusText}</div>
	                                        </div>
	                                        <div>${actionHtml}</div>
	                                    </div>
	                                </div>
	                            </div>
	                        </div>`; 
	                    }).join('')}
	                </div>`
	            }`;
	    },

	renderSupport(c) {
	        // 1. Prepare user data
	        const isLogged = this.user !== null;
	        const emailValue = isLogged ? this.user.email : "";
	        const readOnly = isLogged ? "readonly disabled" : ""; // Locked if connected
	        const userType = isLogged ? (this.user.email.endsWith('@edu.univ-eiffel.fr') ? "Student" : "Member") : "External Visitor";

	        // 2. HTML Injection
	        c.innerHTML = `
	        <div class="row g-4 justify-content-center">
	            <div class="col-md-7">
	                <div class="card border-0 shadow-sm p-4 h-100">
	                    <h4 class="fw-bold mb-3 text-dark">Need help?</h4>
	                    <p class="text-muted small mb-4">Send a message directly to the administration.</p>
	                    
	                    <form id="form-support">
	                        <div class="mb-3">
	                            <label class="small fw-bold">Your Email</label>
	                            <input type="email" id="sup-email" class="form-control" value="${emailValue}" ${readOnly} required placeholder="contact@example.com">
	                            ${!isLogged ? '<div class="form-text small">We will reply to you at this address.</div>' : ''}
	                        </div>

	                        <div class="mb-3">
	                            <label class="small fw-bold">Subject</label>
	                            <select id="sup-subject" class="form-select">
	                                <option value="Technique">Technical problem / Bug</option>
	                                <option value="Location">Question about a rental</option>
	                                <option value="Vente">Problem during a sale</option>
	                                <option value="Paiement">Payment problem</option>
	                                <option value="Autre">Other request</option>
	                            </select>
	                        </div>

	                        <div class="mb-3">
	                            <label class="small fw-bold">Message</label>
	                            <textarea id="sup-msg" class="form-control" rows="5" required placeholder="Detail your problem here..."></textarea>
	                        </div>

	                        <input type="hidden" id="sup-type" value="${userType}">

	                        <button type="submit" class="btn btn-dark w-100 py-2 fw-bold" id="btn-sup-send">
	                            <i class="fas fa-paper-plane me-2"></i> Send
	                        </button>
	                    </form>
	                </div>
	            </div>

	            <div class="col-md-5">
	                <div class="card border-0 shadow-sm p-4 h-100 bg-light">
	                    <h4 class="fw-bold mb-3">FAQ</h4>
	                    <div class="accordion accordion-flush" id="faqAcc">
	                        <div class="accordion-item bg-transparent border-bottom">
	                            <h2 class="accordion-header"><button class="accordion-button collapsed bg-transparent shadow-none fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#q1">Who can rent?</button></h2>
	                            <div id="q1" class="accordion-collapse collapse" data-bs-parent="#faqAcc"><div class="accordion-body small text-muted">Only students and staff (@edu.univ-eiffel.fr).</div></div>
	                        </div>
	                        <div class="accordion-item bg-transparent border-bottom">
	                            <h2 class="accordion-header"><button class="accordion-button collapsed bg-transparent shadow-none fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#q2">Deposit debited?</button></h2>
	                            <div id="q2" class="accordion-collapse collapse" data-bs-parent="#faqAcc"><div class="accordion-body small text-muted">No, it is a bank pre-authorization. Debited only in case of theft/damage.</div></div>
	                        </div>
	                    </div>
	                    <div class="mt-auto pt-4 text-center">
	                        <div class="p-3 bg-white rounded border shadow-sm">
	                            <small class="text-uppercase fw-bold text-muted" style="font-size:0.7rem;">Emergency</small>
	                            <div class="fs-5 fw-bold text-dark mt-1"><i class="fas fa-phone-alt text-success"></i> 01 60 95 75 00</div>
	                        </div>
	                    </div>
	                </div>
	            </div>
	        </div>`;

	        // 3. Send handling
	        document.getElementById('form-support').onsubmit = async (e) => {
	            e.preventDefault();
	            
	            const btn = document.getElementById('btn-sup-send');
	            const originalText = btn.innerHTML;
	            
	            // Loading animation
	            btn.disabled = true;
	            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Sending...';

	            const payload = {
	                email: document.getElementById('sup-email').value,
	                subject: document.getElementById('sup-subject').value,
	                message: document.getElementById('sup-msg').value,
	                userType: document.getElementById('sup-type').value
	            };

	            try {
	                await API.sendSupportMessage(payload);
	                Swal.fire({ icon: 'success', title: 'Message sent !', text: 'Administration has received your request.', showConfirmButton: false, timer: 2000 });
	                document.getElementById('sup-msg').value = ''; // Clear message
	            } catch (err) {
	                Swal.fire('Error', 'Unable to send message.', 'error');
	            } finally {
	                btn.disabled = false;
	                btn.innerHTML = originalText;
	            }
	        };
	    },
	renderInbox(c) {
	        c.innerHTML = `
	        <div class="card border-0 shadow-sm" style="height: 75vh; display:flex; flex-direction:column;">
	            <div class="card-header bg-white border-bottom py-3 d-flex align-items-center">
	                <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width:40px; height:40px;">
	                    <i class="fas fa-robot"></i>
	                </div>
	                <div>
	                    <h5 class="fw-bold m-0">GustaveBot 🤖</h5>
	                    <small class="text-muted text-success"><i class="fas fa-circle" style="font-size:8px"></i> Online (Expert)</small>
	                </div>
	                <button class="btn btn-sm btn-outline-secondary ms-auto" onclick="App.nav('inbox')"><i class="fas fa-trash"></i> Reset</button>
	            </div>
	            
	            <div id="chat-box" class="card-body bg-light" style="overflow-y: auto; flex-grow: 1; display:flex; flex-direction:column; gap:10px;">
	                <div class="d-flex align-items-start">
	                    <div class="bg-white p-3 rounded-3 shadow-sm border" style="max-width: 80%; border-bottom-left-radius: 0;">
	                        Hello <strong>${this.user?.username || 'visitor'}</strong> ! 👋<br>
	                        I perfectly know how GustaveBike works. What would you like to know ?<br>
	                        <small class="text-muted mt-2 d-block">Ex: "Can I rent a bike?" or "How to sell my bike?"</small>
	                    </div>
	                </div>
	            </div>

	            <div class="card-footer bg-white border-top p-3">
	                <form class="d-flex gap-2" onsubmit="event.preventDefault(); App.sendToOllama()">
	                    <input type="text" id="chat-input" class="form-control rounded-pill bg-light border-0 px-4" placeholder="Ask your question..." autocomplete="off">
	                    <button type="submit" class="btn btn-primary rounded-circle" style="width:45px; height:45px;"><i class="fas fa-paper-plane"></i></button>
	                </form>
	            </div>
	        </div>`;
	        
	        // --- HERE IS WHERE WE EXPLAIN EVERYTHING TO OLLAMA ---
	        if(this.chatHistory.length === 0) {
	            // User type detection to help AI
	            const isInternal = this.user && this.user.email.endsWith('@edu.univ-eiffel.fr');
	            const statusUser = isInternal ? "Internal Member (Student/Staff)" : "External User";

	            const systemPrompt = `
	            You are GustaveBot, the official assistant of the GustaveBike platform.
	            Here are the STRICT operating rules that you must explain to users:

	            1. EXTERNAL USERS (Non-university):
	               - THEY CANNOT RENT bikes (Forbidden, it is reserved for students and staff).
	               - They can BUY used bikes ('Buy' Section).
	               - They can BUY accessories.
	               - They can SELL their own bike to GustaveBike ('Sell a bike' Section). Explain that they fill out a form, the team reviews the offer, and they track the state in 'Tracking Offers'.

	            2. UNIVERSITY MEMBERS (@edu.univ-eiffel.fr):
	               - They have access to everything external users do.
	               - PLUS, they have EXCLUSIVE access to RENTALS ('Rent' Section).
	               - There are Electric and Mechanical bikes.
	               - If they subscribe to 'User Pro', they become priority on reservations.

	            The user currently speaking to you is: ${statusUser}.
	            Answer in a short, accurate way and in English.
	            `;

	            this.chatHistory.push({ role: "system", content: systemPrompt });
	        }
	    },	async sendToOllama() {
		        const input = document.getElementById('chat-input');
		        const box = document.getElementById('chat-box');
		        const msg = input.value.trim();
		        if (!msg) return;

		        // 1. Show user message
		        box.insertAdjacentHTML('beforeend', `
		            <div class="d-flex justify-content-end align-items-start animate__animated animate__fadeIn">
		                <div class="bg-primary text-white p-3 rounded-3 shadow-sm" style="max-width: 80%; border-bottom-right-radius: 0;">
		                    ${msg}
		                </div>
		            </div>
		        `);
		        input.value = '';
		        box.scrollTop = box.scrollHeight; // Scroll down

		        // 2. Add to history
		        this.chatHistory.push({ role: "user", content: msg });

		        // 3. Show "Typing..."
		        const loadingId = "load-" + Date.now();
		        box.insertAdjacentHTML('beforeend', `
		            <div id="${loadingId}" class="d-flex align-items-center text-muted small ms-2 mt-2">
		                <div class="spinner-grow spinner-grow-sm me-2" role="status"></div> GustaveBot is thinking...
		            </div>
		        `);
		        box.scrollTop = box.scrollHeight;

		        try {
		            // 4. Ollama API Call
		            // Ensure you started: OLLAMA_ORIGINS="*" ollama serve
		            const response = await fetch(this.ollamaUrl, {
		                method: "POST",
		                headers: { "Content-Type": "application/json" },
		                body: JSON.stringify({
		                    model: "mistral", // OR "llama3", "tinyllama" depending on what you installed
		                    messages: this.chatHistory,
		                    stream: false // Simplified without stream for now
		                })
		            });

		            const data = await response.json();
		            const botReply = data.message.content;

		            // 5. Delete loader and show response
		            document.getElementById(loadingId).remove();
		            
		            box.insertAdjacentHTML('beforeend', `
		                <div class="d-flex align-items-start animate__animated animate__fadeIn">
		                    <div class="bg-white p-3 rounded-3 shadow-sm border" style="max-width: 80%; border-bottom-left-radius: 0;">
		                        <i class="fas fa-robot text-primary me-2"></i> ${botReply.replace(/\n/g, '<br>')}
		                    </div>
		                </div>
		            `);

		            // 6. Save response in history
		            this.chatHistory.push({ role: "assistant", content: botReply });

		        } catch (error) {
		            document.getElementById(loadingId).remove();
		            box.insertAdjacentHTML('beforeend', `<div class="text-danger small ms-2">Error : Check that Ollama is running (port 11434).</div>`);
		            console.error(error);
		        }
		        
		        box.scrollTop = box.scrollHeight;
		    },
		
    addToCart(id, type) { 
        let item;
        if(type === 'bike') item = this.products.find(x => x.id === id);
        else item = this.accessories.find(x => x.id === id);
        if(!item) return; 
        const exist = this.cart.find(x => x.id === id && x.type === type); 
        if(type === 'bike' && exist) { return Swal.fire('Oops', 'This bike is unique, it is already in your cart.', 'warning'); }
        if(exist) exist.qty++; else this.cart.push({...item, qty: 1, type}); 
        this.saveCart(); 
        Swal.fire({ toast: true, icon: 'success', title: 'Added to cart', position: 'top-end', showConfirmButton: false, timer: 1000 }); 
    },
    
    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.saveCart();
        // Cart display update WITHOUT reopening Offcanvas (to avoid glitches)
        const list = document.getElementById('cart-list');
        list.innerHTML = this.cart.length ? this.cart.map((i, idx) => `
            <div class="d-flex justify-content-between p-2 border-bottom align-items-center">
                <div class="flex-grow-1">
                    <div class="fw-bold">${i.name||i.model}</div>
                    <small class="text-muted">x ${i.qty}</small>
                </div>
                <div class="fw-bold me-3">${(i.price*i.qty).toFixed(2)}€</div>
                <button class="btn btn-sm btn-outline-danger border-0" onclick="App.removeFromCart(${idx})" title="Delete">
                    <i class="fas fa-times"></i>
                </button>
            </div>`).join('') : '<div class="text-center p-3 text-muted">Cart empty.</div>';
        document.getElementById('cart-total-canvas').innerText = this.cart.reduce((a,b)=>a+(b.price*b.qty),0).toFixed(2) + "€";
    },

    saveCart() { sessionStorage.setItem('gb_cart', JSON.stringify(this.cart)); this.updateCartBadge(); },
	updateCartBadge() { 
	    const qty = this.cart.reduce((a,b) => a + b.qty, 0); 
	    const badge = document.getElementById('badge-cart');
	    
	    if (badge) { // Protection : on vérifie si l'élément existe
	        badge.innerText = qty; 
	        badge.classList.toggle('d-none', qty === 0); 
	    }
	    
	    // Même chose pour le total dans le header
	    const totalHeader = document.getElementById('cart-total-header');
	    if (totalHeader) {
	        const totalBase = this.cart.reduce((a,b) => a + (b.price * b.qty), 0);
	        const rate = this.currencyRates[this.currency] || 1;
	        const symbol = this.currencySymbols[this.currency] || '€';
	        totalHeader.innerText = (totalBase * rate).toFixed(2) + symbol; 
	    }
	},
    
	openCart() { 
	        const list = document.getElementById('cart-list'); 
	        // --- CALCULATIONS ---
	        const rate = this.currencyRates[this.currency] || 1;
	        const symbol = this.currencySymbols[this.currency] || '€';
	        
	        list.innerHTML = this.cart.length ? this.cart.map((i, idx) => {
	            const priceConv = (i.price * i.qty * rate).toFixed(2);
	            return `
	            <div class="d-flex justify-content-between p-2 border-bottom align-items-center">
	                <div><div class="fw-bold">${i.name||i.model}</div><small>x ${i.qty}</small></div>
	                <div class="fw-bold me-3">${priceConv}${symbol}</div>
	                <button class="btn btn-sm btn-outline-danger border-0" onclick="App.removeFromCart(${idx})"><i class="fas fa-times"></i></button>
	            </div>`;
	        }).join('') : '<div class="text-center p-3 text-muted">Empty.</div>';
	        
	        // --- SELECTOR INJECTION ---
	        if(!document.getElementById('cart-currency-selector')) {
	             list.insertAdjacentHTML('beforebegin', `<div class="p-2 bg-light d-flex justify-content-end" id="cart-currency-selector">${this.getCurrencySelectorHTML()}</div>`);
	        }

	        // --- CONVERTED TOTAL ---
	        const total = this.cart.reduce((a,b) => a + (b.price * b.qty), 0);
	        document.getElementById('cart-total-canvas').innerText = (total * rate).toFixed(2) + symbol;
	        
	        const offcanvas = document.getElementById('cart-offcanvas');
	        if(!offcanvas.classList.contains('show')) new bootstrap.Offcanvas(offcanvas).show(); 
	    },
    
    toggleFavorite(id) { const f = JSON.parse(localStorage.getItem('gb_favs')||'[]'); if(f.includes(id)) localStorage.setItem('gb_favs', JSON.stringify(f.filter(x=>x!==id))); else { f.push(id); localStorage.setItem('gb_favs', JSON.stringify(f)); } this.renderRent(document.getElementById('views-container')); },
	setupAddress(id) {
	        const el = document.getElementById(id);
	        if (!el) return;

	        let list = document.createElement('div');
	        list.className = 'list-group position-absolute w-100 shadow';
	        list.style.zIndex = 2000;
	        list.style.display = 'none';

	        el.parentNode.style.position = 'relative';
	        el.parentNode.appendChild(list);

	        el.addEventListener('input', async (e) => {
	            if (e.target.value.length < 4) {
	                list.style.display = 'none';
	                return;
	            }
	            try {
	                // Utilisation impérative des BACKTICKS ` ` pour injecter la variable ${e.target.value}
	                const r = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(e.target.value)}&limit=5`);
	                const j = await r.json();

	                list.innerHTML = j.features.map(f =>
	                    `<button type="button" class="list-group-item list-group-item-action small">${f.properties.label}</button>`
	                ).join('');

	                list.style.display = 'block';

	                list.querySelectorAll('button').forEach((b, i) => b.onclick = () => {
	                    el.value = j.features[i].properties.label;
	                    list.style.display = 'none';
	                    if (id === 'rent-address') App.updateRentalCalc();
	                });
	            } catch (x) { console.error("Address API Error", x); }
	        });

	        document.addEventListener('click', e => {
	            if (e.target !== el) list.style.display = 'none';
	        });
	    },
	
	
	viewInvoice(id) {
	        // Find rental in local cache
	        const r = this.cachedRentals.find(x => x.id === id);
	        if(!r) return;

	        // Calculate Rate used (Approximation based on current rate)
	        // Note: Ideally, historical exchange rate should be stored in DB. 
	        // Here we use current session rate.
	        const rate = this.currencyRates[this.currency] || 1;

	        const s = new Date(r.startDate);
	        const e = new Date(r.endDate);
	        const days = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;

	        // Reconstruct data object for the universal function
	        const invoiceData = {
	            id: r.id,
	            bike: r.bike,
	            days: days,
	            // Convert back to display currency
	            rentalPrice: (r.totalPrice - (r.depositAmount||200)) * rate,
	            deposit: (r.depositAmount || 200) * rate,
	            totalToPay: r.totalPrice * rate,
	            delivery: r.delivery
	        };

	        this.showInvoice(invoiceData, 'RENTAL');
	    },
	
	// --- UNIVERSAL INVOICE GENERATOR ---
	    showInvoice(data, type) {
	        // 1. Generate Invoice ID (Use real ID if available, else random)
	        const invoiceId = data.id 
	            ? `INV-${data.id}` 
	            : `REC-${Math.floor(Math.random() * 1000000)}`;
	        
	        const today = new Date().toLocaleDateString('en-US');
	        const symbol = this.currencySymbols[this.currency] || '€';
	        const user = this.user || { username: 'Guest', email: 'guest@example.com' };

	        // 2. Prepare Rows based on Context
	        let itemsHtml = '';
	        let totalAmount = 0;

	        if (type === 'RENTAL') {
	            // --- LOGIC FOR RENTALS ---
	            const days = data.days;
	            const pricePerDay = (data.rentalPrice / days); // Deduced price
	            const deposit = data.deposit || 200;
	            totalAmount = data.totalToPay;

	            itemsHtml = `
	                <tr>
	                    <td>
	                        <strong>Bike Rental</strong><br>
	                        <span class="text-muted small">${data.bike.model} (${data.bike.type})</span>
	                    </td>
	                    <td class="text-center">${days} days</td>
	                    <td class="text-end">${pricePerDay.toFixed(2)} ${symbol}</td>
	                    <td class="text-end">${data.rentalPrice.toFixed(2)} ${symbol}</td>
	                </tr>
	                <tr>
	                    <td>
	                        <strong>Security Deposit</strong><br>
	                        <span class="text-muted small">Pre-authorization (Refundable)</span>
	                    </td>
	                    <td class="text-center">1</td>
	                    <td class="text-end">${deposit.toFixed(2)} ${symbol}</td>
	                    <td class="text-end text-muted">${deposit.toFixed(2)} ${symbol}</td>
	                </tr>
	                ${data.delivery ? `
	                <tr>
	                    <td><strong>Delivery Service</strong></td>
	                    <td class="text-center">1</td>
	                    <td class="text-end">25.00 ${symbol}</td>
	                    <td class="text-end">25.00 ${symbol}</td>
	                </tr>` : ''}
	            `;

	        } else if (type === 'BUY_BIKE' || type === 'BUY_ACC' || type === 'CART') {
	            // --- LOGIC FOR PURCHASES ---
	            // If it's a single item (BUY_BIKE / BUY_ACC)
	            let items = [];
	            if (data.bike) items.push({ name: data.bike.model, price: data.amount, qty: 1 });
	            else if (data.accessory) items.push({ name: data.accessory.name, price: data.amount, qty: 1 });
	            else if (Array.isArray(data)) items = data; // Cart array case

	            // Loop through items
	            items.forEach(item => {
	                const itemTotal = item.price * item.qty;
	                totalAmount += itemTotal;
	                itemsHtml += `
	                <tr>
	                    <td><strong>${item.name || item.model}</strong></td>
	                    <td class="text-center">${item.qty}</td>
	                    <td class="text-end">${item.price.toFixed(2)} ${symbol}</td>
	                    <td class="text-end">${itemTotal.toFixed(2)} ${symbol}</td>
	                </tr>`;
	            });

	        } else if (type === 'SUBSCRIPTION') {
	            // --- LOGIC FOR SUBSCRIPTION ---
	            totalAmount = data.amount;
	            itemsHtml = `
	                <tr>
	                    <td>
	                        <strong>GustaveBike PRO Membership</strong><br>
	                        <span class="text-muted small">${data.plan} Plan</span>
	                    </td>
	                    <td class="text-center">1</td>
	                    <td class="text-end">${totalAmount.toFixed(2)} ${symbol}</td>
	                    <td class="text-end">${totalAmount.toFixed(2)} ${symbol}</td>
	                </tr>`;
	        }

	        // 3. Build the HTML
	        const html = `
	        <div class="p-4 bg-white text-dark text-start border rounded">
	            <div class="d-flex justify-content-between border-bottom pb-3 mb-4">
	                <div>
	                    <h3 class="fw-bold text-primary"><i class="fas fa-bicycle"></i> GustaveBike</h3>
	                    <div class="small text-muted">5 Boulevard Descartes, 77420 Champs-sur-Marne</div>
	                    <div class="small text-muted">France</div>
	                </div>
	                <div class="text-end">
	                    <h4 class="fw-bold text-uppercase text-secondary">Invoice</h4>
	                    <div class="fw-bold">#${invoiceId}</div>
	                    <div class="text-muted small">Date: ${today}</div>
	                </div>
	            </div>

	            <div class="row mb-4">
	                <div class="col-6">
	                    <h6 class="text-uppercase text-muted small fw-bold">Bill To:</h6>
	                    <div class="fw-bold">${user.username}</div>
	                    <div>${user.email}</div>
	                    ${user.address ? `<div>${user.address}</div>` : ''}
	                </div>
	                <div class="col-6 text-end">
	                    <h6 class="text-uppercase text-muted small fw-bold">Payment Method:</h6>
	                    <div><i class="fab fa-cc-stripe text-primary"></i> Credit Card</div>
	                    <div class="text-success small"><i class="fas fa-check-circle"></i> Paid</div>
	                </div>
	            </div>

	            <div class="table-responsive">
	                <table class="table table-striped table-bordered">
	                    <thead class="bg-dark text-white">
	                        <tr>
	                            <th style="width: 50%">Description</th>
	                            <th class="text-center">Qty</th>
	                            <th class="text-end">Unit Price</th>
	                            <th class="text-end">Amount</th>
	                        </tr>
	                    </thead>
	                    <tbody>
	                        ${itemsHtml}
	                    </tbody>
	                    <tfoot>
	                        <tr>
	                            <td colspan="3" class="text-end fw-bold">Total</td>
	                            <td class="text-end fw-bold fs-5 bg-light text-primary">${totalAmount.toFixed(2)} ${symbol}</td>
	                        </tr>
	                    </tfoot>
	                </table>
	            </div>

	            <div class="text-center mt-5 pt-3 border-top text-muted small">
	                <p>Thank you for your business!<br>For any questions, please contact support@gustavebike.fr</p>
	            </div>
	        </div>
	        
	        <div class="text-center mt-3 d-print-none">
	            <button class="btn btn-dark fw-bold px-4 shadow-sm" onclick="window.print()">
	                <i class="fas fa-print me-2"></i> Print / Save as PDF
	            </button>
	        </div>`;

	        // 4. Display
	        Swal.fire({
	            title: '',
	            html: html,
	            width: '800px',
	            padding: '2em',
	            showConfirmButton: false,
	            showCloseButton: true,
	            background: '#f8f9fa'
	        });
	    },
    openListingModal() { new bootstrap.Modal(document.getElementById('modal-listing')).show(); },
    openProd(id) { /* Fallback */ },
    
    // NEW DIRECT ACCESSORY PURCHASE FUNCTION
    buyAccessory(id) {
        const item = this.accessories.find(a => a.id == id);
        if(item) {
             this.triggerPayment('BUY_ACC', item.price, { accessory: item });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());