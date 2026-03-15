import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, type MessagePayload } from "firebase/messaging";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "dummy",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "dummy",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const getValidVapidKey = () => {
    const key = (import.meta.env.VITE_FIREBASE_VAPID_KEY || "").trim();
    if (!key || key === "dummy_vapid_key") return null;
    // VAPID public keys are URL-safe base64 strings and typically long.
    if (key.length < 60) return null;
    return key;
};

const canUseMessaging = async () => {
    if (typeof window === "undefined") return false;
    if (!window.isSecureContext) return false;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return false;
    }
    return isSupported();
};

const getMessagingInstance = async () => {
    const supported = await canUseMessaging();
    if (!supported) return null;
    return getMessaging(app);
};

export const requestFirebaseToken = async () => {
    try {
        const vapidKey = getValidVapidKey();
        if (!vapidKey) {
            console.warn("Firebase messaging disabled: missing or invalid VAPID key.");
            return null;
        }

        const messaging = await getMessagingInstance();
        if (!messaging) {
            console.warn("Firebase messaging unavailable in this browser/context.");
            return null;
        }

        if (Notification.permission === "denied") {
            console.warn("Notifications are blocked by the user/browser.");
            return null;
        }

        const currentToken = await getToken(messaging, {
            vapidKey,
        });

        if (currentToken) {
            console.log('Firebase token:', currentToken);
            // Here you would usually save the token to your database (e.g. Supabase profiles)
            return currentToken;
        } else {
            console.log('No registration token available. Request permission to generate one.');
            return null;
        }
    } catch (err) {
        console.error('An error occurred while retrieving token. ', err);
        return null;
    }
};

export const subscribeToFirebaseMessages = async (
    callback: (payload: MessagePayload) => void
) => {
    const messaging = await getMessagingInstance();
    if (!messaging) return () => undefined;
    return onMessage(messaging, callback);
};
