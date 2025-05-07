import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, serverTimestamp, deleteDoc } from '@angular/fire/firestore';
import { Database, ref, get, update } from '@angular/fire/database';
import { Observable } from 'rxjs';
import { collection, collectionData } from '@angular/fire/firestore';
import { RealtimeDataService } from './realtime-database.service';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private database: Database,
    private realtimeDataService: RealtimeDataService
  ) { }

  // Añadir dispositivo (sin cambios)
  addDevice(deviceId: string): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return Promise.reject("Usuario no autenticado");

    const deviceRefRTDB = ref(this.database, `devices/${deviceId}`);
    return get(deviceRefRTDB).then((snapshot) => {
      if (!snapshot.exists()) return Promise.reject("Dispositivo no existe en RTDB");

      return this.verifyAndAssignDevice(deviceId, uid);
    });
  }

  private async verifyAndAssignDevice(deviceId: string, uid: string): Promise<void> {
    const deviceRefFirestore = doc(this.firestore, `devices/${deviceId}`);
    const docSnapshot = await getDoc(deviceRefFirestore);

    if (docSnapshot.exists() && docSnapshot.data()?.['uid']) {
      throw "Dispositivo ya asignado";
    }

    await this.assignDeviceToUser(deviceId, uid);
  }

  private async assignDeviceToUser(deviceId: string, uid: string): Promise<void> {
    const deviceRefFirestore = doc(this.firestore, `devices/${deviceId}`);
    const deviceRefRTDB = ref(this.database, `devices/${deviceId}`);

    await setDoc(deviceRefFirestore, {
      uid: uid,
      conectado: true,
      conectadoEn: serverTimestamp()
    }, { merge: true });

    await update(deviceRefRTDB, {
      uid: uid,
      conectado: true,
      conectadoEn: Date.now()
    });

    const userDeviceRef = doc(this.firestore, `users/${uid}/devices/${deviceId}`);
    await setDoc(userDeviceRef, {
      deviceId: deviceId,
      creado: serverTimestamp(),
      conectado: true
    });
  }

  // Actualizar credenciales WiFi (sin cambios)
  async updateDeviceCredentials(deviceId: string, ssid: string, password: string): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw "Usuario no autenticado";

    const deviceRefFirestore = doc(this.firestore, `devices/${deviceId}`);
    const docSnapshot = await getDoc(deviceRefFirestore);

    if (!docSnapshot.exists() || docSnapshot.data()?.['uid'] !== uid) {
      throw "Dispositivo no asignado";
    }

    const deviceRefRTDB = ref(this.database, `devices/${deviceId}`);
    await update(deviceRefRTDB, {
      ssid: ssid,
      password: password,
      conectado: true,
      actualizadoEn: Date.now()
    });
  }

  // Obtener datos del dispositivo (actualizado)
  async getDeviceData(deviceId: string): Promise<any> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw "Usuario no autenticado";

    const deviceRefFirestore = doc(this.firestore, `devices/${deviceId}`);
    const docSnapshot = await getDoc(deviceRefFirestore);

    if (!docSnapshot.exists() || docSnapshot.data()?.['uid'] !== uid) {
      throw "Dispositivo no asignado";
    }

    return {
      id: deviceId,
      ...docSnapshot.data(),
      // Datos en tiempo real manejados por RealtimeDataService
    };
  }

  // Obtener dispositivos del usuario (actualizado)
  getUserDevices(): Observable<any[]> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return new Observable<any[]>();

    return collectionData(
      collection(this.firestore, `users/${uid}/devices`),
      { idField: 'id' }
    );
  }

  // Desvincular dispositivo (actualizado)
  async unlinkDevice(deviceId: string): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw "Usuario no autenticado";

    const [userDeviceRef, globalDeviceRef, rtdbDeviceRef] = [
      doc(this.firestore, `users/${uid}/devices/${deviceId}`),
      doc(this.firestore, `devices/${deviceId}`),
      ref(this.database, `devices/${deviceId}`)
    ];

    const docSnapshot = await getDoc(globalDeviceRef);
    if (!docSnapshot.exists() || docSnapshot.data()?.['uid'] !== uid) {
      throw "Dispositivo no asignado";
    }

    await deleteDoc(userDeviceRef);

    await setDoc(globalDeviceRef, {
      uid: null,
      conectado: false,
      desconectadoEn: serverTimestamp()
    }, { merge: true });

    await update(rtdbDeviceRef, {
      uid: null,
      conectado: false,
      desconectadoEn: Date.now()
    });

    this.realtimeDataService.unsubscribeDevice(deviceId);
  }

  // Métodos actualizados para usar el nuevo servicio
  getDeviceConnectionStatus(deviceId: string): Observable<{ status: string }> {
    return this.realtimeDataService.subscribeToDeviceStatus(deviceId);
  }

  subscribeToSensorData(deviceId: string): Observable<{ [key: string]: any }> {
    return this.realtimeDataService.subscribeToSensorData(deviceId);
  }

  subscribeToRelayState(deviceId: string, relayId: string): Observable<boolean> {
    return this.realtimeDataService.subscribeToRelayState(deviceId, relayId);
  }

  async updateRelayState(deviceId: string, relayId: string, state: boolean): Promise<void> {
    return this.realtimeDataService.updateRelayState(deviceId, relayId, state);
  }

  getSensorData(deviceId: string, sensorKey: string): Promise<any> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      return Promise.reject("Usuario no autenticado");
    }

    const deviceRefFirestore = doc(this.firestore, `devices/${deviceId}`);
    return getDoc(deviceRefFirestore).then((docSnapshot) => {
      if (!docSnapshot.exists() || docSnapshot.data()?.['uid'] !== uid) {
        return Promise.reject("El dispositivo no está asignado a este usuario");
      }

      const sensorRefRTDB = ref(this.database, `devices/${deviceId}/sensors/${sensorKey}`);
      return get(sensorRefRTDB).then((snapshot) => {
        if (snapshot.exists()) {
          return snapshot.val();
        } else {
          return Promise.reject("No se encontraron datos para este sensor");
        }
      }).catch((error) => {
        return Promise.reject(`Error al obtener los datos del sensor: ${error.message}`);
      });
    });
  }


  private activeTimers: { [deviceId: string]: { [relayId: string]: any } } = {};

  // ... resto del código existente ...

  async manualActivateRelay(deviceId: string, relayId: string, duration: number = 10000): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Usuario no autenticado');

    // Cancelar temporizador existente si hay uno
    if (this.activeTimers[deviceId]?.[relayId]) {
      clearTimeout(this.activeTimers[deviceId][relayId]);
    }

    // Activar el relay
    await this.updateRelayState(deviceId, relayId, true);

    // Configurar temporizador para desactivar
    const timer = setTimeout(async () => {
      await this.updateRelayState(deviceId, relayId, false);
      delete this.activeTimers[deviceId][relayId];
    }, duration);

    // Guardar referencia del temporizador
    if (!this.activeTimers[deviceId]) this.activeTimers[deviceId] = {};
    this.activeTimers[deviceId][relayId] = timer;
  }
}