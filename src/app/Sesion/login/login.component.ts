import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../Services/auth.service';  // Importa AuthService
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [FormsModule, NgIf],
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  emailError: string = ''; // Mensaje de error para el correo
  passwordError: string = ''; // Mensaje de error para la contraseña

  // Inyección correcta a través del constructor
  constructor(private authService: AuthService, private route: Router) { }

  ngOnInit() {
    // Aquí puedes inicializar cualquier dato si es necesario
  }

  // Método para validar el correo
  validateEmail() {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!this.email) {
      this.emailError = 'El correo es requerido.';
    } else if (!emailPattern.test(this.email)) {
      this.emailError = 'El correo no tiene un formato válido.';
    } else {
      this.emailError = '';
    }
  }

  // Método para validar la contraseña
  validatePassword() {
    if (!this.password) {
      this.passwordError = 'La contraseña es requerida.';
    } else {
      this.passwordError = '';
    }
  }

  // Método para iniciar sesión
  login() {
    this.validateEmail();
    this.validatePassword();

    if (this.emailError || this.passwordError) {
      return; // Detener el proceso si hay errores de validación
    }

    this.authService.login(this.email, this.password)
      .then((user) => {
        this.route.navigate(['/view/plant-list']);
        console.log('Usuario logueado:', user);
      })
      .catch((error) => {
        if (error.code === 'auth/invalid-email') {
          this.emailError = 'El correo no es válido.';
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          this.passwordError = 'Correo o contraseña incorrectos.';
        } else {
          this.passwordError = 'Correo o Contraseña Incorrectos. Inténtalo de nuevo.';
        }
        console.error('Error al iniciar sesión:', error);
      });
  }

  // Método para cerrar sesión
  logout() {
    this.authService.logout()
      .then(() => {
        console.log('Usuario cerrado sesión');
      })
      .catch((error) => {
        console.error('Error al cerrar sesión:', error);
      });
  }

  gotoRegister() {
    this.route.navigate(['/register']);
  }

  gotoResetPassword() {
    this.route.navigate(['/reset-password']);
  }
}
