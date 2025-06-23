// Configuration
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyMHEL8sWB92Nq85LVFfQj5awIXZRjknZF9iD_mZYE4qdrDe3fHkVWo15QS7L9m941Dxw/exec";

// DOM Elements
const secretInput = document.getElementById('secretInput');
const charCount = document.getElementById('charCount');
const lengthError = document.getElementById('lengthError');
const emotionError = document.getElementById('emotionError');
const emotionBtns = document.querySelectorAll('.emotion-btn');
const submitBtn = document.getElementById('submitBtn');
const loading = document.getElementById('loading');
const resultContainer = document.getElementById('resultContainer');
const resultTitle = document.getElementById('resultTitle');
const secretResult = document.getElementById('secretResult');
const actionsContainer = document.getElementById('actionsContainer');
const thankYouMessage = document.getElementById('thankYouMessage');
const actionBtns = document.querySelectorAll('.action-btn');
const secretFormContainer = document.getElementById('secretFormContainer');
const revealedLoading = document.getElementById('revealedLoading');
const revealedSecretsGrid = document.getElementById('revealedSecretsGrid');
const paypalContainer = document.getElementById('paypalContainer');
const statsDisplay = document.getElementById('statsDisplay');
const keepStat = document.getElementById('keepStat');
const forgetStat = document.getElementById('forgetStat');
const supportStat = document.getElementById('supportStat');
const revealStat = document.getElementById('revealStat');
const restartBtn = document.getElementById('restartBtn');
const modelStatus = document.getElementById('modelStatus');
const moderationMessage = document.getElementById('moderationMessage');
const toxicityLevel = document.getElementById('toxicityLevel');
const totalSecrets = document.getElementById('totalSecrets');
const emotion1 = document.getElementById('emotion1');
const emotion2 = document.getElementById('emotion2');
const emotion3 = document.getElementById('emotion3');
const emotion4 = document.getElementById('emotion4');
const emotion5 = document.getElementById('emotion5');
const emotion6 = document.getElementById('emotion6');
const emotion7 = document.getElementById('emotion7');

// Variables globales
let selectedEmotion = null;
let currentRowId = null;
let actionTaken = false;
let secretStats = { keep: 0, forget: 0, support: 0, reveal: 0 };
let toxicityModel = null;

// Détection de code (version améliorée)
function containsCode(text) {
    // Patterns pour détecter du vrai code
    const patterns = [
        /<[a-z][\s\S]*>/i,                         // HTML tags
        /function\s*\([^)]*\)\s*\{[^}]*\}/,        // Function declarations with body
        /(?:^|\s)(var|let|const)\s+\w+\s*=\s*[^;]+;/,  // JS variable assignments
        /\.\w+\([^)]*\)\s*;?/,                     // Method calls
        /(?:^|\s)(if|for|while|switch)\s*\([^)]*\)\s*\{/, // Control structures
        /(?:^|\s)(def|class)\s+\w+\s*\(?[^)]*\)?\s*:/,  // Python code
        /console\.log\(|alert\(|document\.\w+/i     // Specific JS functions
    ];
    
    // Faux positifs à ignorer
    const falsePositives = [
        /\([^)]{0,50}\)/,                     // Short parentheses
        /[a-z]\.(com|org|net)/i,              // Internet domains
        /:\/\/|www\.|http:\/\/|https:\/\//,   // URLs
        /=>|->|\+\+|--|&&|\|\|/               // Common symbols
    ];
    
    // Vérifier les patterns de code
    const hasCode = patterns.some(pattern => pattern.test(text));
    
    // Vérifier les faux positifs
    const hasFalsePositive = falsePositives.some(pattern => pattern.test(text));
    
    return hasCode && !hasFalsePositive;
}

