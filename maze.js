const RANDOM = -1;
const GO_FORWARD = 0;
const TURN_RIGHT = 1;
const TURN_BACK = 2;
const TURN_LEFT = 3;

const LEFT_HANDER = [TURN_LEFT,GO_FORWARD,TURN_RIGHT,TURN_BACK];
const RIGHT_HANDER = [TURN_RIGHT,GO_FORWARD,TURN_LEFT,TURN_BACK];
const STUBBORN_GOBLIN = [GO_FORWARD,TURN_LEFT,TURN_RIGHT,TURN_BACK];
const RANDOM_GOBLIN = [RANDOM,GO_FORWARD,TURN_RIGHT,TURN_BACK];

const TOP = 1;
const RIGHT = 2;
const BOTTOM = 4;
const LEFT = 8;
const ALL_DIRECTIONS = 15;

const TREASURE = 16;
const GOBLIN_TRAP = 32;
const DEAD_GOBLIN = 64;
const PORTAL_ENTRANCE = 128;
const PORTAL_EXIT = 256;

const GOBLINS_PER_LEVEL = 10;
const GOLD_IN_CHEST = 1000;
const GOLD_STEAL_AMOUNT = 100;
const MAX_TRAPPED_GOBLINS = 5;
const FRAMES_PER_SECOND = 60;
const MAX_GOBLIN_SPEED = 7;
const GOBLIN_KILLS_PER_TRAP = 15;
const MAX_TRAPS = 5;
const MAX_DETECT_RANGE = 150;
const DETECT_RANGE_FOR_PORTAL = 75;
const DETECT_RANGE_FOR_BOMB = 100;
const TRAP_LIFETIME_MSECS = 10000;
const PORTAL_LIFETIME_MSECS = 30000;
const CORPSE_LIFETIME_MSECS = 3000;
const CELLSIZE = 30;  // can't change this much without redoing all the following bitmap sources!
const GAME_OVER_LABEL = "Game Over!";

var tadaaa;
var bombRechargeSound;
var loserSound;
var goblinWhispering;
var portalPopSound;
var zapSound;
var portalSuckSound;
var goblinCackle;
var goblinDeathCry;
var goblinStuckMsg;
var goblinAngryDeathCry;
var treasurePic;
var goblinPic;
var goblinTriumphPic;
var goblinTrapPic;
var goblinInvisiblePic;
var deadGoblinPic;
var portalInPic;
var portalOutPic;
var uniqueID = 1;  // source of all object IDs
var maze;  // contains the entire maze definition

//-------------------------------------------------------------

function init() {

    // create the maze
    maze = new Maze("maze",CELLSIZE);  
    maze.initCells();
    maze.generateMaze();

    // load images and sounds
    goblinWhispering=new Array();
    goblinWhispering.push(preloadSound("whisper2.mp3"));
    goblinWhispering.push(preloadSound("whisper3.mp3"));
    goblinWhispering.push(preloadSound("whisper4.mp3"));
    goblinWhispering.push(preloadSound("whisper5.mp3"));
    goblinWhispering.push(preloadSound("whisper6.mp3"));
    goblinWhispering.push(preloadSound("whisper7.mp3"));
    goblinDeathCry=new Array();
    goblinDeathCry.push(preloadSound("deathCry1.mp3"));
    goblinDeathCry.push(preloadSound("deathCry2.mp3"));
    goblinDeathCry.push(preloadSound("deathCry3.mp3"));
    goblinDeathCry.push(preloadSound("deathCry4.mp3"));
    goblinDeathCry.push(preloadSound("deathCry5.mp3"));
    goblinStuckMsg=new Array();
    goblinStuckMsg.push(preloadSound("stuckMsg3.mp3"));
    goblinStuckMsg.push(preloadSound("stuckMsg4.mp3"));
    bombRechargeSound=preloadSound("bombRecharge.mp3");
    tadaaa=preloadSound("tadaaa.mp3");
    loserSound=preloadSound("loser.mp3");
    portalSuckSound=preloadSound("suck.mp3");
    portalPopSound=preloadSound("pop.mp3");
    zapSound=preloadSound("zap.mp3");
    goblinAngryDeathCry=preloadSound("angryDeathCry.mp3");
    goblinCackle=preloadSound("goblinCackle.mp3");
    goblinTriumphPic=preloadImage("goblinTriumph.png");   
    goblinPic=preloadImage("goblin.png");
    goblinTrapPic=preloadImage("goblinTrap.png");
    goblinGhostlyPic=preloadImage("goblinGhostly.png");
    deadGoblinPic=preloadImage("deadgoblin.png");
    portalInPic=preloadImage("portalin.png");
    portalEffectPic=preloadImage("portaleffect.png");
    portalOutPic=preloadImage("portalout.png");
    treasurePic=preloadImage("treasure.png",function(){maze.drawMaze()}); // draw maze only after last pic is loaded 
}

//-------------------------------------------------------------

function preloadImage(bitfilename,onloadfunc) {

    var image=new Image();
    if(onloadfunc)image.onload = onloadfunc;
    image.src = "pics/"+bitfilename;
    return image;
}

function preloadSound(soundfile) {

    var audio = new Audio("sounds/"+soundfile);
    return audio;
}

//-------------------------------------------------------------

