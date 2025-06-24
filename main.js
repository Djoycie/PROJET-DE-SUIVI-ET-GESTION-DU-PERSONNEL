const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const pool = require('./db');
const fs = require('fs');


let mainWindow;

async function createDefaultAdminUser() {
  try {
    // Vérifier si l'utilisateur admin existe déjà
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS count FROM users WHERE username = ?',
      ['admin']
    );

    if (rows[0].count === 0) {
      // Insérer l'utilisateur admin par défaut
      await pool.query(
        'INSERT INTO users (username, password, fullName, role) VALUES (?, ?, ?, ?)',
        ['admin', 'admin123', 'Administrateur', 'admin']
      );
      console.log("Utilisateur admin par défaut créé : admin / admin123");
    } else {
      console.log("Utilisateur admin existe déjà.");
    }
  } catch (err) {
    console.error("Erreur lors de la création de l'utilisateur admin par défaut :", err);
  }
}

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
  });
}

app.on('ready', async () => {
  await createDefaultAdminUser(); // Créer l'utilisateur admin si besoin avant d'ouvrir la fenêtre
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// =========================
// Gestion utilisateurs
// =========================

// Authentification
ipcMain.handle('authenticate-user', async (event, { username, password, role }) => {
  try {
    const [rows] = await pool.query(
      'SELECT username, fullName, role FROM users WHERE username = ? AND password = ? AND role = ?',
      [username, password, role]
    );
    if (rows.length > 0) {
      return { success: true, user: rows[0] };
    } else {
      return { success: false, message: "Nom d'utilisateur, mot de passe ou rôle incorrect." };
    }
  } catch (err) {
    return { success: false, message: "Erreur serveur lors de l'authentification." };
  }
});

// ... (le reste du code de gestion utilisateurs reste inchangé)





// Récupérer tous les utilisateurs
ipcMain.handle('get-all-users', async () => {
  try {
    const [rows] = await pool.query('SELECT username, fullName, role FROM users');
    return rows;
  } catch (err) {
    return { success: false, message: "Erreur lors de la récupération des utilisateurs." };
  }
});

// Ajouter un nouvel utilisateur
ipcMain.handle('add-new-user', async (event, newUser) => {
  try {
    const [checkRows] = await pool.query(
      'SELECT COUNT(*) AS count FROM users WHERE username = ?',
      [newUser.username]
    );
    if (checkRows[0].count > 0) {
      return { success: false, message: "Ce nom d'utilisateur existe déjà." };
    }
    await pool.query(
      'INSERT INTO users (username, password, fullName, role) VALUES (?, ?, ?, ?)',
      [newUser.username, newUser.password, newUser.fullName, newUser.role]
    );
    return { success: true };
  } catch (err) {
    return { success: false, message: "Erreur serveur lors de l'ajout de l'utilisateur." };
  }
});

// Modifier un utilisateur
ipcMain.handle('update-user', async (event, updatedUser) => {
  try {
    // Vérifier si le nouveau username existe déjà (sauf si c'est le même)
    const [checkRows] = await pool.query(
      'SELECT COUNT(*) AS count FROM users WHERE username = ? AND username != ?',
      [updatedUser.username, updatedUser.originalUsername]
    );
    if (checkRows[0].count > 0) {
      return { success: false, message: "Le nouveau nom d'utilisateur existe déjà." };
    }
    let query, params;
    if (updatedUser.password && updatedUser.password.trim() !== '') {
      query = 'UPDATE users SET username = ?, password = ?, fullName = ?, role = ? WHERE username = ?';
      params = [updatedUser.username, updatedUser.password, updatedUser.fullName, updatedUser.role, updatedUser.originalUsername];
    } else {
      query = 'UPDATE users SET username = ?, fullName = ?, role = ? WHERE username = ?';
      params = [updatedUser.username, updatedUser.fullName, updatedUser.role, updatedUser.originalUsername];
    }
    const [result] = await pool.query(query, params);
    if (result.affectedRows === 0) {
      return { success: false, message: "Utilisateur introuvable ou aucune modification effectuée." };
    }
    return { success: true };
  } catch (err) {
    return { success: false, message: "Erreur serveur lors de la mise à jour." };
  }
});

// Supprimer un utilisateur
ipcMain.handle('delete-user', async (event, usernameToDelete) => {
  try {
    if (usernameToDelete === 'admin') {
      return { success: false, message: "L'utilisateur 'admin' ne peut pas être supprimé." };
    }
    const [result] = await pool.query('DELETE FROM users WHERE username = ?', [usernameToDelete]);
    if (result.affectedRows === 0) {
      return { success: false, message: "Utilisateur non trouvé pour la suppression." };
    }
    return { success: true };
  } catch (err) {
    return { success: false, message: "Erreur serveur lors de la suppression." };
  }
});

ipcMain.on('logout', (event) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    // Exemple : recharger la page login.html
    win.loadFile('login.html');
  }
  // Vous pouvez aussi nettoyer les sessions, tokens, etc. ici
});

