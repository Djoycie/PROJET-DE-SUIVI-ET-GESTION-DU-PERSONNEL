const { contextBridge, ipcRenderer } = require('electron');

console.log('preload.js chargé');

function exposeAPI() {
  try {
    contextBridge.exposeInMainWorld('electronAPI', {
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
      authenticateUser: (data) => {
        try {
          return ipcRenderer.invoke('authenticate-user', data);
        } catch (error) {
          console.error('Erreur dans authenticateUser:', error);
          throw error;
        }
      },
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
      }
    });
    console.log('electronAPI exposée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'exposition de l\'API:', error);
  }
}

exposeAPI();