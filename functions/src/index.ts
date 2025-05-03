import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { DocumentData } from "firebase/firestore";

// Inicializa la app de Firebase Admin para interactuar con Firebase services
admin.initializeApp();

// Tipos de datos para mejor legibilidad y validación
interface PlantData {
  id?: string;
  name: string;
  humedad: number; // Nivel de humedad deseado para la planta
  electrovalvula: number; // Número del relay asociado (1-3)
  sensorHumedad?: {
    deviceId: string; // ID del dispositivo que contiene el sensor
    sensorKey: string; // ID del sensor específico en el dispositivo
  };
}

interface DeviceData {
  uid: string; // ID del usuario propietario del dispositivo
  conectado?: boolean; // Estado de conexión del dispositivo
}

interface UserData {
  token?: string; // Token FCM para notificaciones
  email?: string;
  name?: string;
}

/**
 * Función que monitorea cambios en sensores de dispositivos y envía notificaciones
 * basadas en las condiciones detectadas.
 */
export const monitorDeviceSensors = functions.database
  .ref("/devices/{deviceId}/sensors/{sensorKey}")
  .onUpdate(async (change, context) => {
    const { deviceId, sensorKey } = context.params;
    const currentValue = change.after.val();
    const previousValue = change.before.val();

    console.log(
      `🔄 Sensor ${sensorKey} en dispositivo ${deviceId}: Valor anterior=${previousValue}, Valor actual=${currentValue}`
    );

    // Ignorar si el valor no ha cambiado o no es numérico
    if (currentValue === previousValue || typeof currentValue !== "number") {
      console.log("⏭️ Valor sin cambios significativos o no numérico");
      return null;
    }

    try {
      // 1. Obtener información del dispositivo para saber a qué usuario pertenece
      const deviceRef = admin.firestore().doc(`devices/${deviceId}`);
      const deviceSnapshot = await deviceRef.get();

      if (!deviceSnapshot.exists) {
        console.log(`❌ Dispositivo ${deviceId} no encontrado en Firestore`);
        return null;
      }

      const deviceData = deviceSnapshot.data() as DeviceData;
      const userId = deviceData.uid;

      if (!userId) {
        console.log(`❌ No se encontró UID para el dispositivo ${deviceId}`);
        return null;
      }

      // 2. Obtener el token de notificación del usuario
      const userRef = admin.firestore().doc(`users/${userId}`);
      const userSnapshot = await userRef.get();

      if (!userSnapshot.exists) {
        console.log(`❌ Usuario ${userId} no encontrado en Firestore`);
        return null;
      }

      const userData = userSnapshot.data() as UserData;
      const token = userData.token;

      if (!token) {
        console.log(`⚠️ Usuario ${userId} no tiene token de notificación`);
        return null;
      }

      // 3. Buscar planta asociada con este sensor específico usando una consulta
      const plantsRef = admin.firestore().collection(`users/${userId}/plants`);
      const querySnapshot = await plantsRef
        .where("sensorHumedad.deviceId", "==", deviceId)
        .where("sensorHumedad.sensorKey", "==", sensorKey)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        console.log(`ℹ️ No se encontraron plantas para el usuario ${userId} con sensor ${sensorKey}`);
        return null;
      }

      // 4. Obtener la planta encontrada
      const plantDoc = querySnapshot.docs[0];
      const plantData = plantDoc.data() as DocumentData;
      const targetPlant: PlantData & { id: string } = {
        id: plantDoc.id,
        name: plantData.name as string,
        humedad: plantData.humedad as number,
        electrovalvula: plantData.electrovalvula as number,
        sensorHumedad: plantData.sensorHumedad as { deviceId: string; sensorKey: string } | undefined,
      };

      console.log(
        `🌱 Planta encontrada: ${targetPlant.name}, humedad configurada: ${targetPlant.humedad}`
      );

      // 5. Comprobar si la humedad actual (del sensor) está por debajo o por encima del umbral
      const humidity = currentValue;
      const configuredHumidity = targetPlant.humedad;
      const relayNumber = targetPlant.electrovalvula;

      // Validación del número de relay
      if (relayNumber < 1 || relayNumber > 3) {
        console.log(`❌ Número de relay inválido: ${relayNumber}`);
        return null;
      }

      const relayPath = `devices/${deviceId}/relays/relay${relayNumber}`;
      const messages: admin.messaging.Message[] = [];

      // 6. CASO 1: Humedad baja (5 unidades menos) - Activar válvula
      if (humidity <= configuredHumidity - 5) {
        console.log(`🔄 Humedad BAJA detectada: ${humidity} (umbral: ${configuredHumidity})`);

        // Preparar notificación
        messages.push({
          token,
          notification: {
            title: `¡Humedad baja en ${targetPlant.name}!`,
            body: `La humedad actual es ${humidity}% (configurada: ${configuredHumidity}%). Se activará la válvula.`,
          },
          data: {
            type: "humidity_low",
            plantId: targetPlant.id,
            deviceId: deviceId,
            sensorKey: sensorKey,
            currentValue: String(humidity),
            threshold: String(configuredHumidity),
          },
        });

        // Activar relay (abrir válvula)
        await admin.database().ref(relayPath).update({
          state: true,
          lastUpdate: admin.database.ServerValue.TIMESTAMP,
        });

        console.log(`✅ Relay ${relayNumber} ACTIVADO para dispositivo ${deviceId}`);
      }
      // 7. CASO 2: Humedad alta (5 unidades más) - Mantener válvula cerrada
      else if (humidity >= configuredHumidity + 5) {
        console.log(`🔄 Humedad ALTA detectada: ${humidity} (umbral: ${configuredHumidity})`);

        // Preparar notificación
        messages.push({
          token,
          notification: {
            title: `¡Humedad alta en ${targetPlant.name}!`,
            body: `La humedad actual es ${humidity}% (configurada: ${configuredHumidity}%). No se activará la válvula.`,
          },
          data: {
            type: "humidity_high",
            plantId: targetPlant.id,
            deviceId: deviceId,
            sensorKey: sensorKey,
            currentValue: String(humidity),
            threshold: String(configuredHumidity),
          },
        });

        // Desactivar relay (cerrar válvula)
        await admin.database().ref(relayPath).update({
          state: false,
          lastUpdate: admin.database.ServerValue.TIMESTAMP,
        });

        console.log(`✅ Relay ${relayNumber} DESACTIVADO para dispositivo ${deviceId}`);
      } else {
        console.log(
          `ℹ️ Humedad ${humidity}% dentro del rango normal (${configuredHumidity - 5}% - ${configuredHumidity + 5
          }%)`
        );
      }

      // 8. Enviar notificaciones si hay alguna pendiente
      if (messages.length > 0) {
        const results = await admin.messaging().sendAll(messages);
        console.log(`✅ ${results.successCount} notificaciones enviadas correctamente al usuario ${userId}`);

        if (results.failureCount > 0) {
          console.error(
            `❌ ${results.failureCount} notificaciones fallaron:`,
            results.responses.filter((r) => !r.success)
          );
        }
      } else {
        console.log(`ℹ️ No se enviaron notificaciones para el usuario ${userId}`);
      }

      return null;
    } catch (error) {
      console.error("❌ Error procesando sensor:", error);
      return null;
    }
  });

