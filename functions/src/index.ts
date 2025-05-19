import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

interface DeviceData {
  relays?: { [key: string]: boolean };
  timeouts?: { [key: string]: number };
  // Otras propiedades si existen
}

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
        const token = userData.pushToken;

        if (!token || typeof token !== "string") {
          console.warn(`⚠️ Usuario ${userId} sin token válido`);
          continue;
        }

        // === SENSOR DE HUMEDAD ===
        if (sensorKey !== "nivel_agua") {
          const plantsSnap = await admin
            .firestore()
            .collection(`users/${userId}/plants`)
            .get();

          // Hora actual
          const now = new Date();
          const horaActual = now.getHours();
          const minutosActuales = now.getMinutes();

          for (const plantDoc of plantsSnap.docs) {
            const plantData = plantDoc.data();
            const sensor = plantData.sensorHumedad;
            const umbral = plantData.humedad;

            if (sensor?.deviceId === deviceId && sensor?.sensorKey === sensorKey) {
              if (typeof newValue === "number" && typeof umbral === "number") {
                const horarioStr = plantData.horario; // esperado: "HH:mm"
                const [horaPlanta, minutosPlanta] = horarioStr
                  .split(":")
                  .map((n: string) => parseInt(n, 10));

                console.log(
                  `⏰ Planta "${plantData.name}" → horario=${horaPlanta}:${minutosPlanta}, ahora=${horaActual}:${minutosActuales}`
                );

                // Verificar si es el horario programado exacto
                const esHorario = horaActual === horaPlanta && minutosActuales === minutosPlanta;
                const humedadBaja = newValue < umbral;

                if (esHorario && humedadBaja) {
                  const relay = plantData.valvula;
                  const relayPath = `/devices/${deviceId}/relays/${relay?.relayKey}`;

                  if (relay?.deviceId && relay?.relayKey) {
                    const deviceSnap = await admin.database().ref(`/devices/${deviceId}`).once("value");
                    const deviceData = (deviceSnap.val() as DeviceData) || {};

                    const relays = deviceData.relays || {};
                    const timeouts = deviceData.timeouts || {};

                    const relayState = relays[relay.relayKey];
                    const lastTimeout = timeouts[relay.relayKey] || 0;
                    const nowTimestamp = Date.now();

                    // Evitar activar la válvula si ya está activa o si está en tiempo de espera (timeout)
                    if (relayState !== true && nowTimestamp - lastTimeout > 60000) { // 60000 ms = 1 minuto
                      // Activar la válvula
                      await admin.database().ref(relayPath).set(true);
                      console.log(`💧 Válvula activada para planta "${plantData.name}" en ${relayPath}`);

                      // Guardar el timestamp de activación (timeout)
                      await admin.database().ref(`/devices/${deviceId}/timeouts/${relay.relayKey}`).set(nowTimestamp);

                      // Notificación de riego automático
                      await admin.messaging().send({
                        token,
                        notification: {
                          title: "💧 Riego automático",
                          body: `Se activó la válvula para "${plantData.name}" por baja humedad (${newValue}%)`,
                        },
                      });
                      console.log(`📤 Notificación de riego enviada a ${userId}`);
                    } else {
                      console.log(`ℹ️ La válvula ya estaba activa o en tiempo de espera para "${plantData.name}"`);
                    }
                  }
                } else {
                  if (!esHorario) {
                    console.log(`⏱️ No es el horario programado para "${plantData.name}"`);
                  } else {
                    console.log(`💧 La humedad está dentro del rango para "${plantData.name}"`);
                  }
                }

                // Notificaciones adicionales por humedad alta/baja
                let mensaje = "";
                if (newValue < umbral) {
                  mensaje = `La humedad de tu planta "${plantData.name}" está baja: ${newValue}%`;
                } else if (newValue > umbral) {
                  mensaje = `La humedad de tu planta "${plantData.name}" está alta: ${newValue}%`;
                } else {
                  continue; // No enviar notificación si es igual al umbral
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

        // === SENSOR DE NIVEL DE AGUA ===
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
