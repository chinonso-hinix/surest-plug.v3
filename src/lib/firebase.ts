/**
 * Surest Plug - Real Firebase Authentication & Firestore Service
 * Connects directly to Firebase Auth with Email/Password and Google Sign-In,
 * and synchronizes user profiles with Firestore.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  sendPasswordResetEmail, 
  updateProfile, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Order, Deposit, SupportTicket, CustomOrder, Product, Transaction, User } from '../types';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth & Firestore
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Friendly, user-understandable error messages for Firebase Auth errors
 */
export function getReadableAuthError(codeOrMessage: string): string {
  if (!codeOrMessage) return 'An authentication error occurred. Please try again.';
  
  const code = codeOrMessage.toLowerCase();

  if (code.includes('auth/operation-not-allowed') || code.includes('operation-not-allowed')) {
    return 'Registration is temporarily unavailable. Please try again later.';
  }
  if (code.includes('auth/user-not-found') || code.includes('auth/wrong-password') || code.includes('auth/invalid-credential') || code.includes('auth/invalid-login-credentials')) {
    return 'Invalid email or password. Please verify your credentials.';
  }
  if (code.includes('auth/email-already-in-use') || code.includes('email-already-in-use')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (code.includes('auth/weak-password') || code.includes('weak-password')) {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (code.includes('auth/invalid-email') || code.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (code.includes('auth/too-many-requests') || code.includes('too-many-requests')) {
    return 'Access temporarily disabled due to many failed attempts. Please try again later or reset password.';
  }
  if (code.includes('auth/popup-closed-by-user') || code.includes('popup-closed-by-user')) {
    return 'Google sign-in popup was closed.';
  }
  if (code.includes('auth/cancelled-popup-request') || code.includes('cancelled-popup-request')) {
    return 'Sign-in popup was cancelled. Please try again.';
  }
  if (code.includes('auth/network-request-failed') || code.includes('network-request-failed')) {
    return 'Network connection error. Please check your internet connection.';
  }

  return codeOrMessage;
}

/**
 * Helper: Sync / create user profile document in Firestore (Non-blocking background sync)
 */
export async function syncFirestoreUserProfile(
  user: FirebaseUser, 
  fullName: string, 
  phone?: string, 
  referralCode?: string
): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const emailLower = (user.email || '').toLowerCase().trim();
    const isAdmin = emailLower === 'chinonsochinix@gmail.com' || emailLower === 'comedyhome0@gmail.com';

    // Fast check with safety race so firestore timeout never hangs execution
    const snapPromise = getDoc(userDocRef);
    const timeoutPromise = new Promise<'TIMEOUT'>((resolve) => setTimeout(() => resolve('TIMEOUT'), 5000));
    const existingSnap = await Promise.race([snapPromise, timeoutPromise]);

    if (existingSnap === 'TIMEOUT') {
      console.warn('Firestore profile read timed out; preserving the existing account and making no profile changes.');
      return;
    }

    if (!existingSnap.exists()) {
      await setDoc(userDocRef, {
        full_name: fullName.trim() || user.displayName || (isAdmin ? 'CHINONSO MONDAY' : 'Surest Plug User'),
        email: emailLower,
        phone: phone?.trim() || '',
        role: isAdmin ? 'admin' : 'user',
        balance: 0,
        referral_qualified: false,
        referral_code: referralCode?.trim().toUpperCase() || '',
        welcome_seen: false,
        created_at: serverTimestamp()
      }, { merge: true });
    }
  } catch (err) {
    // Firestore rules or offline shouldn't break client app execution
    console.warn('Firestore user profile sync warning:', err);
  }
}

/**
 * Register a new user using Firebase Email & Password
 */
export async function registerWithFirebase(
  fullName: string, 
  email: string, 
  password: string,
  phone?: string,
  referralCode?: string
) {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const user = userCredential.user;
    
    // Update display name on Firebase Auth Profile
    try {
      await updateProfile(user, {
        displayName: fullName.trim(),
        photoURL: '/sp-logo.png'
      });
    } catch {
      // ignore profile update error
    }

    // Sync user profile in Firestore in background (non-blocking)
    syncFirestoreUserProfile(user, fullName, phone, referralCode).catch(() => {});

    const idToken = await user.getIdToken();
    return { success: true, user, idToken };
  } catch (error: any) {
    const errCode = error?.code || error?.message || 'auth/unknown';
    

    return { 
      success: false, 
      error: getReadableAuthError(errCode) 
    };
  }
}

