Violentmonkey
=============
<h3>Introduction</h3>
<p>Greasemonkey is a very popular addon on Firefox and has lot of amazing scripts running through it. Opera has supported GM scripts for several versions but there are still some limits. Violentmonkey is designed for using Greasemonkey scripts on Opera.</p>
<h3>Features</h3><ol>
<li>Install scripts from <a href=http://userscripts.org>UserScripts.org</a>.</li>
<li>Update automatically according to the meta data.</li>
<li>Wrappers are imported so that variables will be separated in different scripts.</li>
<li>Matching rules can be URLs with wildcards or regular-expressions both start and end with a forward-slash (/), check Greasemonkey documents for more information.</li>
<li>Run scripts in order as shown in the list.</li>
<li>GM functions are supported.</li>
<li>Local <font color=olive>.user.js</font> files can be installed by dragging into Opera.</li>
<li>Support export to a zip file.
</ol>
<h3>FAQ</h3><ol>
<li><a name=faq_store></a><b>Where is the data stored?</b><p>Since extensions of Opera do not have the permission to read or write in local drives, all the scripts are stored in the extension storage. Scripts can be exported to a zip file since version 1.2.</p></li>
<li><a name=faq_local></a><b>What about the local UserJS?</b><p>Violentmonkey does nothing with the local UserJS. They can work just as before. But make sure they are not both in UserJS folders and Violentmonkey, because that will make the script running twice.</p></li>
<li><a name=faq_lib></a><b>Do I need to install the required scripts (e.g. jQuery) to Violentmonkey along with the main one?</b><p>No. Even if they are installed, they make no difference. Violentmonkey will build a separated environment for each script, as a result, variables from different scripts will not be visited by each other. All you need to do is to make sure the required scripts are required with <i style="color:olive">@require</i> rules in meta data. Violentmonkey will do the left.</p></li>
</ol>
<p>Preview release (2012-1-2): https://skydrive.live.com/redir?resid=9F63DC97688A095E!619</p>
<p>Author: Gerald &lt;gera2ld&#x40;myopera.com&gt;</p>
