/**
 * UI Manager Module
 * Manages user interface interactions and updates.
 * Handles all modal functionalities (Floss Usage, Preview, SGV Path)
 */

class UIManager {
    constructor() {
        // Initialization code if needed
        this.gridManager = null;
        this.patternLoader = null;
        this.colorTemplate = document.querySelector("[data-color-template]");
        this.colorContainer = document.querySelector("[data-color-container]");
    }

    getGridManager(gridManager) {
        this.gridManager = gridManager;
    }

    getPatternLoader(patternLoader) {
        this.patternLoader = patternLoader;
    }

    updateFootnote(text) {
        const footnoteElement = document.getElementsByClassName('footnote')[0];
        const footLeft = footnoteElement.querySelector('.footLeft');
        const footRight = footnoteElement.querySelector('.footRight');
        footLeft.innerText = text;
        footRight.innerText = "Stitched: " + this.gridManager.getStitchedCount();
    }

    fillFlossUsage() {
        let colorContainer = this.colorContainer;
        //clear all elements of the modal
        let modalList = document.getElementById("modalList");

        //Clear table
        while(modalList.lastElementChild) {
            modalList.removeChild(modalList.lastElementChild);
        }

        // Get color array from GridManager
        const colorArray = this.gridManager.getColorArray();
        //Sort for table 
        colorArray.sort(function(a, b) {
            if(a.count < b.count) return 1;
            if(a.count > b.count) return -1;
            return 0;
        });

        //Count already stitched
        let stitched = 0;
        let toStitch = 0;
        colorArray.forEach(obj => {
            if(obj.code == "stitched") {
                stitched = obj.count;
            }
            else if(obj.code != "empty") {
                toStitch += obj.count;
            }
        })

        toStitch += stitched;
        let percentage = ((stitched * 100)/ toStitch).toFixed(2);

        //Sort for table 
        colorArray.sort(function(a, b) {
            if(a.count < b.count) return 1;
            if(a.count > b.count) return -1;
            return 0;
        });

        // Fill color selectors
        this.refreshColorSelectors(colorContainer, colorArray);

        //Fill properties
        let par = document.getElementById("properties");
        const currentPattern = this.patternLoader.getCurrentPattern();
        let hS = currentPattern.properties.height;
        let wS = currentPattern.properties.width;
        // Aida 14 is 5.4 stitches per cm (0.185 mm per stitch)
        let hCM = (hS * 0.185).toFixed(1);
        let wCM = (wS * 0.185).toFixed(1);
        par.innerHTML = hS + "h x " + wS + "w (" + hCM + "cm x " + wCM + "cm). " + stitched + "/" + toStitch + " stitched (" + percentage + "%)";

        //Fill floss count
        let flossCountPar = document.getElementById("flossCount");
        flossCountPar.innerHTML = colorArray.length + " colors";

        //Fill table
        
        //let table = document.getElementById("modalTable");
        let table = document.createElement("table");
        const headRow = document.createElement('tr');

        let heads = ["Color", "Symbol", "Code", "Name", "Count"];
        for (let i in heads) {
            const headCell = document.createElement('th');
            headCell.textContent = heads[i];
            headRow.appendChild(headCell);
        }

        table.appendChild(headRow);

        let newRow = document.createElement('tr');
        let newCell = document.createElement('td');

        colorArray.map(color =>  {
            if(color.code != "empty") {
                newRow = document.createElement('tr');

                newCell = document.createElement('td');
                //newCell.textContent = color.R + "," + color.G + "," + color.B;
                let backColor = "background-color: rgb(" + color.R + "," + color.G + "," + color.B + ")";
                newCell.setAttribute('style', backColor);
                newRow.appendChild(newCell);

                newCell = document.createElement('td');
                newCell.textContent = color.symbol;
                newCell.setAttribute('style', 'text-align: center');
                newRow.appendChild(newCell);

                newCell = document.createElement('td');
                newCell.textContent = color.code;
                newCell.setAttribute('style', 'text-align: right');
                newRow.appendChild(newCell);

                newCell = document.createElement('td');
                newCell.textContent = color.name;
                newRow.appendChild(newCell);

                newCell = document.createElement('td');
                newCell.textContent = color.count;
                newCell.setAttribute('style', 'text-align: right');
                newRow.appendChild(newCell);
                table.appendChild(newRow);
            }
        })
        
        if (this.gridManager.highFlag) {
            this.gridManager.selectColor(this.gridManager.highlightedColor, this.gridManager.highlightedSymbol);
        }

        modalList.appendChild(table);
    }

    flossUsageClose() {
        let modal = document.getElementById("myModal");
        modal.style.display = "none";
    }

    flossUsageOpen() {
        this.fillFlossUsage();
        let modal = document.getElementById("myModal");
        modal.style.display = "block";
    }

    refreshColorSelectors(colorContainer, colorArray) {
        // Clear color selectors
        while(colorContainer.lastElementChild) {
            colorContainer.removeChild(colorContainer.lastElementChild);
        }

        colorArray.map(color =>  {
            // Fill color selectors
            if(color.code!="empty" && color.count > 0) {
                const colorDiv = this.colorTemplate.content.cloneNode(true).children[0];
                const colorBack = colorDiv.querySelector("[data-color-back]");
                const colorFront = colorDiv.querySelector("[data-color]");
                const colorId = colorDiv.querySelector("[data-color-id]");

                colorId.textContent = color.symbol;
                colorId.style.color = (((color.R * 0.299)+(color.G * 0.587)+(color.B * 0.114)) > 186) ? 'black' : 'white'; // contrast threshold
                
                const backColor = "background-color: rgb(" + color.R + "," + color.G + "," + color.B + ")";
                colorFront.setAttribute('style', backColor)
                const colorTitle = color.code + " - " + color.name;
                colorFront.setAttribute('title', colorTitle);
                const colorClick = `selectColor(\"${color.code}\", \"${color.symbol}\")`;
                colorFront.setAttribute('onclick', colorClick);

                if(colorBack != null) {
                    colorBack.classList.add('holyS');
                }
                this.colorContainer.append(colorDiv);
            }
        })
    }

}

export default UIManager;