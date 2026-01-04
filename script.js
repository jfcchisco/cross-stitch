import PatternLoader from "./load-pattern.js";
import GridManager from "./grid-manager.js";
import UIManager from "./ui-manager.js";

const tileContainer = document.getElementsByClassName("tile-container")[0];
const colorTemplate = document.querySelector("[data-color-template]");
const tileTemplate = document.querySelector("[data-tile-template]");
const rowTemplate = document.querySelector("[data-row-template]");
const colorContainer = document.querySelector("[data-color-container]");

const patternLoader = new PatternLoader();
const uiManager = new UIManager();
const gridManager = new GridManager(tileContainer, patternLoader, uiManager);
uiManager.getGridManager(gridManager);

let MIN_HEIGHT = 10;
let MAX_HEIGHT = 50;
let DEFAULT_HEIGHT = 20;
let CLUSTER_SEQUENCE = []
let THRESHOLD = 10;

let box = 50; // Stitch width and height
let cols = 0;
let rows = 0;

let zoomResetFlag = false;
let highCode = 0;

let jsonFiles = ['json/cubs.json', 'json/liverpool.json', 'json/japan.json', 'json/northern.json', 'json/cuphead.json', 'json/dino.json', 'json/amsterdam.json', 'json/african.json', 'json/messi.json'];
let currIndex = 0;
let jsonFile = jsonFiles[currIndex];
// Removed: let jsonObject = {}; // Now handled by PatternLoader
// Removed: let originalObject = {}; // Now handled by PatternLoader
// Removed: let changes = []; // Now handled by PatternLoader
// Removed: let colorArray = []; // Now handled by GridManager
var downloadURL = null;

window.onload = async function() {
    try {
        const pattern = await patternLoader.loadPattern(jsonFiles[currIndex]);
        loadJSON(pattern);
    } catch (error) {
        console.error('Failed to load initial pattern:', error);
    }
}

async function loadNextFile() {
    try {
        const pattern = await patternLoader.loadNextPattern();
        loadJSON(pattern);
    } catch (error) {
        console.error('Failed to load next pattern:', error);
    }
}

function addChangesToJsonObject() {
    let tiles = document.querySelectorAll('[data-tile-change]');
    const currentPattern = patternLoader.getCurrentPattern();

    currentPattern.stitches.forEach(stitch => {
        for(let i=0; i<tiles.length; i++) {
            let X = tiles[i].getAttribute('data-tile-x');
            let Y = tiles[i].getAttribute('data-tile-y');
            if(stitch.X == X && stitch.Y == Y) {
                // Record the change in PatternLoader
                patternLoader.recordChange(X, Y, 'stitched', stitch.dmcCode);
                // After this the change will be undoable
                tiles[i].removeAttribute('data-tile-change');
                tiles[i].removeAttribute('data-tile-orig-code');
                let tileTitle = "STITCHED - X: " + X + " - Y: " + Y;
                tiles[i].setAttribute('title', tileTitle);
                stitch.dmcCode = 'stitched';
            }
        }
    })
    return;
}

function fillFlossUsage() {
    //clear all elements of the modal
    let modalList = document.getElementById("modalList");

    //Clear table
    while(modalList.lastElementChild) {
        modalList.removeChild(modalList.lastElementChild);
    }

    // Clear color selectors
    while(colorContainer.lastElementChild) {
        colorContainer.removeChild(colorContainer.lastElementChild);
    }
    
    // Get color array from GridManager
    const colorArray = gridManager.getColorArray();
    
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

    //Sort for table 
    colorArray.sort(function(a, b) {
        if(a.count < b.count) return 1;
        if(a.count > b.count) return -1;
        return 0;
    });

    //Fill properties
    let par = document.getElementById("properties");
    const currentPattern = patternLoader.getCurrentPattern();
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
        
        


        // Fill color selectors
        if(color.code!="empty" && color.count > 0) {
            const colorDiv = colorTemplate.content.cloneNode(true).children[0];
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

	    // collection[i].classList.remove("activeColor")
	    // if(highFlag && color.code == highCode) {
	    //     colorBack.classList.add('activeColor')
	    // }

            if(colorBack != null) {
                colorBack.classList.add('holyS');
            }
            colorContainer.append(colorDiv);
        }
    })
    
    if (gridManager.highFlag) {
        selectColor(gridManager.highlightedColor, gridManager.highlightedSymbol);
    }

    modalList.appendChild(table);
}

