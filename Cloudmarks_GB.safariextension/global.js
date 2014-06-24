function Bookmark(url, title, blurb, tags, time, ident, hits) {
	return {
		url   : url,
		title : title,
		blurb : blurb,
		tags  : tags,
		time  : time,
		ident : ident,
		hits  : hits
	};
}
function animateButton(button, timerID, action) {
	function incrementTimer() {
		if (button.image.match(/\/watch\d\.png$/)) {
			var i = button.image.split('/watch')[1].split('.')[0] * 1 + 1;
			if (i === 8) i = 0;
			setButtonIcon(button, 'watch' + (i));
		} else {
			setButtonIcon(button, 'watch0');
		}
	}
	if (action === true) {
		if (button !== waitingButton) {
			setButtonIcon(button, 'watch0');
		}
		waitTimers[timerID] = setInterval(incrementTimer, 250);
		waitingButton = button;
	} else {
		clearInterval(waitTimers[timerID]);
		delete waitTimers[timerID];
		if (countWaitingTimers() === 0) {
			setButtonIcon(waitingButton, 'bookmark');
			waitingButton = null;
		}
	}
}
function assignBookmarkHits(bm) {
	if (localStorage[bm.ident]) {
		bm.hits = localStorage[bm.ident] * 1;
	}
}
function bookmarkUrlIs(bookmark) {
	return bookmark.url === this.toString();
}
function cacheFavicon(iconData, baseUrl) {
	localStorage['favicon@' + baseUrl] = JSON.stringify({
		data : iconData,
		time : new Date().getTime()
	});
}
function checkForUpdates(timeStamp, callback) {
	if (!bookmarks) {
		getAllBookmarks(callback);
		return;
	}
	console.log('Bookmarks last downloaded:', bmDownTime);
	var url = services[se.settings.service].endpoints['getUpdateTime'];
	var onSuccess;
	var onFailure = function (res) {
		updateTime = false;
	};
	if (timeStamp == null || timeStamp - lastUpdateCheckTime > 15000) {
		if (se.settings.service === 'google') {
			onSuccess = function (res) {
				if (res.responseXML === null) {
					updateTime = false;
					sa.activeBrowserWindow.openTab().url = services['google'].endpoints['login'];
					alert('Please log in to your Google account.');
				} else {
					var ts = res.responseXML.getElementsByTagName('timestamp')[0];
					if (ts) {
						var t = ts.textContent;
						updateTime = new Date(t.substr(0,13)*1);
						console.log('Bookmarks last updated:', updateTime);
						handleUpdateResult(updateTime, callback);
					} else {
						getAllBookmarks(callback);
					}
				}
			};
		}
		doXHR('GET', url, null, null, onSuccess, onFailure);
		lastUpdateCheckTime = timeStamp;
	} else {
		console.log('Less than 15 seconds since last update request; not checking.')
		return false;
	}
}
function countWaitingTimers() {
	var count = 0;
	for (var i in waitTimers) {
		if (waitTimers.hasOwnProperty(i)) {
			count++;
		}
	}
	return count;
}
function cullOldFavicons() {
	var now = new Date().getTime();
	for (var key in localStorage) {
		if (/^favicon/.test(key)) {
			var cacheTime = JSON.parse(localStorage[key]).time;
			if (cacheTime < (now - 2592000000)) {
				delete localStorage[key];
				console.log('Deleted old favicon:', key);
			}
		}
	}
}
function dataObj2Str(data) {
	var string = '?';
	for (var key in data)
		string += key + '=' + encodeURIComponent(data[key]) + '&';
	return string.slice(0, string.length - 1);
}
function deleteBookmark(id) {
	bookmarks = JSON.parse(localStorage.bookmarks);
	for (var i = bookmarks.length - 1; i >= 0; i--) {
		if (bookmarks[i].ident == id) {
			bookmarks.splice(i, 1);
			break;
		}
	}
	localStorage.bookmarks = JSON.stringify(bookmarks);
	delete localStorage[id];
}
function deleteCachedFavicons() {
	for (var key in localStorage) {
		if (/^favicon/.test(key)) {
			delete localStorage[key];
		}
	}
}
function doXHR(method, url, data, contentType, successHandler, errorHandler) {
	var timerID = Math.random().toString().slice(2);
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function () {
		if (this.readyState === 4) {
			console.log('Response:', this);
			clearTimeout(xhr.timeout);
			clearTimeout(xhr.waiting);
			if (waitingButton)
				animateButton(waitingButton, timerID, false);
			if (this.status >= 200 && this.status < 300) {
				if (successHandler) {
					successHandler(this);
				}
			} else if (errorHandler) {
				errorHandler(this);
			} else {
				alert(
				    'Cloudmarks encountered an error while accessing your ' 
				    + services[se.settings.service].name + ' account. The error message was:\n\n"' 
				    + this.responseText + '"'
				);
			}
		}
	};
	if (method == 'GET' && data)
		url = url + data;
	console.log('XHR URL:', url);
	if (method == 'POST')
		console.log('XHR data:', data);
	xhr.open(method, url, true);
	if (method === 'POST')
		xhr.setRequestHeader("Content-type", contentType);
	xhr.send(data || null);
	xhr.waiting = setTimeout(function () {
		animateButton(getMainButtonForActiveWindow(), timerID, true);
	}, 2000);
	xhr.timeout = setTimeout(function () {
		xhr.abort();
		if (waitingButton)
			animateButton(waitingButton, timerID, false);
		if (errorHandler) {
			errorHandler(xhr);
		} else {
			alert('Cloudmarks could not connect to ' + services[se.settings.service].name + '.');
		}
	}, 15000);
}
function escape(text) {
	div.textContent = text;
	return div.innerHTML;
}
function findCachedFavicon(searchString) {
	for (var key in localStorage) {
		if (new RegExp('^favicon@.*' + searchString.replace(/\./g, '\\.')).test(key)) {
			var iconObject = JSON.parse(localStorage[key]);
			console.log(key);
			console.log(iconObject.data);
		}
	}
}
function getAddButtonForActiveWindow() {
	return se.toolbarItems.filter(function (button) {
		return button.identifier === 'ti_add' && button.browserWindow === sa.activeBrowserWindow;
	})[0];
}
function getAllBookmarks(callback) {
	var xhrData = '';
	var successHandler, errorHandler;
	bookmarks = [];
	if (se.settings.service === 'google') {
		successHandler = function (res) {
			if (res.responseXML === null) {
				bookmarks = false;
				sa.activeBrowserWindow.openTab().url = services['google'].endpoints['login'];
				alert('Please log in to your Google account.');
			} else {
				var rawmarks = res.responseXML.getElementsByTagName('bookmark');
				for (var i = 0; i < rawmarks.length; i++) {
					var rm = rawmarks[i];
					bookmarks.push(new Bookmark(
						rm.getElementsByTagName('url')[0].textContent,
						rm.getElementsByTagName('title')[0].textContent,
						'',
						(function () {
							var tagArray = [];
							var labels = rm.getElementsByTagName('label');
							for (var i = 0; i < labels.length; i++) {
								tagArray.push(labels[i].textContent);
							}
							return tagArray;
						})(),
						(function () {
							var t = rm.getElementsByTagName('timestamp')[0].textContent;
							var d = new Date(t.substr(0,13)*1);
							return d.toISOString().split('.')[0] + 'Z';
						})(),
						rm.getElementsByTagName('id')[0].textContent,
						localStorage[rm.getElementsByTagName('id')[0].textContent] * 1 || 0
					));
				}
				saveBookmarks(callback);
			}
		};
		errorHandler = function (response) {
			bookmarks = false;
			alert('Cloudmarks could not access your Google bookmarks.');
		};
	}
	localStorage.getAllCallTime = (getAllCallTime = new Date()).getTime();
	doXHR('GET', services[se.settings.service].endpoints['getAllBookmarks'], xhrData, null, successHandler, errorHandler);
}
function getBaseUrl(pageUrl) {
	a.href = pageUrl;
	return a.protocol + '//' + a.host;
}
function getCachedFavicon(baseUrl) {
	var lsItem = localStorage['favicon@' + baseUrl];
	if (lsItem) {
		var cachedIconEntry = JSON.parse(lsItem);
		if (cachedIconEntry.time > (new Date().getTime() - 2592000000)) {
			return cachedIconEntry.data;
		} else {
			delete localStorage['favicon@' + baseUrl];
		}
	}
	return null;
}
function getFavicon(pageUrl, callback) {
	var baseUrl = getBaseUrl(pageUrl);
	var firstCallback = function (result) {
		if (result) {
			console.log('favicon.ico found at ' + baseUrl);
			finalCallback(result);
		} else {
			// console.log('No favicon.ico at ' + baseUrl + '; trying alternate method.');
			getFaviconUrlFromPage(pageUrl, secondCallback);
		}
	};
	var secondCallback = function (result) {
		if (result) {
			console.log('Favicon web url found for ' + pageUrl + ':', result);
			getFaviconFromUrl(result, baseUrl, finalCallback);
		} else {
			console.log('No favicon found for', pageUrl);
			finalCallback('');
		}
	};
	var finalCallback = function (result) {
		cacheFavicon(result || '', baseUrl);
		callback(result);
	};
	var cachedIcon = getCachedFavicon(baseUrl);
	if (cachedIcon == null) {
		getFaviconFromUrl('favicon.ico', baseUrl, firstCallback);
	} else {
		callback(cachedIcon);
	}
}
function getFaviconFromUrl(iconUrl, baseUrl, callback) {
	if (/^data:/.test(iconUrl)) {
		callback(iconUrl);
	} else
	if (window.FileReader) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function () {
			if (this.readyState == 4) {
				if (this.status == 200) {
					var blob = this.response;
					var reader = new FileReader();
					reader.onload = function (e) {
						var result = e.target.result;
						if (result == 'data:') result = '';
						callback(result);
					}
					reader.readAsDataURL(blob)
				} else {
					callback(null);
				}
			}
		};
		if (!/^http/.test(iconUrl))
			iconUrl = baseUrl + (/\//.test(iconUrl) ? '' : '/') + iconUrl;
		xhr.open('GET', iconUrl, true);
		xhr.responseType = 'blob';
		xhr.send();
	} else {
		callback(null);
	}
}
function getFaviconUrlFromPage(pageUrl, callback) {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function () {
		if (this.readyState == 4) {
			if (this.status == 200) {
				var regexResult = faviconRegex.exec(this.responseText);
				if (regexResult && regexResult[1]) {
					callback(regexResult[1]);
				} else {
					callback(null);
				}
			} else {
				callback(null);
			}
		}
	};
	xhr.open('GET', pageUrl, true);
	xhr.send();
}
function getFullyQualifiedIconUrl(url, baseUrl) {
	a.href = url;
	if (!/^http/.test(a.protocol))
		return baseUrl + url;
	return url;
}
function getMainButtonForActiveWindow() {
	return se.toolbarItems.filter(function (button) {
		return button.identifier === 'ti_main' && button.browserWindow === sa.activeBrowserWindow;
	})[0];
}
function getNewBookmarks(since, callback) {
	console.log(since);
	var xhrData = '&fromdt=' + since;
	var successHandler = function (res) {
		var posts = res.responseXML.getElementsByTagName('post');
		console.log(posts.length + ' new posts:', posts);
		var newmarks = [];
		for (var p, i = 0; i < posts.length; i++) {
			p = posts[i];
			newmarks.push(new Bookmark(
				p.getAttribute('href'),
				p.getAttribute('description'),
				escape(p.getAttribute('extended')),
				p.getAttribute('tag').split(/ +/),
				p.getAttribute('time'),
				p.getAttribute('hash'),
				localStorage[p.getAttribute('hash')] * 1 || 0
			));
		}
		newmarks.forEach(function (newmark) {
			var dupeMarks = bookmarks.filter(urlMatches, newmark);
			if (dupeMarks.length > 0) {
				var di, deleted;
				dupeMarks.forEach(function (dupe) {
					di = bookmarks.indexOf(dupe);
					deleted = bookmarks.splice(di, 1);
					console.log('Deleted dupe:', deleted.title, '(' + deleted.url + ')');
				});
			}
		});
		bookmarks = newmarks.concat(bookmarks);
		saveBookmarks(callback);
	};
	var errorHandler = function (response) {
		if (response.status == 0) {
			var notice = 'The ' + services[se.settings.service].name +
				' API server does not seem to be available. Please try again later.';
		} else {
			var notice = 'Cloudmarks encountered an error while accessing your ' 
			    + services[se.settings.service].name + ' account. The error message was:\n\n"' 
			    + response.responseText + '"';
		}
		alert(notice);
	};
	doXHR('GET', services[se.settings.service].endpoints['getAllBookmarks'], xhrData, null, successHandler, errorHandler);
}
function getPopover(id) {
	return se.popovers.filter(function (po) {
		return po.identifier == id;
	})[0];
}
function getTags(service, callback) {
	var tags = [];
	if (service == 'google') {
		var tags = [], uniqueTags = [], counts = [];
		for (var b, i = 0; i < bookmarks.length; i++) {
			tags = tags.concat(bookmarks[i].tags);
		}
		if (tags.length) {
			uniqueTags.push({ value: tags[0], count: 1 });
			for (var t, j = 1; j < tags.length; j++) {
				t = tags[j];
				for (var ut, k = 0, match = false; k < uniqueTags.length; k++) {
					ut = uniqueTags[k];
					if (ut.value === t) {
						ut.count++;
						match = true;
					}
				}
				if (!match) {
					uniqueTags.push({ value: t, count: 1 });
				}
			}
			uniqueTags.sort(function (a,b) {
				var aVal = a.value.toLowerCase();
				var bVal = b.value.toLowerCase();
				if (aVal < bVal) return -1;
				if (aVal > bVal) return 1;
				return 0;
			});
			counts = uniqueTags.map(function (tag) { return tag.count; });
			counts.sort(function (a,b) {
				return b - a;
			});
		}
		var tagData = {
			tags      : uniqueTags,
			highCount : counts[0],
			lowCount  : counts[counts.length - 1]
		};
		console.log('tagData:', tagData);
		callback(tagData);
		return;
	}
	var successHandler = function (res) {
		var tagElements = res.responseXML.getElementsByTagName('tag');
		var counts = [];
		for (var i = 0; i < tagElements.length; i++) {
			tags.push({
				value : tagElements[i].getAttribute('tag'),
				count : tagElements[i].getAttribute('count') * 1
			});
			counts.push(tagElements[i].getAttribute('count') * 1);
		}
		tags.sort(function (a,b) {
			var aVal = a.value.toLowerCase();
			var bVal = b.value.toLowerCase();
			if (aVal < bVal) return -1;
			if (aVal > bVal) return 1;
			return 0;
		});
		counts.sort(function (a,b) {
			return b - a;
		});
		var tagData = {
			tags      : tags,
			highCount : counts[0],
			lowCount  : counts[counts.length - 1]
		};
		console.log('tagData:', tagData);
		callback(tagData);
	};
	doXHR('GET', services[service].endpoints['getTags'], null, null, successHandler);
}
function handleBeforeSearch(event) {
	/*if (event.query == 'cloudmarks exclusive address bar search 1') {
		event.preventDefault();
		se.settings.hijackBarSearch = true;
		alert('Cloudmarks is now exclusively handling address bar searches.');
	} else 
	if (event.query == 'cloudmarks exclusive address bar search 0') {
		event.preventDefault();
		se.settings.hijackBarSearch = false;
		alert('Cloudmarks is no longer handling address bar searches.');
	} else
	if (se.settings.hijackBarSearch) {
		event.preventDefault();
		showListPopover(event.query);
	}*/
	if (se.settings.allowBarSearch) {
		var markedQuery = /^\s*(\S+) +(.+)/.exec(event.query);
		if (markedQuery && markedQuery[1] == se.settings.barSearchPrefix) {
			event.preventDefault();
			showListPopover(markedQuery[2]);
		}
	}
}
function handleCommand(event) {
	switch (event.command) {
		case 'toggleList': {
			var mainButton = getMainButtonForActiveWindow();
			if (mainButton && se.popovers && se.settings.usePopover) {
				if (mainButton.popover.visible) {
					mainButton.popover.hide();
				} else {
					showListPopover();
				}
			} else {
				event.target.browserWindow.activeTab.page.dispatchMessage('toggleMmFrame', 'list.html');
			} break;
		}
		case 'toggleAddForm': {
			var addButton = getAddButtonForActiveWindow();
			if (addButton && se.popovers && se.settings.usePopover) {
				if (addButton.popover.visible) {
					addButton.popover.hide();
				} else {
					addButton.popover = getPopover('firstP');
					addButton.showPopover();
				}
			} else {
				event.target.browserWindow.activeTab.page.dispatchMessage('toggleMmFrame', 'add.html');
			} break;
		}
	}
}
function handleContextMenu(event) {
	if (event.userInfo) {
		event.contextMenu.appendContextMenuItem('addPbBookmark','Pin This Page to Pinboard');
	}
}
function handleMessage(event) {
	switch (event.name) {
		case 'getFavicon':
			var bookmark = event.message;
			getFavicon(bookmark.url, function (iconUrl) {
				event.target.page.dispatchMessage('showFavicon', {
					bookmark : bookmark,
					iconUrl  : iconUrl
				});
			});
		break;
		case 'openAddForm': 
			var button = getAddButtonForActiveWindow() || getMainButtonForActiveWindow();
			if (button && se.popovers && se.settings.usePopover) {
				button.popover = getPopover('firstP');
				button.showPopover();
			} else {
				event.target.page.dispatchMessage('insertMmFrame', 'add.html');
			}
		break;
		case 'openBookmark':
			openBookmark(event.message);
		break;
		case 'openBookmarklet':
			openBookmarklet(event.message);
		break;
		case 'openBookmarkAdder':
			openBookmarkAdder(event.message);
		break;
		case 'openList':
			var mainButton = getMainButtonForActiveWindow();
			if (mainButton && se.popovers && se.settings.usePopover) {
				showListPopover();
			} else {
				event.target.page.dispatchMessage('insertMmFrame', 'list.html');
			} 
		break;
		case 'openSettings':
			sa.activeBrowserWindow.openTab().url = se.baseURI + 'settings-main.html';
		break;
		case 'passSetting':
			var message = { key: event.message, value: se.settings[event.message] };
			event.target.page.dispatchMessage('receiveSetting', message);
		break;
		case 'passSettings':
			var response = {};
			for (var i = 0; i < event.message.length; i++) {
				response[event.message[i]] = se.settings[event.message[i]];
			}
			event.target.page.dispatchMessage('receiveSettings', response);
		break;
		case 'passAllSettings':
			var message = JSON.parse(JSON.stringify(se.settings));
			message.pageUrl   = sa.activeBrowserWindow.activeTab.url;
			message.pageTitle = sa.activeBrowserWindow.activeTab.title;
			event.target.page.dispatchMessage('receiveSettings', message);
		break;
		case 'passBookmarks':
			if (bookmarks === null || bookmarks === false) {
				getAllBookmarks(function () {
					event.target.page.dispatchMessage('receiveBookmarks', bookmarks);
				});
			} else {
				event.target.page.dispatchMessage('receiveBookmarks', bookmarks);
				checkForUpdates(event.timeStamp, function (data) {});
			}
		break;
		case 'passCurrentPageDescription':
			sa.activeBrowserWindow.activeTab.page.dispatchMessage('passPageDescription');
		break;
		case 'passTags':
			getTags(se.settings.service, function (tagData) {
				event.target.page.dispatchMessage('receiveTags', tagData);
			});
		break;
		case 'receivePageDescription':
			sa.activeBrowserWindow.activeTab.page.dispatchMessage('receivePageDescription', event.message);
		break;
		case 'reloadBookmarks':
			getAllBookmarks(function () {
				event.target.page.dispatchMessage('receiveBookmarks', bookmarks);
			});
		break;
		case 'removeMe':
			// event.message is andFocusParent
			event.target.page.dispatchMessage('removeMmFrame', event.message);
		break;
		case 'resetHotkey':
			se.settings[event.message] = defaults[event.message];
			event.target.page.dispatchMessage('receiveSettings', {
				hotkey    : se.settings.hotkey,
				addHotkey : se.settings.addHotkey
			});
		break;
		case 'saveHotkey':
			se.settings[event.message.which] = event.message.data;
			event.target.page.dispatchMessage('receiveSettings', {
				hotkey    : se.settings.hotkey,
				addHotkey : se.settings.addHotkey
			});
		break;
		case 'saveLastQuery':
			se.settings.lastQuery = event.message;
		break;
		case 'saveSetting':
			se.settings[event.message.name] = event.message.value;
		break;
		case 'setAbmService':
			if (event.message.enabled == true) {
				if (se.settings.abmServices.indexOf(event.message.service) == -1) {
					var abmServices = se.settings.abmServices;
					abmServices.push(event.message.service);
					se.settings.abmServices = abmServices;
				}
			} else {
				se.settings.abmServices = se.settings.abmServices.filter(function (service) {
					return service != event.message.service;
				});
			} 
			console.log('abm services is now:', se.settings.abmServices);
		break;
		case 'setBmService':
			console.log('setting bm service:', event.message, 'from:', event.target);
			se.settings.service = event.message;
			var abmServices = se.settings.abmServices;
			if (abmServices.indexOf(event.message) > -1)
				abmServices.splice(abmServices.indexOf(event.message), 1);
			abmServices.push(event.message);
			se.settings.abmServices = abmServices;
			console.log('abm services is now:', abmServices);
			delete localStorage.bookmarks;
			bookmarks = null;
			lastUpdateCheckTime = 0;
			if (event.target.title == 'Cloudmarks Settings') {
				getAllBookmarks();
			} 
		break;
		case 'setNewTabPosition':
			var targetBits = se.settings.targetBits;
			targetBits.tp = event.message;
			se.settings.targetBits = targetBits;
		break;
		case 'setPocketLogin':
			console.log('setting pocket login:', event.message, 'from:', event.target);
			se.secureSettings.pocketUsername = event.message.username;
			se.secureSettings.pocketPassword = event.message.password;
		break;
		case 'setTargetBits':
			se.settings.targetBits = event.message;
		break;
		case 'submitBookmark':
			event.target.page.dispatchMessage('removeMmFrame');
			se.settings.abmServices.forEach(function (service) {
				submitBookmark(service, event.message, function () {
					setTimeout(function () {
						checkForUpdates(null, null);
					}, 1000);
				});
			});
			se.settings.addShared = event.message.shared;
		break;
	}
}
function handleSettingChange(event) {
	if (event.newValue !== event.oldValue) {
		switch (event.key) {
			case 'hotkey':
			case 'addHotkey':
				passSettingsToAllPages([event.key]);
				break;
			case 'openSettings':
				sa.activeBrowserWindow.openTab().url = se.baseURI + 'settings-main.html';
				break;
			default: break;
		}
	}
}
function handleSubmitResult(service, result, callback) {
	if (service == se.settings.service) {
		if (callback) callback();
	}
}
function handleUpdateResult(updateTime, callback) {
	var updated = updateTime > bmDownTime;
	if (updated) {
		if (se.settings.service === 'google') {
			console.log('Bookmarks changed; fetching all bookmarks.');
			var getAllCallTimeElapsed = new Date() - getAllCallTime;
			getAllBookmarks(callback);
		}
	} else {
		console.log('No new bookmarks.');
		callback(false);
	}
}
function handleValidate(event) {
	if (event.command === 'toggleList' || event.command === 'toggleAddForm') {
		event.target.disabled = (!se.popovers || !se.settings.usePopover) && !sa.activeBrowserWindow.activeTab.url;
	}
}
function incrementBmHitCount(bmid) {
	bookmarks.forEach(function (bm) {
		if (bm.ident === bmid) {
			bm.hits++;
			console.log(bm.title, bm.hits);
		}
	});
}
function initializePopover(id) {
	getPopover(id).contentWindow.initialize();
}
function isNotEmpty(string) {
	return string !== '';
}
function isNotNoMoof(tag) {
	return tag !== "NoMoof";
}
function listBookmarksWithHitsGreaterThan(n) {
	bookmarks.filter(function (b) {
		return (b.hits > n);
	}).forEach(function (b) {
		console.log(b.ident, b.title, b.hits);
	});
}
function listCachedFavicons() {
	for (var key in localStorage) {
		if (/^favicon/.test(key)) {
			var iconObject = JSON.parse(localStorage[key]);
			console.log(key, '\n\t"' + iconObject.data.slice(0, 80) + '"');
		}
	}
}
function listMatchingBookmarks(regexpstr) {
	bookmarks.filter(function (bm) {
		return bm.title.match(new RegExp(regexpstr));
	}).forEach(function (bm) {
		console.log('title:', bm.title);
		console.log('ident:', bm.ident);
		console.log('hits:', bm.hits);
		console.log('blurb:', bm.blurb);
		console.log('tags:', (function () {
			var tags = '';
			bm.tags.forEach(function (tag) {
				tags += tag + ' ';
			});
			return tags;
		})());
		console.log('time:', bm.time);
		console.log('url:', bm.url);
		console.log('');
	});
}
function notTaggedNoMoof(bm) {
	return bm.tags.every(isNotNoMoof);
}
function openBookmark(args) {
	// { bmid:bmid, url:url, mk:e.metaKey, ck:e.ctrlKey, sk:e.shiftKey }
	var tarBits = se.settings.targetBits;
	var thisWin = sa.activeBrowserWindow;
	var allTabs = thisWin.tabs;
	var thisTab = thisWin.activeTab;
	var ttIndex = allTabs.indexOf(thisTab);
	var ntIndex = (tarBits.ta)? ttIndex + tarBits.tp : allTabs.length;
	var ntFocus = !(tarBits.tb ^ args.sk);
	var reversi = args.mk || args.ck;
	var thisTabIsBlank = (thisTab.url == undefined || thisTab.url == '' || thisTab.url == 'about:blank');

	if ((tarBits.nt && !thisTabIsBlank) ^ reversi) {
		if (tarBits.uw)
			sa.openBrowserWindow().activeTab.url = args.url;
		else {
			var newTab = thisWin.openTab('background', ntIndex);
			newTab.url = args.url;
			if (ntFocus) newTab.activate();
		}
	} else {
		thisTab.url = args.url;
	}

	if (args.bmid) {
		if (localStorage[args.bmid])
			localStorage[args.bmid]++;
		else
			localStorage[args.bmid] = 1;
		incrementBmHitCount(args.bmid);
	}
}
function openBookmarklet(args) {
	sa.activeBrowserWindow.activeTab.page.dispatchMessage('loadUrl', args.url);
	if (localStorage[args.bmid])
		localStorage[args.bmid]++;
	else
		localStorage[args.bmid] = 1;
}
function passSettingsToAllPages(keys) {
	var message = {};
	for (var i = 0; i < keys.length; i++) {
		message[keys[i]] = se.settings[keys[i]];
	}
	for (var i in sa.browserWindows) {
		var thisWindow = sa.browserWindows[i];
		for (var j in thisWindow.tabs) {
			var thisTab = thisWindow.tabs[j];
			if (thisTab.url.indexOf('http') === 0 || thisTab.url === 'about:blank')
			thisTab.page.dispatchMessage('receiveSettings', message);
		}
	}
}
function prependHashmark(tag) {
	return '#' + tag;
}
function saveBookmarks(callback) {
	bmDownTime = new Date();
	localStorage.bmDownTime = bmDownTime.getTime();
	bookmarks = bookmarks.filter(notTaggedNoMoof);
	localStorage.bookmarks = JSON.stringify(bookmarks);
	callback && callback(true);
}
function setButtonIcon(button, filename) {
	button.image = se.baseURI + filename + '.png';
	return button;
}
function sortBookmarks(bmarks,key) {
	bmarks.sort(function (a,b) {
		var aProp = a[key].toLowerCase();
		var bProp = b[key].toLowerCase();
		if (aProp < bProp) return -1;
		if (aProp > bProp) return 1;
		return 0;
	});
	return bmarks;
}
function showListPopover(query) {
	var mainButton = getMainButtonForActiveWindow();
	mainButton.popover = getPopover('listP');
	mainButton.showPopover();
	query && mainButton.popover.contentWindow.enterSearchQuery(query);
	mainButton.popover.contentWindow.refresh();
}
function stripHashmark(tag) {
	return tag.replace('#','');
}
function submitBookmark(service, data, callback) {
	var onSuccess = function (res) {
		handleSubmitResult(service, res, callback);
	};
	var onFailure = function (res) {
		alert('Cloudmarks could not add the bookmark to ' + services[service].name + '. Please try again later.');
	};
	if (service === 'google') {
		var url = 'https://www.google.com/bookmarks/mark?op=add';
		var b = encodeURIComponent(data.url);
		var t = encodeURIComponent(data.title);
		var l = encodeURIComponent(data.tags.replace(/, /g, ','));
		var a = encodeURIComponent(data.blurb);
		url += '&bkmk=' + b + '&title=' + t + '&labels=' + l + '&annotation=' + a;
		console.log('Adding injected script "googleadd.js"');
		se.addContentScriptFromURL(se.baseURI + 'googleadd.js', ['https://www.google.com/bookmarks/mark*'], [], true);
		var gaTab = sa.activeBrowserWindow.openTab('background');
		gaTab.addEventListener('message', function tempMsgHandler(e) {
			if (e.name === 'googleAddDone') {
				console.log('Got message "googleAddDone"');
				se.removeContentScript(se.baseURI + 'googleadd.js');
				if (callback) callback();
				gaTab.removeEventListener('message', tempMsgHandler, false);
				setTimeout(function () { gaTab.close() }, 250);
			}
		}, false);
		gaTab.url = url;
	}
}
function urlMatches(bookmark) {
	return bookmark.url == this.url;
}
function initializeSettings() {
	var lastVersion = se.settings.getItem('lastVersion');
	for (var key in defaults) {
		if (se.settings[key] === undefined) {
			se.settings[key] = defaults[key];
		}
	}
	se.settings.lastVersion = 2100;
}