function Maze(canvasObjectID,cellSize) {

    this.cellSize = cellSize;
    this.cells = new Array();
    this.goblins = new Map();
    this.traps = new Map();
    this.chests = new Map();
    this.portalEnabled = false;
    this.portal;
 
    this.level = 1;
    this.killCount = 0;
    this.triumphantKillCount = 0;
    this.retiredCount = 0;
    this.looterCount = 0;
    this.maxTrapsAtOnce = 1;
    this.trapLifetime = TRAP_LIFETIME_MSECS;
    this.mouseLocation;
    this.bombEnabled = false;
    this.bombExploding = false;
    this.bombRecharged = false;
    this.bombLocation;
    this.intervalTimerID;
    this.redrawTimerID;


    //--------all the maze functions---------------------------------------------------------

    this.initCells=function () {

        // size to fit screen
        this.ncols = Math.floor((window.innerWidth-20) / (this.cellSize+1));
        this.nrows = Math.floor((window.innerHeight-90) / (this.cellSize+1)); // leave some space

        this.canvas = document.getElementById(canvasObjectID);
        this.ctx = this.canvas.getContext('2d');

        this.ctx.canvas.width = this.ncols * (this.cellSize+1)-2;
        this.ctx.canvas.height = this.nrows * (this.cellSize+1)-2;
        this.size = this.canvas.getBoundingClientRect();  
    
        this.cells = new Array( this.nrows );
        for (var row = 0; row < this.nrows; row++) {
            this.cells[row] = new Array( this.ncols );
            for (var col = 0; col < this.ncols; col++) {
                this.cells[row][col]=new Room(0);   // empty room with options
            }
        }
    }

    this.createTreasure = function(gold)   {
    
        var row = Math.round( this.nrows/2 + randomInt(this.nrows/4) - this.nrows/8 );
        var col = Math.round( this.ncols/2 + randomInt(this.ncols/4) - this.ncols/8 );
        var cellLocation = new CellLocation(row,col);
        var treasureChest = new Chest(cellLocation,gold);
        this.chests.set(treasureChest.ID,treasureChest); // the maze can hold many chests
        this.setCellOptions(cellLocation, TREASURE);    // put the treasure in the room
        this.getCell(cellLocation).chestID=treasureChest.ID;    // put the treasure in the maze
        return treasureChest;
    }

    //-----------------------------------------------------------------

    this.createGoblins = function(howMany) {
        
        for(var i=0;i<howMany;i++) {

            var goblin = this.createGoblin();
            this.goblins.set(goblin.ID,goblin);
        }
    }

    //--------------------------------------------------------

    this.createGoblin = function() {

        // pick a random maze finding behaviour 
        var movementPreferences = new Array();
        movementPreferences.push(RANDOM_GOBLIN);                 // random goblin
        movementPreferences.push(STUBBORN_GOBLIN);   // stubborn goblin
        movementPreferences.push(LEFT_HANDER);   // left handed goblin
        movementPreferences.push(RIGHT_HANDER);   // right handed goblin

        // each level has faster goblins
        var speed = Math.min(randomInt(3)+this.level+1,MAX_GOBLIN_SPEED);  // with max speed

        return new Goblin(this.randomGoblinLocation(),movementPreferences[randomInt(movementPreferences.length)],speed);
    }

    //-----------------------------------------------------------------

    this.randomGoblinLocation = function() {

        var row = randomInt(this.nrows);
        var col = randomInt(this.ncols);
        var startpt = [[0, col],[this.nrows-1,col],[row,0],[row,this.ncols-1]];  // around the edge
        var pick = randomInt( startpt.length );
        return new CellLocation(startpt[pick][0],startpt[pick][1]);
     }

    
    //-----------------------------------------------------------------

    this.generateMaze = function() {

        var currentPath = new Array();
        currentPath.push(this.createTreasure().cellLocation); // start from treasure location
        this.burrowing(currentPath);   // then burrow recursively outwards throughout the entire grid 
    }
      
    //-----------------------------------------------------------------

    this.burrowing = function(currentPath) {

        // finished if currentPath is empty

        if(currentPath.length>0) {
    
            var currentCell = currentPath.pop();
            // collect all the unvisited (untunnelled) neighbours in each direction

            var neighbours=new Array();
            for(var direction of [TOP,RIGHT,BOTTOM,LEFT]) {

                var neighbour = maze.findNeighbour(currentCell,direction);
                if(neighbour && this.getCellOptions(neighbour,ALL_DIRECTIONS)==0) {  
                    neighbours.push(new Neighbour(neighbour,direction));
                }
            }

            if(neighbours.length) {  // did we find any unvisited ones?

                if(neighbours.length>1)currentPath.push(currentCell);       // current cell still belongs on the path
                neighbour = neighbours[randomInt(neighbours.length)];  // choose neighbour at random

                this.setCellOptions(currentCell,neighbour.direction);      // add tunnel to new neighbour
                this.setCellOptions(neighbour.cellLocation,changeDirection(neighbour.direction,TURN_BACK));  // tunnel goes both ways
                currentPath.push(neighbour.cellLocation);    // add to path
            }
            this.burrowing(currentPath);   //  go deeper
        }
    }
     
    //-----------------------------------------------------------------
   
    this.findNeighbour = function(cellLocation,direction) {
        var row = cellLocation.row;
        var col = cellLocation.col;

        if(direction & TOP)          row-=1;
        else if(direction & RIGHT)   col+=1;
        else if(direction & BOTTOM)  row+=1;
        else if(direction & LEFT)    col-=1;

        if(row<0 || col<0 || row>=this.nrows || col>=this.ncols) return false;
        return new CellLocation(row,col);
    }
 
    //-----------------------------------------------------------------
   
    this.drawMaze = function()  {
         
         for (var row = 0; row < this.nrows; row++) {
             for (var col = 0; col < this.ncols; col++) {
                this.drawCell(row,col) 
             }
         }

        // show any announcements
        if(this.InformationMessage && this.InformationLifetime) {
            this.showInformationMessage();
            this.InformationLifetime--;
           }

        // show the detector circle
        if(this.mouseLocation && this.intervalTimerID) {
            this.showDetectorCircle(this.mouseLocation,this.detectionRange());
        }
        // show the bomb
        if(this.bombExploding) this.bombExploding = this.expandingBlastRadius(this.bombLocation);
    }

    //-----------------------------------------------------------------

    this.dropBomb = function(canvas,mouseClick) {

        if(this.bombEnabled && this.bombRecharged) {

            this.bombLocation = new Location(mouseClick.clientX-this.size.left,mouseClick.clientY-this.size.top);
            this.dischargeBomb();
            // recharge time starts from now
            this.rechargeTimer = setTimeout(function(){maze.rechargeBomb()},this.rechargeBombMSecs());  
        }
    }

    this.expandingBlastRadius = function(location) {

        // draw a very wide stroke to get a 'blast ring' effect

        var limit = this.detectionRange();
        var ringThickness = 24;

        drawCircle(this.ctx,location,this.blastRadius*1,randomNeonColor(0.8),null,0);
        this.drawExplosionRing(location,this.blastRadius*2,ringThickness,limit,'rgba(255,255,255,0.7)');
        this.drawExplosionRing(location,this.blastRadius*3,ringThickness,limit,'rgba(255,255,255,0.6)');
        this.drawExplosionRing(location,this.blastRadius*4,ringThickness,limit,'rgba(255,255,255,0.5)');
        this.blastRadius += 8;

        return  this.blastRadius <= limit;
    }

    this.drawExplosionRing = function(location,radius,thickness,radiusLimit,color) {

        if(radius <= radiusLimit) {  // only draw it if hasn't reached the edges

            drawCircle(this.ctx,location,radius,null,color,thickness);
        }
    }

    //-----------------------------------------------------------------
   
    this.rechargeBombMSecs = function() {
        // increases with detectionRange and retirees, and decreases by killing looters
        return Math.max( 2000, Math.pow(this.detectionRange(),2)*0.4 - this.triumphantKillCount*100 + this.retiredCount*1000 );
    }

    this.dischargeBomb = function() {

        this.bombRecharged = false;
        this.bombExploding = true;
        this.blastRadius = 30;
        zapSound.play();
        this.showBombStatus();
    }

    this.rechargeBomb = function() {

        this.bombRecharged = true;
        this.bombExploding = false;
        clearTimeout( this.rechargeTimer );
        bombRechargeSound.play();
        this.showBombStatus();
    }

    this.showBombStatus = function() {

        var color = this.bombRecharged ? 'rgb(0,200,0)' : 'rgb(200,0,0)';
        var div = document.getElementById("bombStatus");
        var ctx = document.getElementById("bombStatusLight").getContext('2d');
        div.style.visibility = 'visible';
        drawCircle(ctx,new Location(8,8),6,color,'black',2);
    }

    this.redraw = function() {

        this.drawMaze();
        this.redrawTimerID=setInterval(function() {clearInterval(this.redrawTimerID)},10);
    }
   
    //-----------------------------------------------------------------

    this.moveGoblinDetector = function(canvasObject,mouseEvent)   {

        this.mouseLocation = null;
        if(mouseEvent) this.mouseLocation = new Location(mouseEvent.clientX-this.size.left,mouseEvent.clientY-this.size.top);
    }

    //-----------------------------------------------------------------

    this.showDetectorCircle = function(location,radius)   {

        drawCircle(this.ctx,location,radius,'rgba(255, 255, 255 ,0.3)','rgb(50,50,50)',2);
    }

    //-----------------------------------------------------------------

    this.displayMessage = function(message,seconds) {

        this.InformationMessage = message;
        this.InformationLifetime = FRAMES_PER_SECOND*seconds;
    }

    this.showInformationMessage = function() {

        this.ctx.font = "60px Arial";
        this.ctx.fillStyle="yellow";
        this.ctx.globalAlpha = 0.5;
        var startCol = this.ncols/2-this.InformationMessage.length/2+1;
        this.ctx.fillText(this.InformationMessage, this.canvasX(startCol), this.canvasY(6));
        this.ctx.globalAlpha = 1;
    }

    //-----------------------------------------------------------------

    this.startWave = function()  {

        // if there are still goblins around then the game is paused, otherwise it's a levelup

        if(this.goblins.size==0) {
    
            if(this.portal)this.removePortal(this.portal.ID);  // reset portal
            if(this.traps)this.traps.forEach(function(trap) {this.destroyTrap(trap.ID)},this);  // reset all traps
            if(this.bombEnabled)this.rechargeBomb(); // reset bomb

            this.createGoblins(this.level*GOBLINS_PER_LEVEL);  // reset goblin horde
            this.chests.forEach(function(chest) {chest.gold+=GOLD_IN_CHEST});  // add gold to every existing chest

            // show message
            this.displayMessage("Starting round "+this.level,2);

        } else {

            this.displayMessage("Resuming round "+this.level,1);

        }
            
        if(!this.intervalTimerID) {
            // start the goblin controller
           this.intervalTimerID = setInterval(function(){ maze.drawMaze();
                                                     maze.goblinController();     
                                                   }
                                       ,1000/FRAMES_PER_SECOND);  
       }
    }

    //-----------------------------------------------------------------

    this.stopWave = function() {

        clearInterval(this.intervalTimerID);
        this.intervalTimerID=null;
        // final timer event to get stuff drawn
        setTimeout(function(){ maze.drawMaze()},100);
    }
    
    //-----------------------------------------------------------------
    
    this.getCell  = function(cellLocation) {
    
        return this.cells[cellLocation.row][cellLocation.col];  // returns the room object
    }   

    this.getCellOptions  = function(cellLocation,options) {
    
        return this.cells[cellLocation.row][cellLocation.col].options & options;  // returns the requested bit values
    }   

    this.setCellOptions  = function(cellLocation,options) {
    
        var row=cellLocation.row;
        var col=cellLocation.col;
        this.cells[row][col].options |= options;
     }  
    
    this.clearCellOptions  = function(cellLocation,options) {
    
        var row=cellLocation.row;
        var col=cellLocation.col;
        this.cells[row][col].options -= this.cells[row][col].options & options;    
    }   

    //-----------------------------------------------------------------
    
    this.drawCell  = function(row,col) {
    
        var room = this.cells[row][col];
        var contents = room.options;
        var left = this.canvasX(col);
        var top = this.canvasY(row);
    
        this.drawCellFill(left,top);
        this.drawHorizontalBorder(contents & TOP, left, top);
        this.drawVerticalBorder(contents & RIGHT, left+this.cellSize+1, top);
        this.drawHorizontalBorder(contents & BOTTOM, left, top+this.cellSize+1);
        this.drawVerticalBorder(contents & LEFT, left, top);

        // note that non-moving things are 'part' of the maze, whereas moving things get drawn in the move function
        if(contents & TREASURE)this.drawCellContent(row,col,treasurePic);
        if(contents & GOBLIN_TRAP)this.drawCellContent(row,col,goblinTrapPic);
        if(contents & PORTAL_ENTRANCE)this.drawCellContent(row,col,portalInPic);
        if(contents & PORTAL_EXIT)this.drawCellContent(row,col,portalOutPic);
        if(contents & DEAD_GOBLIN)this.drawCellContent(row,col,deadGoblinPic);
    }

   //-----------------------------------------------------------------

    this.grantPortal = function() {

        this.portalEnabled = true;
        this.displayMessage("Portals granted",2);
        displayHints("Portals can relocate goblins for easier disposal.<br>Middle mouse click creates a blue entrance or orange exit.");
        tadaaa.play();
    }

   //-----------------------------------------------------------------

    this.setPortal = function(canvasObject,mouseClick)   {
        
        if(this.portalEnabled) {

            var cursorLocation = new Location(mouseClick.clientX-this.size.left,mouseClick.clientY-this.size.top);
            var cursorCell = this.whichCell(cursorLocation);
            var cellOptions = this.getCellOptions(cursorCell,PORTAL_ENTRANCE|PORTAL_EXIT|GOBLIN_TRAP|TREASURE);
    
            
            if(cellOptions & (PORTAL_ENTRANCE | PORTAL_EXIT)) { // removing an old one?
    
                if(cellOptions & PORTAL_ENTRANCE) this.removePortal(this.portal.ID);
                else {
                    this.portal.cellLocationOut = null;
                    this.clearCellOptions(cursorCell,PORTAL_EXIT);
                }
    
            }  
            else {
    
                if(!this.portal || this.portal.cellLocationOut) {   // starting a new one
    
                    if(this.getCellOptions(cursorCell,GOBLIN_TRAP|TREASURE)==0) {  // but not on a chest or trap
        
                        if(this.portal)this.removePortal(this.portal.ID);  // remove any previous one
                        this.portal = new Portal(cursorCell);
                        this.setCellOptions( cursorCell, PORTAL_ENTRANCE ); // draw it on each animation cycle
                        this.portal.timeout = setTimeout(function() {maze.removePortal(maze.portal.ID)},PORTAL_LIFETIME_MSECS);
                    }
        
                } else {
    
                    // finishing a new one
        
                    this.portal.exit(cursorCell);
                    this.setCellOptions( cursorCell, PORTAL_EXIT ); // draw it on each animation cycle
                }  
            }
            this.redraw();    
        }
    }

    //-----------------------------------------------------------------

    this.removePortal = function(portalID) {

        if(this.portal && this.portal.ID==portalID) {  //  make sure timeout doesn't destroy a different one

            this.clearCellOptions(this.portal.cellLocationIn,PORTAL_ENTRANCE);
            if(this.portal.cellLocationOut) {
                this.clearCellOptions(this.portal.cellLocationOut,PORTAL_EXIT);
            } else {
                // return any other dimensional goblins back to start
                this.portal.dischargeAll(this.portal.cellLocationIn);
            }
            clearTimeout(this.portal.timeout);
            this.portal = null;
        }
    }

    //-----------------------------------------------------------------


   this.setGoblinTrap = function(canvasObject,mouseClick)   {

        var cursorLocation = new Location(mouseClick.clientX-this.size.left,mouseClick.clientY-this.size.top);
        var cursorCell = this.whichCell(cursorLocation);
        var room = this.getCell(cursorCell);

        // if there is no trap or chest or portal here then create a new trap

        if(!(room.options & (GOBLIN_TRAP|TREASURE|PORTAL_ENTRANCE|PORTAL_EXIT))) {
     
            var goblinTrap = new Trap(cursorCell);
            // trap has limited lifespan
            setTimeout(function() {maze.destroyTrap(goblinTrap.ID)},this.trapLifetime);
            this.setCellOptions( cursorCell, GOBLIN_TRAP); // draw it on each animation cycle
            room.trapID = goblinTrap.ID;                    // link back to access entrapped goblins
            this.traps.set(goblinTrap.ID,goblinTrap);

            // any traps beyond the max allowed must be destroyed (oldest first)
            if(this.traps.size>this.maxTrapsAtOnce) {
                var oldestTrapID=this.traps.keys().next().value;
                this.destroyTrap(oldestTrapID);
            }
        }  
        else if(room.options & GOBLIN_TRAP) {

            // clear the trap by killing any goblins currently in this trap

            var goblinsEntrapped = this.traps.get(room.trapID).goblinsEntrapped;
            goblinsEntrapped.forEach(function(ID) {this.killGoblin(ID)},this);
            this.destroyTrap(room.trapID,cursorCell);  // delete the trap
        } 
    }

    //---------- TODO Clearly a more generic 'ASSET' object type is needed (many very similar functions) ---------------------

    this.destroyTrap = function(ID) {

        var trap = this.traps.get(ID);
        if(trap) {  // check existence, since it may have already been destroyed by some other method
            this.clearCellOptions(trap.cellLocation,GOBLIN_TRAP);  // stop drawing it
            this.getCell(trap.cellLocation).trapID = null;          // destroy reference to it
            this.traps.delete(ID);                             // delete it
        }
    }
    
    //----------------------------------------------------------------

    this.destroyChest = function(ID,cellLocation) {

        this.clearCellOptions(cellLocation ,TREASURE);  // stop drawing it
        this.getCell(cellLocation).chestID = null;          // destroy reference to it
        this.chests.delete(ID);                             // delete it
    }
   
    //----------------------------------------------------------------

    this.killGoblin = function(ID) {

        var goblin =  this.goblins.get(ID);
        if(goblin) {  // sometimes the goblin is already dead (bombed?)

            this.killCount++;
            if(goblin.triumphantFlag)this.triumphantKillCount++;
            goblin.deathCry();
 
            // return the gold to a chest
            this.chests.get(this.chests.keys().next().value).gold+=goblin.gold;

            // leave a (temporary) corpse behind
            var cellLocation = this.whichCell(goblin.centreOfGoblin());
            this.setCellOptions(cellLocation,DEAD_GOBLIN);
            setTimeout(function() {maze.clearCellOptions(cellLocation,DEAD_GOBLIN)},CORPSE_LIFETIME_MSECS); 

            this.goblins.delete(ID);  // remove him
        }
    }
 
    //---------------------------------------------------------

    this.goblinController = function() {

        // check for win/lose conditions
        if(this.chests.size==0 || this.goblins.size==0) {

            this.stopWave();
            if(this.chests.size==0) {

                this.displayMessage(GAME_OVER_LABEL+" Goblins stole everything",2);
                labelStartButton(GAME_OVER_LABEL);  
                loserSound.play();

            } else {

                this.displayMessage("You survived round "+this.level,2);
                tadaaa.play();
            }
            this.level++;
            labelStartButton("Start round "+this.level);  
            this.redraw();
        }

        var previousLooterCount = this.looterCount;

        // let goblins do their thing including stealing
        this.goblins.forEach(function(goblin) {maze.moveGoblin(goblin)});

        // warning about looting goblins (first time only)
        if(!previousLooterCount && this.looterCount>0) {

            this.displayMessage("A goblin looted your chest",2);
            displayHints("Get your gold back by killing the goblin<br>before it reaches the edge of the maze.")
        }

        // update stats 
        var totalGold = 0;
        this.chests.forEach(function(chest) {totalGold+=chest.gold})
        displayStats("Live: "+this.goblins.size+"    Treasure: "+totalGold+"    Dead: "+this.killCount+"    Retired: "+this.retiredCount);

        // give rewards and powerups

        if(this.maxTrapsAllowed()>this.maxTrapsAtOnce)this.grantMoreTraps();  // more traps
     
        if(this.detectionRange()>DETECT_RANGE_FOR_BOMB && !this.bombEnabled)this.grantBomb(); // the bomb

        if(this.detectionRange()>DETECT_RANGE_FOR_PORTAL && !this.portalEnabled) this.grantPortal();  // portals somewhere in round 3

    }

    //------------------------------------------------------------------------

    this.grantMoreTraps = function() {

        this.maxTrapsAtOnce = this.maxTrapsAllowed();
        if(this.maxTrapsAtOnce<MAX_TRAPS)this.displayMessage("More traps",2);
        displayHints("You can now lay "+this.maxTrapsAtOnce+" traps at once. <br>Kill more goblins to enable more traps.");
        tadaaa.play();
    }

    this.maxTrapsAllowed = function() {

        return Math.min(Math.round(this.killCount/GOBLIN_KILLS_PER_TRAP)+1,MAX_TRAPS);
    }
    
    //------------------------------------------------------------------------
    
    this.grantBomb = function() {

        this.bombEnabled = true;
        this.rechargeBomb();
        this.displayMessage("Bomb granted",2);
        displayHints("Double-click to drop a bomb and kill all goblins in range.<br>Kill looters to reduce recharge time.");
        tadaaa.play();
    }

    //------------------------------------------------------------------------

    this.moveGoblin = function(goblin) {

        var room = new Room;
        goblin.lifespan++;   // constantly getting older (and grumpier)
        if(goblin.showing)goblin.showing--;   // visibility slowly wears off
        if(goblin.otherDimensionFlag)  {  // special effects and processing for entering portal

            if(goblin.showing)this.ctx.drawImage(portalEffectPic,goblin.location.x,goblin.location.y);      // flash

        }
        else {

            var goblinImage = goblin.triumphantFlag ? goblinTriumphPic : goblinPic;
            var inTheRoom = goblin.location.at(this.whichLocation(goblin.targetCellLocation));
            if(inTheRoom) {  // goblin has reached their target cell - what next?

                room = this.getCell(goblin.targetCellLocation);
                var goblinStopped = false;  
    
                // decide if goblin is partially visible
                if(randomInt(100)<4) goblin.showing = FRAMES_PER_SECOND/4; // visible for about quarter of a second
    
                if(room.options & PORTAL_ENTRANCE) {
    
                    this.portal.goblinIn(goblin);
                    goblin.showing = FRAMES_PER_SECOND/4;
                    goblinStopped = true;
                }

                if(room.options & PORTAL_EXIT) {
    
                    goblin.showing = FRAMES_PER_SECOND/2;

                }

                if(room.options & TREASURE) {  // the goblin is at a chest
    
                    this.stealSomeGold(goblin,room.chestID);
                    this.ctx.drawImage(goblinImage,goblin.location.x,goblin.location.y);      // fully visible 
                    goblin.showing = FRAMES_PER_SECOND*2;          //  visible for a few seconds
                }
    
                if(room.options & GOBLIN_TRAP) {  // goblin is standing on a trap
    
                    this.ctx.drawImage(goblinImage,goblin.location.x,goblin.location.y);  // visible 
                    var theTrap = this.traps.get(room.trapID);
                    if(theTrap.goblinsEntrapped.has(goblin.ID)) {  // the goblin is already in the trap?
    
                        goblinStopped = true;    
    
                    } else {
    
                        if(theTrap.goblinsEntrapped.size < MAX_TRAPPED_GOBLINS) {
                            // trap the goblin
                            theTrap.goblinsEntrapped.set(goblin.ID,goblin.ID);
                            goblin.stuckVoice();
                            goblinStopped = true;   
                        }
                    }
                } 
    
                if(goblin.triumphantFlag && this.isEdgeOfMaze(goblin.targetCellLocation)) {  // goblin can retire
    
                    this.goblins.delete(goblin.ID);
                    this.retiredCount++;
                    goblinStopped = true;
                }
                
                if(!goblinStopped) {
    
                    // note that if the goblin becomes 'frustrated' it could wise up and become left or right handed
                    if(goblin.isFrustrated())goblin.getSmarterAndFaster();
                    goblin.moveAccordingToAI(room.options);
                }
            } 
            else {
    
                // haven't fully reached the target cell, so nudge the goblin another step in the right direction 
                goblin.location = this.calculateIntermediateLocation(goblin.location,this.whichLocation(goblin.targetCellLocation),goblin.framesPerCell());

            } 

            if(this.bombExploding && !(room.options & GOBLIN_TRAP)) {  // trapped goblins are safe from bomb (paradoxically)

                if(distanceBetweenCoords(goblin.centreOfGoblin(),this.bombLocation) < this.blastRadius) this.killGoblin(goblin.ID);
            } 

            if(this.mouseLocation) {  // check for detection or partial detection 

                var threshold = distanceBetweenCoords(goblin.centreOfGoblin(),this.mouseLocation) - this.detectionRange();
                if(threshold<0) {

                    this.ctx.drawImage(goblinImage,goblin.location.x,goblin.location.y);      // visible
                    if(inTheRoom && !goblinStopped)goblin.whisper();                         // and audible
    
                } else if(threshold < 10) goblin.showing = Math.round(goblin.framesPerCell()/2);  // partially visible
            }

            if(goblin.showing) {
                var showPic = goblinGhostlyPic;
                if(goblin.triumphantFlag && goblin.showing > FRAMES_PER_SECOND)showPic = goblinTriumphPic;
                this.ctx.drawImage(showPic,goblin.location.x,goblin.location.y);     
            }
        }
    }  

   //---------------------------------------------------

    this.stealSomeGold = function(goblin,chestID) {

    var chest=this.chests.get(chestID);
    var stolenGold = Math.min(randomInt(GOLD_STEAL_AMOUNT)+GOLD_STEAL_AMOUNT,chest.gold);   // goblins steal - who'd think!
    goblin.gold += stolenGold;
    chest.gold -= stolenGold;
    goblinCackle.play();
    goblin.triumphantFlag = true;
    goblin.goFaster();
    this.looterCount++;
    if(chest.gold<=0)this.destroyChest(chestID,goblin.targetCellLocation);  // goblins stole the whole lot
    }

    //---------------------------------------------------

    this.isEdgeOfMaze = function(cellLocation) {

        return (cellLocation.row==0 || cellLocation.row==this.nrows-1 || cellLocation.col==0 || cellLocation.col==this.ncols-1 );
    }

    //---------------------------------------------------

    this.calculateIntermediateLocation = function(location,targetLocation,framesPerCell) {

        // calculate current progress
        var dist = distanceBetweenCoords(location,targetLocation);
        var stepsLeft = Math.round(dist*framesPerCell/this.cellSize);
        var nextLocation=targetLocation;
        if(stepsLeft>1) {
            // calculate a ratio on both x's and y's so as not to bother about direction
            nextLocation.x = location.x + (targetLocation.x-location.x)/stepsLeft;
            nextLocation.y = location.y + (targetLocation.y-location.y)/stepsLeft;
        }
        return nextLocation;
    }
 
    //-----------------------------------------------------------------

    this.detectionRange = function () {
    
        return Math.min(this.killCount+20,MAX_DETECT_RANGE);
    }
   
    this.drawCellContent = function(row,col,image)  {
    
        this.ctx.drawImage(image,this.canvasX(col),this.canvasY(row));
    }
    
    this.drawCellFill = function(x,y) {
    
        this.ctx.fillStyle=this.chooseDrawColor(1);
        this.ctx.fillRect(x,y,this.cellSize,this.cellSize);
    }
    
    this.whichLocation = function(someCell) {

        return new Location(this.canvasX(someCell.col),this.canvasY(someCell.row))
    }

    this.whichCell=function(location) {
            
        return new CellLocation(Math.floor((location.y-2)/(this.cellSize+1)),Math.floor((location.x-2)/(this.cellSize+1)));  
    }

    this.canvasX = function(col) {

        return (this.cellSize+1) * col -1;
    }

    this.canvasY = function(row) {

        return (this.cellSize+1) * row -1;
    }

    this.distanceBetweenCells = function(cell1,cell2) {

        return distanceBetween(cell1.row,cell1.col,cell2.row,cell2.col);
    }
 
    this.chooseDrawColor = function(value) {
    
        return (value>0 ? 'rgb(160, 160, 160)' : 'black');  // draw or erase line
    }
    
    this.chooseDrawThickness = function(value) {
    
        return (value>0 ? 2 : 1);  // discovered that erase lines need to be thicker to fully overwrite underlying lines
    }
    
    this.lineOffset = function(value) {
    
        return (value>0 ? 0 : 2);  // erase lines need to be drawn with a slight offset
    }
    
    this.drawVerticalBorder = function(value, x, y) {
    
        drawLine(this.ctx,x,y-this.lineOffset(value)+1,x,y+this.cellSize+this.lineOffset(value),this.chooseDrawColor(value),this.chooseDrawThickness(value))
    }
    
    this.drawHorizontalBorder = function(value, x, y) {
    
        drawLine(this.ctx,x-this.lineOffset(value),y,x+this.cellSize+this.lineOffset(value),y,this.chooseDrawColor(value),this.chooseDrawThickness(value))
    }
}

