/**
 * UI Manager Module
 * Manages user interface interactions and updates.
 */

class UIManager {
    constructor() {
        // Initialization code if needed
        this.gridManager = null;
    }

    getGridManager(gridManager) {
        this.gridManager = gridManager;
    }

    updateFootnote(text) {
        const footnoteElement = document.getElementsByClassName('footnote')[0];
        const footLeft = footnoteElement.querySelector('.footLeft');
        const footRight = footnoteElement.querySelector('.footRight');
        footLeft.innerText = text;
        footRight.innerText = "Stitched: " + this.gridManager.getStitchedCount();
    }

}

export default UIManager;