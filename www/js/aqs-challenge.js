/* XZILY AI — Firebase Integration Module
   Handles: App init, Auth (email + Google), Firestore (quizzes, users, settings)
   Sets window.aqsAjax for use by aqs-main.js and other scripts.             */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
    getFirestore,
    collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, deleteDoc,
    query, where, orderBy, limit, serverTimestamp, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
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

/* ── Firebase config ── */
var firebaseConfig = {
    apiKey:            'AIzaSyBN6D1VsdlQ7GzsNZ617Npuiz3Bnkr2r90',
    authDomain:        'smartquiz-darapet.firebaseapp.com',
    databaseURL:       'https://smartquiz-darapet-default-rtdb.firebaseio.com',
    projectId:         'smartquiz-darapet',
    storageBucket:     'smartquiz-darapet.firebasestorage.app',
    messagingSenderId: '915234258423',
    appId:             '1:915234258423:android:b17e8723eeb7d53652c2f2'
};

var app = initializeApp(firebaseConfig);
var db  = getFirestore(app);
var auth= getAuth(app);

/* ── Load master Groq keys from Firestore settings ── */
async function loadSiteSettings() {
    try {
        var snap = await getDoc(doc(db, 'settings', 'site'));
        if (snap.exists()) {
            var data = snap.data();
            var keys = [];
            if (Array.isArray(data.groq_keys)) keys = data.groq_keys;
            else if (data.groq_key && typeof data.groq_key === 'string' && data.groq_key.startsWith('gsk_')) keys = [data.groq_key];
            if (keys.length) {
                if (window.setGroqKeys) window.setGroqKeys(keys);
                else window._AQS_GROQ_MASTER_KEYS = keys;
            }
        }
    } catch(e) { /* silently ignore — Groq keys may come from user localStorage instead */ }
}

/* ── Helpers ── */
function sanitizeQuiz(data, id) {
    return Object.assign({ id: id || data.id }, data);
}

/* ── Auth state ── */
var currentUser    = null;
var currentProfile = null;
var authReady      = false;

onAuthStateChanged(auth, async function(user) {
    currentUser = user;
    if (user) {
        try {
            var profileSnap = await getDoc(doc(db, 'users', user.uid));
            currentProfile = profileSnap.exists() ? profileSnap.data() : {
                uid: user.uid, email: user.email, displayName: user.displayName, role: 'member'
            };
        } catch(e) {
            currentProfile = { uid: user.uid, email: user.email, displayName: user.displayName, role: 'member' };
        }

        if (window.AQS) {
            window.AQS.is_logged_in       = 'yes';
            window.AQS.current_user_name  = (currentProfile && currentProfile.displayName) || user.displayName || user.email || '';
            window.AQS.current_user_role  = (currentProfile && currentProfile.role) || 'member';
            window.AQS.is_host  = (['host','admin'].indexOf(window.AQS.current_user_role) >= 0) ? 'yes' : '';
            window.AQS.is_admin = (window.AQS.current_user_role === 'admin') ? 'yes' : '';
        }

        document.dispatchEvent(new CustomEvent('aqsAuthReady', {
            detail: {
                uid:         user.uid,
                email:       user.email,
                displayName: user.displayName || (currentProfile && currentProfile.displayName) || '',
                role:        (currentProfile && currentProfile.role) || 'member'
            }
        }));
    } else {
        currentProfile = null;
        if (window.AQS) {
            window.AQS.is_logged_in = '';
            window.AQS.is_host      = '';
            window.AQS.is_admin     = '';
        }
        document.dispatchEvent(new CustomEvent('aqsAuthReady', { detail: null }));
    }
    authReady = true;
});

/* ── Handle Google redirect on page load ── */
getRedirectResult(auth).then(async function(result) {
    if (result && result.user) {
        await ensureUserProfile(result.user);
        sessionStorage.removeItem('_aqsGoogleRedirectPending');
    }
}).catch(function() {});

/* ── Ensure user profile exists in Firestore ── */
async function ensureUserProfile(user) {
    var ref = doc(db, 'users', user.uid);
    var snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            role: 'member',
            createdAt: serverTimestamp()
        }).catch(function() {});
    }
}

/* ══════════════════════════════════════════════════════════
   ACTION HANDLERS
   ══════════════════════════════════════════════════════════ */

