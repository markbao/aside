window.onbeforeunload = function () {
	safari.self.tab.dispatchMessage('googleAddDone');
};

document.getElementsByName('add_bkmk_form')[0].submit();