function flossUsageClose() {
    let modal = document.getElementById("myModal");
    modal.style.display = "none";
}

function flossUsageOpen() {
    fillFlossUsage();
    let modal = document.getElementById("myModal");
    modal.style.display = "block";
}

/* function getDMCValuesFromCode(code) {
    let color2return = {};
    const currentPattern = patternLoader.getCurrentPattern();
    currentPattern.colors.forEach(obj => {
        if(obj.dmcCode === code) {
            color2return = obj;
        }
    })
    return color2return;
} */

function loadJSON(data) {
    // Data is already processed by PatternLoader
    const processedData = data;

    // Initialize color array in GridManager
    gridManager.initializeColorArray(processedData);
    fillFlossUsage();

    //Create all divs for tiles
    //One additional because the array starts at zero
    //Another additional
    cols = processedData.stitches[processedData.stitches.length-1].X+1
    rows = processedData.stitches[processedData.stitches.length-1].Y+1

    gridManager.initializeGrid(cols, rows);
/* 
    // Adding svg-container
    const svgContainer = document.createElement("div");
    svgContainer.setAttribute("class", "svg-container");
    const newSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgContainer.append(newSVG);
    tileContainer.append(svgContainer);
    
    const rulerRow = rowTemplate.content.cloneNode(true).children[0];
    
    //Adding vertical ruler div
    const rulerDiv = tileTemplate.content.cloneNode(true).children[0];
    //rulerDiv.setAttribute('style', "position: sticky; left: 0; background-color: rgb(241, 241, 241);");
    rulerDiv.classList.add("vertRulerDiv");
    rulerRow.append(rulerDiv);

    for (let i = 1; i <= cols; i++)  {
        const tileDiv = tileTemplate.content.cloneNode(true).children[0];
        //tileDiv.setAttribute('style', "background-color: rgb(241, 241, 241);");
        tileDiv.classList.add("horRulerRow");
        if(i%10 == 0) {
            tileDiv.children.item(0).innerText = i/10;
            tileDiv.children.item(0).setAttribute('style', "float: right;");
        }
        if(i%10 == 1 && i > 1) {
            tileDiv.children.item(0).innerText = 0;
            tileDiv.children.item(0).setAttribute('style', "float: left;");
        }
        rulerRow.append(tileDiv);
    }

    rulerRow.classList.add("horRulerRow");
    //rulerRow.setAttribute('style', "position: sticky; top: 0")
    tileContainer.append(rulerRow);

    for (let j = 1; j <= rows; j++) {
        const newRow = rowTemplate.content.cloneNode(true).children[0];

        //Adding vertical ruler div
        const rulerDiv = tileTemplate.content.cloneNode(true).children[0];
        rulerDiv.classList.add("vertRulerDiv");
        //rulerDiv.setAttribute('style', "position: sticky; left: 0; background-color: rgb(241, 241, 241);");
        if(j%10 == 0) {
            rulerDiv.children.item(0).innerText = j/10;
            
        }if(j%10 == 1 && j > 1) {
            rulerDiv.children.item(0).innerText = 0;
        }
        newRow.append(rulerDiv);

        for (let i = 1; i <= cols; i++)  {
            const tileDiv = tileTemplate.content.cloneNode(true).children[0];
            if(i%2==0) {
                tileDiv.setAttribute('style', "background-color: white");
            }
            else {
                tileDiv.setAttribute('style', "background-color: yellow");
            }
            newRow.append(tileDiv);
        }
        tileContainer.append(newRow)
    }
 */
    //updateColor(processedData.stitches);
    //gridManager.refreshGridDisplay();
    gridManager.updateTileAttributes(processedData.stitches);
    gridManager.refreshGridDisplay();
    gridManager.drawGridLines();

    var body = document.body;
    var height = body.offsetHeight - 130 - 25; // total minus the 2 toolbars and some margin
    tileContainer.style.height = height+"px";
    uiManager.updateFootnote("Loaded pattern"); 
}