async function actionGetCurrentUser() {
    if (!currentUser) return { loggedIn: false };
    return {
        loggedIn:    true,
        uid:         currentUser.uid,
        email:       currentUser.email,
        displayName: currentUser.displayName || (currentProfile && currentProfile.displayName) || '',
        role:        (currentProfile && currentProfile.role) || 'member'
    };
}

async function actionRegister(data) {
    var email = (data.email || '').trim();
    var pass  = (data.password || '').trim();
    var name  = (data.name || '').trim();
    if (!email || !pass) throw new Error('Email and password required.');
    var cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (name) await updateProfile(cred.user, { displayName: name });
    await sendEmailVerification(cred.user).catch(function() {});
    await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid, email: email, displayName: name, role: 'member', createdAt: serverTimestamp()
    }).catch(function() {});
    return { success: true, uid: cred.user.uid };
}

async function actionLogin(data) {
    var email = (data.email || '').trim();
    var pass  = (data.password || '').trim();
    if (!email || !pass) throw new Error('Email and password required.');
    var cred = await signInWithEmailAndPassword(auth, email, pass);
    return { success: true, uid: cred.user.uid };
}

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
        var GoogleAuthPlugin = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.GoogleAuth) || window.GoogleAuth;
        if (!GoogleAuthPlugin) {
            try { cred = await signInWithPopup(auth, authProvider); }
            catch (e) { throw new Error('Google sign-in is not available on this device. Please update the app.'); }
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
        var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
        if (isMobile) {
            sessionStorage.setItem('_aqsGoogleRedirectPending', '1');
            await signInWithRedirect(auth, authProvider);
            return { pending: true };
        } else {
            try {
                cred = await signInWithPopup(auth, authProvider);
            } catch (popupErr) {
                if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/popup-closed-by-user') {
                    sessionStorage.setItem('_aqsGoogleRedirectPending', '1');
                    await signInWithRedirect(auth, authProvider);
                    return { pending: true };
                }
                throw popupErr;
            }
        }
    }

    if (cred && cred.user) await ensureUserProfile(cred.user);
    return { success: true, uid: cred.user.uid };
}

async function actionLogout() {
    await signOut(auth);
    return { success: true };
}

/* ── Quiz CRUD ── */

async function actionGetQuizzes() {
    if (!currentUser) throw new Error('Not logged in.');
    var isAdmin = window.AQS && window.AQS.is_admin === 'yes';
    var q = isAdmin
        ? query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'), limit(200))
        : query(collection(db, 'quizzes'), where('hostUid', '==', currentUser.uid), orderBy('createdAt', 'desc'), limit(100));
    var snap = await getDocs(q);
    return snap.docs.map(function(d) { return sanitizeQuiz(d.data(), d.id); });
}

async function actionGetQuiz(data) {
    var id = data.id || data.quiz_id;
    if (!id) throw new Error('Quiz ID required.');
    var snap = await getDoc(doc(db, 'quizzes', id));
    if (!snap.exists()) throw new Error('Quiz not found.');
    return sanitizeQuiz(snap.data(), snap.id);
}

async function actionSaveQuiz(data) {
    if (!currentUser) throw new Error('Not logged in.');
    var quiz = Object.assign({}, data.quiz || data);
    var quizId = quiz.id || data.id || data.quiz_id;
    delete quiz.id;
    quiz.hostUid   = quiz.hostUid   || currentUser.uid;
    quiz.hostEmail = quiz.hostEmail || currentUser.email;
    quiz.hostName  = quiz.hostName  || currentUser.displayName || currentUser.email;
    quiz.updatedAt = serverTimestamp();
    if (!quiz.createdAt) quiz.createdAt = serverTimestamp();

    if (quizId) {
        await updateDoc(doc(db, 'quizzes', quizId), quiz);
        return { id: quizId };
    } else {
        var ref = await addDoc(collection(db, 'quizzes'), quiz);
        return { id: ref.id };
    }
}

async function actionDeleteQuiz(data) {
    var id = data.id || data.quiz_id;
    if (!id) throw new Error('Quiz ID required.');
    await deleteDoc(doc(db, 'quizzes', id));
    return { success: true };
}

async function actionPublishQuiz(data) {
    var id = data.id || data.quiz_id;
    if (!id) throw new Error('Quiz ID required.');
    await updateDoc(doc(db, 'quizzes', id), { status: 'published', publishedAt: serverTimestamp() });
    return { success: true, id: id };
}