// Initialisation du modèle de toxicité
async function initToxicityModel() {
    try {
        if (modelStatus) {
            modelStatus.style.display = 'block';
            modelStatus.textContent = "Loading content moderation model...";
        }
        
        toxicityModel = await toxicity.load(0.4, [
            'toxicity', 'severe_toxicity', 'identity_attack', 
            'insult', 'threat', 'sexual_explicit'
        ]);
        
        setTimeout(() => {
            if (modelStatus) {
                modelStatus.style.display = 'none';
            }
        }, 1500);
    } catch (error) {
        if (modelStatus) {
            modelStatus.textContent = "Moderation disabled: " + error.message;
            modelStatus.classList.add('error');
        }
        console.warn("Moderation disabled:", error);
    }
}

// Vérification de contenu toxique
async function isToxic(text) {
    if (!toxicityModel) return { isToxic: false, maxScore: 0 };
    
    try {
        const predictions = await toxicityModel.classify([text]);
        let maxScore = 0;
        
        predictions.forEach(prediction => {
            if (prediction.results[0].match) {
                const score = prediction.results[0].probabilities[1];
                if (score > maxScore) maxScore = score;
            }
        });
        
        if (maxScore > 0.4) {
            const percent = Math.min(100, Math.round(maxScore * 100));
            if (toxicityLevel) toxicityLevel.style.width = `${percent}%`;
            if (moderationMessage) {
                document.querySelector('.toxicity-percent').textContent = `${percent}%`;
                moderationMessage.style.display = 'block';
            }
            return { isToxic: true, maxScore };
        }
        
        if (moderationMessage) moderationMessage.style.display = 'none';
        return { isToxic: false, maxScore };
    } catch (error) {
        console.warn("Moderation error:", error);
        return { isToxic: false, maxScore: 0 };
    }
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Compteur de caractères
    if (secretInput) {
        secretInput.addEventListener('input', () => {
            const text = secretInput.value;
            if (charCount) charCount.textContent = text.length;
            if (lengthError) lengthError.style.display = text.length < 100 ? 'block' : 'none';
            updateSubmitButton();
        });
    }
    
    // Sélection d'émotion
    if (emotionBtns.length > 0) {
        emotionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                emotionBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedEmotion = btn.dataset.emotion;
                if (emotionError) emotionError.style.display = 'none';
                updateSubmitButton();
            });
        });
    }
    
    // Soumission du secret
    if (submitBtn) {
        submitBtn.addEventListener('click', submitSecret);
    }
    
    // Actions sur les secrets
    if (actionBtns.length > 0) {
        actionBtns.forEach(btn => {
            btn.addEventListener('click', () => handleSecretAction(btn.dataset.action));
        });
    }
    
    // Bouton de redémarrage
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            if (resultContainer) resultContainer.style.display = 'none';
            if (secretFormContainer) secretFormContainer.style.display = 'block';
            if (secretInput) secretInput.value = '';
            if (charCount) charCount.textContent = '0';
            selectedEmotion = null;
            emotionBtns.forEach(b => b.classList.remove('selected'));
            updateSubmitButton();
            if (secretFormContainer) {
                secretFormContainer.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
}

// Mise à jour du bouton de soumission
function updateSubmitButton() {
    if (!submitBtn) return;
    
    const text = secretInput ? secretInput.value : '';
    submitBtn.disabled = !(text.length >= 100 && 
                          text.length <= 500 && 
                          selectedEmotion);
}

// Soumission du secret
async function submitSecret() {
    if (!secretInput) return;
    
    const secret = secretInput.value.trim();
    
    if (secret.length < 100 && lengthError) {
        lengthError.style.display = 'block';
        return;
    }
    if (!selectedEmotion && emotionError) {
        emotionError.style.display = 'block';
        return;
    }
    
    if (moderationMessage) moderationMessage.style.display = 'none';
    if (loading) loading.style.display = 'block';
    if (submitBtn) submitBtn.disabled = true;
    
    try {
        if (containsCode(secret)) {
            throw new Error("Your text appears to contain code. Please write in natural language.");
        }
        
        const toxicityResult = await isToxic(secret);
        if (toxicityResult.isToxic) {
            throw new Error(`Inappropriate content detected (${Math.round(toxicityResult.maxScore * 100)}%). Please rephrase.`);
        }
        
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                action: 'submitSecret',
                secret: secret,
                emotion: selectedEmotion
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status !== 'success') {
            throw new Error(result.message || 'Unknown server error');
        }
        
        showSecretResult(result.data);
    } catch (error) {
        console.error("Submission error:", error);
        if (moderationMessage) {
            moderationMessage.querySelector('p').textContent = error.message;
            moderationMessage.style.display = 'block';
        }
    } finally {
        if (loading) loading.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
    }
}

