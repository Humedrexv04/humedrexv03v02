import { Component, Input } from '@angular/core';
import { Plant } from '../../Models/plant.mode';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-planta-item',
  imports: [IonicModule],
  templateUrl: './planta-item.component.html',
  styleUrl: './planta-item.component.css'
})
export class PlantaItemComponent {
  @Input() plant!: Plant; // Recibe la planta como input
  @Input() onDelete!: (plantId: string) => void; // Función para eliminar la planta

  constructor(private router: Router) { }

  // Método para redirigir a la página de detalles de la planta
  viewPlantDetails() {
    if (this.plant.id) {
      this.router.navigate(['/plant', this.plant.id]); // Redirige a la página de detalles
    }
  }
}