/**
 * Función que monitorea el estado de conexión de los dispositivos
 */
export const monitorDeviceConnection = functions.database
  .ref("/devices/{deviceId}/conectado")
  .onUpdate(async (change, context) => {
    const { deviceId } = context.params;
    const isConnected = change.after.val();
    const wasConnected = change.before.val();

    console.log(`🔄 Estado de conexión del dispositivo ${deviceId}: ${wasConnected} -> ${isConnected}`);

    // Solo proceder si el estado realmente cambió
    if (isConnected === wasConnected) {
      return null;
    }

    try {
      // 1. Obtener el usuario asociado al dispositivo
      const deviceRef = admin.firestore().doc(`devices/${deviceId}`);
      const deviceSnapshot = await deviceRef.get();

      if (!deviceSnapshot.exists) {
        console.log(`❌ Dispositivo ${deviceId} no encontrado en Firestore`);
        return null;
      }

      const deviceData = deviceSnapshot.data() as DeviceData;
      const userId = deviceData.uid;

      if (!userId) {
        console.log(`❌ No se encontró UID para el dispositivo ${deviceId}`);
        return null;
      }

      // 2. Actualizar el estado de conexión en Firestore
      await deviceRef.update({
        conectado: isConnected,
        [isConnected ? "conectadoEn" : "desconectadoEn"]: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 3. Obtener el token de notificación del usuario
      const userRef = admin.firestore().doc(`users/${userId}`);
      const userSnapshot = await userRef.get();

      if (!userSnapshot.exists) {
        console.log(`❌ Usuario ${userId} no encontrado en Firestore`);
        return null;
      }

      const userData = userSnapshot.data() as UserData;
      const token = userData.token;

      if (!token) {
        console.log(`⚠️ Usuario ${userId} no tiene token de notificación`);
        return null;
      }

      // 4. Enviar notificación sobre cambio de estado
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: `Dispositivo ${isConnected ? "conectado" : "desconectado"}`,
          body: `Tu dispositivo ${deviceId} está ahora ${isConnected ? "en línea" : "fuera de línea"}.`,
        },
        data: {
          type: "device_connection",
          deviceId: deviceId,
          status: isConnected ? "connected" : "disconnected",
          timestamp: Date.now().toString(),
        },
      };

      const result = await admin.messaging().send(message);
      console.log(`✅ Notificación de conexión enviada: ${result}`);

      return null;
    } catch (error) {
      console.error("❌ Error monitoreando conexión:", error);
      return null;
    }
  });

