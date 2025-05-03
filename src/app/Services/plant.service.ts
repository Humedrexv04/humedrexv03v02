import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, getDoc, updateDoc, deleteDoc, query, getDocs, onSnapshot } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Plant } from '../Models/plant.mode';

@Injectable({
  providedIn: 'root'
})
export class PlantService {
  constructor(private firestore: Firestore) { }

  // Clean undefined values while preserving Plant type
  private cleanUndefinedValues(plant: Plant): Partial<Plant> {
    const cleaned: Partial<Plant> = {};
    if (plant.name) cleaned.name = plant.name;
    if (plant.horario) cleaned.horario = plant.horario;
    if (plant.humedad !== undefined) cleaned.humedad = plant.humedad;
    if (plant.img) cleaned.img = plant.img;
    if (plant.electrovalvula !== undefined) cleaned.electrovalvula = plant.electrovalvula;
    if (plant.sensorHumedad?.deviceId && plant.sensorHumedad?.sensorKey) {
      cleaned.sensorHumedad = plant.sensorHumedad;
    }
    return cleaned;
  }

  async addPlant(userId: string, plant: Plant): Promise<void> {
    try {
      const plantRef = collection(this.firestore, `users/${userId}/plants`);
      const cleanedPlant = this.cleanUndefinedValues(plant);
      await addDoc(plantRef, cleanedPlant as { [key: string]: any });
      console.log('✅ Planta agregada exitosamente');
    } catch (error) {
      console.error('❌ Error al agregar la planta:', error);
      throw error;
    }
  }

  async getPlantDetails(userId: string, plantId: string): Promise<Plant> {
    try {
      const plantDoc = doc(this.firestore, `users/${userId}/plants/${plantId}`);
      const plantSnapshot = await getDoc(plantDoc);
      if (plantSnapshot.exists()) {
        return { id: plantSnapshot.id, ...plantSnapshot.data() } as Plant;
      } else {
        throw new Error('La planta no existe');
      }
    } catch (error) {
      console.error('❌ Error al obtener los detalles de la planta:', error);
      throw error;
    }
  }

  // plant.service.ts
updatePlant(uid: string, plantId: string, data: Partial<Plant>): Promise<void> {
  const plantRef = doc(this.firestore, `users/${uid}/plants/${plantId}`);
  return updateDoc(plantRef, data);
}


  async deletePlant(userId: string, plantId: string): Promise<void> {
    try {
      const plantDoc = doc(this.firestore, `users/${userId}/plants/${plantId}`);
      await deleteDoc(plantDoc);
      console.log('✅ Planta eliminada exitosamente');
    } catch (error) {
      console.error('❌ Error al eliminar la planta:', error);
      throw error;
    }
  }

  async getPlants(userId: string): Promise<Plant[]> {
    try {
      const plantsQuery = query(collection(this.firestore, `users/${userId}/plants`));
      const querySnapshot = await getDocs(plantsQuery);
      const plants: Plant[] = [];
      querySnapshot.forEach((doc) => {
        plants.push({ id: doc.id, ...doc.data() } as Plant);
      });
      return plants;
    } catch (error) {
      console.error('❌ Error al obtener las plantas:', error);
      throw error;
    }
  }

  loadPlants(userId: string): Observable<Plant[]> {
    return new Observable<Plant[]>((observer) => {
      const plantsQuery = query(collection(this.firestore, `users/${userId}/plants`));
      const unsubscribe = onSnapshot(plantsQuery, (querySnapshot) => {
        const plants: Plant[] = [];
        querySnapshot.forEach((doc) => {
          plants.push({ id: doc.id, ...doc.data() } as Plant);
        });
        observer.next(plants);
      }, (error) => {
        console.error('❌ Error al escuchar las plantas:', error);
        observer.error(error);
      });
      // Cleanup on unsubscribe
      return () => unsubscribe();
    });
  }
}