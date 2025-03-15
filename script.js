const tileContainer = document.getElementsByClassName("tile-container")[0];
const colorTemplate = document.querySelector("[data-color-template]");
const tileTemplate = document.querySelector("[data-tile-template]");
const rowTemplate = document.querySelector("[data-row-template]");
const colorContainer = document.querySelector("[data-color-container]");
const footNote = document.querySelector("[data-footnote]");

let MIN_HEIGHT = 10;
let MAX_HEIGHT = 50;
let DEFAULT_HEIGHT = 20;

let box = 50; // Stitch width and height
let i = 0;
let j = 0;
let cols = 0;
let rows = 0;

let paintFlag = false;
let highFlag = false;
let bucketFlag = false;
let contrastFlag = false;
let zoomResetFlag = false;
let highCode = 0;
let highSymbol = "";
let alpha = 1;

let firstLoop = true;

let jsonText = '';
// let jsonFiles = ['liverpool.json', 'messi.json', 'japan.json', 'bunny.json', 'dino2.json', 'rabbit.json', 'mandala1.json'];
let jsonFiles = ['json/liverpool.json', 'json/japan.json', 'json/cuphead.json', 'json/dino.json', 'json/amsterdam.json', 'json/african.json', 'json/messi.json'];
let currIndex = 0;
let jsonFile = jsonFiles[currIndex];
let jsonObject = {}; // resulting object after fetch
let originalObject = {};

let changes = []; // after a paint event a change has to be added
let colorArray = [];
let changeCounter = 0;
var downloadURL = null;

window.onload = function() {
    fetch(jsonFile)
        .then(response => {
            return response.text();
        })
        .then((data) => {
            data = JSON.parse(data);
            loadJSON(data);
    })
}

function loadNextFile() {
    currIndex += 1;
    if(currIndex >= jsonFiles.length) { currIndex = 0}

    fetch(jsonFiles[currIndex])
        .then(response => {
            return response.text();
        })
        .then((data) => {
            data = JSON.parse(data);
            loadJSON(data);
    })
}

function addChangesToJsonObject() {
    let tiles = document.querySelectorAll('[data-tile-change]');

    jsonObject.stitches.forEach(stitch => {
        for(i=0; i<tiles.length; i++) {
            let X = tiles[i].getAttribute('data-tile-x');
            let Y = tiles[i].getAttribute('data-tile-y');
            if(stitch.X == X && stitch.Y == Y) {
                // After this the change will be undoable
                tiles[i].removeAttribute('data-tile-change');
                tiles[i].removeAttribute('data-tile-orig-code');
                let tileTitle = "STITCHED - X: " + X + " - Y: " + Y;
                tiles[i].setAttribute('title', tileTitle);
                // console.log(stitch);
                stitch.dmcCode = 'stitched';
                // console.log(stitch);
            }
        }
    })
    return;
}

function bucket() {
    clearActiveTool();
    bucketFlag = !bucketFlag;

    if(bucketFlag) {
        document.getElementById("bucketTool").classList.add("activeTool");
    }

    if(highFlag) {
        document.getElementById("highTool").classList.add("activeTool");
    }

    //clear other flags
    // highFlag = false;
    paintFlag = false;
    //updateColor(jsonObject.stitches);
}

function bucketClick(stitchCoord) {
    //if(highFlag && stitchCoord.code != highCode) {
    //    return;
    //}

    let stitches2Paint = getNeighborStitches(stitchCoord.X, stitchCoord.Y);
    console.log(stitches2Paint.length);

    if(stitches2Paint.length > 20) {
        let message = stitches2Paint.length + " stitches will be painted, are you sure?"
        if(confirm(message)) {
            stitches2Paint.forEach(stitch => {
                paintClick(stitch);
            })
        }
    }
    else {
        stitches2Paint.forEach(stitch => {
            paintClick(stitch);
        })
    }
}

