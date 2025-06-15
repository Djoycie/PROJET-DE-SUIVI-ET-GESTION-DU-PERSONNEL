const { contextBridge, ipcRenderer } = require('electron');

console.log('preload.js chargé');

function exposeAPI() {
  try {
    contextBridge.exposeInMainWorld('electronAPI', {
      // CV Analyses
      analyzeCv: (data) => {
        try {
          return ipcRenderer.invoke('analyze-cv', data);
        } catch (error) {
          console.error('Erreur dans analyzeCv:', error);
          throw error;
        }
      },
      getAllCvAnalyses: () => {
        try {
          return ipcRenderer.invoke('get-all-cv-analyses');
        } catch (error) {
          console.error('Erreur dans getAllCvAnalyses:', error);
          throw error;
        }
      },
      openFile: (filePath) => {
        try {
          return ipcRenderer.invoke('open-file', filePath);
        } catch (error) {
          console.error('Erreur dans openFile:', error);
          throw error;
        }
      },
      // Authentification
      authenticateUser: (data) => {
        try {
          return ipcRenderer.invoke('authenticate-user', data);
        } catch (error) {
          console.error('Erreur dans authenticateUser:', error);
          throw error;
        }
      },
      // Gestion des utilisateurs
      getAllUsers: () => {
        try {
          return ipcRenderer.invoke('get-all-users');
        } catch (error) {
          console.error('Erreur dans getAllUsers:', error);
          throw error;
        }
      },
      addNewUser: (newUser) => {
        try {
          return ipcRenderer.invoke('add-new-user', newUser);
        } catch (error) {
          console.error('Erreur dans addNewUser:', error);
          throw error;
        }
      },
      updateUser: (updatedUser) => {
        try {
          return ipcRenderer.invoke('update-user', updatedUser);
        } catch (error) {
          console.error('Erreur dans updateUser:', error);
          throw error;
        }
      },
      deleteUser: (username) => {
        try {
          return ipcRenderer.invoke('delete-user', username);
        } catch (error) {
          console.error('Erreur dans deleteUser:', error);
          throw error;
        }
      },
      // Navigation et déconnexion
      logout: () => {
        try {
          return ipcRenderer.send('logout');
        } catch (error) {
          console.error('Erreur dans logout:', error);
          throw error;
        }
      },
      loadModule: (moduleFileName) => {
        try {
          return ipcRenderer.send('load-module', moduleFileName);
        } catch (error) {
          console.error('Erreur dans loadModule:', error);
          throw error;
        }
      },
      // Gestion du personnel
      addPoste: async (poste, ficheBuffer, ficheName) => {
    try {
      return await ipcRenderer.invoke('add-poste', poste, ficheBuffer, ficheName);
    } catch (e) {
      console.error("Erreur addPoste:", e);
      throw e;
    }
  },
      getAllPostes: async () => {
    try {
      return await ipcRenderer.invoke('get-all-postes');
    } catch (e) {
      console.error("Erreur getAllPostes:", e);
      throw e;
    }
  },
      updatePoste: async (poste) => {
    try {
      return await ipcRenderer.invoke('update-poste', poste);
    } catch (e) {
      console.error("Erreur updatePoste:", e);
      throw e;
    }
  },
      deletePoste: async (id) => {
    try {
      return await ipcRenderer.invoke('delete-poste', id);
    } catch (e) {
      console.error("Erreur deletePoste:", e);
      throw e;
    }
  },

      addEmployee: async (employee) => {
    try {
      return await ipcRenderer.invoke('add-employee', employee);
    } catch (e) {
      console.error("Erreur addEmployee:", e);
      throw e;
    }
  },
    getAllEmployees: async () => {
    try {
      return await ipcRenderer.invoke('get-all-employees');
    } catch (e) {
      console.error("Erreur getAllEmployees:", e);
      throw e;
    }
  },
    updateEmployee: async (employee) => {
    try {
      return await ipcRenderer.invoke('update-employee', employee);
    } catch (e) {
      console.error("Erreur updateEmployee:", e);
      throw e;
    }
  },
    deleteEmployee: async (matricule) => {
    try {
      return await ipcRenderer.invoke('delete-employee', matricule);
    } catch (e) {
      console.error("Erreur deleteEmployee:", e);
      throw e;
    }
  },
    countEmployeesByPoste: async (poste) => {
    try {
      return await ipcRenderer.invoke('count-employees-by-poste', poste);
    } catch (e) {
      console.error("Erreur countEmployeesByPoste:", e);
      throw e;
    }
  },

    openFile1: async (filePath) => {
    try {
      return await ipcRenderer.invoke('open-file', filePath);
    } catch (e) {
      console.error("Erreur openFile:", e);
      throw e;
    }
  },
    openFile: (path) => {
    try {
    return ipcRenderer.invoke('open-file', path);
  } catch (error) {
    console.error('Erreur dans openFile:', error);
    throw error;
  }
},
    countEmployeesByPoste: async (poste) => {
    return await ipcRenderer.invoke('count-employees-by-poste', poste);
},

getAllMatricules: async () => {
    try {
      return await ipcRenderer.invoke('get-all-matricules');
    } catch (e) {
      console.error("Erreur getAllMatricules:", e);
      throw e;
    }
  },

  getPersonnelByMatricule: async (matricule) => {
  try {
    return await ipcRenderer.invoke('get-personnel-by-matricule', matricule);
  } catch (e) {
    console.error("Erreur getPersonnelByMatricule:", e);
    throw e;
  }
},

saveConge: async (congeData) => {
  try {
    return await ipcRenderer.invoke('save-conge', congeData);
  } catch (e) {
    console.error("Erreur saveConge:", e);
    throw e;
  }
},


getAllConges: async () => {
  return await ipcRenderer.invoke('get-all-conges');
},

updateConge: async (conge) => {
  return await ipcRenderer.invoke('update-conge', conge);
},
deleteConge: async (id) => {
  return await ipcRenderer.invoke('delete-conge', id);
},
getConges: (filters) => ipcRenderer.invoke('get-conges', filters),
getFiltresConges: async () => {
  return await ipcRenderer.invoke('get-filtre-conges');
},
 




  // Opérations sur les départements
  getDepartements: () => ipcRenderer.invoke('get-departements'),
  
  // Opérations sur le personnel
  getPersonnelByDepartement: (departementId) => 
    ipcRenderer.invoke('get-personnel-by-departement', departementId),
  
  // Opérations sur les stages
  saveStage: (stageData) => ipcRenderer.invoke('save-stage', stageData),
  getStages: (filters) => ipcRenderer.invoke('get-stages', filters),
  updateStageStatus: (stageId, statut) => 
    ipcRenderer.invoke('update-stage-status', stageId, statut),
  deleteStage: (stageId) => ipcRenderer.invoke('delete-stage', stageId),
  
  // Statistiques
  getStageStats: () => ipcRenderer.invoke('get-stage-stats'),
  
  // Notifications système (optionnel)
  showNotification: (title, body) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  },
  
  // Vérification des permissions de notification
  requestNotificationPermission: async () => {
    if ('Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'denied';
  },
  
  // Utilitaires pour la validation
  validateEmail: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },
  
  validateDate: (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  },
  
  // Formatage des données
  formatDate: (dateString, locale = 'fr-FR') => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(locale);
  },
  
  formatCurrency: (amount, currency = 'XAF') => {
    return new Intl.NumberFormat('fr-CM', {
      style: 'currency',
      currency: currency
    }).format(amount);
  },
  
  // Gestion des fichiers (pour futures fonctionnalités)
  saveFile: (data, filename) => 
    ipcRenderer.invoke('save-file', data, filename),
  
  loadFile: (filepath) => 
    ipcRenderer.invoke('load-file', filepath),
  
  // Export de données
  exportToCSV: (data, filename) => 
    ipcRenderer.invoke('export-csv', data, filename),
  
  exportToExcel: (data, filename) => 
    ipcRenderer.invoke('export-excel', data, filename),
  
  // Backup et restauration
  createBackup: () => ipcRenderer.invoke('create-backup'),
  restoreBackup: (backupPath) => 
    ipcRenderer.invoke('restore-backup', backupPath),
  
  // Paramètres de l'application
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => 
    ipcRenderer.invoke('save-settings', settings),
  
  // Gestion des rapports
  generateReport: (reportType, parameters) => 
    ipcRenderer.invoke('generate-report', reportType, parameters),
  
  // Logs et debugging
  logInfo: (message) => ipcRenderer.invoke('log-info', message),
  logError: (error) => ipcRenderer.invoke('log-error', error),
  
  // Version de l'application
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Vérification des mises à jour
  checkForUpdates: () => ipcRenderer.invoke('check-updates'),
  
  // Gestion de la base de données
  getDatabaseInfo: () => ipcRenderer.invoke('get-db-info'),
  optimizeDatabase: () => ipcRenderer.invoke('optimize-db'),
  
  // Écoute des événements du processus principal
  onDatabaseUpdate: (callback) => {
    ipcRenderer.on('database-updated', callback);
    return () => ipcRenderer.removeListener('database-updated', callback);
  },
  
  onAppUpdate: (callback) => {
    ipcRenderer.on('app-update-available', callback);
    return () => ipcRenderer.removeListener('app-update-available', callback);
  },
  
  onNotification: (callback) => {
    ipcRenderer.on('show-notification', callback);
    return () => ipcRenderer.removeListener('show-notification', callback);
  },
  
  // Thème et préférences UI
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  
  // Raccourcis clavier
  registerShortcut: (accelerator, action) => 
    ipcRenderer.invoke('register-shortcut', accelerator, action),
  
  unregisterShortcut: (accelerator) => 
    ipcRenderer.invoke('unregister-shortcut', accelerator),
  
  // Sécurité
  hashPassword: (password) => ipcRenderer.invoke('hash-password', password),
  verifyPassword: (password, hash) => 
    ipcRenderer.invoke('verify-password', password, hash),
  
  // Permissions utilisateur (pour futures fonctionnalités multi-utilisateurs)
  getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
  checkPermission: (permission) => 
    ipcRenderer.invoke('check-permission', permission),
  
  // Utilitaires système
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showItemInFolder: (path) => ipcRenderer.invoke('show-item-in-folder', path),
  
  // Impressions avancées
  printToPDF: (options) => ipcRenderer.invoke('print-to-pdf', options),


});

    console.log('electronAPI exposée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'exposition de l\'API:', error);
  }
}



exposeAPI();