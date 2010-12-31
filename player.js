/*
bPlayer: in-page frame-based animation player
Written by Matt Cooley <coolio55+dev@gmail.com>

Version 1.0.6

Changelog:
	1.0 - First feature-complete version
	1.0.1 - Made IE fail and follow link in case deployed inside a <p> (see notes)
	1.0.2 - In the previous versions, failure in initializing a player would cause the browser
			to follow the link where it was deployed. This is OK except when the link is set to
			open in a new window (with target="_blank" or otherwise), because the link would get
			replaced with the empty player box. This version adds code to put the link back in
			case of failure so that everything's back to normal.
	1.0.3 - If a deployment fails, it will now set a flag that prevents attempting a future deployment.
			Added a gradient to the progress bar and tweaked some colors and fonts.
	1.0.4 - Now shows a normal cursor rather than a text selection cursor when mousing over the frame
			indication numbers. Some minor documentation changes.
	1.0.5 - Adjusted borders and colors to "soften" the feel of the UI.
	1.0.6 - Fixed a bug that surfaced in IE on closing the player where an invald style value was
			passed as the player was closing.
	
Implementation:
	In <head>, put:
		<link rel="stylesheet" type="text/css" href="player.css" />
		<script type="text/javascript" src="player-min.js"></script>
		<script type="text/javascript">
			var myPlayer = new bPlayer(28, 'gif/blah', '.gif', '&copy;2009 This is a caption');
			var additionalPlayer = new bPlayer(28, 'gif/newblah', '.gif', '&copy;2009 This is another caption');
			...and repeat for each player on the page...
		</script>
	Where player is to appear, put:
		<a href="alternate_page.html" onclick="return myPlayer.deploy(this);">Link Text</a>
		<a href="another_alternate_page.html" onclick="return additionalPlayer.deploy(this);">Another Link Text</a>
		...etc...

Notes:
- player.js is the main javascript file. player-min.js is a 'minified' file (using JSMin,
	see about.html for a link) that is intended to save bandwidth with a smaller file size.
	While player-min.js is not very human-readable, it should be functionally identical to
	player.js. This is actually very effective - the file is reduced from around 15k to
	around 9k just by removing unimportant whitespace, comments, etc.
- IE will fail to display the player if it's deployed inside a <p> or any other tag that shouldn't
	contain block-level elements. If you do so by mistake, I've added code that will make IE
	just follow the link, rather than leave the user staring at a blank gray box. Still, don't deploy
	inside a <p>.
- If you don't use a DOCTYPE, IE will render in quirks mode and there will be a few
	minor rendering bugs. These bugs do not affect the script's usability, but they
	cause a few of the controls to be 'uglified'. Add an (X)HTML DOCTYPE to the page
	(like I have in my example index.html) and everything will be OK.
- To my knowledge, the script is XHTML and CSS standards compliant and will work fine in a
	page that is XHTML/HTML/CSS standards compliant. It will also work fine in
	non-standards-compliant environments, with the exception of the rendering bugs in IE
	mentioned above.
			
All features tested to work as expected in:

	Gecko:
		* Firefox 3 / WinXP
		* Firefox 3 / Vista
		* Firefox 3 / Mac
		* Firefox 2 / WinXP
		* Camino 1.6 / Mac
		
	WebKit:
		* Google Chrome 1.0 / WinXP
		* Safari 3.1 / WinXP
		* Safari 3.2 / Mac
		
	Trident:
		* Internet Explorer 7 / WinXP (Minor display bugs without DOCTYPE, see above)
		* Internet Explorer 7 / Vista (Same display bugs)
		* Internet Explorer 6 / WinXP (Ugly because of lack of transparent PNG support, but still usable)
	
	Opera:
		* Opera 9.5 / WinXP
*/

