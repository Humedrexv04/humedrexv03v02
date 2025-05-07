import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const monitorDeviceSensors = functions.database
  .ref("/devices/{deviceId}/sensors/{sensorKey}")
  .onUpdate(async (change, context) => {
    const { deviceId, sensorKey } = context.params;
    const newValue = change.after.val();

    console.log(`🔄 Cambio en ${sensorKey} del dispositivo ${deviceId}: ${newValue}`);

    try {
      const usersSnap = await admin.firestore().collection("users").get();

      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();

        // Accede al pushToken directamente desde el documento del usuario
        const token = userData.pushToken;

        if (!token || typeof token !== "string") {
          console.warn(`⚠️ Usuario ${userId} sin token válido`);
          continue;
        }

        // === HUMEDAD ===
        if (sensorKey !== "nivel_agua") {
          const plantsSnap = await admin
            .firestore()
            .collection(`users/${userId}/plants`)
            .get();

          for (const plantDoc of plantsSnap.docs) {
            const plantData = plantDoc.data();
            const sensor = plantData.sensorHumedad;
            const umbral = plantData.humedad;

            if (sensor?.deviceId === deviceId && sensor?.sensorKey === sensorKey) {
              if (typeof newValue === "number" && typeof umbral === "number") {
                let mensaje = "";

                if (newValue < umbral) {
                  mensaje = `La humedad de tu planta "${plantData.name}" está baja: ${newValue}%`;
                } else if (newValue > umbral) {
                  mensaje = `La humedad de tu planta "${plantData.name}" está alta: ${newValue}%`;
                } else {
                  continue; // Igual al umbral, no notificamos
                }

                await admin.messaging().send({
                  token,
                  notification: {
                    title: "🌿 Alerta de humedad",
                    body: mensaje,
                  },
                });
                console.log(`✅ Notificación de humedad enviada a ${userId}`);
              }
            }
          }
        }

        // === NIVEL DE AGUA ===
        else if (sensorKey === "nivel_agua" && typeof newValue === "number" && newValue < 1000) {
          const mensaje = `El nivel de agua del tanque del dispositivo ${deviceId} está bajo. ¡Rellénalo pronto!`;

          await admin.messaging().send({
            token,
            notification: {
              title: "🚱 Nivel de agua bajo",
              body: mensaje,
            },
          });
          console.log(`✅ Notificación de nivel enviada a ${userId}`);
        }
      }
    } catch (error) {
      console.error("❌ Error en monitorDeviceSensors():", error);
    }

    return null;
  });