/**
 * Función que monitorea el nivel de agua y envía alertas
 */
export const checkAguaAndNotify = functions.database
  .ref("/devices/{deviceId}/sensors/nivel_agua")
  .onUpdate(async (change, context) => {
    const { deviceId } = context.params;
    const after = change.after.val();
    const before = change.before.val();

    console.log(`🔄 Dispositivo ${deviceId}: Nivel de agua anterior=${before}, actual=${after}`);

    // Ignorar si el valor no ha cambiado o no es crítico
    if (after >= 1000 || before === after) {
      console.log("✅ Nivel de agua no es crítico o no cambió.");
      return null;
    }

    try {
      // 1. Obtener el UID del usuario asociado al dispositivo desde Firestore
      const deviceRef = admin.firestore().doc(`devices/${deviceId}`);
      const deviceSnapshot = await deviceRef.get();

      if (!deviceSnapshot.exists) {
        console.log(`❌ Dispositivo ${deviceId} no encontrado en Firestore`);
        return null;
      }

      const deviceData = deviceSnapshot.data() as DeviceData;
      const userId = deviceData.uid;

      if (!userId) {
        console.log(`❌ No se encontró UID para el dispositivo ${deviceId}`);
        return null;
      }

      // 2. Obtener el token de notificación del usuario desde Firestore
      const userRef = admin.firestore().doc(`users/${userId}`);
      const userSnapshot = await userRef.get();

      if (!userSnapshot.exists) {
        console.log(`❌ Usuario ${userId} no encontrado en Firestore`);
        return null;
      }

      const userData = userSnapshot.data() as UserData;
      const token = userData.token;

      if (!token) {
        console.log(`⚠️ Usuario ${userId} no tiene token de notificación`);
        return null;
      }

      // 3. Enviar notificación al usuario
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: "¡Nivel de agua crítico!",
          body: `El nivel de agua en el dispositivo ${deviceId} es bajo (${after}). Por favor, recarga el depósito.`,
        },
        data: {
          type: "water_level",
          deviceId: deviceId,
          level: String(after),
          threshold: "1000",
          isCritical: "true",
          timestamp: Date.now().toString(),
        },
      };

      const result = await admin.messaging().send(message);
      console.log(`✅ Notificación enviada al usuario ${userId}: ${result}`);

      return null;
    } catch (err) {
      console.error("❌ Error en checkAguaAndNotify:", err);
      return null;
    }
  });

/**
 * Función que actualiza el token FCM cuando un usuario inicia sesión
 */
export const updateFCMToken = functions.https.onCall(async (data, context) => {
  // Verificar si el usuario está autenticado
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Solo usuarios autenticados pueden actualizar su token FCM"
    );
  }

  const userId = context.auth.uid;
  const { token } = data;

  if (!token || typeof token !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "El token FCM debe ser una cadena válida"
    );
  }

  try {
    // Guardar el token en Firestore
    await admin.firestore().doc(`users/${userId}`).update({
      token: token,
      tokenUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Token FCM actualizado para usuario ${userId}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Error actualizando token FCM:", error);
    throw new functions.https.HttpsError("internal", "Error al actualizar el token FCM");
  }
});