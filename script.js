class CarGame {
    constructor() {
        this.carsData = [];
        this.currentCars = [];
        this.score = 0;
        this.highScores = [0, 0, 0];
        this.usedCars = [];
        this.hideSide = 'right';
        this.gameActive = false;
        this.lastReplacedSide = 'right';
        this.audioContext = null;
    }

    // DOM Element getters for better readability
    get elements() {
        return {
            errorMsg: document.getElementById('error-msg'),
            startScreen: document.getElementById('start-screen'),
            gameScreen: document.getElementById('game-screen'),
            gameOverScreen: document.getElementById('game-over-screen'),
            highScoresModal: document.getElementById('highscores-modal'),
            drumroll: document.getElementById('drumroll-container'),
            gameContainer: document.querySelector('.game-container'),
            vsDivider: document.getElementById('vs-divider'),
            scoreEl: document.getElementById('score'),
            highScoreEl: document.getElementById('high-score'),
            resultAnimation: document.getElementById('result-animation'),
            resultIcon: document.getElementById('result-icon'),
            resultText: document.getElementById('result-text')
        };
    }

    // Initialize audio context
    initAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    // Main game flow
    async startGame() {
        this.clearError();

        try {
            await this.loadCarsData();
            this.resetGameState();
            this.loadHighScores();
            this.updateHighScoreDisplay();
            this.hideDrumroll();
            this.switchToScreen('game');
            this.resetGameContainer();
            this.loadNewRound(true);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async loadCarsData() {
        const response = await fetch('cars.json');
        if (!response.ok) throw new Error('Could not load cars.json');

        const data = await response.json();
        if (!data.cars || data.cars.length < 2) {
            throw new Error('Need at least 2 cars in cars.json');
        }

        this.carsData = data.cars;
    }

    resetGameState() {
        this.usedCars = [];
        this.score = 0;
        this.hideSide = 'right';
        this.lastReplacedSide = 'right';
        this.gameActive = true;
    }

    // Screen management
    switchToScreen(screenName) {
        const screens = ['start', 'game', 'game-over'];
        screens.forEach(screen => {
            document.getElementById(`${screen}-screen`).style.display = 'none';
        });

        if (screenName !== 'highscores') {
            document.getElementById(`${screenName}-screen`).style.display =
                screenName === 'game' ? 'flex' : 'block';
        }
    }

    hideDrumroll() {
        if (this.elements.drumroll) {
            this.elements.drumroll.style.display = 'none';
        }
    }

    resetGameContainer() {
        if (this.elements.gameContainer) {
            this.elements.gameContainer.classList.remove('revealing');
        }
    }

    // High scores management
    showHighScores() {
        this.updateHighScoreDisplay();
        this.elements.highScoresModal.style.display = 'flex';
    }

    hideHighScores() {
        this.elements.highScoresModal.style.display = 'none';
    }

    loadHighScores() {
        const saved = localStorage.getItem('carGameHighScores');
        if (saved) {
            this.highScores = JSON.parse(saved);
        }
        this.updateHighScoreDisplay();
    }

    updateHighScoreDisplay() {
        // Game screen high score
        if (this.elements.highScoreEl) {
            this.elements.highScoreEl.textContent = this.highScores[0] || 0;
        }

        // Modal scores
        for (let i = 0; i < 3; i++) {
            const el = document.getElementById(`score-${i + 1}`);
            if (el) el.textContent = this.highScores[i] || 0;
        }
    }

    resetAllScores() {
        if (confirm('Are you sure you want to reset all high scores?')) {
            this.highScores = [0, 0, 0];
            localStorage.setItem('carGameHighScores', JSON.stringify(this.highScores));
            this.updateHighScoreDisplay();
        }
    }

    updateScores() {
        if (this.score > this.highScores[0]) {
            this.highScores.unshift(this.score);
            this.highScores = this.highScores.slice(0, 3);
            localStorage.setItem('carGameHighScores', JSON.stringify(this.highScores));
        }
    }

    // Round management
    loadNewRound(isFirstRound = false) {
        if (!this.gameActive) return;

        this.hideDrumroll();
        this.resetGameContainer();

        if (isFirstRound) {
            this.initializeFirstRound();
        }

        this.updateCarDisplay('left', this.currentCars[0], true);
        this.updateCarDisplay('right', this.currentCars[1], true);

        this.applyHideLogic();
        this.resetOverlays();

        if (this.elements.scoreEl) {
            this.elements.scoreEl.textContent = this.score;
        }

        this.resetVSdivider();
        this.enableOverlays();
    }

    initializeFirstRound() {
        if (this.usedCars.length >= this.carsData.length) {
            this.usedCars = [];
        }

        const availableCars = this.carsData.filter(car => !this.usedCars.includes(car));
        const shuffled = [...availableCars].sort(() => Math.random() - 0.5);

        this.currentCars = [shuffled[0], shuffled[1]];
        this.usedCars.push(...this.currentCars);
        this.lastReplacedSide = 'right';
    }

    updateCarDisplay(side, car, resetState = false) {
        const carData = {
            image: { id: `${side}-car-image`, attr: 'src', fallback: this.getFallbackImage() },
            name: { id: `${side}-car-name`, text: car.name || 'Unknown Car' },
            price: { id: `${side}-car-price`, text: this.formatPrice(car.price), class: 'price-value' },
            km: { id: `${side}-car-km`, text: car.km ? `${car.km.toLocaleString()} km` : 'N/A' },
            year: { id: `${side}-car-year`, text: car.year || car.god || 'N/A' },
            link: { id: `${side}-car-link`, href: car.link || '#' },
            priceDisplay: { id: `${side}-price-display`, class: 'hidden' }
        };

        // Update each element
        Object.entries(carData).forEach(([key, config]) => {
            const element = document.getElementById(config.id);
            if (!element) return;

            switch (key) {
                case 'image':
                    element.src = car.image || '';
                    element.alt = car.name || 'Car';
                    element.onerror = () => { element.src = config.fallback; };
                    break;
                case 'link':
                    element.href = config.href;
                    element.style.display = (car.link && car.link !== '#') ? 'flex' : 'none';
                    break;
                case 'price':
                    element.classList.remove('revealing', 'counting', 'correct', 'wrong');
                    element.textContent = config.text;
                    break;
                default:
                    if (config.text) element.textContent = config.text;
            }
        });

        if (resetState) {
            this.resetOverlays();
            const priceDisplay = document.getElementById(`${side}-price-display`);
            if (priceDisplay) priceDisplay.classList.remove('hidden');
        }
    }

    getFallbackImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjEwMCIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RmFsbGJhY2sgQ2FyIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
    }

    formatPrice(price) {
        return price ? `${price.toLocaleString()}€` : "0€";
    }

    applyHideLogic() {
        ['left', 'right'].forEach(side => {
            const priceEl = document.getElementById(`${side}-price-display`);
            const qmEl = document.getElementById(`${side}-question-mark`);

            if (priceEl && qmEl) {
                const shouldHide = side === this.hideSide;
                priceEl.classList.toggle('hidden', shouldHide);
                qmEl.classList.toggle('hidden', !shouldHide);
            }
        });
    }

    resetOverlays() {
        document.querySelectorAll('.choice-overlay').forEach(overlay => {
            overlay.classList.remove('revealing-correct', 'revealing-wrong', 'disabled');
            overlay.style.pointerEvents = 'auto';
        });

        if (this.elements.gameContainer) {
            this.elements.gameContainer.classList.remove('revealing');
        }
    }

    resetVSdivider() {
        if (this.elements.vsDivider) {
            this.elements.vsDivider.classList.remove('suspense');
        }
    }

    enableOverlays() {
        document.querySelectorAll('.choice-overlay').forEach(overlay => {
            overlay.style.pointerEvents = 'auto';
            overlay.classList.remove('disabled');
        });
    }

    async makeGuess(chosenSide) {
        if (!this.gameActive) return;

        this.initAudio();
        this.disableOverlays();

        const result = this.checkGuess(chosenSide);
        this.showResultAnimation(result.isCorrect);

        if (result.isCorrect) {
            this.playCorrectSound();
        } else {
            this.playWrongSound();
        }

        await this.delay(600);

        this.hideResultAnimation();

        if (this.elements.gameContainer) {
            this.elements.gameContainer.classList.remove('revealing');
        }

        this.revealPrices();

        await this.delay(300);

        if (result.isCorrect) {
            await this.handleCorrectGuess(chosenSide);
        } else {
            await this.handleWrongGuess(chosenSide, result.higherSide);
        }
    }
    disableOverlays() {
        document.querySelectorAll('.choice-overlay').forEach(o => {
            o.classList.add('disabled');
            o.style.pointerEvents = 'none';
        });
    }

    showResultAnimation(isCorrect) {
        if (this.elements.drumroll) {
            this.elements.drumroll.style.display = 'none';
        }
        if (this.elements.resultAnimation && this.elements.resultIcon && this.elements.resultText) {
            this.elements.resultIcon.innerHTML = '';
            this.elements.resultIcon.className = 'result-icon';

            if (isCorrect) {
                // Green checkmark
                this.elements.resultIcon.classList.add('correct');
                this.elements.resultText.textContent = 'CORRECT!';

                const checkmarkSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                checkmarkSVG.setAttribute('class', 'checkmark');
                checkmarkSVG.setAttribute('viewBox', '0 0 52 52');

                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute('d', 'M14.1 27.2l7.1 7.2 16.7-16.8');
                path.setAttribute('stroke-linecap', 'round');
                path.setAttribute('stroke-linejoin', 'round');

                checkmarkSVG.appendChild(path);
                this.elements.resultIcon.appendChild(checkmarkSVG);

            } else {
                // Red X
                this.elements.resultIcon.classList.add('wrong');
                this.elements.resultText.textContent = 'WRONG!';

                const xmarkSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                xmarkSVG.setAttribute('class', 'x-mark');
                xmarkSVG.setAttribute('viewBox', '0 0 52 52');

                const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line1.setAttribute('x1', '16');
                line1.setAttribute('y1', '16');
                line1.setAttribute('x2', '36');
                line1.setAttribute('y2', '36');
                line1.setAttribute('stroke-linecap', 'round');

                const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line2.setAttribute('x1', '36');
                line2.setAttribute('y1', '16');
                line2.setAttribute('x2', '16');
                line2.setAttribute('y2', '36');
                line2.setAttribute('stroke-linecap', 'round');

                xmarkSVG.appendChild(line1);
                xmarkSVG.appendChild(line2);
                this.elements.resultIcon.appendChild(xmarkSVG);
            }

            this.elements.resultAnimation.style.display = 'flex';
        }
        if (this.elements.gameContainer) {
            this.elements.gameContainer.classList.add('revealing');
        }
    }

    hideResultAnimation() {
        if (this.elements.resultAnimation) {
            this.elements.resultAnimation.style.display = 'none';
        }
    }

    revealPrices() {
        ['left', 'right'].forEach(side => {
            const priceDisplay = document.getElementById(`${side}-price-display`);
            const qm = document.getElementById(`${side}-question-mark`);

            if (priceDisplay) priceDisplay.classList.remove('hidden');
            if (qm) qm.classList.add('hidden');
        });

        document.querySelectorAll('.price-value').forEach(price => {
            price.classList.add('revealing');
        });
    }

    checkGuess(chosenSide) {
        const leftPrice = this.currentCars[0].price || 0;
        const rightPrice = this.currentCars[1].price || 0;

        let higherSide;
        if (leftPrice > rightPrice) higherSide = 'left';
        else if (rightPrice > leftPrice) higherSide = 'right';
        else higherSide = chosenSide; // Tie goes to player

        return {
            isCorrect: chosenSide === higherSide,
            higherSide: higherSide
        };
    }

    async handleCorrectGuess(chosenSide) {
        this.animateCorrectGuess(chosenSide);
        this.incrementScore();
        await this.delay(600);
        this.prepareNextRound(chosenSide);
    }

    async handleWrongGuess(chosenSide, higherSide) {
        this.animateWrongGuess(chosenSide, higherSide);
        await this.delay(1000);
        this.gameOver();
    }

    animateCorrectGuess(chosenSide) {
        const chosenOverlay = document.querySelector(`#${chosenSide}-card .choice-overlay`);
        const chosenPrice = document.getElementById(`${chosenSide}-car-price`);

        if (chosenOverlay) chosenOverlay.classList.add('revealing-correct');
        if (chosenPrice) {
            chosenPrice.classList.add('counting', 'correct');
        }
    }

    animateWrongGuess(chosenSide, higherSide) {
        const chosenOverlay = document.querySelector(`#${chosenSide}-card .choice-overlay`);
        const chosenPrice = document.getElementById(`${chosenSide}-car-price`);
        const correctPrice = document.getElementById(`${higherSide}-car-price`);

        if (chosenOverlay) chosenOverlay.classList.add('revealing-wrong');
        if (chosenPrice) chosenPrice.classList.add('counting', 'wrong');
        if (correctPrice) correctPrice.classList.add('correct');
    }

    incrementScore() {
        this.score++;

        if (this.elements.scoreEl) {
            this.elements.scoreEl.textContent = this.score;
            this.elements.scoreEl.style.animation = 'none';
            setTimeout(() => {
                this.elements.scoreEl.style.animation = 'scorePop 0.5s ease-out';
            }, 10);
        }

        if (this.score > this.highScores[0]) {
            this.updateScores();
            this.updateHighScoreDisplay();
        }
    }

    prepareNextRound(lastChosenSide) {
        // Alternate hidden side
        this.hideSide = this.hideSide === 'right' ? 'left' : 'right';

        // Alternate replaced side
        this.lastReplacedSide = this.lastReplacedSide === 'right' ? 'left' : 'right';

        this.replaceCar(this.lastReplacedSide);
        this.applyHideLogic();
        this.resetOverlays();
    }

    replaceCar(side) {
        const replaceIndex = side === 'left' ? 0 : 1;

        let availableCars = this.carsData.filter(car => !this.usedCars.includes(car));

        if (availableCars.length === 0) {
            this.usedCars = [...this.currentCars];
            availableCars = this.carsData.filter(car => !this.usedCars.includes(car));
        }

        if (availableCars.length > 0) {
            const newCar = availableCars[Math.floor(Math.random() * availableCars.length)];
            this.currentCars[replaceIndex] = newCar;
            this.usedCars.push(newCar);
            this.updateCarDisplay(side, newCar);
        }
    }

    gameOver() {
        this.gameActive = false;
        this.updateScores();
        this.switchToScreen('game-over');
        this.showFinalScore();
    }

    showFinalScore() {
        const finalScore = document.getElementById('final-score');
        const bestScore = document.getElementById('best-score-display');
        const message = document.getElementById('high-score-msg');

        if (finalScore) finalScore.textContent = this.score;
        if (bestScore) bestScore.textContent = this.highScores[0];

        if (this.score === this.highScores[0] && this.score > 0) {
            if (message) {
                message.textContent = '🎉 New High Score! 🎉';
                message.style.display = 'block';
            }
        } else if (message) {
            message.style.display = 'none';
        }
    }

    // Utility methods
    clearError() {
        if (this.elements.errorMsg) {
            this.elements.errorMsg.textContent = '';
        }
    }

    showError(message) {
        if (this.elements.errorMsg) {
            this.elements.errorMsg.textContent = 'Error: ' + message;
        }
        console.error(message);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Sound methods
    playSuspenseSound() {
        this.playSound({
            startFreq: 200,
            endFreq: 800,
            duration: 0.3,
            type: 'ramp'
        });
    }

    playCorrectSound() {
        this.playSound({
            frequencies: [523.25, 659.25, 783.99],
            duration: 0.3
        });
    }

    playWrongSound() {
        this.playSound({
            frequencies: [392, 349.23, 293.66],
            duration: 0.3
        });
    }

    playSound(options) {
        try {
            if (!this.audioContext) return;

            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            if (options.frequencies) {
                options.frequencies.forEach((freq, i) => {
                    osc.frequency.setValueAtTime(freq, this.audioContext.currentTime + (i * 0.1));
                });
            } else if (options.startFreq && options.endFreq) {
                osc.frequency.setValueAtTime(options.startFreq, this.audioContext.currentTime);
                osc.frequency.exponentialRampToValueAtTime(options.endFreq,
                    this.audioContext.currentTime + options.duration);
            }

            gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01,
                this.audioContext.currentTime + options.duration);

            osc.start();
            osc.stop(this.audioContext.currentTime + options.duration);
        } catch (e) {
            console.log("Audio not supported:", e);
        }
    }
}

// Share functions
function shareOnTwitter() {
    const score = game.score;
    const highScore = game.highScores[0];
    const gameUrl = window.location.href;

    const text = `🚗 I scored ${score} points in njuškalo Higher/Lower! Can you beat my score? ${gameUrl}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;

    window.open(twitterUrl, '_blank', 'width=600,height=400');
}

function shareOnFacebook() {
    const gameUrl = window.location.href;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(gameUrl)}`;

    window.open(facebookUrl, '_blank', 'width=600,height=400');
}

async function copyScore() {
    const score = game.score;
    const gameUrl = window.location.href;

    const text = `🚗 I scored ${score} points in njuškalo Higher/Lower! Can you beat my score? Play here: ${gameUrl}`;

    try {
        await navigator.clipboard.writeText(text);

        const copyBtn = document.querySelector('.share-btn.copy');
        if (copyBtn) {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<svg class="share-icon" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
            copyBtn.classList.add('copied');

            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.classList.remove('copied');
            }, 2000);
        }
    } catch (err) {
        console.error('Failed to copy: ', err);
        showToast('Failed to copy. Please try again.', true);
    }
}

// Create global game instance
const game = new CarGame();

// Public functions that need to be accessible from HTML
function startGame() { game.startGame(); }
function showHighScores() { game.showHighScores(); }
function hideHighScores() { game.hideHighScores(); }
function resetAllScores() { game.resetAllScores(); }
function makeGuess(side) { game.makeGuess(side); }
function resetGame() {

    game.resetGameState();
    game.loadHighScores();
    game.updateHighScoreDisplay();
    game.loadNewRound(true);
    game.switchToScreen('game');
}
function goToHome() {
    window.location.reload();
    game.hideHighScores();
}

// Keyboard support
document.addEventListener('keydown', (e) => {
    if (!game.gameActive) return;

    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        game.makeGuess('left');
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        game.makeGuess('right');
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    game.loadHighScores();
    game.updateHighScoreDisplay();

    // Initialize audio on first user interaction
    document.addEventListener('click', function initAudioOnInteraction() {
        game.initAudio();
        document.removeEventListener('click', initAudioOnInteraction);
    }, { once: true });
});