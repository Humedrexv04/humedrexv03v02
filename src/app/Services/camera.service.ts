// src/app/Services/camera.service.ts
import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  constructor() { }

  // Verifica permisos (solo en plataforma nativa)
  private async checkPermissions(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    const permissions = await Camera.checkPermissions();
    if (permissions.camera !== 'granted') {
      const request = await Camera.requestPermissions();
      if (request.camera !== 'granted') {
        throw new Error('Permisos de cámara no otorgados');
      }
    }
  }

  // Captura imagen y la sube a Firebase, devolviendo la URL
  async captureAndUpload(): Promise<string> {
    try {
      await this.checkPermissions();

      const image: Photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl, // para obtener base64 directamente
        source: CameraSource.Camera,
        correctOrientation: true,
        saveToGallery: false
      });

      if (!image || !image.dataUrl) {
        throw new Error('No se pudo obtener la imagen en base64');
      }

      // Sube a Firebase y retorna URL pública
      const imageUrl = await this.uploadImageToFirebase(image.dataUrl);
      return imageUrl;

    } catch (error: any) {
      console.error('Error al capturar y subir imagen:', error);
      throw error;
    }
  }

  // Sube imagen base64 a Firebase Storage
   async uploadImageToFirebase(base64Image: string): Promise<string> {
    try {
      const storage = getStorage();
      const imageId = uuidv4();
      const imageRef = ref(storage, `plant-images/${imageId}.jpg`);
      await uploadString(imageRef, base64Image, 'data_url');
      return await getDownloadURL(imageRef);
    } catch (error) {
      console.error('Error al subir imagen a Firebase Storage:', error);
      throw error;
    }
  }
}
