// main.js

// Importation des modules nécessaires d'Electron et de Node.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose(); // Importe la bibliothèque SQLite3 pour la base de données

// --- Configuration de la Base de Données ---
// Chemin du fichier de la base de données SQLite.
// app.getPath('userData') est le meilleur endroit pour stocker les données persistantes
// de l'application sur tous les systèmes d'exploitation (Windows, macOS, Linux).
const DB_PATH = path.join(app.getPath('userData'), 'gestion_personnel.db');

// Variables globales pour la fenêtre principale et la connexion à la base de données
let mainWindow; 
let db; 

// --- Fonction d'Initialisation de la Base de Données ---
/**
 * Initialise la connexion à la base de données SQLite et crée la table 'users' si elle n'existe pas.
 * Insère un utilisateur administrateur par défaut si aucun administrateur n'est trouvé.
 * @returns {Promise<void>} Une promesse qui se résout une fois la base de données prête ou rejette en cas d'erreur.
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    // Connexion à la base de données. Le fichier est créé s'il n'existe pas.
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Erreur de connexion à la base de données :', err.message);
        return reject(err); // Rejette la promesse en cas d'erreur de connexion
      }
      console.log(`Connecté à la base de données SQLite à ${DB_PATH}`);

      // Requête pour créer la table 'users' si elle n'existe pas.
      // Contient des colonnes pour l'identifiant (clé primaire auto-incrémentée),
      // le nom d'utilisateur (unique), le mot de passe, le nom complet, et le rôle.
      // Le rôle est contraint à être 'admin', 'rh' ou 'secretaire'.
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          fullName TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'rh', 'secretaire'))
        )
      `, (err) => {
        if (err) {
          console.error('Erreur de création de la table "users" :', err.message);
          return reject(err); // Rejette si la création de table échoue
        }
        console.log('Table "users" vérifiée ou créée.');

        // Après la création/vérification de la table, vérifie s'il y a au moins un administrateur.
        // Si non, un administrateur par défaut est inséré.
        db.get('SELECT COUNT(*) AS count FROM users WHERE role = "admin"', (err, row) => {
          if (err) {
            console.error('Erreur lors de la vérification de l\'administrateur par défaut :', err.message);
            return reject(err);
          } 
          
          if (row.count === 0) {
            // Insère l'administrateur par défaut s'il n'y en a pas
            db.run('INSERT INTO users (username, password, fullName, role) VALUES (?, ?, ?, ?)',
              ['admin', 'adminpassword', 'Administrateur Système', 'admin'],
              (err) => {
                if (err) {
                  console.error('Erreur lors de l\'insertion de l\'administrateur par défaut :', err.message);
                  return reject(err);
                }
                console.log('Administrateur par défaut ajouté : admin / adminpassword');
                resolve(); // Résout la promesse une fois l'admin ajouté
              }
            );
          } else {
            resolve(); // Résout la promesse si la base est prête et l'admin existe
          }
        });
      });
    });
  });
}

// --- Fonction de Création de la Fenêtre Principale ---
/**
 * Crée la fenêtre principale de l'application Electron.
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, // Largeur de la fenêtre
    height: 800, // Hauteur de la fenêtre
    webPreferences: {
      nodeIntegration: true, // Permet d'utiliser les API Node.js dans le processus de rendu
      contextIsolation: false, // Désactive l'isolation de contexte (pour simplifier, mais 'true' est plus sûr)
      enableRemoteModule: true // Active le module 'remote' (déprécié, mais parfois nécessaire pour la compatibilité)
    },
  });

  // Charge la page de connexion au démarrage de l'application
  mainWindow.loadFile(path.join(__dirname, 'login.html'));

  // Ouvre les outils de développement (console, inspecteur d'éléments) pour le débogage
  mainWindow.webContents.openDevTools();

  // Gère l'événement de fermeture de la fenêtre
  mainWindow.on('closed', () => {
    mainWindow = null; // Libère la référence à la fenêtre
    // Ferme la connexion à la base de données lorsque l'application se ferme
    if (db) {
      db.close((err) => {
        if (err) console.error('Erreur lors de la fermeture de la base de données :', err.message);
        else console.log('Base de données SQLite fermée.');
      });
    }
  });
}

// --- Événements du Cycle de Vie de l'Application Electron ---

// Cet événement est déclenché quand Electron a fini son initialisation
// et est prêt à créer des fenêtres de navigateur.
app.on('ready', async () => {
  try {
    await initDatabase(); // Tente d'initialiser la base de données
    createWindow();       // Puis crée la fenêtre principale
  } catch (error) {
    console.error('Échec du démarrage de l\'application Electron en raison d\'une erreur de base de données:', error);
    app.quit(); // Quitte l'application si la base de données ne peut pas être initialisée
  }
});

// Cet événement est déclenché quand toutes les fenêtres de l'application sont fermées.
// Sur macOS, les applications restent actives en arrière-plan même après la fermeture
// de toutes les fenêtres, jusqu'à ce que l'utilisateur quitte explicitement (Cmd+Q).
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit(); // Quitte l'application sur Windows et Linux
  }
});

// Cet événement est déclenché quand l'application est activée (par exemple, clic sur l'icône du dock sur macOS).
// Si aucune fenêtre n'est ouverte, une nouvelle fenêtre est créée.
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// --- Gestionnaires IPC (Inter-Process Communication) ---
// Ces gestionnaires répondent aux appels (invoke) ou messages (send) envoyés par les processus de rendu (vos pages HTML/JS).

// 1. Gestion de la Navigation vers les Modules
// Reçoit une requête du processus de rendu pour charger un fichier HTML spécifique.
ipcMain.on('load-module', (event, moduleFileName) => {
  const filePath = path.join(__dirname, moduleFileName); // Construit le chemin absolu du fichier
  console.log(`[Processus Principal] Demande de chargement de : ${filePath}`);
  mainWindow.loadFile(filePath) // Charge le fichier HTML dans la fenêtre principale
    .then(() => {
      console.log(`[Processus Principal] ${moduleFileName} chargé avec succès.`);
    })
    .catch(err => {
      console.error(`[Processus Principal] Erreur de chargement de ${moduleFileName}:`, err);
    });
});

// NOUVEAU : 2. Gestionnaire de Déconnexion
ipcMain.on('logout', (event) => {
    console.log('[Processus Principal] Demande de déconnexion reçue. Rechargement de login.html');
    mainWindow.loadFile(path.join(__dirname, 'login.html'));
});


// 2. Gestion de l'Authentification des Utilisateurs
// Reçoit les identifiants de connexion et vérifie dans la base de données.
ipcMain.handle('authenticate-user', async (event, { username, password, role }) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT username, fullName, role FROM users WHERE username = ? AND password = ? AND role = ?';
    db.get(query, [username, password, role], (err, row) => {
      if (err) {
        console.error('[Processus Principal] Erreur d\'authentification :', err.message);
        resolve({ success: false, message: "Erreur serveur lors de l'authentification." });
      } else if (row) {
        // Si une ligne correspond, l'authentification est réussie
        console.log(`[Processus Principal] Authentification réussie pour ${username} (${role}).`);
        resolve({ success: true, user: row }); // Retourne les informations de l'utilisateur
      } else {
        // Aucune correspondance trouvée
        console.log(`[Processus Principal] Échec de l'authentification pour ${username} (${role}).`);
        resolve({ success: false, message: "Nom d'utilisateur, mot de passe ou rôle incorrect." });
      }
    });
  });
});

// 3. Gestion de la Récupération de Tous les Utilisateurs
// Retourne la liste de tous les utilisateurs enregistrés dans la base de données.
ipcMain.handle('get-all-users', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT username, fullName, role FROM users', [], (err, rows) => {
      if (err) {
        console.error('[Processus Principal] Erreur lors de la récupération des utilisateurs :', err.message);
        // Utilise reject pour signaler une erreur sérieuse, resolve avec false pour une erreur gérable par le client
        reject({ success: false, message: "Erreur lors de la récupération des utilisateurs." }); 
      } else {
        resolve(rows); // Retourne le tableau des utilisateurs
      }
    });
  });
});

// 4. Gestion de l'Ajout d'un Nouvel Utilisateur
// Reçoit les données d'un nouvel utilisateur et l'insère dans la base de données.
ipcMain.handle('add-new-user', async (event, newUser) => {
  return new Promise((resolve, reject) => {
    // Vérifie d'abord si le nom d'utilisateur existe déjà pour éviter les doublons
    db.get('SELECT COUNT(*) AS count FROM users WHERE username = ?', [newUser.username], (err, row) => {
      if (err) {
        console.error('[Processus Principal] Erreur de vérification d\'utilisateur existant :', err.message);
        return resolve({ success: false, message: "Erreur serveur lors de l'ajout de l'utilisateur." });
      }
      if (row.count > 0) {
        return resolve({ success: false, message: "Ce nom d'utilisateur existe déjà." }); // Nom d'utilisateur déjà pris
      }

      // Si le nom d'utilisateur est unique, procède à l'insertion
      const query = 'INSERT INTO users (username, password, fullName, role) VALUES (?, ?, ?, ?)';
      db.run(query, [newUser.username, newUser.password, newUser.fullName, newUser.role], function(err) {
        if (err) {
          console.error('[Processus Principal] Erreur lors de l\'ajout du nouvel utilisateur :', err.message);
          resolve({ success: false, message: "Erreur serveur lors de l'ajout de l'utilisateur." });
        } else {
          console.log(`[Processus Principal] Nouvel utilisateur ajouté : ${newUser.username} (ID: ${this.lastID})`);
          resolve({ success: true }); // Succès de l'ajout
        }
      });
    });
  });
});

// 5. Gestion de la Mise à Jour d'un Utilisateur Existant
// Reçoit les données mises à jour d'un utilisateur et modifie son enregistrement.
ipcMain.handle('update-user', async (event, updatedUser) => {
  return new Promise((resolve, reject) => {
    // Vérifie si le nouveau nom d'utilisateur est unique et n'appartient pas à l'utilisateur actuel
    db.get('SELECT COUNT(*) AS count FROM users WHERE username = ? AND username != ?', 
           [updatedUser.username, updatedUser.originalUsername], 
           (err, row) => {
      if (err) {
        console.error('[Processus Principal] Erreur de vérification de nom d\'utilisateur pour mise à jour :', err.message);
        return resolve({ success: false, message: "Erreur serveur lors de la mise à jour." });
      }
      if (row.count > 0) {
        return resolve({ success: false, message: "Le nouveau nom d'utilisateur existe déjà." }); // Nouveau nom déjà pris
      }

      let query;
      let params;

      // Détermine la requête SQL en fonction de la présence d'un nouveau mot de passe
      if (updatedUser.password && updatedUser.password.trim() !== '') {
        // Si un nouveau mot de passe est fourni, il est inclus dans la mise à jour
        query = 'UPDATE users SET username = ?, password = ?, fullName = ?, role = ? WHERE username = ?';
        params = [updatedUser.username, updatedUser.password, updatedUser.fullName, updatedUser.role, updatedUser.originalUsername];
      } else {
        // Sinon, le mot de passe n'est pas mis à jour
        query = 'UPDATE users SET username = ?, fullName = ?, role = ? WHERE username = ?';
        params = [updatedUser.username, updatedUser.fullName, updatedUser.role, updatedUser.originalUsername];
      }

      db.run(query, params, function(err) {
        if (err) {
          console.error('[Processus Principal] Erreur lors de la mise à jour de l\'utilisateur :', err.message);
          resolve({ success: false, message: "Erreur serveur lors de la mise à jour." });
        } else if (this.changes === 0) {
          // Si this.changes est 0, cela signifie qu'aucune ligne n'a été affectée (utilisateur non trouvé)
          resolve({ success: false, message: "Utilisateur introuvable ou aucune modification effectuée." });
        } else {
          console.log(`[Processus Principal] Utilisateur ${updatedUser.originalUsername} mis à jour vers ${updatedUser.username}.`);
          resolve({ success: true }); // Succès de la mise à jour
        }
      });
    });
  });
});

// 6. Gestion de la Suppression d'un Utilisateur
// Supprime un utilisateur de la base de données.
ipcMain.handle('delete-user', async (event, usernameToDelete) => {
  return new Promise((resolve, reject) => {
    // Mesure de sécurité : empêche la suppression de l'utilisateur 'admin' par défaut.
    if (usernameToDelete === 'admin') {
      return resolve({ success: false, message: "L'utilisateur 'admin' ne peut pas être supprimé." });
    }

    db.run('DELETE FROM users WHERE username = ?', [usernameToDelete], function(err) {
      if (err) {
        console.error('[Processus Principal] Erreur lors de la suppression de l\'utilisateur :', err.message);
        resolve({ success: false, message: "Erreur serveur lors de la suppression." });
      } else if (this.changes === 0) {
        // Si this.changes est 0, l'utilisateur n'a pas été trouvé pour la suppression
        resolve({ success: false, message: "Utilisateur non trouvé pour la suppression." });
      } else {
        console.log(`[Processus Principal] Utilisateur ${usernameToDelete} supprimé.`);
        resolve({ success: true }); // Succès de la suppression
      }
    });
  });
});