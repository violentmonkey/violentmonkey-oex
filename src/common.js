if (opera.extension && opera.extension.bgProcess) {
	_.bg = opera.extension.bgProcess;
  _.require = _.bg._require;
	// Promise MUST be the same contructor
	window.Promise = _.bg.Promise;

  _.sendMessage = function () {
    var commands = _.require('app').commands;
    return function (req) {
      var func = commands[req.cmd];
      return Promise.resolve(func && func(req.data));
    };
  }();
} else {
	_.bg = window;
}

_.options = function () {
	var defaults = {
		isApplied: true,
		autoUpdate: true,
		lastUpdate: 0,
		showButton: true,
		showBadge: true,
		exportValues: true,
		closeAfterInstall: false,
	};

	function getOption(key, def) {
		var value = widget.preferences.getItem(key), obj;
		if(value) try {
			obj = JSON.parse(value);
		} catch(e) {
			obj = def;
		} else obj = def;
		if (obj == null) obj = defaults[key];
		return obj;
	}

	function setOption(key, value) {
		if (key in defaults)
			widget.preferences.setItem(key, JSON.stringify(value));
	}

	function getAllOptions() {
		var options = {};
		for (var i in defaults) options[i] = getOption(i);
		return options;
	}

	return {
		get: getOption,
		set: setOption,
		getAll: getAllOptions,
	};
}();

_.updateCheckbox = function (e) {
  var target = e.target;
  _.options.set(target.dataset.check, target.checked);
};

_.zfill = function (num, length) {
  num = num.toString();
  while (num.length < length) num = '0' + num;
  return num;
};

_.getUniqId = function () {
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
};

_.getLocaleString = function (meta, key) {
	var languages = [navigator.language];
	var i = languages[0].indexOf('-');
	if (i > 0) {
		var lang = languages[0];
		languages[0] = lang.slice(0, i) + lang.slice(i).toUpperCase();
		languages.push(lang.slice(0, i));
	}
	lang = _.find(languages, function (lang) {
		return (key + ':' + lang) in meta;
	});
	if (lang) key += ':' + lang;
	return meta[key] || '';
};
