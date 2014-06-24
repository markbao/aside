function initialize() {
	popover = !!(safari.self.identifier);
	iframed = !popover;
	lion = !!(navigator.appVersion.match('10_7'));
	safari51 = !!(navigator.appVersion.match('Version/5.1'));
	sa = safari.application;
	gw = (popover) ? safari.extension.globalPage.contentWindow : null;
	allBookmarks = (popover) ? gw.bookmarks : null;
	allBmStrings = null;
	selectedListItem = null;
	keyId = null;
	lastUpdateCheckTime = 0;
	if (popover) {
		console = gw.console;
		safari.self.height = 52;
		settings = safari.extension.settings;
		document.body.className += ' popover';
	} else {
		settings = {};
		document.body.className += ' iframed';
		document.body.onclick = handleOutsideClick;
		document.documentElement.onclick = handleOutsideClick;
		safari.self.addEventListener('message', handleMessage, false);
		safari.self.tab.dispatchMessage('passAllSettings');
		safari.self.tab.dispatchMessage('passBookmarks');
	}
	inputField = document.querySelector('#inputfield');
	inputField.onfocus = function (e) {
		if (popover && safari51 && lion) {
			this.style.outline = 'auto -webkit-focus-ring-color';
		}
	};
	inputField.onkeydown = handleInputKeyDown;
	inputField.onkeyup = handleInputKeyUp;
	inputField.onblur = function (e) {
		if (popover && safari51 && lion) {
			this.style.outline = '';
		}
	};
	inputClear = document.querySelector('#clearinput');
	inputClear.onmousedown = function (e) {
		inputClear.className = 'clicked';
	};
	inputClear.onmouseup = function (e) {
		inputClear.className = '';
		inputField.value = '';
		showDefaultBookmarks();
	};
	messageSpan = document.querySelector('#messagespan');
	addButton = document.querySelector('#addbutton');
	addButton.onclick = handleButtonPush;
	addButtonImg = addButton.children[0];
	addButtonImg.onclick = handleButtonPush;
	reloadButton = document.querySelector('#reloadbutton');
	reloadButton.onclick = handleButtonPush;
	reloadButtonImg = reloadButton.children[0];
	reloadButtonImg.onclick = handleButtonPush;
	settingsButton = document.querySelector('#settingsbutton');
	settingsButton.onclick = handleButtonPush;
	settingsButtonImg = settingsButton.children[0];
	settingsButtonImg.onclick = handleButtonPush;
	bookmarkList = document.querySelector('#bmlist');
	bookmarkList.lastScrollTop = 0;
	bookmarkList.clear = function () {
		this.innerHTML = '';
		this.style.height = 'auto';
		messageSpan.innerHTML = '';
	};
	document.onclick = function () {
		inputField.focus();
	};
	document.onkeydown = function (e) {
		if (e.which === 27) {
			e.preventDefault();
			e.stopPropagation();
			goAway(true);
			return;
		}
		var m = e.shiftKey * 1 + e.altKey * 2 + e.ctrlKey * 4 + e.metaKey * 8;
		if (e.which === settings.hotkey.k && m === settings.hotkey.m) {
			var forbiddenTargets = ['INPUT','BUTTON','SELECT','TEXTAREA'];
			var elementIsForbidden = (forbiddenTargets.indexOf(e.target.nodeName) > -1);
			if (m >= 4 || !elementIsForbidden) {
				e.preventDefault();
				e.stopPropagation();
				goAway(iframed);
			}
		} else
		if ((m === 8 || m === 9) && e.which === 61) {
			e.preventDefault();
			showAddMarkForm();
		}
	};
	window.setInterval(showFaviconsOnScroll, 250);
	popover && refresh();
}
function refresh(reentrant) {
	if (popover) {
		allBookmarks = gw.bookmarks;
		reentrant || gw.checkForUpdates(new Date().getTime(), function (updatesAre) {
			if (updatesAre && inputField.value == '') {
				console.log('Popover is handling updates.');
				refresh(true);
			}
		});
	}
	if (allBookmarks == null) {
		inputField.blur();
	} else {
		inputField.focus();
		inputField.select();
		if (allBookmarks.length > 0) {
			inputField.value ? showMatchingBookmarks() : showDefaultBookmarks();
		} else {
			bookmarkList.clear();
			messageSpan.innerHTML = 'No bookmarks.';
		}
		setTimeout(showFavicons, 100);
	}
}
function addListItemForBookmark(bookmark) {
	var liHtml = document.getElementById('li_tmpl').innerHTML.replace(/^\w+/, '')
		.replace('{{age}}'  , getAge(bookmark.time) + ' ago')
		.replace('{{title}}', bookmark.title)
		.replace('{{blurb}}', bookmark.blurb || bookmark.url)
		.replace('{{tags}}' , bookmark.tags.join(', '))
		.replace('{{url}}'  , bookmark.url);
	var li = document.createElement('li');
	li.id = bookmark.ident;
	li.className = 'bookmark';
	li.innerHTML = liHtml;
	li.onclick = handleItemClick;
	li.onmouseenter = handleItemMouseEnter;
	bookmarkList.appendChild(li);
}
function deleteBookmark(li) {
	if (popover) {
		gw.deleteBookmarkFromService(null, getBookmarkFromId(li.id), function () {
			selectListItem(li.nextSibling || bookmarkList.firstChild);
			bookmarkList.removeChild(li);
		});
	} else {
		safari.self.tab.dispatchMessage('deleteBookmark', li.id);
	}
}
function enterSearchQuery(query) {
	if (typeof query == 'string') {
		inputField.value = query;
	}
}
function getAge(ISODate) {
	var now = new Date();
	var bmd = new Date();
	bmd.setUTCFullYear(ISODate.split('T')[0].split('-')[0]);
	bmd.setUTCMonth(ISODate.split('T')[0].split('-')[1] - 1);
	bmd.setUTCDate(ISODate.split('T')[0].split('-')[2]);
	bmd.setUTCHours(ISODate.split('T')[1].split(':')[0]);
	bmd.setUTCMinutes(ISODate.split('T')[1].split(':')[1]);
	bmd.setUTCSeconds(ISODate.split('T')[1].split(':')[2].split('Z')[0]);
	var diffSecs = (now - bmd) / 1000;
	var age = '';
	if (diffSecs < 120) age = Math.round(diffSecs) + ' seconds'; else
	if (diffSecs < 7200) age = Math.round(diffSecs/60) + ' minutes'; else
	if (diffSecs < 172800) age = Math.round(diffSecs/3600) + ' hours'; else
	if (diffSecs < 1209600) age = Math.round(diffSecs/86400) + ' days'; else
	if (diffSecs < 5184000) age = Math.round(diffSecs/604800) + ' weeks'; else
	if (diffSecs < 63072000) age = Math.round(diffSecs/2592000) + ' months'; else
	age = Math.round(diffSecs/31536000) + ' years';
	return age;
}
function getBookmarkFromId(id) {
	for (var bookmark, i = 0; i < allBookmarks.length; i++) {
		bookmark = allBookmarks[i];
		if (bookmark.ident == id) {
			return bookmark;
		}
	} return null;
}
function getDefaultIconUrl() {
	return safari.extension.baseURI + 'page-16.png';
}
function goAway(andFocusParent) {
	if (popover) {
		setTimeout('safari.self.hide()', 100);
		// setTimeout is workaround for bug in Snow Leopard
	} else {
		safari.self.tab.dispatchMessage('removeMe', andFocusParent);
	}
}
function handleButtonPush(e) {
	switch (e.target) {
		case addButton: case addButtonImg: {
			e.stopPropagation();
			showAddMarkForm();
			break;
		}
		case reloadButton: case reloadButtonImg: {
			e.stopPropagation();
			allBookmarks = null;
			popover ? gw.getAllBookmarks(null, refresh) : safari.self.tab.dispatchMessage('reloadBookmarks');
			break;
		}
		case settingsButton: case settingsButtonImg: {
			e.stopPropagation();
			if (popover) {
				var url = safari.extension.baseURI + 'settings-main.html';
				safari.application.activeBrowserWindow.openTab().url = url;
			}
			else safari.self.tab.dispatchMessage('openSettings');
			goAway(false);
			break;
		}
	}
}
function handleInputKeyDown(e) {
	e.stopPropagation();
	switch (e.which) {
		case  8:   // backspace
			if (e.metaKey) {
				e.preventDefault();
				deleteBookmark(selectedListItem);
			} break;
		case 13:   // return
			e.preventDefault();
			if (e.altKey) {
				showAddMarkForm();
				break;
			}			
			var useNewTab = settings.targetBits.nt ^ (e.metaKey || e.ctrlKey);
			var useBgTab = settings.targetBits.tb ^ e.shiftKey;
			if (selectedListItem) {
				var bmid = selectedListItem.id;
				var url = getBookmarkFromId(bmid).url;
				if (/^javascript:/.test(url)) {
					openBookmarklet({url: url, bmid: bmid});
				} else {
					openBookmark({ bmid: bmid, url: url, mk: e.metaKey, ck: e.ctrlKey, sk: e.shiftKey });
				}
			} else if (e.target.value) {
				var url = 'http://www.google.com/search?q=' + encodeURIComponent(e.target.value);
				openBookmark({url: url, mk: e.metaKey, ck: e.ctrlKey, sk: e.shiftKey});
			}
			if (!useNewTab || !useBgTab)
				goAway(false);
			break;
		case 27:   // escape
			e.preventDefault();
			goAway(true);
			break;
		case 33:   // pageup
			e.preventDefault();
			if (selectedListItem) {
				for (var i = 0; i < bookmarkList.childNodes.length; i++) {
					if (bookmarkList.childNodes[i] === selectedListItem) {
						var sbIndex = i;
						break;
					}
				}
				var vil = bookmarkList.offsetHeight / selectedListItem.offsetHeight;
				var newIndex = sbIndex - vil + 1;
				if (newIndex < 0) newIndex = 0;
				selectListItem(null, newIndex);
			} break;
		case 34:   // pagedown
			e.preventDefault();
			if (selectedListItem) {
				for (var i = 0; i < bookmarkList.childNodes.length; i++) {
					if (bookmarkList.childNodes[i] === selectedListItem) {
						var sbIndex = i;
						break;
					}
				}
				var vil = bookmarkList.offsetHeight / selectedListItem.offsetHeight;
				var newIndex = sbIndex + vil - 1;
				if (newIndex >= bookmarkList.childNodes.length)
					newIndex = bookmarkList.childNodes.length - 1;
				selectListItem(null, newIndex);
			} break;
		case 38:   // up
			e.preventDefault();
			if (selectedListItem) {
				selectListItem(selectedListItem.previousSibling || bookmarkList.lastChild);
			} break;
		case  9:   // tab
		case 40:   // down
			e.preventDefault();
			if (selectedListItem) {
				selectListItem(selectedListItem.nextSibling || bookmarkList.firstChild);
			} break;
		default: ;
	}
}
function handleInputKeyUp(e) {
	e.stopPropagation();
	inputClear.style.display = inputField.value ? '' : 'none';
	var specialKeys = [8, 127, 186, 191];  // backspace, delete, colon, slash
	if (specialKeys.indexOf(e.which) > -1 ) {
		if (inputField.value == '') {
			if (bookmarkList.listType == 'matching' || bookmarkList.listType == 'all') {
				showDefaultBookmarks();
			} else {
				showMatchingBookmarks();
			}
		} else {
			showMatchingBookmarks();
		}
	} else {
		var c = String.fromCharCode(e.which);
		var re = /[0-9 A-Z\.]/;
		if (re.test(c)) {
			showMatchingBookmarks();
		}
	}
}
function handleItemClick(e) {
	e.preventDefault();
	if (/ia_delete/.test(e.target.className)) {
		deleteBookmark(e.currentTarget);
	} else {
		var useNewTab = settings.targetBits.nt ^ (e.metaKey || e.ctrlKey);
		var useBgTab = settings.targetBits.tb ^ e.shiftKey;
		var bookmark = getBookmarkFromId(e.currentTarget.id);
		var bmid = e.currentTarget.id;
		var url = getBookmarkFromId(bmid).url;
		if (/^javascript:/.test(url)) {
			openBookmarklet({url: url, bmid: bmid});
		} else {
			openBookmark({ bmid: bmid, url: url, mk: e.metaKey, ck: e.ctrlKey, sk: e.shiftKey });
		}
		if (!useNewTab || !useBgTab) {
			goAway(false);
		}
	}
}
function handleItemMouseEnter(e) {
	selectListItem(e.currentTarget);
}
function handleMessage(e) {
	switch (e.name) {
		case 'bookmarkDeleted':
			var li = document.getElementById(e.message);
			if (li) {
				selectListItem(li.nextSibling || bookmarkList.firstChild);
				bookmarkList.removeChild(li);
			}
			break;
		case 'showFavicon':
			var bookmark = e.message.bookmark;
			var li = document.getElementById(bookmark.ident);
			if (li) {
				li.querySelector('.favicon').src = e.message.iconUrl || getDefaultIconUrl();
				li.iconFetched = true;
			}
			break;
		case 'receiveSettings':
			if (e.message.service !== settings.service)
				allBookmarks = null;
			for (var key in e.message)
				settings[key] = e.message[key];
			if (e.message.lastQuery) {
				var lastQuery = e.message.lastQuery;
				if (allBookmarks) {
					enterSearchQuery(lastQuery);
					showMatchingBookmarks();
				} else {
					document.addEventListener('bookmarksready', function whenBookmarksReady() {
						console.log('Bookmarks ready.');
						document.removeEventListener('bookmarksready', whenBookmarksReady);
						enterSearchQuery(lastQuery);
						showMatchingBookmarks();
					});
				}
			}
			break;
		case 'receiveBookmarks':
			allBookmarks = e.message;
			var event = new Event('bookmarksready');
			document.dispatchEvent(event);
			refresh();
			break;
		default: ;
	}
}
function handleOutsideClick(e) {
	if (e.button == 0 && e.target == e.currentTarget) 
		goAway(true);
}
function openBookmark(args) {
	if (iframed) {
		safari.self.tab.dispatchMessage('openBookmark', args);
	} else {
		gw.openBookmark(args);
	}
}
function openBookmarklet(args) {
	if (iframed) {
		safari.self.tab.dispatchMessage('openBookmark', args);
	} else {
		gw.openBookmark(args);
	}
}
function returnMatchingBookmarks(bookmarks, keys) {
	var matches = [];
	self.time0 = new Date();
	for (var i = 0; i < bookmarks.length; i++) {
		b = bookmarks[i];
		var cb = {
			title : b.title,
			url   : b.url.replace(/https?:\/\/(www\.)?/g,'').split('?',1)[0].split('javascript:',1)[0],
			blurb : b.blurb,
			tags  : b.tags.join(',')
		};
		var allKeysMatch = true;
		b.rank = b.hits;
		for (var key, j = 0; j < keys.length; j++) {
			key = keys[j];
			if (key.charAt(1) === '/' || key.charAt(1) === ':') {
				if (key.length > 2) {
					switch (key.charAt(0)) {
						case 'd': var keyScope = 'blurb'; break;
						case 'n': var keyScope = 'title'; break;
						case 't': var keyScope = 'tags' ; break;
						case 'u': var keyScope = 'url'  ; break;
						default : var keyScope = null;
					}
					var keyRe = new RegExp(key.slice(2),'i');
				} else {
					var keyRe = '';
				}
			} else {
				var keyScope = null;
				var keyRe = new RegExp(key,'i');
			}
			if (keyScope) {
				var bmString = cb[keyScope].toLowerCase();
			} else {
				var pad = '                                                                              ';
				var bmString = (cb.title + pad + cb.blurb + pad + cb.url + pad + cb.tags).toLowerCase();
			}
			var matchIndex = bmString.search(keyRe);
			if (matchIndex >= 0) {
				allKeysMatch = allKeysMatch && true;
				b.rank += 1/(matchIndex+1) + 1/(j+1);
				if (j === 0) {
					var queryIndex = bmString.indexOf(keys.join(' '));
					b.rank += (queryIndex === 0) ? 3 : (queryIndex > 0) ? 2 : 0;
				}
			} else {
				allKeysMatch = false;
			}
		}
		if (allKeysMatch) {
			matches.push(b);
		}
	}
	// console.log('Matching done in:', (self.time1 = new Date()) - self.time0, 'ms');
	if (settings.sortSearchBy == 'relevance') {
		matches.sort(function (a,b) {
			return b.rank - a.rank;
		});
	}
	// console.log('Sorting done in:', (self.time2 = new Date()) - self.time1, 'ms');
	return matches;
}
function selectListItem(li, index) {
	if (window.urlRevealTimer) {
		clearTimeout(window.urlRevealTimer);
		delete window.urlRevealTimer;
	}
	if (selectedListItem) {
		selectedListItem.className = selectedListItem.className.replace(' selected', '');
		selectedListItem.className = selectedListItem.className.replace(' showurl', '');
	}
	selectedListItem = li || bookmarkList.childNodes[index];
	if (selectedListItem) {
		selectedListItem.className += ' selected';
		selectedListItem.scrollIntoViewIfNeeded(false);
		window.urlRevealTimer = setTimeout(function () {
			selectedListItem.className += ' showurl';
			delete window.urlRevealTimer;
		}, 1000);
	}
}
function showAddMarkForm(blurb) {
	if (popover) {
		safari.self.hide();
		var button = gw.getAddButtonForActiveWindow() || gw.getMainButtonForActiveWindow();
		button.popover = gw.getPopover('addP');
		gw.initializePopover('addP');
		setTimeout(function () {
			button.showPopover();
		}, 100);
	} else {
		location.href = safari.extension.baseURI + 'add.html';
	}
}
function showDefaultBookmarks() {
	if (settings.showRecents) {
		settings.showFavorites ? showFavoriteBookmarks() : showRecentBookmarks();
	} else {
		bookmarkList.clear();
	}
	iframed && safari.self.tab.dispatchMessage('saveLastQuery', '');
}
function showFavicon(li) {
	if (li.iconFetched) return;
	var scrollTop = bookmarkList.scrollTop;
	var scrollBottom = scrollTop + bookmarkList.offsetHeight;
	if (li.offsetTop >= scrollTop && li.offsetTop <= scrollBottom) {
		var bookmark = getBookmarkFromId(li.id);
		if (iframed) {
			safari.self.tab.dispatchMessage('getFavicon', bookmark);
		} else {
			gw.getFavicon(bookmark.url, function (iconUrl) {
				li.querySelector('.favicon').src = iconUrl || getDefaultIconUrl();
				li.iconFetched = true;
			});
		}
	}
}
function showFavicons() {
	[].slice.call(bookmarkList.children).forEach(showFavicon);
}
function showFaviconsOnScroll() {
	if (bookmarkList.scrollTop != bookmarkList.lastScrollTop)
		showFavicons();
	bookmarkList.lastScrollTop = bookmarkList.scrollTop;
}
function showFavoriteBookmarks() {
	var sortedBookmarks = allBookmarks;
	sortedBookmarks.sort(function (a,b) {
		return b.hits - a.hits;
	});
	updateBmList(sortedBookmarks.slice(0, settings.recentsLength), 'favorite');
}
function showMatchingBookmarks() {
	var input = inputField.value.replace(/\/\s+/,'/').replace(/\:\s+/,':');
	if (input == '') {
		updateBmList(allBookmarks, 'all');
	} else {
		var keys = input.trim().split(' ');
		var matchingBookmarks = returnMatchingBookmarks(allBookmarks, keys);
		updateBmList(matchingBookmarks, 'matching');
		iframed && safari.self.tab.dispatchMessage('saveLastQuery', input);
	}
}
function showRecentBookmarks() {
	updateBmList(allBookmarks.slice(0, settings.recentsLength), 'recent');
}
function showSelf() {
	var mainButton = gw.getMainButtonForActiveWindow();
	mainButton.popover = safari.self;
	mainButton.showPopover();
}
function updateBmList(bookmarks, listType) {
	bookmarkList.listType = listType;
	bookmarkList.clear();
	if (bookmarks.length === 0) {
		selectedListItem = null;
		messageSpan.innerHTML = 'No matches';
		bookmarkList.innerHTML = '<div id="searchprompt">No matches.' 
			+ ' Press Enter to google it or Option-Enter to add a new bookmark.</div>';
		var listHeight = bookmarkList.clientHeight;
		if (popover) safari.self.height = listHeight + 52;
		return;
	}
	bookmarks.forEach(addListItemForBookmark);
	selectedListItem = bookmarkList.firstChild;
	if (listType === 'recent')
		messageSpan.innerHTML = 'Showing ' + bookmarks.length + ' most recent';
	else if (listType === 'favorite')
		messageSpan.innerHTML = 'Showing ' + bookmarks.length + ' most used';
	else if (listType === 'all')
		messageSpan.innerHTML = 'Showing all ' + bookmarks.length + ' bookmarks';
	else
		messageSpan.innerHTML = bookmarks.length + ' matches';
	selectListItem(selectedListItem);
	var itemHeight = selectedListItem.offsetHeight;
	var listHeight = itemHeight * bookmarks.length;
	var offset = (popover) ? 48 : 66;
	var winHeight = (iframed) ? window.innerHeight - 60 : 600;
	if (listHeight > winHeight - offset)
		listHeight = (Math.floor((winHeight - offset)/itemHeight)) * itemHeight;
	bookmarkList.style.height = listHeight + 'px';
	if (popover)
		safari.self.height = listHeight + 52;
	showFavicons();
}

window.onload = initialize;
