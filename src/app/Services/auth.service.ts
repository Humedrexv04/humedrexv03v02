import { Injectable, inject } from '@angular/core';
import {
    Auth, GoogleAuthProvider, User, createUserWithEmailAndPassword, fetchSignInMethodsForEmail, onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword, signInWithPopup
} from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private _auth = inject(Auth);
    private _firestore = inject(Firestore);
    private userSubject = new BehaviorSubject<User | null>(null); // Comportamiento del usuario

    constructor() {
        // Escuchar cambios en el estado de autenticación
        onAuthStateChanged(this._auth, (user) => {
            this.userSubject.next(user); // Emitir el usuario actual
            console.log('Estado de autenticación cambiado:', user); // Log para depuración
        });
    }

    // Método para obtener el estado del usuario como un Observable
    get user$() {
        return this.userSubject.asObservable();
    }

    isLoggedIn(): boolean {
        return !!this.userSubject.value; // Retorna verdadero si hay un usuario autenticado
    }

    // Registro de usuario con correo y contraseña y nombre
    signup(email: string, password: string, name: string): Promise<any> {
        return createUserWithEmailAndPassword(this._auth, email, password)
            .then((userCredential) => {
                const userId = userCredential.user.uid;
                return this.saveUser(userId, email, name);
            })
            .then(() => {
                console.log('Usuario registrado y guardado en Firestore:', email);
            })
            .catch(error => {
                console.error('Error al registrar el usuario:', error);
                throw error; // Propagar el error para manejarlo en el componente
            });
    }

    // Guardar el usuario en Firestore
    private saveUser(userId: string, email: string, name: string): Promise<void> {
        const userDoc = doc(this._firestore, `users/${userId}`);
        return getDoc(userDoc).then(docSnapshot => {
            if (docSnapshot.exists()) {
                console.log('Usuario ya guardado previamente:', email); // Mensaje en consola
                return; // No hacer nada si el usuario ya existe
            } else {
                return setDoc(userDoc, { email: email, name: name })
                    .then(() => console.log('Usuario guardado en Firestore:', email))
                    .catch(error => {
                        console.error('Error al guardar el usuario en Firestore:', error);
                        throw error; // Propagar el error
                    });
            }
        });
    }

    // Inicio de sesión con correo y contraseña
    login(email: string, password: string): Promise<any> {
        return signInWithEmailAndPassword(this._auth, email, password)
            .then(userCredential => {
                console.log('Usuario logueado:', userCredential.user.email);
            })
            .catch(error => {
                console.error('Error al iniciar sesión:', error);
                throw error; // Propagar el error
            });
    }

    // Inicio de sesión con Google
    loginWithGoogle(): Promise<any> {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(this._auth, provider)
            .then(result => {
                const user = result.user;
                const email = user.email; // Obtener el email
                const name = user.displayName || 'Usuario sin nombre'; // Obtener el nombre o usar un valor predeterminado

                // Verificar que el email no sea null
                if (email) {
                    // Guardar el usuario en Firestore
                    return this.saveUser(user.uid, email, name);
                } else {
                    throw new Error('El email del usuario es null');
                }
            })
            .then(() => {
                console.log('Usuario logueado con Google y guardado en Firestore');
            })
            .catch(error => {
                if (error.code === 'auth/popup-closed-by-user') {
                    console.warn('El usuario cerró la ventana emergente de inicio de sesión.');
                    // Aquí puedes mostrar un mensaje al usuario si lo deseas
                } else {
                    console.error('Error al iniciar sesión con Google:', error);
                }
                throw error; // Propagar el error
            });
    }

    // Cierre de sesión
    logout(): Promise<void> {
        return this._auth.signOut()
            .then(() => {
                console.log('Usuario cerrado sesión');
            })
            .catch(error => {
                console.error('Error al cerrar sesión:', error);
                throw error; // Propagar el error
            });
    }



    // Obtener el usuario actual
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

    // Método para enviar correo de restablecimiento
    async sendPasswordReset(email: string): Promise<void> {
        try {
            // Verificar si el correo electrónico está registrado
            const signInMethods = await fetchSignInMethodsForEmail(this._auth, email);

            if (signInMethods.length > 0) {
                throw new Error('El correo no está registrado.'); // El correo no está asociado a ninguna cuenta
            }

            // Enviar el correo de restablecimiento
            await sendPasswordResetEmail(this._auth, email);
            console.log('Correo de restablecimiento enviado a:', email);
        } catch (error: any) {
            console.error('Error en sendPasswordReset:', error);

            // Manejar errores específicos
            if (error.message === 'El correo no está registrado.') {
                throw error; // Propagar el error si el correo no está registrado
            } else {
                throw new Error('Error al enviar el correo. Inténtalo de nuevo más tarde.'); // Error genérico
            }
        }
    }

    // Método para obtener los datos del usuario desde Firestore
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