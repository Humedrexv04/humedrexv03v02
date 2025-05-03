import { Injectable, OnDestroy } from '@angular/core';
import { Database, ref, onValue, off, update } from '@angular/fire/database';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class RealtimeDataService implements OnDestroy {
  private deviceStatuses: { [deviceId: string]: BehaviorSubject<{ status: string }> } = {};
  private sensorData: { [deviceId: string]: BehaviorSubject<{ [key: string]: any }> } = {};
  private relayStates: { [deviceId: string]: { [relayId: string]: BehaviorSubject<boolean> } } = {};
  private subscriptions: { [path: string]: () => void } = {};
  private destroy$ = new Subject<void>();

  constructor(
    private database: Database,
    private auth: Auth,
    private firestore: Firestore
  ) { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    Object.values(this.subscriptions).forEach(unsubscribe => unsubscribe());
  }

  subscribeToDeviceStatus(deviceId: string): Observable<{ status: string }> {
    if (!this.deviceStatuses[deviceId]) {
      this.deviceStatuses[deviceId] = new BehaviorSubject<{ status: string }>({ status: 'disconnected' });

      const uid = this.auth.currentUser?.uid;
      if (!uid) {
        this.deviceStatuses[deviceId].error('Usuario no autenticado');
        return this.deviceStatuses[deviceId].asObservable();
      }

      const deviceRefFirestore = doc(this.firestore, `devices/${deviceId}`);
      getDoc(deviceRefFirestore).then((docSnapshot) => {
        if (!docSnapshot.exists() || docSnapshot.data()?.['uid'] !== uid) {
          this.deviceStatuses[deviceId].error('Dispositivo no asignado');
          return;
        }

        const statusRef = ref(this.database, `devices/${deviceId}/conectado`);
        const unsubscribe = onValue(statusRef, (snapshot) => {
          this.deviceStatuses[deviceId].next({
            status: snapshot.val() ? 'connected' : 'disconnected'
          });
        }, (error) => {
          console.error('Error estado conexión:', error);
          this.deviceStatuses[deviceId].next({ status: 'disconnected' });
        });

        this.subscriptions[`${deviceId}/status`] = () => off(statusRef, 'value', unsubscribe);
      }).catch(error => {
        this.deviceStatuses[deviceId].error(`Error dispositivo: ${error.message}`);
      });
    }
    return this.deviceStatuses[deviceId].asObservable();
  }

  subscribeToSensorData(deviceId: string): Observable<{ [key: string]: any }> {
    if (!this.sensorData[deviceId]) {
      this.sensorData[deviceId] = new BehaviorSubject<{ [key: string]: any }>({});

      const uid = this.auth.currentUser?.uid;
      if (!uid) {
        this.sensorData[deviceId].error('Usuario no autenticado');
        return this.sensorData[deviceId].asObservable();
      }

      const deviceRefFirestore = doc(this.firestore, `devices/${deviceId}`);
      getDoc(deviceRefFirestore).then((docSnapshot) => {
        if (!docSnapshot.exists() || docSnapshot.data()?.['uid'] !== uid) {
          this.sensorData[deviceId].error('Dispositivo no asignado');
          return;
        }

        const sensorsRef = ref(this.database, `devices/${deviceId}/sensors`);
        const unsubscribe = onValue(sensorsRef, (snapshot) => {
          const data = snapshot.val() || {};
          // Filtrar solo valores numéricos
          const filteredData = Object.keys(data).reduce((acc: { [key: string]: any }, key) => {
            if (typeof data[key] === 'number') {
              acc[key] = data[key];
            }
            return acc;
          }, {});
          this.sensorData[deviceId].next(filteredData);
        }, (error) => {
          console.error('Error sensores:', error);
          this.sensorData[deviceId].next({});
        });

        this.subscriptions[`${deviceId}/sensors`] = () => off(sensorsRef, 'value', unsubscribe);
      }).catch(error => {
        this.sensorData[deviceId].error(`Error dispositivo: ${error.message}`);
      });
    }
    return this.sensorData[deviceId].asObservable();
  }

  subscribeToRelayState(deviceId: string, relayId: string): Observable<boolean> {
    if (!this.relayStates[deviceId]) this.relayStates[deviceId] = {};
    if (!this.relayStates[deviceId][relayId]) {
      this.relayStates[deviceId][relayId] = new BehaviorSubject<boolean>(false);

      const uid = this.auth.currentUser?.uid;
      if (!uid) {
        this.relayStates[deviceId][relayId].error('Usuario no autenticado');
        return this.relayStates[deviceId][relayId].asObservable();
      }

      const deviceRefFirestore = doc(this.firestore, `devices/${deviceId}`);
      getDoc(deviceRefFirestore).then((docSnapshot) => {
        if (!docSnapshot.exists() || docSnapshot.data()?.['uid'] !== uid) {
          this.relayStates[deviceId][relayId].error('Dispositivo no asignado');
          return;
        }

        const relayRef = ref(this.database, `devices/${deviceId}/relays/${relayId}/state`);
        const unsubscribe = onValue(relayRef, (snapshot) => {
          this.relayStates[deviceId][relayId].next(!!snapshot.val());
        }, (error) => {
          console.error(`Error relé ${relayId}:`, error);
          this.relayStates[deviceId][relayId].next(false);
        });

        this.subscriptions[`${deviceId}/relays/${relayId}`] = () => off(relayRef, 'value', unsubscribe);
      }).catch(error => {
        this.relayStates[deviceId][relayId].error(`Error dispositivo: ${error.message}`);
      });
    }
    return this.relayStates[deviceId][relayId].asObservable();
  }

  async updateRelayState(deviceId: string, relayId: string, state: boolean): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Usuario no autenticado');

    const deviceRefFirestore = doc(this.firestore, `devices/${deviceId}`);
    const docSnapshot = await getDoc(deviceRefFirestore);
    if (!docSnapshot.exists() || docSnapshot.data()?.['uid'] !== uid) {
      throw new Error('Dispositivo no asignado');
    }

    const relayRef = ref(this.database, `devices/${deviceId}/relays/${relayId}`);
    await update(relayRef, {
      state: state,
      lastUpdate: Date.now()
    });
  }

  unsubscribeDevice(deviceId: string): void {
    // Limpieza de suscripciones
    const subscriptionKeys = Object.keys(this.subscriptions).filter(key => key.startsWith(deviceId));
    subscriptionKeys.forEach(key => {
      this.subscriptions[key]();
      delete this.subscriptions[key];
    });

    if (this.deviceStatuses[deviceId]) {
      this.deviceStatuses[deviceId].complete();
      delete this.deviceStatuses[deviceId];
    }

    if (this.sensorData[deviceId]) {
      this.sensorData[deviceId].complete();
      delete this.sensorData[deviceId];
    }

    if (this.relayStates[deviceId]) {
      Object.keys(this.relayStates[deviceId]).forEach(relayId => {
        this.relayStates[deviceId][relayId].complete();
      });
      delete this.relayStates[deviceId];
    }
  }
}