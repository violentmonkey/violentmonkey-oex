Violentmonkey
=============
Introduction
-------------
Greasemonkey is a very popular addon on Firefox and has lot of amazing scripts running through it. Opera has supported GM scripts for several versions but there are still some limits. Violentmonkey is designed for using Greasemonkey scripts on Opera.

Features
-------------
1. Install scripts from <http://userscripts.org>.
1. Update automatically according to the meta data.
1. Wrappers are imported so that variables will be separated in different scripts.
1. Matching rules can be URLs with wildcards or regular-expressions both start and end with a forward-slash (/), check Greasemonkey documents for more information.
1. Run scripts in order as shown in the list.
1. GM functions are supported.
1. Local *.user.js* files can be installed by dragging into Opera.
1. Support export to a zip file.

FAQ
-------------
1. <a name=faq_store></a>**Where is the data stored?**

   Since extensions of Opera do not have the permission to read or write in local drives, all the scripts are stored in the extension storage. Scripts can be exported to a zip file since version 1.2.

1. <a name=faq_local></a>**What about the local UserJS?**

   Violentmonkey does nothing with the local UserJS. They can work just as before. But make sure they are not both in UserJS folders and Violentmonkey, because that will make the script running twice.

1. <a name=faq_lib></a>**Do I need to install the required scripts (e.g. jQuery) to Violentmonkey along with the main one?**

   No. Even if they are installed, they make no difference. Violentmonkey will build a separated environment for each script, as a result, variables from different scripts will not be fetched by each other. All you need to do is to make sure the required scripts are required with *@require* rules in meta data. Violentmonkey will do the left.

Preview release (2012-1-2): <https://skydrive.live.com/redir?resid=9F63DC97688A095E!619>

Author: Gerald &lt;<gera2ld@163.com>&gt;
