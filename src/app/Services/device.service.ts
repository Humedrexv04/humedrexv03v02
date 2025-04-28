import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  constructor(private firestore: Firestore, private auth: Auth) { }

  // Agregar dispositivo al usuario solo si no está enlazado a otro
  addDevice(deviceId: string): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      return Promise.reject("Usuario no autenticado");
    }

    // Referencia al dispositivo en la colección global
    const deviceRef = doc(this.firestore, `devices/${deviceId}`);

    // Verificar si el dispositivo ya está asignado a otro usuario
    return getDoc(deviceRef).then((docSnapshot) => {
      if (docSnapshot.exists()) {
        const deviceData = docSnapshot.data();

        // Verificar si el dispositivo ya está enlazado a otro usuario
        if (deviceData?.['uid']) {
          return Promise.reject("El dispositivo ya está asignado a otro usuario");
        }

        // El dispositivo no tiene `uid`, por lo que lo asignamos al usuario actual
        return this.assignDeviceToUser(deviceId, uid);
      } else {
        // El dispositivo no existe en la colección global
        return Promise.reject("El dispositivo no existe en la colección global");
      }
    });
  }

  // Asignar el dispositivo al usuario
  private assignDeviceToUser(deviceId: string, uid: string): Promise<void> {
    // Referencia al documento del dispositivo en la colección de dispositivos global
    const deviceRef = doc(this.firestore, `devices/${deviceId}`);

    // Actualizamos el dispositivo con el uid del usuario y el estado de conexión
    return updateDoc(deviceRef, {
      uid: uid,
      conectado: true,  // Marcar como conectado
      conectadoEn: serverTimestamp()  // Timestamp de cuando se conectó
    }).then(() => {
      // Asignar el dispositivo al usuario en su subcolección
      const userDeviceRef = doc(this.firestore, `users/${uid}/devices/${deviceId}`);
      return setDoc(userDeviceRef, {
        creado: serverTimestamp(),
        conectado: true,
        humedad: null,
        valvula: null,
        agua: null,
      });
    });
  }

  // Obtener dispositivos del usuario
  getUserDevices(): Observable<any[]> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      return new Observable<any[]>(); // Si no está autenticado, devolver un observable vacío
    }
    const colRef = collection(this.firestore, `users/${uid}/devices`);
    return collectionData(colRef, { idField: 'id' });
  }
}
