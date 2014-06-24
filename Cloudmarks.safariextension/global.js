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
	var hitCount = localStorage.getItem(bm.ident);
	if (hitCount) {
		bm.hits = hitCount * 1;
	}
}
function bookmarkUrlIs(bookmark) {
	return bookmark.url === this.toString();
}
function cacheFavicon(iconData, baseUrl) {
	localStorage.setItem('favicon@' + baseUrl, JSON.stringify({
		data : iconData,
		time : new Date().getTime()
	}));
}
function checkForUpdates(timeStamp, callback) {
	if (!bookmarks) {
		getAllBookmarks(se.settings.service, callback);
		return;
	}
	if (se.settings.service == 'local') {
		callback && callback();
		return;
	}
	console.log('Bookmarks last downloaded:', bmDownTime);
	var url = SERVICES[se.settings.service].endpoints['getUpdateTime'];
	var onSuccess;
	var onFailure = function () {
		updateTime = false;
	};
	if (timeStamp == null || timeStamp - lastUpdateCheckTime > 15000) {
		if (se.settings.service === 'kippt') {
			url += '?limit=1&list=' + se.settings.kipptGetList || '';
			onSuccess = function (res) {
				var data = JSON.parse(res.responseText);
				updateTime = new Date((data.objects[0].updated + '000') * 1);
				console.log('updateTime:', updateTime, ' bmDownTime:', bmDownTime);
				handleUpdateResult(updateTime, callback);
			};
		} else {
			onSuccess = function (res) {
				try {
					var update = res.responseXML.getElementsByTagName('update')[0];
					var isoTime = update.getAttribute('time');
					handleUpdateResult(new Date(isoTime), callback);
				} catch(e) {
					console.log('Error:', e);
					console.log('Update response:', res.responseText);
				}
			};
		}
		doXHR('GET', url, null, null, onSuccess, onFailure);
		lastUpdateCheckTime = timeStamp;
	} else {
		console.log('Less than 15 seconds since last update request; not checking.');
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
			var cacheTime = JSON.parse(localStorage.getItem(key)).time;
			if (cacheTime < (now - 2592000000)) {
				localStorage.removeItem(key);
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
function deleteBookmarkFromService(service, bookmark, callback) {
	console.log('Deleting bookmark for', bookmark.url);
	service = service || se.settings.service;
	if (service == 'local') {
		deleteBookmarkLocally(bookmark.ident);
		callback && callback();
		return;
	}
	var onSuccess = function (result) {
		deleteBookmarkLocally(bookmark.ident);
		callback && callback();
	};
	var onFailure = function () {
		alert('Cloudmarks could not delete the bookmark from your ' + SERVICES[service].name + ' account.');
	};
	if (service === 'kippt') {
		method = 'DELETE';
		xhrData = bookmark.ident + '/';
	} else {
		method = 'GET',
		xhrData = '?url=' + encodeURIComponent(bookmark.url);
	}
	doXHR(method, SERVICES[service].endpoints['deleteBookmark'], xhrData, null, onSuccess, onFailure);
}
function deleteBookmarkLocally(id) {
	for (var i = bookmarks.length - 1; i >= 0; i--) {
		if (bookmarks[i].ident == id) {
			bookmarks.splice(i, 1);
			break;
		}
	}
	localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
	localStorage.removeItem(id);
}
function deleteCachedFavicons() {
	for (var key in localStorage) {
		if (/^favicon/.test(key)) {
			localStorage.removeItem(key);
		}
	}
}
function doXHR(method, url, data, contentType, successHandler, errorHandler, timeout) {
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
				    + SERVICES[se.settings.service].name + ' account. The error message was:\n\n"' 
				    + this.responseText + '"'
				);
			}
		}
	};
	if ((method == 'GET' || method == 'DELETE') && data) 
		url += data;
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
			alert('Cloudmarks could not connect to ' + SERVICES[se.settings.service].name + '.');
		}
	}, timeout || 30000);
}
function escape(text) {
	div.textContent = text;
	return div.innerHTML;
}
function findCachedFavicon(searchString) {
	for (var key in localStorage) {
		if (new RegExp('^favicon@.*' + searchString.replace(/\./g, '\\.')).test(key)) {
			var iconObject = JSON.parse(localStorage.getItem(key));
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
function getAllBookmarks(service, callback) {
	service = service || se.settings.service;
	if (service == 'local') {
		var lb = localStorage.getItem('bookmarks');
		bookmarks = lb ? JSON.parse(lb) : [];
		callback && callback();
		return;
	}
	var xhrData = '';
	var successHandler, errorHandler;
	bookmarks = [];
	if (service === 'kippt') {
		xhrData = '?limit=200&list=' + (se.settings.kipptGetList || '');
		successHandler = function (res) {
			processKipptClips(JSON.parse(res.responseText), false, callback);
		};
		errorHandler = function (response) {
			bookmarks = false;
			var notice = 'Cloudmarks encountered an error while accessing your ' 
			    + SERVICES[service].name + ' account. The error message was:\n\n"' 
			    + response.responseText + '"';
			alert(notice);
		};
	} else {
		successHandler = function (res) {
			if (res.responseXML === null) {
				bookmarks = false;
				sa.activeBrowserWindow.openTab().url = SERVICES[service].endpoints['getAllBookmarks'];
				return;
			}
			var posts = res.responseXML.getElementsByTagName('post');
			for (var p, i = 0; i < posts.length; i++) {
				p = posts[i];
				bookmarks.push({
					url   : p.getAttribute('href'),
					title : p.getAttribute('description'),
					blurb : escape(p.getAttribute('extended')),
					tags  : p.getAttribute('tag').split(/ +/),
					time  : p.getAttribute('time'),
					ident : p.getAttribute('hash'),
					hits  : localStorage.getItem(p.getAttribute('hash')) * 1 || 0
				});
			}
			saveBookmarks(callback);
		};
		errorHandler = function (response) {
			var notice;
			bookmarks = false;
			if (response.status == 0) {
				notice = 'The ' + SERVICES[service].name +
					' API server does not seem to be available. Please try again later.';
			} else {
				notice = 'Cloudmarks encountered an error while accessing your ' 
				    + SERVICES[service].name + ' account. The error message was:\n\n"' 
				    + response.responseText + '"';
			}
			alert(notice);
		};
	}
	getAllCallTime = new Date().getTime();
	localStorage.setItem('getAllCallTime', getAllCallTime);
	doXHR('GET', SERVICES[service].endpoints['getAllBookmarks'], xhrData, null, successHandler, errorHandler);
}
function getBaseUrl(pageUrl) {
	a.href = pageUrl;
	return a.protocol + '//' + a.host;
}
function getBookmarkFromId(id) {
	for (var bookmark, i = 0; i < bookmarks.length; i++) {
		bookmark = bookmarks[i];
		if (bookmark.ident == id) {
			return bookmark;
		}
	} return null;
}
function getCachedFavicon(baseUrl) {
	var lsItem = localStorage.getItem('favicon@' + baseUrl);
	if (lsItem) {
		var cachedIconEntry = JSON.parse(lsItem);
		if (cachedIconEntry.time > (new Date().getTime() - 2592000000)) {
			return cachedIconEntry.data;
		} else {
			localStorage.removeItem('favicon@' + baseUrl);
		}
	}
	return null;
}
function getFavicon(pageUrl, callback) {
	var baseUrl = getBaseUrl(pageUrl);
	var firstCallback = function (error, result) {
		if (error) {
			if (error == 401) {
				console.log('Access forbidden to favicon at ' + baseUrl);
				finalCallback(null, null);
			} else {
				console.log('No favicon.ico at ' + baseUrl + '; trying alternate method.');
				getFaviconUrlFromPage(pageUrl, secondCallback);
			}
		} else {
			console.log('favicon.ico found at ' + baseUrl);
			finalCallback(null, result);
		}
	};
	var secondCallback = function (error, result) {
		if (result) {
			console.log('Favicon web url found for ' + pageUrl + ':', result);
			getFaviconFromUrl(result, baseUrl, finalCallback);
		} else {
			console.log('No favicon found for', pageUrl);
			finalCallback(null, null);
		}
	};
	var finalCallback = function (error, result) {
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
		callback(null, iconUrl);
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
						callback(null, result);
					};
					reader.readAsDataURL(blob)
				} else {
					callback(this.status);
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
				var regexResult = FAVICONREGEX.exec(this.responseText);
				if (regexResult && regexResult[1]) {
					callback(null, regexResult[1]);
				} else {
					callback(null, null);
				}
			} else {
				callback(this.status);
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
function getKipptInboxId(callback) {
	getKipptLists(function (lists) {
		var inboxId = lists.filter(function (list) {
			return list.slug == 'inbox';
		})[0].id;
		callback(inboxId);
	});
}
function getKipptNewBookmarks(since, callback) {
	var xhrData = '?limit=200&list=' + (se.settings.kipptGetList || '');
	if (since && since instanceof Date) {
		xhrData += '&since=' + Math.round(since.getTime()/1000);
	}
	doXHR('GET', SERVICES['kippt'].endpoints['getAllBookmarks'], xhrData, null, function (xhr) {
		processKipptClips(JSON.parse(xhr.responseText), true, callback);
	});
}
function getKipptLists(callback) {
	var successHandler = function (res) {
		callback(JSON.parse(res.responseText).objects);
	};
	var errorHandler = function (res) {
		var notice = 'Cloudmarks encountered an error while accessing your Kippt account. The error message was:\n\n"' 
		    + res.responseText + '"';
		alert(notice);
	};
	doXHR('GET', SERVICES['kippt'].endpoints['getLists'], null, null, successHandler, errorHandler);
}
function getMainButtonForActiveWindow() {
	return se.toolbarItems.filter(function (button) {
		return button.identifier === 'ti_main' && button.browserWindow === sa.activeBrowserWindow;
	})[0];
}
function getNewBookmarks(since, callback) {
	if (se.settings.service == 'local') {
		callback && callback();
		return;
	}
	var isoSince = since ? since.toISOString().split('.')[0] + 'Z' : '';
	console.log('Getting new bookmarks since', isoSince);
	var xhrData = isoSince ? '&fromdt=' + isoSince : '';
	var successHandler = function (res) {
		var posts = res.responseXML.getElementsByTagName('post');
		console.log(posts.length + ' new posts:', posts);
		var newmarks = [];
		for (var p, i = 0; i < posts.length; i++) {
			p = posts[i];
			newmarks.push({
				url   : p.getAttribute('href'),
				title : p.getAttribute('description'),
				blurb : escape(p.getAttribute('extended')),
				tags  : p.getAttribute('tag').split(/ +/),
				time  : p.getAttribute('time'),
				ident : p.getAttribute('hash'),
				hits  : localStorage.getItem(p.getAttribute('hash')) * 1 || 0
			});
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
		var notice;
		if (response.status == 0) {
			notice = 'The ' + SERVICES[se.settings.service].name +
				' API server does not seem to be available. Please try again later.';
		} else {
			notice = 'Cloudmarks encountered an error while accessing your ' 
			    + SERVICES[se.settings.service].name + ' account. The error message was:\n\n"' 
			    + response.responseText + '"';
		}
		alert(notice);
	};
	doXHR('GET', SERVICES[se.settings.service].endpoints['getAllBookmarks'], xhrData, null, successHandler, errorHandler);
}
function getPopover(id) {
	return se.popovers.filter(function (po) {
		return po.identifier == id;
	})[0];
}
function getTags(service, callback) {
	service = service || se.settings.service;
	var tags = [];
	if (service == 'local' || service == 'kippt') {
		var uniqueTags = [], counts = [];
		for (var i = 0; i < bookmarks.length; i++) {
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
	doXHR('GET', SERVICES[service].endpoints['getTags'], null, null, successHandler);
}
function handleBeforeSearch(evt) {
	if (se.settings.allowBarSearch) {
		var markedQuery = /^\s*(\S+) +(.+)/.exec(evt.query);
		if (markedQuery && markedQuery[1] == se.settings.barSearchPrefix) {
			evt.preventDefault();
			showListPopover(markedQuery[2]);
		}
	}
}
function handleCommand(evt) {
	switch (evt.command) {
		case 'toggleList': {
			var mainButton = getMainButtonForActiveWindow();
			if (mainButton && se.popovers && se.settings.usePopover) {
				if (mainButton.popover.visible) {
					mainButton.popover.hide();
				} else {
					if (se.settings.service) {
						showListPopover();
					} else {
						mainButton.popover = getPopover('firstP');
						mainButton.showPopover();
					}
				}
			} else {
				var ifSrc = (se.settings.service) ? 'list.html' : 'firstrun.html';
				evt.target.browserWindow.activeTab.page.dispatchMessage('toggleMmFrame', ifSrc);
			} break;
		}
		case 'toggleAddForm': {
			var addButton = getAddButtonForActiveWindow();
			if (addButton && se.popovers && se.settings.usePopover) {
				if (addButton.popover.visible) {
					addButton.popover.hide();
				} else {
					if (se.settings.service) {
						addButton.popover = getPopover('addP');
						initializePopover('addP');
					} else {
						addButton.popover = getPopover('firstP');
					}
					addButton.showPopover();
				}
			} else {
				var ifSrc = (se.settings.service) ? 'add.html' : 'firstrun.html';
				evt.target.browserWindow.activeTab.page.dispatchMessage('toggleMmFrame', ifSrc);
			} break;
		}
	}
}
function handleContextMenu(evt) {
	if (evt.userInfo) {
		evt.contextMenu.appendContextMenuItem('addPbBookmark','Pin This Page to Pinboard');
	}
}
function handleMessage(evt) {
	switch (evt.name) {
		case 'getFavicon':
			var bookmark = evt.message;
			if (!bookmark.url) { break; }
			getFavicon(bookmark.url, function (iconUrl) {
				evt.target.page.dispatchMessage('showFavicon', {
					bookmark : bookmark,
					iconUrl  : iconUrl
				});
			});
			break;
		case 'deleteBookmark':
			var bookmarkId = evt.message;
			deleteBookmarkFromService(null, getBookmarkFromId(bookmarkId), function () {
				evt.target.page.dispatchMessage('bookmarkDeleted', bookmarkId);
			});
			break;
		case 'openAddForm': 
			var button = getAddButtonForActiveWindow() || getMainButtonForActiveWindow();
			if (button && se.popovers && se.settings.usePopover) {
				if (se.settings.service) {
					button.popover = getPopover('addP');
					initializePopover('addP');
				} else {
					button.popover = getPopover('firstP');
				}
				button.showPopover();
			} else {
				var ifSrc = (se.settings.service) ? 'add.html' : 'firstrun.html';
				evt.target.page.dispatchMessage('insertMmFrame', ifSrc);
			} break;
		case 'openBookmark':
			openBookmark(evt.message);
			break;
		case 'openBookmarklet':
			openBookmarklet(evt.message);
			break;
		case 'openBookmarkAdder':
			openBookmarkAdder(evt.message);
			break;
		case 'openList':
			var mainButton = getMainButtonForActiveWindow();
			if (mainButton && se.popovers && se.settings.usePopover) {
				if (se.settings.service) {
					showListPopover();
				} else {
					mainButton.popover = getPopover('firstP');
					mainButton.showPopover();
				}
			} else {
				var ifSrc = (se.settings.service) ? 'list.html' : 'firstrun.html';
				evt.target.page.dispatchMessage('insertMmFrame', ifSrc);
			} 
			break;
		case 'openSettings':
			sa.activeBrowserWindow.openTab().url = se.baseURI + 'settings-main.html';
			break;
		case 'passSetting':
			var message = { key: evt.message, value: se.settings[evt.message] };
			evt.target.page.dispatchMessage('receiveSetting', message);
			break;
		case 'passSettings':
			var response = {};
			for (var i = 0; i < evt.message.length; i++) {
				response[evt.message[i]] = se.settings[evt.message[i]];
			}
			evt.target.page.dispatchMessage('receiveSettings', response);
			break;
		case 'passAllSettings':
			var message = JSON.parse(JSON.stringify(se.settings));
			message.pageUrl   = sa.activeBrowserWindow.activeTab.url;
			message.pageTitle = sa.activeBrowserWindow.activeTab.title;
			evt.target.page.dispatchMessage('receiveSettings', message);
			break;
		case 'passBookmarks':
			if (bookmarks === null || bookmarks === false) {
				getAllBookmarks(se.settings.service, function () {
					evt.target.page.dispatchMessage('receiveBookmarks', bookmarks);
				});
			} else {
				evt.target.page.dispatchMessage('receiveBookmarks', bookmarks);
				checkForUpdates(evt.timeStamp, null);
			} break;
		case 'passCurrentPageDescription':
			sa.activeBrowserWindow.activeTab.page.dispatchMessage('passPageDescription');
			break;
		case 'passExistingBookmark':
			var existingBookmark = _.findWhere(bookmarks, { url: sa.activeBrowserWindow.activeTab.url });
			evt.target.page.dispatchMessage('receiveExistingBookmark', existingBookmark);
			break;
		case 'passKipptLists':
			getKipptLists(function (lists) {
				evt.target.page.dispatchMessage('receiveKipptLists', {
					lists   : lists,
					getList : se.settings.kipptGetList,
					addList : se.settings.kipptAddList
				});
			});
			break;
		case 'passTags':
			getTags(se.settings.service, function (tagData) {
				evt.target.page.dispatchMessage('receiveTags', tagData);
			});
			break;
		case 'receivePageDescription':
			sa.activeBrowserWindow.activeTab.page.dispatchMessage('receivePageDescription', evt.message);
			break;
		case 'reloadBookmarks':
			getAllBookmarks(se.settings.service, function () {
				evt.target.page.dispatchMessage('receiveBookmarks', bookmarks);
			});
			break;
		case 'removeMe':
			// evt.message is andFocusParent
			evt.target.page.dispatchMessage('removeMmFrame', evt.message);
			break;
		case 'clearHotkey':
			se.settings[evt.message] = {};
			evt.target.page.dispatchMessage('receiveSettings', {
				hotkey    : se.settings.hotkey,
				addHotkey : se.settings.addHotkey
			});
			break;
		case 'resetHotkey':
			se.settings[evt.message] = DEFAULTS[evt.message];
			evt.target.page.dispatchMessage('receiveSettings', {
				hotkey    : se.settings.hotkey,
				addHotkey : se.settings.addHotkey
			});
			break;
		case 'saveHotkey':
			se.settings[evt.message.which] = evt.message.data;
			evt.target.page.dispatchMessage('receiveSettings', {
				hotkey    : se.settings.hotkey,
				addHotkey : se.settings.addHotkey
			});
			break;
		case 'saveLastQuery':
			se.settings.lastQuery = evt.message;
			break;
		case 'saveSetting':
			se.settings[evt.message.name] = evt.message.value;
			break;
		case 'setAbmService':
			if (evt.message.enabled == true) {
				if (se.settings.abmServices.indexOf(evt.message.service) == -1) {
					var abmServices = se.settings.abmServices;
					abmServices.push(evt.message.service);
					se.settings.abmServices = abmServices;
				}
			} else {
				se.settings.abmServices = se.settings.abmServices.filter(function (service) {
					return service != evt.message.service;
				});
			} 
			console.log('abm services is now:', se.settings.abmServices);
			break;
		case 'setBmService':
			var service = evt.message;
			var previousService = se.settings.service;
			console.log('Setting bm service:', service);
			se.settings.service = service;
			if (service != 'local') {
				if (previousService) {
					localStorage.setItem('localBookmarks', localStorage.getItem('bookmarks'));
					var doSync;
					var question = 'Do you want to sync your local bookmarks to ' + SERVICES[service].name
						+ '? If not, any unique local bookmarks will be deleted.';
					doSync = confirm(question);
					if (doSync) {
						syncBookmarks(service);
					} else {
						localStorage.removeItem('bookmarks');
						bookmarks = null;
						lastUpdateCheckTime = 0;
						getAllBookmarks(service);
					}
				} else {
					getAllBookmarks(service);
				}
			}
			var abmServices = se.settings.abmServices;
			if (service != 'local' && abmServices.indexOf(service) < 0) {
				abmServices.push(service);
			}
			se.settings.abmServices = abmServices;
			console.log('abm services is now:', abmServices);
			break;
		case 'setKipptAddList':
			se.settings.kipptAddList = evt.message;
			break;
		case 'setKipptGetList':
			se.settings.kipptGetList = evt.message;
			getAllBookmarks('kippt');
			break;
		case 'setNewTabPosition':
			var targetBits = se.settings.targetBits;
			targetBits.tp = evt.message;
			se.settings.targetBits = targetBits;
			break;
		case 'setTargetBits':
			se.settings.targetBits = evt.message;
			break;
		case 'submitBookmark':
			evt.target.page.dispatchMessage('removeMmFrame');
			if (se.settings.service == 'local') {
				submitBookmark('local', evt.message);
			}
			se.settings.abmServices.forEach(function (service) {
				submitBookmark(service, evt.message, function (successful) {
					if (successful) {
						setTimeout(function () { checkForUpdates(null, null) }, 1000);
					}
				});
			});
			se.settings.addShared = evt.message.shared;
			se.settings.addAsUnread = evt.message.toread;
			break;
		default: ;
	}
}
function handleSettingChange(evt) {
	if (evt.newValue !== evt.oldValue) {
		switch (evt.key) {
			case 'hotkey':
			case 'addHotkey':
				passSettingsToAllPages([evt.key]);
				break;
			case 'openSettings':
				if (sa.activeBrowserWindow) {
					sa.activeBrowserWindow.openTab().url = se.baseURI + 'settings-main.html';
				} else {
					sa.openBrowserWindow().activeTab.url = se.baseURI + 'settings-main.html';
				} break;
			default: ;
		}
	}
}
function handleUpdateResult(updateTime, callback) {
	var updated = updateTime > bmDownTime;
	if (updated) {
		if (se.settings.service === 'kippt') {
			console.log('Bookmarks changed; fetching new bookmarks.');
			getKipptNewBookmarks(bmDownTime, callback);
		} else {
			console.log('Bookmarks changed; fetching new bookmarks.');
			getNewBookmarks(bmDownTime, callback);
		}
	} else {
		console.log('No new bookmarks.');
		callback && callback(false);
	}
}
function handleValidate(evt) {
	if (evt.command === 'toggleList' || evt.command === 'toggleAddForm') {
		evt.target.disabled = (!se.popovers || !se.settings.usePopover) && !sa.activeBrowserWindow.activeTab.url;
	}
}
function incrementHitCount(bookmarkId) {
	var hitCount = localStorage.getItem(bookmarkId) * 1;
	localStorage.setItem(bookmarkId, hitCount + 1);
	console.log('Hit count for "' + bookmarkId + '" incremented to', localStorage.getItem(bookmarkId) * 1);
	bookmarks.forEach(function (bm) {
		if (bm.ident == bookmarkId) {
			bm.hits++;
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
			var iconObject = JSON.parse(localStorage.getItem(key));
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
		incrementHitCount(args.bmid);
	}
}
function openBookmarklet(args) {
	sa.activeBrowserWindow.activeTab.page.dispatchMessage('loadUrl', args.url);
	if (args.bmid) {
		incrementHitCount(args.bmid);
	}
}
function passSettingsToAllPages(keys) {
	var message = {};
	var i;
	for (i = 0; i < keys.length; i++) {
		message[keys[i]] = se.settings[keys[i]];
	}
	for (i in sa.browserWindows) {
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
function processKipptClips(oResponse, addToStart, callback) {
	console.log('Kippt response:', oResponse.meta, oResponse.objects.length);
	var clips = oResponse.objects;
	for (var bm, clip, i = 0; i < clips.length; i++) {
		clip = clips[i];
		bm = {
			url   : clip.url,
			title : clip.title,
			blurb : (clip.notes) ? escape(clip.notes.replace(/#\w* ?/g, '').trim()) : '',
			tags  : (function () {
				if (!clip.notes) return [];
				var hashtags = clip.notes.match(/\#\w*/g);
				return (hashtags) ? hashtags.map(stripHashmark).filter(isNotEmpty) : [];
			})(),
			time  : new Date((clip.updated + '000') * 1).toISOString().split('.')[0] + 'Z',
			ident : clip.id + '',
			hits  : localStorage.getItem(clip.id + '') * 1 || 0
		};
		if (addToStart) {
			bookmarks.unshift(bm);
		} else {
			bookmarks.push(bm);
		}
	}
	if (oResponse.meta.next && oResponse.objects.length > 0) {
		console.log('Getting next page of Kippt items; offset = ' + /\d+$/.exec(oResponse.meta.next)[0]);
		doXHR('GET', 'https://kippt.com' + oResponse.meta.next, null, null, function (xhr) {
			processKipptClips(JSON.parse(xhr.responseText), addToStart, callback);
		});
	} else {
		saveBookmarks(callback);
	}
}
function saveBookmarks(callback) {
	bmDownTime = new Date();
	localStorage.setItem('bmDownTime', bmDownTime.getTime());
	bookmarks = bookmarks.filter(notTaggedNoMoof);
	localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
	callback && callback(true);
}
function searchBookmarks(service, query, callback) {
	service = service || se.settings.service;
	if (service === 'kippt') {
		var xhrUrl = SERVICES['kippt'].endpoints['search'] + '?q=' + encodeURIComponent(query) 
			+ '&list=' + (se.settings.kipptGetList || '');
		console.log('Kippt bookmark search url:', xhrUrl);
		doXHR('GET', xhrUrl, null, 'application/json', function (res) {
			console.log('Kippt bookmark search result:', JSON.parse(res.responseText));
			callback(res);
		});
	}
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
	if (typeof query == 'string') {
		mainButton.popover.contentWindow.enterSearchQuery(query);
	}
	mainButton.popover.contentWindow.refresh();
}
function stripHashmark(tag) {
	return tag.replace('#','');
}
function submitBookmark(service, data, callback) {
	service = service || se.settings.service;
	if (service == 'local') {
		// url, title, blurb, tags, time, ident, hits
		var bookmark = {
			url   : data.url,
			title : data.title,
			blurb : data.blurb,
			tags  : data.tags.split(/ *, */),
			time  : (new Date()).toISOString().split('.')[0] + 'Z',
			ident : _.random(999999999),
			hits  : 0
		};
		bookmarks.unshift(bookmark);
		localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
		return;
	}
	var onSuccess = function (result) {
		if (service == 'delicious' || service == 'pinboard') {
			if (!result || !result.responseXML) {
				console.log('No result for bookmark submission.');
				if (callback && service == se.settings.service) {
					callback(false);
				}
			}
			var resultCode = result.responseXML.getElementsByTagName('result')[0].getAttribute('code');
			console.log('Submit bookmark result code for ' + service + ':', resultCode);
			if (resultCode != 'done' && resultCode != 'item already exists') {
				alert(
					'Cloudmarks encountered a problem submitting the bookmark to ' + SERVICES[service].name + 
					'.\n\nPlease contact canisbos@gmail.com with the error code shown below.' + 
					'\n\nError code: ' + resultCode
				);
				if (callback && service == se.settings.service) {
					callback(false);
				}
				return;
			}
		}
		if (callback && service == se.settings.service) {
			callback(true);
		}
	};
	var onFailure = function () {
		alert('Cloudmarks could not add the bookmark to ' + SERVICES[service].name + '. Please try again later.');
		if (callback && service == se.settings.service) {
			callback(false);
		}
	};
	if (service === 'kippt') {
		var hashTags = (data.tags) ? data.tags.split(', ').map(prependHashmark).join(' ') : '';
		var oldBookmarks = bookmarks.filter(bookmarkUrlIs, data.url);
		if (oldBookmarks.length) {
			searchBookmarks('kippt', data.url.split('//')[1].split('/')[0], function (res) {
				var hostMatchedClips = JSON.parse(res.responseText).objects;
				var urlMatchedClips = hostMatchedClips.filter(bookmarkUrlIs, data.url);
				if (urlMatchedClips[0]) {
					var xhrUrl = SERVICES['kippt'].endpoints['addBookmark'] + urlMatchedClips[0].id + '/';
					console.log('Kippt update bookmark url:', xhrUrl);
					var xhrData = JSON.stringify({
						title : data.title,
						notes : data.blurb + hashTags,
						url   : data.url
					});
					doXHR('PUT', xhrUrl, xhrData, 'application/json', onSuccess, onFailure, 60000);
				}
			});
		} else {
			var xhrData = JSON.stringify({
				url : data.url,
				title : data.title,
				notes : (data.blurb) ? (data.blurb + (hashTags ? ' ' + hashTags : '')) : (hashTags ? hashTags : ''),
				list  : se.settings.kipptAddList ? '/api/lists/' + se.settings.kipptAddList + '/' : ''
			});
			var endpoint = SERVICES['kippt'].endpoints['addBookmark'];
			doXHR('POST', endpoint, xhrData, 'application/json', onSuccess, onFailure, 60000);
		}
	} else {
		var xhrData = '?url=' + encodeURIComponent(data.url) +
			'&description=' + encodeURIComponent(data.title) +
			'&extended=' + encodeURIComponent(data.blurb) +
			'&tags=' + encodeURIComponent(data.tags.replace(/, /g, ',')) +
			'&shared=' + (data.shared ? 'yes' : 'no') +
			'&toread=' + (data.toread ? 'yes' : 'no');
		doXHR('GET', SERVICES[service].endpoints['addBookmark'], xhrData, null, onSuccess, onFailure, 60000);
	}
}
function syncBookmarks(service) {
	service = service || se.settings.service;
	localStorage.setItem('localBookmarks', localStorage.getItem('bookmarks'));
	var localBookmarks = JSON.parse(localStorage.getItem('localBookmarks'));
	localStorage.removeItem('bookmarks');
	bookmarks = null;
	getAllBookmarks(service, function () {
		var remoteBookmarkURLs = _.pluck(bookmarks, 'url');
		var uniqueLBMs = localBookmarks.reduce(function (collected, lbm) {
			if (!_.contains(remoteBookmarkURLs, lbm.url))
				collected.push(lbm);
			return collected;
		}, []);
		console.log('Unique local bookmarks:', uniqueLBMs);
		var beforeSubmitTime = new Date();
		if (uniqueLBMs.length == 0) {
			alert('Your ' + SERVICES[service].name + ' account was already up to date.');
			return;
		}
		async.eachLimit(uniqueLBMs, 3, function (bookmark, asyncCallback) {
			var data = _.clone(bookmark);
			data.tags = bookmark.tags.join(',');
			submitBookmark(service, data, function (successful) {
				asyncCallback(!successful);
			});
		}, function (error) {
			if (error) {
				alert('Could not submit all bookmarks.');
			} else {
				alert('All unique bookmarks uploaded.');
				getNewBookmarks(beforeSubmitTime);
			}
		});
	});
}
function urlMatches(bookmark) {
	return bookmark.url == this.url;
}
function initializeSettings() {
	var lastVersion = se.settings.getItem('lastVersion');
	for (var key in DEFAULTS) {
		if (se.settings[key] === undefined) {
			se.settings[key] = DEFAULTS[key];
		}
	}
	if (lastVersion < 2200) {
		if (se.settings.service == 'google') {
			var apology = 'Sorry, Cloudmarks no longer supports Google Bookmarks.\n\n'
				+ 'Your bookmarks have been converted to local-only storage.';
			alert(apology);
			se.settings.service = 'local';
		}
	}
	se.settings.lastVersion = 2200;
}

const SERVICES = {
	'pinboard' : {
		name : 'Pinboard',
		endpoints: {
			'getAllBookmarks' : 'https://api.pinboard.in/v1/posts/all?format=xml',
			'getUpdateTime'   : 'https://api.pinboard.in/v1/posts/update',
			'getTags'         : 'https://api.pinboard.in/v1/tags/get',
			'addBookmark'     : 'https://api.pinboard.in/v1/posts/add',
			'deleteBookmark'  : 'https://api.pinboard.in/v1/posts/delete'
		}
	},
	'delicious' : {
		name : 'Delicious',
		endpoints: {
			'getAllBookmarks' : 'http://feeds.delicious.com/v1/posts/all?format=xml',
			'getUpdateTime'   : 'http://feeds.delicious.com/v1/posts/update',
			'getTags'         : 'http://feeds.delicious.com/v1/tags/get',
			'addBookmark'     : 'http://feeds.delicious.com/v1/posts/add',
			'deleteBookmark'  : 'http://feeds.delicious.com/v1/posts/delete'
		}
	},
	'kippt' : {
		name : 'Kippt',
		endpoints: {
			'getAllBookmarks' : 'https://kippt.com/api/clips/',
			'getUpdateTime'   : 'https://kippt.com/api/clips/',
			'getLists'        : 'https://kippt.com/api/lists/',
			'addBookmark'     : 'https://kippt.com/api/clips/',
			'deleteBookmark'  : 'https://kippt.com/api/clips/',
			'search'          : 'https://kippt.com/api/search/clips/'
		}
	}
};
const DEFAULTS = {
	usePopover      : !!(safari.extension.popovers),
	allowBarSearch  : false,
	barSearchPrefix : 'cm',
	targetBits      : { nt:false, uw:false, tb:false, ta:true, tp:1 },
	showRecents     : true,
	showFavorites   : false,
	recentsLength   : 12,
	sortSearchBy    : 'relevance',
	addShared       : false,
	addAsUnread     : false,
	service         : null,
	abmServices     : [],
	kipptGetList    : '',
	kipptAddList    : '',
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
const FAVICONREGEX = /<link.* rel=['"](?:shortcut )?icon['"][^>]* href=['"]([^'"]+)['"][^>]*>/i;

var sa = safari.application;
var se = safari.extension;
var a = document.createElement('a');
var div = document.createElement('div');
var bmDownTime = localStorage.getItem('bmDownTime') * 1;
var getAllCallTime = localStorage.getItem('getAllCallTime') * 1;
var waitingButton = null;
var waitTimers = [];
var updateTime = null;
var lastUpdateCheckTime = 0;
var bookmarks = localStorage.getItem(bookmarks);

if (bookmarks != null) {
	bookmarks = JSON.parse(bookmarks);
}
if (bmDownTime) {
	bmDownTime = new Date(bmDownTime);
}

initializeSettings();
cullOldFavicons();

sa.addEventListener('message', handleMessage, false);
sa.addEventListener('contextmenu', handleContextMenu, false);
sa.addEventListener('command', handleCommand, false);
sa.addEventListener('beforeSearch', handleBeforeSearch, true);
sa.addEventListener('validate', handleValidate, false);
se.settings.addEventListener('change', handleSettingChange, false);

if (se.settings.service == null) {
	bookmarks = null;
	for (var key in localStorage) {
		if (!/^favicon/.test(key)) {
			localStorage.removeItem(key);
		}
	}
	if (se.popovers) {
		var mainButton = getMainButtonForActiveWindow();
		if (mainButton) {
			mainButton.popover = getPopover('firstP');
		}
	}
	sa.activeBrowserWindow.activeTab.url = sa.activeBrowserWindow.activeTab.url;
} else {
	bookmarks && bookmarks.forEach(assignBookmarkHits);
}
