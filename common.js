var $=document.getElementById.bind(document),bg=opera.extension.bgProcess;
window.addEventListener('DOMContentLoaded',function(){
	var nodes=document.querySelectorAll('*[data-i18n]');
	for(var i=0;i<nodes.length;i++) nodes[i].innerHTML=bg._(nodes[i].getAttribute('data-i18n'));
},false);