async function openFile() {
    let input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if(file) {
            try {
                const pattern = await patternLoader.loadFromFile(file);
                loadJSON(pattern);
            } catch (error) {
                alert('Error loading file: ' + error.message);
            }
        }
    };
    input.click();
}

function preview(data) {
    let canvas = document.getElementById("canvas")
    let ctx = canvas.getContext('2d')

    let modal = document.getElementById("previewModal");

    let box = Math.max(1, (Math.min(Math.floor(document.body.offsetHeight/rows), Math.floor(document.body.offsetWidth/cols))));
    canvas.height = box * rows;
    canvas.width =  box * cols;

    let modalHeight = box * rows + 30;
    let modalWidth =  box * cols + 30;

    modal.style.height = modalHeight+"px";
    modal.style.width = modalWidth+"px";

    ctx.clearRect(0,0, canvas.width, canvas.height)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    
    for (let i = 0; i < data.length; i++) {
        let tileValues = data[i];
        //Adding offset due to ruler and svg-container
        let row = tileContainer.children.item(tileValues.Y + 2);
        let tile = row.children.item(tileValues.X + 1)

        let backColor = tile.style.backgroundColor;
        if(!backColor.match('rgba')) {
            ctx.fillStyle = backColor;
            ctx.fillRect(tileValues.X * box, tileValues.Y * box, tileValues.X * box + box, tileValues.Y * box + box);
        }
        else {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(tileValues.X * box, tileValues.Y * box, tileValues.X * box + box, tileValues.Y * box + box);
        }
    }

    drawPreviewGridLines(box, ctx);

    let createPathDiv = document.getElementsByClassName("pathButtons")[0];
    let inputFields = document.getElementsByClassName("inputFields")[0];
    inputFields.style.display = "none";
    createPathDiv.style.display = "none";
    if(gridManager.highFlag && gridManager.highlightedColor != 0) {
        createPathDiv.style.display = "grid";
        inputFields.style.display = "grid";
    }
}