async function actionUnpublishQuiz(data) {
    var id = data.id || data.quiz_id;
    if (!id) throw new Error('Quiz ID required.');
    await updateDoc(doc(db, 'quizzes', id), { status: 'draft' });
    return { success: true };
}

/* ── Attendance / Results ── */

async function actionSubmitQuiz(data) {
    var attempt = Object.assign({}, data);
    attempt.submittedAt = serverTimestamp();
    var ref = await addDoc(collection(db, 'attendance'), attempt);
    return { success: true, id: ref.id };
}

async function actionGetAttendance(data) {
    var quizId = data.quiz_id || data.quizId;
    var q;
    if (quizId) {
        q = query(collection(db, 'attendance'), where('quizId', '==', quizId), orderBy('submittedAt', 'desc'));
    } else if (currentUser) {
        q = query(collection(db, 'attendance'), where('hostUid', '==', currentUser.uid), orderBy('submittedAt', 'desc'), limit(500));
    } else {
        return [];
    }
    var snap = await getDocs(q);
    return snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
}

async function actionDeleteAttendance(data) {
    var id = data.id;
    if (!id) throw new Error('Attendance record ID required.');
    await deleteDoc(doc(db, 'attendance', id));
    return { success: true };
}

/* ── User profile ── */

async function actionUpdateProfile(data) {
    if (!currentUser) throw new Error('Not logged in.');
    var updates = {};
    if (data.displayName) { updates.displayName = data.displayName; await updateProfile(currentUser, { displayName: data.displayName }); }
    if (data.photoURL)    { updates.photoURL    = data.photoURL;    await updateProfile(currentUser, { photoURL: data.photoURL });    }
    if (Object.keys(updates).length) {
        await updateDoc(doc(db, 'users', currentUser.uid), updates).catch(function() {});
    }
    return { success: true };
}

async function actionGetUserStats() {
    if (!currentUser) return { quizzesTaken: 0, quizzesCreated: 0 };
    var taken   = await getDocs(query(collection(db, 'attendance'), where('uid', '==', currentUser.uid)));
    var created = await getDocs(query(collection(db, 'quizzes'),    where('hostUid', '==', currentUser.uid)));
    return { quizzesTaken: taken.size, quizzesCreated: created.size };
}

/* ── Notifications ── */

async function actionGetNotifications() {
    try {
        var snap = await getDocs(query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(20)));
        return snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
    } catch(e) { return []; }
}

/* ── Settings ── */

async function actionSaveSettings(data) {
    if (!currentUser) throw new Error('Not logged in.');
    var settings = Object.assign({}, data.settings || data);
    delete settings.action;
    await setDoc(doc(db, 'settings', 'site'), settings, { merge: true });
    if (settings.groq_keys || settings.groq_key) await loadSiteSettings();
    return { success: true };
}

async function actionGetHosts() {
    try {
        var snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'host')));
        return snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
    } catch(e) { return []; }
}


/* ══════════════════════════════════════════════════════════
   CHALLENGE MODE — Firestore Backend
   Handles: create, join, poll, start, answer, settings,
            chat, play_again
   ══════════════════════════════════════════════════════════ */

function _chGenerateCode(){
    var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code='';
    for(var i=0;i<6;i++) code+=chars[Math.floor(Math.random()*chars.length)];
    return code;
}
function _chGenerateToken(){
    var arr=new Uint8Array(16);
    try{ crypto.getRandomValues(arr); }catch(e){
        for(var i=0;i<16;i++) arr[i]=Math.floor(Math.random()*256);
    }
    return Array.from(arr,function(b){return b.toString(16).padStart(2,'0');}).join('');
}
function _chInitScores(numPlayers){
    var s={};
    for(var i=0;i<numPlayers;i++) s[String(i)]=0;
    return s;
}