function newBucketClick(obj, counter) {
    let x = obj.getAttribute('data-tile-x');
    let y = obj.getAttribute('data-tile-y');
    let code = obj.getAttribute('data-tile-code');
    let stitches2Paint = newGetNeighborStitches(Number(x), Number(y), code);
    if(stitches2Paint.length > 100) {
        let message = stitches2Paint.length + " stitches will be painted, are you sure?"
        if(confirm(message)) {
            stitches2Paint.forEach(stitch => {
                let tile = document.querySelector(`[data-tile-x=${CSS.escape(stitch.X)}][data-tile-y=${CSS.escape(stitch.Y)}]`);
                newPaintClick(tile, counter);
            })
        }
    }
    else {
        stitches2Paint.forEach(stitch => {
            let tile = document.querySelector(`[data-tile-x=${CSS.escape(stitch.X)}][data-tile-y=${CSS.escape(stitch.Y)}]`);
            newPaintClick(tile, counter);
        })
    }
    return(stitches2Paint.length);
}

function checkAndAddColor (colors, line) 
{
    let length = colors.length;
    let found = false;
    
    for (i = 0; i < length; i ++) {
        
        if(line.dmcCode == colors[i].code) {
            found = true;
            colors[i].count = colors[i].count + 1;
        }
    }
    
    if(!found) {
        let newColor = getDMCValuesFromCode(line.dmcCode)
        colors.push( { 
            "code": line.dmcCode,
            "name": newColor.dmcName,
            "R": newColor.R,
            "G": newColor.G,
            "B": newColor.B,
            "symbol": newColor.symbol,
            "count": 1
        } );
    }
    return colors;

}

function clearActiveTool() {
    const collection = document.getElementsByClassName("toolback");
    for (let i = 0; i < collection.length; i++) {
        collection[i].classList.remove("activeTool");
    }
   
}

function convertFileToStitches(data) {
    let dataOut = {};
    let newStitches = [];
    // Change in json file format, this converts stitches to previous format
    let stitchNumber = 0;
    for(let y = 0; y < data.properties.height; y++) {
        for(let x = 0; x < data.properties.width; x++) {
            if(x > data.stitches[stitchNumber].X && y == data.stitches[stitchNumber].Y) {
                // change in x direction
                stitchNumber += 1; // this is dumb, for God's sake
            }
            else if(x == 0 && y > data.stitches[stitchNumber].Y) {
                // change in y direction
                stitchNumber += 1;
            }
            newStitches.push({"X":x,"Y":y,"dmcCode":data.stitches[stitchNumber].dmcCode});
        }
    }
    
    dataOut.stitches = newStitches;
    dataOut.properties = data.properties;
    dataOut.colors = data.colors;

    return dataOut;
}

function convertStitchesToFile(data) {
    let dataOut = {};
    let newStitches = [];
    for (const [index, stitch] of data.stitches.entries()) {
        if(stitch.X == data.properties.width - 1 && stitch.Y == data.properties.height - 1) {
            //Last stitch
            newStitches.push(stitch);
            continue;
        }
        else if(stitch.dmcCode != data.stitches[index + 1].dmcCode) {
            newStitches.push(stitch);
        }
    }

    dataOut.stitches = newStitches;
    dataOut.properties = data.properties;
    dataOut.colors = data.colors;
    return dataOut;
}

function drawGridLines() {
    drawHorizontalLines();
    drawVerticalLines();
    drawMiddleLines();
}

function drawHorizontalLines() {
    for(i = 1; i <= Math.floor(tileContainer.children.length/10); i++) {
        let topRow = tileContainer.children.item((i*10));
        // let botRow = tileContainer.children.item((i*10));
        // row-1 is the 10th row, all tiles should bottom border
        for(j = 0; j < topRow.children.length; j++) {
            topRow.children.item(j).classList.add("horBorder");
            //topRow.children.item(j).style.borderBottom = "2px solid black";
        }
    }
}

function drawVerticalLines() {
    for(i = 0; i < tileContainer.children.length; i++) {
        //Get 9th n-element of each row and add 
        let row = tileContainer.children.item(i);
        for(j=1; j <= row.children.length; j++) {
            if(j%10==0) {
                row.children.item(j).classList.add("borderRight");
                //row.children.item(j).style.borderRight = "1px solid black";
                //if(j<row.children.length-1) {
                //    row.children.item(j+1).style.borderLeft = "1px solid black";
                //}
            }
            if(j%10==1 && j < row.children.length-1 && j > 1) {
                row.children.item(j).classList.add("borderLeft");
            }
        }
    }
}

