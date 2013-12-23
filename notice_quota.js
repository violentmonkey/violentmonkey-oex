$('config').onclick=function(e){
	e.preventDefault();
	bg.opera.extension.tabs.create({url:'opera:config#PersistentStorage|DomainQuotaForDatabases'}).focus();
};
