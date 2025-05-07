import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { environment } from './environments';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { getMessaging, provideMessaging } from '@angular/fire/messaging';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideDatabase(() => getDatabase()), provideFirebaseApp(() => initializeApp({ projectId: "humedrex-c91e1", appId: "1:386733567915:web:34a4965af39fea05982cee", databaseURL: "https://humedrex-c91e1-default-rtdb.firebaseio.com", storageBucket: "humedrex-c91e1.firebasestorage.app", apiKey: "AIzaSyCFBDQNtYc4wctTQH9ZmH7hiUy0oq6D6M0", authDomain: "humedrex-c91e1.firebaseapp.com", messagingSenderId: "386733567915", measurementId: "G-ERBJFDQ6LX" })), provideFunctions(() => getFunctions()), provideFirebaseApp(() => initializeApp({ projectId: "humedrex-c91e1", appId: "1:386733567915:web:34a4965af39fea05982cee", databaseURL: "https://humedrex-c91e1-default-rtdb.firebaseio.com", storageBucket: "humedrex-c91e1.firebasestorage.app", apiKey: "AIzaSyCFBDQNtYc4wctTQH9ZmH7hiUy0oq6D6M0", authDomain: "humedrex-c91e1.firebaseapp.com", messagingSenderId: "386733567915", measurementId: "G-ERBJFDQ6LX" })), provideMessaging(() => getMessaging())
  ]
};