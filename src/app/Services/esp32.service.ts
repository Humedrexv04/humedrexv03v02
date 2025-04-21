import { Injectable, inject } from '@angular/core';
import { Database, objectVal, ref } from '@angular/fire/database';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Esp32Service {
  private database = inject(Database);

  // Método para obtener todos los datos de los sensores desde /test
  getTestSensorData(): Observable<any> {
    const testRef = ref(this.database, 'test');
    return objectVal(testRef) as Observable<any>;
  }

  // Método para obtener la distancia
  getDistancia(): Observable<number> {
    const distanciaRef = ref(this.database, 'test/Distancia');
    return objectVal(distanciaRef) as Observable<number>;
  }

  // Método para obtener el estado de las electrovalvulas
  getElectrovalvula(valvulaNumber: 1 | 2 | 3): Observable<boolean> {
    const valvulaRef = ref(this.database, `test/Electrovalvula${valvulaNumber}`);
    return objectVal(valvulaRef) as Observable<boolean>;
  }

  // Método para obtener la humedad de los sensores
  getHumedadSensor(sensorNumber: 1 | 2 | 3): Observable<number> {
    const humedadRef = ref(this.database, `test/Humedad${sensorNumber}`);
    return objectVal(humedadRef) as Observable<number>;
  }
}