const services = {
	'google' : {
		name : 'Google Bookmarks',
		endpoints: {
			'login'           : 'https://www.google.com/accounts/ServiceLogin?continue=http://www.google.com/',
			'getToken'        : 'https://www.google.com/bookmarks/mark?op=add&output=popup',
			'getAllBookmarks' : 'https://www.google.com/bookmarks/?output=xml&num=9999',
			'getUpdateTime'   : 'https://www.google.com/bookmarks/?output=xml&num=1',
			'addBookmark'     : 'https://www.google.com/bookmarks/mark',
		}
	}
};
const defaults = {
	usePopover      : !!(safari.extension.popovers),
	allowBarSearch  : false,
	barSearchPrefix : 'cm',
	targetBits      : { nt:false, uw:false, tb:false, ta:true, tp:1 },
	showRecents     : true,
	showFavorites   : false,
	recentsLength   : 12,
	sortSearchBy    : 'relevance',
	addShared       : false,
	service         : 'google',
	abmServices     : ['google'],
	hotkey : {
		which: 74,
		keyCode: 74,
		keyIdentifier: "U+004A",
		altKey: false,
		ctrlKey: false,
		metaKey: true,
		shiftKey: false
	},
	addHotkey : {
		which: 74,
		keyCode: 74,
		keyIdentifier: "U+004A",
		altKey: false,
		ctrlKey: false,
		metaKey: true,
		shiftKey: true
	}
};
const faviconRegex = /<link.* rel=['"](?:shortcut )?icon['"][^>]* href=['"]([^'"]+)['"][^>]*>/i;

var sa = safari.application;
var se = safari.extension;
var a = document.createElement('a');
var div = document.createElement('div');
var bmDownTime = (localStorage.bmDownTime) ? new Date(JSON.parse(localStorage.bmDownTime)) : null;
var getAllCallTime = (localStorage.getAllCallTime) ? new Date(JSON.parse(localStorage.getAllCallTime)) : null;
var waitingButton = null;
var waitTimers = [];
var updateTime = null;
var lastUpdateCheckTime = 0;
var bookmarks = (localStorage.bookmarks) ? JSON.parse(localStorage.bookmarks) : null;

initializeSettings();
cullOldFavicons();

sa.addEventListener('message', handleMessage, false);
sa.addEventListener('contextmenu', handleContextMenu, false);
sa.addEventListener('command', handleCommand, false);
sa.addEventListener('beforeSearch', handleBeforeSearch, true);
sa.addEventListener('validate', handleValidate, false);
se.settings.addEventListener('change', handleSettingChange, false);

if (bookmarks) {
	bookmarks.forEach(assignBookmarkHits);
}