function previewPath(type) {
    // This function should be called only when there is already a created canvas
    // with the highlighted color and highlight flag activated
    const thresholdInput = document.getElementById('pathInput');
    const threshold = thresholdInput ? Number(thresholdInput.value) : 10;
    
    let highStitches = gridManager.getHighlightedStitches(highCode);
    highStitches = assignClusters(highStitches);
    
    let clusterNumbers = [];
    highStitches.forEach(s => {
        if(!clusterNumbers.includes(s.cluster)) {
            clusterNumbers.push(s.cluster);
        }
    });

    let canvas = document.getElementById("canvas");
    let ctx = canvas.getContext('2d');

    //Repeated drawing of stitches
    let box = Math.max(1, (Math.min(Math.floor(document.body.offsetHeight/rows), Math.floor(document.body.offsetWidth/cols))));
    
    ctx.clearRect(0,0, canvas.width, canvas.height)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw one rectangle as test
    let s = highStitches[1];
    ctx.fillStyle = "#000000";
    ctx.fillRect(10,10,20,20);
    //ctx.fillRect(s.X*box, s.Y*box, s.X*box+box, s.Y*box+box);

    const tileCollection = document.getElementsByClassName("tile");
    //for (let i = 0; i < collection.length; i++) {
    //    collection[i].classList.remove("activeColor");
    //}

    for (let i = 0; i < tileCollection.length; i++) {
        let tileObj = tileCollection[i];
        let code = tileObj.getAttribute('data-tile-code');
        let x = Number(tileObj.getAttribute('data-tile-x'));
        let y = Number(tileObj.getAttribute('data-tile-y'));
        //Adding offset due to ruler
        //let row = tileContainer.children.item(tileValues.Y + 1);
        //let tile = row.children.item(tileValues.X + 1)

        //let backColor = tile.style.backgroundColor;
        if(code == gridManager.highlightedColor) {
            ctx.fillStyle = "#000000";;
            ctx.fillRect(x * box, y * box, x * box + box, y * box + box);
        }
        else {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(x * box, y * box, x * box + box, y * box + box);
        }
    }

    let clusterSequence = [];
    let nextCluster = 0;
    if(type == 0) {
        // Closest to top-left
        nextCluster = getClosestClusterToPoint(clusterNumbers, highStitches, 0, 0);
    }
    else if(type == 1) {
        // Closest to center
        nextCluster = getClosestClusterToPoint(clusterNumbers, highStitches, cols/2, rows/2);
    }
    else if(type == 2) {
        // Closest to bottom-right
        // let coordX = Number(prompt("X:", 0));
        // let coordY = Number(prompt("Y:", 0));
        let coordX = Number(document.getElementById("pathXInput").value);
        let coordY = Number(document.getElementById("pathYInput").value);
        if(coordX == null || !Number.isInteger(coordX) || coordX > cols || coordX < 0) {
            alert("Invalid X coordinate, using 0"); 
            coordX = 0;
        }
        if(coordY == null || !Number.isInteger(coordY) || coordY > rows || coordY < 0) {
            alert("Invalid Y coordinate, using 0");
            coordY = 0;
        }
        nextCluster = getClosestClusterToPoint(clusterNumbers, highStitches, coordX, coordY);
    }
    else if(type == 3) {
        nextCluster = clusterNumbers[Math.floor(Math.random() * clusterNumbers.length)];
    }
    
    let closestCluster = 0;
    while(clusterNumbers.length > 0) {
        let dist2Next = [nextCluster, 0, Infinity, [0,0], [0,0]];
        for (let i = 0; i < clusterNumbers.length; i++) {
            let cNum = clusterNumbers[i];
            let dist2Cluster = getDistBetweenClusters(nextCluster, cNum, highStitches);
            if(dist2Cluster[2] < dist2Next[2] && dist2Cluster[2] != 0) {
                dist2Next = dist2Cluster;
                closestCluster = cNum;
            }
        }

        if(dist2Next[2] <= threshold) {
            clusterSequence.push(dist2Next);
            if(clusterSequence.length == 1) {
                let index = clusterNumbers.indexOf(nextCluster);
                if (index > -1) {
                    clusterNumbers.splice(index, 1);
                }
            }
            nextCluster = closestCluster;
            //remove from clusterNumbers
            let index = clusterNumbers.indexOf(closestCluster);
            if (index > -1) {
                clusterNumbers.splice(index, 1);
            }
        }
        else {
            // Try a better path
            // Go through the clusterSequence and find the summed
            // distance to each pair
            let newMinSum = dist2Next[2];
            let betterOptionFlag = false;
            let newSeq0 = [];
            let newSeq1 = [];
            let betterOptionIndex = -1;
            for(let i = 0; i < clusterSequence.length; i++) {
                let dist0 = getDistBetweenClusters(clusterSequence[i][0], closestCluster, highStitches);
                let dist1 = getDistBetweenClusters(closestCluster, clusterSequence[i][1], highStitches);
                let sumDist = dist0[2] + dist1[2];
                if(sumDist < newMinSum) {
                    // Found a better option
                    newMinSum = sumDist;
                    betterOptionFlag = true;
                    newSeq0 = dist0;
                    newSeq1 = dist1;
                    betterOptionIndex = i;
                }
            }
            if(betterOptionFlag) {
                clusterSequence.splice(betterOptionIndex, 1, newSeq0, newSeq1);
                let index = clusterNumbers.indexOf(closestCluster);
                if (index > -1) {
                    clusterNumbers.splice(index, 1);
                }
            }
            else {
                clusterSequence.push(dist2Next);
                if(clusterSequence.length == 1) {
                    let index = clusterNumbers.indexOf(nextCluster);
                    if (index > -1) {
                        clusterNumbers.splice(index, 1);
                    }
                }
                nextCluster = closestCluster;
                //remove from clusterNumbers
                let index = clusterNumbers.indexOf(closestCluster);
                if (index > -1) {
                    clusterNumbers.splice(index, 1);
                }
            }
        }
    }
    // Draw circle on the initial point
    ctx.beginPath();
    ctx.arc(clusterSequence[0][3][0]*box + box/2, clusterSequence[0][3][1]*box + box/2, box, 0, 2 * Math.PI);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Draw circle on the final point
    let lastCluster = clusterSequence[clusterSequence.length - 1];
    ctx.beginPath();   
    ctx.arc(lastCluster[4][0]*box + box/2, lastCluster[4][1]*box + box/2, box, 0, 2 * Math.PI);
    ctx.strokeStyle = "orange";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Draw path lines
    let lineColor = "cyan";
    clusterSequence.forEach(cluster => {
        ctx.beginPath();
        ctx.moveTo(cluster[3][0]*box + box/2, cluster[3][1]*box + box/2);
        ctx.lineTo(cluster[4][0]*box + box/2, cluster[4][1]*box + box/2);
        if(lineColor == "cyan") {
            lineColor = "greenyellow";
        }
        else {
            lineColor = "cyan";
        }
        if(cluster[2] > threshold) {
            ctx.strokeStyle = "red";
        }
        else {
            ctx.strokeStyle = lineColor;
        }
        ctx.lineWidth = 2;
        ctx.stroke();
    })
    // Copy to global variable
    CLUSTER_SEQUENCE = clusterSequence;
    THRESHOLD = threshold;
    drawPreviewGridLines(box, ctx);

}

