import { Component } from '@angular/core';
import { PlantService } from '../../Services/plant.service';
import { AuthService } from '../../Services/auth.service';
import { Plant } from '../../Models/plant.mode';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { thermometer } from 'ionicons/icons';
import { Esp32Service } from '../../Services/esp32.service';

@Component({
  selector: 'app-add',
  standalone: true, // Agregar si usas Angular standalone components
  imports: [FormsModule, IonicModule, CommonModule],
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.css']
})
export class AddComponent {
  img: string = '';
  name: string = '';
  horario: string = '';  // Se asegura que sea número
  humedad: number = 0;
  sensorHumedad: number = 0;
  electrovalvula: number = 0;

  constructor(
    private plantService: PlantService,
    private authService: AuthService,
    private esp32Service: Esp32Service
  ) {
    addIcons({ thermometer });
  }

  ngOnInit() {}

  async addPlant() {
    try {
        const user = await this.authService.getCurrentUser ();
        if (!user) throw new Error('No se pudo obtener el usuario');

        // Crear la planta
        const newPlant: Plant = { 
            img: this.img, 
            name: this.name, 
            horario: this.horario, 
            humedad: this.humedad,
            sensorHumedad: this.sensorHumedad, // Asegúrate de que estas propiedades existan
            electrovalvula: this.electrovalvula // Asegúrate de que estas propiedades existan
        };

        // Llamar al servicio para agregar la planta
        await this.plantService.addPlant(user.uid, newPlant);
        console.log('✅ Planta agregada exitosamente');

        // Limpiar formulario
        this.resetForm();
    } catch (error) {
        console.error('❌ Error al agregar la planta, el sensor o la electrovalvula:', error);
    }
}

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.img = e.target.result; // Asigna la imagen a la variable img
      };
      reader.readAsDataURL(file); // Lee el archivo como Data URL
    }
  }

  resetForm() {
    this.img = '';
    this.name = '';
    this.horario = '';
    this.humedad = 0;
  }
}