// Affichage du résultat
function showSecretResult(result) {
    currentRowId = result.rowId;
    if (secretResult) secretResult.textContent = result.exchangeSecret || "No similar secrets found";
    if (secretFormContainer) secretFormContainer.style.display = 'none';
    if (resultContainer) resultContainer.style.display = 'block';
    
    // Initialisation des stats
    secretStats.keep = result.keep || 0;
    secretStats.forget = result.forget || 0;
    secretStats.support = result.support || 0;
    secretStats.reveal = result.reveal || 0;
    updateStatsDisplay();
    
    if (resultContainer) resultContainer.scrollIntoView({ behavior: 'smooth' });
}

// Gestion des actions sur les secrets
async function handleSecretAction(action) {
    if (actionTaken || !currentRowId) return;
    
    actionTaken = true;
    if (actionBtns.length > 0) actionBtns.forEach(b => b.disabled = true);
    
    try {
        // Mise à jour du compteur
        const response = await fetch(`${SCRIPT_URL}?action=increment&rowId=${currentRowId}&counterType=${action}`);
        if (!response.ok) throw new Error('Update failed');
        
        const result = await response.json();
        if (result.status !== 'success') {
            throw new Error(result.message || 'Action failed');
        }
        
        // Mise à jour des stats
        await updateSecretStats();
        
        // Actions spéciales
        if (action === 'reveal') {
            if (paypalContainer) paypalContainer.style.display = 'block';
            initPaypalButton();
            loadRevealedSecrets();
        }
        
        if (thankYouMessage) thankYouMessage.style.display = 'block';
    } catch (error) {
        console.error("Action error:", error);
        alert(`Error: ${error.message}`);
        if (actionBtns.length > 0) actionBtns.forEach(b => b.disabled = false);
        actionTaken = false;
    }
}

// Initialisation du bouton PayPal
function initPaypalButton() {
    if (!window.paypal) {
        console.warn("PayPal SDK not loaded");
        return;
    }
    
    try {
        paypal.HostedButtons({
            hostedButtonId: "DKK8KM24TAJRE",
        }).render("#paypal-container-DKK8KM24TAJRE");
    } catch (error) {
        console.error("PayPal button error:", error);
    }
}

// Mise à jour des statistiques du secret
async function updateSecretStats() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getSecretStats&rowId=${currentRowId}`);
        if (!response.ok) throw new Error('Stats update failed');
        
        const result = await response.json();
        if (result.status === 'success') {
            secretStats = {
                keep: result.data.keep || 0,
                forget: result.data.forget || 0,
                support: result.data.support || 0,
                reveal: result.data.reveal || 0
            };
            updateStatsDisplay();
            if (statsDisplay) statsDisplay.style.display = 'block';
        }
    } catch (error) {
        console.warn("Stats error:", error);
    }
}

// Mise à jour de l'affichage des stats
function updateStatsDisplay() {
    if (keepStat) keepStat.textContent = secretStats.keep;
    if (forgetStat) forgetStat.textContent = secretStats.forget;
    if (supportStat) supportStat.textContent = secretStats.support;
    if (revealStat) revealStat.textContent = secretStats.reveal;
}

// Chargement des secrets révélés
async function loadRevealedSecrets() {
    if (!revealedSecretsGrid || !revealedLoading) return;
    
    revealedLoading.style.display = 'block';
    revealedSecretsGrid.innerHTML = '';
    
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getRevealedSecrets`);
        if (!response.ok) throw new Error('Failed to load secrets');
        
        const result = await response.json();
        if (result.status === "success" && result.data.secrets?.length) {
            result.data.secrets.forEach(secret => {
                if (revealedSecretsGrid) {
                    revealedSecretsGrid.appendChild(createSecretCard(secret));
                }
            });
        } else {
            showNoSecretsMessage();
        }
    } catch (error) {
        showSecretsError(error);
    } finally {
        if (revealedLoading) revealedLoading.style.display = 'none';
    }
}