//------------------------------- end of maze class methods, start of public functions ---------------------------------

function Goblin(cellLocation,movementPreferences,speed) {

    this.ID = uniqueID++;
    this.targetCellLocation = cellLocation;
    this.location = maze.whichLocation(cellLocation);
    this.currentDirection = ALL_DIRECTIONS;
    this.movementPreferences = movementPreferences;
    this.speed = speed;
    this.showing = 0;
    this.otherDimensionFlag = false;
    this.gold = randomInt(4);
    this.triumphantFlag = false;
    this.lifespan = 0;
    this.inTrapID;

    this.whisper = function () {

        if(randomInt(50)) goblinWhispering[randomInt(4)].play();  // fifty times more likely to play the first sounds
        else if(!this.triumphantFlag) goblinWhispering[randomInt(goblinWhispering.length)].play();  // otherwise any sound
    }

    this.deathCry = function () {
    
        if(this.triumphantFlag)  goblinAngryDeathCry.play()
        else goblinDeathCry[randomInt(goblinDeathCry.length)].play();
    }

    this.stuckVoice = function () {
    
        if(!this.triumphantFlag) goblinStuckMsg[randomInt(goblinStuckMsg.length)].play();
    }

    this.framesPerCell = function() {
        return FRAMES_PER_SECOND/this.speed;
    }

    this.centreOfGoblin = function() {
        return new Location(this.location.x + 15,this.location.y + 15);  // centre according to goblin bitmap
    }

    this.isFrustrated = function() {
        return (this.lifespan>FRAMES_PER_SECOND*60);  // old and poor
    }

    this.getSmarterAndFaster = function() {

        if(this.movementPreferences[0]==RANDOM) {
            this.movementPreferences=LEFT_HANDER;
            this.goFaster();
        } else if(this.movementPreferences[0]==GO_FORWARD) {
            this.movementPreferences=RIGHT_HANDER;
            this.goFaster();
        }
    }

    this.goFaster = function() {

        this.speed=Math.min(this.speed++,MAX_GOBLIN_SPEED);
    }

    this.teleport = function(toCell) {

        this.targetCellLocation = toCell;
        this.location = maze.whichLocation(this.targetCellLocation);
        this.showing = this.framesPerCell()*2;
        portalPopSound.play();
    }

    //---------- (basic maze negotiation) ---------------------

    this.moveAccordingToAI = function(options) {

        var direction = this.chooseDirection(options);
        if(direction & options) {
            this.targetCellLocation = maze.findNeighbour(this.targetCellLocation,direction);
            this.currentDirection = direction; 
        }
    } 

    this.chooseDirection = function(options) {

        var newDirection=this.currentDirection;

        for(var i=0;i<this.movementPreferences.length;i++) {
            newDirection = changeDirection(this.currentDirection,this.movementPreferences[i]);
            if(options & newDirection) return newDirection;
        }

    return newDirection;      // should never get here   
    } 
}

