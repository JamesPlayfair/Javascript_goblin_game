# javascript_goblin_game
Realtime 2D video game using javascript canvas object.

Written as an attempt to interest my son in learning javascript.  To run the game, simply point a browser at index.html.

Players guide:

A randomly generated maze contains a treasure chest full of gold and a number of invisible goblins who are out to steal that gold.
The mouse cursor reveals goblins within a small radius, and left mouse click digs a pit trap that the goblins will fall into.
Another click on the trap fills it in, disposing of any goblins that have been trapped.  Note that a trap will only hold 
a limited number of goblins, after which others will rescue them and fill in the trap.  Also, they will dig their own way
out after a short period, so it is important to keep filling in the trap and digging a new one.  Only one trap can operate 
at a time.

If a goblin reaches the treasure, it will momentarily glow as it steals some gold, and a distinctive sniggering will
be heard.  You can rescue the gold by killing that goblin before it reaches the edge of the maze, otherwise both 
gold and goblin will leave the game.  The game is lost if the chest is completely emptied.

When all goblins are dead, the level is complete.  Each successive level adds more gold to the chest and has more and 
faster goblins.

With each kill, the area revealed around the cursor enlarges, and after a certain number of kills the player is rewarded with 
a greater number of traps,  a portal system for relocating goblins, and eventually, a powerful 'area of effect'
bomb activated by double-clicking.   