async function actionChallengeCreate(data){
    var code=_chGenerateCode();
    var playerToken=_chGenerateToken();
    var questions=[];
    try{ questions=JSON.parse(data.questions_json||'[]'); }catch(e){}
    var numPlayers=parseInt(data.num_players)||2;
    var qpr=parseInt(data.questions_per_round)||5;
    var numRounds=parseInt(data.num_rounds)||1;
    var tpq=parseInt(data.time_per_question)||30;
    var leagueMode=(data.league_mode=='1'||data.league_mode===1);
    var docData={
        code:code,
        title:data.title||data.topic||'Challenge',
        host_name:data.host_name||'Host',
        status:'waiting', phase:'waiting',
        num_players:numPlayers, questions_per_round:qpr,
        num_rounds:numRounds, time_per_question:tpq, league_mode:leagueMode,
        questions:questions,
        players:[{position:0,player_name:data.host_name||'Host',
            token:playerToken,character_id:data.character_id||'koda',is_host:true}],
        scores:_chInitScores(numPlayers),
        current_question_idx:0, current_round_num:1, q_in_round:1,
        round:1, total_rounds:numRounds,
        active_pos:0, primary_pos:0, attempt_idx:0, steal_mode:false,
        question_started_at:0, answers_this_q:{}, reveal_started_at:0,
        chat:[], created_at:serverTimestamp()
    };
    await setDoc(doc(db,'challenges',code),docData);
    return {code:code,num_players:numPlayers,num_rounds:numRounds,
        questions_per_round:qpr,title:docData.title,player_token:playerToken};
}

async function actionChallengeJoin(data){
    var code=(data.code||'').toUpperCase().trim();
    var snap=await getDoc(doc(db,'challenges',code));
    if(!snap.exists()) throw new Error('Challenge not found. Check the code and try again.');
    var d=snap.data();
    if(d.status!=='waiting') throw new Error('This challenge has already started.');
    var takenPositions=(d.players||[]).map(function(p){return p.position;});
    var nextPos=0;
    while(takenPositions.indexOf(nextPos)>=0) nextPos++;
    if(nextPos>=d.num_players) throw new Error('Challenge is full ('+d.num_players+' players max).');
    var playerToken=_chGenerateToken();
    var newPlayer={position:nextPos,player_name:(data.player_name||'Player').slice(0,32),
        token:playerToken,character_id:data.character_id||'koda',is_host:false};
    await updateDoc(doc(db,'challenges',code),{players:[].concat(d.players||[]).concat([newPlayer])});
    return {player_token:playerToken,position:nextPos,is_host:false,
        player_name:newPlayer.player_name,num_players:d.num_players,
        title:d.title,host_name:d.host_name,num_rounds:d.num_rounds,
        questions_per_round:d.questions_per_round,time_per_question:d.time_per_question,
        joined_mid_game:false};
}

async function actionChallengePoll(data){
    var code=(data.code||'').toUpperCase().trim();
    var snap=await getDoc(doc(db,'challenges',code));
    if(!snap.exists()) return {status:'finished',phase:'finished'};
    var d=snap.data();
    var now=Date.now();

    /* Auto-advance: reveal → next question (after 6 s) or results */
    if(d.phase==='reveal' && d.reveal_started_at && (now-d.reveal_started_at)>6000){
        var nextIdx=(d.current_question_idx||0)+1;
        var totalQs=(d.num_rounds||1)*(d.questions_per_round||5);
        var maxQs=(d.questions||[]).length;
        if(nextIdx>=totalQs||nextIdx>=maxQs){
            await updateDoc(doc(db,'challenges',code),{status:'finished',phase:'finished'});
            d=Object.assign({},d,{status:'finished',phase:'finished'});
        } else {
            var newRound=Math.floor(nextIdx/(d.questions_per_round||5))+1;
            var newQInRound=(nextIdx%(d.questions_per_round||5))+1;
            var nPlayers=Math.max(1,(d.players||[]).length);
            var newActivePos=nextIdx%nPlayers;
            var upd={phase:'active',current_question_idx:nextIdx,
                current_round_num:newRound,q_in_round:newQInRound,round:newRound,
                active_pos:newActivePos,primary_pos:newActivePos,
                attempt_idx:0,steal_mode:false,
                question_started_at:now,answers_this_q:{},reveal_started_at:0};
            await updateDoc(doc(db,'challenges',code),upd);
            d=Object.assign({},d,upd);
        }
    }

    var qIdx=d.current_question_idx||0;
    var currentQ=(d.questions||[])[qIdx]||null;
    /* Strip correct_answer_index during active phase (anti-cheat) */
    var questionForPoll=null;
    if(currentQ){
        if(d.phase==='active'){
            questionForPoll={question:currentQ.question,options:currentQ.options};
        } else {
            questionForPoll=currentQ; /* reveal phase: full question with answer */
        }
    }

    return {
        status:d.status||'waiting', phase:d.phase||'waiting',
        num_players:d.num_players||2, num_rounds:d.num_rounds||1,
        questions_per_round:d.questions_per_round||5,
        num_questions:(d.num_rounds||1)*(d.questions_per_round||5),
        time_per_question:d.time_per_question||30,
        title:d.title||'', host_name:d.host_name||'Host',
        players:d.players||[], scores:d.scores||{},
        current_round_num:d.current_round_num||1,
        q_in_round:d.q_in_round||1,
        round:d.round||d.current_round_num||1,
        total_rounds:d.total_rounds||d.num_rounds||1,
        active_pos:d.active_pos||0, primary_pos:d.primary_pos||0,
        attempt_idx:d.attempt_idx||0, steal_mode:false,
        question:questionForPoll,
        question_started_at:d.question_started_at||0,
        answers_this_q:d.answers_this_q||{},
        chat:(d.chat||[]).slice(-30)
    };
}

