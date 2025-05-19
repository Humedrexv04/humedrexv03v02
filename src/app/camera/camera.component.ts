import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CameraService } from '../Services/camera.service';

@Component({
  selector: 'app-camera',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './camera.component.html',
  styleUrls: ['./camera.component.css']
})
export class CameraComponent implements OnInit {
  @Input() initialImage: string | undefined;
  @Output() imageSelected = new EventEmitter<string>();

  imgUrls: string[] = [];
  hoverIndex: number | null = null;
  selectedImage: string | null = null;
  errorMessage: string = '';
  loading: boolean = false;

  constructor(private cameraService: CameraService) { }

  ngOnInit() {
    console.log('CameraComponent loaded');
    // Si se proporciona imagen inicial, mostrarla
    if (this.initialImage) {
      this.imgUrls = [this.initialImage];
    }
  }

  async takePicture() {
    this.errorMessage = '';
    this.loading = true;

    try {
      const imageUrl = await this.cameraService.captureAndUpload();

      if (!imageUrl) {
        throw new Error('No se obtuvo una imagen válida');
      }

      // Mostrar la nueva imagen
      this.imgUrls = [imageUrl];
      this.selectedImage = imageUrl;

      // Emitir al padre
      this.imageSelected.emit(imageUrl);
    } catch (error: any) {
      console.error('Error al capturar imagen:', error);

      if (typeof error === 'string') {
        this.errorMessage = error;
      } else if (error.message) {
        if (error.message.includes('cancelled') || error.message.includes('User cancelled')) {
          console.log('Operación cancelada por el usuario');
        } else if (error.message.includes('camera') || error.message.includes('permission')) {
          this.errorMessage = 'No se pudo acceder a la cámara. Verifica los permisos.';
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

  deletePhoto() {
    this.imgUrls = [];
    this.selectedImage = null;
    this.imageSelected.emit('');
  }

  openImage(index: number, event: Event) {
    event.stopPropagation();
    this.selectedImage = this.imgUrls[index];
    this.imageSelected.emit(this.selectedImage);
  }

  closeImage() {
    this.selectedImage = null;
  }

  toggleHoverIndex(index: number | null) {
    this.hoverIndex = index;
  }

  deleteImage(index: number, event: Event) {
    event.stopPropagation();

    if (this.imgUrls[index] === this.selectedImage) {
      this.imageSelected.emit('');
    }

    this.imgUrls.splice(index, 1);

    if (this.hoverIndex === index) {
      this.hoverIndex = null;
    }

    this.selectedImage = null;
  }
}