function assignClusters(stitchesList) {
    // Assign clusters to a list of highlighted stitches
    let clusterCounter = 0;
    for(let i=0; i < stitchesList.length; i++) {
        let s = stitchesList[i];
        if(s.cluster == 0) {
            clusterCounter += 1;
            let neighborList = gridManager.getConnectedTiles(s.X, s.Y, s.code);
            for(let j=0; j<neighborList.length; j++) {
                for(let k=0; k<stitchesList.length; k++) {
                    let s2 = stitchesList[k];
                    if(s2.X == neighborList[j].x && s2.Y == neighborList[j].y) {
                        stitchesList[k].cluster = clusterCounter;
                    }
                }
            }
        }
    }
    return stitchesList;
}

function getDistBetweenClusters(c1, c2, sList) {
    let retVal = [0, 0, 0, [0, 0], [0, 0]];
    let dist = Infinity;
    for(let s1 of sList) {
        if(s1.cluster == c1) {
            for(let s2 of sList) {
                if(s2.cluster == c2) {
                    let newDist = Math.sqrt((s1.X - s2.X) ** 2 + (s1.Y - s2.Y) ** 2);
                    if(newDist < dist) {
                        dist = newDist;
                        retVal = [c1, c2, dist, [s1.X, s1.Y], [s2.X, s2.Y] ];
                    }
                }
            }
        }
    }
    return retVal;
}

function getClosestClusterToPoint(clusterNumbers, sList, pointX, pointY) {
    let retCluster = -1;
    let dist = Infinity;
    for(let c of clusterNumbers) {
        for(let s of sList) {
            if(s.cluster == c) {
                let newDist = Math.sqrt((s.X - pointX) ** 2 + (s.Y - pointY) ** 2);
                if(newDist < dist) {
                    dist = newDist;
                    retCluster = c;
                }

            }
        }
    }
    return retCluster;
}

