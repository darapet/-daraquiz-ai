/* ================================================================
   PATCH for: www/js/aqs-firebase.js
   HOW TO APPLY IN GITHUB:
     1. Open aqs-firebase.js in GitHub's web editor
     2. Do TWO find-and-replace operations below
   ================================================================ */


/* ── CHANGE 1: Add "signInWithCredential" to the import ──────────
   Find this block at the very top of the file (~line 10):

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    signOut,
    onAuthStateChanged,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

   Replace it with:
*/

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    signOut,
    onAuthStateChanged,
    updateProfile,
    GoogleAuthProvider,
    signInWithCredential,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';


/* ── CHANGE 2: Replace the actionSocialLogin function ────────────
   Find this entire function (starts around line 394).
   It starts with:

    async function actionSocialLogin(data) {
        var provider = data.provider || 'google';

   And ends around line 430 just before the next function.

   Replace the ENTIRE function with the code below:
*/

    async function actionSocialLogin(data) {
        var provider = data.provider || 'google';
        var authProvider;
        if (provider === 'google') {
            authProvider = new GoogleAuthProvider();
            authProvider.addScope('email');
            authProvider.addScope('profile');
        } else {
            throw new Error('Unsupported social provider: ' + provider);
        }

        var isCapacitorNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
        var cred;

        if (isCapacitorNative) {
            /* ── Capacitor Android/iOS native: use the GoogleAuth plugin ──
               @codetrix-studio/capacitor-google-auth handles the native
               Google OAuth flow and returns a Firebase-compatible credential. */
            var GoogleAuthPlugin = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.GoogleAuth)
                                   || window.GoogleAuth;
            if (!GoogleAuthPlugin) {
                /* Plugin not available — last resort popup attempt */
                try {
                    cred = await signInWithPopup(auth, authProvider);
                } catch (e) {
                    throw new Error('Google sign-in is not available on this device. Please update the app.');
                }
            } else {
                try {
                    await GoogleAuthPlugin.initialize({
                        clientId: '915234258423-au2kl568mirohob21ejl5n0nrt68bg5r.apps.googleusercontent.com',
                        scopes: ['profile', 'email'],
                        grantOfflineAccess: true
                    });
                } catch (_) { /* Already initialized — safe to ignore */ }

                var googleUser = await GoogleAuthPlugin.signIn();
                var idToken = googleUser.authentication
                    ? (googleUser.authentication.idToken || googleUser.idToken)
                    : googleUser.idToken;
                if (!idToken) throw new Error('Google sign-in failed: no token returned. Please try again.');
                var credential = GoogleAuthProvider.credential(idToken);
                cred = await signInWithCredential(auth, credential);
            }
        } else {
            /* ── Web browser: popup on desktop, redirect on mobile browser ── */
            var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
            if (isMobile) {
                sessionStorage.setItem('_aqsGoogleRedirectPending', '1');
                await signInWithRedirect(auth, authProvider);
                return; /* page navigates away — result handled by getRedirectResult on next load */
            } else {
                try {
                    cred = await signInWithPopup(auth, authProvider);
                } catch (popupErr) {
                    if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/popup-closed-by-user') {
                        sessionStorage.setItem('_aqsGoogleRedirectPending', '1');
                        await signInWithRedirect(auth, authProvider);
                        return;
                    }
                    throw popupErr;
                }
            }
        }

        /* ── Common path: cred obtained — look up or create profile ── */
