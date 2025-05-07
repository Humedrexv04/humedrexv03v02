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
import { Firestore, doc, setDoc, getDoc, collection, getDocs } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { PushNotifications, Token } from '@capacitor/push-notifications';

const LOCAL_USER_KEY = 'firebaseUserUID';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _auth = inject(Auth);
  private _firestore = inject(Firestore);
  private _router = inject(Router);
  private userSubject = new BehaviorSubject<User | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false); // Agregado para controlar el estado de carga

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
    });
  }

  get user$() {
    return this.userSubject.asObservable();
  }

  get loading$() {
    return this.loadingSubject.asObservable(); // Exponer el estado de carga
  }

  isLoggedIn(): boolean {
    return !!this.userSubject.value;
  }

  hasStoredSession(): boolean {
    return !!localStorage.getItem(LOCAL_USER_KEY);
  }

  async signup(email: string, password: string, name: string): Promise<void> {
    this.loadingSubject.next(true); // Mostrar el splash
    try {
      const userCredential = await createUserWithEmailAndPassword(this._auth, email, password);
      const user = userCredential.user;
      localStorage.setItem(LOCAL_USER_KEY, user.uid);
      await this.saveUser(user.uid, email, name);
      await this.updatePushToken(user.uid);
      this._router.navigate(['/view/home']);
    } catch (error) {
      console.error('Error en el registro:', error);
      // Manejar error
    } finally {
      this.loadingSubject.next(false); // Ocultar el splash
    }
  }

  async login(email: string, password: string): Promise<void> {
    this.loadingSubject.next(true); // Mostrar el splash
    try {
      const userCredential = await signInWithEmailAndPassword(this._auth, email, password);
      const user = userCredential.user;
      localStorage.setItem(LOCAL_USER_KEY, user.uid);
      await this.saveUser(user.uid, email, user.displayName || 'Usuario');
      await this.updatePushToken(user.uid);
      this._router.navigate(['/view/home']);
    } catch (error) {
      console.error('Error en el inicio de sesión:', error);
      // Manejar error
    } finally {
      this.loadingSubject.next(false); // Ocultar el splash
    }
  }

  async logout(): Promise<void> {
    this.loadingSubject.next(true); // Mostrar el splash
    try {
      const currentUser = this._auth.currentUser;
      if (currentUser) {
        const userDoc = doc(this._firestore, `users/${currentUser.uid}`);
        await setDoc(userDoc, { pushToken: null }, { merge: true });
        await this._auth.signOut();
        PushNotifications.removeAllListeners(); // Limpia listeners por si acaso
        localStorage.removeItem(LOCAL_USER_KEY);
        this._router.navigate(['/']);
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Manejar error
    } finally {
      this.loadingSubject.next(false); // Ocultar el splash
    }
  }

  getCurrentUser(): Promise<User | null> {
    return new Promise((resolve, reject) => {
      onAuthStateChanged(this._auth, (user) => {
        user ? resolve(user) : reject('No hay usuario autenticado');
      });
    });
  }

  async sendPasswordReset(email: string): Promise<void> {
    const signInMethods = await fetchSignInMethodsForEmail(this._auth, email);
    if (signInMethods.length === 0) {
      throw new Error('El correo no está registrado.');
    }
    await sendPasswordResetEmail(this._auth, email);
  }

  async saveUser(userId: string, email: string, name: string): Promise<void> {
    const userDoc = doc(this._firestore, `users/${userId}`);
    const data = { email, name };
    const docSnapshot = await getDoc(userDoc);
    await setDoc(userDoc, data, { merge: true });
  }

  async updatePushToken(userId: string): Promise<void> {
    try {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== 'granted') {
        console.warn('🔒 Permiso de notificaciones no concedido');
        return;
      }

      await PushNotifications.register();

      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('✅ Token obtenido:', token.value);
        const ref = doc(this._firestore, 'users', userId);
        await setDoc(ref, {
          pushToken: token.value,
          updatedAt: new Date()
        }, { merge: true });
        console.log('📦 Token guardado en Firestore');
      });
    } catch (err) {
      console.error('❌ Error al registrar pushToken:', err);
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

  async getPlantCount(userId: string): Promise<number> {
    const plantsCol = collection(this._firestore, `users/${userId}/plants`);
    const snapshot = await getDocs(plantsCol);
    return snapshot.size;
  }
}
