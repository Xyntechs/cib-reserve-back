const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert(
    require("./config/e7gez-app-firebase-adminsdk-jlmei-c8fe6a2fe6.json")
  )
});

class Firebase {
  constructor() {}

  static getInstance() {
    if (!this._instance) this._instance = new Firebase();

    return this._instance; // convention for private fields to prefix _
  }

  getFireStore(app = undefined) {
    return admin.firestore(app);
  }

  getAuth(app = undefined) {
    return admin.auth(app);
  }
}

module.exports = Firebase.getInstance();