function drawSVG() {
    if(CLUSTER_SEQUENCE.length === 0) {
        return;
    }
    let tileWidth = document.getElementsByClassName("tile")[0].offsetWidth;
    let svgContainer = document.getElementsByClassName("svg-container")[0].children[0];
    // Delete all previous lines
    while (svgContainer.lastElementChild) { 
        svgContainer.removeChild(svgContainer.lastElementChild);
    }

    let svgWidth = tileWidth * (cols + 1);
    let svgHeight = tileWidth * (rows + 1);
    svgContainer.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
    svgContainer.setAttribute("width", svgWidth);
    svgContainer.setAttribute("height", svgHeight);
    /// Insert defs for arrowheads
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const marker1 = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker1.setAttribute("id", "arrow1");   
    marker1.setAttribute("markerWidth", "10");
    marker1.setAttribute("markerHeight", "10");
    marker1.setAttribute("refX", "3.5");
    marker1.setAttribute("refY", "2.5");
    marker1.setAttribute("orient", "auto");
    const arrowPath1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    arrowPath1.setAttribute("d", "M0,0 L0,5 L4,2.5 z");
    arrowPath1.setAttribute("fill", "dodgerblue");
    marker1.appendChild(arrowPath1);
    defs.appendChild(marker1);

    const marker2 = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker2.setAttribute("id", "arrow2");   
    marker2.setAttribute("markerWidth", "10");
    marker2.setAttribute("markerHeight", "10");
    marker2.setAttribute("refX", "3.5");
    marker2.setAttribute("refY", "2.5");
    marker2.setAttribute("orient", "auto");
    const arrowPath2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    arrowPath2.setAttribute("d", "M0,0 L0,5 L4,2.5 z");
    arrowPath2.setAttribute("fill", "orange");
    marker2.appendChild(arrowPath2);
    defs.appendChild(marker2);

    const marker3 = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker3.setAttribute("id", "arrow3");   
    marker3.setAttribute("markerWidth", "10");
    marker3.setAttribute("markerHeight", "10");
    marker3.setAttribute("refX", "3.5");
    marker3.setAttribute("refY", "2.5");
    marker3.setAttribute("orient", "auto");
    const arrowPath3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    arrowPath3.setAttribute("d", "M0,0 L0,5 L4,2.5 z");
    arrowPath3.setAttribute("fill", "red");
    marker3.appendChild(arrowPath3);
    defs.appendChild(marker3);
    
    const marker4 = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker4.setAttribute("id", "circle");
    marker4.setAttribute("markerWidth", "10");
    marker4.setAttribute("markerHeight", "10");
    marker4.setAttribute("refX", "5");
    marker4.setAttribute("refY", "5");
    marker4.setAttribute("orient", "auto");
    const circlePath = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circlePath.setAttribute("cx", "5");
    circlePath.setAttribute("cy", "5");
    circlePath.setAttribute("r", "5");
    circlePath.setAttribute("fill", "red");
    marker4.appendChild(circlePath);
    defs.appendChild(marker4);

    svgContainer.appendChild(defs);

    let lineColor = "dodgerblue";
    CLUSTER_SEQUENCE.forEach(cluster => {
        let newLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        
        newLine.setAttribute("x1", (cluster[3][0]*tileWidth + tileWidth + tileWidth/2).toString());
        newLine.setAttribute("y1", (cluster[3][1]*tileWidth + tileWidth + tileWidth/2).toString());
        newLine.setAttribute("x2", (cluster[4][0]*tileWidth + tileWidth + tileWidth/2).toString());
        newLine.setAttribute("y2", (cluster[4][1]*tileWidth + tileWidth + tileWidth/2).toString());
        newLine.setAttribute("stroke-width", "2");
        newLine.setAttribute("marker-end", "url(#arrowhead)");
        if(lineColor == "dodgerblue") {
            lineColor = "orange";
            newLine.setAttribute("marker-end", "url(#arrow2)");
        }
        else {
            lineColor = "dodgerblue";
            newLine.setAttribute("marker-end", "url(#arrow1)");
        }
        if(cluster[2] > THRESHOLD) {
            lineColor = "red";
            newLine.setAttribute("marker-end", "url(#arrow3)");
        }
        newLine.setAttribute("stroke", lineColor);
        svgContainer.append(newLine); 
    });
}

