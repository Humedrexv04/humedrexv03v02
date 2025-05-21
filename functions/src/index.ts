import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Define interfaces for type safety
interface DeviceData {
  relays?: { [key: string]: boolean };
  timeouts?: { [key: string]: number };
}

interface PlantData {
  name: string;
  sensorHumedad?: { deviceId: string; sensorKey: string };
  valvula?: { deviceId: string; relayKey: string };
  humedad?: number;
  horario?: string;
}

interface UserData {
  pushToken?: string;
}

// Configuration constants
const VALVE_ACTIVATION_DURATION = 10000; // 10 seconds
const TIMEOUT_DURATION = 60000; // 1 minute
const WATER_VOLUME_THRESHOLD = 1000;

export const monitorDeviceSensors = functions.database
  .ref("/devices/{deviceId}/sensors/{sensorKey}")
  .onUpdate(async (change, context) => {
    const { deviceId, sensorKey } = context.params;
    const newValue = change.after.val();

    console.log(`🔄 Sensor update: ${sensorKey} on device ${deviceId}: ${newValue}`);

    try {
      // Validate input
      if (typeof newValue !== "number") {
        console.warn(`⚠️ Invalid sensor value: ${newValue}`);
        return null;
      }

      // Get all users
      const usersSnap = await admin.firestore().collection("users").get();
      if (usersSnap.empty) {
        console.log("ℹ️ No users found");
        return null;
      }

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data() as UserData;

        if (!userData.pushToken || typeof userData.pushToken !== "string") {
          console.warn(`⚠️ User ${userId} has no valid push token`);
          continue;
        }

        // Handle humidity sensors (humedad1, humedad2, humedad3)
        if (["humedad1", "humedad2", "humedad3"].includes(sensorKey)) {
          const plantsSnap = await admin
            .firestore()
            .collection(`users/${userId}/plants`)
            .where("sensorHumedad.deviceId", "==", deviceId)
            .where("sensorHumedad.sensorKey", "==", sensorKey)
            .get();

          if (plantsSnap.empty) {
            console.log(`ℹ️ No plants found for user ${userId} with sensor ${sensorKey}`);
            continue;
          }

          for (const plantDoc of plantsSnap.docs) {
            const plantData = plantDoc.data() as PlantData;

            if (!plantData.humedad || !plantData.horario || !plantData.valvula) {
              console.warn(`⚠️ Incomplete plant data for ${plantData.name}`);
              continue;
            }

            // Parse scheduled time
            const [scheduledHour, scheduledMinute] = plantData.horario
              .split(":")
              .map((n) => parseInt(n, 10));

            console.log(
              `⏰ Plant "${plantData.name}": schedule=${scheduledHour}:${scheduledMinute}, ` +
              `now=${currentHour}:${currentMinute}, humidity=${newValue}/${plantData.humedad}`
            );

            // Check if it's the scheduled time and humidity is low
            const isScheduledTime = currentHour === scheduledHour && currentMinute === scheduledMinute;
            const isLowHumidity = newValue < plantData.humedad;

            if (isScheduledTime && isLowHumidity && plantData.valvula.deviceId === deviceId) {
              const relayPath = `/devices/${deviceId}/relays/${plantData.valvula.relayKey}`;
              const timeoutPath = `/devices/${deviceId}/timeouts/${plantData.valvula.relayKey}`;

              // Check relay state and timeout
              const deviceSnap = await admin.database().ref(`/devices/${deviceId}`).once("value");
              const deviceData = (deviceSnap.val() as DeviceData) || {};
              const relays = deviceData.relays || {};
              const timeouts = deviceData.timeouts || {};
              const relayState = relays[plantData.valvula.relayKey];
              const lastTimeout = timeouts[plantData.valvula.relayKey] || 0;
              const nowTimestamp = Date.now();

              if (relayState !== true && nowTimestamp - lastTimeout > TIMEOUT_DURATION) {
                // Activate valve
                await admin.database().ref(relayPath).set(true);
                console.log(`💧 Valve activated for plant "${plantData.name}" at ${relayPath}`);

                // Set timeout
                await admin.database().ref(timeoutPath).set(nowTimestamp);

                // Schedule valve deactivation
                setTimeout(async () => {
                  await admin.database().ref(relayPath).set(false);
                  console.log(`💧 Valve deactivated for plant "${plantData.name}"`);
                }, VALVE_ACTIVATION_DURATION);

                // Send watering notification
                await admin.messaging().send({
                  token: userData.pushToken,
                  notification: {
                    title: "💧 Riego automático",
                    body: `Válvula activada para "${plantData.name}" por baja humedad (${newValue}%)`,
                  },
                });
                console.log(`📤 Notificación de riego enviada a ${userId}`);
              } else {
                console.log(
                  `ℹ️ Válvula para "${plantData.name}" ya está activa o en tiempo de espera`
                );
              }
            } else {
              if (!isScheduledTime) {
                console.log(`⏱️ No es el horario programado para "${plantData.name}"`);
              } else if (!isLowHumidity) {
                console.log(`💧 La humedad está dentro del rango para "${plantData.name}"`);
              }
            }

            // Send humidity alert if needed
            let humidityMessage = "";
            if (newValue < plantData.humedad) {
              humidityMessage = `Humedad baja para "${plantData.name}": ${newValue}%`;
            } else if (newValue > plantData.humedad) {
              humidityMessage = `Humedad alta para "${plantData.name}": ${newValue}%`;
            }

            if (humidityMessage) {
              await admin.messaging().send({
                token: userData.pushToken,
                notification: {
                  title: "🌿 Alerta de humedad",
                  body: humidityMessage,
                },
              });
              console.log(`✅ Notificación de humedad enviada a ${userId}`);
            }
          }
        }
        // Handle water volume sensor
        else if (sensorKey === "volumen_agua" && newValue < WATER_VOLUME_THRESHOLD) {
          const message = `Nivel de agua bajo en el tanque del dispositivo ${deviceId}. ¡Recarga pronto!`;

          await admin.messaging().send({
            token: userData.pushToken,
            notification: {
              title: "🚱 Nivel de agua bajo",
              body: message,
            },
          });
          console.log(`✅ Notificación de nivel de agua enviada a ${userId}`);
        }
      }
    } catch (error) {
      console.error("❌ Error en monitorDeviceSensors:", error);
    }

    return null;
  });