async function actionChallengeStart(data){
    var code=(data.code||'').toUpperCase().trim();
    var snap=await getDoc(doc(db,'challenges',code));
    if(!snap.exists()) throw new Error('Challenge not found');
    var d=snap.data();
    var nPlayers=Math.max(1,(d.players||[]).length);
    await updateDoc(doc(db,'challenges',code),{
        status:'active',phase:'active',
        current_question_idx:0,current_round_num:1,q_in_round:1,round:1,
        active_pos:0,primary_pos:0,attempt_idx:0,steal_mode:false,
        question_started_at:Date.now(),answers_this_q:{},reveal_started_at:0
    });
    return {success:true};
}

async function actionChallengeAnswer(data){
    var code=(data.code||'').toUpperCase().trim();
    var snap=await getDoc(doc(db,'challenges',code));
    if(!snap.exists()) throw new Error('Challenge not found');
    var d=snap.data();
    if(d.phase!=='active') return {correct_idx:-1,is_correct:false,pts:0};

    /* Find player by token */
    var player=null;
    (d.players||[]).forEach(function(p){ if(p.token===data.player_token) player=p; });
    if(!player) throw new Error('Player token not recognized');

    var qIdx=d.current_question_idx||0;
    var currentQ=(d.questions||[])[qIdx]||null;
    var correctIdx=(currentQ&&currentQ.correct_answer_index!==undefined)
        ?parseInt(currentQ.correct_answer_index):-1;
    var ansIdx=parseInt(data.answer_idx);
    var isCorrect=(ansIdx>=0&&ansIdx===correctIdx);
    var pts=0;
    if(isCorrect){
        pts=10;
        var boost=parseInt(data.skill_boost)||1;
        if(boost>1) pts=pts*Math.min(boost,4);
    } else if(data.skill_shield=='1'||data.skill_shield===1){
        pts=3; /* shield gives 3 pts even on wrong answer */
    }

    var pos=String(player.position);
    var newAnswers=Object.assign({},d.answers_this_q||{});
    if(newAnswers[pos]) return {correct_idx:correctIdx,is_correct:isCorrect,pts:0}; /* already answered */
    newAnswers[pos]={answer_idx:ansIdx,is_correct:isCorrect,pts:pts};

    var newScores=Object.assign({},d.scores||{});
    if(newScores[pos]===undefined) newScores[pos]=0;
    newScores[pos]+=pts;

    var updates={answers_this_q:newAnswers,scores:newScores};

    /* Advance to reveal when ALL joined players have answered */
    var allAnswered=true;
    (d.players||[]).forEach(function(p){
        if(!newAnswers[String(p.position)]) allAnswered=false;
    });
    if(allAnswered){
        updates.phase='reveal';
        updates.reveal_started_at=Date.now();
    }

    await updateDoc(doc(db,'challenges',code),updates);
    return {correct_idx:correctIdx,is_correct:isCorrect,pts:pts};
}

async function actionChallengeUpdateSettings(data){
    var code=(data.code||'').toUpperCase().trim();
    var updates={};
    if(data.title&&data.title.trim()) updates.title=data.title.trim();
    if(data.time_per_question) updates.time_per_question=parseInt(data.time_per_question)||30;
    await updateDoc(doc(db,'challenges',code),updates);
    return {title:data.title,time_per_question:parseInt(data.time_per_question)||30};
}

async function actionChallengeChat(data){
    var code=(data.code||'').toUpperCase().trim();
    var snap=await getDoc(doc(db,'challenges',code));
    if(!snap.exists()) return {};
    var d=snap.data();
    var chat=(d.chat||[]).slice(-49);
    chat.push({name:(data.player_name||'?').slice(0,20),
        msg:String(data.message||'').slice(0,200),t:Date.now()});
    await updateDoc(doc(db,'challenges',code),{chat:chat});
    return {};
}

