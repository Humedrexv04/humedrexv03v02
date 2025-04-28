import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../Services/auth.service';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss']
})
export class SplashComponent implements OnInit {

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    setTimeout(() => {
      const isLoggedIn = this.authService.isLoggedIn() || this.authService.hasStoredSession();
      this.router.navigateByUrl(isLoggedIn ? '/view/home' : '/viewSesion');
    }, 2000); // Espera para mostrar el logo y animación
  }
}