function drawMiddleLines() {
    // Draw horizontal middle line
    let rows = document.getElementsByClassName("tile-container")[0];
    let midRowIndex = Math.round(jsonObject.properties.height / 2)
    let midRowTop = rows.children[midRowIndex];
    let midRowBot = rows.children[midRowIndex + 1];
    for(i = 0; i < midRowTop.children.length; i ++) {
        midRowTop.children.item(i).classList.add("midRowTop");
    }
    for(i = 0; i < midRowBot.children.length; i ++) {
        midRowBot.children.item(i).classList.add("midRowBot");
    }
    
    // Draw vertical middle line
    let midColIndex = Math.round(jsonObject.properties.width / 2)
    for(i = 0; i < rows.children.length; i++) {
        let curRow = rows.children.item(i);
        curRow.children.item(midColIndex).classList.add("midColLeft");
        curRow.children.item(midColIndex + 1).classList.add("midColRight");
    }
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
    
    //Refresh color list
    colorArray = [];
    jsonObject.stitches.forEach(obj => {
        colorArray = checkAndAddColor(colorArray, obj);
    })

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

    //Fill properties
    let par = document.getElementById("properties");
    let hS = jsonObject.stitches[Object.keys(jsonObject.stitches).length-1].Y + 1;
    let wS = jsonObject.stitches[Object.keys(jsonObject.stitches).length-1].X + 1;
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

    colors = colorArray.map(color =>  {
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
        if(color.code!="empty") {
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
            const colorClick = `newSelectColor(\"${color.code}\", \"${color.symbol}\")`;
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
    
    if (highFlag) {
        selectColor(highCode, highSymbol);
    }

    modalList.appendChild(table);
}

function newFillFlossUsage() {
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
    let hS = jsonObject.properties.height;
    let wS = jsonObject.properties.width;
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
        if(color.code!="empty") {
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
            const colorClick = `newSelectColor(\"${color.code}\", \"${color.symbol}\")`;
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
    
    if (highFlag) {
        newSelectColor(highCode, highSymbol);
    }

    modalList.appendChild(table);
}

function flossUsageClose() {
    let modal = document.getElementById("myModal");
    modal.style.display = "none";
}

function flossUsageOpen() {
    newFillFlossUsage();
    let modal = document.getElementById("myModal");
    modal.style.display = "block";
}

function getDMCName(code) {
    let dmcName = "Unknown";
    jsonObject.colors.forEach(obj => {
        if(obj.dmcCode === code) {
            dmcName = obj.dmcName;
        }
    })
    return dmcName;
}

function getDMCSymbol(code) {
    let dmcSymbol = "Unknown";
    jsonObject.colors.forEach(obj => {
        //console.log(obj);
        if(obj.dmcCode === code) {
            dmcSymbol = obj.dmcSymbol;
        }
    })
    return dmcSymbol;
}

function getDMCValuesFromCode(code) {
    let color2return = {};
    jsonObject.colors.forEach(obj => {
        if(obj.dmcCode === code) {
            color2return = obj;
        }
    })
    return color2return;
}

function getNeighborStitches(X, Y) {
    //array of coordinates to return for painting    
    let foundStitches = [];
    //array to iterate last element, get new stitches that are not already in found and pop it
    let newStitches = [];

    let color2Paint = getStitchColor({X:X,Y:Y});
    if(color2Paint == 'stitched' || color2Paint == '0') {
        return foundStitches;
    }
    
    //add the clicked coordinates
    newStitches.push(
        {"X": X, 
        "Y": Y
    });

    foundStitches.push(
        {"X": X, 
        "Y": Y
    });
    

    // check four stitches that share an edge with the clicked
    while(newStitches.length > 0) {
        //check last element of array
        let stitch2Test = newStitches[newStitches.length-1];
        //and remove it
        newStitches.pop();

        // check 4 edges of the stitch to test
        let edges = [
            {X:stitch2Test.X, Y:stitch2Test.Y-1},
            {X:stitch2Test.X, Y:stitch2Test.Y+1},
            {X:stitch2Test.X-1, Y:stitch2Test.Y},
            {X:stitch2Test.X+1, Y:stitch2Test.Y}
        ];

        edges.forEach(edge => {
            if(getStitchColor(edge) == color2Paint) {
                if(!IsCoordAlreadyThere(edge, foundStitches)) {
                    newStitches.push(edge);
                    foundStitches.push(edge);
                }
            }
        });



        //if(getStitchColor({X:stitch2Test.X, Y:stitch2Test.Y-1}) == color2Paint) {if(!IsCoordAlreadyThere(stitch2Test, foundStitches)) { newStitches.push(stitch2Test); foundStitches.push(stitch2Test) }}
        //if(getStitchColor({X:stitch2Test.X, Y:stitch2Test.Y+1}) == color2Paint) {if(!IsCoordAlreadyThere(stitch2Test, foundStitches)) { newStitches.push(stitch2Test); foundStitches.push(stitch2Test) }}
        //if(getStitchColor({X:stitch2Test.X-1, Y:stitch2Test.Y}) == color2Paint) {if(!IsCoordAlreadyThere(stitch2Test, foundStitches)) { newStitches.push(stitch2Test); foundStitches.push(stitch2Test) }}
        //if(getStitchColor({X:stitch2Test.X+1, Y:stitch2Test.Y}) == color2Paint) {if(!IsCoordAlreadyThere(stitch2Test, foundStitches)) { newStitches.push(stitch2Test); foundStitches.push(stitch2Test) }}

    }
    return foundStitches;
}

function newGetNeighborStitches(X, Y, code) {
    //array of coordinates to return for painting    
    let foundStitches = [];
    //array to iterate last element, get new stitches that are not already in found and pop it
    let newStitches = [];
    let color2Paint = code;

    if(color2Paint == 'stitched' || color2Paint == '0') {
        return foundStitches;
    }
    
    //add the clicked coordinates
    newStitches.push(
        {"X": X, 
        "Y": Y
    });

    foundStitches.push(
        {"X": X, 
        "Y": Y
    });
    

    // check four stitches that share an edge with the clicked
    while(newStitches.length > 0) {
        //check last element of array
        let stitch2Test = newStitches[newStitches.length-1];
        //and remove it
        newStitches.pop();

        // check 4 edges of the stitch to test
        let edges = [
            {X:stitch2Test.X, Y:stitch2Test.Y-1},
            {X:stitch2Test.X, Y:stitch2Test.Y+1},
            {X:stitch2Test.X-1, Y:stitch2Test.Y},
            {X:stitch2Test.X+1, Y:stitch2Test.Y}
        ];

        edges.forEach(edge => {
            //console.log(edge.X, edge.Y);
            //let tile = document.querySelector(`[data-tile-x=${CSS.escape(X)}][data-tile-y=${CSS.escape(Y)}]`);
            //console.log(tile);

            if(getStitchColor(edge) == color2Paint) {
                if(!IsCoordAlreadyThere(edge, foundStitches)) {
                    newStitches.push(edge);
                    foundStitches.push(edge);
                }
            }
        });



        //if(getStitchColor({X:stitch2Test.X, Y:stitch2Test.Y-1}) == color2Paint) {if(!IsCoordAlreadyThere(stitch2Test, foundStitches)) { newStitches.push(stitch2Test); foundStitches.push(stitch2Test) }}
        //if(getStitchColor({X:stitch2Test.X, Y:stitch2Test.Y+1}) == color2Paint) {if(!IsCoordAlreadyThere(stitch2Test, foundStitches)) { newStitches.push(stitch2Test); foundStitches.push(stitch2Test) }}
        //if(getStitchColor({X:stitch2Test.X-1, Y:stitch2Test.Y}) == color2Paint) {if(!IsCoordAlreadyThere(stitch2Test, foundStitches)) { newStitches.push(stitch2Test); foundStitches.push(stitch2Test) }}
        //if(getStitchColor({X:stitch2Test.X+1, Y:stitch2Test.Y}) == color2Paint) {if(!IsCoordAlreadyThere(stitch2Test, foundStitches)) { newStitches.push(stitch2Test); foundStitches.push(stitch2Test) }}

    }
    // console.log(foundStitches);
    return foundStitches;
}

function getStitchColor(stitchCoord) {
    let X = stitchCoord.X;
    let Y = stitchCoord.Y;
    let tile = document.querySelector(`[data-tile-x=${CSS.escape(X)}][data-tile-y=${CSS.escape(Y)}]`);
    if(tile != null) {
        return tile.getAttribute('data-tile-code');
    }
    return -1
 
}

function getStitched() {
    let stitched = 0;
    colorArray.forEach(obj => {
        if(obj.code == "stitched") {
            stitched = obj.count;
        }
    })
    return(stitched);
}

function highContrast() {
    contrastFlag = !contrastFlag;

    if(contrastFlag) {
        document.getElementById("contrastTool").classList.add("activeTool");
    }
    else {
        document.getElementById("contrastTool").classList.remove("activeTool");
    }

    //updateColor(jsonObject.stitches);
    updateTileColor();
}

function highlight() {
    clearActiveTool();
    highFlag = !highFlag;
    if(highFlag) {
        document.getElementById("highTool").classList.add("activeTool");
    }

    //clear other flags
    paintFlag = false;
    bucketFlag = false;

    //updateColor(jsonObject.stitches);
    updateTileColor();
}

function IsCoordAlreadyThere (stitchCoord, array2Test) {
    let ret = false;
    test = array2Test.map(coord => {
        if(coord.X == stitchCoord.X && coord.Y == stitchCoord.Y) {
            ret = true;
        }
    })
    return ret;
}

function loadJSON(data) {
    // Convert stitches
    data = convertFileToStitches(data);


    let toCheck = data.stitches[0]
    if(!('X' in toCheck) || !('Y' in toCheck)) {
        console.log('Invalid file');
        return;
    }
    jsonObject = {};
    originalObject = data; // keep as loaded
    
    // Clear all changes
    changes = [];
	colorArray = [];
    
    jsonObject = mergeChanges();

    data.stitches.forEach(obj => {
        colorArray = checkAndAddColor(colorArray, obj);
    })

    colorArray.sort(function(a, b) {
        if(a.count < b.count) return 1;
        if(a.count > b.count) return -1;
        return 0;
    });

    fillFlossUsage();

    //Create all divs for tiles
    //One additional because the array starts at zero
    //Another additional 
    cols = data.stitches[data.stitches.length-1].X+1
    rows = data.stitches[data.stitches.length-1].Y+1

    if(tileContainer.children.length > 0) {
        console.log("Removing all tiles...")
        while (tileContainer.lastElementChild) { 
            tileContainer.removeChild(tileContainer.lastElementChild);
          }
    }
    
    const rulerRow = rowTemplate.content.cloneNode(true).children[0];
    
    //Adding vertical ruler div
    const rulerDiv = tileTemplate.content.cloneNode(true).children[0];
    //rulerDiv.setAttribute('style', "position: sticky; left: 0; background-color: rgb(241, 241, 241);");
    rulerDiv.classList.add("vertRulerDiv");
    rulerRow.append(rulerDiv);

    for(i=1; i<=cols; i++)  {
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

    for(j=1; j<=rows; j++) {
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

        for(i=1; i<=cols; i++)  {
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

    updateColor(data.stitches);
    drawGridLines();

    var body = document.body;
    var height = body.offsetHeight - 130 - 25; // total minus the 2 toolbars and some margin
    tileContainer.style.height = height+"px";
    footNote.innerText = "Stitched: " + getStitched();  
}

function mergeChanges() {
    //jsonObject = originalObject; // restore initial state
    let newJson = {}
    let newStitches = [];
    let foundChange = false;

    let originalStitches = originalObject.stitches;

    for(let j = 0; j < originalStitches.length; j++) {
        foundChange = false;
        for(let i = 0; i < changes.length; i++) {
            if(changes[i].X == originalStitches[j].X && changes[i].Y == originalStitches[j].Y && originalStitches[j].dmcCode != 0) {
                //jsonObject[j] = changes[i];
                newStitches.push(changes[i]);
                foundChange = true;
                //j++;

            }
        }

        if(!foundChange) {
            newStitches.push(originalStitches[j]);
        }

    }
    
    //fillFlossUsage();
    newJson.stitches = newStitches;
    newJson.colors = originalObject.colors;
    newJson.properties = originalObject.properties;
    return(newJson);
    
    
}

function openFile() {

    let jsonContent = "";

    let input = document.createElement('input');
    input.type = 'file';
    input.onchange = _ => {
    // you can use this method to get file and perform respective operations
        let file =  input.files[0];
        if(file) {
            var reader = new FileReader();
            reader.readAsText(file, "UTF-8");
            reader.onload = function (evt) {
                jsonContent = evt.target.result;
                loadJSON(JSON.parse(jsonContent));
            }
        }
    };
    input.click();
}

function paint() {
    clearActiveTool();
    paintFlag = !paintFlag;

    if(paintFlag) {
        document.getElementById("paintTool").classList.add("activeTool");
    }

    if(highFlag) {
        document.getElementById("highTool").classList.add("activeTool");
    }

    //clear other flags
    // highFlag = false;
    bucketFlag = false;

    //updateColor(jsonObject.stitches);
}

function paintClick(stitchCoord) {
    //if(highFlag && stitchCoord.code != highCode) {
    //    return;
    //}

    let alreadyStitched = false;

    if(stitchCoord.X < 0 || stitchCoord.Y < 0 || getStitchColor(stitchCoord) == 0) {
        return;
    }

    for(let i = 0; i < changes.length; i++) {
        if(changes[i].X == stitchCoord.X && changes[i].Y == stitchCoord.Y) {
            alreadyStitched = true;
            
        }
    }
    
    if(!alreadyStitched && stitchCoord.X >= 0 && stitchCoord.Y >= 0) {
        changes.push(
            {
                "X": stitchCoord.X,
                "Y": stitchCoord.Y,
                "dmcCode": "stitched",
            },
        )
        //jsonObject = mergeChanges();
        //fillFlossUsage();
    }

    //updateColor(changes);
}

function newPaintClick(tile, counter) {
    let origCode = tile.getAttribute('data-tile-code');
    tile.setAttribute('data-tile-code', 'stitched');
    tile.setAttribute('data-tile-orig-code', origCode);
    tile.setAttribute('data-tile-r', 0);
    tile.setAttribute('data-tile-g', 255);
    tile.setAttribute('data-tile-b', 0);
    tile.setAttribute('data-tile-change', counter);

    tile.style.backgroundColor = "rgba(0, 255, 0, 1)"
    tile.children.item(0).style.color = 'white';
    //console.log(colorArray);
    tile.children.item(0).innerText = '×';

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

    for(i = 0; i < data.length; i++) {
        let tileValues = data[i];
        // if(i < 10) {
        //    console.log(tileValues);
        //}
        //Adding offset due to ruler
        let row = tileContainer.children.item(tileValues.Y + 1);
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
}

function previewClose() {
    let modal = document.getElementById("previewModal");
    modal.style.display = "none";
}

function previewOpen() {
    preview(jsonObject.stitches);
    let modal = document.getElementById("previewModal");
    modal.style.display = "block";
}

function save() {
    //mergeChanges();
    addChangesToJsonObject();
    fillFlossUsage();

    var text2write = JSON.stringify(convertStitchesToFile(jsonObject));
    
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
    const collection = document.getElementsByClassName("colorback");
    for (let i = 0; i < collection.length; i++) {
        collection[i].classList.remove("activeColor");
    }

    for (let i = 0; i < collection.length; i++) {
        if(collection[i].children[0].children[0].children[0].innerText == symbol) {
            collection[i].classList.add("activeColor");
        }
    }

    highCode = color;
    highSymbol = symbol;
    if(highFlag) {
        updateColor(jsonObject.stitches);
    }


    footNote.innerText = "Color selected: " + color + " - " + getDMCName(color) + " | Stitched: " + getStitched();    
    
}

function newSelectColor(color, symbol) {
    const collection = document.getElementsByClassName("colorback");
    for (let i = 0; i < collection.length; i++) {
        collection[i].classList.remove("activeColor");
    }

    for (let i = 0; i < collection.length; i++) {
        if(collection[i].children[0].children[0].children[0].innerText == symbol) {
            collection[i].classList.add("activeColor");
        }
    }

    highCode = color;
    highSymbol = symbol;
    if(highFlag) {
        updateTileColor();
    }


    footNote.innerText = "Color selected: " + color + " - " + getDMCName(color) + " | Stitched: " + getStitched();    
     
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

function tileClick(x, y, code, symbol) {
    var obj = {
        X: x,
        Y: y,
        code: code,
        symbol : symbol
    }

    if(paintFlag) {
	    if(highFlag && highCode != code) {
            return;
        }
        paintClick(obj);
        jsonObject = mergeChanges();
        fillFlossUsage();
        updateColor(changes);
    }

    else if(bucketFlag) {
	if(highFlag && highCode != code) {
            return;
        }
        bucketClick(obj);
        jsonObject = mergeChanges();
        fillFlossUsage();
        updateColor(changes);
    }

    else if (highFlag) {
        selectColor(obj.code, obj.symbol);

    }
    let tileX = x + 1;
    let tileY = y + 1;
    footNote.innerText = "X: " + tileX + ", Y: " + tileY + ", Code: " + code + " - " + getDMCName(code) + " | Stitched: " + getStitched();
} 

function newTileClick(obj) {
    x = Number(obj.getAttribute('data-tile-x'));
    y = Number(obj.getAttribute('data-tile-y'));
    code = obj.getAttribute('data-tile-code');
    symbol = getDMCSymbol(code);

    if(paintFlag) {
	    if(highFlag && highCode != code) {
            return
        }
        changeCounter++;
        newPaintClick(obj, changeCounter);
        colorArray = updateColorAfterPaint(colorArray, code, 1);
        
    }

    else if(bucketFlag) {
	    if(highFlag && highCode != code) {
            return;
        }
        changeCounter++;
        let total = newBucketClick(obj, changeCounter);
        colorArray = updateColorAfterPaint(colorArray, code, total);
    }

    else if (highFlag) {
        newSelectColor(code, symbol);

    }
    let tileX = x + 1;
    let tileY = y + 1;
    footNote.innerText = "X: " + tileX + ", Y: " + tileY + ", Code: " + code + " - " + getDMCName(code) + " | Stitched: " + getStitched();


}

function undo() {
    changes.pop();
    jsonObject = mergeChanges();
    fillFlossUsage();
    updateColor(jsonObject.stitches);
}

function newUndo() {
    if(changeCounter == 0) {
        return;
    }
    let tiles = document.querySelectorAll(`[data-tile-change=${CSS.escape(changeCounter)}]`);
    // console.log(tiles);
    tiles.forEach(tile => {
        let origCode = tile.getAttribute('data-tile-orig-code');
        let origColor = getDMCValuesFromCode(origCode);
        let R = origColor.R;
        let G = origColor.G;
        let B = origColor.B;

        tile.children.item(0).innerText = origColor.symbol;
        tile.removeAttribute('data-tile-change');
        tile.setAttribute('data-tile-code', origColor.dmcCode);
        tile.setAttribute('data-tile-r', origColor.R);
        tile.setAttribute('data-tile-g', origColor.G);
        tile.setAttribute('data-tile-b', origColor.B);
        
        let code = origCode;
        let alpha = 1;
        let spanColor = 'black';
        let color = 'white';
        
        //Check for high contrast
        if(contrastFlag) {
            if(code == "stitched") {
                spanColor = (((R * 0.299)+(G * 0.587)+(B * 0.114)) > 186) ? 'black' : 'white';
                color = "rgba(" + R + ", " + G + ", " + B + ",1)";
            }
            
            else {
                if(highFlag) {
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
        
            if(highFlag && highCode != code) {
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
        
        tile.children.item(0).style.color = spanColor;
        tile.style.backgroundColor = color;
        
        // console.log(origColor);
        // console.log(tile.getAttribute('data-tile-change'));
    })
    changeCounter--;
}

function updateColor(stitches) {
    for(i=0; i<stitches.length; i++) {
        let tileValues = stitches[i];

        let tileColor = getDMCValuesFromCode(tileValues.dmcCode);

        let R = tileColor.R;
        let G = tileColor.G;
        let B = tileColor.B;
        let dmcName = tileColor.dmcName;
        let symbol = tileColor.symbol;
        let code = tileColor.dmcCode;

        //+1 to compensate for the horizontal ruler
        let row = tileContainer.children.item(tileValues.Y + 1);

        //+1 to compensate for the vertical ruler
        let tile = row.children.item(tileValues.X + 1);

        let alpha = 1;
        let spanColor = 'black';
        let color = 'white';
        //Check for high contrast
        if(contrastFlag) {
            if(code == "stitched") {
                spanColor = (((R * 0.299)+(G * 0.587)+(B * 0.114)) > 186) ? 'black' : 'white';
                color = "rgba(" + R + ", " + G + ", " + B + ",1)";
            }
            
            else {
                if(highFlag) {
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
		
            if(highFlag && highCode != code) {
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

        //let tileClick = "tileClick(" + tileValues.X + ", " + tileValues.Y + ", \"" + tileValues.dmcCode + "\", \"" + symbol + "\")";
        let tileClick = "newTileClick(this)"
        if(code != "empty") {
            tile.setAttribute('onclick', tileClick);
        }
        
        //tile.children.item(0).innerHTML = tileValues.symbol;
        tile.children.item(0).innerText = symbol;

        tile.children.item(0).style.color = spanColor;
        footNote.innerText = "Stitched: " + getStitched();  

        // Add data attributes
        tile.setAttribute('data-tile-x', tileValues.X);
        tile.setAttribute('data-tile-y', tileValues.Y);
        tile.setAttribute('data-tile-code', tileValues.dmcCode);
        tile.setAttribute('data-tile-r', R);
        tile.setAttribute('data-tile-g', G);
        tile.setAttribute('data-tile-b', B);

    }
}

function updateColorAfterPaint(colors, origCode, total) {
    let length = colors.length;
    let found = false;
    
    for (i = 0; i < length; i ++) {
        
        if(origCode == colors[i].code) {
            colors[i].count = colors[i].count - total;
        }

        if(colors[i].code == 'stitched') {
            found = true;
            colors[i].count = colors[i].count + total;
        }
    }

    if(!found) {
        colors.push( { 
            "code": 'stitched',
            "name": 'STITCHED',
            "R": 0,
            "G": 255,
            "B": 0,
            "symbol": "×",
            "count": total
        } );
    }
    return colors;

}


function updateTileColor() {
    for(i = 1; i < tileContainer.children.length; i++) {
        let row = tileContainer.children[i];
        for(j = 1; j < row.children.length; j++) {
            let tile = row.children[j];
            //console.log(tile.getAttribute('data-tile-code'));
            let code = tile.getAttribute('data-tile-code');
            let R = tile.getAttribute('data-tile-r');
            let G = tile.getAttribute('data-tile-g');
            let B = tile.getAttribute('data-tile-b');
            let alpha = 1;
            let spanColor = 'black';
            let color = 'white';
            
            //Check for high contrast
            if(contrastFlag) {
                if(code == "stitched") {
                    spanColor = (((R * 0.299)+(G * 0.587)+(B * 0.114)) > 186) ? 'black' : 'white';
                    color = "rgba(" + R + ", " + G + ", " + B + ",1)";
                }
                
                else {
                    if(highFlag) {
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
            
                if(highFlag && highCode != code) {
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
            
            tile.children.item(0).style.color = spanColor;
            tile.style.backgroundColor = color;
        }
    }

}

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
        setHeight(Math.round(tileContainer.offsetHeight/tileContainer.children.length));
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
    html = document.documentElement;

    //var height = Math.max( body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight );
    var height = body.offsetHeight - 130 - 25; // total minus the 2 toolbars and some margin

    tileContainer.style.height = height+"px";
    
}, true);

