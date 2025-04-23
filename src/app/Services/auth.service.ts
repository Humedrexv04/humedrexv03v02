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

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private _auth = inject(Auth);
    private _firestore = inject(Firestore);
    private userSubject = new BehaviorSubject<User | null>(null);

    constructor() {
        onAuthStateChanged(this._auth, (user) => {
            this.userSubject.next(user);
            console.log('Estado de autenticación cambiado:', user);
        });
    }

    get user$() {
        return this.userSubject.asObservable();
    }

    isLoggedIn(): boolean {
        return !!this.userSubject.value;
    }

    signup(email: string, password: string, name: string): Promise<any> {
        return createUserWithEmailAndPassword(this._auth, email, password)
            .then(async (userCredential) => {
                const user = userCredential.user;
                const token = await user.getIdToken();
                return this.saveUser(user.uid, email, name, token);
            })
            .then(() => {
                console.log('Usuario registrado y guardado en Firestore con token');
            })
            .catch(error => {
                console.error('Error al registrar el usuario:', error);
                throw error;
            });
    }

    public saveUser(userId: string, email: string, name: string, authToken?: string, fcmToken?: string): Promise<void> {
        const userDoc = doc(this._firestore, `users/${userId}`);
        const dataToSave: any = { email, name };
        if (authToken) dataToSave.token = authToken;
        if (fcmToken) dataToSave.fcmToken = fcmToken;

        return getDoc(userDoc).then(docSnapshot => {
            if (docSnapshot.exists()) {
                // Si ya existe, actualizamos el token sin sobrescribir el resto
                return setDoc(userDoc, dataToSave, { merge: true });
            } else {
                // Nuevo documento
                return setDoc(userDoc, dataToSave);
            }
        });
    }


    login(email: string, password: string): Promise<any> {
        return signInWithEmailAndPassword(this._auth, email, password)
            .then(async (userCredential) => {
                const user = userCredential.user;
                const token = await user.getIdToken();
                return this.saveUser(user.uid, email, user.displayName || 'Usuario', token);
            })
            .then(() => {
                console.log('Usuario logueado con token guardado');
            })
            .catch(error => {
                console.error('Error al iniciar sesión:', error);
                throw error;
            });
    }

    loginWithGoogle(): Promise<any> {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(this._auth, provider)
            .then(async result => {
                const user = result.user;
                const email = user.email;
                const name = user.displayName || 'Usuario sin nombre';
                const token = await user.getIdToken();

                if (email) {
                    return this.saveUser(user.uid, email, name, token);
                } else {
                    throw new Error('El email del usuario es null');
                }
            })
            .then(() => {
                console.log('Usuario logueado con Google y token guardado');
            })
            .catch(error => {
                if (error.code === 'auth/popup-closed-by-user') {
                    console.warn('El usuario cerró la ventana emergente de inicio de sesión.');
                } else {
                    console.error('Error al iniciar sesión con Google:', error);
                }
                throw error;
            });
    }

    logout(): Promise<void> {
        const currentUser = this._auth.currentUser;

        if (currentUser) {
            const userDoc = doc(this._firestore, `users/${currentUser.uid}`);
            return setDoc(userDoc, { token: null }, { merge: true })
                .then(() => this._auth.signOut())
                .then(() => {
                    console.log('Sesión cerrada y token eliminado');
                })
                .catch(error => {
                    console.error('Error al cerrar sesión:', error);
                    throw error;
                });
        } else {
            return this._auth.signOut()
                .then(() => {
                    console.log('Sesión cerrada (sin usuario activo)');
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

            if (signInMethods.length > 0) {
                throw new Error('El correo no está registrado.');
            }

            await sendPasswordResetEmail(this._auth, email);
            console.log('Correo de restablecimiento enviado a:', email);
        } catch (error: any) {
            console.error('Error en sendPasswordReset:', error);

            if (error.message === 'El correo no está registrado.') {
                throw error;
            } else {
                throw new Error('Error al enviar el correo. Inténtalo de nuevo más tarde.');
            }
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
