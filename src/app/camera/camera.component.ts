import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CameraService } from '../Services/camera.service';

@Component({
  selector: 'app-camera',
  standalone: true,
  imports: [CommonModule],
  providers: [CameraService],
  templateUrl: './camera.component.html',
  styleUrls: ['./camera.component.css']
})
export class CameraComponent implements OnInit {
  imgUrls: string[] = [];
  hoverIndex: number | null = null;
  selectedImage: string | null = null;
  errorMessage: string = '';
  loading: boolean = false;

  constructor(private cameraService: CameraService) {}

  ngOnInit() {
    console.log('CameraComponent loaded');
    // Carga imágenes guardadas al iniciar
    this.imgUrls = this.cameraService.loadImagesFromLocalStorage();
  }

  async takePicture() {
    this.errorMessage = '';
    try {
      this.loading = true;
      const imageUrl = await this.cameraService.takePicture();
      if (!imageUrl) {
        throw new Error('No se obtuvo una imagen válida');
      }
      this.imgUrls.push(imageUrl);
      // Guardar en localStorage
      this.cameraService.saveImagesToLocalStorage(this.imgUrls);
    } catch (error: any) {
      console.error('Error al capturar imagen:', error);
      if (typeof error === 'string') {
        this.errorMessage = error;
      } else if (error.message) {
        if (error.message.includes('cancelled') || error.message.includes('User cancelled')) {
          this.errorMessage = 'Operación cancelada por el usuario';
        } else if (error.message.includes('PWA Element')) {
          this.errorMessage = 'Error de configuración: PWA Elements no encontrados';
        } else if (error.message.includes('camera') || error.message.includes('permission')) {
          this.errorMessage = 'No se pudo acceder a la cámara. Verifica los permisos';
        } else {
          this.errorMessage = `Error: ${error.message}`;
        }
      } else {
        this.errorMessage = 'Error desconocido al tomar la foto';
      }
    } finally {
      this.loading = false;
    }
  }

  deleteAllPhotos() {
    this.imgUrls = [];
    this.cameraService.clearImagesFromLocalStorage();
  }

  toggleHoverIndex(index: number) {
    this.hoverIndex = this.hoverIndex === index ? null : index;
  }

  deleteImage(index: number, event: Event) {
    event.stopPropagation();
    this.imgUrls.splice(index, 1);
    this.cameraService.saveImagesToLocalStorage(this.imgUrls);
    if (this.hoverIndex === index) {
      this.hoverIndex = null;
    }
  }

  openImage(index: number, event: Event) {
    event.stopPropagation();
    this.selectedImage = this.imgUrls[index];
  }

  closeImage() {
    this.selectedImage = null;
  }
}
