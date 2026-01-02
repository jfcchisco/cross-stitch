/**
 * Pattern Loader Module
 * Handles loading, parsing, and managing cross-stitch patterns
 */

class PatternLoader {
    constructor() {
        this.currentPattern = null;
        this.originalPattern = null;
        this.changes = [];
        this.changeCounter = 0;
        this.availablePatterns = [
            'json/cubs.json',
            'json/liverpool.json',
            'json/japan.json',
            'json/northern.json',
            'json/cuphead.json',
            'json/dino.json',
            'json/amsterdam.json',
            'json/african.json',
            'json/messi.json'
        ];
        this.currentIndex = 0;
    }

    /**
     * Load a pattern from a JSON file
     * @param {string} patternPath - Path to the JSON file
     * @returns {Promise<Object>} Processed pattern data
     */
    async loadPattern(patternPath) {
        try {
            const response = await fetch(patternPath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const rawData = await response.json();
            return this.loadJSON(rawData);
        } catch (error) {
            console.error('Failed to load pattern:', error);
            throw new Error(`Pattern loading failed: ${error.message}`);
        }
    }

    /**
     * Load the next pattern in the available patterns list
     * @returns {Promise<Object>} Processed pattern data
     */
    async loadNextPattern() {
        this.currentIndex = (this.currentIndex + 1) % this.availablePatterns.length;
        return this.loadPattern(this.availablePatterns[this.currentIndex]);
    }

    /**
     * Load pattern from a File object (user uploaded file)
     * @param {File} file - The uploaded file
     * @returns {Promise<Object>} Processed pattern data
     */
    async loadFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    const processedData = this.loadJSON(data);
                    resolve(processedData);
                } catch (error) {
                    reject(new Error('Invalid pattern file format'));
                }
            };
            reader.onerror = () => reject(new Error('File reading failed'));
            reader.readAsText(file);
        });
    }

    /**
     * Process raw JSON data into usable pattern format
     * @param {Object} data - Raw JSON data
     * @returns {Object} Processed pattern data
     */
    loadJSON(data) {
        // Validate data structure
        if (!this.validatePattern(data)) {
            throw new Error('Invalid pattern data structure');
        }

        // Convert stitches to array format
        data = this.convertFileToStitches(data);

        // Store original and current state
        this.originalPattern = JSON.parse(JSON.stringify(data));
        this.currentPattern = data;

        // Reset changes
        this.changes = [];
        this.changeCounter = 0;

        return data;
    }

    /**
     * Convert compressed stitch string to array format
     * @param {Object} data - Pattern data with compressed stitches
     * @returns {Object} Pattern data with stitch array
     */
    convertFileToStitches(data) {
        const newStitches = [];
        const stitches = data.stitches.split(",");
        let lastID = 0;

        for (const stitch of stitches) {
            const [id, code] = stitch.split("-");
            const stitchId = parseInt(id);

            // Fill in missing stitches with empty
            while (lastID < stitchId) {
                const x = lastID % data.properties.width;
                const y = Math.floor(lastID / data.properties.width);
                newStitches.push({
                    "X": x,
                    "Y": y,
                    "dmcCode": code
                });
                lastID++;
            }

            // Add the actual stitch
            const x = stitchId % data.properties.width;
            const y = Math.floor(stitchId / data.properties.width);
            newStitches.push({
                "X": x,
                "Y": y,
                "dmcCode": code
            });
            lastID++;
        }

        // Fill remaining stitches if needed
        const totalStitches = data.properties.width * data.properties.height;
        while (lastID < totalStitches) {
            const x = lastID % data.properties.width;
            const y = Math.floor(lastID / data.properties.width);
            newStitches.push({
                "X": x,
                "Y": y,
                "dmcCode": "empty"
            });
            lastID++;
        }

        return {
            stitches: newStitches,
            properties: data.properties,
            colors: data.colors
        };
    }

    /**
     * Convert stitch array back to compressed string format
     * @param {Object} data - Pattern data with stitch array
     * @returns {Object} Pattern data with compressed stitches
     */
    convertStitchesToFile(data) {
        let newStitches = "";
        let currentCode = "";
        let startId = 0;

        for (let i = 0; i < data.stitches.length; i++) {
            const stitch = data.stitches[i];
            const code = stitch.dmcCode;

            if (code !== currentCode) {
                // Write previous group if exists
                if (currentCode) {
                    if (newStitches) newStitches += ",";
                    newStitches += `${i-1}-${currentCode}`;
                }
                currentCode = code;
                startId = i;
            }
        }

        // Write final group
        if (currentCode) {
            if (newStitches) newStitches += ",";
            newStitches += `${startId}-${currentCode}`;
        }

        return {
            stitches: newStitches,
            properties: data.properties,
            colors: data.colors
        };
    }

    /**
     * Record a change to the pattern
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} dmcCode - New DMC code
     * @param {string} originalCode - Original DMC code
     */
    recordChange(x, y, dmcCode, originalCode) {
        this.changes.push({
            X: x,
            Y: y,
            dmcCode: dmcCode,
            originalCode: originalCode,
            timestamp: new Date(),
            id: this.changeCounter++
        });
    }

    /**
     * Merge recorded changes into the current pattern
     * @returns {Object} Updated pattern with changes applied
     */
    mergeChanges() {
        if (!this.originalPattern) return null;

        const merged = JSON.parse(JSON.stringify(this.originalPattern));

        // Apply all changes
        for (const change of this.changes) {
            const stitchIndex = merged.stitches.findIndex(
                s => s.X === change.X && s.Y === change.Y
            );
            if (stitchIndex !== -1) {
                merged.stitches[stitchIndex].dmcCode = change.dmcCode;
            }
        }

        this.currentPattern = merged;
        return merged;
    }

    /**
     * Undo the last change
     * @returns {Object} Updated pattern after undo
     */
    undoLastChange() {
        if (this.changes.length > 0) {
            this.changes.pop();
            this.changeCounter--;
            return this.mergeChanges();
        }
        return this.currentPattern;
    }

    /**
     * Get the current pattern with all changes applied
     * @returns {Object} Current pattern state
     */
    getCurrentPattern() {
        return this.currentPattern || this.mergeChanges();
    }

    /**
     * Get pattern statistics
     * @returns {Object} Pattern information
     */
    getPatternInfo() {
        if (!this.currentPattern) return null;

        const { properties, stitches } = this.currentPattern;
        const totalStitches = stitches.length;
        const stitchedStitches = stitches.filter(s => s.dmcCode !== 'empty').length;
        const uniqueColors = new Set(stitches.map(s => s.dmcCode)).size;

        return {
            dimensions: `${properties.width}x${properties.height}`,
            totalStitches,
            stitchedStitches,
            uniqueColors,
            completionPercentage: ((stitchedStitches / totalStitches) * 100).toFixed(1),
            changesCount: this.changes.length
        };
    }

    /**
     * Validate pattern data structure
     * @param {Object} data - Pattern data to validate
     * @returns {boolean} True if valid
     */
    validatePattern(data) {
        return (
            data &&
            data.properties &&
            typeof data.properties.width === 'number' &&
            typeof data.properties.height === 'number' &&
            data.stitches &&
            Array.isArray(data.colors)
        );
    }

    /**
     * Export current pattern to JSON file
     * @returns {Object} Exportable pattern data
     */
    exportPattern() {
        if (!this.currentPattern) return null;

        const exportData = this.convertStitchesToFile(this.currentPattern);
        exportData.metadata = {
            exportedAt: new Date().toISOString(),
            changesApplied: this.changes.length,
            completion: this.getPatternInfo().completionPercentage
        };

        return exportData;
    }

    /**
     * Reset pattern to original state
     */
    resetPattern() {
        this.changes = [];
        this.changeCounter = 0;
        this.currentPattern = JSON.parse(JSON.stringify(this.originalPattern));
    }
}

// Export for use in other modules
export default PatternLoader;