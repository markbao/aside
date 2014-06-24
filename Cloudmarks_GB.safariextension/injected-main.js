var mm = {
	hotkey : {},
	MmFrame : function () {
		var f = document.createElement('iframe');
		f.id = 'cksbe_iframe';
		f.name = 'cksbe_iwin';
		f.style.cssText = '\
			position: fixed !important; z-index: 2147483647 !important;\
			left: 0 !important; top: 0 !important;\
			width: 100% !important; height: 100% !important;\
			border-width: 0 !important;\
			background: transparent !important;\
			opacity: 0;\
		';
		return f;
	},
	checkOkayToDoHotkey : function (event) {
		var forbiddenTargets = ['INPUT','BUTTON','SELECT','TEXTAREA'];
		var elementIsForbidden = (forbiddenTargets.indexOf(event.target.nodeName) > -1);
		var elementIsEditable = event.target.isContentEditable;
		return (event.metaKey || (!elementIsForbidden && !elementIsEditable));
	},
	handleKeyDown : function (e) {
		var props = ['which','altKey','ctrlKey','metaKey','shiftKey'];
		var match = props.every(function (prop) {
			return e[prop] === mm.hotkey[prop];
		});
		if (match) {
			if (mm.checkOkayToDoHotkey(e)) {
				e.preventDefault(); e.stopPropagation();
				safari.self.tab.dispatchMessage('openList'); 
			}
		} else {
			match = props.every(function (prop) {
				return e[prop] === mm.addHotkey[prop];
			});
			if (match) {
				if (mm.checkOkayToDoHotkey(e)) {
					e.preventDefault(); e.stopPropagation();
					safari.self.tab.dispatchMessage('openAddForm'); 
				}
			}
		}
	},
	handleMessage : function (e) {
		switch (e.name) {
			case 'receiveSettings':
				if (e.message.hotkey)
					mm.hotkey = e.message.hotkey;
				if (e.message.addHotkey)
					mm.addHotkey = e.message.addHotkey;
			break;
		}
	},
	handleMessageForTop : function (e) {
		switch (e.name) {
			case 'insertMmFrame':
				mm.insertMmFrame(e.message);
			break;
			case 'removeMmFrame':
				// e.message == andFocusParent
				if (mm.mmFrame) {
					mm.removeMmFrame();
					if (e.message) window.focus();
				}
			break;
			case 'toggleMmFrame':
				if (mm.mmFrame) {
					mm.removeMmFrame();
					window.focus();
				} else {
					mm.insertMmFrame(e.message);
				}
			break;
			case 'loadUrl':
				window.location.href = e.message;
			break;
			case 'passPageDescription':
				var pageDesc = getSelection().toString().trim();
				if (!pageDesc) {
					var metaDesc = document.querySelector('meta[name="description"]');
					if (metaDesc) pageDesc = metaDesc.content;
				}
				if (pageDesc) {
					console.log('Passing blurb:"' + pageDesc + '"');
					safari.self.tab.dispatchMessage('receivePageDescription', pageDesc);
				}
			break;
		}
	},
	insertMmFrame : function (src) {
		this.mmFrame = document.body.appendChild(new this.MmFrame);
		this.mmFrame.src = safari.extension.baseURI + src;
		mm.fadeInTimer = setInterval(function () {
			var currop = mm.mmFrame.style.opacity * 1;
			currop = currop + 0.25;
			mm.mmFrame.style.opacity = currop + '';
			if (currop >= 1) clearInterval(mm.fadeInTimer);
		}, 10);
	},
	removeMmFrame : function () {
		document.body.removeChild(this.mmFrame);
		this.mmFrame = null;
	},
};

if ((/^http/.test(location.protocol) || location.href === 'about:blank') && window.name !== 'cksbe_iwin') {
	safari.self.addEventListener('message', mm.handleMessage, false);
	if (window === window.top)
		safari.self.addEventListener('message', mm.handleMessageForTop, false);
	safari.self.tab.dispatchMessage('passSettings', ['hotkey', 'addHotkey']);
	document.addEventListener('keydown', mm.handleKeyDown, false);
}