function Trap(cellLocation) {

    this.ID = uniqueID++;
    this.cellLocation=cellLocation;
    this.goblinsEntrapped=new Map();
}

function Portal(cellLocation) {

    this.ID = uniqueID++;
    this.cellLocationIn=cellLocation;
    this.cellLocationOut=null;
    this.goblinsInTransit=new Array();
    this.rechargeTime=0;

    this.exit = function(cellLocationOut) {

        this.cellLocationOut=cellLocationOut;
        this.dischargeAll(cellLocationOut);
    }

    this.goblinIn = function(goblin) {

        if(this.cellLocationOut) {

            goblin.teleport(this.cellLocationOut);

        } else {

            this.goblinsInTransit.push(goblin);
            goblin.otherDimensionFlag = true;
        }
        portalSuckSound.play();
    }

    this.dischargeAll = function(cellLocationOut)  {

        if(this.goblinsInTransit.length) {

            this.goblinsInTransit.forEach(function(goblin) {

                goblin.otherDimensionFlag = false;
                goblin.teleport(cellLocationOut)});

            this.goblinsInTransit = new Array();
        }
    }
}

function Room(initialOptions) {

        this.options = initialOptions;
        this.chestID;
        this.trapID;
}

function Chest(cellLocation) {

    this.ID = uniqueID++;
    this.cellLocation = cellLocation;
    this.gold = 0;
}

