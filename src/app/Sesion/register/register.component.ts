import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../Services/auth.service';  // Importa AuthService
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [FormsModule, NgIf],
})
export class RegisterComponent implements OnInit {
  name: string = '';
  email: string = '';
  password: string = '';
  nameError: string = ''; // Mensaje de error para el nombre
  emailError: string = ''; // Mensaje de error para el correo
  passwordError: string = ''; // Mensaje de error para la contraseña

  // Inyección correcta a través del constructor
  constructor(private authService: AuthService, private route: Router) { }

  ngOnInit() {
    console.log('Componente de registro inicializado');
  }

  // Método para validar el nombre
  validateName() {
    if (!this.name) {
      this.nameError = 'El nombre es requerido.';
      return false;
    } else {
      this.nameError = '';
      return true;
    }
  }

  // Método para validar el correo
  validateEmail() {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!this.email) {
      this.emailError = 'El correo es requerido.';
      return false;
    } else if (!emailPattern.test(this.email)) {
      this.emailError = 'El correo no tiene un formato válido.';
      return false;
    } else {
      this.emailError = '';
      return true;
    }
  }

  // Método para validar la contraseña
  validatePassword() {
    if (!this.password) {
      this.passwordError = 'La contraseña es requerida.';
      return false;
    } else {
      this.passwordError = '';
      return true;
    }
  }

  // Método para registrar un nuevo usuario
  signup() {
    const isNameValid = this.validateName();
    const isEmailValid = this.validateEmail();
    const isPasswordValid = this.validatePassword();

    if (!isNameValid || !isEmailValid || !isPasswordValid) {
      return;
    }

    this.authService.signup(this.email, this.password, this.name)
      .then(() => {
        this.route.navigate(['/login']);
        console.log('Usuario registrado:', this.email);
      })
      .catch(error => {
        console.error('Error al registrar:', error);
      });
  }

  gotoLogin() {
    this.route.navigate(['/login']);
  }
}
