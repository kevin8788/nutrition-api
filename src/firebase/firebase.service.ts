import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import configuration from '../config/configuration';
import { DecodedFirebaseUser } from '../auth/interfaces/firebase-user.interface';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly config = configuration();

  async onModuleInit(): Promise<void> {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.config.firebase.projectId,
          clientEmail: this.config.firebase.clientEmail,
          privateKey: this.config.firebase.privateKey.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  async verifyToken(token: string): Promise<DecodedFirebaseUser> {
    const decoded = await admin.auth().verifyIdToken(token);
    return {
      google_uid: decoded.uid,
      email: decoded.email!,
    };
  }
}
