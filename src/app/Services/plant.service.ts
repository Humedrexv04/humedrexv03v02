import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, updateDoc, deleteDoc, doc, collectionData, getDoc, getDocs } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Plant } from '../Models/plant.mode';
import { Esp32Service } from './esp32.service';

@Injectable({
  providedIn: 'root'
})
export class PlantService {
  private _firestore = inject(Firestore);
  private esp32Service = inject(Esp32Service); // Inyectar el servicio de ESP32


  constructor() { }

  // Cargar plantas del usuario como un Observable
  loadPlants(userId: string): Observable<Plant[]> {
    const plantsCollection = collection(this._firestore, `users/${userId}/plants`);
    return collectionData(plantsCollection, { idField: 'id' }) as Observable<Plant[]>; // Agregar el id al objeto
  }

  async getUserPlants(userId: string): Promise<Plant[]> {
    const plantsCollection = collection(this._firestore, `users/${userId}/plants`);
    const querySnapshot = await getDocs(plantsCollection);

    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
  }



  async addPlant(userId: string, plant: any): Promise<void> {
    const plantsCollection = collection(this._firestore, `users/${userId}/plants`);

    try {
      // 🔹 Agregar la planta sin sensores ni electroválvulas
      const newPlant: Plant = {
        ...plant // Solo se agregan las propiedades de `plant`
      };

      const plantDocRef = await addDoc(plantsCollection, newPlant);

      console.log(`✅ Planta agregada con ID ${plantDocRef.id}`);
    } catch (error) {
      console.error('❌ Error al agregar la planta:', error);
      throw error;
    }
  }

  // Actualizar una planta
  updatePlant(userId: string, plantId: string, updatedPlant: Plant): Promise<void> {
    const plantDoc = doc(this._firestore, `users/${userId}/plants/${plantId}`);
    const { img, name, horario, humedad } = updatedPlant; // Extraer los campos necesarios
    return updateDoc(plantDoc, { img, name, horario, humedad }) // Solo pasar los campos necesarios
      .then(() => console.log('Planta actualizada:', updatedPlant))
      .catch(error => {
        console.error('Error al actualizar la planta:', error);
        throw error; // Propagar el error para manejarlo en el componente
      });
  }

  // Eliminar una planta
  deletePlant(userId: string, plantId: string): Promise<void> {
    const plantDoc = doc(this._firestore, `users/${userId}/plants/${plantId}`);
    return deleteDoc(plantDoc)
      .then(() => console.log('Planta eliminada:', plantId))
      .catch(error => {
        console.error('Error al eliminar la planta:', error);
        throw error; // Propagar el error para manejarlo en el componente
      });
  }

  // Obtener detalles de una planta específica
  async getPlantDetails(userId: string, plantId: string): Promise<Plant> {
    const plantsCollection = collection(this._firestore, `users/${userId}/plants`);
    const plantDocRef = doc(plantsCollection, plantId);
    const plantDoc = await getDoc(plantDocRef);
    if (plantDoc.exists()) {
      const plantData = plantDoc.data() as Plant;
      // Verificar si la propiedad sensorHumedad existe
      if (!plantData.sensorHumedad) {
        console.log('La propiedad sensorHumedad no existe en la base de datos');
      }
      return plantData;
    } else {
      console.log('La planta no existe en la base de datos');
      throw new Error('La planta no existe en la base de datos');
    }
  }

  // Función para contar plantas del usuario
  countUserPlants(userId: string): Promise<number> {
    const plantsCollection = collection(this._firestore, `users/${userId}/plants`);
    return getDocs(plantsCollection)
      .then(querySnapshot => {
        const count = querySnapshot.size;
        console.log(`Total de plantas: ${count}`);
        return count;
      })  
      .catch(error => {
        console.error('Error al contar plantas:', error);
        throw error;
      });
  }

  getPlantsObservable(userId: string): Observable<Plant[]> {
    const plantsCollection = collection(this._firestore, `users/${userId}/plants`);
    return collectionData(plantsCollection, { idField: 'id' }) as Observable<Plant[]>;
  }
}