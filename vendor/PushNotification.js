const admin = require("firebase-admin");
const { getMessaging } = require("firebase-admin/messaging");
const serviceAccount = require("../firebase-adminsdk.json");

// avoid initializing twice
const firebaseAdminApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

exports.messaging = getMessaging(firebaseAdminApp);
