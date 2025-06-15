const { app, BrowserWindow, ipcMain, shell, Notification } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { console } = require('inspector');

// --- Configuration de la Base de Données ---
const DB_PATH = path.join(app.getPath('userData'), 'gestion_personnel.db');
let mainWindow;
let db;

// --- Initialisation de la base de données ---
function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) return reject(err);

      // Création table users
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

        // Création table poste
       db.run(`
      CREATE TABLE IF NOT EXISTS postes (
        id TEXT PRIMARY KEY,
        intitule TEXT NOT NULL,
        description TEXT NOT NULL,
        fiche_poste TEXT NOT NULL,
        places_desirees INTEGER NOT NULL,
        departement TEXT NOT NULL
      )
    `, (err) => {
      if (err) console.error("Erreur création table postes:", err.message);
      else console.log("Table postes créée ou existante.");
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS personnel (
        matricule TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        date_naissance TEXT NOT NULL,
        age INTEGER NOT NULL,
        lieu_naissance TEXT NOT NULL,
        adresse TEXT NOT NULL,
        telephone TEXT NOT NULL,
        sexe TEXT CHECK(sexe IN ('M', 'F')) NOT NULL,
        type_contrat TEXT CHECK(type_contrat IN ('CDD', 'CDI')) NOT NULL,
        poste TEXT NOT NULL,
        departement TEXT NOT NULL,
        date_embauche TEXT NOT NULL,
        duree_contrat INTEGER ,
        FOREIGN KEY(poste) REFERENCES postes(id)
      )
    `, (err) => {
      if (err) console.error("Erreur création table personnel:", err.message);
      else console.log("Table personnel créée ou existante.");
      
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS conges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricule TEXT NOT NULL,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    poste TEXT NOT NULL,
    departement TEXT NOT NULL,
    type_conge TEXT NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    duree INTEGER,
    commentaire TEXT,
    
    date_enregistrement DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (matricule) REFERENCES personnel(matricule)
);
    `, (err) => {
      if (err) console.error("Erreur création table conges:", err.message);
      else console.log("Table conges créée ou existante.");
      
    });

    

       db.prepare(`
  CREATE TABLE IF NOT EXISTS stage (
  id INT PRIMARY KEY,
  nom_stagiaire VARCHAR(100),
  prenom_stagiaire VARCHAR(100),
  date_naissance DATE,
  date_debut DATE,
  date_fin DATE,
  duree INT, -- durée en jours
  poste_id INT,
  encadreur_id INT,
  type_stage VARCHAR(50),
  FOREIGN KEY (poste_id) REFERENCES postes(id),
  FOREIGN KEY (encadreur_id) REFERENCES personnel(matricule)
);
   `, (err) => {
      if (err) console.error("Erreur création table stage:", err.message);
      else console.log("Table stage créée ou existante.");
       });

    
  



          // Vérification admin
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
  };


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



// ===================================================================
// ANNALYSE DE CV
// ===================================================================

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
      // Supprime le fichier temporaire même en cas d'erreur de format
      fs.unlinkSync(tempFilePath);
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
      filePath: '' // Le fichier temporaire est supprimé, donc le chemin n'est plus pertinent ici
    };

    // Stocke l'analyse dans le fichier JSON
    const analyses = readCvAnalyses();
    analyses.push(analysisResult);
    writeCvAnalyses(analyses);

    return { success: true, analysis: analysisResult };
  } catch (error) {
    console.error('Erreur lors de l\'analyse de CV:', error);
    // Assurez-vous de supprimer le fichier temporaire même en cas d'erreur inattendue
    const tempDir = app.getPath('temp');
    const tempFilePath = path.join(tempDir, fileName);
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
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


// Postes
ipcMain.handle('add-poste', async (event, poste, ficheBuffer, ficheName) => {
  const fichesDir = path.join(app.getPath('userData'), 'fiches_poste');
  if (!fs.existsSync(fichesDir)) fs.mkdirSync(fichesDir);

  const ext = path.extname(ficheName);
  const fichePath = path.join(fichesDir, `${poste.id}${ext}`);

  console.log("Buffer reçu dans main:", ficheBuffer);
console.log("Nom du fichier reçu dans main:", ficheName);
console.log("Chemin où sera écrit le fichier:", fichePath);

  fs.writeFileSync(fichePath, ficheBuffer);

  return new Promise((resolve) => {
    db.run(
      'INSERT INTO postes (id, intitule, description, fiche_poste, places_desirees, departement) VALUES (?, ?, ?, ?, ?, ?)',
      [poste.id, poste.intitule, poste.description, fichePath, poste.places_desirees, poste.departement],
      (err) => {
        if (err) resolve({ success: false, message: err.message });
        else resolve({ success: true });
      }
    );
  });
});

ipcMain.handle('get-all-postes', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM postes', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('update-poste', async (event, poste) => {
  return new Promise((resolve) => {
    db.run(
      `UPDATE postes SET intitule = ?, description = ?, places_desirees = ?, departement = ? WHERE id = ?`,
      [poste.intitule, poste.description, poste.places_desirees, poste.departement, poste.id],
      (err) => {
        if (err) {
          console.error("Erreur update poste:", err.message);
          resolve({ success: false, message: err.message });
        } else resolve({ success: true });
      }
    );
  });
});

