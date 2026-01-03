class GridManager {
    constructor(tileContainer, patternLoader) {
        this.tileContainer = tileContainer;
        this.patternLoader = patternLoader;
        this.activeTool = null;
        this.highlightedColor = null;
        this.highlightedSymbol = null;
        this.changeCounter = 0;
        this.contrastFlag = false; // High contrast mode flag
        this.paintFlag = false; // Paint mode flag
        this.bucketFlag = false; // Bucket mode flag
        this.highFlag = false; // Highlight mode flag

    }

    // Tool activation methods
    activatePaint() {
        this.deactivateTools();
        // Toggle paint mode
        this.paintFlag = !this.paintFlag;

        if(this.paintFlag) {
            this.activateUIToolState('paintTool');
        }
        if(this.highFlag) {
            this.activateUIToolState('highTool');
        }
        this.bucketFlag = false;
    }

    activateBucket() {
        this.deactivateTools();
        // Toggle bucket mode
        this.bucketFlag = !this.bucketFlag;

        if(this.bucketFlag) {
            this.activateUIToolState('bucketTool');
        }
        if(this.highFlag) {
            this.activateUIToolState('highTool');
        }
        this.paintFlag = false;
    }

    activateHighlight() {
        this.deactivateTools();
        // Toggle highlight mode
        this.highFlag = !this.highFlag;
        if(this.highFlag) {
            this.activateUIToolState('highTool');
        }
        this.paintFlag = false;
        this.bucketFlag = false;
        this.refreshGridDisplay();
    }

    activateHighContrast() {
        this.toggleHighContrast();
    }

    deactivateTools() {
        this.activeTool = null;
        this.clearUIToolStates();
    }

    // Main interaction handler
    handleTileClick(x, y) {
        const tile = this.getTile(x, y);
        if (!tile) return;

        const tileCode = tile.getAttribute('data-tile-code');
        
        if (this.paintFlag) {
            if(this.highFlag && this.highlightedColor !== tileCode) {
                return; // Cannot paint non-highlighted colors
            }
            return this.handlePaint(tile);
        } 
        else if (this.bucketFlag) {
            if(this.highFlag && this.highlightedColor !== tileCode) {
                return; // Cannot bucket-fill non-highlighted colors
            }
            return this.handleBucketFill(tile);
        } 
        else if (this.highFlag) {
            return this.handleHighlight(tile);
        }

    }

    // ===== IMPLEMENTATION DETAILS =====

    handlePaint(tile) {
        const tileCode = tile.getAttribute('data-tile-code');
        
        // Record change for undo functionality
        this.changeCounter++;
        this.patternLoader.changeCounter = this.changeCounter;
        
        // Apply paint to single tile
        this.applyStitchToTile(tile, this.changeCounter);
        
        // Update color statistics
        this.updateColorStats(tileCode, 1);
        
        return 1; // Return number of tiles affected
    }

    handleBucketFill(tile) {
        const startX = Number(tile.getAttribute('data-tile-x'));
        const startY = Number(tile.getAttribute('data-tile-y'));
        const fillColor = tile.getAttribute('data-tile-code');
        
        // Get all connected tiles of the same color
        const tilesToFill = this.getConnectedTiles(startX, startY, fillColor);
        
        // Safety check for large fills
        if (tilesToFill.length > 100) {
            const confirmed = confirm(`${tilesToFill.length} stitches will be painted. Continue?`);
            if (!confirmed) return 0;
        }
        
        // Record change for undo functionality
        this.changeCounter++;
        this.patternLoader.changeCounter = this.changeCounter;
        
        // Apply paint to all connected tiles
        let tilesAffected = 0;
        tilesToFill.forEach(({x, y}) => {
            const connectedTile = this.getTile(x, y);
            if (connectedTile) {
                this.applyStitchToTile(connectedTile, this.changeCounter);
                tilesAffected++;
            }
        });
        
        // Update color statistics
        this.updateColorStats(fillColor, tilesAffected);
        
        return tilesAffected;
    }

    handleHighlight(tile) {
        const tileCode = tile.getAttribute('data-tile-code');
        const tileSymbol = this.getTileSymbol(tileCode);
        
        // Select the color 
        this.selectColor(tileCode, tileSymbol);
        
        return 0; // No tiles directly modified
    }

    // ===== HELPER METHODS =====

    applyStitchToTile(tile, changeCounter) {
        
        const origCode = tile.getAttribute('data-tile-code');
        
        // Update tile attributes
        tile.setAttribute('data-tile-code', 'stitched');
        tile.setAttribute('data-tile-orig-code', origCode);
        tile.setAttribute('data-tile-change', changeCounter);
        tile.setAttribute('data-tile-r', 0);
        tile.setAttribute('data-tile-g', 255);
        tile.setAttribute('data-tile-b', 0);
        
        // Update visual appearance
        tile.style.backgroundColor = "rgba(0, 255, 0, 1)"; // Green background
        tile.children[0].style.color = 'white';
        tile.children[0].innerText = '×'; // Stitched symbol
        
        // Record change in PatternLoader
        const x = Number(tile.getAttribute('data-tile-x'));
        const y = Number(tile.getAttribute('data-tile-y'));
        this.patternLoader.recordChange(x, y, 'stitched', origCode);
    }

    getConnectedTiles(startX, startY, targetColor) {
        // Prevent filling stitched or empty areas
        if (targetColor === 'stitched' || targetColor === '0') {
            return [];
        }
        
        const foundTiles = [];
        const tilesToCheck = [{x: startX, y: startY}];
        const visited = new Set();
        
        while (tilesToCheck.length > 0) {
            const current = tilesToCheck.pop();
            const key = `${current.x},${current.y}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            const tile = this.getTile(current.x, current.y);
            if (!tile) continue;
            
            const tileColor = tile.getAttribute('data-tile-code');
            
            if (tileColor === targetColor) {
                foundTiles.push(current);
                
                // Check 4-directional neighbors
                const neighbors = [
                    {x: current.x, y: current.y - 1}, // North
                    {x: current.x, y: current.y + 1}, // South
                    {x: current.x - 1, y: current.y}, // West
                    {x: current.x + 1, y: current.y}  // East
                ];
                
                neighbors.forEach(neighbor => {
                    const neighborKey = `${neighbor.x},${neighbor.y}`;
                    if (!visited.has(neighborKey)) {
                        tilesToCheck.push(neighbor);
                    }
                });
            }
        }
        
        return foundTiles;
    }

    selectColor(colorCode, symbol) {
        // Update global highlight state
        this.highlightedColor = colorCode;
        this.highlightedSymbol = symbol;
        
        this.updateColorSelectorUI(colorCode, symbol);
            
            // Refresh grid to show highlighting
        this.refreshGridDisplay();

    }

    updateColorStats(origCode, count) {
        // Update the GridManager's colorArray
        this.updateColorAfterPaint(origCode, count);
    }

    // ===== UTILITY METHODS =====

    getTile(x, y) {
        return document.querySelector(`[data-tile-x="${x}"][data-tile-y="${y}"]`);
    }

    getTileSymbol(colorCode) {
        const currentPattern = this.patternLoader.getCurrentPattern();
        const colorObj = currentPattern.colors.find(c => c.dmcCode === colorCode);
        return colorObj ? colorObj.symbol : '?';
    }

    activateUIToolState(activeToolId) {
        // Activate specific tool
        const toolElement = document.getElementById(activeToolId);
        if (toolElement) {
            toolElement.classList.add('activeTool');
        }
    }

    clearUIToolStates() {
        document.querySelectorAll('.toolback').forEach(el => {
            el.classList.remove('activeTool');
        });
    }

    updateColorSelectorUI(colorCode, symbol) {
        // Clear previous selection
        document.querySelectorAll('.colorback').forEach(el => {
            el.classList.remove('activeColor');
        });
        
        // Find and highlight the selected color
        document.querySelectorAll('.colorback').forEach(el => {
            const colorSymbol = el.querySelector('[data-color-id]');
            if (colorSymbol && colorSymbol.innerText === symbol) {
                el.classList.add('activeColor');
            }
        });
    }

    refreshGridDisplay() {
        // Trigger a full grid visual refresh
        this.updateTileColors();
    }

    updateTileColors() {
        // Iterate through all tiles and update their visual appearance
        for (let i = 2; i < this.tileContainer.children.length; i++) {
            const row = this.tileContainer.children[i];
            for (let j = 1; j < row.children.length; j++) {
                const tile = row.children[j];
                this.updateSingleTileColor(tile);
            }
        }
    }

    updateSingleTileColor(tile) {
        const code = tile.getAttribute('data-tile-code');
        const R = parseInt(tile.getAttribute('data-tile-r')) || 0;
        const G = parseInt(tile.getAttribute('data-tile-g')) || 0;
        const B = parseInt(tile.getAttribute('data-tile-b')) || 0;
        let alpha = 1;
        let spanColor = 'black';
        let color = 'white';
        
        // Check for high contrast mode
        if (this.contrastFlag) {
            if (code === "stitched") {
                spanColor = this.getContrastColor(R, G, B);
                color = `rgba(${R}, ${G}, ${B}, 1)`;
            } else {
                if (this.highFlag) {
                    if (this.highlightedColor === code) {
                        spanColor = 'white';
                        color = 'black';
                    } else {
                        alpha = 0.25;
                        spanColor = 'silver';
                    }
                }
            }
        } else {
            spanColor = this.getContrastColor(R, G, B);
            
            if (this.highFlag && this.highlightedColor !== code) {
                alpha = 0.25;
                spanColor = this.getContrastColor(R, G, B) === 'black' ? 'silver' : 'white';
            }
            
            if (code === "stitched") {
                spanColor = this.getContrastColor(R, G, B);
                color = `rgba(${R}, ${G}, ${B}, 1)`;
                alpha = 1;
            }

            color = `rgba(${R}, ${G}, ${B}, ${alpha})`;
        }
        
        // Apply the calculated colors
        tile.children[0].style.color = spanColor;
        tile.style.backgroundColor = color;
    }

    toggleHighContrast() {
        this.contrastFlag = !this.contrastFlag;
        this.updateTileColors();
        return this.contrastFlag;
    }

    // ===== COLOR MANAGEMENT METHODS =====

    initializeColorArray(pattern) {
        // Clear color array for fresh start
        this.colorArray = [];

        pattern.stitches.forEach(stitch => {
            this.colorArray = this.checkAndAddColor(this.colorArray, stitch);
        });

        // Sort by count (most used first)
        this.colorArray.sort((a, b) => b.count - a.count);

        // Add stitched color if not present
        const stitchedExists = this.colorArray.some(color => color.code === 'stitched');
        if (!stitchedExists) {
            this.colorArray.push({
                "code": 'stitched',
                "name": 'STITCHED',
                "R": 0,
                "G": 255,
                "B": 0,
                "symbol": "×",
                "count": 0
            });
        }

        return this.colorArray;
    }

    checkAndAddColor(colors, stitch) {
        let found = false;

        for (let i = 0; i < colors.length; i++) {
            if (stitch.dmcCode === colors[i].code) {
                found = true;
                colors[i].count += 1;
                break;
            }
        }

        if (!found) {
            // Use the existing getDMCValuesFromCode function from script.js
            const colorData = this.getDMCValuesFromCode(stitch.dmcCode);
            colors.push({
                "code": stitch.dmcCode,
                "name": colorData.dmcName,
                "R": colorData.R,
                "G": colorData.G,
                "B": colorData.B,
                "symbol": colorData.symbol,
                "count": 1
            });
        }

        return colors;
    }

    getDMCValuesFromCode(code) {
        const currentPattern = this.patternLoader.getCurrentPattern();
        const colorObj = currentPattern.colors.find(obj => obj.dmcCode === code);
        return colorObj || {
            dmcName: "Unknown",
            R: 128, G: 128, B: 128,
            symbol: "?"
        };
    }

    updateColorAfterPaint(origCode, total) {
        // Decrease count of original color
        for (let i = 0; i < this.colorArray.length; i++) {
            if (this.colorArray[i].code === origCode) {
                this.colorArray[i].count -= Number(total);
                break;
            }
        }

        // Increase count of stitched color
        for (let i = 0; i < this.colorArray.length; i++) {
            if (this.colorArray[i].code === 'stitched') {
                this.colorArray[i].count += Number(total);
                break;
            }
        }
/*
        // Add stitched color if not present
        if (!found) {
            this.colorArray.push({
                "code": 'stitched',
                "name": 'STITCHED',
                "R": 0,
                "G": 255,
                "B": 0,
                "symbol": "×",
                "count": total
            });
        }
*/
        return this.colorArray;
    }

    getColorArray() {
        return this.colorArray;
    }

    getStitchedCount() {
        const stitchedColor = this.colorArray.find(color => color.code === "stitched");
        return stitchedColor ? stitchedColor.count : 0;
    }

    getContrastColor(r, g, b) {
        // Calculate luminance for contrast
        const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
        return luminance > 186 ? 'black' : 'white';
    }

    getHighlightedStitches() {
        // Return a collection of objects representing highlighted stitches
        const highlightedStitches = [];
        for (let i = 2; i < this.tileContainer.children.length; i++) {
            const row = this.tileContainer.children[i];
            for (let j = 1; j < row.children.length; j++) {
                const tile = row.children[j];
                const code = tile.getAttribute('data-tile-code');
                if (this.highlightedColor === code) {
                    highlightedStitches.push({
                        X: Number(tile.getAttribute('data-tile-x')),
                        Y: Number(tile.getAttribute('data-tile-y')),
                        code: code,
                        cluster: 0 // Initialize cluster to 0
                    });
                }
            }
        }        
        return highlightedStitches;
    }
}

export default GridManager;