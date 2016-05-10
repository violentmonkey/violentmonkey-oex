define('utils/i18n', function (_require, _exports, module) {
	function getData() {
		var xhr = new XMLHttpRequest;
		xhr.open('GET', '/messages.json', true);
		xhr.responseType = 'json';
		xhr.onload = function () {
			messages = this.response;
		};
		xhr.onerror = function () {
			// Though this should not happen, it did happened!
			setTimeout(getData, 500);
		};
		xhr.send();
	}
	var messages = {};
	getData();
	module.exports = function (key, args) {
		if (!key) return '';
		var value = messages[key];
		var data = '';
		if (value) {
			args = args || [];
			args.unshift(key);
			data = value.message.replace(/\$(?:\{(\d+)\}|(\d+))/g, function(match, group1, group2) {
				var arg = args[group1 || group2];
				return arg == null ? match : arg;
			});
		}
		return data;
	};
});
