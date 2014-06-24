function handleSelectKeyDown(e) {
	if (String.fromCharCode(e.which) == ' ') {
		var tiVal = document.getElementById('tags').value;
		var sOpt = e.target.options[e.target.selectedIndex];
		if (sOpt.style.color === 'black') {
			sOpt.style.color = 'red';
			document.getElementById('tags').value += (tiVal) ? ' ' + sOpt.text : sOpt.text;
		}
		else if (sOpt.style.color === 'red') {
			sOpt.style.color = 'black';
			var newTiVal = tiVal;
			var re = new RegExp(sOpt.text + ' *','gi');
			tiVal = tiVal.replace(re,'');
			document.getElementById('tags').value = tiVal;
		}
	}
}
function handleOptMouseDown(e) {
	var tiVal = document.getElementById('tags').value;
	if (this.style.color === 'black') {
		this.style.color = 'red';
		document.getElementById('tags').value += (tiVal) ? ' ' + this.text : this.text;
	}
	else if (this.style.color === 'red') {
		this.style.color = 'black';
		var newTiVal = tiVal;
		var re = new RegExp(this.text + ' *','gi');
		tiVal = tiVal.replace(re,'');
		document.getElementById('tags').value = tiVal;
	}
}
function handleOptDblClick(e) {
	var sel = this.parentNode;
	for (var i=0; i<sel.options.length; i++)
		sel.options[i].style.color = 'black';
	this.style.color = 'red';
	document.getElementById('tags').value = this.text;
	sel.blur();
	sel.focus();
}
function insertTagMenu(tags) {
	var tiRow = tagInput.parentNode.parentNode;
	var tBody = tiRow.parentNode;
	var tagSelect = document.createElement('select');
	var tsRow = document.createElement('tr');
	var tsCell0 = document.createElement('td');
	var tsCell1 = document.createElement('td');

	tagSelect.id = 'tagSelect';
	tagSelect.multiple = false;
	tagSelect.size = 5;
	tagSelect.style.width = '300px';
	tagSelect.addEventListener('keydown', handleSelectKeyDown);

	for (var i=0; i<tags.length; i++) {
		var opt = document.createElement('option');
		opt.text = tags[i];
		opt.style.color = 'black';
		opt.addEventListener('mousedown', handleOptMouseDown);
		opt.addEventListener('dblclick', handleOptDblClick);
		tagSelect.add(opt);
	}
	
	tsCell1.appendChild(tagSelect);
	tsRow.appendChild(tsCell0);
	tsRow.appendChild(tsCell1);
	tBody.insertBefore(tsRow, tiRow.nextSibling);
}
function handleMessage(msg) {
	if (msg.name === 'receiveTags') {
		if (msg.message.length > 0) {
			insertTagMenu(msg.message);
		}
	}
}
