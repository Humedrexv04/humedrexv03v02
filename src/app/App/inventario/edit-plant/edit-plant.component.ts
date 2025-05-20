import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Plant } from '../../../Models/plant.mode';
import { PlantService } from '../../../Services/plant.service';
import { FormsModule } from '@angular/forms';
import { NgIf, NgClass } from '@angular/common';
import { AuthService } from '../../../Services/auth.service';
import { CameraService } from '../../../Services/camera.service';
import { CameraComponent } from '../../../camera/camera.component';

@Component({
  selector: 'app-edit-plant',
  standalone: true,
  imports: [FormsModule, NgIf, CameraComponent],
  templateUrl: './edit-plant.component.html',
  styleUrls: ['./edit-plant.component.css']
})
export class EditPlantComponent implements OnInit {
  userId: string | null = null;
  plantId: string = '';
  plant: Plant | null = null;
  errorMessage: string | null = null;
  img: string | undefined = '';
  isSubmitting: boolean = false;
  isCapturingImage: boolean = false;
  showPhotoOptions: boolean = false; // Añadido para controlar visibilidad de opciones

  constructor(
    private plantService: PlantService,
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private cameraService: CameraService
  ) { }

  async ngOnInit(): Promise<void> {
    this.plantId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.plantId) {
      this.errorMessage = 'ID de planta no proporcionado.';
      return;
    }

    try {
      const currentUser = await this.authService.getCurrentUser();
      if (currentUser) {
        this.userId = currentUser.uid;
        this.loadPlantDetails();
      } else {
        this.errorMessage = 'Usuario no autenticado. Por favor, inicia sesión.';
        console.error('No hay usuario autenticado');
      }
    } catch (error) {
      this.errorMessage = 'Error al obtener el usuario actual.';
      console.error('Error al obtener el usuario actual:', error);
    }
  }

  loadPlantDetails(): void {
    if (!this.userId) {
      this.errorMessage = 'No se puede cargar la planta sin un usuario válido.';
      return;
    }

    console.log('Cargando detalles de la planta...', { userId: this.userId, plantId: this.plantId });

    this.plantService.getPlantDetails(this.userId, this.plantId)
      .then(data => {
        this.plant = data;
        this.img = this.plant.img || '';
        console.log('Detalles de la planta cargados:', this.plant);
      })
      .catch(error => {
        this.errorMessage = error.message || 'Error al cargar los detalles de la planta.';
        console.error('Error al cargar los detalles de la planta:', error);
      });
  }

  togglePhotoOptions(): void {
    this.showPhotoOptions = !this.showPhotoOptions;
  }

  async captureImage(): Promise<void> {
    try {
      this.isCapturingImage = true;
      this.errorMessage = null;

      const imageUrl = await this.cameraService.captureAndUpload();

      if (imageUrl) {
        this.img = imageUrl;
        this.showPhotoOptions = false; // Oculta opciones tras capturar
        console.log('Imagen capturada y subida exitosamente:', imageUrl);
      }
    } catch (error: any) {
      if (error.message?.includes('User cancelled') || error.message?.includes('canceled')) {
        console.log('El usuario canceló la captura de imagen');
      } else {
        this.errorMessage = error.message || 'Error al capturar o subir la imagen';
        console.error('Error en captura o subida de imagen:', error);
      }
    } finally {
      this.isCapturingImage = false;
    }
  }

  onImageSelected(imageUrl: string): void {
    this.img = imageUrl;
    this.showPhotoOptions = false; // Oculta opciones tras seleccionar imagen
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Por favor, selecciona un archivo de imagen válido.';
        return;
      }
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.img = e.target.result;
        this.showPhotoOptions = false; // Oculta opciones tras seleccionar imagen
      };
      reader.readAsDataURL(file);
    }
  }

  updatePlant(): void {
    if (this.isSubmitting) {
      this.errorMessage = 'Por favor, espera a que se complete la operación actual.';
      return;
    }

    if (!this.plant || !this.userId) {
      this.errorMessage = 'No se puede actualizar la planta. Datos incompletos.';
      return;
    }

    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    const updatedPlant: Plant = {
      ...this.plant,
      img: this.img || undefined
    };

    if (this.plant.sensorHumedad?.deviceId && this.plant.sensorHumedad?.sensorKey) {
      updatedPlant.sensorHumedad = this.plant.sensorHumedad;
    } else {
      delete updatedPlant.sensorHumedad;
    }

    this.plantService.updatePlant(this.userId, this.plantId, updatedPlant)
      .then(() => {
        console.log('Planta actualizada con éxito');
        this.router.navigate(['/view/plant-list']);
      })
      .catch(error => {
        this.errorMessage = error.message || 'Error al actualizar la planta.';
        console.error('Error al actualizar la planta:', error);
      })
      .finally(() => {
        this.isSubmitting = false;
      });
  }

  private validateForm(): boolean {
    if (!this.plant) {
      this.errorMessage = 'No hay datos de la planta para validar.';
      return false;
    }
    if (!this.plant.name.trim()) {
      this.errorMessage = 'El nombre de la planta es requerido.';
      return false;
    }
    if (!this.plant.horario.trim()) {
      this.errorMessage = 'El horario es requerido.';
      return false;
    }
    if (this.plant.humedad <= 0 || isNaN(this.plant.humedad)) {
      this.errorMessage = 'La humedad debe ser un número mayor que 0.';
      return false;
    }
    if (this.plant.humedad > 100) {
      this.errorMessage = 'La humedad debe estar en un rango de 0 a 100.';
      return false;
    }
    if (this.plant.electrovalvula && this.plant.electrovalvula < 0) {
      this.errorMessage = 'La electroválvula no puede ser negativa.';
      return false;
    }
    if (this.plant.sensorHumedad &&
      ((this.plant.sensorHumedad.deviceId && !this.plant.sensorHumedad.sensorKey) ||
        (!this.plant.sensorHumedad.deviceId && this.plant.sensorHumedad.sensorKey))) {
      this.errorMessage = 'El sensor de humedad debe tener tanto un dispositivo como una clave, o ninguno.';
      return false;
    }
    return true;
  }

  gotoPlantDetail() {
    this.router.navigate(['/plant', this.plantId]);
  }
}