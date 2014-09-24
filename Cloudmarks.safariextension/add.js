window.onload = initialize;

function goAway(andFocusParent) {
	if (popover) {
		setTimeout('safari.self.hide()', 100);
		// setTimeout is workaround for bug in Snow Leopard
	} else {
		safari.self.tab.dispatchMessage('removeMe', true);
	}
}
function handleAddMarkKeyPress(evt) {
	if (evt.which === 13) {
		evt.currentTarget.blur();
		submitBookmark();
	}
}
function handleMessage(evt) {
	switch (evt.name) {
		case 'receiveSettings':
			_.extend(settings, evt.message);
			if (evt.message.pageTitle || evt.message.pageUrl) {
				populateForm();
			} break;
		case 'receiveExistingBookmark':
			if (evt.message) {
				$('#header h1').text('Edit Bookmark');
				populateFormFromExistingBookmark(evt.message);
			} else {
				$('#header h1').text('Add Bookmark');
				safari.self.tab.dispatchMessage('passCurrentPageDescription');
			} break;
		case 'receivePageDescription':
			console.log('Got description:', evt.message);
			$amBlurbField.val(evt.message);
			break;
		case 'receiveTags':
			populateTagMenu(evt.message);
			break;
		default: ;
	}
}
function handleMessageForPopover(evt) {
	if (evt.name == 'receivePageDescription') {
		$amBlurbField.val(evt.message);
	}
}
function handleOutsideClick(evt) {
	if (evt.button == 0 && evt.target == evt.currentTarget) {
		goAway(true);
	}
}
function initialize(firstTime) {
	window.focus();
	popover = !!(safari.self.identifier);
	iframed = !popover;
	if (iframed || firstTime) {
		if (popover) {
			sa = safari.application;
			se = safari.extension;
			gw = se.globalPage.contentWindow;
			settings = se.settings;
			console = gw.console;
			safari.self.height = document.body.offsetHeight + 40;
			$('body').addClass('popover');
			sa.addEventListener('message', handleMessageForPopover, false);
		} else {
			settings = {};
			$('body').addClass('iframed').on('click', handleOutsideClick);
			$('html').on('click', handleOutsideClick);
			safari.self.addEventListener('message', handleMessage, false);
			safari.self.tab.dispatchMessage('passAllSettings');
			safari.self.tab.dispatchMessage('passExistingBookmark');
			safari.self.tab.dispatchMessage('passTags');
		}
		$amTitleField = $('input#title').on('blur', trimField);
		$amUrlField = $('input#url').on('blur', trimField);
		$amBlurbField = $('textarea#blurb').on('blur', trimField);
		$amSharedField = $('input#shared');
		$amUnreadField = $('input#toread');
		$amTagsField = $('input#tags').select2({
			tags        : [],
			openOnEnter : false, 
			width       : '100%'
		});
		$('button#cancel').on('keydown', function (evt) {
			evt.preventDefault();
			$(this).one('keyup', function (evt2) {
				if (evt2.which == 9) {
					$amTitleField.focus();
				}
			});
		});
		$(document).on('keydown', function (evt) {
			if (evt.which == 27) {
				goAway(true);
				return false;
			}
		});
		$(document).on('keypress', 'input', handleAddMarkKeyPress);
	} else {
		if (sa.activeBrowserWindow.activeTab.page) {
			var existingBookmark = _.findWhere(gw.bookmarks, { url: sa.activeBrowserWindow.activeTab.url });
			if (existingBookmark) {
				$('#header h1').text('Edit Bookmark');
				populateFormFromExistingBookmark(existingBookmark);
			} else {
				if (sa.activeBrowserWindow.activeTab.page)
					sa.activeBrowserWindow.activeTab.page.dispatchMessage('passPageDescription');
				$('#header h1').text('Add Bookmark');
				populateForm();
			}
		} else {
			populateForm();
		}
		gw.getTags(settings.service, function (tagData) {
			populateTagMenu(tagData);
		});
	}
}
function populateForm() {
	$amTitleField.val(popover ? sa.activeBrowserWindow.activeTab.title : settings.pageTitle).select();
	$amUrlField.val(popover ? sa.activeBrowserWindow.activeTab.url : settings.pageUrl).prop('disabled', false);
	$amBlurbField.val('');
	$amSharedField.prop('checked', settings.addShared);
	$amUnreadField.prop('checked', settings.addAsUnread);
	$('#options').toggle(_.intersection(settings.abmServices, ['pinboard','delicious']).length > 0);
}
function populateFormFromExistingBookmark(bookmark) {
	$amTitleField.val(bookmark.title).select();
	$amUrlField.val(bookmark.url).prop('disabled', true);
	$amBlurbField.val(bookmark.blurb);
	$amSharedField.prop('checked', settings.addShared);
	$amUnreadField.prop('checked', settings.addAsUnread);
	$('#options').toggle(_.intersection(settings.abmServices, ['pinboard','delicious']).length > 0);
	$(window).one('tagsfilled', function () {
		$amTagsField.select2('val', bookmark.tags);
	});
}
function populateTagMenu(tagData) {
	if (!tagData || !tagData.tags || !tagData.tags.length) 
		return;
	var html = '';
	var countRange = tagData.highCount - tagData.lowCount;
	tagData.tags.sort(function (a,b) { return a.count - b.count });
	var tags = tagData.tags.map(function (tag) { return tag.value });
	// console.log('tags:', tags);
	$amTagsField.select2({
		tags            : tags,
		tokenSeparators : [','],
		openOnEnter     : false,
		width           : '100%'
	}).select2('val', '');
	safari.self.height = document.body.offsetHeight + 40;
	$(window).trigger('tagsfilled');
}
function submitBookmark() {
	var data = {
		url    : $amUrlField.val().trim(),
		title  : $amTitleField.val().trim(),
		blurb  : $amBlurbField.val().trim(),
		tags   : $amTagsField.val().trim(),
		shared : $amSharedField.prop('checked'),
		toread : $amUnreadField.prop('checked')
	};
	if (popover) {
		settings.abmServices.forEach(function (service) {
			gw.submitBookmark(service, data, function callback() {
				setTimeout(function () {
					console.log('Checking for updates after submit.');
					gw.checkForUpdates(null, function () {});
				}, 1000);
			});
		});
		settings.addShared = data.shared;
		settings.addAsUnread = data.toread;
		goAway();
	} else {
		safari.self.tab.dispatchMessage('submitBookmark', data);
	}
}
function trimField() {
	this.value = this.value.trim();
}