ipcMain.on('load-module', (event, moduleName) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    // Chargez le fichier HTML correspondant au module
    win.loadFile(moduleName).catch(err => {
      console.error(`Erreur lors du chargement du module ${moduleName}:`, err);
    });
  }
});


 
// Handler pour ajouter un poste avec fichier (fiche de poste)
ipcMain.handle('add-poste', async (event, poste, ficheBuffer, ficheName) => {
  try {
    // Répertoire pour stocker les fiches de poste
    const fichesDir = path.join(app.getPath('userData'), 'fiches_poste');
    if (!fs.existsSync(fichesDir)) {
      fs.mkdirSync(fichesDir, { recursive: true });
    }

    // Extension et chemin complet du fichier
    const ext = path.extname(ficheName);
    const fichePath = path.join(fichesDir, `${poste.id}${ext}`);

    console.log("Buffer reçu dans main:", ficheBuffer);
    console.log("Nom du fichier reçu dans main:", ficheName);
    console.log("Chemin où sera écrit le fichier:", fichePath);

    // Écriture du fichier sur disque
    fs.writeFileSync(fichePath, Buffer.from(ficheBuffer));

    // Insertion en base MySQL
    const sql = `INSERT INTO postes (id, intitule, description, fiche_poste, places_desirees, departement)
                 VALUES (?, ?, ?, ?, ?, ?)`;

    const [result] = await pool.query(sql, [
      poste.id,
      poste.intitule,
      poste.description,
      fichePath,
      poste.places_desirees,
      poste.departement,
      
    ]);

    return { success: true, insertId: result.insertId };
  } catch (error) {
    console.error('Erreur dans add-poste:', error);
    return { success: false, message: error.message };
  }
});

