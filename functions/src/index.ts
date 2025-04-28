import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const checkAguaAndNotify = functions.firestore
    .document('users/{uid}/plants/{plantId}')5
    .onUpdate(async (change, context) => {
        const beforeData = change.before.data();
        const afterData = change.after.data();

        const aguaBefore = beforeData.agua;
        const aguaAfter = afterData.agua;

        if (aguaAfter >= 50 || aguaBefore === aguaAfter) {
            return null; // No es crítico o no cambió
        }

        const db = admin.firestore();
        const tokens: string[] = [];

        const usersSnapshot = await db.collection('users').get();

        for (const userDoc of usersSnapshot.docs) {
            const plantsRef = userDoc.ref.collection('plants');
            const plantsSnapshot = await plantsRef.get();

            const userHasCriticalPlant = plantsSnapshot.docs.some(doc => doc.data().agua < 50);

            if (userHasCriticalPlant) {
                const tokenDoc = await userDoc.ref.collection('token').doc('token').get();
                const token = tokenDoc.exists ? tokenDoc.data()?.token : null;

                if (token) {
                    tokens.push(token);
                }
            }
        }

        if (tokens.length === 0) {
            return null;
        }

        const payload: admin.messaging.MessagingPayload = {
            notification: {
                title: '¡Atención!',
                body: 'Una o más plantas tienen un nivel crítico de agua.',
            },
        };

        await admin.messaging().sendToDevice(tokens, payload);
        return null;
    });
