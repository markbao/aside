function initialize() {
	safari.self.addEventListener("message", handleMessage, false);
	safari.self.tab.dispatchMessage('passAllSettings');
}
function handleMessage(e) {
	if (e.name === 'receiveSettings') {
		console.log(e.message);
		if (e.message.hotkey) {
			var hotkey = e.message.hotkey;
			var cStr = String.fromCharCode(hotkey.which);
			if (!/[0-9A-Z]/.test(cStr))
				cStr = String.fromCharCode(parseInt(hotkey.keyIdentifier.slice(2), 16));
			if (cStr === ' ')
				cStr = 'Space';
			var mStr = '';
			if (hotkey.ctrlKey)  mStr += '⌃';
			if (hotkey.altKey)   mStr += '⌥';
			if (hotkey.shiftKey) mStr += '⇧';
			if (hotkey.metaKey)  mStr += '⌘';
			document.getElementById('hotkeyInput0').value = mStr + cStr;
		}
		if (e.message.addHotkey) {
			var hotkey = e.message.addHotkey;
			var cStr = String.fromCharCode(hotkey.which);
			if (!/[0-9A-Z]/.test(cStr))
				cStr = String.fromCharCode(parseInt(hotkey.keyIdentifier.slice(2), 16));
			if (cStr === ' ')
				cStr = 'Space';
			var mStr = '';
			if (hotkey.ctrlKey)  mStr += '⌃';
			if (hotkey.altKey)   mStr += '⌥';
			if (hotkey.shiftKey) mStr += '⇧';
			if (hotkey.metaKey)  mStr += '⌘';
			document.getElementById('hotkeyInput1').value = mStr + cStr;
		}
		if (e.message.targetBits) {
			var targetBits = e.message.targetBits;
			document.getElementById('ntCheckbox').checked = targetBits.nt;
			document.getElementById('uwCheckbox').checked = targetBits.uw;
			document.getElementById('tbCheckbox').checked = targetBits.tb;
			document.getElementById('taCheckbox').checked = targetBits.ta;
			var tpButtons = document.getElementsByName('tpRadio');
			var tpLabels = document.querySelectorAll('label.tpLabel');
			tpButtons[targetBits.tp].checked = true;
			if (targetBits.ta) {
				tpButtons[0].disabled = false;
				tpButtons[1].disabled = false;
				tpLabels[0].className = 'enabled';
				tpLabels[1].className = 'enabled';
			} else {                                                                 
				tpButtons[0].disabled = true;                                 
				tpButtons[1].disabled = true;                                 
				tpLabels[0].className = 'disabled';
				tpLabels[1].className = 'disabled';
			}
		}
		if (e.message.showFavicons) {
			document.getElementById('fiCheckbox').checked = e.message.showFavicons;
		}
		if (typeof e.message.usePopover == 'boolean') {
			document.getElementById('upCheckbox').checked = e.message.usePopover;
		}
		if (typeof e.message.showRecents == 'boolean') {
			toggleSrControls(e.message.showRecents);
			document.getElementById('srCheckbox').checked = e.message.showRecents;
			document.getElementById('sfRadio0').checked = !e.message.showFavorites;
			document.getElementById('sfRadio1').checked = e.message.showFavorites;
		}
		if (e.message.recentsLength) {
			oldRL = document.getElementById('rlInput').value = e.message.recentsLength;
		}
		if (e.message.sortSearchBy) {
			document.querySelector('input[name="ssRadio"][value="'+ e.message.sortSearchBy +'"]').checked = true;
		}
		if (typeof e.message.allowBarSearch == 'boolean') {
			document.getElementById('bsCheckbox').checked = e.message.allowBarSearch;
		}
		if (e.message.barSearchPrefix) {
			oldBSP = document.getElementById('bsInput').value = e.message.barSearchPrefix;
		}
	}
}
function handleHotKeyDown(n) {
	event.stopPropagation();
	switch (event.which) {
		case 27:	// escape
			event.target.blur();
			break;
		case 37:	// left
		case 38:	// up
		case 39:	// right
		case 40:	// down
			event.preventDefault();
			break;
		case  9:	// tab
		case 16:	// shift
		case 17:	// ctrl
		case 18:	// option
		case 91:	// command-left
		case 93:	// command-right
			break;
		default:
			event.preventDefault();
			saveHotkey(event, n);
		break;
	}
}
function handleHotkeyFocus(n) {
	event.preventDefault();
	event.target.select();
	var sm = document.getElementById('hkStatusMsg' + n);
	sm.className = sm.className.replace(' visible', '');
	sm.className = sm.className.replace(' transparent', '');
}
function hide(selector) {
	var els = document.querySelectorAll(selector);
	for (var i = 0; i < els.length; i++) {
		els[i].className += (els[i].className) ? ' hidden' : 'hidden';
	}
}
function resetHotkey(which) {
	safari.self.tab.dispatchMessage('resetHotkey', which);
}
function saveHotkey(e, n) {
	e.target.blur();
	var hotkey = {};
	var props = ['which','keyCode','keyIdentifier','altKey','ctrlKey','metaKey','shiftKey'];
	for (var i = 0; i < props.length; i++)
		hotkey[props[i]] = e[props[i]];
	var message = {
		which : e.target.getAttribute('which'),
		data  : hotkey
	};
	safari.self.tab.dispatchMessage('saveHotkey', message);
	document.getElementById('hkStatusMsg' + n).className += ' visible';
	setTimeout(function () {
		document.getElementById('hkStatusMsg' + n).className += ' transparent';
	}, 2000);
}
function setNewTabPosition(pos) {
	safari.self.tab.dispatchMessage('setNewTabPosition', pos);
}
function setBarSearchPrefix() {
	var val = event.target.value;
	if (val != oldBSP) {
		var message = { name: 'barSearchPrefix', value: val };
		safari.self.tab.dispatchMessage('saveSetting', message);
		oldBSP = val;
	}
}
function setRecentsLength() {
	var val = event.target.value;
	if (val == 0 || val.search(/[^0-9]/) > -1)
		val = event.target.value = oldRL;
	if (val != oldRL) {
		var message = { name: 'recentsLength', value: val };
		safari.self.tab.dispatchMessage('saveSetting', message);
		oldRL = val;
	}
}
function setSearchSort() {
	var message = { name: 'sortSearchBy', value: event.target.value };
	safari.self.tab.dispatchMessage('saveSetting', message);
}
function setShowFavorites(showFavorites) {
	var message = { name: 'showFavorites', value: showFavorites };
	safari.self.tab.dispatchMessage('saveSetting', message);
}
function show(selector) {
	var els = document.querySelectorAll(selector);
	for (var i = 0; i < els.length; i++) {
		els[i].className = els[i].className.replace(/ ?hidden/g, '');
	}
}
function toggleSetting() {
	var message = { name: event.target.name, value: event.target.checked };
	safari.self.tab.dispatchMessage('saveSetting', message);
	if (message.name === 'showRecents') {
		toggleSrControls(event.target.checked);
	}
}
function toggleSrControls(showRecents) {
	document.getElementById('rlInput').disabled = !showRecents;
	document.getElementById('sfRadio0').disabled = !showRecents;
	document.getElementById('sfRadio1').disabled = !showRecents;
	document.querySelector('label[for="sfRadio0"]').className = showRecents ? 'enabled' : 'disabled';
	document.querySelector('label[for="sfRadio1"]').className = showRecents ? 'enabled' : 'disabled';
}
function toggleTargetBit() {
	var targetBits = {
		nt: document.getElementById('ntCheckbox').checked,
		uw: document.getElementById('uwCheckbox').checked,
		tb: document.getElementById('tbCheckbox').checked,
		ta: document.getElementById('taCheckbox').checked,
		tp: (document.getElementById('tpRadio0').checked)? 0 : 1
	};
	if (targetBits.ta) {
		document.getElementById('tpRadio0').disabled = false;
		document.getElementById('tpRadio1').disabled = false;
		document.querySelector('label[for="tpRadio0"]').className = 'enabled';
		document.querySelector('label[for="tpRadio1"]').className = 'enabled';
	} else {                                                                 
		document.getElementById('tpRadio0').disabled = true;  
		document.getElementById('tpRadio1').disabled = true;  
		document.querySelector('label[for="tpRadio0"]').className = 'disabled';
		document.querySelector('label[for="tpRadio1"]').className = 'disabled';
	}
	safari.self.tab.dispatchMessage('setTargetBits', targetBits);
}
