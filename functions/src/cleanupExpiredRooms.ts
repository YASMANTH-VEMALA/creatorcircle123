import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export const cleanupExpiredRooms = functions
  .runWith({ timeoutSeconds: 240, memory: '512MB' })
  .pubsub.schedule('every 10 minutes')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    const snapshot = await db
      .collection('rooms')
      .where('isTemporary', '==', true)
      .where('endsAt', '<=', now)
      .get();

    if (snapshot.empty) return null;

    for (const docSnap of snapshot.docs) {
      const roomId = docSnap.id;
      const batch = db.batch();

      // Delete messages
      const msgs = await db.collection('rooms').doc(roomId).collection('messages').get();
      msgs.forEach((d) => batch.delete(d.ref));

      // Delete members
      const mems = await db.collection('rooms').doc(roomId).collection('members').get();
      mems.forEach((d) => batch.delete(d.ref));

      // Delete secret
      const secretRef = db.collection('rooms_secrets').doc(roomId);
      batch.delete(secretRef);

      // Delete room doc
      batch.delete(docSnap.ref);

      await batch.commit();
      console.log(`Deleted expired room ${roomId}`);
    }

    return null;
  }); 