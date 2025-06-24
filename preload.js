// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  authenticateUser: (credentials) => ipcRenderer.invoke('authenticate-user', credentials),

  getAllUsers: () => ipcRenderer.invoke('get-all-users'),
  addNewUser: (user) => ipcRenderer.invoke('add-new-user', user),
  updateUser: (user) => ipcRenderer.invoke('update-user', user),
  deleteUser: (username) => ipcRenderer.invoke('delete-user', username),
   logout: () => ipcRenderer.send('logout'),  // Expose la fonction logout
 loadModule: (moduleName) => ipcRenderer.send('load-module', moduleName),
  // Gestion des postes
  addPoste: (poste, ficheBuffer, ficheName) => ipcRenderer.invoke('add-poste', poste, ficheBuffer, ficheName),
  getAllPostes: () => ipcRenderer.invoke('get-all-postes'),
  updatePoste: (poste, ficheBuffer, ficheName) => ipcRenderer.invoke('update-poste', poste, ficheBuffer, ficheName),
  deletePoste: (id) => ipcRenderer.invoke('delete-poste', id),
  countEmployeesByPoste: (posteId) => ipcRenderer.invoke('count-employees-by-poste', posteId),
  getPosteById: (id) => ipcRenderer.invoke('get-poste-by-id', id),
  getFichePoste: (fichePath) => ipcRenderer.invoke('get-fiche-poste', fichePath),


  addEmployee: (employee) => ipcRenderer.invoke('add-employee', employee),
  getAllEmployees: () => ipcRenderer.invoke('get-all-employees'),
  updateEmployee: (employee) => ipcRenderer.invoke('update-employee', employee),
  deleteEmployee: (matricule) => ipcRenderer.invoke('delete-employee', matricule),
  getAllAgences: () => ipcRenderer.invoke('get-all-agences'),
 getStages: (filters) => ipcRenderer.invoke('getStages', filters),
  getPostes: () => ipcRenderer.invoke('getPostes'),
  getPersonnelByDepartement: (departement) => ipcRenderer.invoke('getPersonnelByDepartement', departement),
  saveStage: (stageData) => ipcRenderer.invoke('saveStage', stageData),
  deleteStage: (id) => ipcRenderer.invoke('deleteStage', id),
  updateStageStatus: (id, statut) => ipcRenderer.invoke('updateStageStatus', id, statut),
  getStageStats: () => ipcRenderer.invoke('getStageStats'),

 getPersonnelByMatricule: (matricule) => ipcRenderer.invoke('get-personnel-by-matricule', matricule),
  getAllConges: () => ipcRenderer.invoke('get-all-conges'),
  saveConge: (congeData) => ipcRenderer.invoke('save-conge', congeData),
  updateConge: (congeData) => ipcRenderer.invoke('update-conge', congeData),
  deleteConge: (id) => ipcRenderer.invoke('delete-conge', id),
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

       openFile1: (filePath) => {
        try {
          return ipcRenderer.invoke('open-file', filePath);
        } catch (error) {
          console.error('Erreur dans openFile1:', error);
          throw error;
        }
      },
  getAffectations: () => ipcRenderer.invoke('get-affectations'),
    addAffectation: (data) => ipcRenderer.invoke('add-affectation', data),
    updateAffectation: (data) => ipcRenderer.invoke('update-affectation', data),
    deleteAffectation: (id) => ipcRenderer.invoke('delete-affectation', id),
    getAllPersonnel: () => ipcRenderer.invoke('get-all-personnel-for-dropdown'),
    getAllPostes3: () => ipcRenderer.invoke('get-all-postes-for-dropdown')



  // ... autres méthodes exposées

});