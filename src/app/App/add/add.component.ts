import { Component } from '@angular/core';
import { PlantService } from '../../Services/plant.service';
import { AuthService } from '../../Services/auth.service';
import { Plant } from '../../Models/plant.mode';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { thermometer } from 'ionicons/icons';

@Component({
  selector: 'app-add',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.css']
})
export class AddComponent {
  img: string = '';
  name: string = '';
  horario: string = '';
  humedad: number = 0;
  sensorHumedad: { deviceId: string; sensorKey: string } = { deviceId: '', sensorKey: '' };
  electrovalvula: number = 0;
  errorMessage: string | null = null;
  isSubmitting: boolean = false;

  constructor(
    private plantService: PlantService,
    private authService: AuthService
  ) {
    addIcons({ thermometer });
  }

  async addPlant() {
    if (this.isSubmitting) {
      this.errorMessage = 'Por favor, espera a que se complete la operación actual.';
      return;
    }

    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    try {
      const user = await this.authService.getCurrentUser();
      if (!user) {
        throw new Error('No se pudo obtener el usuario');
      }

      const newPlant: Plant = {
        name: this.name,
        horario: this.horario,
        humedad: this.humedad,
        img: this.img || undefined,
        electrovalvula: this.electrovalvula || undefined
      };

      if (this.sensorHumedad.deviceId && this.sensorHumedad.sensorKey) {
        newPlant.sensorHumedad = this.sensorHumedad;
      }

      await this.plantService.addPlant(user.uid, newPlant);
      this.errorMessage = '✅ Planta agregada exitosamente';
      setTimeout(() => {
        this.errorMessage = null;
      }, 3000); // Clear success message after 3 seconds
      this.resetForm();
    } catch (error: any) {
      this.errorMessage = error.message || 'Error al agregar la planta. Intenta nuevamente.';
      console.error('❌ Error al agregar la planta:', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  private validateForm(): boolean {
    if (!this.name.trim()) {
      this.errorMessage = 'El nombre de la planta es requerido.';
      return false;
    }
    if (!this.horario.trim()) {
      this.errorMessage = 'El horario es requerido.';
      return false;
    }
    if (this.humedad <= 0 || isNaN(this.humedad)) {
      this.errorMessage = 'La humedad debe ser un número mayor que 0.';
      return false;
    }
    if (this.electrovalvula < 0) {
      this.errorMessage = 'La electroválvula no puede ser negativa.';
      return false;
    }
    if (this.sensorHumedad.deviceId && !this.sensorHumedad.sensorKey) {
      this.errorMessage = 'Si se especifica un dispositivo, también se debe especificar un sensor.';
      return false;
    }
    if (!this.sensorHumedad.deviceId && this.sensorHumedad.sensorKey) {
      this.errorMessage = 'Si se especifica un sensor, también se debe especificar un dispositivo.';
      return false;
    }
    return true;
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
      };
      reader.readAsDataURL(file);
    }
  }

  resetForm() {
    this.img = '';
    this.name = '';
    this.horario = '';
    this.humedad = 0;
    this.sensorHumedad = { deviceId: '', sensorKey: '' };
    this.electrovalvula = 0;
    this.errorMessage = null;
  }
}