function drawPreviewGridLines(argBox, argCtx) {          
    argCtx.beginPath();
    for(let i=0; i<=rows; i++) {
        if(i%10 == 0 || i==rows) {
            argCtx.moveTo(0, i*argBox);
            argCtx.lineTo(cols*argBox, i*argBox);
        }
    }
    for(let j=0; j<=cols; j++) {
        if(j%10 == 0 || j==cols) {
            argCtx.moveTo(j*argBox, 0);
            argCtx.lineTo(j*argBox, rows*argBox);
        }
    }
    argCtx.strokeStyle = "gray";
    argCtx.lineWidth = 1;
    argCtx.stroke();
}

function previewClose() {
    let modal = document.getElementById("previewModal");
    modal.style.display = "none";
}

function previewOpen() {
    const currentPattern = patternLoader.getCurrentPattern();
    preview(currentPattern.stitches);
    let modal = document.getElementById("previewModal");
    modal.style.display = "block";
}

function save() {
    //mergeChanges();
    addChangesToJsonObject();
    fillFlossUsage();

    const exportData = patternLoader.exportPattern();
    var text2write = JSON.stringify(exportData);
    
    var element = document.createElement('a');

    // Date object
    const date = new Date();

    let currentDay= String(date.getDate()).padStart(2, '0');
    let currentMonth = String(date.getMonth()+1).padStart(2,"0");
    let currentYear = date.getFullYear();

    let hour = String(date.getHours()).padStart(2, '0');
    let mins = String(date.getMinutes()).padStart(2, '0');
    let secs = String(date.getSeconds()).padStart(2, '0');
    // we will display the date as DD-MM-YYYY 

    let currentDate = `${currentYear}-${currentMonth}-${currentDay}_${hour}-${mins}-${secs}`;

    let fileName = prompt("File name:", "");
    if (fileName == null || fileName == "") {
        fileName = "out";
    }

    let outFile = fileName + '_' + currentDate + '.json'; 

    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text2write));
    element.setAttribute('download', outFile);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

function selectColor(color, symbol) {
    gridManager.selectColor(color, symbol);
    // footNote.innerText = "Color selected: " + color + " - " + getDMCName(color) + " | Stitched: " + getStitched();    
     
}

function setHeight(newHeight) {
    const collection = document.getElementsByClassName("tile");
    let newHeightStyle = newHeight + "px";
    let newFontSizeStyle = Math.round((newHeight*3)/4) + "px";

    for (let i = 0; i < collection.length; i++) {
        collection[i].style.height = newHeightStyle;
        collection[i].style.width = newHeightStyle;
        collection[i].children.item(0).style.fontSize = newFontSizeStyle;
    }

}

function tileClick(obj) {
    const x = Number(obj.getAttribute('data-tile-x'));
    const y = Number(obj.getAttribute('data-tile-y'));
    gridManager.handleTileClick(x, y);

}

