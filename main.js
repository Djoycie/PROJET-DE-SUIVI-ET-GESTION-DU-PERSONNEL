const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

// --- Configuration de la Base de Données ---
const DB_PATH = path.join(app.getPath('userData'), 'gestion_personnel.db');
let mainWindow;
let db;

// --- Initialisation de la base de données ---
function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) return reject(err);
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          fullName TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'rh', 'secretaire'))
        )
      `, (err) => {
        if (err) return reject(err);
        db.get('SELECT COUNT(*) AS count FROM users WHERE role = "admin"', (err, row) => {
          if (err) return reject(err);
          if (row.count === 0) {
            db.run('INSERT INTO users (username, password, fullName, role) VALUES (?, ?, ?, ?)',
              ['admin', 'adminpassword', 'Administrateur Système', 'admin'],
              (err) => {
                if (err) return reject(err);
                resolve();
              }
            );
          } else {
            resolve();
          }
        });
      });
    });
  });
}

// --- Création de la fenêtre principale ---
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')

    },
  });

  mainWindow.loadFile(path.join(__dirname, 'login.html'));
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (db) {
      db.close((err) => {
        if (err) console.error('Erreur lors de la fermeture de la base de données :', err.message);
        else console.log('Base de données SQLite fermée.');
      });
    }
  });
}


// --- Gestion des événements de l'application ---
app.on('ready', async () => {
  try {
    await initDatabase();
    createWindow();
  } catch (error) {
    console.error('Échec du démarrage de l\'application Electron en raison d\'une erreur de base de données:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// --- Gestionnaires IPC ---

ipcMain.on('load-module', (event, moduleFileName) => {
  const filePath = path.join(__dirname, moduleFileName);
  console.log(`[Processus Principal] Demande de chargement de : ${filePath}`);
  mainWindow.loadFile(filePath)
    .then(() => console.log(`[Processus Principal] ${moduleFileName} chargé avec succès.`))
    .catch(err => console.error(`[Processus Principal] Erreur de chargement de ${moduleFileName}:`, err));
});

ipcMain.on('logout', (event) => {
  console.log('[Processus Principal] Demande de déconnexion reçue. Rechargement de login.html');
  mainWindow.loadFile(path.join(__dirname, 'login.html'));
});

ipcMain.handle('authenticate-user', async (event, { username, password, role }) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT username, fullName, role FROM users WHERE username = ? AND password = ? AND role = ?';
    db.get(query, [username, password, role], (err, row) => {
      if (err) resolve({ success: false, message: "Erreur serveur lors de l'authentification." });
      else if (row) resolve({ success: true, user: row });
      else resolve({ success: false, message: "Nom d'utilisateur, mot de passe ou rôle incorrect." });
    });
  });
});

ipcMain.handle('get-all-users', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT username, fullName, role FROM users', [], (err, rows) => {
      if (err) reject({ success: false, message: "Erreur lors de la récupération des utilisateurs." });
      else resolve(rows);
    });
  });
});

ipcMain.handle('add-new-user', async (event, newUser) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS count FROM users WHERE username = ?', [newUser.username], (err, row) => {
      if (err) resolve({ success: false, message: "Erreur serveur lors de l'ajout de l'utilisateur." });
      if (row.count > 0) resolve({ success: false, message: "Ce nom d'utilisateur existe déjà." });
      const query = 'INSERT INTO users (username, password, fullName, role) VALUES (?, ?, ?, ?)';
      db.run(query, [newUser.username, newUser.password, newUser.fullName, newUser.role], function(err) {
        if (err) resolve({ success: false, message: "Erreur serveur lors de l'ajout de l'utilisateur." });
        else resolve({ success: true });
      });
    });
  });
});

ipcMain.handle('update-user', async (event, updatedUser) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS count FROM users WHERE username = ? AND username != ?',
           [updatedUser.username, updatedUser.originalUsername], (err, row) => {
      if (err) resolve({ success: false, message: "Erreur serveur lors de la mise à jour." });
      if (row.count > 0) resolve({ success: false, message: "Le nouveau nom d'utilisateur existe déjà." });
      let query, params;
      if (updatedUser.password && updatedUser.password.trim() !== '') {
        query = 'UPDATE users SET username = ?, password = ?, fullName = ?, role = ? WHERE username = ?';
        params = [updatedUser.username, updatedUser.password, updatedUser.fullName, updatedUser.role, updatedUser.originalUsername];
      } else {
        query = 'UPDATE users SET username = ?, fullName = ?, role = ? WHERE username = ?';
        params = [updatedUser.username, updatedUser.fullName, updatedUser.role, updatedUser.originalUsername];
      }
      db.run(query, params, function(err) {
        if (err) resolve({ success: false, message: "Erreur serveur lors de la mise à jour." });
        else if (this.changes === 0) resolve({ success: false, message: "Utilisateur introuvable ou aucune modification effectuée." });
        else resolve({ success: true });
      });
    });
  });
});

ipcMain.handle('delete-user', async (event, usernameToDelete) => {
  return new Promise((resolve, reject) => {
    if (usernameToDelete === 'admin') resolve({ success: false, message: "L'utilisateur 'admin' ne peut pas être supprimé." });
    db.run('DELETE FROM users WHERE username = ?', [usernameToDelete], function(err) {
      if (err) resolve({ success: false, message: "Erreur serveur lors de la suppression." });
      else if (this.changes === 0) resolve({ success: false, message: "Utilisateur non trouvé pour la suppression." });
      else resolve({ success: true });
    });
  });
});

// --- Analyse de CV ---

const CV_ANALYSES_FILE = path.join(app.getPath('userData'), 'cv_analyses.json');

function readCvAnalyses() {
  try {
    if (fs.existsSync(CV_ANALYSES_FILE)) {
      const data = fs.readFileSync(CV_ANALYSES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Erreur lors de la lecture des analyses de CV:', error);
  }
  return [];
}

function writeCvAnalyses(analyses) {
  try {
    fs.writeFileSync(CV_ANALYSES_FILE, JSON.stringify(analyses, null, 2), 'utf8');
  } catch (error) {
    console.error('Erreur lors de l\'écriture des analyses de CV:', error);
  }
}

// --- Gestionnaire IPC pour l'analyse de CV (nouvelle version avec buffer) ---

ipcMain.handle('analyze-cv', async (event, { fileBuffer, fileName, qualifications, candidateName }) => {
  try {
    // Écrit le buffer dans un fichier temporaire pour l'analyse
    const tempDir = app.getPath('temp');
    const tempFilePath = path.join(tempDir, fileName);
    fs.writeFileSync(tempFilePath, Buffer.from(fileBuffer));

    let cvText = '';
    const fileExtension = path.extname(fileName).toLowerCase();

    if (fileExtension === '.pdf') {
      const dataBuffer = fs.readFileSync(tempFilePath);
      const data = await pdf(dataBuffer);
      cvText = data.text;
    } else if (fileExtension === '.docx') {
      const result = await mammoth.extractRawText({ path: tempFilePath });
      cvText = result.value;
    } else {
      return { success: false, message: 'Format de fichier non supporté. Veuillez utiliser .pdf ou .docx.' };
    }

    // Supprime le fichier temporaire après analyse
    fs.unlinkSync(tempFilePath);

    // Analyse des qualifications
    const processedCvText = cvText.toLowerCase();
    const requiredQualifications = qualifications.split(',')
      .map(q => {
        const parts = q.trim().split(':');
        return {
          name: parts[0].toLowerCase(),
          weight: parseInt(parts[1] || '1', 10),
          synonyms: parts[0].toLowerCase().split(' ').filter(s => s.length > 2)
        };
      })
      .filter(q => q.name.length > 0);

    if (requiredQualifications.length === 0) {
      return { success: false, message: "Veuillez entrer des qualifications à analyser." };
    }

    let totalPossibleWeight = 0;
    let matchedWeight = 0;
    const foundQualifications = [];
    const missingQualifications = [];

    requiredQualifications.forEach(q => {
      totalPossibleWeight += q.weight;
      let found = false;
      const searchTerms = [q.name, ...q.synonyms];
      for (const term of searchTerms) {
        if (processedCvText.includes(term)) {
          matchedWeight += q.weight;
          foundQualifications.push(q.name);
          found = true;
          break;
        }
      }
      if (!found) missingQualifications.push(q.name);
    });

    const matchPercentage = totalPossibleWeight > 0 ? (matchedWeight / totalPossibleWeight) * 100 : 0;
    let descriptiveMessage = '';

    if (matchPercentage === 100) {
      descriptiveMessage = "Excellente correspondance ! Le candidat possède toutes les qualifications requises.";
    } else if (matchPercentage >= 75) {
      descriptiveMessage = "Très bonne correspondance. Le candidat possède la plupart des qualifications clés.";
    } else if (matchPercentage >= 50) {
      descriptiveMessage = "Correspondance modérée. Le candidat possède une partie des qualifications requises.";
    } else if (matchPercentage > 0) {
      descriptiveMessage = "Correspondance faible. Le candidat possède quelques qualifications, mais beaucoup manquent.";
    } else {
      descriptiveMessage = "Aucune correspondance significative trouvée avec les qualifications requises.";
    }

    const analysisResult = {
      id: Date.now(),
      candidateName: candidateName || path.basename(fileName, path.extname(fileName)),
      analysisDate: new Date().toISOString(),
      qualificationsRequired: qualifications,
      percentage: Math.round(matchPercentage),
      message: descriptiveMessage,
      foundQualifications: foundQualifications,
      missingQualifications: missingQualifications,
      filePath: tempFilePath // Note: le fichier temporaire est supprimé, donc filePath n'est pas utilisable ici, sauf si tu le gardes
    };

    // Stocke l'analyse dans le fichier JSON
    const analyses = readCvAnalyses();
    analyses.push(analysisResult);
    writeCvAnalyses(analyses);

    return { success: true, analysis: analysisResult };
  } catch (error) {
    console.error('Erreur lors de l\'analyse de CV:', error);
    return { success: false, message: error.message };
  }
});

// --- Gestionnaire IPC pour ouvrir un fichier ---
ipcMain.handle('open-file', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de l\'ouverture du fichier:', error);
    return { success: false, message: error.message };
  }
});

// --- Gestionnaire IPC pour récupérer toutes les analyses de CV ---
ipcMain.handle('get-all-cv-analyses', async () => {
  return readCvAnalyses();
});