// Handler pour récupérer tous les postes
ipcMain.handle('get-all-postes', async () => {
  try {
    const [rows] = await pool.query('SELECT * FROM postes');
    return rows;
  } catch (error) {
    console.error('Erreur récupération postes:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('count-employees-by-poste', async (event, posteId) => {
  try {
    const sql = 'SELECT COUNT(*) AS count FROM personnel WHERE poste = ?';
    const [rows] = await pool.query(sql, [posteId]);
    return rows[0].count || 0;
  } catch (error) {
    console.error('Erreur count-employees-by-poste:', error);
    return 0;
  }
});


// Handler pour mettre à jour un poste (avec champ agence)
ipcMain.handle('update-poste', async (event, poste) => {
  try {
    const sql = `
      UPDATE postes
      SET intitule = ?, description = ?, places_desirees = ?, departement = ?
      WHERE id = ?
    `;
    const [result] = await pool.query(sql, [
      poste.intitule,
      poste.description,
      poste.places_desirees,
      poste.departement,
    
      poste.id
    ]);
    if (result.affectedRows === 0) {
      return { success: false, message: "Poste non trouvé ou aucune modification effectuée." };
    }
    return { success: true };
  } catch (error) {
    console.error("Erreur update poste:", error);
    return { success: false, message: error.message };
  }
});

// Handler pour supprimer un poste
ipcMain.handle('delete-poste', async (event, id) => {
  try {
    const sql = 'DELETE FROM postes WHERE id = ?';
    const [result] = await pool.query(sql, [id]);
    if (result.affectedRows === 0) {
      
      return { success: false, message: "Poste non trouvé pour la suppression." };
    }
    return { success: true };
  } catch (error) {
    console.error("Erreur suppression poste:", error);
    return { success: false, message: error.message };
  }
});



// --- Gestion du personnel avec agence ---

ipcMain.handle('add-employee', async (event, employee) => {
  try {
    await pool.query(
      `INSERT INTO personnel 
      (matricule, nom, prenom, date_naissance, age, lieu_naissance, adresse, telephone, sexe, type_contrat, poste, departement, agence, date_embauche, duree_contrat)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        employee.agence,
        employee.date_embauche,
        employee.duree_contrat
      ]
    );
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('get-all-employees', async () => {
  try {
    const [rows] = await pool.query('SELECT * FROM personnel');
    return rows;
  } catch (err) {
    return [];
  }
});

ipcMain.handle('update-employee', async (event, employee) => {
  try {
    const [result] = await pool.query(
      `UPDATE personnel SET nom=?, prenom=?, date_naissance=?, age=?, lieu_naissance=?, adresse=?, telephone=?, sexe=?, type_contrat=?, poste=?, departement=?, agence=?, date_embauche=?, duree_contrat=?
       WHERE matricule=?`,
      [
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
        employee.agence,
        employee.date_embauche,
        employee.duree_contrat,
        employee.matricule
      ]
    );
    return { success: result.affectedRows > 0 };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('delete-employee', async (event, matricule) => {
  try {
    const [result] = await pool.query('DELETE FROM personnel WHERE matricule = ?', [matricule]);
    return { success: result.affectedRows > 0 };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// Pour le filtrage par agence :
ipcMain.handle('get-all-agences', async () => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT agence FROM personnel');
    return rows.map(r => r.agence);
  } catch (err) {
    return [];
  }
});

// Récupérer la liste des départements (postes)
ipcMain.handle('getPostes', async () => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT departement FROM postes ORDER BY departement');
    return rows.map(r => r.departement);
  } catch (err) {
    console.error('Erreur getPostes:', err);
    throw err;
  }
});

// Récupérer le personnel par département
ipcMain.handle('getPersonnelByDepartement', async (_, departement) => {
  try {
    const sql = `
      SELECT pers.matricule, pers.nom, pers.prenom, pers.poste AS poste_id, p.intitule AS poste_intitule
      FROM personnel pers
      JOIN postes p ON pers.poste = p.id
      WHERE p.departement = ?
      ORDER BY pers.nom, pers.prenom
    `;
    const [rows] = await pool.query(sql, [departement]);
    return rows;
  } catch (err) {
    console.error('Erreur getPersonnelByDepartement:', err);
    throw err;
  }
});

// Récupérer les stages avec filtres
ipcMain.handle('getStages', async (_, filters) => {
  try {
    let sql = `
      SELECT s.id, s.nom_stagiaire, s.prenom_stagiaire, s.date_naissance, s.date_debut, s.date_fin, s.duree,
             p.intitule AS poste_intitule,
             e.nom AS encadreur_nom, e.prenom AS encadreur_prenom, e.matricule AS encadreur_matricule,
             s.type_stage, s.statut
      FROM stages s
      LEFT JOIN postes p ON s.poste_id = p.id
      LEFT JOIN personnel e ON s.encadreur_id = e.matricule
      WHERE 1=1
    `;
    const params = [];

    if (filters) {
      if (filters.departement) {
        sql += ` AND p.departement = ?`;
        params.push(filters.departement);
      }
      if (filters.typeStage) {
        sql += ` AND s.type_stage = ?`;
        params.push(filters.typeStage);
      }
      if (filters.statut) {
        sql += ` AND s.statut = ?`;
        params.push(filters.statut);
      }
      if (filters.search) {
        sql += ` AND (s.nom_stagiaire LIKE ? OR s.prenom_stagiaire LIKE ?)`;
        params.push(`%${filters.search}%, %${filters.search}%`);
      }
 }

    sql += ` ORDER BY s.date_debut DESC`;

    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (err) {
    console.error('Erreur getStages:', err);
    throw err;
  }
});

// Enregistrer un nouveau stage
ipcMain.handle('saveStage', async (_, stage) => {
  try {
    // Vérification d'existence
    const checkSql = `
      SELECT id FROM stages
      WHERE nom_stagiaire = ? AND prenom_stagiaire = ? AND date_naissance = ?
        AND date_debut = ? AND date_fin = ? AND poste_id = ?
    `;
    const [existing] = await pool.query(checkSql, [
      stage.nom_stagiaire,
      stage.prenom_stagiaire,
      stage.date_naissance,
      stage.date_debut,
      stage.date_fin,
      stage.poste_id
    ]);
    if (existing.length > 0) {
      return { success: false, message: "Ce stagiaire a déjà un stage enregistré pour cette période et ce département." };
    }

    // Insertion normale si pas de doublon
    const sql = `
      INSERT INTO stages 
        (nom_stagiaire, prenom_stagiaire, date_naissance, date_debut, date_fin, duree, poste_id, encadreur_id, type_stage, statut)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      stage.nom_stagiaire,
      stage.prenom_stagiaire,
      stage.date_naissance,
      stage.date_debut,
      stage.date_fin,
      stage.duree,
      stage.poste_id,
      stage.encadreur_id,
      stage.type_stage,
      stage.statut || 'En cours'
    ];
    const [result] = await pool.query(sql, params);
    return { success: true, id: result.insertId };
  } catch (err) {
    console.error('Erreur saveStage:', err);
    return { success: false, message: err.message };
  }
});

// Mettre à jour le statut d’un stage
ipcMain.handle('updateStageStatus', async (_, id, statut) => {
  try {
    const sql = `UPDATE stages SET statut = ? WHERE id = ?`;
    const [result] = await pool.query(sql, [statut, id]);
    return { success: result.affectedRows > 0 };
  } catch (err) {
    console.error('Erreur updateStageStatus:', err);
    return { success: false, message: err.message };
  }
});

// Supprimer un stage
ipcMain.handle('deleteStage', async (_, id) => {
  try {
    const sql = `DELETE FROM stages WHERE id = ?`;
    const [result] = await pool.query(sql, [id]);
    return { success: result.affectedRows > 0 };
  } catch (err) {
    console.error('Erreur deleteStage:', err);
    return { success: false, message: err.message };
  }
});






// Récupérer personnel par matricule
ipcMain.handle('get-personnel-by-matricule', async (_, matricule) => {
  try {
    const sql = `
      SELECT p.nom, p.prenom, ps.intitule AS poste, ps.departement
      FROM personnel p
      LEFT JOIN postes ps ON p.poste = ps.id
      WHERE p.matricule = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [matricule]);
    return rows[0] || null;
  } catch (err) {
    console.error("Erreur dans get-personnel-by-matricule:", err);
    throw err;
  }
});

// Enregistrer la demande de congé
ipcMain.handle('save-conge', async (_, data) => {
  try {
    const { matricule, nom, prenom, poste, departement, typeConge, dateDebut, dateFin, dureeConge, commentaires } = data;
    const sql = `
      INSERT INTO conges 
        (matricule, nom, prenom, poste, departement, type_conge, date_debut, date_fin, duree_conge, commentaires)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await pool.query(sql, [matricule, nom, prenom, poste, departement, typeConge, dateDebut, dateFin, dureeConge, commentaires]);
    return { success: true };
  } catch (err) {
    console.error("Erreur save-conge:", err);
    return { success: false, message: err.message };
  }
});

// Récupérer tous les congés avec infos personnel
ipcMain.handle('get-all-conges', async () => {
  try {
    const sql = `
      SELECT 
        c.id, c.matricule, p.nom, p.prenom, po.intitule AS poste, po.departement,
        c.type_conge, c.date_debut, c.date_fin, c.commentaires,
        DATEDIFF(c.date_fin, c.date_debut) + 1 AS duree
      FROM conges c
      JOIN personnel p ON p.matricule = c.matricule
      JOIN postes po ON po.id = p.poste
      ORDER BY c.date_debut DESC
    `;
    const [rows] = await pool.query(sql);
    return rows;
  } catch (err) {
    console.error("Erreur get-all-conges:", err);
    return [];
  }
});

// Modifier un congé existant
ipcMain.handle('update-conge', async (_, conge) => {
  try {
    const { id, matricule, typeConge, dateDebut, dateFin, commentaires } = conge;
    const sql = `
      UPDATE conges SET matricule = ?, type_conge = ?, date_debut = ?, date_fin = ?, commentaires = ?
      WHERE id = ?
    `;
    const [result] = await pool.query(sql, [matricule, typeConge, dateDebut, dateFin, commentaires, id]);
    return { success: result.affectedRows > 0 };
  } catch (err) {
    console.error("Erreur update-conge:", err);
    return { success: false, message: err.message };
  }
});

// Supprimer un congé
ipcMain.handle('delete-conge', async (_, id) => {
  try {
    const [result] = await pool.query('DELETE FROM conges WHERE id = ?', [id]);
    return { success: result.affectedRows > 0 };
  } catch (err) {
    console.error("Erreur delete-conge:", err);
    return { success: false, message: err.message };
  }
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
      .map(q => {const parts = q.trim().split(':');
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



   

// --- IPC Handlers for Carrière Module ---

// Get all assignments
ipcMain.handle('get-affectations', async () => {
    try {
        const [rows] = await pool.query(`
            SELECT
                a.id,
                p.nom,
                p.prenom,
                ps.intitule AS poste_intitule,
                a.date_affectation,
                a.date_fin_affectation,
                a.description_affectation
            FROM
                affectations a
            JOIN
                personnel p ON a.matricule_personnel = p.matricule
            JOIN
                postes ps ON a.id_poste = ps.id
            ORDER BY a.date_affectation DESC
        `);
        return rows;
    } catch (err) {
        console.error('Error fetching affectations:', err);
        return { error: err.message };
    }
});

// Add a new assignment
ipcMain.handle('add-affectation', async (event, data) => {
    const { matricule_personnel, id_poste, date_affectation, date_fin_affectation, description_affectation } = data;
    try {
        const [result] = await pool.query(
            `INSERT INTO affectations (matricule_personnel, id_poste, date_affectation, date_fin_affectation, description_affectation)
             VALUES (?, ?, ?, ?, ?)`,
            [matricule_personnel, id_poste, date_affectation, date_fin_affectation || null, description_affectation || null]
        );
        return { success: true, id: result.insertId };
    } catch (err) {
        console.error('Error adding affectation:', err);
        return { error: err.message };
    }
});

// Update an assignment
ipcMain.handle('update-affectation', async (event, data) => {
    const { id, matricule_personnel, id_poste, date_affectation, date_fin_affectation, description_affectation } = data;
    try {
        const [result] = await pool.query(
            `UPDATE affectations SET
                matricule_personnel = ?,
                id_poste = ?,
                date_affectation = ?,
                date_fin_affectation = ?,
                description_affectation = ?
             WHERE id = ?`,
            [matricule_personnel, id_poste, date_affectation, date_fin_affectation || null, description_affectation || null, id]
        );
        return { success: result.affectedRows > 0 };
    } catch (err) {
        console.error('Error updating affectation:', err);
        return { error: err.message };
    }
});

// Delete an assignment
ipcMain.handle('delete-affectation', async (event, id) => {
    try {
        const [result] = await pool.query('DELETE FROM affectations WHERE id = ?', [id]);
        return { success: result.affectedRows > 0 };
    } catch (err) {
        console.error('Error deleting affectation:', err);
        return { error: err.message };
    }
});

// --- IPC Handlers to get lists for dropdowns (Personnel and Postes) ---

ipcMain.handle('get-all-personnel-for-dropdown', async () => {
    try {
        const [rows] = await pool.query('SELECT matricule, nom, prenom FROM personnel ORDER BY nom, prenom');
        return rows;
    } catch (err) {
        console.error('Error fetching personnel for dropdown:', err);
        return { error: err.message };
    }
});

ipcMain.handle('get-all-postes-for-dropdown', async () => {
    try {
        const [rows] = await pool.query('SELECT id, intitule FROM postes ORDER BY intitule');
        return rows;
    } catch (err) {
        console.error('Error fetching postes for dropdown:', err);
        return { error: err.message };
    }
});