/* function updateColor(stitches) {
    for (let i = 0; i < stitches.length; i++) {
        let tileValues = stitches[i];

        let tileColor = getDMCValuesFromCode(tileValues.dmcCode);

        let R = tileColor.R;
        let G = tileColor.G;
        let B = tileColor.B;
        let dmcName = tileColor.dmcName;
        let symbol = tileColor.symbol;
        let code = tileColor.dmcCode;

        //+2 to compensate for the horizontal ruler
        let row = tileContainer.children.item(tileValues.Y + 2);

        //+1 to compensate for the vertical ruler
        let tile = row.children.item(tileValues.X + 1);

        let alpha = 1;
        let spanColor = 'black';
        let color = 'white';
        //Check for high contrast
        if(gridManager.contrastFlag) {
            if(code == "stitched") {
                spanColor = (((R * 0.299)+(G * 0.587)+(B * 0.114)) > 186) ? 'black' : 'white';
                color = "rgba(" + R + ", " + G + ", " + B + ",1)";
            }
            
            else {
                if(gridManager.highFlag) {
                    if(highCode == code) {
                        spanColor = 'white';
                        color = 'black';
                    }
                    else {
                        alpha = 0.25;
                        spanColor = 'silver';
                    }
                }
            }
            
               

        }


        else {
            spanColor = (((R * 0.299)+(G * 0.587)+(B * 0.114)) > 186) ? 'black' : 'white';
		
            if(gridManager.highFlag && gridManager.highlightedColor != code) {
                alpha = 0.25;
                spanColor = (((R * 0.299)+(G * 0.587)+(B * 0.114)) > 186) ? 'silver' : 'white';
            }
	    if(code == "stitched") {
                spanColor = (((R * 0.299)+(G * 0.587)+(B * 0.114)) > 186) ? 'black' : 'white';
                color = "rgba(" + R + ", " + G + ", " + B + ",1)";
		        alpha = 1;
            }

            color = "rgba(" + R + ", " + G + ", " + B + "," + alpha + ")";
        }
        //tile.setAttribute('style', color)
        
        
        tile.style.backgroundColor = color;
        let X = tileValues.X + 1;
        let Y = tileValues.Y + 1;
        let tileTitle = tileValues.dmcCode + " - " + dmcName + " - X: " + X + " - Y: " + Y
        tile.setAttribute('title', tileTitle)

        let tileClick = "tileClick(this)"
        if(code != "empty") {
            tile.setAttribute('onclick', tileClick);
        }
        
        //tile.children.item(0).innerHTML = tileValues.symbol;
        tile.children.item(0).innerText = symbol;

        tile.children.item(0).style.color = spanColor;
        // footNote.innerText = "Stitched: " + getStitched();  

        // Add data attributes
        tile.setAttribute('data-tile-x', tileValues.X);
        tile.setAttribute('data-tile-y', tileValues.Y);
        tile.setAttribute('data-tile-code', tileValues.dmcCode);
        tile.setAttribute('data-tile-r', R);
        tile.setAttribute('data-tile-g', G);
        tile.setAttribute('data-tile-b', B);

    }
} */

function zoomIn() {
    const collection = document.getElementsByClassName("tile");
    let height = collection[0].offsetHeight;
    if(height < MAX_HEIGHT) {
        let newHeight = height + 2;
        setHeight(newHeight);
    }
}

function zoomOut() {
    const collection = document.getElementsByClassName("tile");
    let height = collection[0].offsetHeight;
    if(height > MIN_HEIGHT) {
        let newHeight = height - 2;
        setHeight(newHeight);
    }
}

function zoomReset() {
    zoomResetFlag = !zoomResetFlag;

    if(zoomResetFlag) {
        setHeight(Math.round(tileContainer.offsetHeight/tileContainer.children.length) - 1);
    }
    else {
        setHeight(DEFAULT_HEIGHT);
    }
}

window.onclick = function(event) {
    let modal = document.getElementById("myModal");
    if(event.target == modal) {
        modal.style.display = "none";
    }
}



window.addEventListener('resize', function(event) {
    
    var body = document.body;
    //var height = Math.max( body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight );
    var height = body.offsetHeight - 130 - 25; // total minus the 2 toolbars and some margin

    tileContainer.style.height = height+"px";
    
}, true);

// Expose functions to global scope for HTML onclick attributes
window.openFile = openFile;
window.save = save;
window.flossUsageOpen = flossUsageOpen;
window.previewOpen = previewOpen;

window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.zoomReset = zoomReset;

// Grid manager tool functions
window.highlight = () => gridManager.activateHighlight();
window.paint = () => gridManager.activatePaint();
window.bucket = () => gridManager.activateBucket();
window.undo = () => gridManager.undo();
window.highContrast = () => gridManager.activateHighContrast();
window.loadNextFile = loadNextFile;
window.flossUsageClose = flossUsageClose;
window.previewClose = previewClose;
window.previewPath = previewPath;
window.drawSVG = drawSVG;
window.selectColor = selectColor;
window.tileClick = tileClick;