async function actionChallengePlayAgain(data){
    var code=(data.code||'').toUpperCase().trim();
    var snap=await getDoc(doc(db,'challenges',code));
    if(!snap.exists()) throw new Error('Challenge not found');
    var d=snap.data();
    var numPlayers=d.num_players||2;
    await updateDoc(doc(db,'challenges',code),{
        status:'waiting',phase:'waiting',
        current_question_idx:0,current_round_num:1,q_in_round:1,round:1,
        active_pos:0,primary_pos:0,attempt_idx:0,steal_mode:false,
        question_started_at:0,answers_this_q:{},reveal_started_at:0,
        scores:_chInitScores(numPlayers)
    });
    return {success:true};
}

/* ══════════════════════════════════════════════════════════
   ROUTER
   ══════════════════════════════════════════════════════════ */

var ACTION_MAP = {
    'get_current_user':      actionGetCurrentUser,
    'register':              actionRegister,
    'login':                 actionLogin,
    'social_login':          actionSocialLogin,
    'logout':                actionLogout,
    'get_quizzes':           actionGetQuizzes,
    'get_quiz':              actionGetQuiz,
    'save_quiz':             actionSaveQuiz,
    'delete_quiz':           actionDeleteQuiz,
    'publish_quiz':          actionPublishQuiz,
    'unpublish_quiz':        actionUnpublishQuiz,
    'submit_quiz':           actionSubmitQuiz,
    'get_attendance':        actionGetAttendance,
    'delete_attendance':     actionDeleteAttendance,
    'update_profile':        actionUpdateProfile,
    'get_user_stats':        actionGetUserStats,
    'get_notifications':     actionGetNotifications,
    'save_settings':         actionSaveSettings,
    'get_hosts':             actionGetHosts,
    /* challenge mode */
    'aqs_ch_create':         actionChallengeCreate,
    'aqs_ch_join':           actionChallengeJoin,
    'aqs_ch_poll':           actionChallengePoll,
    'aqs_ch_start':          actionChallengeStart,
    'aqs_ch_answer':         actionChallengeAnswer,
    'aqs_ch_update_settings':actionChallengeUpdateSettings,
    'aqs_ch_chat':           actionChallengeChat,
    'aqs_ch_play_again':     actionChallengePlayAgain,
    /* aliases */
    'aqs_get_quizzes':           actionGetQuizzes,
    'aqs_save_quiz':             actionSaveQuiz,
    'aqs_delete_quiz':           actionDeleteQuiz,
    'aqs_publish_quiz':          actionPublishQuiz,
    'aqs_get_attendance':        actionGetAttendance,
    'aqs_delete_attendance':     actionDeleteAttendance,
    'aqs_get_notifications':     actionGetNotifications,
};

window.aqsAjax = async function(action, data, onSuccess, onError) {
    var handler = ACTION_MAP[action];
    if (!handler) {
        var err = new Error('Unknown action: ' + action);
        if (typeof onError === 'function') onError(err);
        return Promise.reject(err);
    }
    try {
        var result = await handler(data || {});
        if (typeof onSuccess === 'function') onSuccess(result);
        return result;
    } catch(e) {
        if (typeof onError === 'function') onError(e);
        throw e;
    }
};

/* ── jQuery $.ajax shim for code that calls ajax_url:'firebase' ── */
(function() {
    if (!window.jQuery) return;
    var _orig = window.jQuery.ajax;
    window.jQuery.ajax = function(opts) {
        if (!opts) return _orig.apply(this, arguments);
        var url    = opts.url || '';
        var ajaxUrl= window.AQS && window.AQS.ajax_url;
        if (url !== 'firebase' && url !== ajaxUrl) return _orig.apply(this, arguments);
        var data   = opts.data || {};
        var action = data.action || '';
        var handler = ACTION_MAP[action];
        if (!handler) return _orig.apply(this, arguments);
        handler(data).then(function(result) {
            if (typeof opts.success === 'function') opts.success({ success: true, data: result });
        }).catch(function(e) {
            if (typeof opts.error === 'function') opts.error({}, 'error', e.message);
        });
        return { abort: function() {} };
    };
})();

/* ── Boot ── */
loadSiteSettings();