function Neighbour(cellLocation,direction) {

    this.cellLocation = cellLocation;
    this.direction=direction;
}

function CellLocation(row,col) {
    
    this.row=row;
    this.col=col;
    this.at=function(otherCellLocation) {
        return (otherCellLocation.row==this.row && otherCellLocation.col==this.col);
    }
}

function Location(x,y) {

    this.x=x;
    this.y=y;
    this.at=function(otherLocation) {
        return (otherLocation.x==this.x && otherLocation.y==this.y);
    }
}

//-------------------------------------------------------

function changeDirection(currentDirection,newCompassBearing) {

    var allDirections = [TOP,RIGHT,BOTTOM,LEFT];  // organised in a compass wheel order

    if(newCompassBearing==RANDOM) return allDirections[randomInt(allDirections.length)];

    for(var i=0;i<allDirections.length;i++) {
        if(currentDirection & allDirections[i]) return allDirections[(i+newCompassBearing)%(allDirections.length)];
    }
    return currentDirection;  // couldn't compute - continue straight
}

function drawLine(ctx,x1,y1,x2,y2,color,thickness) {
    
    ctx.beginPath(); 
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.lineWidth = thickness;
    ctx.strokeStyle = color;
    ctx.stroke();
}

function displayStats(text) {

    var statusElement = document.getElementById('status');
 //   statusElement.style.backgroundColor = maze.chooseDrawColor(1);
    statusElement.innerHTML = text;
}

