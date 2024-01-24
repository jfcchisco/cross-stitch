const tileContainer = document.getElementsByClassName("tile-container")[0];
const colorTemplate = document.querySelector("[data-color-template]");
const tileTemplate = document.querySelector("[data-tile-template]");
const rowTemplate = document.querySelector("[data-row-template]");
const colorContainer = document.querySelector("[data-color-container]");
const footNote = document.querySelector("[data-footnote]");

let MIN_HEIGHT = 10;
let MAX_HEIGHT = 50;
let DEFAULT_HEIGHT = 24;

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
let jsonFiles = ['liverpool.json', 'dino2.json', 'messi.json', 'japan.json', 'rabbit.json', 'mandala1.json'];
let currIndex = 0;
let jsonFile = jsonFiles[currIndex];
let jsonObject = {}; // resulting object after fetch
let originalObject = {};

let json2draw = {};

let jsonColors = {}; // json containing color usage

let changes = []; // after a paint event a change has to be added

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

function bucket() {
    clearActiveTool();
    bucketFlag = !bucketFlag;

    if(bucketFlag) {
        document.getElementById("bucketTool").classList.add("activeTool");
    }

    //clear other flags
    highFlag = false;
    paintFlag = false;
    updateColor(jsonObject);
}

function bucketClick(stitchCoord) {
    let stitches2Paint = getNeighborStitches(stitchCoord.X, stitchCoord.Y);

    stitches2Paint.forEach(stitch => {
        paintClick(stitch);
    })
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
        colors.push( { 
            "code": line.dmcCode,
            "name": line.dmcName,
            "R": line.R,
	    "G": line.G,
	    "B": line.B,
	    "symbol": line.symbol,
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

function drawGridLines() {
    drawHorizontalLines();
    drawVerticalLines();
}

function drawHorizontalLines() {
    for(i = 1; i <= Math.floor(tileContainer.children.length/10); i++) {
        let topRow = tileContainer.children.item((i*10)-1);
        // let botRow = tileContainer.children.item((i*10));
        // row-1 is the 10th row, all tiles should bottom border
        for(j = 0; j < topRow.children.length; j++) {
            topRow.children.item(j).style.borderBottom = "2px solid black";
        }
    }

}

function drawVerticalLines() {
    for(i = 0; i < tileContainer.children.length; i++) {
        //Get 9th n-element of each row and add 
        let row = tileContainer.children.item(i);
        for(j=1; j <= row.children.length; j++) {
            if(j%10==0) {
                row.children.item(j-1).style.borderRight = "1px solid black";
		if(j<row.children.length) {
                    row.children.item(j).style.borderLeft = "1px solid black";
		}
            }
        }
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
    jsonObject.forEach(obj => {
        //console.log(obj);
        colorArray = checkAndAddColor(colorArray, obj);
    })

    //Count already stitched
    let stitched = 0;
    let toStitch = 0;
    colorArray.forEach(obj => {
        //console.log(obj);
        if(obj.name == "STITCHED") {
            stitched = obj.count;
        }
        else if(obj.name != "Empty") {
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
    let hS = jsonObject[Object.keys(jsonObject).length-1].Y + 1;
    let wS = jsonObject[Object.keys(jsonObject).length-1].X + 1;
    // Aida 14 is 5.4 stitches per cm (0.185 mm per stitch)
    let hCM = (hS * 0.185).toFixed(1);
    let wCM = (wS * 0.185).toFixed(1);
    par.innerHTML = hS + "h x " + wS + "w (" + hCM + "cm x " + wCM + "cm). " + stitched + "/" + toStitch + " stitched (" + percentage + "%)";


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
	if(color.code!=0) {
		table.appendChild(newRow);
	}


        // Fill color selectors
        if(color.code!=0) {
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

            if(colorBack != null) {
                colorBack.classList.add('holyS');
                console.log('added');
            }
            colorContainer.append(colorDiv);
        }
    })


    modalList.appendChild(table);
}

function flossUsageClose() {
    let modal = document.getElementById("myModal");
    modal.style.display = "none";
}

function flossUsageOpen() {
    let modal = document.getElementById("myModal");
    modal.style.display = "block";
}

function getNeighborStitches(X, Y) {
    //array of coordinates to return for painting    
    let foundStitches = [];
    //array to iterate last element, get new stitches that are not already in found and pop it
    let newStitches = [];

    let color2Paint = getStitchColor({X:X,Y:Y});
    //console.log(color2Paint, X, Y);
    if(color2Paint == '9999' || color2Paint == '0') {
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
    

    //console.log(foundStitches, newStitches);

    // check four stitches that share an edge with the clicked
    while(newStitches.length > 0) {
        //check last element of array
        let stitch2Test = newStitches[newStitches.length-1];
        //console.log(stitch2Test);
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


    // process must be repeated for all new found stitches checking for repeated stitches, otherwise it will run forever


    
    //console.log(foundStitches);




    return foundStitches;
}

function getStitchColor(stitchCoord) {
    let X = stitchCoord.X;
    let Y = stitchCoord.Y;

    let dmcCode = -1

    stitches = jsonObject.map(stitch => {
        //console.log(stitch);
        if(stitch.X == X && stitch.Y == Y) {
            dmcCode = stitch.dmcCode;
        }
    });

    //console.log(dmcCode);
    return dmcCode;
    
}

function highContrast() {
    contrastFlag = !contrastFlag;

    if(contrastFlag) {
        document.getElementById("contrastTool").classList.add("activeTool");
    }
    else {
        document.getElementById("contrastTool").classList.remove("activeTool");
    }

    updateColor(jsonObject);
}

function highlight() {
    //console.log(highFlag);
    clearActiveTool();
    highFlag = !highFlag;
    //console.log(highFlag);
    if(highFlag) {
        document.getElementById("highTool").classList.add("activeTool");
    }

    //clear other flags
    paintFlag = false;
    bucketFlag = false;

    updateColor(jsonObject);
}

function IsCoordAlreadyThere (stitchCoord, array2Test) {
    let ret = false;
    test = array2Test.map(coord => {
        //console.log(coord, stitchCoord);
        if(coord.X == stitchCoord.X && coord.Y == stitchCoord.Y) {
            ret = true;
        }
    })
    return ret;
}

function loadJSON(data) {

    let toCheck = data[0]
    console.log(toCheck, toCheck['X']);
    if(!('X' in toCheck) || !('Y' in toCheck)) {
        console.log('Invalid file');
        return;
    }
    //Placeholder for JSON file check
    //console.log(data);
    //console.log('Invalid file...');
    //return;
    
    //originalObject = {};
    //colorArray = {};
    jsonObject = {};
    originalObject = data; // keep as loaded
    
    // Clear all changes
    changes = [];
	colorArray = [];
    
    data.forEach(obj => {
        colorArray = checkAndAddColor(colorArray, obj);
    })

    colorArray.sort(function(a, b) {
        if(a.count < b.count) return 1;
        if(a.count > b.count) return -1;
        return 0;
    });
    
    

    jsonObject = mergeChanges();
    fillFlossUsage();

    //Create all divs for tiles
    cols = data[data.length-1].X+1
    rows = data[data.length-1].Y+1

    if(tileContainer.children.length > 0) {
        console.log("Removing all tiles...")
        while (tileContainer.lastElementChild) { 
            tileContainer.removeChild(tileContainer.lastElementChild);
          }
    }
    
    for(j=1; j<=rows; j++) {
        const newRow = rowTemplate.content.cloneNode(true).children[0];
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

    updateColor(data);
    drawGridLines();

    var body = document.body;
    var height = body.offsetHeight - 130 - 25; // total minus the 2 toolbars and some margin
    tileContainer.style.height = height+"px";

}

function mergeChanges() {
    //jsonObject = originalObject; // restore initial state
    let newJson = [];
    let foundChange = false;

    for(let j = 0; j < originalObject.length; j++) {
        foundChange = false;
        for(let i = 0; i < changes.length; i++) {
            if(changes[i].X == originalObject[j].X && changes[i].Y == originalObject[j].Y && originalObject[j].dmcCode != 0) {
                //console.log(jsonObject.length, jsonObject, originalObject.length, originalObject);
                //jsonObject[j] = changes[i];
                newJson.push(changes[i]);
                foundChange = true;
                //j++;

            }
        }

        if(!foundChange) {
            newJson.push(originalObject[j]);
        }

    }
    
    //fillFlossUsage();

    return(newJson);
    
    //console.log(jsonObject);
}

function openFile() {

    //originalObject = {};
    //colorArray = {};
    //jsonObject = {};

    let jsonContent = "";

    let input = document.createElement('input');
    input.type = 'file';
    input.onchange = _ => {
    // you can use this method to get file and perform respective operations
        let file =  input.files[0];
        console.log(file);
        if(file) {
            var reader = new FileReader();
            reader.readAsText(file, "UTF-8");
            reader.onload = function (evt) {
                //console.log(evt.target.result);
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

    //clear other flags
    highFlag = false;
    bucketFlag = false;

    updateColor(jsonObject);
}

function paintClick(stitchCoord) {
    let alreadyStitched = false;

    //console.log(getStitchColor(stitchCoord));

    if(stitchCoord.X < 0 || stitchCoord.Y < 0 || getStitchColor(stitchCoord) == 0) {
        return;
    }

    for(let i = 0; i < changes.length; i++) {
        //console.log(i, changes[i], stitchCoord);
        //console.log(changes[i].X, stitchCoord.X, changes[i].Y, stitchCoord.Y);
        if(changes[i].X == stitchCoord.X && changes[i].Y == stitchCoord.Y) {
            alreadyStitched = true;
            
        }
    }
    


    if(!alreadyStitched && stitchCoord.X >= 0 && stitchCoord.Y >= 0) {
        changes.push(
            {
                "X": stitchCoord.X,
                "Y": stitchCoord.Y,
                "dmcCode": 9999,
                "dmcName": "STITCHED",
                "R": 0,
                "G": 255,
                "B": 0,
                "symbol": "🞮"
            },
        )
        jsonObject = mergeChanges();
        fillFlossUsage();
        //console.log(changes);
    }

    updateColor(changes);
}

function preview(data) {
    let canvas = document.getElementById("canvas")
    let ctx = canvas.getContext('2d')

    let modal = document.getElementById("previewModal");

    let box = Math.max(1, (Math.min(Math.floor(document.body.offsetHeight/rows), Math.floor(document.body.offsetWidth/cols))));
    //console.log(box);

    canvas.height = box * rows;
    canvas.width =  box * cols;

    let modalHeight = box * rows + 30;
    let modalWidth =  box * cols + 30;

    modal.style.height = modalHeight+"px";
    modal.style.width = modalWidth+"px";

    ctx.clearRect(0,0, canvas.width, canvas.height)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for(i=0; i<data.length; i++) {
        let tileValues = data[i];
        //console.log(tileContainer.children)
        let row = tileContainer.children.item(tileValues.Y);
        let tile = row.children.item(tileValues.X)

        //console.log(tile.style.backgroundColor);
        let backColor = tile.style.backgroundColor;
        if(!backColor.match('rgba')) {
            ctx.fillStyle = backColor;
            ctx.fillRect(tileValues.X * box, tileValues.Y * box, tileValues.X * box + box, tileValues.Y * box + box);
            //console.log('RGBA color', backColor)
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
    preview(jsonObject);
    let modal = document.getElementById("previewModal");
    modal.style.display = "block";
}

function save() {
    //mergeChanges();
    var text2write = JSON.stringify(jsonObject);
    
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

    let currentDate = `${currentDay}-${currentMonth}-${currentYear}_${hour}-${mins}-${secs}`;

    let outFile = 'out_' + currentDate + '.json'; 

    console.log("The current date is " + currentDate); 

    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text2write));
    element.setAttribute('download', outFile);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

function selectColor(color, symbol) {
    //console.log(color);
    const collection = document.getElementsByClassName("colorback");
    for (let i = 0; i < collection.length; i++) {
        collection[i].classList.remove("activeColor");
    }

    for (let i = 0; i < collection.length; i++) {
        if(collection[i].children[0].children[0].children[0].innerText == symbol) {
            collection[i].classList.add("activeColor");
        }
        //console.log(collection[i].children[0].children[0].innerHTML);
    }

    highCode = color;
    highSymbol = symbol;

    if(highFlag) {
        updateColor(jsonObject);
    }


    footNote.innerText = "Color selected: " + color;    
    
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
    //console.log(x, y, code, symbol);

    
    var obj = {
        X: x,
        Y: y,
        code: code,
        symbol : symbol
    }

    if(paintFlag) {
        paintClick(obj);
    }

    else if(bucketFlag) {
        bucketClick(obj);
    }

    else if (highFlag) {
        selectColor(obj.code, obj.symbol);

    }
    let tileX = x + 1;
    let tileY = y + 1;
    footNote.innerText = "X: " + tileX + ", Y: " + tileY + ", Code:" + code;
} 

function undo() {
    //console.log(changes);
    changes.pop();
    //console.log(changes);
    jsonObject = mergeChanges();
    fillFlossUsage();
    //console.log('Undone')
    updateColor(jsonObject);
}

function updateColor(data) {
    for(i=0; i<data.length; i++) {
        let tileValues = data[i];
        //console.log(tileContainer.children)
        let row = tileContainer.children.item(tileValues.Y);

        let tile = row.children.item(tileValues.X)

        let alpha = 1;
        let spanColor = 'black';
        let color = 'white';
        //Check for high contrast
        if(contrastFlag && tileValues.dmcCode != 0 && tileValues.dmcCode != 1) {
            if(highFlag) {
                if(highSymbol == tileValues.symbol) {
                    spanColor = 'white';
                    color = 'black';
                }
                else {
                    alpha = 0.25;
                    spanColor = 'silver';
                }
            }
               

        }


        else {
            spanColor = (((tileValues.R * 0.299)+(tileValues.G * 0.587)+(tileValues.B * 0.114)) > 186) ? 'black' : 'white';

            if(highFlag && highSymbol != tileValues.symbol ) {
                alpha = 0.25;
                spanColor = (((tileValues.R * 0.299)+(tileValues.G * 0.587)+(tileValues.B * 0.114)) > 186) ? 'silver' : 'white';
            }

            color = "rgba(" + tileValues.R + ", " + tileValues.G + ", " + tileValues.B + "," + alpha + ")";
        }
        //tile.setAttribute('style', color)
        
        
        tile.style.backgroundColor = color;
        let X = tileValues.X + 1;
        let Y = tileValues.Y + 1;
        let tileTitle = tileValues.dmcCode + " - " + tileValues.dmcName + " - X: " + X + " - Y: " + Y
        tile.setAttribute('title', tileTitle)

        let tileClick = "tileClick(" + tileValues.X + ", " + tileValues.Y + ", " + tileValues.dmcCode + ", \"" + tileValues.symbol + "\")";
            
        tile.setAttribute('onclick', tileClick);

        //tile.children.item(0).innerHTML = tileValues.symbol;
        tile.children.item(0).innerText = tileValues.symbol;

        tile.children.item(0).style.color = spanColor;

    }
}

function zoomIn() {
    const collection = document.getElementsByClassName("tile");
    let height = collection[0].offsetHeight;
    if(height < MAX_HEIGHT) {
        let newHeight = height + 2;
        setHeight(newHeight);
    }
    console.log('IN');
    
}

function zoomOut() {
    const collection = document.getElementsByClassName("tile");
    let height = collection[0].offsetHeight;
    if(height > MIN_HEIGHT) {
        let newHeight = height - 2;
        setHeight(newHeight);
    }
    console.log('IN');
    
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
    //console.log("Changed size")

    var body = document.body;
    html = document.documentElement;

    //var height = Math.max( body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight );
    //console.log(body.offsetHeight);
    var height = body.offsetHeight - 130 - 25; // total minus the 2 toolbars and some margin

    tileContainer.style.height = height+"px";
    //console.log(tileContainer.style)

}, true);

