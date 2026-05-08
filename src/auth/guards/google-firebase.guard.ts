// google firebase.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import 'dotenv/config';

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            FIREBASE_PROJECT_ID: string;
            FIREBASE_PRIVATE_KEY: string;
        }
    }
}

@Injectable()
export class GoogleFirebaseGuard implements CanActivate {
  constructor() {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: `firebase-adminsdk-${process.env.FIREBASE_PROJECT_ID}@${process.env.FIREBASE_PROJECT_ID}.iam.gserviceaccount.com`,
        }),
      });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1]; // Assuming Bearer token

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      request.user = decodedToken; // Attach user info to request
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}