function bPlayer(numOfSlides, imagePrefix, imageSuffix, caption)
{
	var me = this;
	this.aboutPageURL = 'about.html';
	this.okToDeploy = null;
	if (numOfSlides)
	{
		this.slides = numOfSlides;
	}else{
		this.okToDeploy = false;
	}
	
	if (imagePrefix)
	{
		this.imagePrefix = imagePrefix;
	}else{
		this.imagePrefix = '';
	}
	
	if (imageSuffix)
	{
		this.imageSuffix = imageSuffix;
	}else{
		this.imageSuffix = '';
	}
	
	if (caption)
	{
		this.caption = caption;
	}else{
		this.caption = '';
	}
	//the rest of the important stuff in the constructor continues waaay down at the bottom...
	//now for some function declarations
	
	this.resetVars = function()
	{
		me.currentSlide = 1;
		me.rootNode = document.createElement('div');
		me.rootNode.className = 'playerContainer';
		me.oldNode = undefined;
		me.isDeployed = false;
		me.speed = 1000;
		me.direction = 1;
		me.intervalId = false;
	};

	this.animateOpenClose = function()
	{
		if (me.direction > 0)
		{
			var newHeight = parseInt(me.rootNode.offsetHeight, 10) + 30;
			var newWidth = parseInt(me.rootNode.offsetWidth, 10) + 34.8;
			if (newHeight < 450)
			{
				me.rootNode.style.height = newHeight + 'px';
				me.rootNode.style.width = Math.round(newWidth) + 'px';
			}else if (newHeight >= 450){
				clearInterval(me.intervalId);
				me.intervalId = false;
				me.rootNode.style.height = 450 + 'px';
				me.rootNode.style.width = 522 + 'px';
				me.dumpContents();
			}
		}else{
			var newHeight = parseInt(me.rootNode.offsetHeight, 10) - 30;
			var newWidth = parseInt(me.rootNode.offsetWidth, 10) - 34.8;
			if (newHeight > 0)
			{
				me.rootNode.style.height = newHeight + 'px';
				me.rootNode.style.width = Math.abs(Math.round(newWidth)) + 'px';
			}else if (newHeight <= 0){
				clearInterval(me.intervalId);
				me.intervalId = false;
				me.rootNode.style.height = 0 + 'px';
				me.rootNode.style.width = 0 + 'px';
				me.restoreOldNode();
			}
		}
	};

	this.restoreOldNode = function()
	{
		if (me.rootNode)
		{
			me.rootNode.parentNode.replaceChild(this.oldNode, this.rootNode);
		}
		me.isDeployed = false;
		me.resetVars();
		return false;
	};

	this.unDeploy = function(e, animate)
	{
		if (animate !== false)
		{
			animate = true;
		}
		me.halt();
		me.getMy('Close').onclick = null;
		me.getMy('GoFirst').onclick = null;
		me.getMy('GoBack').onclick = null;
		me.getMy('GoForward').onclick = null;
		me.getMy('GoLast').onclick = null;
		me.getMy('PlayPause').onclick = null;
		me.getMy('SpeedSelect').onchange = null;
		me.getMy('DirectionSelect').onchange = null;
		me.getMy('TotalBar').onmousedown = null;
		me.rootNode.innerHTML = '';
		if (animate)
		{
			me.direction = -1;
			me.intervalId = setInterval(me.animateOpenClose, 8);
		}else{
			me.restoreOldNode();
		}
		return false;
	};

	this.dumpContents = function()
	{
		//dump innerHTML into root
		//IE fails here if you deployed inside a <p> or something else that can't handle block-level content
		me.rootNode.innerHTML = '<div class="playerControls"><div class="playerMainControls"><a class="playerPlayPause" href="#" onclick="return false;" onmouseup="this.blur()">Play</a><a class="playerClose" title="Close this player" href="#" onclick="return false;" onmouseup="this.blur();">Close</a><div class="playerSpeedControls">Speed:<select class="playerSpeedSelect"><option value="2000">Very Slow</option><option value="1500">Slow</option><option value="1000" selected="true">Medium</option><option value="500">Fast</option><option value="200">Very Fast</option></select></div><div class="playerDirectionControls">Direction:<select class="playerDirectionSelect"><option value="1" selected="true">Forward</option><option value="-1">Reverse</option></select></div></div><div class="playerFrameBar"><a class="playerGoFirst" title="Go to the beginning" href="#" onclick="return false;" onmouseup="this.blur();"></a><a class="playerGoBack" title="Go back one frame" href="#" onclick="return false;" onmouseup="this.blur();"></a><div class="playerTotalBar"><div class="playerElapsedSlides">' + me.currentSlide + '</div><span class="playerElapsedBar"></span><div class="playerTotalSlides">' + me.slides + '</div></div><a class="playerGoForward" title="Go forward one frame" href="#" onclick="return false;"onmouseup="this.blur();"></a><a class="playerGoLast" title="Go to the end" href="#" onclick="return false;"onmouseup="this.blur();"></a></div></div><div class="playerFrame"><img class="playerImage" alt="Animation Frame" src="' + me.getImageName() + '" /></div><div class="playerFooter">' + me.caption + '<a class="playerAboutLink" href="' + me.aboutPageURL + '" onclick="window.open(\'' + me.aboutPageURL + '\'); return false;">About this player</a></div>';			
		
		//set up UI event handlers
		me.getMy('Close').onclick = this.unDeploy;
		me.getMy('GoFirst').onclick = this.goToBeginning;
		me.getMy('GoBack').onclick = this.stepBack;
		me.getMy('GoForward').onclick = this.stepForward;
		me.getMy('GoLast').onclick = this.goToEnd;
		me.getMy('PlayPause').onclick = this.play;
		me.getMy('SpeedSelect').onchange = this.setSpeedFromMenu;
		me.getMy('DirectionSelect').onchange = this.setDirectionFromMenu;
		me.getMy('TotalBar').onmousedown = this.handleBarDown;
		
		//draw first frame
		me.drawFrame();
	};
	
	this.play = function()
	{
		me.halt();
		if (me.direction > 0)
		{
			if (me.currentSlide === me.slides)
			{
				me.goToBeginning();
			}
			me.intervalId = setInterval(me.stepForward, me.speed);
		} else if (me.direction < 0) {
			if (me.currentSlide === 1)
			{
				me.goToEnd();
			}
			me.intervalId = setInterval(me.stepBack, me.speed);
		}
		me.getMy('PlayPause').onclick = me.halt;
		me.getMy('PlayPause').innerHTML = 'Pause';
		me.getMy('PlayPause').style.backgroundPosition = '-79px -64px';
		return false;
	};

	this.halt = function()
	{
		clearInterval(me.intervalId);
		me.intervalId = false;
		me.getMy('PlayPause').onclick = me.play;
		me.getMy('PlayPause').innerHTML = 'Play';
		me.getMy('PlayPause').style.backgroundPosition = '-79px -32px';
		return false;
	};

	this.goToBeginning = function()
	{
		me.currentSlide = 1;
		me.drawFrame();
		return false;
	};

	this.goToEnd = function()
	{
		me.currentSlide = me.slides;
		me.drawFrame();
		return false;
	};

	this.goTo = function(which)
	{
		if (which <= me.slides && which >= 1)
		{
			me.currentSlide = which;
		} else if (which < 1) {
			me.goToBeginning();
		} else if (which > me.slides) {
			me.goToEnd();
		}
		me.drawFrame();
		return false;
	};
		
	this.stepForward = function()
	{
		var newSlide = me.currentSlide + 1;
		if (newSlide <= me.slides)
		{
			me.currentSlide = newSlide;
			me.drawFrame();
		}else{
			me.halt();
		}
		return false;
	};

	this.stepBack = function()
	{
		var newSlide = me.currentSlide - 1;
		if (newSlide >= 1)
		{
			me.currentSlide = newSlide;
			me.drawFrame();
		}else{
			me.halt();
		}
		return false;
	};

	this.setSpeed = function(newspeed)
	{
		if (me.intervalId)
		{
			me.halt();
			me.speed = newspeed;
			me.play();
		}else{
			me.speed = newspeed;
		}		
	};

	this.setSpeedFromMenu = function()
	{
		me.setSpeed(me.getMy('SpeedSelect').value);
	};

	this.setDirectionFromMenu = function()
	{
		if (me.intervalId)
		{
			me.halt();
			me.direction = me.getMy('DirectionSelect').value;
			me.play();
		}else{
			me.direction = me.getMy('DirectionSelect').value;
		}
	};

	this.handleBarDrag = function(e)
	{
		//cross-browser event and positioning code adapted from www.quirksmode.org
		if (!e)
		{
			var e = window.event;
		}
		
		var mousex = 0;
		
		if (e.pageX)
		{
			mousex = e.pageX;
		} else if (e.clientX) {
			mousex = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
		}
		
		//adapted from www.quirksmode.org/js/findpos.html
		var totalBarXPos = 0;
		var totalBar = me.getMy('TotalBar');
		
		do
		{
			totalBarXPos += totalBar.offsetLeft;
		} while (totalBar = totalBar.offsetParent); //yes, assignment (=) and not comparison (==) is what we want - see the quirksmode page
		
		var newWidth = mousex - totalBarXPos;
		
		if (newWidth > me.getMy('TotalBar').offsetWidth)
		{
			newWidth = me.getMy('TotalBar').offsetWidth;
		} else if (newWidth < 0) {
			newWidth = 0;
		}

		me.goTo(Math.round((newWidth / me.getMy('TotalBar').offsetWidth) * me.slides));
		me.getMy('ElapsedBar').style.width = newWidth + 'px';
		return false;
	};
	
	this.handleBarDown = function(e)
	{
		if (!e)
		{
			var e = window.event;
		}
		
		//make sure it's not a right click - script from www.quirksmode.org
		var rightclick;
		if (e.which)
		{
			rightclick = (e.which === 3);
		} else if (e.button) {
			rightclick = (e.button === 2);
		}
		
		if (!rightclick)
		{
			document.onmousemove = me.handleBarDrag;
			document.onmouseup = me.handleBarUp;
			me.handleBarDrag(e);
		}
		return false; //disable the browser's built-in drag and drop, etc.
	};
	
	this.handleBarUp = function(e)
	{
		document.onmousemove = null;
		document.onmouseup = null;
		return false;
	};
	
	this.drawFrame = function()
	{
		if (me.currentSlide <= me.slides && me.currentSlide >= 1)
		{
			me.getMy('Image').src = me.getImageName();
			me.getMy('ElapsedSlides').innerHTML = me.currentSlide;
			me.getMy('ElapsedBar').style.width = (Math.round(((me.currentSlide - 1) / (me.slides - 1)) * me.getMy('TotalBar').offsetWidth)).toString() + 'px';
		}
	};

	this.getImageName = function(which)
	{
		if (!which)
		{
			which = me.currentSlide;
		}
		//this does leading zeroes padding
		
		//an array for the one we want - one item for each digit
		var current = which.toString().split("");
		
		//the number of digits in the largest slide
		var totalLength = me.slides.toString().length;
		
		//keep adding a zero to the front until it's as many digits as the final slide
		while (current.length < totalLength)
		{
			current.unshift('0');
		}
		
		//insert the number into the prefix and suffix to get the filename
		return me.imagePrefix + current.join("") + me.imageSuffix;
	};

	this.getMy = function(classname)
	{
		if (!me.rootNode)
		{
			return false;
		}
		classname = 'player' + classname;
		if (me.rootNode.getElementsByClassName)
		{
			return me.rootNode.getElementsByClassName(classname)[0];
		} else { //because IE doesn't support this natively, I have to include all this crap
			var els = me.rootNode.getElementsByTagName('*');
			var elsLen = els.length;
			var pattern = new RegExp("(^|\\s)" + classname + "(\\s|$)");
			for (var i = 0; i < elsLen; i++)
			{
				if (pattern.test(els[i].className))
				{
					return els[i];
				}
			}
			return false;
		}
	};
	
	this.deploy = function(where)
	{
		if (me.isDeployed)
		{
			me.unDeploy(null, false);
		}
		if (!me.okToDeploy)
		{
			return true; //have the browser follow the link
		}
		
		//replace+store old node
		me.oldNode = where.parentNode.replaceChild(me.rootNode, where);
		
		try
		{
			me.rootNode.innerHTML = '<div></div>'; //This makes IE barf now rather than later if deploying inside a <p> or somewhere that can't handle block-level elements, so the browser will follow the link.
		
			//begin new node expansion routine
			me.direction = 1;
			me.intervalId = setInterval(me.animateOpenClose, 8);
			me.isDeployed = true;
			
			//preload images
			var preloads = [];
			for (var i = 1; i < me.slides; i++)
			{
				preloads[i] = new Image();
				preloads[i].src = me.getImageName(i);
			}
			return false; //don't follow that link!
		}
		catch (ex)
		{
			me.restoreOldNode();
			me.okToDeploy = false;
			return true; //follow the link
		}
	};

	//back to that constructor business...
	
	this.resetVars();
	if (this.okToDeploy !== false && document.getElementById) //browser checks and such
	{
		this.okToDeploy = true;
	}
}