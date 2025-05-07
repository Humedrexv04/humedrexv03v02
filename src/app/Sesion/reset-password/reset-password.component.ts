import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../Services/auth.service';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { caretBack } from 'ionicons/icons';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
  standalone: true, // Asegúrate de que el componente sea standalone
  imports: [NgIf, FormsModule], // Importa los módulos necesarios
})
export class ResetPasswordComponent implements OnInit {
  email: string = '';
  message: string = '';
  errorMessage: string = '';
  route = inject(Router);

  constructor(private authService: AuthService) {
    addIcons({ caretBack });
  }

  ngOnInit() { }

  validateEmail() {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!this.email) {
      this.errorMessage = 'El correo es requerido.';
      return false;
    } else if (!emailPattern.test(this.email)) {
      this.errorMessage = 'Correo inválido.';
      return false;
    } else {
      this.errorMessage = '';
      return true;
    }
  }

  async resetPassword() {
    if (!this.validateEmail()) return;

    try {
      await this.authService.sendPasswordReset(this.email);
      this.message = 'Correo enviado a ' + this.email + '. Vuelve a intentar iniciar sesión.';
      this.errorMessage = '';
    } catch (error: any) {
      if (error.message === 'auth/user-not-found') {
        this.errorMessage = 'El correo no está registrado.';
      } else {
        this.errorMessage = 'Error al enviar el correo. Inténtalo de nuevo más tarde.';
      }
      this.message = '';
    }
  }

  gotoLogIn() {
    this.route.navigate(['/login']);
  }
}