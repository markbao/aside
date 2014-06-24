window.onload = initialize;

function addToTagsField(tag) {
	amTagsField.value += (amTagsField.value.length) ? ', ' : '';
	amTagsField.value += tag;
}
function goAway(andFocusParent) {
	if (popover) {
		setTimeout('safari.self.hide()', 100);
		// setTimeout is workaround for bug in Snow Leopard
	} else safari.self.tab.dispatchMessage('removeMe', true);
}
function handleAddMarkKeyPress(e) {
	if (e.which === 13) {
		e.target.blur();
		submitBookmark();
	}
}
function handleMessage(e) {
	switch (e.name) {
		case 'receiveSettings':
			for (var key in e.message)
				settings[key] = e.message[key];
			if (e.message.pageTitle || e.message.pageUrl)
				populateAddMarkForm(true);
		break;
		case 'receivePageDescription':
			console.log('Got description:', e.message);
			populateAddMarkForm(false, e.message);
		break;
		case 'receiveTags':
			populateTagCloud(e.message);
		break;
	}
}
function handleMessageForPopover(e) {
	switch (e.name) {
		case 'receivePageDescription':
			populateAddMarkForm(false, e.message);
		break;
	}
}
function handleOutsideClick(e) {
	if (e.button == 0 && e.target == e.currentTarget) 
		goAway(true);
}
function initialize(firstTime) {
	window.focus();
	popover = !!(safari.self.identifier);
	iframed = !popover;
	sa = safari.application;
	gw = (popover) ? safari.extension.globalPage.contentWindow : null;
	if (firstTime) {
		if (popover) {
			console = gw.console;
			safari.self.height = document.body.offsetHeight + 40;
			settings = safari.extension.settings;
			document.body.className += ' popover';
			sa.addEventListener('message', handleMessageForPopover, false);
		} else {
			settings = {};
			document.body.className += ' iframed';
			document.body.onclick = handleOutsideClick;
			document.documentElement.onclick = handleOutsideClick;
			safari.self.addEventListener('message', handleMessage, false);
			safari.self.tab.dispatchMessage('passAllSettings');
			safari.self.tab.dispatchMessage('passCurrentPageDescription');
			safari.self.tab.dispatchMessage('passTags');
		}
		amBox = document.querySelector('#am_div');
		amTitleField = document.querySelector('input#title');
		amTitleField.onblur = trimField;
		amTitleField.onkeypress = handleAddMarkKeyPress;
		amUrlField = document.querySelector('input#url');
		amUrlField.onblur = trimField;
		amUrlField.onkeypress = handleAddMarkKeyPress;
		amBlurbField = document.querySelector('textarea#blurb');
		amBlurbField.onblur = trimField;
		amTagsField = document.querySelector('input#tags');
		amTagsField.onblur = function () {
			this.value = this.value.replace(/^[,\s]+/,'').replace(/ +/g,' ').replace(/[,\s]+/g,', ').replace(/[,\s]+$/,'');
		};
		amTagsField.onkeypress = handleAddMarkKeyPress;
		amTagCloud = document.querySelector('#tagCloud');
		amSubmitButton = document.querySelector('button#submit');
		amCancelButton = document.querySelector('button#cancel');
		amCancelButton.onkeydown = function (e) {
			e.preventDefault();
			amCancelButton.onkeyup = function (e) {
				amCancelButton.onkeyup = null;
				if (e.which == 9) amTitleField.focus();
			};
		};
		document.onkeydown = function (e) {
			if (e.which === 27) {
				e.preventDefault();
				e.stopPropagation();
				goAway(true);
				return;
			}
		};
	} else {
		sa.activeBrowserWindow.activeTab.page.dispatchMessage('passPageDescription');
		populateAddMarkForm(true);
		gw.getTags(safari.extension.settings.service, function (tagData) {
			populateTagCloud(tagData);
		});
	}
}
function populateAddMarkForm(initial, blurb) {
	if (initial) {
		amTitleField.value = (popover) ? sa.activeBrowserWindow.activeTab.title : settings.pageTitle;
		amUrlField.value = (popover) ? sa.activeBrowserWindow.activeTab.url : settings.pageUrl;
		amTitleField.select();
		amBlurbField.value = blurb || '';
	}
	if (blurb) amBlurbField.value = blurb;
}
function populateTagCloud(tagData) {
	if (!tagData || !tagData.tags || !tagData.tags.length) 
		return;
	var html = '';
	var countRange = tagData.highCount - tagData.lowCount;
	tagData.tags.forEach(function (tag) {
		var rank = ((tag.count - tagData.lowCount) / countRange).toFixed(1) * 1;
		var size = rank * 10 + 12;
		var opacity = (1 - rank) * 0.25 + 0.75;
		html += '<a href="javascript:addToTagsField(\'' + tag.value + '\')" style="font-size:' + size 
			+ 'px; opacity:' + opacity + '">' + tag.value + '</a>\n';
	});
	amTagCloud.innerHTML = html;
	tagWords = tagData.tags.map(function (tag) {
		return tag.value;
	});
	tagCollection = tagWords;
	safari.self.height = document.body.offsetHeight + 40;
}
function submitBookmark() {
	var data = {
		url    : amUrlField.value.trim(),
		title  : amTitleField.value.trim(),
		blurb  : amBlurbField.value.trim(),
		tags   : amTagsField.value.trim()
	};
	if (popover) {
		safari.extension.settings.abmServices.forEach(function (service) {
			gw.submitBookmark(service, data, function callback() {
				setTimeout(function () {
					console.log('Checking for updates after submit.');
					gw.checkForUpdates(null, function () {});
				}, 1000);
			});
		});
		goAway();
	} else {
		safari.self.tab.dispatchMessage('submitBookmark', data);
	}
}
function trimField() {
	this.value = this.value.trim();
}
