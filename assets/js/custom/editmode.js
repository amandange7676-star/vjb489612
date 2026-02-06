
$(document).ready(function () {

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

$(document).ready(function () {

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}


    $(document).on('click', '.edit-site', function() {
     var filename = $(this).attr("href");
        // alert('filename------------------: ' + filename);
        console.log('filename: ', filename);

        var clientName = getCookie('clientName');
        // alert('clientName: ' + clientName);

        var clientProjectName = getCookie('projectName') || getCookie('clientProjectName');
        // alert('clientProjectName: ' + clientProjectName);

        if (filename){
            console.log('requested file ------- ' + filename);
        } else {
            console.log('filename missing ---------- ');
            return;
        }

        console.log('clientprojectname',clientProjectName)
        $.ajax({
            type: 'POST',
            url: "es/",
            data: {
            'clientName': clientName,
            'clientProjectName': clientProjectName,
            'srcReq': filename
            },
            headers: {
                 "X-Requested-With": "XMLHttpRequest",
            },
            success: function (data) {
                console.log('data: ', data)

            //   var newTab = window.open("", "_self");
            window.location.href =
            `/es/?srcReq=${filename}`;


            },
            error: function (data, errmsg, err) {
                alert(data.responseJSON.errorMessage);
            }
          });
          return false;
      });
 });

 });























// $(document).ready(function () {

//     function getCookie(name) {
//         const value = `; ${document.cookie}`;
//         const parts = value.split(`; ${name}=`);
//         if (parts.length === 2) return parts.pop().split(';').shift();
//         return null;
//     }

//     $(document).on('click', '.edit-site', function () {

//         var filename = $(this).attr("href");
//         console.log('filename: ', filename);

//         if (!filename) {
//             console.log('filename missing');
//             return false;
//         }

//         var clientName = getCookie('clientName');
//         var clientProjectName = getCookie('projectName') || getCookie('clientProjectName');

//         console.log('clientprojectname', clientProjectName);

//         // Cache bust token
//         const CACHE_BUST = Date.now();

//         $.ajax({
//             type: 'POST',
//             url: "es/",
//             data: {
//                 clientName: clientName,
//                 clientProjectName: clientProjectName,
//                 srcReq: filename
//             },
//             headers: {
//                 "X-Requested-With": "XMLHttpRequest"
//             },

//             success: function (data) {
//                 console.log('data: ', data);

//                 var newTab = window.open("", "_self");

//                 // Inject <base> with cache busting
//                 const baseUrl =
//                     `${window.location.protocol}//${window.location.host}/?_=${CACHE_BUST}`;

//                 const updatedData = data.replace(
//                     /<head([^>]*)>/i,
//                     `<head$1><base href="${baseUrl}">`
//                 );

//                 newTab.document.open();
//                 newTab.document.write(updatedData);
//                 newTab.document.close();

//                 newTab.onload = function () {

//                     function cacheBust(url) {
//                         return url.includes('?')
//                             ? url + '&_=' + CACHE_BUST
//                             : url + '?_=' + CACHE_BUST;
//                     }

//                     function appendElement(tag, attributes, toBody) {
//                         var element;

//                         if (tag === 'script') {
//                             const bustedSrc = cacheBust(attributes.src);

//                             element = newTab.document.querySelector(
//                                 'script[src="' + bustedSrc + '"]'
//                             );

//                             if (!element) {
//                                 element = newTab.document.createElement(tag);
//                                 element.src = bustedSrc;
//                                 element.type = attributes.type || 'text/javascript';

//                                 if (toBody) {
//                                     newTab.document.body.appendChild(element);
//                                 } else {
//                                     newTab.document.head.appendChild(element);
//                                 }
//                             }
//                         }

//                         if (tag === 'link') {
//                             const bustedHref = cacheBust(attributes.href);

//                             element = newTab.document.createElement(tag);
//                             element.rel = attributes.rel;
//                             element.href = bustedHref;

//                             newTab.document.head.appendChild(element);
//                         }
//                     }

//                     // Hidden input
//                     $('<input>', {
//                         type: 'hidden',
//                         class: 'hidden selectedPageName',
//                         name: 'selectedPageName',
//                         value: filename
//                     }).appendTo(newTab.document.body);

//                     // Styles (cache-busted)
//                     appendElement('link', {
//                         rel: 'stylesheet',
//                         href: 'https://cdn.quilljs.com/1.3.6/quill.snow.css'
//                     }, false);

//                     appendElement('link', {
//                         rel: 'stylesheet',
//                         href: 'assets/css/custom/editmode.css'
//                     }, false);

//                     appendElement('link', {
//                         rel: 'stylesheet',
//                         href: 'assets/css/custom/custom.css'
//                     }, false);

//                     // Scripts (cache-busted)
//                     appendElement('script', {
//                         src: 'https://cdn.quilljs.com/1.3.6/quill.min.js',
//                         type: 'text/javascript'
//                     }, true);

//                     appendElement('script', {
//                         src: 'assets/js/custom/main.js',
//                         type: 'text/javascript'
//                     }, true);

//                     appendElement('script', {
//                         src: 'assets/js/custom/editmode.js',
//                         type: 'text/javascript'
//                     }, true);

//                     appendElement('script', {
//                         src: 'assets/js/custom/editModeScript.js',
//                         type: 'text/javascript'
//                     }, true);

//                     // Rebind edit links
//                     var anchorTags = newTab.document.querySelectorAll('a');
//                     anchorTags.forEach(function (anchor) {
//                         anchor.classList.add('edit-site');
//                     });
//                 };
//             },

//             error: function (data) {
//                 alert(data.responseJSON?.errorMessage || "Error");
//             }
//         });

//         return false;
//     });
// });