/**
 * Sign in existing user using Firebase Email & Password
 */
export async function loginWithFirebase(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const user = userCredential.user;
    
    // Sync Firestore profile asynchronously
    syncFirestoreUserProfile(user, user.displayName || 'Surest Plug User').catch(() => {});

    const idToken = await user.getIdToken();
    return { success: true, user, idToken };
  } catch (error: any) {

    return { 
      success: false, 
      error: getReadableAuthError(error?.code || error?.message || 'auth/unknown') 
    };
  }
}

/**
 * Sign in or Register using Google Sign-In
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Sync Firestore profile asynchronously
    syncFirestoreUserProfile(user, user.displayName || 'Surest Plug User').catch(() => {});

    const idToken = await user.getIdToken();
    return { success: true, user, idToken };
  } catch (error: any) {
    const errCode = error?.code || error?.message || 'auth/unknown';
    return { 
      success: false, 
      error: getReadableAuthError(errCode) 
    };
  }
}

/**
 * Sign out current user
 */
export async function logoutFirebase() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Send Password Reset Email
 */
export async function sendFirebasePasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { success: true, message: 'Password reset link sent to your email address.' };
  } catch (error: any) {
    return { 
      success: false, 
      error: getReadableAuthError(error?.code || error?.message || 'auth/unknown') 
    };
  }
}

/**
 * Listen for Firebase Auth state changes
 */
export function onFirebaseAuthStateChanged(callback: (user: FirebaseUser | null, idToken: string | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const idToken = await user.getIdToken();
        callback(user, idToken);
      } catch {
        callback(user, null);
      }
    } else {
      callback(null, null);
    }
  });
}

/**
 * ==========================================================
 * FIRESTORE PERSISTENCE & REAL-TIME SYNC HELPERS
 * ==========================================================
 */

/**
 * Save / Update Order in Firestore 'orders' collection
 */
