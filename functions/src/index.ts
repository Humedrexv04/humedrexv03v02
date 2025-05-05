import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const detectarHumedadBaja = functions.database
  .ref("/devices/{device}/sensors/humedad1")
  .onUpdate(async (change, context) => {
    const deviceId = context.params.device;
    const humedadActual = change.after.val();

    console.log(`🔄 Cambio en dispositivo ${deviceId}: humedad1 = ${humedadActual}`);

    try {
      const usersSnap = await admin.firestore().collection("users").get();

      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const token = userData.token;

        const plantsSnap = await admin
          .firestore()
          .collection(`users/${userId}/plants`)
          .get();

        for (const plantDoc of plantsSnap.docs) {
          const plantData = plantDoc.data();
          const sensor = plantData.sensorHumedad;
          const umbral = plantData.humedad;

          if (sensor?.deviceId === deviceId && humedadActual < umbral) {
            console.log(`⚠️ Humedad baja detectada para usuario ${userId}, planta ${plantDoc.id}`);

            if (!token) {
              console.warn(`⚠️ Usuario ${userId} sin token de FCM`);
              continue;
            }

            const message: admin.messaging.Message = {
              token: token,
              notification: {
                title: "⚠️ Alerta de humedad",
                body: `Humedad baja detectada: ${humedadActual}%`,
              },
            };

            await admin.messaging().send(message);
            console.log(`✅ Notificación enviada a usuario ${userId}`);
          }
        }
      }
    } catch (error) {
      console.error("❌ Error en detectarHumedadBaja():", error);
    }

    return null;
  });
