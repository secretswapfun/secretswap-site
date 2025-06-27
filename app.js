 // Configuration
        const API_URL = "https://script.google.com/macros/s/AKfycbzoxceaWatzIPoF0OyX4LfUDdikqywtm2l8neNjps9EQSMnc-5y6_jnU9V9aTWIqm2O6Q/exec";
        const MIN_SECRET_LENGTH = 100;
        const EMOTIONS = ['😤', '🤑', '😒', '😠', '😏', '😋', '😑'];
        
        // DOM Elements
        const secretForm = document.getElementById('secretForm');
        const secretInput = document.getElementById('secretInput');
        const charCount = document.getElementById('charCount');
        const emotionBtns = document.querySelectorAll('.emotion-btn');
        const selectedEmotionInput = document.getElementById('selectedEmotion');
        const submitBtn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');
        const submitSpinner = document.getElementById('submitSpinner');
        const secretDisplay = document.getElementById('secretDisplay');
        const counterBtns = document.querySelectorAll('.counter-btn');
        const currentSecretId = document.getElementById('currentSecretId');
        const refreshRevealedBtn = document.getElementById('refreshRevealed');
        const revealedSecretsContainer = document.getElementById('revealedSecretsContainer');
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notificationMessage');
        const shareCard = document.getElementById('shareCard');
        const receivedCard = document.getElementById('receivedCard');
        const restartSection = document.getElementById('restartSection');
        const restartBtn = document.getElementById('restartBtn');
        const codeError = document.getElementById('codeError');
        const toxicityError = document.getElementById('toxicityError');
        const toxicityLevel = document.getElementById('toxicityLevel');
        const toxicityPercent = document.querySelector('.toxicity-percent');
        const modelStatus = document.getElementById('modelStatus');
        const totalSecrets = document.getElementById('totalSecrets');
        const revealedSecrets = document.getElementById('revealedSecrets');
        const emotion1 = document.getElementById('emotion1');
        const emotion2 = document.getElementById('emotion2');
        const emotion3 = document.getElementById('emotion3');
        const emotion4 = document.getElementById('emotion4');
        const emotion5 = document.getElementById('emotion5');
        const emotion6 = document.getElementById('emotion6');
        const emotion7 = document.getElementById('emotion7');
        const emotionError = document.getElementById('emotionError');
        const refreshStatsBtn = document.getElementById('refreshStats');
        
        // Global variables
        let currentSecret = null;
        let actionTaken = false;
        let toxicityModel = null;
        let isSubmitting = false;
        
        // Create animated particles
        function createParticles() {
            const particlesContainer = document.getElementById('particles');
            for (let i = 0; i < 30; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = `${Math.random() * 100}%`;
                particle.style.top = `${Math.random() * 100}%`;
                particle.style.animationDelay = `${Math.random() * 5}s`;
                particlesContainer.appendChild(particle);
            }
        }
        
        // Detect code in text
        function containsCode(text) {
            const patterns = [
                /<[a-z][\s\S]*>/i,                         // HTML tags
                /function\s*\([^)]*\)\s*\{[^}]*\}/,        // Function declarations
                /(?:^|\s)(var|let|const)\s+\w+\s*=\s*[^;]+;/,  // JS variable assignments
                /\.\w+\([^)]*\)\s*;?/,                     // Method calls
                /(?:^|\s)(if|for|while|switch)\s*\([^)]*\)\s*\{/, // Control structures
                /(?:^|\s)(def|class)\s+\w+\s*\(?[^)]*\)?\s*:/,  // Python code
                /console\.log\(|alert\(|document\.\w+/i     // Specific JS functions
            ];
            
            const falsePositives = [
                /\([^)]{0,50}\)/,                     // Short parentheses
                /[a-z]\.(com|org|net)/i,              // Internet domains
                /:\/\/|www\.|http:\/\/|https:\/\//,   // URLs
                /=>|->|\+\+|--|&&|\|\|/               // Common symbols
            ];
            
            const hasCode = patterns.some(pattern => pattern.test(text));
            const hasFalsePositive = falsePositives.some(pattern => pattern.test(text));
            
            return hasCode && !hasFalsePositive;
        }
        
        // Initialize toxicity model
        async function initToxicityModel() {
            try {
                modelStatus.innerHTML = '<i class="fas fa-cog fa-spin"></i> Loading moderation model...';
                
                toxicityModel = await toxicity.load(0.4, [
                    'toxicity', 'severe_toxicity', 'identity_attack', 
                    'insult', 'threat', 'sexual_explicit'
                ]);
                
                setTimeout(() => {
                    modelStatus.innerHTML = '<i class="fas fa-check-circle"></i> Moderation model loaded';
                    setTimeout(() => {
                        modelStatus.style.display = 'none';
                    }, 2000);
                }, 1500);
            } catch (error) {
                modelStatus.innerHTML = `<i class="fas fa-exclamation-circle"></i> Moderation disabled: ${error.message}`;
                modelStatus.classList.add('error');
                console.warn("Moderation disabled:", error);
            }
        }
        
        // Check for toxic content
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
                    toxicityLevel.style.width = `${percent}%`;
                    toxicityPercent.textContent = `${percent}%`;
                    toxicityError.style.display = 'block';
                    return { isToxic: true, maxScore };
                }
                
                toxicityError.style.display = 'none';
                return { isToxic: false, maxScore };
            } catch (error) {
                console.warn("Moderation error:", error);
                return { isToxic: false, maxScore: 0 };
            }
        }
        
        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            // Create animated particles
            createParticles();
            
            // Character counter
            secretInput.addEventListener('input', updateCharCount);
            updateCharCount();
            
            // Emotion selection
            emotionBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    emotionBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    selectedEmotionInput.value = btn.dataset.emotion;
                    emotionError.style.display = 'none';
                });
            });
            
            // Form submission
            secretForm.addEventListener('submit', handleSecretSubmit);
            
            // Action buttons
            counterBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    if (actionTaken) {
                        showNotification('You have already taken action on this secret', true);
                        return;
                    }
                    
                    const action = btn.dataset.action;
                    handleCounterAction(action);
                });
            });
            
            // Refresh revealed secrets
            refreshRevealedBtn.addEventListener('click', loadRevealedSecrets);
            
            // Restart button
            restartBtn.addEventListener('click', restartProcess);
            
            // Refresh stats button
            refreshStatsBtn.addEventListener('click', loadGlobalStats);
            
            // Load initial data
            loadGlobalStats();
            loadRevealedSecrets();
            
            // Initialize toxicity model
            initToxicityModel();
        });
        
        // Update character count
        function updateCharCount() {
            const length = secretInput.value.length;
            charCount.textContent = length;
            
            if (length < MIN_SECRET_LENGTH) {
                charCount.style.color = '#ff6b6b';
            } else {
                charCount.style.color = '#51cf66';
            }
        }
        
        // Handle secret submission
        async function handleSecretSubmit(e) {
            e.preventDefault();
            
            if (isSubmitting) return;
            isSubmitting = true;
            
            const secret = secretInput.value.trim();
            const emotion = selectedEmotionInput.value;
            
            // Validation
            if (secret.length < MIN_SECRET_LENGTH) {
                showNotification(`Your secret must be at least ${MIN_SECRET_LENGTH} characters`, true);
                isSubmitting = false;
                return;
            }
            
            // Check if emotion is selected
            if (!emotion) {
                emotionError.style.display = 'block';
                showNotification('Please select an emotion', true);
                isSubmitting = false;
                return;
            }
            
            // Check for code
            if (containsCode(secret)) {
                codeError.style.display = 'block';
                isSubmitting = false;
                return;
            } else {
                codeError.style.display = 'none';
            }
            
            // Check for toxic content
            const toxicityResult = await isToxic(secret);
            if (toxicityResult.isToxic) {
                isSubmitting = false;
                return;
            }
            
            // Show loading indicator
            submitText.textContent = "Sending...";
            submitSpinner.classList.remove('hidden');
            submitBtn.disabled = true;
            
            try {
                // Send secret to backend with emotion
                const formData = new FormData();
                formData.append('action', 'submitSecret');
                formData.append('secret', secret);
                formData.append('emotion', emotion);
                
                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.status === 'success') {
                    // Display received secret
                    currentSecret = data.data;
                    displaySecret(currentSecret);
                    
                    // Reset form
                    secretInput.value = '';
                    updateCharCount();
                    emotionBtns.forEach(b => b.classList.remove('active'));
                    selectedEmotionInput.value = '';
                    
                    // Reset action state
                    actionTaken = false;
                    
                    // Hide form and show received secret
                    shareCard.classList.add('hidden');
                    receivedCard.classList.remove('hidden');
                    
                    // Hide restart section
                    restartSection.classList.add('hidden');
                    
                    showNotification('Your secret has been shared successfully!');
                    
                    // Refresh stats after submission
                    loadGlobalStats();
                } else {
                    throw new Error(data.message || 'Error submitting secret');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification(error.message, true);
            } finally {
                // Reset button
                submitText.textContent = "Share My Secret";
                submitSpinner.classList.add('hidden');
                submitBtn.disabled = false;
                isSubmitting = false;
            }
        }
        
        // Display a secret - FIXED EMOTION DISPLAY ISSUE
        function displaySecret(secretData) {
            secretDisplay.innerHTML = `
                <div style="text-align: left; width: 100%;">
                    <div style="font-size: 2.5rem; text-align: center; margin-bottom: 15px;">${secretData.exchangeEmotion || '😑'}</div>
                    <p class="secret-content">${secretData.exchangeSecret}</p>
                </div>
            `;
            
            // Store current secret ID
            currentSecretId.textContent = `ID: ${secretData.rowId}`;
            currentSecretId.dataset.rowId = secretData.rowId;
            
            // Enable action buttons for the new secret
            enableActionButtons();
        }
        
        // Handle secret actions
        async function handleCounterAction(action) {
            const rowId = currentSecretId.dataset.rowId;
            
            if (!rowId) {
                showNotification('No secret selected', true);
                return;
            }
            
            // Disable buttons during processing
            disableActionButtons();
            
            // Add action indicator
            const actionIndicator = document.createElement('div');
            actionIndicator.className = 'action-taken';
            actionIndicator.textContent = action === 'keep' ? 'Kept' : 
                                         action === 'forget' ? 'Forgotten' : 
                                         action === 'support' ? 'Supported' : 'Revealed';
            secretDisplay.appendChild(actionIndicator);
            
            try {
                // Send increment request
                const formData = new FormData();
                formData.append('action', 'increment');
                formData.append('rowId', rowId);
                formData.append('counterType', action);
                
                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.status === 'success') {
                    // If revealing, check threshold
                    if (action === 'reveal') {
                        showNotification('This secret has been revealed to the public!');
                        // Reload revealed secrets
                        loadRevealedSecrets();
                    }
                    
                    // Mark action as taken
                    actionTaken = true;
                    
                    // Show restart option
                    restartSection.classList.remove('hidden');
                    
                    // Refresh stats after action
                    loadGlobalStats();
                } else {
                    throw new Error(data.message || 'Error updating');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification(error.message, true);
                // Re-enable buttons on error
                enableActionButtons();
                actionIndicator.remove();
            }
        }
        
        // Restart the process
        function restartProcess() {
            // Reset UI
            shareCard.classList.remove('hidden');
            receivedCard.classList.add('hidden');
            
            // Reset received secret display
            secretDisplay.innerHTML = '<p>Submit a secret to receive a random secret in exchange</p>';
            currentSecretId.textContent = '';
            
            // Enable submit button for new secret
            submitBtn.disabled = false;
            
            // Reset state
            actionTaken = false;
            currentSecret = null;
        }
        
        // Disable action buttons
        function disableActionButtons() {
            counterBtns.forEach(btn => {
                btn.disabled = true;
            });
        }
        
        // Enable action buttons
        function enableActionButtons() {
            counterBtns.forEach(btn => {
                btn.disabled = false;
            });
        }
        
        // Load global statistics
        async function loadGlobalStats() {
            try {
                // Show loading indicator
                document.querySelectorAll('.stat-value').forEach(el => {
                    el.innerHTML = '<span class="loading"></span>';
                });
                
                const params = new URLSearchParams({ action: 'getStats' });
                const response = await fetch(`${API_URL}?${params}`);
                const data = await response.json();
                
                if (data.status === 'success') {
                    const stats = data.data;
                    
                    // Update main statistics
                    totalSecrets.textContent = stats.total || 0;
                    revealedSecrets.textContent = stats.revealed || 0;
                    emotion1.textContent = stats.byEmotion?.['😤'] || 0;
                    emotion2.textContent = stats.byEmotion?.['🤑'] || 0;
                    emotion3.textContent = stats.byEmotion?.['😒'] || 0;
                    emotion4.textContent = stats.byEmotion?.['😠'] || 0;
                    emotion5.textContent = stats.byEmotion?.['😏'] || 0;
                    emotion6.textContent = stats.byEmotion?.['😋'] || 0;
                    emotion7.textContent = stats.byEmotion?.['😑'] || 0;
                    
                    showNotification('Statistics refreshed successfully');
                } else {
                    throw new Error(data.message || 'Failed to load stats');
                }
            } catch (error) {
                console.error('Error loading statistics:', error);
                showNotification('Error refreshing statistics', true);
            }
        }
        
        // Load revealed secrets
        async function loadRevealedSecrets() {
            try {
                // Show loading indicator
                revealedSecretsContainer.innerHTML = '<p>Loading revealed secrets...</p>';
                
                const params = new URLSearchParams({ action: 'getRevealedSecrets' });
                const response = await fetch(`${API_URL}?${params}`);
                const data = await response.json();
                
                if (data.status === 'success') {
                    const secrets = data.data.secrets;
                    
                    if (secrets.length === 0) {
                        revealedSecretsContainer.innerHTML = '<p>No revealed secrets yet. Be the first to reveal one!</p>';
                        return;
                    }
                    
                    // Display secrets
                    revealedSecretsContainer.innerHTML = '';
                    secrets.forEach(secret => {
                        const secretCard = document.createElement('div');
                        secretCard.className = 'secret-card';
                        secretCard.innerHTML = `
                            <div class="secret-emotion">${secret.emotion}</div>
                            <div class="secret-content">${secret.secret}</div>
                            <div class="secret-stats">
                                <div class="secret-stat">
                                    <div class="secret-stat-value">${secret.keep}</div>
                                    <div class="secret-stat-label">Keep</div>
                                </div>
                                <div class="secret-stat">
                                    <div class="secret-stat-value">${secret.forget}</div>
                                    <div class="secret-stat-label">Forget</div>
                                </div>
                                <div class="secret-stat">
                                    <div class="secret-stat-value">${secret.support}</div>
                                    <div class="secret-stat-label">Support</div>
                                </div>
                                <div class="secret-stat">
                                    <div class="secret-stat-value">${secret.reveal}</div>
                                    <div class="secret-stat-label">Reveal</div>
                                </div>
                            </div>
                        `;
                        
                        revealedSecretsContainer.appendChild(secretCard);
                    });
                } else {
                    throw new Error(data.message || 'Failed to load secrets');
                }
            } catch (error) {
                console.error('Error loading revealed secrets:', error);
                revealedSecretsContainer.innerHTML = '<p>Error loading revealed secrets. Please try again.</p>';
            }
        }
        
        // Show notification
        function showNotification(message, isError = false) {
            notificationMessage.textContent = message;
            notification.className = 'notification';
            
            if (isError) {
                notification.classList.add('error');
                notification.querySelector('i').className = 'fas fa-exclamation-circle';
            } else {
                notification.querySelector('i').className = 'fas fa-check-circle';
            }
            
            notification.classList.add('show');
            
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }