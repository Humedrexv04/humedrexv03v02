import { Component, inject } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faUserCircle,         // Icono más estándar para perfil
  faLeaf,               // Icono clásico de hoja
  faSeedling,           // Icono de plantín/planta pequeña
  faMicrochip           // Icono para dispositivos
} from '@fortawesome/free-solid-svg-icons';
import { PlantService } from '../Services/plant.service';
import { AuthService } from '../Services/auth.service';
import { Subscription } from 'rxjs';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-view',
  standalone: true,
  imports: [
    RouterLink,
    RouterOutlet,
    FontAwesomeModule
  ],
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.css']
})
export class ViewComponent {
  route = inject(Router);
  plantCount: number = 0;
  private plantsSubscription!: Subscription;
  private authSubscription!: Subscription;

  // Iconos actualizados
  faUserCircle = faUserCircle;
  faLeaf = faLeaf;
  faSeedling = faSeedling;
  faMicrochip = faMicrochip;

  constructor(
    private plantService: PlantService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.setupRealTimeCounter();
  }

  goToProfile() {
    this.route.navigate(['/view/home']);
  }

  private setupRealTimeCounter() {
    this.authSubscription = this.authService.user$.subscribe(user => {
      if (user) {
        this.plantsSubscription?.unsubscribe();

        this.plantsSubscription = this.plantService.getPlantsObservable(user.uid)
          .subscribe(plants => {
            this.plantCount = plants.length;
          });
      }
    });
  }

  ngOnDestroy() {
    this.plantsSubscription?.unsubscribe();
    this.authSubscription?.unsubscribe();
  }
}