ipcMain.handle('delete-poste', async (event, id) => {
  return new Promise((resolve) => {
    db.run('DELETE FROM postes WHERE id = ?', [id], (err) => {
      if (err) {
        console.error("Erreur suppression poste:", err.message);
        resolve({ success: false, message: err.message });
      } else resolve({ success: true });
    });
  });
});

// Personnel


// Handler pour ajouter un employé
ipcMain.handle('add-employee', async (event, employee) => {
  return new Promise((resolve) => {
    // Insertion de l'employé
    db.run(
      `INSERT INTO personnel 
        (matricule, nom, prenom, date_naissance, age, lieu_naissance, adresse, telephone, sexe, type_contrat, poste, departement, date_embauche, duree_contrat)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employee.matricule,
        employee.nom,
        employee.prenom,
        employee.date_naissance,
        employee.age,
        employee.lieu_naissance,
        employee.adresse,
        employee.telephone,
        employee.sexe,
        employee.type_contrat,
        employee.poste,
        employee.departement,
        employee.date_embauche,
        employee.duree_contrat
      ],
      function (err) {
        if (err) {
          resolve({ success: false, message: err.message });
        } else {
          // Optionnel : si tu veux gérer un champ places_occupees dans la table postes
          // db.run('UPDATE postes SET places_occupees = places_occupees + 1 WHERE id = ?', [employee.poste]);
          resolve({ success: true });
        }
      }
    );
  });
});


ipcMain.handle('get-all-employees', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM personnel', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('update-employee', async (event, employee) => {
  return new Promise((resolve) => {
    db.run(
      `UPDATE personnel SET nom = ?, prenom = ?, date_naissance = ?, age = ?,  lieu_naissance= ?, adresse= ?, telephone= ?, sexe = ?, type_contrat = ?, poste = ?, departement = ?, date_embauche = ?, duree_contrat= ? WHERE matricule = ?`,
      [employee.nom, employee.prenom, employee.date_naissance, employee.age, employee.lieu_naissance, employee.adresse, employee.telephone, employee.sexe, employee.type_contrat, employee.poste, employee.departement, employee.date_embauche, employee.duree_contrat, employee.matricule],
      (err) => {
        if (err) {
          console.error("Erreur update employé:", err.message);
          resolve({ success: false, message: err.message });
        } else resolve({ success: true });
      }
    );
  });
});

ipcMain.handle('delete-employee', async (event, matricule) => {
  return new Promise((resolve) => {
    db.run('DELETE FROM personnel WHERE matricule = ?', [matricule], (err) => {
      if (err) {
        console.error("Erreur suppression employé:", err.message);
        resolve({ success: false, message: err.message });
      } else resolve({ success: true });
    });
  });
});

ipcMain.handle('count-employees-by-poste', async (event, poste) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS count FROM personnel WHERE poste = ?', [poste], (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });
});

// Ouvrir un fichier (fiche de poste)
ipcMain.handle('open-file1', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    console.error("Erreur ouverture fichier:", error.message);
    return { success: false, message: error.message };
  }
});


ipcMain.handle('saveFicheFile', async (event, ficheFile) => {
  const fichesDir = path.join(app.getPath('userData'), 'fiches_poste');
  if (!fs.existsSync(fichesDir)) fs.mkdirSync(fichesDir);
  const destPath = path.join(fichesDir, ficheFile.name);
  fs.copyFileSync(ficheFile.path, destPath);
  return destPath;
});


ipcMain.handle('openFicheFile', async (event, fichePath) => {
  shell.openPath(fichePath);
});

// Récupérer personnel par matricule
ipcMain.handle('get-personnel-by-matricule', async (_, matricule) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT p.nom, p.prenom, ps.intitule AS poste,
      ps.departement
      FROM personnel p
      LEFT JOIN postes ps ON p.poste = ps.id
      WHERE p.matricule = ?
    `;
    db.get(query, [matricule], (err, row) => {
      if (err) {
        console.error("Erreur dans get-personnel-by-matricule:", err);
        return reject(err);
      }
      resolve(row || null);
    });
  });
});

// Enregistrer la demande de congé
ipcMain.handle('save-conge', async (_, data) => {
  return new Promise((resolve, reject) => {
    const { matricule, nom, prenom, poste, departement, typeConge, dateDebut, dateFin, dureeConge, commentaires } = data;
    db.run(
      `INSERT INTO conges (matricule, nom, prenom, poste, departement, type_conge, date_debut, date_fin, duree, commentaires)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [matricule, nom, prenom, poste, departement, typeConge, dateDebut, dateFin, dureeConge, commentaires],
      function (err) {
        if (err) return reject(err);
        resolve({ success: true });
      }
    );
  });
});




// Récupérer tous les congés avec les infos du personnel
ipcMain.handle('get-all-conges', async () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        c.id, c.matricule, p.nom, p.prenom, po.intitule AS poste, po.departement,
        c.type_conge, c.date_debut, c.date_fin, c.commentaires,
        julianday(c.date_fin) - julianday(c.date_debut) + 1 AS duree
      FROM conges c
      JOIN personnel p ON p.matricule = c.matricule
      JOIN postes po ON po.id = p.poste
      ORDER BY c.date_debut DESC
    `;
    db.all(query, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});



// Modifier un congé existant
ipcMain.handle('update-conge', async (_, conge) => {
  return new Promise((resolve, reject) => {
    const { id, matricule, typeConge, dateDebut, dateFin, commentaires } = conge;
    const query = `UPDATE conges SET matricule = ?, type_conge = ?, date_debut = ?, date_fin = ?, commentaires=? WHERE id = ?`;
    db.run(query, [matricule, typeConge, dateDebut, dateFin, commentaires, id], function (err) {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
});

// Supprimer un congé
ipcMain.handle('delete-conge', async (_, id) => {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM conges WHERE id = ?`, [id], function (err) {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
});

function insertLog(log) {
  const stmt = db.prepare(`
    INSERT INTO audit_logs 
    (user_id, user_name, user_role, action_type, action_description, action_date, module_name, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    log.user_id,
    log.user_name,
    log.user_role,
    log.action_type,
    log.action_description,
    log.action_date,
    log.module_name,
    log.ip_address
  );
}

function getLogs() {
  const stmt = db.prepare(`SELECT * FROM audit_logs ORDER BY action_date DESC`);
  return stmt.all();
}

module.exports = { insertLog, getLogs };

// Écoute des requêtes du renderer pour insérer un log
ipcMain.handle('log-action', async (event, log) => {
  try {
    insertLog(log);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Récupérer tous les logs
ipcMain.handle('get-logs', async () => {
  try {
    const logs = getLogs();
    return { success: true, logs };
  } catch (error) {
    return { success: false, error: error.message };
  }
});



// Récupérer les départements
ipcMain.handle('get-departements', () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM postes ORDER BY departement', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
})

ipcMain.handle('get-personnel-by-departement', (event, departement) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM personnel WHERE departement = ? ORDER BY nom, prenom', 
      [departement], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('save-stage', (event, stageData) => {
  return new Promise((resolve, reject) => {
    const { nom, prenom, dateNaissance, dateDebut, dateFin, duree, 
            posteId, encadreurId, typeStage } = stageData;
    
    db.run(`INSERT INTO stages (nom, prenom, date_naissance, date_debut, date_fin, 
            duree, poste_id, encadreur_id, type_stage) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nom, prenom, dateNaissance, dateDebut, dateFin, duree, 
       posteId, encadreurId, typeStage],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
  });
});

ipcMain.handle('get-stages', (event, filters = {}) => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT s.*, p.intitule as poste_intitule, e.nom as encadreur_nom, e.prenom as encadreur_prenom
      FROM stage s
      LEFT JOIN postes p ON s.poste_id = p.id
      LEFT JOIN personnel e ON s.encadreur_id = e.matricule
      WHERE 1=1
    `;

    const params = [];

    if (filters.poste_id) {
      query += ' AND s.poste_id = ?';
      params.push(filters.poste_id);
    }

    if (filters.type_stage) {
      query += ' AND s.type_stage = ?';
      params.push(filters.type_stage);
    }

    if (filters.search) {
      query += ' AND (s.nom LIKE ? OR s.prenom LIKE ?)';
      params.push(`%${filters.search}%, %${filters.search}%`);
    }

    query += ' ORDER BY s.date_debut DESC';

    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});


ipcMain.handle('update-stage-status', (event, stageId, statut) => {
  return new Promise((resolve, reject) => {
    db.run('UPDATE stages SET statut = ? WHERE id = ?', [statut, stageId], 
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
  });
});

ipcMain.handle('delete-stage', (event, stageId) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM stages WHERE id = ?', [stageId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
});

ipcMain.handle('get-stage-stats', () => {
  return new Promise((resolve, reject) => {
    const stats = {};
    
    // Total des stages
    db.get('SELECT COUNT(*) as total FROM stages', (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      stats.total = row.total;
      
      // Stages en cours
      db.get('SELECT COUNT(*) as enCours FROM stages WHERE statut = "En cours"', (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        stats.enCours = row.enCours;
        
        // Stages par type
        db.all('SELECT type_stage, COUNT(*) as count FROM stages GROUP BY type_stage', (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          stats.parType = rows;
          resolve(stats);
        });
      });
    });
  });
});

