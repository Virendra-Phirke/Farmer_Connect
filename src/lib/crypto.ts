import CryptoJS from 'crypto-js';

// Fallback key if an environment variable is not provided, 
// though ideally this should be stored securely and never committed.
const MASTER_KEY = import.meta.env.VITE_CHAT_ENCRYPTION_KEY || 'farmdirect_secure_key_2026';

/**
 * Derives a specific encryption key for a group to softly isolate encryption.
 */
const getGroupKey = (groupId: string) => {
    return `${MASTER_KEY}_${groupId}`;
};

/**
 * Encrypts a plaintext message using AES.
 * @param text The raw message
 * @param groupId The ID of the group the message is being sent to
 * @returns Base64 encoded encrypted string
 */
export const encryptMessage = (text: string, groupId: string): string => {
    try {
        if (!text) return text;
        const key = getGroupKey(groupId);
        return CryptoJS.AES.encrypt(text, key).toString();
    } catch (error) {
        console.error("Encryption failed:", error);
        return text; // Fallback to plain text on error to avoid dataloss
    }
};

/**
 * Decrypts an AES encrypted message back to plaintext.
 * @param encryptedText The Base64 encoded encrypted string from the database
 * @param groupId The ID of the group the message belongs to
 * @returns The decrypted plaintext message
 */
export const decryptMessage = (encryptedText: string, groupId: string): string => {
    try {
        if (!encryptedText) return encryptedText;
        const key = getGroupKey(groupId);
        const bytes = CryptoJS.AES.decrypt(encryptedText, key);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || encryptedText; // If decryption fails (e.g. it was never encrypted), return original
    } catch (error) {
        // Not all messages will be encrypted (especially old ones), so fail gracefully
        return encryptedText;
    }
};