export async function syncOrderToFirestore(order: Order, firebaseUid?: string): Promise<boolean> {
  try {
    const orderDocRef = doc(db, 'orders', order.order_reference || `order_${order.id}`);
    const cleanDetails = { ...(order.customer_details || {}) };
    // Remove massive base64 payloads to keep Firestore documents clean and fast
    delete cleanDetails.website_zip_data;

    await setDoc(orderDocRef, {
      id: order.id,
      order_reference: order.order_reference,
      user_id: firebaseUid || String(order.user_id),
      user_name: order.user_name || '',
      user_email: order.user_email || '',
      product_id: order.product_id || null,
      product_name: order.product_name,
      category: order.category,
      amount: order.amount,
      status: order.status,
      payment_status: order.payment_status,
      customer_details: cleanDetails,
      admin_note: order.admin_note || '',
      created_at: order.created_at || new Date().toISOString(),
      updated_at: order.updated_at || new Date().toISOString(),
      timestamp: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore order sync warning:', err);
    return false;
  }
}

/**
 * Save / Update Deposit in Firestore 'deposits' collection
 */
export async function syncDepositToFirestore(deposit: Deposit, firebaseUid?: string): Promise<boolean> {
  try {
    const depDocRef = doc(db, 'deposits', deposit.deposit_reference || `dep_${deposit.id}`);
    await setDoc(depDocRef, {
      id: deposit.id,
      deposit_reference: deposit.deposit_reference,
      user_id: firebaseUid || String(deposit.user_id),
      user_name: deposit.user_name || '',
      user_email: deposit.user_email || '',
      amount: deposit.amount,
      payment_method: deposit.payment_method,
      payment_reference: deposit.payment_reference || '',
      status: deposit.status,
      admin_note: deposit.admin_note || '',
      reviewed_by: deposit.reviewed_by || null,
      created_at: deposit.created_at || new Date().toISOString(),
      reviewed_at: deposit.reviewed_at || null,
      timestamp: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore deposit sync warning:', err);
    return false;
  }
}

/**
 * Save / Update Support Ticket in Firestore 'support_tickets' collection
 */
export async function syncSupportTicketToFirestore(ticket: SupportTicket, firebaseUid?: string): Promise<boolean> {
  try {
    const ticketDocRef = doc(db, 'support_tickets', ticket.ticket_code || `ticket_${ticket.id}`);
    
    // Sanitize messages (remove large voice base64 if needed, store in IDB locally)
    const sanitizedMessages = (ticket.messages || []).map(m => ({
      id: m.id,
      ticket_id: m.ticket_id,
      sender_id: m.sender_id,
      sender_name: m.sender_name,
      sender_role: m.sender_role,
      message_type: m.message_type || 'text',
      message: m.message || '',
      audio_duration: m.audio_duration || 0,
      created_at: m.created_at || new Date().toISOString()
    }));

    await setDoc(ticketDocRef, {
      id: ticket.id,
      ticket_code: ticket.ticket_code,
      user_id: firebaseUid || String(ticket.user_id),
      user_name: ticket.user_name || '',
      subject: ticket.subject,
      priority: ticket.priority,
      status: ticket.status,
      messages: sanitizedMessages,
      created_at: ticket.created_at || new Date().toISOString(),
      updated_at: ticket.updated_at || new Date().toISOString(),
      timestamp: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore support ticket sync warning:', err);
    return false;
  }
}

/**
 * Save / Update Custom Order in Firestore
 */
export async function syncCustomOrderToFirestore(customOrder: CustomOrder, firebaseUid?: string): Promise<boolean> {
  try {
    const reqDocRef = doc(db, 'custom_orders', customOrder.request_reference || `req_${customOrder.id}`);
    await setDoc(reqDocRef, {
      id: customOrder.id,
      request_reference: customOrder.request_reference,
      user_id: firebaseUid || String(customOrder.user_id),
      user_name: customOrder.user_name || '',
      user_email: customOrder.user_email || '',
      phone: customOrder.phone || '',
      project_name: customOrder.project_name,
      website_type: customOrder.website_type,
      description: customOrder.description,
      logo_url: customOrder.logo_url || '',
      logo_name: customOrder.logo_name || '',
      logo_size: customOrder.logo_size || 0,
      reference_website: customOrder.reference_website || '',
      features_list: customOrder.features_list || [],
      required_features: customOrder.required_features,
      additional_instructions: customOrder.additional_instructions || '',
      pages_count: customOrder.pages_count || '',
      budget: customOrder.budget,
      price: customOrder.price || 0,
      deadline: customOrder.deadline,
      contact_information: customOrder.contact_information,
      status: customOrder.status,
      admin_note: customOrder.admin_note || '',
      created_at: customOrder.created_at || new Date().toISOString(),
      updated_at: customOrder.updated_at || new Date().toISOString(),
      timestamp: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore custom order sync warning:', err);
    return false;
  }
}

/**
 * Save / Update Product in Firestore 'products' collection
 */
export async function syncProductToFirestore(product: Product): Promise<boolean> {
  try {
    const prodDocRef = doc(db, 'products', `prod_${product.id}`);
    const cleanProduct = { ...product };
    // Remove heavy base64 zip data to keep Firestore documents lightweight
    delete cleanProduct.website_zip_data;

    await setDoc(prodDocRef, {
      ...cleanProduct,
      availability: product.availability,
      is_sold: product.availability === 'sold' || Boolean(product.is_sold),
      sold_at: product.sold_at || null,
      sold_to_user_id: product.sold_to_user_id || null,
      sold_to_user_name: product.sold_to_user_name || null,
      sold_to_user_email: product.sold_to_user_email || null,
      sold_order_id: product.sold_order_id || null,
      updated_at: new Date().toISOString(),
      timestamp: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore product sync warning:', err);
    return false;
  }
}

/**
 * Save / Update Transaction in Firestore 'transactions' collection
 */
export async function syncTransactionToFirestore(transaction: Transaction, firebaseUid?: string): Promise<boolean> {
  try {
    const txDocRef = doc(db, 'transactions', transaction.reference || `tx_${transaction.id}`);
    await setDoc(txDocRef, {
      id: transaction.id,
      user_id: firebaseUid || String(transaction.user_id),
      user_name: transaction.user_name || '',
      user_email: transaction.user_email || '',
      product_id: transaction.product_id || null,
      product_name: transaction.product_name || '',
      product_category: transaction.product_category || '',
      order_id: transaction.order_id || null,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency || 'NGN',
      balance_before: transaction.balance_before ?? 0,
      balance_after: transaction.balance_after ?? 0,
      reference: transaction.reference,
      payment_reference: transaction.payment_reference || transaction.reference,
      status: transaction.status || 'successful',
      payment_status: transaction.payment_status || 'Successful',
      order_status: transaction.order_status || 'Completed',
      delivery_status: transaction.delivery_status || 'Delivered',
      product_status: transaction.product_status || (transaction.type === 'product_purchase' ? 'Sold' : ''),
      description: transaction.description || '',
      payment_method: transaction.payment_method || 'wallet',
      created_at: transaction.created_at || new Date().toISOString(),
      updated_at: transaction.updated_at || new Date().toISOString(),
      timestamp: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore transaction sync warning:', err);
    return false;
  }
}

/**
 * Check Firestore to see if a deposit/transaction reference was already recorded
 */
export async function checkIfReferenceProcessedInFirestore(reference: string): Promise<boolean> {
  const cleanRef = reference.trim();
  if (!cleanRef) return false;

  try {
    const depDocRef = doc(db, 'deposits', cleanRef);
    const txDocRef = doc(db, 'transactions', cleanRef);

    const [depSnap, txSnap] = await Promise.all([
      getDoc(depDocRef).catch(() => null),
      getDoc(txDocRef).catch(() => null)
    ]);

    if (depSnap && depSnap.exists()) {
      const data = depSnap.data();
      if (data?.status === 'approved' || data?.status === 'success') {
        return true;
      }
    }

    if (txSnap && txSnap.exists()) {
      const data = txSnap.data();
      if (data?.status === 'successful' || data?.status === 'success') {
        return true;
      }
    }

    return false;
  } catch (err) {
    console.warn('Firestore reference check warning:', err);
    return false;
  }
}

/**
 * Load durable account state from Firestore after authentication.
 * Browser storage is only a cache and must never be the source of truth for
 * wallet balances or financial/history records.
 */
export async function loadFirebaseAccountData(firebaseUid: string) {
  if (!firebaseUid) throw new Error('Missing Firebase UID');
  const profileSnap = await getDoc(doc(db, 'users', firebaseUid));
  if (!profileSnap.exists()) return null;

  const scoped = [
    ['orders', 'user_id'],
    ['deposits', 'user_id'],
    ['transactions', 'user_id'],
    ['custom_orders', 'user_id'],
    ['support_tickets', 'user_id']
  ] as const;

  const collections = await Promise.all(scoped.map(async ([name, field]) => {
    const snap = await getDocs(query(collection(db, name), where(field, '==', firebaseUid)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }));

  return {
    profile: profileSnap.data(),
    orders: collections[0],
    deposits: collections[1],
    transactions: collections[2],
    customOrders: collections[3],
    supportTickets: collections[4]
  };
}

/**
 * Sync updated user wallet balance to Firestore
 */
export async function syncUserBalanceToFirestore(firebaseUid: string, balance: number): Promise<boolean> {
  if (!firebaseUid) return false;
  try {
    const userDocRef = doc(db, 'users', firebaseUid);
    await setDoc(userDocRef, {
      balance: Number(balance.toFixed(2)),
      updated_at: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore user balance sync warning:', err);
    return false;
  }
}

