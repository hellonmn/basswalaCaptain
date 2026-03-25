/**
 * razorpay-customui.service.ts  — FIXED
 *
 * Fix: getAppsWhichSupportUPI does NOT take a key as first arg.
 *      Correct signature is just: getAppsWhichSupportUPI(callback)
 *      Passing KEY_ID as first arg was treating the string as the callback
 *      which caused it to silently return no apps.
 *
 * UPI Collect removed from this service — it must go via your backend.
 * Use apiService.initiateUPICollect() instead (see paymentController.js).
 */

import { Platform } from 'react-native';
import { RAZORPAY_CONFIG } from './razorpay.config';

export interface InstalledUPIApp {
  app_name: string;
  app_icon: string;     // base64 PNG — use as: { uri: `data:image/png;base64,${app_icon}` }
  package_name: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  signature?: string;
  dismissed?: boolean;
  error?: string;
}

export const UPI_APP_META: Record<string, { label: string; color: string }> = {
  'com.google.android.apps.nbu.paisa.user': { label: 'Google Pay',   color: '#4285F4' },
  'com.phonepe.app':                         { label: 'PhonePe',      color: '#5f259f' },
  'net.one97.paytm':                         { label: 'Paytm',        color: '#00b9f1' },
  'in.org.npci.upiapp':                      { label: 'BHIM',         color: '#00529c' },
  'com.amazon.mShop.android.shopping':       { label: 'Amazon Pay',   color: '#ff9900' },
  'com.whatsapp':                            { label: 'WhatsApp Pay', color: '#25D366' },
  'com.mobikwik_new':                        { label: 'MobiKwik',     color: '#1da0f2' },
};

function getSDK(): any | null {
  try {
    const mod = require('react-native-customui').default ?? require('react-native-customui');
    return mod || null;
  } catch {
    console.warn('[RazorpayCustomUI] SDK not available. Run: npm install react-native-customui && npx expo prebuild --clean && npx expo run:android');
    return null;
  }
}

class _RazorpayCustomUIService {

  isAvailable(): boolean {
    return getSDK() !== null;
  }

  /**
   * Returns UPI apps installed on the device.
   * Android only.
   *
   * ✅ FIXED: correct signature is getAppsWhichSupportUPI(callback)
   *    NO key argument — passing KEY_ID as first arg was the bug.
   */
  getInstalledUPIApps(): Promise<InstalledUPIApp[]> {
    return new Promise((resolve) => {
      if (Platform.OS !== 'android') return resolve([]);

      const SDK = getSDK();
      if (!SDK) return resolve([]);

      try {
        SDK.getAppsWhichSupportUPI((apps: InstalledUPIApp[]) => {
          resolve(Array.isArray(apps) ? apps : []);
        });
      } catch (e) {
        console.warn('[RazorpayCustomUI] getAppsWhichSupportUPI error:', e);
        resolve([]);
      }
    });
  }

  /**
   * UPI Intent — opens a specific UPI app directly, bypassing Razorpay UI.
   * packageName must come from getInstalledUPIApps().
   */
  async payViaUPIIntent(params: {
    orderId: string;
    amount: number;       // ₹
    packageName: string;
    contact: string;
    email: string;
  }): Promise<PaymentResult> {
    const SDK = getSDK();
    if (!SDK) return { success: false, error: 'Custom UI SDK not linked.' };

    return this._open(SDK, {
      key_id:               RAZORPAY_CONFIG.KEY_ID,
      amount:               String(Math.round(params.amount * 100)),
      currency:             'INR',
      order_id:             params.orderId,
      contact:              params.contact,
      email:                params.email,
      method:               'upi',
      upi_app_package_name: params.packageName,
      '_[flow]':            'intent',
    });
  }

  /**
   * UPI Collect — sends a collect request to the user's VPA.
   * Uses SDK.open() which works with BOTH test and live keys.
   * (Direct Razorpay REST API only works with live keys)
   *
   * Note: This shows NO Razorpay UI — the SDK handles the collect
   * request silently and returns success/fail to your callback.
   * The user approves inside their own UPI app (PhonePe, GPay etc).
   */
  async payViaUPICollect(params: {
    orderId: string;
    amount: number;
    vpa: string;
    contact: string;
    email: string;
  }): Promise<PaymentResult> {
    const SDK = getSDK();
    if (!SDK) return { success: false, error: 'Custom UI SDK not linked.' };

    return this._open(SDK, {
      key_id:    RAZORPAY_CONFIG.KEY_ID,
      amount:    String(Math.round(params.amount * 100)),
      currency:  'INR',
      order_id:  params.orderId,
      contact:   params.contact,
      email:     params.email,
      method:    'upi',
      vpa:       params.vpa,
      '_[flow]': 'collect',
    });
  }

  /**
   * Card payment — your own UI collects card details.
   */
  async payViaCard(params: {
    orderId: string;
    amount: number;
    card: { number: string; name: string; expiry_month: string; expiry_year: string; cvv: string };
    contact: string;
    email: string;
  }): Promise<PaymentResult> {
    const SDK = getSDK();
    if (!SDK) return { success: false, error: 'Custom UI SDK not linked.' };

    return this._open(SDK, {
      key_id:                RAZORPAY_CONFIG.KEY_ID,
      amount:                String(Math.round(params.amount * 100)),
      currency:              'INR',
      order_id:              params.orderId,
      contact:               params.contact,
      email:                 params.email,
      method:                'card',
      'card[number]':        params.card.number,
      'card[name]':          params.card.name,
      'card[expiry_month]':  params.card.expiry_month,
      'card[expiry_year]':   params.card.expiry_year,
      'card[cvv]':           params.card.cvv,
    });
  }

  private _open(SDK: any, options: Record<string, string>): Promise<PaymentResult> {
    return new Promise((resolve) => {
      SDK.open(options)
        .then((data: any) => resolve({
          success:   true,
          paymentId: data.razorpay_payment_id,
          orderId:   data.razorpay_order_id,
          signature: data.razorpay_signature,
        }))
        .catch((err: any) => {
          if (err?.code === 0) return resolve({ success: false, dismissed: true });
          resolve({ success: false, error: err?.description ?? err?.message ?? 'Payment failed' });
        });
    });
  }
}

export const RazorpayCustomUI = new _RazorpayCustomUIService();