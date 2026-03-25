/**
 * services/firebase.ts
 * Firebase Phone Auth — modular API (v22+)
 *
 * Setup checklist:
 *   1. npm install @react-native-firebase/app @react-native-firebase/auth
 *   2. Add to app.json plugins: ["@react-native-firebase/app", "@react-native-firebase/auth"]
 *   3. Place google-services.json in project root
 *   4. npx expo prebuild --clean
 *   5. npx expo run:android
 *   6. Enable Phone Auth in Firebase Console
 *   7. Add SHA-1 fingerprint: cd android && ./gradlew signingReport
 */

import { getApp } from "@react-native-firebase/app";
import {
  getAuth,
  signInWithPhoneNumber,
  signOut,
} from "@react-native-firebase/auth";
import type { ConfirmationResult } from "@react-native-firebase/auth";

export type { ConfirmationResult };

class FirebaseOTPService {
  private _confirmation: ConfirmationResult | null = null;
  private _phone: string = "";

  private get auth() {
    return getAuth(getApp());
  }

  /**
   * Send OTP to a phone number.
   * Automatically formats to E.164 (+91XXXXXXXXXX for Indian numbers).
   */
  async sendOTP(phoneNumber: string): Promise<void> {
    const formatted = this._formatPhone(phoneNumber);
    this._phone = formatted;
    this._confirmation = await signInWithPhoneNumber(this.auth, formatted);
  }

  /**
   * Verify the 6-digit OTP entered by the user.
   * Returns { uid, phone } on success.
   */
  async verifyOTP(otp: string): Promise<{ uid: string; phone: string }> {
    if (!this._confirmation) {
      throw new Error("No pending OTP confirmation. Call sendOTP() first.");
    }

    const credential = await this._confirmation.confirm(otp);

    if (!credential?.user) {
      throw new Error("OTP verification failed — no user returned.");
    }

    return {
      uid: credential.user.uid,
      phone: credential.user.phoneNumber ?? this._phone,
    };
  }

  /**
   * Get Firebase ID token for the current user.
   * Pass this to your backend /api/auth/firebase-login endpoint.
   */
  async getIdToken(): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
    return user.getIdToken(true);
  }

  /** Sign out the current Firebase session */
  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  /** Convert 10-digit Indian number to E.164 */
  private _formatPhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (phone.startsWith("+")) return phone;
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
    return `+${digits}`;
  }
}

export const firebaseOTP = new FirebaseOTPService();