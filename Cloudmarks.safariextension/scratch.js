function downloadBookmarksAndPassTo(target) {
	var url = 'https://api.pinboard.in/v1/posts/all';
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			console.log(xhr);
			if (xhr.status === 200) {
				var posts = xhr.responseXML.getElementsByTagName('post');
				bookmarks = [];
				for (var i = 0; i < posts.length; i++) {
					var attrs = posts[i].attributes;
					var mark = {};
					for (var j = 0; j < attrs.length; j++) {
						mark[attrs[j].name] = attrs[j].value;
					}
					bookmarks.push(mark);
				}
			} else {
				var notice = 'Cloudmarks could not log in to your Pinboard account. ';
					notice += 'Please check your username and password.';
				bookmarks = false;
			}
			target.page.dispatchMessage('receiveBookmarks', bookmarks);
			if (notice) alert(notice);
		}			
	};
	xhr.open('GET', url, true);
	xhr.send(null);
}

function downloadTagsAndPassTo(target) {
	var url = 'https://api.pinboard.in/v1/tags/get';
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			console.log(xhr);
			if (xhr.status === 200) {
				var tags = [];
				var tagElements = xhr.responseXML.getElementsByTagName('tag');
				for (var i = 0; i < tagElements.length; i++) {
					tags.push(tagElements[i].getAttribute('tag'));
				}
			} else {
				var notice = 'Cloudmarks could not log in to your Pinboard account. ';
					notice += 'Please check your username and password.';
				tags = false;
			}
			target.page.dispatchMessage('receiveTags', tags);
			if (notice) alert(notice);
		}			
	};
	xhr.open('GET', url, true);
	xhr.send(null);
}