function displayHints(text) {

    var hintsElement = document.getElementById('hints');
    hintsElement.innerHTML = text;
    setPointerVisible(true);
    setTimeout(function(){setPointerVisible(false)},4000);
}

function labelStartButton(text) {

    var startButton = document.getElementById('startbutton');
    startButton.value = text;
    if(text.localeCompare(GAME_OVER_LABEL)==0)startButton.disabled=true;
}

function setPointerVisible(visibleFlag) {

    var pointer = document.getElementById("pointer");
    pointer.style.visibility = visibleFlag ? 'visible' : 'hidden' ;
}

function distanceBetweenCoords(location1,location2) {

    return distanceBetween(location1.x,location1.y,location2.x,location2.y);
}

function distanceBetween(x1,y1,x2,y2) {

    return Math.round(  Math.sqrt(
        Math.pow(x2 - x1,2) 
        + Math.pow(y2 - y1,2)));
}

function randomInt(upTo) {
    
    return Math.floor(Math.random()*upTo);
}

function drawCircle(ctx,location,radius,fillColor,strokeColor,strokeWidth) {

    ctx.beginPath();
    ctx.arc(location.x,location.y,radius,0,2*Math.PI);
    if(strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
    }
    if(fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fill();  
    }
}

function randomNeonColor(opacity) {

    var colors = [randomInt(56)+200,randomInt(56)+200,randomInt(56)+200,opacity];
    var rgba = colors.join();
    return 'rgba('+rgba+')';
}