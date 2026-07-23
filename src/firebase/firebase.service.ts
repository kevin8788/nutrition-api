import { Injectable, OnModuleInit } from '@nestjs/common';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import configuration from '../config/configuration';
import { DecodedFirebaseUser } from '../auth/interfaces/firebase-user.interface';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly config = configuration();

  async onModuleInit(): Promise<void> {
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: this.config.firebase.projectId,
          clientEmail: this.config.firebase.clientEmail,
          privateKey: this.config.firebase.privateKey.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  async verifyToken(token: string): Promise<DecodedFirebaseUser> {
    const decoded = await getAuth().verifyIdToken(token);
    return {
      google_uid: decoded.uid,
      email: decoded.email!,
    };
  }
}
