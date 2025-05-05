import { Injectable, inject } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup
} from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';

const LOCAL_USER_KEY = 'firebaseUserUID';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _auth = inject(Auth);
  private _firestore = inject(Firestore);
  private _router = inject(Router);
  private userSubject = new BehaviorSubject<User | null>(null);

  constructor() {
    onAuthStateChanged(this._auth, (user) => {
      if (user) {
        localStorage.setItem(LOCAL_USER_KEY, user.uid);
        this.userSubject.next(user);

        if (window.location.pathname === '/' || window.location.pathname.includes('login')) {
          this._router.navigate(['/view/home']);
        }
      } else {
        localStorage.removeItem(LOCAL_USER_KEY);
        this.userSubject.next(null);
      }
      console.log('Estado de autenticación cambiado:', user);
    });

    const storedUid = localStorage.getItem(LOCAL_USER_KEY);
    if (storedUid) {
      console.log('Sesión detectada desde localStorage:', storedUid);
    }
  }

  get user$() {
    return this.userSubject.asObservable();
  }

  isLoggedIn(): boolean {
    return !!this.userSubject.value;
  }

  hasStoredSession(): boolean {
    return !!localStorage.getItem(LOCAL_USER_KEY);
  }

  signup(email: string, password: string, name: string): Promise<void> {
    return createUserWithEmailAndPassword(this._auth, email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;
        localStorage.setItem(LOCAL_USER_KEY, user.uid);
        return this.saveUser(user.uid, email, name);
      })
      .then(() => {
        this._router.navigate(['/view/home']);
        console.log('✅ Usuario registrado y redirigido');
      })
      .catch(error => {
        console.error('❌ Error al registrar el usuario:', error);
        throw error;
      });
  }

  login(email: string, password: string): Promise<void> {
    return signInWithEmailAndPassword(this._auth, email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;
        localStorage.setItem(LOCAL_USER_KEY, user.uid);
        return this.saveUser(user.uid, email, user.displayName || 'Usuario');
      })
      .then(() => {
        this._router.navigate(['/view/home']);
        console.log('✅ Usuario logueado y redirigido');
      })
      .catch(error => {
        console.error('❌ Error al iniciar sesión:', error);
        throw error;
      });
  }

  loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(this._auth, provider)
      .then(async result => {
        const user = result.user;
        const email = user.email;
        const name = user.displayName || 'Usuario sin nombre';

        if (email) {
          localStorage.setItem(LOCAL_USER_KEY, user.uid);
          return this.saveUser(user.uid, email, name);
        } else {
          throw new Error('El email del usuario es null');
        }
      })
      .then(() => {
        this._router.navigate(['/view/home']);
        console.log('✅ Usuario logueado con Google y redirigido');
      })
      .catch(error => {
        if (error.code === 'auth/popup-closed-by-user') {
          console.warn('El usuario cerró la ventana emergente de inicio de sesión.');
        } else {
          console.error('❌ Error al iniciar sesión con Google:', error);
        }
        throw error;
      });
  }

  logout(): Promise<void> {
    const currentUser = this._auth.currentUser;

    if (currentUser) {
      const userDoc = doc(this._firestore, `users/${currentUser.uid}`);
      return setDoc(userDoc, { pushToken: null }, { merge: true })
        .then(() => this._auth.signOut())
        .then(() => {
          localStorage.removeItem(LOCAL_USER_KEY);
          this._router.navigate(['/']);
          console.log('👋 Sesión cerrada y redirigido al inicio');
        })
        .catch(error => {
          console.error('❌ Error al cerrar sesión:', error);
          throw error;
        });
    } else {
      return this._auth.signOut()
        .then(() => {
          localStorage.removeItem(LOCAL_USER_KEY);
          this._router.navigate(['/']);
          console.log('👋 Sesión cerrada (sin usuario activo) y redirigido al inicio');
        });
    }
  }

  getCurrentUser(): Promise<User | null> {
    return new Promise((resolve, reject) => {
      onAuthStateChanged(this._auth, (user) => {
        if (user) {
          resolve(user);
        } else {
          reject('No hay usuario autenticado');
        }
      });
    });
  }

  async sendPasswordReset(email: string): Promise<void> {
    try {
      const signInMethods = await fetchSignInMethodsForEmail(this._auth, email);

      if (signInMethods.length === 0) {
        throw new Error('El correo no está registrado.');
      }

      await sendPasswordResetEmail(this._auth, email);
      console.log('📧 Correo de restablecimiento enviado a:', email);
    } catch (error: any) {
      console.error('❌ Error en sendPasswordReset:', error);
      throw new Error('Error al enviar el correo. Inténtalo de nuevo más tarde.');
    }
  }

  async saveUser(userId: string, email: string, name: string, authToken?: string, pushToken?: string): Promise<void> {
    const userDoc = doc(this._firestore, `users/${userId}`);
    const dataToSave: any = { email, name };

    if (authToken) dataToSave.authToken = authToken;
    if (pushToken) dataToSave.pushToken = pushToken;

    const docSnapshot = await getDoc(userDoc);
    if (docSnapshot.exists()) {
      return setDoc(userDoc, dataToSave, { merge: true });
    } else {
      return setDoc(userDoc, dataToSave);
    }
  }

  async getUserData(userId: string): Promise<{ name: string; email: string }> {
    const userDoc = doc(this._firestore, `users/${userId}`);
    const docSnapshot = await getDoc(userDoc);

    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      return {
        name: data['name'] || 'Usuario',
        email: data['email'] || 'Sin email registrado'
      };
    } else {
      throw new Error('Usuario no encontrado en Firestore');
    }
  }
}