// Création d'une carte de secret
function createSecretCard(secret) {
    const card = document.createElement('div');
    card.className = 'secret-card';
    card.innerHTML = `
        <div class="secret-emotion">${secret.emotion || '😶'}</div>
        <div class="secret-content">${secret.secret || 'Secret not available'}</div>
        <div class="stats-container">
            <div class="stat-item keep-stat">
                <div class="stat-value">${secret.keep || 0}</div>
                <div class="stat-label">Keep</div>
            </div>
            <div class="stat-item forget-stat">
                <div class="stat-value">${secret.forget || 0}</div>
                <div class="stat-label">Forget</div>
            </div>
            <div class="stat-item support-stat">
                <div class="stat-value">${secret.support || 0}</div>
                <div class="stat-label">Support</div>
            </div>
            <div class="stat-item reveal-stat">
                <div class="stat-value">${secret.reveal || 0}</div>
                <div class="stat-label">Reveal</div>
            </div>
        </div>
    `;
    return card;
}

// Message quand aucun secret n'est révélé
function showNoSecretsMessage() {
    if (!revealedSecretsGrid) return;
    
    revealedSecretsGrid.innerHTML = `
        <div class="no-secrets">
            <h3>No secrets revealed yet</h3>
            <p>Be the first to reveal a secret!</p>
        </div>
    `;
}

// Message d'erreur de chargement
function showSecretsError(error) {
    if (!revealedSecretsGrid) return;
    
    revealedSecretsGrid.innerHTML = `
        <div class="error">
            <h3>Error loading secrets</h3>
            <p>${error.message || 'Technical issue'}</p>
        </div>
    `;
}

// Chargement des stats globales
async function loadStats() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getStats`);
        if (!response.ok) throw new Error('Failed to load stats');
        
        const result = await response.json();
        if (result.status === 'success') {
            const data = result.data;
            if (totalSecrets) totalSecrets.textContent = data.total || 0;
            if (emotion1) emotion1.textContent = data.byEmotion?.['😤'] || 0;
            if (emotion2) emotion2.textContent = data.byEmotion?.['🤑'] || 0;
            if (emotion3) emotion3.textContent = data.byEmotion?.['😒'] || 0;
            if (emotion4) emotion4.textContent = data.byEmotion?.['😠'] || 0;
            if (emotion5) emotion5.textContent = data.byEmotion?.['😏'] || 0;
            if (emotion6) emotion6.textContent = data.byEmotion?.['😋'] || 0;
            if (emotion7) emotion7.textContent = data.byEmotion?.['😑'] || 0;
        }
    } catch (error) {
        console.warn("Stats error:", error);
    }
}

// Initialisation de l'application
async function initializeApp() {
    await initToxicityModel();
    setupEventListeners();
    loadRevealedSecrets();
    loadStats();
    
    // État initial de l'UI
    if (charCount && secretInput) charCount.textContent = secretInput.value.length;
    updateSubmitButton();
    if (resultContainer) resultContainer.style.display = 'none';
    if (paypalContainer) paypalContainer.style.display = 'none';
    if (statsDisplay) statsDisplay.style.display = 'none';
    if (thankYouMessage) thankYouMessage.style.display = 'none';
    if (moderationMessage) moderationMessage.style.display = 'none';
}

// Lancement de l'application
document.addEventListener('DOMContentLoaded', initializeApp);