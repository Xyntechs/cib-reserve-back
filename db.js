const admin = require("firebase-admin");

admin.initializeApp({
  credential: undefined
});

class DBConnection {
  constructor() {
    this.firestore = admin.firestore();
  }

  static getInstance() {
    if (!this._instance) this._instance = new DBConnection();

    return this._instance; // convention for private fields to prefix _
  }

  getCollection(collectionName) {
    return this.firestore.collection(collectionName);
  }

  getDocumentFromCollection(collection, document) {
    return this.getCollection(collection).doc(document);
  }
}

module.exports = DBConnection;
