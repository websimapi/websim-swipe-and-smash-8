export default class Board {
    constructor(size, candyTypes, onMatchCallback) {
        this.size = size;
        this.candyTypes = candyTypes;
        this.onMatch = onMatchCallback;
        this.grid = [];
        this.boardElement = document.getElementById('game-board');
        this.candySize = this.boardElement.clientWidth / size;
        this.setupBoard();
    }

    setupBoard() {
        this.boardElement.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;
        this.boardElement.style.gridTemplateRows = `repeat(${this.size}, 1fr)`;
        this.boardElement.parentElement.style.width = this.boardElement.style.width;
        this.boardElement.parentElement.style.height = this.boardElement.style.height;
        
        // Use clientWidth which reflects the actual rendered size on screen
        const boardWidth = this.boardElement.clientWidth;
        this.candySize = boardWidth / this.size;
    }

    initialize() {
        for (let row = 0; row < this.size; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.size; col++) {
                this.grid[row][col] = this.createCandy(row, col, true);
            }
        }
        // Ensure no matches on start
        while(this.findAllMatches().length > 0) {
            this.processMatches(true);
        }
    }

    createCandy(row, col, isInitializing = false) {
        const type = this.candyTypes[Math.floor(Math.random() * this.candyTypes.length)];
        const candy = document.createElement('div');
        candy.classList.add('candy');
        candy.dataset.row = row;
        candy.dataset.col = col;
        candy.dataset.type = type;
        candy.style.backgroundImage = `url(${type})`;
        candy.style.width = `${this.candySize}px`;
        candy.style.height = `${this.candySize}px`;
        
        if (isInitializing) {
            candy.style.top = `${row * this.candySize}px`;
        } else {
            // Start above the board for falling animation
            candy.style.top = `${-this.candySize}px`;
        }
        
        candy.style.left = `${col * this.candySize}px`;
        this.boardElement.appendChild(candy);

        // Animate falling into place
        if(!isInitializing) {
            setTimeout(() => {
                candy.style.top = `${row * this.candySize}px`;
            }, 10);
        }
        return candy;
    }

    async swapCandies(candy1, candy2) {
        const r1 = parseInt(candy1.dataset.row);
        const c1 = parseInt(candy1.dataset.col);
        const r2 = parseInt(candy2.dataset.row);
        const c2 = parseInt(candy2.dataset.col);

        // Swap in grid
        this.grid[r1][c1] = candy2;
        this.grid[r2][c2] = candy1;

        // Swap dataset attributes
        [candy1.dataset.row, candy2.dataset.row] = [candy2.dataset.row, candy1.dataset.row];
        [candy1.dataset.col, candy2.dataset.col] = [candy2.dataset.col, candy1.dataset.col];
        
        // Swap positions visually
        [candy1.style.top, candy2.style.top] = [candy2.style.top, candy1.style.top];
        [candy1.style.left, candy2.style.left] = [candy2.style.left, candy1.style.left];

        return new Promise(resolve => setTimeout(resolve, 300));
    }

    isValid(row, col) {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }

    findAllMatches() {
        const matches = new Set();
        // Horizontal matches
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size - 2; c++) {
                if (this.grid[r][c] && this.grid[r][c+1] && this.grid[r][c+2] &&
                    this.grid[r][c].dataset.type === this.grid[r][c+1].dataset.type &&
                    this.grid[r][c+1].dataset.type === this.grid[r][c+2].dataset.type) {
                    matches.add(this.grid[r][c]);
                    matches.add(this.grid[r][c+1]);
                    matches.add(this.grid[r][c+2]);
                }
            }
        }
        // Vertical matches
        for (let c = 0; c < this.size; c++) {
            for (let r = 0; r < this.size - 2; r++) {
                if (this.grid[r][c] && this.grid[r+1][c] && this.grid[r+2][c] &&
                    this.grid[r][c].dataset.type === this.grid[r+1][c].dataset.type &&
                    this.grid[r+1][c].dataset.type === this.grid[r+2][c].dataset.type) {
                    matches.add(this.grid[r][c]);
                    matches.add(this.grid[r+1][c]);
                    matches.add(this.grid[r+2][c]);
                }
            }
        }
        return Array.from(matches);
    }
    
    findMatchGroups() {
        const groups = [];
        const visited = new Set();

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const candy = this.grid[r][c];
                if (!candy || visited.has(candy)) continue;

                // Horizontal check
                const horizontalMatch = [candy];
                for (let i = c + 1; i < this.size; i++) {
                    const nextCandy = this.grid[r][i];
                    if (nextCandy && nextCandy.dataset.type === candy.dataset.type) {
                        horizontalMatch.push(nextCandy);
                    } else {
                        break;
                    }
                }
                if (horizontalMatch.length >= 3) {
                    groups.push({ candies: horizontalMatch, type: 'horizontal' });
                    horizontalMatch.forEach(c => visited.add(c));
                }

                // Vertical check
                const verticalMatch = [candy];
                for (let i = r + 1; i < this.size; i++) {
                    const nextCandy = this.grid[i][c];
                    if (nextCandy && nextCandy.dataset.type === candy.dataset.type) {
                        verticalMatch.push(nextCandy);
                    } else {
                        break;
                    }
                }
                if (verticalMatch.length >= 3) {
                    groups.push({ candies: verticalMatch, type: 'vertical' });
                    verticalMatch.forEach(c => visited.add(c));
                }
            }
        }
        return groups;
    }

    async processMatches(isInitializing = false, swappedCandies = null) {
        if (isInitializing) { // Fallback for initialization
            const initialMatches = this.findAllMatches();
            if (initialMatches.length === 0) return;
            initialMatches.forEach(c => this.grid[c.dataset.row][c.dataset.col] = null);
            initialMatches.forEach(c => c.remove());
            await this.dropCandies();
            await this.fillBoard();
            return this.processMatches(true);
        }

        const matchGroups = this.findMatchGroups();
        if (matchGroups.length === 0) return false;

        const candiesToRemove = new Set();
        let createdPowerup = false;

        for (const group of matchGroups) {
            // Check for powerup activation
            for (const candy of group.candies) {
                if (candy.dataset.powerup) {
                    this.activatePowerup(candy, candiesToRemove);
                }
            }
        }

        // Sort groups by size to prioritize larger matches for power-ups
        matchGroups.sort((a, b) => b.candies.length - a.candies.length);

        for (const group of matchGroups) {
            const isSwappedCandyInMatch = swappedCandies && group.candies.some(c => swappedCandies.includes(c));
            const canCreatePowerup = isSwappedCandyInMatch || !swappedCandies;
            const candyToConvertToPowerup = swappedCandies ? (group.candies.find(c => swappedCandies.includes(c)) || group.candies[0]) : group.candies[0];

            // Power-up Creation
            if (group.candies.length >= 5 && !createdPowerup && canCreatePowerup) {
                createdPowerup = true;
                candyToConvertToPowerup.dataset.powerup = 'rainbow';
                candyToConvertToPowerup.style.backgroundImage = 'url(candy_chocolate.png)';
                candyToConvertToPowerup.classList.add('powerup-rainbow');
                // Don't change dataset.type, we need it if it's swapped with another powerup
                group.candies.forEach(c => { if (c !== candyToConvertToPowerup) candiesToRemove.add(c); });
                continue;
            }
            
            if (group.candies.length === 4 && !createdPowerup && canCreatePowerup) {
                createdPowerup = true;
                const powerupType = group.type === 'horizontal' ? 'col' : 'row';
                candyToConvertToPowerup.dataset.powerup = powerupType;
                candyToConvertToPowerup.classList.add(`powerup-${powerupType}`);
                group.candies.forEach(c => { if (c !== candyToConvertToPowerup) candiesToRemove.add(c); });
                continue;
            }
            
            group.candies.forEach(c => candiesToRemove.add(c));
        }

        if (candiesToRemove.size > 0) {
            if(!isInitializing) this.onMatch(Array.from(candiesToRemove), !!swappedCandies);
    
            for (const candy of candiesToRemove) {
                candy.classList.add('matched');
                const r = parseInt(candy.dataset.row);
                const c = parseInt(candy.dataset.col);
                if (this.grid[r] && this.grid[r][c] === candy) {
                    this.grid[r][c] = null;
                }
            }
    
            await new Promise(resolve => setTimeout(resolve, 300));
            
            candiesToRemove.forEach(candy => candy.remove());
            
            await this.dropCandies();
            await this.fillBoard();
            
            await this.processMatches(isInitializing, null);
        }

        return true;
    }

    activatePowerup(candy, candiesToRemove) {
        const r = parseInt(candy.dataset.row);
        const c = parseInt(candy.dataset.col);
        candiesToRemove.add(candy);

        if (candy.dataset.powerup === 'row') {
            for (let i = 0; i < this.size; i++) {
                if (this.grid[r][i]) candiesToRemove.add(this.grid[r][i]);
            }
        } else if (candy.dataset.powerup === 'col') {
            for (let i = 0; i < this.size; i++) {
                if (this.grid[i][c]) candiesToRemove.add(this.grid[i][c]);
            }
        }
        delete candy.dataset.powerup;
        candy.classList.remove('powerup-row', 'powerup-col');
    }

    async smashCandies(candiesToSmash) {
        if (candiesToSmash.length === 0) return;
        
        // This is a smash, not a player-made match, so isPlayerMove is false.
        this.onMatch(candiesToSmash, false);

        for (const candy of candiesToSmash) {
            candy.classList.add('matched'); // Reuse matched animation
            const r = parseInt(candy.dataset.row);
            const c = parseInt(candy.dataset.col);
            if (this.grid[r] && this.grid[r][c] === candy) {
                this.grid[r][c] = null;
            }
        }

        await new Promise(resolve => setTimeout(resolve, 300));
        
        candiesToSmash.forEach(candy => candy.remove());
        
        await this.dropCandies();
        await this.fillBoard();
        
        await this.processMatches(false, null);
    }
    
    async activateRainbowPowerup(rainbowCandy, otherCandy) {
        const targetType = otherCandy.dataset.type;
        const candiesToRemove = new Set();
        candiesToRemove.add(rainbowCandy);

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const candy = this.grid[r][c];
                if (candy && candy.dataset.type === targetType) {
                    candiesToRemove.add(candy);
                }
            }
        }

        if (candiesToRemove.size > 0) {
            this.onMatch(Array.from(candiesToRemove), true);

            for (const candy of candiesToRemove) {
                candy.classList.add('matched');
                const r = parseInt(candy.dataset.row);
                const c = parseInt(candy.dataset.col);
                if (this.grid[r] && this.grid[r][c] === candy) {
                    this.grid[r][c] = null;
                }
            }

            await new Promise(resolve => setTimeout(resolve, 300));
            
            candiesToRemove.forEach(candy => candy.remove());
            
            await this.dropCandies();
            await this.fillBoard();
            
            await this.processMatches(false, null);
        }
    }

    async dropCandies() {
        for (let c = 0; c < this.size; c++) {
            let emptyRow = this.size - 1;
            for (let r = this.size - 1; r >= 0; r--) {
                if (this.grid[r][c]) {
                    if (r !== emptyRow) {
                        this.grid[emptyRow][c] = this.grid[r][c];
                        this.grid[r][c] = null;
                        this.grid[emptyRow][c].dataset.row = emptyRow;
                        this.grid[emptyRow][c].style.top = `${emptyRow * this.candySize}px`;
                    }
                    emptyRow--;
                }
            }
        }
        return new Promise(resolve => setTimeout(resolve, 300));
    }

    async fillBoard() {
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (!this.grid[r][c]) {
                    this.grid[r][c] = this.createCandy(r, c);
                }
            }
        }
        return new Promise(resolve => setTimeout(resolve, 300));
    }
}