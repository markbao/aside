function finish() {
	if (popover) {
		var gw = safari.extension.globalPage.contentWindow;
		safari.extension.settings.service = selectedService;
		safari.extension.settings.abmServices = [selectedService];
		safari.self.hide();
		if (selectedService === 'kippt') {
			gw.getKipptInboxId(function (inboxId) {
				safari.extension.settings.kipptGetList = inboxId;
				gw.getAllBookmarks(null, gw.showListPopover);
			});
		} else {
			gw.getAllBookmarks(null, gw.showListPopover);
		}
	} else {
		safari.self.tab.dispatchMessage('setBmService', selectedService);
		if (selectedService != 'local') {
			safari.self.tab.dispatchMessage('setAbmService', { service: selectedService, enabled: true });
		}
		window.location.href = safari.extension.baseURI + 'list.html';
	}
}
function initialize() {
	selectedService = '';
	popover = !!(safari.self.identifier);
	if (popover) {
		document.body.className = 'popover';
		safari.self.height = 480;
	} else {
		document.documentElement.className = 'iframed';
		document.body.className = 'iframed';
		document.documentElement.addEventListener('click', function (e) {
			e.stopPropagation();
			if (e.button == 0 && e.target == document.documentElement) {
				safari.self.tab.dispatchMessage('removeMe', true);
			}
		}, false);
	}
}
function setService() {
	var btn = event.currentTarget;
	var serviceBtns = document.querySelectorAll('.servicebtn');
	for (var i = 0; i < serviceBtns.length; i++) {
		serviceBtns[i].className = 'servicebtn';
	}
	btn.className = 'servicebtn selected';
	selectedService = btn.id;
	var loginBtn = document.querySelector('#loginbtn');
	loginBtn.textContent = (selectedService == 'local') ? 'Finish' : 'Log In';
	loginBtn.className = 'enabled';
	loginBtn.onclick = finish;
	if (selectedService == 'local') {
		document.querySelector('#dptip').className = 'hidden tip';
		document.querySelector('#gbtip').className = 'hidden tip';
	} else {
		document.querySelector('#dptip').className = 'tip';
		document.querySelector('#gbtip').className = 'hidden tip';
	}
}
