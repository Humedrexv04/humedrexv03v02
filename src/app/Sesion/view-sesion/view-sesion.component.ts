import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-view-sesion',
  templateUrl: './view-sesion.component.html',
  styleUrl: './view-sesion.component.css',
  imports:[]
})
export class ViewSesionComponent  implements OnInit {

  route = inject(Router);
  constructor() { }

  ngOnInit() {}

  gotoLogIn(){
    this.route.navigate(['/login']);
  }

  gotoRegister(){
    this.route.navigate(['/register']);
  }

}
