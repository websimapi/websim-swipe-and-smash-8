import Board from './board.js';
import InputHandler from './input.js';
import { playSound } from './audio.js';
import confetti from 'confetti';

const config = {
    boardSize: 10,
    candyTypes: [
        'candy_red.png',
        'candy_blue.png',
        'candy_green.png',
        'candy_yellow.png',
        'candy_purple.png',
        'candy_orange.png'
    ],
    pointsPerCandy: 10,
    timerDuration: 15,
    initialSmashValue: 0
};

const POSITIVE_FEEDBACK_SOUNDS = [
    'nice_swipe.mp3',
    'tasty_trio.mp3',
    'good_move.mp3'
];

class Game {
    constructor() {
        this.board = new Board(config.boardSize, config.candyTypes, this.onMatch.bind(this));
        this.score = 0;
        this.scoreElement = document.getElementById('score');
        this.isProcessing = false;

        this.comboCount = 0;
        this.comboDisplay = document.getElementById('combo-display');
        this.comboTimeout = null;

        this.smashValue = config.initialSmashValue;
        this.smashProgress = 0; // 0, 0.5
        this.smashValueElement = document.getElementById('smash-value');
        this.smashFluidElement = document.getElementById('smash-fluid');
        this.timerValue = config.timerDuration;
        this.timerElement = document.getElementById('timer');
        this.timerInterval = null;
        this.isTimerPaused = false;
        
        this.inputHandler = new InputHandler(this.board.boardElement, this.onSwap.bind(this), this.onSmash.bind(this));
        
        this.updateScore(0);
        this.updateSmashUI();
        this.startTimer();
        this.board.initialize();
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.isTimerPaused) return;

            this.timerValue--;
            this.timerElement.textContent = this.timerValue;
            if (this.timerValue <= 0) {
                if (this.smashValue > 0) {
                    this.smashValue--;
                    this.updateSmashUI();
                }
                this.smashProgress = 0; // Reset progress if timer runs out
                this.updateSmashUI();
                this.resetTimer();
            }
        }, 1000);
    }

    resetTimer() {
        this.timerValue = config.timerDuration;
        this.timerElement.textContent = this.timerValue;
    }

    pauseTimer() {
        this.isTimerPaused = true;
    }

    resumeTimer() {
        this.isTimerPaused = false;
    }

    updateComboUI() {
        if (this.comboCount < 2) return;

        this.comboDisplay.textContent = `Combo x${this.comboCount}`;
        this.comboDisplay.classList.add('visible');

        clearTimeout(this.comboTimeout);
        this.comboTimeout = setTimeout(() => {
            this.comboDisplay.classList.remove('visible');
        }, 1500);
    }

    updateSmashUI() {
        this.smashValueElement.textContent = this.smashValue;
        const fillPercentage = this.smashProgress * 100; // 0 or 50
        this.smashFluidElement.style.height = `${fillPercentage}%`;
    }

    updateScore(points) {
        this.score += points;
        this.scoreElement.textContent = this.score;
    }

    onMatch(matchedCandies, isPlayerMove) {
        playSound('match.mp3');
        this.updateScore(matchedCandies.length * config.pointsPerCandy);
        
        this.comboCount++;
        this.updateComboUI();

        // Audio feedback
        if (this.comboCount === 6) {
            playSound('combo_6.mp3');
        } else if (this.comboCount === 7) {
            playSound('combo_7.mp3');
        } else if (this.comboCount > 2) {
             playSound('crunch_combo.mp3');
        } else if (isPlayerMove) {
            const randomSound = POSITIVE_FEEDBACK_SOUNDS[Math.floor(Math.random() * POSITIVE_FEEDBACK_SOUNDS.length)];
            playSound(randomSound);
        }
        
        if (isPlayerMove) {
            this.smashProgress += 0.5;
            this.updateSmashUI();

            if (this.smashProgress >= 1) {
                // Animate fill, update value, then animate empty
                this.smashFluidElement.style.transition = 'height 0.3s ease-in';
                this.smashFluidElement.style.height = '100%';

                setTimeout(() => {
                    if (this.smashValue < 12) {
                        this.smashValue++;
                    }
                    this.smashValueElement.textContent = this.smashValue;
                    this.smashProgress = 0;
                    
                    setTimeout(() => {
                        this.smashFluidElement.style.transition = 'height 0.5s ease-out';
                        this.updateSmashUI();
                    }, 200); // Wait a moment before draining
                }, 300); // Duration of the fill animation
            }
            
            this.resetTimer();
        }

        if (matchedCandies.length >= 5) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }

    async onSmash(candy) {
        if (this.isProcessing || this.smashValue <= 0) return;
        this.isProcessing = true;
        this.pauseTimer();

        const r = parseInt(candy.dataset.row);
        const c = parseInt(candy.dataset.col);
        const candiesToSmash = new Set();
        let smashCost = 0;

        if (this.smashValue >= 7 && this.smashValue <= 12) {
            // 3x3 area centered on the candy
            for (let i = r - 1; i <= r + 1; i++) {
                for (let j = c - 1; j <= c + 1; j++) {
                    if (this.board.isValid(i, j) && this.board.grid[i][j]) {
                        candiesToSmash.add(this.board.grid[i][j]);
                    }
                }
            }
            smashCost = 3;
        } else if (this.smashValue >= 4 && this.smashValue <= 6) {
            // 2x2 area starting from the candy (top-left)
            for (let i = r; i <= r + 1; i++) {
                for (let j = c; j <= c + 1; j++) {
                    if (this.board.isValid(i, j) && this.board.grid[i][j]) {
                        candiesToSmash.add(this.board.grid[i][j]);
                    }
                }
            }
            smashCost = 2;
        } else if (this.smashValue >= 1 && this.smashValue <= 3) {
            candiesToSmash.add(candy);
            smashCost = 1;
        }

        if (this.smashValue < smashCost || smashCost === 0) {
            this.isProcessing = false;
            this.resumeTimer();
            return;
        }
        
        this.smashValue -= smashCost;
        this.updateSmashUI();
        playSound('smash.mp3');
        
        const smashSounds = ['smash_success.mp3', 'sweet_mash.mp3'];
        const randomSmashSound = smashSounds[Math.floor(Math.random() * smashSounds.length)];
        setTimeout(() => playSound(randomSmashSound), 200); // Play after the main smash sound
        
        // Pass a flag to indicate this is a smash action
        await this.board.smashCandies(Array.from(candiesToSmash));

        this.isProcessing = false;
        this.resumeTimer();
    }

    async onSwap(candy1, candy2) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.pauseTimer();
        this.comboCount = 0; // Reset combo on new player move
        
        const candy1Powerup = candy1.dataset.powerup;
        const candy2Powerup = candy2.dataset.powerup;

        if (candy1Powerup === 'rainbow' || candy2Powerup === 'rainbow') {
            const rainbowCandy = candy1Powerup === 'rainbow' ? candy1 : candy2;
            const otherCandy = candy1Powerup === 'rainbow' ? candy2 : candy1;
            
            // We don't need to swap visually, just activate
            await this.board.activateRainbowPowerup(rainbowCandy, otherCandy);
            this.isProcessing = false;
            this.resumeTimer();
            return;
        }
        
        await this.board.swapCandies(candy1, candy2);
        const isValidSwap = await this.board.processMatches(false, [candy1, candy2]);

        if (!isValidSwap) {
            // If no matches, swap back
            await this.board.swapCandies(candy1, candy2);
        }
        
        this.isProcessing = false;
        this.resumeTimer();
    }
}

window.addEventListener('load', () => {
    new Game();
});