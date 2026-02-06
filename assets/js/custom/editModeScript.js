var changedFiles = new Set();

function syncChangedFilesToSession() {
    sessionStorage.setItem(
        "changedFiles",
        JSON.stringify(Array.from(changedFiles))
    );
}

function loadChangedFilesFromSession() {
    const stored = sessionStorage.getItem("changedFiles");
    if (stored) {
        try {
            changedFiles = new Set(JSON.parse(stored));
        } catch (e) {
            console.warn("Failed to restore changedFiles", e);
            changedFiles = new Set();
        }
    }
}

function clearChangedFilesSession() {
    changedFiles.clear();
    sessionStorage.removeItem("changedFiles");
}


$(document).ready(function () {
    loadChangedFilesFromSession();
    console.log("Restored changed files:", Array.from(changedFiles));


    // alert("EditModeScript loaded");
    // Initialization
    var wrapper = $('#wrapper').addClass('editableSection');
    var topBar = $('<div>', { id: 'top-bar', class: 'top-bar' }).insertBefore(wrapper);
    // var imageUpload = $('<input type="file" id="image-upload" class="hidden" accept="image/*" />').appendTo('body');
    $('<form method="post" id="imgForm" class="hidden" enctype="multipart/form-data">').appendTo('body');
    $('<input type="file" name="imgFile" id="image-upload" class="hidden" accept="image/*">').appendTo('#imgForm');
    $('<input type="text" class="hidden formFieldFileName" name="imgFileName" value="">').appendTo('#imgForm');
    $('<input type="text" class="hidden selectedPageName" name="selectedPageName" value="">').appendTo('body');


    $('<input type="text" class="hidden selectedPageName" name="selectedPageName" value="">').appendTo('body');


const token = localStorage.getItem('feature_key');
const repoOwner = localStorage.getItem('owner');
const repoName = localStorage.getItem('repo_name');
const branch = "main";

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}

async function getLatestSha(filePath) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`,
      {
        headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json" }
      }
    );
    if (res.ok) return (await res.json()).sha;
  } catch {
    console.warn("Could not fetch latest SHA for", filePath);
  }
  return null;
}

function extractRepoPath(imgSrc) {
  // Ensure we always end up with: "assets/images/filename.ext"
  return imgSrc
    .replace(/^https?:\/\/[^/]+\//, '')   // remove domain (e.g., https://domain.com/)
    .replace(/^testing\//, '')            // remove any "testing/" prefix if present
    .replace(/^\/+/, '')                  // remove leading slashes
    .replace(/^.*?(assets\/)/, 'assets/'); // trim everything before "assets/"
}
// ---------------- EDIT MODE IMAGE HANDLING ----------------
var isEditingContent = false;
var isEditingImages = false;

/* ---------------- COOKIE HELPER ---------------- */
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

/* ---------------- URL → FILE ---------------- */
function urlToFile(url, filename, callback) {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // important for CORS
    img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(function (blob) {
            const file = new File([blob], filename, { type: blob.type });
            callback(file);
        }, 'image/jpeg');
    };
    img.onerror = function () {
        alert('Cannot load image from URL. Make sure it allows cross-origin access.');
    };
    img.src = url;
}

/* ---------------- UPLOAD TO DJANGO ---------------- */
function uploadImgData(file, originalEl) {
    const clientName = getCookie('clientName');
    const clientProjectName = getCookie('clientProjectName');

    if (!clientName || !clientProjectName) {
        alert("clientName or clientProjectName missing in cookies");
        return;
    }

    const formData = new FormData();

    const originalSrc = $(originalEl).attr('data-original-src');
    if (!originalSrc) {
        alert("data-original-src missing");
        return;
    }

    const originalFileName = originalSrc.split('/').pop();

    formData.append('imgFile', file);
    formData.append('imgFileName', originalFileName);
    formData.append('clientName', clientName);
    formData.append('clientProjectName', clientProjectName);

    $.ajax({
        type: "POST",
        url: "/fuos/",
        data: formData,
        processData: false,
        contentType: false,
        success: function () {


        const previewPath =
                `/client-assets/${clientName}/${clientProjectName}/${originalSrc}`;

            if ($(originalEl).is('img')) {
                $(originalEl).attr('src', previewPath + '?v=' + Date.now());
            } else {
                $(originalEl).css('background-image',
                    `url("${previewPath}?v=${Date.now()}")`);
            }
             //  TRACK IMAGE FILE
             changedFiles.add(originalSrc);
             syncChangedFilesToSession();

             console.log('changedFiles: ', changedFiles)
    },
        error: function (xhr) {
            alert("Upload error: " + xhr.responseText);
        }
    });
}


/* ---------------- IMAGE PICKER ---------------- */
const PEXELS_KEY = "7QPIcP3MfPcDte34Q1Vsu1lPrl0iwWFZ5GOl1NUgcLN40W6zhih4Yv5i";
let selectedImageSrc = null;
let selectedFile = null;

function openImagePicker(targetEl) {
    if (!$('#imagePickerModal').length) {
        $('<div id="imagePickerModal" class="modal image-picker-modal fade"></div>').appendTo('body');
    }

    $('#imagePickerModal')
        .data('imageElement', targetEl)
        .html(`
        <div class="modal-dialog">
          <div class="modal-content">

            <div class="modal-header">
              <button class="close" data-dismiss="modal">&times;</button>
              <h4>Select Image</h4>
            </div>

            <div class="modal-body">

              <div class="image-picker-tabs">
                <button class="tab-btn active" data-tab="assets">Assets</button>
                <button class="tab-btn" data-tab="pexels">Pexels</button>
                <button class="tab-btn" data-tab="upload">Upload</button>
                <button class="tab-btn" data-tab="url">URL</button>
              </div>

              <div class="tab-content-area"></div>

              <div class="preview-box hidden">
                <img id="previewImage">
              </div>

            </div>

            <div class="modal-footer">
              <button class="btn btn-default" data-dismiss="modal">Cancel</button>
              <button class="btn website-info-btn-primary" id="confirmImage">Submit</button>
            </div>

          </div>
        </div>
      `).modal('show');

    loadAssets();

    $('.tab-btn').click(function () {
        $('.tab-btn').removeClass('active');
        $(this).addClass('active');
        $('.preview-box').addClass('hidden');
        selectedImageSrc = null;
        selectedFile = null;

        const tab = $(this).data('tab');
        if (tab === 'assets') loadAssets();
        if (tab === 'pexels') loadPexels();
        if (tab === 'upload') loadUpload();
        if (tab === 'url') loadURL();
    });

    $('#confirmImage').off().on('click', function () {

    const el = $('#imagePickerModal').data('imageElement');
    const originalPath = $(el).attr('data-original-src'); // KEEP OLD NAME

    if (!originalPath) {
        alert("data-original-src missing on image");
        return;
    }

    const filename = originalPath.split('/').pop(); // KEEP SAME NAME

    if (selectedFile) {
        uploadImgData(new File([selectedFile], filename, { type: selectedFile.type }), el);

    } else if (selectedImageSrc) {

        urlToFile(selectedImageSrc, filename, function (file) {
            uploadImgData(file, el);
        });

    } else {
        alert("Select an image first");
        return;
    }

    $('#imagePickerModal').modal('hide');
});


}

/* ---------------- ASSETS ---------------- */
function loadAssets() {
    $('.tab-content-area').html(`
      <div class="image-grid">
        <img src="assets/images/library/sample-1.jpg">
        <img src="assets/images/library/sample-2.jpg">
        <img src="assets/images/library/sample-3.jpg">
      </div>
    `);

    $('.image-grid img').click(function () {
        $('.image-grid img').removeClass('selected');
        $(this).addClass('selected');

        selectedImageSrc = this.src;
        selectedFile = null;

        // const relativePath = $(this).attr('src');
        const relativePath = this.src.split('/client-assets/')[1];

        const targetEl = $('#imagePickerModal').data('imageElement');
        $(targetEl).attr('data-original-src', relativePath);

        $('#previewImage').attr('src', this.src);
        $('.preview-box').removeClass('hidden');
    });
}

// /* ---------------- PEXELS ---------------- */
// const BASE_URL = 'https://turnr.co.in';

// function getPexelsKey() {
//   return new Promise((resolve, reject) => {
//     $.ajax({
//       url: `${BASE_URL}/get_pexels/`,
//       type: 'POST',
//       dataType: 'json',
//       success: function (response) {
//         if (response.status === 200) {
//           resolve(response.key);
//         } else {
//           reject('Error: ' + response.message);
//         }
//       },
//       error: function () {
//         reject('Error fetching API key');
//       }
//     });
//   });
// }


// function loadPexels() {
//   getPexelsKey().then(PEXELS_KEY => {
//     $('.tab-content-area').html(`
//       <input class="form-control" id="pexelsSearch" placeholder="Search images">
//       <br>
//       <div class="image-grid" id="pexelsResults"></div>
//     `);

//     $('#pexelsSearch').keyup(function () {
//       const q = this.value;
//       if (q.length < 3) return;

//       $.ajax({
//         url: `https://api.pexels.com/v1/search?query=${q}&per_page=9`,
//         headers: { Authorization: PEXELS_KEY },
//         success: function (res) {
//           let html = '';
//           res.photos.forEach(p => html += `<img src="${p.src.medium}">`);
//           $('#pexelsResults').html(html);

//           $('#pexelsResults img').click(function () {
//             $('#pexelsResults img').removeClass('selected');
//             $(this).addClass('selected');

//             selectedImageSrc = this.src;
//             selectedFile = null;

//             $('#previewImage').attr('src', this.src);
//             $('.preview-box').removeClass('hidden');
//           });
//         }
//       });
//     });
//   }).catch((error) => {
//     console.error('Error fetching Pexels API key:', error);
//   });
// }

function loadPexels() {
    $('.tab-content-area').html(`
      <input class="form-control" id="pexelsSearch" placeholder="Search images">
      <br>
      <div class="image-grid" id="pexelsResults"></div>
    `);

    $('#pexelsSearch').keyup(function () {
        const q = this.value;
        if (q.length < 3) return;

        $.ajax({
            url: `https://api.pexels.com/v1/search?query=${q}&per_page=9`,
            headers: { Authorization: PEXELS_KEY },
            success: function (res) {
                let html = '';
                res.photos.forEach(p => html += `<img src="${p.src.medium}">`);
                $('#pexelsResults').html(html);

                $('#pexelsResults img').click(function () {
                    $('#pexelsResults img').removeClass('selected');
                    $(this).addClass('selected');

                    selectedImageSrc = this.src;
                    selectedFile = null;

                    $('#previewImage').attr('src', this.src);
                    $('.preview-box').removeClass('hidden');
                });
            }
        });
    });
}

/* ---------------- UPLOAD ---------------- */
function loadUpload() {
    $('.tab-content-area').html(`
      <div class="upload-box">Click to upload</div>
    `);

    $('.upload-box').click(() => $('#image-upload').click());

    $('#image-upload').off().on('change', function () {
        const file = this.files[0];
        if (!file) return;

        selectedFile = file;
        selectedImageSrc = null;

        $('.formFieldFileName').val(file.name);

        const reader = new FileReader();
        reader.onload = e => {
            $('#previewImage').attr('src', e.target.result);
            $('.preview-box').removeClass('hidden');
        };
        reader.readAsDataURL(file);
    });
}

/* ---------------- URL ---------------- */
function loadURL() {
    $('.tab-content-area').html(`
      <div style="display:flex; gap:10px">
        <input class="form-control" id="imgUrl" placeholder="Paste image URL">
        <button class="btn website-info-btn-primary" id="previewUrl">Preview</button>
      </div>
    `);

    $('#previewUrl').click(function () {
        const url = $('#imgUrl').val();
        if (!url) return;

        selectedImageSrc = url;
        selectedFile = null;

        $('#previewImage').attr('src', url);
        $('.preview-box').removeClass('hidden');
    });
}

/* ---------------- OPEN PICKER ---------------- */
$(document).on('click', '.updateImg', function (e) {
    if (!isEditingContent) return;
    e.preventDefault();
    openImagePicker(this);
});

/* ---------------- CLEANUP ---------------- */
$(document).on('hidden.bs.modal', '#imagePickerModal', function () {
    $(this).remove();
    selectedImageSrc = null;
    selectedFile = null;
});


// $(document).on('click', '.updateImg', function () {
//   let imgName = "default";
//   if ($(this).attr("src")) {
//     imgName = $(this).attr("src");
//   } else {
//     const bgImg = $(this).css('background-image');
//     if (bgImg && bgImg.includes('url(')) {
//       imgName = bgImg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
//     }
//   }

//   if (imgName.includes("?")) imgName = imgName.split("?")[0];

//   $(".formFieldFileName").val(imgName);
//   $("#image-upload").data('imageElement', this);
//   $("#image-upload").click();
// });
    // $("#image-upload").on('change', function () {
    //     uploadImgData();

    // });


    // async function uploadImgData() {
    //     const fileInput = $("#image-upload")[0];
    //     const file = fileInput.files[0];
    //     if (!file) return alert("No file selected!");

    //     const imgName = $(".formFieldFileName").val();
    //     alert('imgName: '+ imgName)
    //     const element = $("#image-upload").data("imageElement");

    //     // Convert to base64
    //     const base64 = await toBase64(file);
    //     const repoImagePath = extractRepoPath(imgName);
    //     alert('repoImagePath: '+ repoImagePath)

    //     if (!repoImagePath) {
    //         alert(" Unable to determine GitHub path for image!");
    //         return;
    //     }

    //     // Get latest SHA from GitHub
    //     const sha = await getLatestSha(repoImagePath);
    //     const commitMessage = `Update ${repoImagePath} via web editor`;

    //     // Upload to GitHub
    //     const response = await fetch(
    //         `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${repoImagePath}`,
    //         {
    //         method: "PUT",
    //         headers: {
    //             Authorization: `token ${token}`,
    //             Accept: "application/vnd.github+json",
    //             "Content-Type": "application/json",
    //         },
    //         body: JSON.stringify({
    //             message: commitMessage,
    //             content: base64.split(",")[1],
    //             sha: sha,
    //             branch: branch,
    //         }),
    //         }
    //     );

    //     const result = await response.json();

    //     if (result.content && result.commit) {
    //         console.log(" GitHub image updated:", repoImagePath);

    //         // Fetch the latest file (optional: add ?t=timestamp to bust cache)
    //         const newSrc = `${imgName}?${Date.now()}`;
    //         if (element.tagName === "IMG") {
    //         $(element).attr("src", newSrc);
    //         } else {
    //         $(element).css("background-image", `url(${newSrc})`);
    //         }

    //         alert(" Image updated on GitHub!");
    //     } else {
    //         alert(" Upload failed: " + (result.message || "Unknown error"));
    //     }

    //     // Reset file input
    //     fileInput.value = "";
    //     }





    // Create top bar buttons
    var enableEditMode = $('<button id="enable-editmode">Enable Edit Mode</button>').appendTo(topBar);
    var uploadChanges = $('<button onclick="uploadeditedproject()">upload changes</button>').appendTo(topBar);

    var saveChanges = $('<button id="save-changes" class="hidden" disabled>Save</button>').appendTo(topBar);
    // var generateContent = $('<button id="generate-content" class="hidden">Enable Generate Content</button>').appendTo(topBar);
    var aiBotImageHtml = '<img class="aiBotImage" src="assets/images/AiBot.png" alt="AiBot" title="Generate content with AiBot" />';

    // Toggle editable classes
    function toggleEditableClasses(enable) {
        isEditingContent = enable;
        if (enable) {
            // alert('enabled --------');
            wrapper.find('*').not('.link-to-dropdown-container *').addClass('editable');
            wrapper.find('img').addClass('editable-image');
            wrapper.find('img').addClass('updateImg');

            // code to call on click event of the tags which has background image or background url
            wrapper.find('*').each(function() {
                const styleAttr = $(this).attr('style');
                if (styleAttr && /background[^;]*url\(/i.test(styleAttr)) {
                    $(this).addClass('updateImg editable-image');
                }
            });

            wrapper.find('a.editable').on('click.editable', handleAnchorEdit);
            $(document).on('click', '.editable', function (e) {
                e.stopPropagation();
                $('.editable').removeClass('activeEditor');
                $(this).addClass('activeEditor');
            });
            $('.section-wrapper').each(function() {
                addActionButtons($(this));
            });

            $('a.edit-site').removeClass('edit-site');

            // generateContent.removeClass('hidden');

                var elementsToUpdate = [];

                $('#wrapper').find('p, h1, h2, h3, h4, h5, h6, span').each(function() {
                    var textContent = $(this).text().trim();
                    if (textContent.length > 200) {
                        var charCount = textContent.length;
                        $(this).addClass('aiContentGeneration');
                        $(this).attr('cntVal', 'char_cnt_' + charCount);
                        elementsToUpdate.push($(this));
                    }
                });

                elementsToUpdate.forEach(function(element) {
                    element.append(aiBotImageHtml);
                });
                    $('.aiBotImage').each(function() {
                    $(this).addClass('jumping');
                });

        } else {
            wrapper.find('*').removeClass('editable');
            wrapper.find('img').removeClass('editable-image').off('click');
            wrapper.find('*').removeAttr('contenteditable');
            wrapper.find('a.editable').off('click.editable');
            wrapper.find('.updateBgImg').removeClass('editable-image updateBgImg');
            $('.link-to-btn').remove();
            $('.link-to-dropdown-container').remove();
            $('.add-section-above, .add-section-below ,.remove-section-btn').remove();
            // generateContent.addClass('hidden');
            $('#wrapper').find('p, h1, h2, h3, h4, h5, h6, span').each(function() {
                $(this).removeClass('aiContentGeneration');
                $(this).removeAttr('cntVal');
                $(this).find('.aiBotImage').remove();
            });
        }
    }

    // generateContent.on('click', function() {
    //     if ($(this).text() === 'Enable Generate Content') {
    //         $(this).text('Disable Generate Content');

    //         // Prepare the elements and append AI Bot images in a batch
    //         var elementsToUpdate = [];

    //         $('#wrapper').find('p, h1, h2, h3, h4, h5, h6, span').each(function() {
    //             var textContent = $(this).text().trim();

    //             if (textContent.length > 200) {
    //                 var charCount = textContent.length;

    //                 $(this).addClass('aiContentGeneration');
    //                 $(this).attr('cntVal', 'char_cnt_' + charCount);
    //                 elementsToUpdate.push($(this)); // Store the elements to update
    //             }
    //         });

    //         // Once all elements are collected, append AI Bot images in one go
    //         elementsToUpdate.forEach(function(element) {
    //             element.append(aiBotImageHtml);
    //         });

    //         // Add animation for the AI Bot image
    //         $('.aiBotImage').each(function() {
    //             $(this).addClass('jumping');
    //         });

    //     } else {
    //         $(this).text('Enable Generate Content');

    //         $('#wrapper').find('p, h1, h2, h3, h4, h5, h6, span').each(function() {
    //             $(this).removeClass('aiContentGeneration');
    //             $(this).removeAttr('cntVal');
    //             $(this).find('.aiBotImage').remove();
    //         });
    //     }
    // });



    // for the AI Bot image tooltip
    var isAudioPlaying = false;
    var tooltipTimeout = null;
    var isTooltipVisible = false;

    $(document).on('mouseenter', '.aiBotImage', function() {
        if (!isAudioPlaying) {
            isAudioPlaying = true;
            var audio = new Audio('assets/aiBotAudio.mp3');
            audio.play();

            audio.onended = function() {
                isAudioPlaying = false;
            };
        }

        if (isTooltipVisible) return;

        var $aiBotImage = $(this);
        var imagePosition = $aiBotImage.offset();

        var $tooltip = $('<div class="ai-tooltip">Generate Content with AiBot</div>');

        $('body').append($tooltip);
        $tooltip.css({
            position: 'absolute',
            top: imagePosition.top - $tooltip.outerHeight() - 40,
            left: imagePosition.left + ($aiBotImage.outerWidth() / 2) - ($tooltip.outerWidth() / 2),
            opacity: 0,
            visibility: 'visible',
            transition: 'opacity 0.3s ease-in-out',
            backgroundColor: '#26C8D0',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.2)',
            animation: 'jump-tooltip 1s ease-in-out infinite'
        });

        $tooltip.css('opacity', 1);
        isTooltipVisible = true;

        tooltipTimeout = setTimeout(function() {
            if (!isTooltipVisible) {
                $tooltip.remove();
            }
        }, 3000);

        $aiBotImage.on('mouseleave', function() {
            if (tooltipTimeout) {
                clearTimeout(tooltipTimeout);
            }
            isTooltipVisible = false;
            $tooltip.remove();
        });
    });





let modelReady = false;
/* ---------- AI STATUS HANDLING ---------- */
function showModalSpinner(message = "Loading AI model…") {
    if ($("#aiModalSpinner").length) {
        $("#aiModalSpinner .ai-loading-text").text(message);
        return;
    }

    const spinnerHtml = `
        <div id="aiModalSpinner" class="ai-modal-spinner">
            <div class="ai-spinner"></div>
            <div class="ai-loading-text">${message}</div>
        </div>
    `;

    $(".ai-modal-content").append(spinnerHtml);
}

function hideModalSpinner() {
    $("#aiModalSpinner").remove();
}


(function injectModalSpinnerCSS() {
    if ($("#aiModalSpinnerStyles").length) return;

    const css = `
        .ai-modal-content {
            position: relative;
        }

        /* Overlay blocks everything */
        .ai-modal-spinner {
            position: absolute;
            inset: 0;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column; 
            z-index: 20;
            backdrop-filter: blur(1.5px);
            pointer-events: auto; /* blocks modal */
        }

        /* Spinner itself should NOT intercept clicks */
        .ai-modal-spinner * {
            pointer-events: none;
        }

        /* Close button MUST be above overlay */
        .ai-close {
            align-self: flex-start;
            margin-right: auto; /* push left */
            margin-left: 0;
            z-index: 30;
        }


        /* Spinner styling */
        .ai-spinner {
            width: 42px;
            height: 42px;
            border: 4px solid rgba(0,0,0,0.25);
            border-top-color: #000;
            border-radius: 50%;
            animation: aiSpin 0.9s linear infinite;
        }

        @keyframes aiSpin {
            to { transform: rotate(360deg); }
        }

    `;

    $("<style>", {
        id: "aiModalSpinnerStyles",
        text: css
    }).appendTo("head");
})();

// Attach a single listener for AIBridge messages
AIBridge.onMessage(data => {

    if (data.type === "MODEL_LOADING") {
        showModalSpinner(data.payload.cached
            ? `Using cached model: ${data.payload.model}`
            : `Loading model: ${data.payload.model}… Please wait`);
        $("#generateContentBtn").prop("disabled", true);
    }

    if (data.type === "MODEL_READY") {
        hideModalSpinner();
        $("#generateContentBtn").prop("disabled", false).text("Generate");
    }

    if (data.type === "GENERATE_TEXT") {
        showModalSpinner("Generating content…");
    }

    if (data.type === "GENERATE_TEXT_RESULT") {
        hideModalSpinner();
        $("#contentTextArea").val(data.payload.text);
        $("#generateContentBtn").prop("disabled", false).text("Generate");
    }
});

/* ----------------- GENERATE BUTTON ----------------- */
$(document).on('click', '#generateContentBtn', function () {
    const inputText = $("#topicInput").val().trim();
    if (!inputText) return;

    $("#contentTextArea").val("Generating...");
    $(this).prop("disabled", true).text("Generating...");

    AIBridge.send({
        type: "GENERATE_TEXT",
        payload: { text: inputText }
    });
});

/* ----------------- MODEL SWITCH ----------------- */
$(document).on("change", "#modelSwitcher", function () {
    const selectedModel = this.value;

    showModalSpinner(`Switching to ${selectedModel}… Please wait`);
    AIBridge.setModel(selectedModel);
});

/* ----------------- MODAL CREATION ----------------- */
$(document).on('click', '.aiBotImage', function () {

    const parentElement = $(this).closest('p, h1, h2, h3, h4, h5, h6, span');
    let currentContent = parentElement.contents().filter(function () {
        return this.nodeType === 3;
    }).first().text().trim();
    currentContent = currentContent.replace(/\s+/g, ' ').trim();

    const modalHtml = `
        <div id="aiContentModal" class="ai-modal">
            <div class="ai-modal-content">
                <span class="ai-close">&times;</span>
                <div class="ai-header">
                    <h1 class="ai-modal-title">AI Content Generator</h1>
                    <p class="ai-subtitle">Describe your topic and let AI create engaging content</p>
                </div>
                <div class="ai-model-switcher">
                    <label class="ai-label">AI Model</label>
                    <select id="modelSwitcher" class="ai-input-field">
                        <option value="Xenova/flan-t5-base">Flan-T5 Base</option>
                        <option value="Xenova/LaMini-Flan-T5-783M">LaMini Flan-T5 783M</option>
                    </select>
                </div>
                <div class="ai-input-area">
                    <label class="ai-label">Topic or Keyword</label>
                    <div class="ai-input-group">
                        <textarea id="topicInput" class="ai-input-field" placeholder="Type your topic...">${currentContent}</textarea>
                        <button id="generateContentBtn" class="ai-btn ai-btn-primary">Generate</button>
                    </div>
                </div>
                <label class="ai-label">Generated Content</label>
                <div class="ai-textarea-wrapper">
                    <textarea id="contentTextArea" class="ai-textarea" rows="6"></textarea>
                </div>
                <div class="ai-modal-actions">
                    <button id="submitContent" class="ai-btn ai-btn-secondary">Submit</button>
                </div>
            </div>
        </div>
    `;

    $('body').append(modalHtml);

    const modal = document.getElementById("aiContentModal");
    modal.style.display = "block";
    modal.currentElement = parentElement;

    $(".ai-close").on('click', function () {
        modal.style.display = "none";
        $("#aiContentModal").remove();
    });

    showModalSpinner("Loading AI model…"); // initial loader
    AIBridge.loadModel();

    $("#submitContent").on('click', function () {
        const updatedContent = $("#contentTextArea").val();
        parentElement.contents().filter(function () {
            return this.nodeType === 3;
        }).first().replaceWith(updatedContent);

        modal.style.display = "none";
        $("#aiContentModal").remove();
    });
});



    // Handle editing
    function handleAnchorEdit(e) {
        e.stopPropagation();
        var anchor = $(this);
        if (!isEditingContent) return;
        e.preventDefault();
        clearPreviousDropdowns();

        if (!anchor.find('.link-to-btn').length) {
            var linkToButton = $(`
            <button class="link-to-btn">
                <img src="assets/images/custom/pencil-icon.png" alt="Edit">
            </button>
            `);
            anchor.append(linkToButton);

            linkToButton.on('click', function (e) {
                e.stopPropagation();
                createDropdown(anchor);
            });
        }
    }

    // Clear previous dropdowns
    function clearPreviousDropdowns() {
        $('#wrapper a.editable').find('.link-to-btn').remove();
        $('#wrapper a.editable').next('.link-to-dropdown-container').remove();
    }

    // Create dropdown for editing anchor
function createDropdown(anchor) {
    var dropdownOptions = generateDropdownOptions();

    var dropdownHTML = `
        <div class="link-to-dropdown-container">
            <div>
                <h5>Edit Text:</h5>
                <input
                    type="text"
                    class="anchor-text-input"
                    placeholder="Edit your anchor text here..."
                />
            </div>

            <div>
                <h5>Linked to Page:</h5>
                <select class="link-to-dropdown">${dropdownOptions}</select>
            </div>

            <div class="edit-button-container">
                <button class="close-anchor-edit">Close</button>
                <button class="submit-link">Submit</button>
            </div>
        </div>
    `;

    anchor.after(dropdownHTML);

    initializeInputEditor(anchor);

    var currentHrefCustom = anchor.attr('hrefcustom');
    if (currentHrefCustom) {
        anchor
            .next('.link-to-dropdown-container')
            .find('.link-to-dropdown')
            .val(currentHrefCustom);
    }
}

    // Generate dropdown options from dynamic-header
function generateDropdownOptions() {
    var options = '';
    $('#dynamic-header li a').each(function () {
        var hrefValue = $(this).attr('hrefcustom');
        var linkText = $(this).text();
        options += `<option value="${hrefValue}">${linkText}</option>`;
    });
    return options;
}


// Initialize input-based editor
function initializeInputEditor(anchor) {
    var container = anchor.next('.link-to-dropdown-container');
    var textInput = container.find('.anchor-text-input');

    // Set existing anchor text in input
    textInput.val(anchor.text().trim());

    // Submit button
    container.find('.submit-link').on('click', function () {
        var newHref = container.find('.link-to-dropdown').val();
        var newText = textInput.val().trim();

        if (!newText) {
            alert('Anchor text cannot be empty!');
            return;
        }

        anchor
            .attr('hrefcustom', newHref)
            .text(newText);

        container.remove();
        alert('Anchor updated successfully!');
    });

    // Close button
    container.find('.close-anchor-edit').on('click', function (e) {
        e.stopPropagation();
        container.remove();
        anchor.find('.link-to-btn').remove();
    });
}

    // Set selected value for dropdown
    function setDropdownSelectedValue(anchor) {
        var currentHref = anchor.attr('hrefcustom');
        $('.link-to-dropdown').val(currentHref);
    }

    // Edit mode functionality
    enableEditMode.on('click', function () {
        isEditingContent = true;
        isEditingImages = true;
        toggleEditableClasses(true);
        wrapper.addClass('edit-mode').find('.editable').attr('contenteditable', true);
        //handleImageClick();
        //configureImageUpload();
        $('a').removeClass('edit-site');
        $('a').each(function() {
            var currentHref = $(this).attr('href');
            $(this).attr('hrefcustom', currentHref);
            $(this).removeAttr('href'); // Remove the original href attribute
        });
        enableEditMode.addClass('hidden');
        saveChanges.removeClass('hidden').prop('disabled', false);
        $('a').on('click', function(event) {
            if (isEditingContent) {
                event.preventDefault();
            }
        });
    });



    function displayLoadingMessage() {
        var loadingMessage = document.createElement('div');
        loadingMessage.id = 'loading-message';
        loadingMessage.textContent = "Uploading in progress... Please wait.";
        loadingMessage.style.position = 'fixed';
        loadingMessage.style.top = '50%';
        loadingMessage.style.left = '50%';
        loadingMessage.style.transform = 'translate(-50%, -50%)';
        loadingMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        loadingMessage.style.color = 'white';
        loadingMessage.style.padding = '20px';
        loadingMessage.style.zIndex = '1000';
        document.body.appendChild(loadingMessage);
    }

    $(document).ready(function() {
        let changesInHeader = false;
        let changesInFooter = false;
        let changesInMainContent = false;

    // Store the original content to compare changes
    let originalHeaderContent = $('#header').html();
    let originalFooterContent = $('#footer').html();

    // Monitor changes in the footer using keypress
    $('#footer').on('input keypress', function() {
        changesInFooter = true;
    });

    // Function to observe changes in header and main content
    function observeChanges() {
        const headerObserver = new MutationObserver(function(mutationsList) {
            mutationsList.forEach(function(mutation) {
                if (mutation.type === 'childList' || mutation.type === 'subtree') {
                    changesInHeader = true;
                }
            });
        });

        const mainContentObserver = new MutationObserver(function(mutationsList) {
            mutationsList.forEach(function(mutation) {
                if (mutation.type === 'childList' || mutation.type === 'subtree') {
                    changesInMainContent = true;
                }
            });
        });
        headerObserver.observe(document.getElementById('header'), { childList: true, subtree: true });
        mainContentObserver.observe(document.getElementById('mainPageContent'), { childList: true, subtree: true });
    }
    observeChanges();

    // reset the flags and update original content after save
    function resetChangeFlags() {
        originalHeaderContent = $('#header').html();
        originalFooterContent = $('#footer').html();
        changesInHeader = false;
        changesInFooter = false;
        changesInMainContent = false;
    }

    saveChanges.on('click', function () {
        isEditingContent = false;
        isEditingImages = false;
        toggleEditableClasses(false);


        // Restore original href attributes
        $('a').each(function() {
            var currentHrefCustom = $(this).attr('hrefcustom');
            if (currentHrefCustom) {
                $(this).attr('href', currentHrefCustom);
                $(this).removeAttr('hrefcustom');
            }
        });



        wrapper.find('.editable').removeAttr('contenteditable');
        $('.activeEditor').removeClass('activeEditor');
        wrapper.removeClass('edit-mode');

        // Hide edit buttons and show save changes button
        enableEditMode.removeClass('hidden');
        saveChanges.addClass('hidden').prop('disabled', true);
        topBar.addClass('hidden');
        $('#image-upload').remove();
        $('a.edit-site').removeClass('edit-site');
        $('a').addClass('edit-site').css('cursor', 'pointer');
        var SliderContentOldHTML = localStorage.getItem('dynamicSliderContent');
        var dynamicSliderWrapper = $('.dynamic-slider-wrapper');
        if (dynamicSliderWrapper.length && SliderContentOldHTML) {
            dynamicSliderWrapper.html(SliderContentOldHTML);
        }

        // Remove unnecessary scripts and styles
        $('script[src="assets/js/custom/editmode.js"]').remove();
        $('link[href="https://cdn.quilljs.com/1.3.6/quill.snow.css"]').remove();
        $('link[href="assets/css/custom/custom.css"]').remove();
        $('script[src="https://cdn.quilljs.com/1.3.6/quill.min.js"]').remove();
        $('script[src="assets/js/custom/main.js"]').remove();
        $('script[src="assets/js/custom/editModeScript.js"]').remove();
        

        // Clone the HTML and clean up
        var editedHTML = $('html').clone();
        editedHTML.find('a.edit-site').removeClass('edit-site');
        editedHTML.find('#top-bar').remove();
        // SCRIPTS WHICH HAVE BEEN ADDED FROM THE BACKEND HAS TO BE REMOVE BEFORE SAVE 
        // editedHTML.find('script[src*="editmode"]').remove();
        // editedHTML.find('script[src*="editModeScript"]').remove();
        // editedHTML.find('script[src*="main.js"]').remove();
        // editedHTML.find('script[src*="jquery"]').remove();
        // editedHTML.find('script[src*="bootstrap"]').remove();
        // editedHTML.find('form#imgForm').remove();
        // REMOVE CODE OF SCRIPT END
        
        // remove tempory added hidden fields for img, pagename and file name
        // $editedHTML.find('form#imgForm').remove();
        // $editedHTML.find('input.selectedPageName[type="hidden"]').remove();
        // $editedHTML.find('input.formFieldFileName').remove();
        // remove tempory added base urls for loading project locally
        // editedHTML.find('head base').remove();// removing the base <base href="/">
        // Remove unique IDs and buttons from each section-wrapper
        $('.section-wrapper').each(function() {
            $(this).removeAttr('id');
            $(this).find('.add-section-above, .add-section-below').remove();
        });

         // ---------------- IMAGE PATH FIX ----------------
        // Convert all img src to relative paths for backend
        // editedHTML.find('img').each(function() {
        //     const originalPath = $(this).attr('data-original-src'); // relative path
        //     if (originalPath) {
        //         $(this).attr('src', originalPath); // save relative path to backend
        //     }
        // });


        const filesDetailsMap = {};

        // Check if the header has changed, and if it has, add it to the filesDetailsMap
        if (changesInHeader && originalHeaderContent !== $('#header').html()) {
            var editedHeader = $('#header').html();
            filesDetailsMap["header.html"] = editedHeader;
            changedFiles.add("header.html");
            syncChangedFilesToSession();

            changesInHeader = false; // Reset flag
        }

        // **Fix: Check if footer content has changed using keypress or input**
        if (changesInFooter && originalFooterContent !== $('#footer').html()) {
            var editedFooter = $('#footer').html();
            filesDetailsMap["footer.html"] = editedFooter;
            changedFiles.add("footer.html");
            syncChangedFilesToSession();

            changesInFooter = false; // Reset flag
        }

        // Check if main content has changed
        if (changesInMainContent) {
            editedHTML.find('#header').html('');
            editedHTML.find('#footer').html('');
            editedHTML.find('input[type="text"].hidden.selectedPageName').remove();

            var rawTitle = $('title').text().trim();

            var pageName = rawTitle
                .replace(/\s+/g, '_')
                .replace(/[^a-zA-Z0-9_]/g, '');

            var fileName = rawTitle.toLowerCase() === "home"
                ? "index.html"
                : pageName + ".html";

            filesDetailsMap[fileName] = editedHTML.html();
            changedFiles.add(fileName);
            syncChangedFilesToSession();

            console.log("changedFiles",changedFiles)
            changesInMainContent = false;
        }

        // Call the function to save changes
        editClientSite(filesDetailsMap);
        topBar.removeClass('hidden');

        // Reset flags after saving
        resetChangeFlags();
    });

    resetChangeFlags();
});



function editClientSite(filesDetailsMap) {
        filesDetailsMap["clientName"] = getCookie("clientName");
        filesDetailsMap["clientProjectName"] = getCookie("clientProjectName");
        filesDetailsMap["pageName"] = $(".selectedPageName").val()||"index.html";
        // alert(getCookie("clientName"));
        //  alert(getCookie("clientProjectName"));
        // alert( $(".formFieldFileName").val());
        // filesDetailsMap["currentSelectedPage"] = getCookie("projectName");
        var filename = filesDetailsMap["pageName"] 
        setCookie('preview','false',7)


        $.ajax({
            type: 'POST',
            url: "/ucs/",
            dataType: "text",
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(filesDetailsMap),
            success: function (data) {
                alert("Uploaded the data");
                $('#loading-message').remove();
               // location.reload();
                // $('#openIndex').click();
                   window.location.href =
                    `/es/?srcReq=${filename}`;

            },
            error: function (xhr, errmsg, err) {

                alert("Error----" + xhr.responseText);
                $('#loading-message').remove();
            }
        });
    }



// Add section part
$('#AddNewSection').click(function() {
    if (isEditingContent) {
        createAndShowModal();
    } else {
        // Create the modal HTML structure dynamically
        var modalHTML = `
        <div id="alertDialog" class="custom-modal" style="display:none;">
            <div class="custom-modal-content">
                <div class="custom-modal-header">
                    <span class="custom-modal-icon">!</span>
                    <h2>Please enable editing mode</h2>
                </div>
                <div class="custom-modal-body">
                    <p>You need to enable editing mode before adding new sections. </p>
                </div>
                <div class="custom-modal-footer">
                    <button id="cancelBtn" class="btn cancel">Close</button>
                </div>
            </div>
        </div>
        `;

        $('body').append(modalHTML);

        $('#alertDialog').fadeIn();

        $('#cancelBtn').click(function() {
            $('#alertDialog').fadeOut(function() {
                $('#alertDialog').remove();
            });
        });

    }
});



function createAndShowModal() {
    if ($('#dynamicModal').length) {
        $('#imagePickerModal').modal('hide');
        $('#dynamicModal').modal('show');

        return;
    }

    const modalHtml = `
        <div class="modal fade" id="dynamicModal" tabindex="-1" aria-labelledby="dynamicModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="select-section-top-btns">
                            <button type="button" class="btn custombtn" id="saveSection">Save Section</button>
                            <button type="button" class="btn customClosebtn" id="closeModal" data-bs-dismiss="modal">Close</button>
                        </div>
                        <h4 class="modal-title w-100 text-center">Add a New Section</h4>
                    </div>
                    <div class="modal-body" id="modalBodyContent">
                        <div class="container-viewport">
                            <div id="multi-filter-container" class="multi-filter-container">

                                <!-- Category Filter -->
                                <div id="category-filter" class="dropdown category-filter filter-style editmode-filter">
                                    <p>Select Category</p>
                                    <button class="btn btn-default dropdown-toggle" type="button" data-toggle="dropdown" id="categoryDropdownButton">
                                        <span class="selected-category">
                                            <i class="ri-grid-fill" style="margin-right:10px;"></i>All
                                        </span>
                                        <span class="caret"></span>
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-custom" id="categoryDropdownMenu"></ul>
                                </div>

                                <!-- Section Filter -->
                                <div id="section-filter" class="dropdown section-filter filter-style editmode-filter">
                                    <p>Select Section</p>
                                    <button class="btn btn-default dropdown-toggle" type="button" data-toggle="dropdown">
                                        All <span class="caret"></span>
                                    </button>
                                    <ul class="dropdown-menu">
                                        <li class="active"><a tabindex="-1" href="#" data-value="all">All</a></li>
                                        <li><a tabindex="-1" href="#" data-value="home">Home/Dashboard</a></li>
                                        <li><a tabindex="-1" href="#" data-value="about">About</a></li>
                                        <li><a tabindex="-1" href="#" data-value="slider">Slider</a></li>
                                        <li><a tabindex="-1" href="#" data-value="contact">Contact</a></li>
                                        <li><a tabindex="-1" href="#" data-value="courses">Courses</a></li>
                                        <li><a tabindex="-1" href="#" data-value="events">Events</a></li>
                                        <li><a tabindex="-1" href="#" data-value="testimonial">Testimonial</a></li>
                                        <li><a tabindex="-1" href="#" data-value="news">News</a></li>
                                        <li><a tabindex="-1" href="#" data-value="pricing">Pricing</a></li>
                                        <li><a tabindex="-1" href="#" data-value="blog">Blogs</a></li>
                                        <li><a tabindex="-1" href="#" data-value="career">Career</a></li>
                                        <li><a tabindex="-1" href="#" data-value="services">Services</a></li>
                                        <li><a tabindex="-1" href="#" data-value="faq">FAQ</a></li>
                                        <li><a tabindex="-1" href="#" data-value="privacy policy">Privacy Policy</a></li>
                                        <li><a tabindex="-1" href="#" data-value="terms & condition">Terms & Condition</a></li>
                                        <li><a tabindex="-1" href="#" data-value="help">Help</a></li>
                                        <li><a tabindex="-1" href="#" data-value="newsletter">NewsLetter</a></li>
                                        <li><a tabindex="-1" href="#" data-value="Sign Up Section">Sign Up Section</a></li>
                                        <li><a tabindex="-1" href="#" data-value="ourteam">Our Team</a></li>
                                    </ul>
                                </div>
                            </div>

                            <div id="wrapper" class="middle-section-wrapper">
                                <div id="no-components-message">There are no components available that match your selected category and section. Please select another combination.</div>
                                <input id="currentSelectedValueOfPageComponents" type="hidden" value="" />
                                    <div class="middle_sections_container" id="middle_sections_container">
                                        <div id="home-1" class="component lazy-load-placeholder" category="Auto Repair Shops"></div>
                                        <div id="home-2" class="component lazy-load-placeholder" category="Auto Repair Shops"></div>
                                        <div id="home-3" class="component lazy-load-placeholder" category="Tutor"></div>
                                        <div id="home-4" class="component lazy-load-placeholder" category="Coaching center"></div>
                                        <div id="home-5" class="component lazy-load-placeholder" category="Coaching center"></div>
                                        <div id="home-6" class="component lazy-load-placeholder" category="Coaching center"></div>
                                        <div id="home-7" class="component lazy-load-placeholder" category="School"></div>
                                        <!-- <div id="home-8" class="component lazy-load-placeholder" category="Hotel"></div> -->
                                        <div id="home-9" class="component lazy-load-placeholder" category="Hotel/Lounges"></div>
                                        <div id="home-10" class="component lazy-load-placeholder" category="Hotel/Lounges"></div>
                                        <div id="home-11" class="component lazy-load-placeholder" category="Hotel/Lounges"></div>
                                        <!-- <div id="home-12" class="component lazy-load-placeholder" category="Corporate/Company Site"></div> -->
                                        <div id="home-13" class="component lazy-load-placeholder" category="Coaching center"></div>
                                        <div id="home-14" class="component lazy-load-placeholder" category="Portfolio"></div>
                                        <div id="home-15" class="component lazy-load-placeholder" category="Small Business"></div>
                                        <div id="home-16" class="component lazy-load-placeholder" category="Portfolio"></div>
                                        <div id="home-17" class="component lazy-load-placeholder" category="Portfolio"></div>
                                        <div id="home-18" class="component lazy-load-placeholder" category="Portfolio"></div>
                                        <div id="home-19" class="component lazy-load-placeholder" category="Travel Agencies"></div>
                                        <div id="home-20" class="component lazy-load-placeholder" category="Restaurant"></div>
                                        <div id="home-21" class="component lazy-load-placeholder" category="Restaurant"></div>
                                        <div id="home-22" class="component lazy-load-placeholder" category="Pre-school & Daycare"></div>
                                        <div id="home-23" class="component lazy-load-placeholder" category="Pre-school & Daycare"></div>
                                        <div id="home-24" class="component lazy-load-placeholder" category="Pre-school & Daycare"></div>
                                        <div id="home-25" class="component lazy-load-placeholder" category="Music Coach"></div>
                                        <div id="home-26" class="component lazy-load-placeholder" category="Music Coach"></div>
                                        <div id="home-27" class="component lazy-load-placeholder" category="Electronic Item Services"></div>
                                        <div id="home-28" class="component lazy-load-placeholder" category="Electronic Item Services"></div>
                                        <div id="home-29" class="component lazy-load-placeholder" category="Influencer"></div>
                                        <div id="home-30" class="component lazy-load-placeholder" category="Influencer"></div>
                                        <div id="home-31" class="component lazy-load-placeholder" category="Influencer"></div>
                                        <!-- <div id="home-32" class="component lazy-load-placeholder" category="Small Business"></div> -->
                                        <div id="home-33" class="component lazy-load-placeholder" category="Small Business"></div>
                                        <div id="home-34" class="component lazy-load-placeholder" category="Real Estate Agencies"></div>
                                        <div id="home-35" class="component lazy-load-placeholder" category="Real Estate Agencies"></div>
                                        <div id="home-36" class="component lazy-load-placeholder" category="Yoga & Meditation"></div>
                                        <div id="home-37" class="component lazy-load-placeholder" category="Nutritionist"></div>
                                        <div id="home-38" class="component lazy-load-placeholder" category="Yoga & Meditation"></div>
                                        <div id="home-39" class="component lazy-load-placeholder" category="Cafes & Bakeries"></div>
                                        <div id="home-40" class="component lazy-load-placeholder" category="Salon & Spa"></div>
                                        <div id="home-41" class="component lazy-load-placeholder" category="Real Estate Agencies"></div>
                                        <div id="home-42" class="component lazy-load-placeholder" category="Real Estate Agencies"></div>
                                        <div id="home-43" class="component lazy-load-placeholder" category="Gym"></div>
                                        <div id="home-44" class="component lazy-load-placeholder" category="Clinic"></div>
                                        <div id="home-45" class="component lazy-load-placeholder" category="Photography"></div>
                                        <div id="home-46" class="component lazy-load-placeholder" category="Photography"></div>
                                        <div id="home-47" class="component lazy-load-placeholder" category="Nutritionist"></div>
                                        <div id="home-48" class="component lazy-load-placeholder" category="Chartered Accountant"></div>
                                        <div id="home-49" class="component lazy-load-placeholder" category="Advocate "></div>
                                        <div id="home-50" class="component lazy-load-placeholder" category="Advocate "></div>
                                        <div id="home-51" class="component lazy-load-placeholder" category="Clinic"></div>
                                        <div id="home-52" class="component lazy-load-placeholder" category="Clinic"></div>
                                        <!-- <div id="home-53" class="component lazy-load-placeholder" category="Photography"></div> -->
                                        <div id="home-54" class="component lazy-load-placeholder" category="Travel Agencies"></div>
                                        <!-- <div id="home-55" class="component lazy-load-placeholder" category="Travel Agencies"></div> -->
                                        <div id="home-56" class="component lazy-load-placeholder" category="Photography"></div>
                                        <div id="home-57" class="component lazy-load-placeholder" category="Photography"></div>
                                        <!-- <div id="home-58" class="component lazy-load-placeholder" category="Photography"></div> -->
                                        <div id="home-59" class="component lazy-load-placeholder" category="Yoga & Meditation"></div>
                                        <div id="home-60" class="component lazy-load-placeholder" category="Yoga & Meditation"></div>
                                        <div id="home-61" class="component lazy-load-placeholder" category="Influencer"></div>
                                        <div id="home-62" class="component lazy-load-placeholder" category="Influencer"></div>
                                        <div id="home-63" class="component lazy-load-placeholder" category="Influencer"></div>
                                        <div id="home-64" class="component lazy-load-placeholder" category="Portfolio"></div>
                                        <div id="home-65" class="component lazy-load-placeholder" category="Portfolio"></div>
                                        <div id="home-66" class="component lazy-load-placeholder" category="Portfolio"></div>
                                        <div id="home-67" class="component lazy-load-placeholder" category="Portfolio"></div>
                                        <div id="home-68" class="component lazy-load-placeholder" category="Portfolio"></div>
                                        <!-- <div id="home-69" class="component lazy-load-placeholder" category="Software Companies"></div> -->
                                        <!-- <div id="home-70" class="component lazy-load-placeholder" category="Tech Startups"></div> -->
                                        <div id="home-71" class="component lazy-load-placeholder" category="Portfolio"></div>
                                        <div id="home-72" class="component lazy-load-placeholder" category="Electrician"></div>
                                        <div id="home-73" class="component lazy-load-placeholder" category="Financial Advisors"></div>
                                        <div id="home-74" class="component lazy-load-placeholder" category="Real Estate Agencies"></div>
                                        <div id="home-75" class="component lazy-load-placeholder" category="Music Coach"></div>
                                        <div id="home-76" class="component lazy-load-placeholder" category="Restaurant"></div>
                                        <div id="home-77" class="component lazy-load-placeholder" category="Makeup Artists"></div>
                                        <div id="home-78" class="component lazy-load-placeholder" category="Travel Agencies"></div>
                                        <div id="home-79" class="component lazy-load-placeholder" category="Salon & Spa"></div>
                                        <div id="home-80" class="component lazy-load-placeholder" category="Interior Designer"></div>
                                        <div id="home-81" class="component lazy-load-placeholder" category="Interior Designer"></div>
                                        <div id="home-82" class="component lazy-load-placeholder" category="Interior Designer"></div>
                                        <div id="home-84" class="component lazy-load-placeholder" category="Chartered Accountant"></div>
                                        <div id="home-85" class="component lazy-load-placeholder" category="Architect"></div>
                                        <div id="home-86" class="component lazy-load-placeholder" category="Advocate"></div>
                                        <div id="home-87" class="component lazy-load-placeholder" category="Advocate"></div>
                                        <div id="home-88" class="component lazy-load-placeholder" category="Advocate"></div>
                                        <div id="home-89" class="component lazy-load-placeholder" category="catering"></div>
                                        <div id="home-90" class="component lazy-load-placeholder" category="catering"></div>

                                        <div id="about-1" class="component lazy-load-placeholder" category="Collage"></div>
                                        <!-- <div id="about-2" class="component lazy-load-placeholder" category="Corporate/Company Site"></div> -->
                                        <div id="about-3" class="component lazy-load-placeholder" category="Coaching center"></div>
                                        <div id="about-4" class="component lazy-load-placeholder" category="Collage"></div>
                                        <div id="about-5" class="component lazy-load-placeholder" category="Coaching center"></div>
                                        <div id="about-6" class="component lazy-load-placeholder" category="Tutor"></div>
                                        <div id="about-7" class="component lazy-load-placeholder" category="Clinic"></div>
                                        <div id="about-8" class="component lazy-load-placeholder" category="Clinic"></div>
                                        <div id="about-9" class="component lazy-load-placeholder" category="Hotel/Lounges"></div>
                                        <div id="about-10" class="component lazy-load-placeholder" category="Weddings"></div>
                                        <div id="about-11" class="component lazy-load-placeholder" category="Weddings"></div>
                                        <div id="about-12" class="component lazy-load-placeholder" category="Financial Advisors"></div>
                                        <div id="about-13" class="component lazy-load-placeholder" category="Pre-school & Daycare"></div>
                                        <div id="about-14" class="component lazy-load-placeholder" category="Pre-school & Daycare"></div>
                                        <div id="about-15" class="component lazy-load-placeholder" category="Pre-school & Daycare"></div>
                                        <!-- <div id="about-16" class="component lazy-load-placeholder" category="Corporate/Company Site"></div> -->
                                        <div id="about-17" class="component lazy-load-placeholder" category="Real Estate Agencies"></div>
                                        <div id="about-18" class="component lazy-load-placeholder" category="Music Coach"></div>
                                        <div id="about-19" class="component lazy-load-placeholder" category="Clinic"></div>
                                        <div id="about-20" class="component lazy-load-placeholder" category="Event Planner"></div>
                                        <!-- <div id="about-21" class="component lazy-load-placeholder" category="Vacation Rentals"></div> -->
                                        <div id="about-22" class="component lazy-load-placeholder" category="Restaurant"></div>
                                        <div id="about-23" class="component lazy-load-placeholder" category="Gym"></div>
                                        <div id="about-24" class="component lazy-load-placeholder" category="Clinic"></div>
                                        <div id="about-25" class="component lazy-load-placeholder" category="Photography"></div>
                                        <div id="about-26" class="component lazy-load-placeholder" category="Nutritionist"></div>
                                        <div id="about-27" class="component lazy-load-placeholder" category="Nutritionist"></div>
                                        <div id="about-28" class="component lazy-load-placeholder" category="Coaching center"></div>
                                        <div id="about-29" class="component lazy-load-placeholder" category="Coaching center"></div>
                                        <div id="about-30" class="component lazy-load-placeholder" category="Chartered Accountant"></div>
                                        <div id="about-31" class="component lazy-load-placeholder" category="Advocate"></div>
                                        <div id="about-32" class="component lazy-load-placeholder" category="Clinic"></div>

                                        <div id="about-33" class="component lazy-load-placeholder" category="Clinic"></div>
                                        <div id="about-34" class="component lazy-load-placeholder" category="Yoga & Meditation"></div>

                                        <div id="about-35" class="component lazy-load-placeholder" category="Yoga & Meditation"></div>
                                        <div id="about-36" class="component lazy-load-placeholder" category="Portfolio"></div>
                                        <div id="about-37" class="component lazy-load-placeholder" category="Portfolio"></div>
                                        <div id="about-38" class="component lazy-load-placeholder" category="Portfolio"></div>
                                        <div id="about-39" class="component lazy-load-placeholder" category="Portfolio"></div>
                                        <div id="about-40" class="component lazy-load-placeholder" category="Portfolio"></div>
                                        <!-- <div id="about-41" class="component lazy-load-placeholder" category="Software Companies"></div> -->
                                        <!-- <div id="about-42" class="component lazy-load-placeholder" category="Tech Startups"></div> -->
                                        <div id="about-43" class="component lazy-load-placeholder" category="Portfolio"></div>
                                        <div id="about-44" class="component lazy-load-placeholder" category="Financial Advisors"></div>
                                        <div id="about-45" class="component lazy-load-placeholder" category="Real Estate Agencies"></div>
                                        <div id="about-46" class="component lazy-load-placeholder" category="Financial Advisors"></div>
                                        <div id="about-47" class="component lazy-load-placeholder" category="Music Coach"></div>
                                        <div id="about-48" class="component lazy-load-placeholder" category="Restaurant"></div>
                                        <div id="about-49" class="component lazy-load-placeholder" category="Travel Agencies"></div>
                                        <div id="about-50" class="component lazy-load-placeholder" category="Salon & Spa"></div>
                                        <div id="about-51" class="component lazy-load-placeholder" category="Interior Designer"></div>
                                        <div id="about-52" class="component lazy-load-placeholder" category="Interior Designer"></div>
                                        <div id="about-53" class="component lazy-load-placeholder" category="Chartered Accountant"></div>
                                        <div id="about-54" class="component lazy-load-placeholder" category="Company Secretary"></div>
                                        <div id="about-55" class="component lazy-load-placeholder" category="Architect"></div>
                                        <div id="about-56" class="component lazy-load-placeholder" category="Architect"></div>
                                        <div id="about-57" class="component lazy-load-placeholder" category="Architect"></div>
                                        <div id="about-58" class="component lazy-load-placeholder" category="Advocate"></div>
                                        <div id="about-59" class="component lazy-load-placeholder" category="Advocate"></div>
                                        <div id="about-60" class="component lazy-load-placeholder" category="Advocate"></div>
                                        <div id="about-61" class="component lazy-load-placeholder" category="Nutritionist"></div>
                                        <div id="about-62" class="component lazy-load-placeholder" category="Nutritionist"></div>
                                        <div id="about-63" class="component lazy-load-placeholder" category="Nutritionist"></div>
                                        <div id="about-64" class="component lazy-load-placeholder" category="catering"></div>


                                        <!-- <div id="courses-1" class="component lazy-load-placeholder" category="Corporate/Company Site"></div> -->
                                        <div id="courses-2" class="component lazy-load-placeholder" category="Tutor"></div>
                                        <div id="courses-3" class="component lazy-load-placeholder" category="Tutor"></div>
                                        <div id="courses-4" class="component lazy-load-placeholder" category="Pre-school & Daycare"></div>
                                        <div id="courses-5" class="component lazy-load-placeholder" category="Gym"></div>
                                        <div id="courses-6" class="component lazy-load-placeholder" category="Coaching center"></div>
                                        <!-- <div id="courses-7" class="component lazy-load-placeholder" category="Software Companies"></div> -->

                                        <div id="events-1" class="component lazy-load-placeholder" category="Tutor"></div>
                                        <!-- <div id="events-2" class="component lazy-load-placeholder" category="Corporate/Company Site"></div> -->
                                        <div id="events-3" class="component lazy-load-placeholder" category="Event Planner "></div>
                                        <div id="events-4" class="component lazy-load-placeholder" category="Chartered Accountant"></div>
                                        <div id="events-5" class="component lazy-load-placeholder" category="Chartered Accountant"></div>
                                        <div id="events-6" class="component lazy-load-placeholder" category="Music Coach"></div>
                                        <div id="events-7" class="component lazy-load-placeholder" category="Salon & Spa"></div>


                                        <div id="news-1" class="component lazy-load-placeholder" category="Financial Advisors"></div>
                                        <div id="news-2" class="component lazy-load-placeholder" category="Coaching center"></div>
                                        <div id="news-3" class="component lazy-load-placeholder" category="Auto Repair Shops"></div>
                                        <!-- <div id="news-4" class="component lazy-load-placeholder" category="Artist/Illustrator"></div> -->
                                        <div id="news-5" class="component lazy-load-placeholder" category="Event Planner"></div>
                                        <div id="news-6" class="component lazy-load-placeholder" category="Clinic"></div>
                                        <div id="news-7" class="component lazy-load-placeholder" category="Financial Advisors"></div>

                                        <div id="testimonial-1" class="component lazy-load-placeholder"></div>
                                        <div id="testimonial-2" class="component lazy-load-placeholder" category="Photography"></div>
                                        <div id="testimonial-3" class="component lazy-load-placeholder"></div>
                                        <div id="testimonial-4" class="component lazy-load-placeholder" category="Clinic"></div>
                                        <!-- <div id="testimonial-5" class="component lazy-load-placeholder" category="Corporate/Company Site"></div> -->
                                        <!-- <div id="testimonial-6" class="component lazy-load-placeholder" category="CA"></div> -->
                                        <div id="testimonial-8" class="component lazy-load-placeholder"></div>
                                        <div id="testimonial-9" class="component lazy-load-placeholder" category="Graphic Design"></div>
                                        <div id="testimonial-10" class="component lazy-load-placeholder" category="Writing/Journalism"></div>
                                        <!-- <div id="testimonial-11" class="component lazy-load-placeholder" category="Conferences & Seminars"></div> -->
                                        <div id="testimonial-12" class="component lazy-load-placeholder" category="Restaurant"></div>
                                        <div id="testimonial-13" class="component lazy-load-placeholder" category="Nutritionist"></div>
                                        <div id="testimonial-14" class="component lazy-load-placeholder" category="Salon & Spa"></div>
                                        <div id="testimonial-15" class="component lazy-load-placeholder" category="Travel Agencies"></div>
                                        <div id="testimonial-16" class="component lazy-load-placeholder" category="Advocate"></div>


                                        <div id="slider-1" class="component lazy-load-placeholder" category="School"></div>
                                        <div id="slider-2" class="component lazy-load-placeholder" category="Electronic Item Services"></div>
                                        <div id="slider-4" class="component lazy-load-placeholder" category="Restaurant"></div>

                                        <!-- <div id="slider-3" class="component lazy-load-placeholder"></div> -->
                                        <div id="pricing-1" class="component lazy-load-placeholder"></div>
                                        <div id="pricing-2" class="component lazy-load-placeholder" category="Financial Advisors"></div>
                                        <div id="pricing-3" class="component lazy-load-placeholder" category="Musician/Band"></div>
                                        <div id="pricing-4" class="component lazy-load-placeholder" category="Tutor"></div>
                                        <div id="pricing-5" class="component lazy-load-placeholder" category="Coaching center"></div>
                                        <div id="pricing-6" class="component lazy-load-placeholder" category="Coaching center"></div>
                                        <div id="pricing-7" class="component lazy-load-placeholder" category="Photography"></div>
                                        <div id="pricing-8" class="component lazy-load-placeholder" category="Chartered Accountant"></div>
                                        <div id="pricing-9" class="component lazy-load-placeholder" category="Chartered Accountant"></div>
                                        <div id="pricing-10" class="component lazy-load-placeholder" category="Music Coach"></div>
                                        <div id="pricing-11" class="component lazy-load-placeholder" category="Makeup Artists"></div>

                                        <div id="contact-1" class="component lazy-load-placeholder"></div>
                                        <div id="contact-2" class="component lazy-load-placeholder"></div>
                                        <div id="contact-3" class="component lazy-load-placeholder"></div>
                                        <div id="contact-4" class="component lazy-load-placeholder"></div>
                                        <div id="contact-5" class="component lazy-load-placeholder"></div>
                                        <div id="contact-6" class="component lazy-load-placeholder"></div>
                                        <div id="contact-7" class="component lazy-load-placeholder"></div>
                                        <div id="contact-8" class="component lazy-load-placeholder"></div>
                                        <div id="contact-9" class="component lazy-load-placeholder" category="Real Estate Agencies"></div>
                                        <div id="contact-10" class="component lazy-load-placeholder" category="Restaurant"></div>
                                        <div id="contact-11" class="component lazy-load-placeholder" category="Gym"></div>
                                        <div id="contact-12" class="component lazy-load-placeholder" category="Coaching center"></div>
                                        <div id="contact-13" class="component lazy-load-placeholder" category="Chartered Accountant"></div>
                                        <div id="contact-14" class="component lazy-load-placeholder" category="Advocate "></div>
                                        <div id="contact-15" class="component lazy-load-placeholder" category="Portfolio"></div>
                                        <!-- <div id="contact-16" class="component lazy-load-placeholder" category="Tech Startups"></div> -->
                                        <div id="contact-17" class="component lazy-load-placeholder" category="Financial Advisors"></div>
                                        <div id="contact-18" class="component lazy-load-placeholder" category="Financial Advisors"></div>
                                        <div id="contact-19" class="component lazy-load-placeholder" category="Makeup Artists"></div>
                                        <div id="contact-20" class="component lazy-load-placeholder" category="Salon & Spa"></div>
                                        <div id="contact-21" class="component lazy-load-placeholder" category="Chartered Accountant"></div>
                                        <div id="contact-22" class="component lazy-load-placeholder" category="Company Secretary"></div>
                                        <div id="contact-23" class="component lazy-load-placeholder" category="Architect"></div>
                                        <div id="contact-24" class="component lazy-load-placeholder" category="Advocate"></div>
                                        <div id="contact-25" class="component lazy-load-placeholder" category="Nutritionist"></div>

                                        <div id="services-1" class="component lazy-load-placeholder" category="Clinic"></div>
                                        <div id="services-2" class="component lazy-load-placeholder" category="Clinic"></div>
                                        <div id="services-3" class="component lazy-load-placeholder" category="Clinic"></div>
                                        <div id="services-4" class="component lazy-load-placeholder" category="Hotel/Lounges"></div>
                                        <div id="services-5" class="component lazy-load-placeholder" category="Chartered Accountant"></div>
                                        <div id="services-6" class="component lazy-load-placeholder" category="Chartered Accountant"></div>
                                        <div id="services-7" class="component lazy-load-placeholder" category="Financial Advisors"></div>
                                        <div id="services-8" class="component lazy-load-placeholder" category="Music Coach"></div>
                                        <div id="services-9" class="component lazy-load-placeholder" category="Company Secretary"></div>
                                        <div id="services-10" class="component lazy-load-placeholder" category="Company Secretary"></div>
                                        <div id="services-11" class="component lazy-load-placeholder" category="Photography"></div>
                                        <!-- <div id="services-12" class="component lazy-load-placeholder" category="Artist/Illustrator"></div> -->
                                        <div id="services-13" class="component lazy-load-placeholder" category="Nutritionist"></div>
                                        <div id="services-14" class="component lazy-load-placeholder" category="Cafes & Bakeries"></div>
                                        <div id="services-15" class="component lazy-load-placeholder" category="Catering Services"></div>
                                        <div id="services-16" class="component lazy-load-placeholder" category="Restaurant"></div>
                                        <div id="services-17" class="component lazy-load-placeholder" category="Clinic"></div>
                                        <div id="services-18" class="component lazy-load-placeholder" category="Coaching center"></div>
                                        <div id="services-19" class="component lazy-load-placeholder" category="Advocate "></div>
                                        <div id="services-20" class="component lazy-load-placeholder" category="Clinic"></div>
                                        <div id="services-21" class="component lazy-load-placeholder" category="Portfolio"></div>
                                        <div id="services-22" class="component lazy-load-placeholder" category="Tech Startups"></div>
                                        <div id="services-23" class="component lazy-load-placeholder" category="Portfolio"></div>
                                        <div id="services-24" class="component lazy-load-placeholder" category="Real Estate Agencies"></div>
                                        <div id="services-25" class="component lazy-load-placeholder" category="Financial Advisors"></div>
                                        <div id="services-26" class="component lazy-load-placeholder" category="Music Coach"></div>
                                        <div id="services-27" class="component lazy-load-placeholder" category="Makeup Artists"></div>
                                        <div id="services-28" class="component lazy-load-placeholder" category="Salon & Spa"></div>
                                        <div id="services-29" class="component lazy-load-placeholder" category="Interior Designer"></div>
                                        <!-- <div id="services-30" class="component lazy-load-placeholder" category="Chartered Accountant"></div> -->
                                        <div id="services-31" class="component lazy-load-placeholder" category="Chartered Accountant"></div>
                                        <div id="services-32" class="component lazy-load-placeholder" category="Company Secretary"></div>
                                        <div id="services-33" class="component lazy-load-placeholder" category="Company Secretary"></div>
                                        <div id="services-34" class="component lazy-load-placeholder" category="Architect"></div>
                                        <div id="services-35" class="component lazy-load-placeholder" category="Architect"></div>
                                        <div id="services-36" class="component lazy-load-placeholder" category="Architect"></div>
                                        <div id="services-37" class="component lazy-load-placeholder" category="Advocate"></div>
                                        <div id="services-38" class="component lazy-load-placeholder" category="Nutritionist"></div>
                                        <div id="services-39" class="component lazy-load-placeholder" category="Nutritionist"></div>
                                        <div id="services-40" class="component lazy-load-placeholder" category="Nutritionist"></div>
                                        <div id="services-41" class="component lazy-load-placeholder" category="catering"></div>


                                        <div id="blog-2" class="component lazy-load-placeholder"></div>
                                        <div id="blog-6" class="component lazy-load-placeholder" category="Clinic"></div>
                                        <div id="blog-7" class="component lazy-load-placeholder" category="Weddings"></div>
                                        <div id="blog-8" class="component lazy-load-placeholder" category="Travel Agencies"></div>
                                        <div id="blog-9" class="component lazy-load-placeholder" category="Travel Agencies"></div>
                                        <div id="blog-10" class="component lazy-load-placeholder" category="Recipe Blogs"></div>
                                        <div id="blog-11" class="component lazy-load-placeholder" category="Vacation Rentals"></div>
                                        <div id="blog-12" class="component lazy-load-placeholder" category="Gym"></div>
                                        <div id="blog-13" class="component lazy-load-placeholder" category="Nutritionist"></div>
                                        <div id="blog-14" class="component lazy-load-placeholder" category="Coaching center"></div>
                                        <div id="blog-15" class="component lazy-load-placeholder" category="Financial Advisors"></div>
                                        <div id="blog-16" class="component lazy-load-placeholder" category="Travel Agencies"></div>
                                        <div id="blog-17" class="component lazy-load-placeholder" category="Interior Designer"></div>
                                        <div id="blog-18" class="component lazy-load-placeholder" category="Company Secretary"></div>
                                        <div id="blog-19" class="component lazy-load-placeholder" category="Architect"></div>
                                        <div id="blog-20" class="component lazy-load-placeholder" category="Architect"></div>
                                        <div id="blog-21" class="component lazy-load-placeholder" category="Advocate"></div>
                                        <div id="blog-22" class="component lazy-load-placeholder" category="Nutritionist"></div>

                                        <div id="faq-1" class="component lazy-load-placeholder"></div>
                                        <div id="faq-2" class="component lazy-load-placeholder"></div>
                                        <div id="faq-3" class="component lazy-load-placeholder" category="Influencer"></div>
                                        <div id="faq-4" class="component lazy-load-placeholder" category="Home Staging"></div>
                                        <div id="faq-5" class="component lazy-load-placeholder" category="Chartered Accountant"></div>
                                        <div id="faq-6" class="component lazy-load-placeholder" category="Nutritionist"></div>

                                        <div id="newsletter-1" class="component lazy-load-placeholder"></div>
                                        <div id="newsletter-2" class="component lazy-load-placeholder" category="Education"></div>
                                        <div id="newsletter-3" class="component lazy-load-placeholder" category="Weddings"></div>
                                        <div id="newsletter-4" class="component lazy-load-placeholder" category="Music Coach"></div>
                                        <div id="newsletter-5" class="component lazy-load-placeholder" category="Coaching center"></div>

                                        <div id="ourteam-1" class="component lazy-load-placeholder" category="Clinic"></div>
                                        <div id="ourteam-2" class="component lazy-load-placeholder" category="Gym"></div>
                                        <!-- <div id="ourteam-3" class="component lazy-load-placeholder" category="Conferences & Seminars"></div> -->
                                        <div id="ourteam-4" class="component lazy-load-placeholder" category="Chartered Accountant"></div>
                                        <div id="ourteam-5" class="component lazy-load-placeholder" category="Makeup Artists"></div>
                                        <div id="ourteam-6" class="component lazy-load-placeholder" category="Architect"></div>
                                        <div id="ourteam-7" class="component lazy-load-placeholder" category="catering"></div>

                                        <div id="help-1" class="component lazy-load-placeholder" category="School"></div>
                                        <div id="help-2" class="component lazy-load-placeholder" category="Coaching center"></div>

                                    </div>
                                <span id="back-top" class="text-center fa fa-caret-up"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    $('body').append(modalHtml);
    $('#dynamicModal').modal('show');
    loadAllRequiredContents();

    $('#dynamicModal').on('shown.bs.modal', function () {
        enableRadioButtons();
    });

    $(document).on('click', '#saveSection', handleSaveSection);
    $(document).on('click', '#closeModal', function () {
        $('#dynamicModal').modal('hide');
    });

    $('#dynamicModal').on('hidden.bs.modal', function () {
        $(this).remove();
    });

    let selectedCategory = "all";
    let selectedSection = "all";

    // Categories Data
const categories = [
  {
    title: 'All',
    icon: 'ri-grid-fill',
    sub: []
  },
  {
    title: 'Local Businesses',
    icon: 'ri-store-line',
    sub: ['Salon & Spa', 'Gym', 'Clinic', 'Café', 'Restaurant', 'Real Estate Agencies', 'Travel Agencies']
  },
  {
    title: 'Service Provider',
    icon: 'ri-service-line',
    sub: ['Architect', 'Interior Designer', 'Photographer/Videographer', 'Event Planner', 'Chartered Accountant', 'Company Secretary', 'Advocate', 'Music Coach', 'Makeup Artists', 'Financial Advisors']
  },
  {
    title: 'Education & Learning',
    icon: 'ri-book-line',
    sub: ['Coaching Center', 'Tutor', 'Pre-school & Daycare', 'School', 'College']
  },
  {
    title: 'Professional Showcase',
    icon: 'ri-user-line',
    sub: ['Portfolio', 'Influencer', 'Blogger/Vlogger']
  },
  {
    title: 'Health & Wellness',
    icon: 'ri-heart-line',
    sub: ['Fitness & Gym', 'Yoga & Meditation', 'Nutritionist', 'Clinic', 'Pharmacy', 'Fitness Coach']
  },
  {
    title: 'Food & Hospitality',
    icon: 'ri-restaurant-line',
    sub: ['Restaurants', 'Cafes & Bakeries', 'Catering Services', 'Hotel/Lounges']
  },
  {
    title: 'Events & Entertainment',
    icon: 'ri-calendar-line',
    sub: ['Event Planner', 'Event Booking Platform']
  },
  {
    title: 'Nonprofit & Community',
    icon: 'ri-hand-heart-line',
    sub: ['Charity/NGO', 'Religious Organizations']
  },
  {
    title: 'Automotive & Transportation',
    icon: 'ri-car-line',
    sub: ['Car Dealerships', 'Auto Repair Shops', 'Car Rentals', 'Logistics & Shipping', 'Rideshare Services']
  },
  {
    title: 'Sports & Recreation',
    icon: 'ri-football-line',
    sub: ['Sports Clubs', 'Sporting Goods Stores', 'Game Zone']
  },
  {
    title: 'Pets & Animals',
    icon: 'ri-paw-line',
    sub: ['Pet Store', 'Pet Grooming', 'Animal Shelters']
  },
  {
    title: 'Repair & Maintenance',
    icon: 'ri-tools-line',
    sub: ['Fabrication', 'Plumbing', 'Civil Work', 'Electrician', 'Carpenter', 'Cleaning Service', 'Electronic Item Services']
  }
];


// Add section main category filter
const $menu = $('#categoryDropdownMenu');
categories.forEach((cat, index) => {
    const hasSub = cat.sub.length > 0;
    const collapseId = `collapse-${index}`;

    const mainItem = $('<li class="dropdown-item category-parent"></li>');

    if (hasSub) {
        mainItem.attr('data-collapse', collapseId);

        mainItem.html(`
            <div class="category-title">
                <span>
                    <i class="${cat.icon}" style="margin-right:10px;"></i>${cat.title}
                </span>
                <i class="ri-arrow-right-s-line category-arrow"></i>
            </div>
        `);

        const subList = $(`<ul class="category-sub" id="${collapseId}"></ul>`).hide();

        cat.sub.forEach(sub => {
            subList.append(`
                <li>
                    <a href="#" data-value="${sub}">${sub}</a>
                </li>
            `);
        });

        $menu.append(mainItem);
        $menu.append(subList);
    } else {
        $menu.append(`
            <li>
                <a href="#" data-value="${cat.title}" class="all-main-category">
                    <i class="${cat.icon}" style="margin-right:10px;"></i>${cat.title}
                </a>
            </li>
        `);
    }
});

$(document).on('click', '.category-parent', function (e) {
    e.stopPropagation();

    const collapseId = $(this).data('collapse');
    const $sub = $('#' + collapseId);
    const $arrow = $(this).find('.category-arrow');

    // Close others
    $('.category-sub').not($sub).slideUp(200);
    $('.category-arrow').not($arrow).removeClass('open');

    // Toggle current
    $sub.slideToggle(200);
    $arrow.toggleClass('open');
});
$(document).on('click', '.all-main-category', function (e) {
    e.preventDefault();

    const text = $(this).text().trim();
    const iconClass = $(this).find('i').attr('class');

    $('#categoryDropdownButton').html(`
        <span class="selected-category">
            <i class="${iconClass}" style="margin-right:10px;"></i>${text}
        </span>
        <span class="caret"></span>
    `);

    selectedCategory = text;
    filterComponents();
});
$(document).on('click', '.category-sub a', function (e) {
    e.preventDefault();
    e.stopPropagation();

    const text = $(this).text().trim();
    const iconClass = $(this)
        .closest('.category-sub')
        .prev('.category-parent')
        .find('i')
        .first()
        .attr('class');

    $('#categoryDropdownButton').html(`
        <span class="selected-category">
            <i class="${iconClass}" style="margin-right:10px;"></i>${text}
        </span>
        <span class="caret"></span>
    `);

    selectedCategory = text;
    filterComponents();
});



    // Section Filter
    $(document).on('click', '#section-filter a', function (e) {
        e.preventDefault();
        selectedSection = $(this).data('value');
        $('#section-filter button').html(`${$(this).text()} <span class="caret"></span>`);
        filterComponents();
    });

    // Filtering Function (Category + Section Dependent)
    function filterComponents() {
        let isAnyComponentVisible = false;

        $('.component').each(function () {
            const componentCategory = ($(this).attr('category') || '').toLowerCase();
            const componentId = $(this).attr('id') || '';
            const componentSection = componentId.split('-')[0].toLowerCase();

            const categoryMatch = (selectedCategory.toLowerCase() === 'all') || (componentCategory.includes(selectedCategory.toLowerCase()));
            const sectionMatch = (selectedSection.toLowerCase() === 'all') || (componentSection === selectedSection.toLowerCase());

            if (categoryMatch && sectionMatch) {
                $(this).show();
                isAnyComponentVisible = true;
            } else {
                $(this).hide();
            }
        });

        $('#no-components-message').toggle(!isAnyComponentVisible);
    }

    // Default trigger both as 'All'
    selectedCategory = 'all';
    selectedSection = 'all';
    filterComponents();

    // Close dropdowns when clicked outside
    $(document).on('click', function (e) {
        if (!$(e.target).closest('#categoryDropdownMenu').length) {
            $('.dropdown-item .ri-arrow-right-s-line').removeClass('rotate');
            $('#categoryDropdownMenu ul').slideUp(200);
        }
    });
}





    function enableRadioButtons() {
        document.querySelectorAll('.radio-holder').forEach(radioHolder => {
            radioHolder.classList.remove('disabled');
            const inputElement = radioHolder.querySelector('input');
            if (inputElement) {
                inputElement.removeAttribute('disabled');
            }
        });
    }

    $(document).on('click', '.add-section-above, .add-section-below', function() {
        if (isEditingContent) {
            const action = $(this).data('action');
            const targetId = $(this).closest('.section-wrapper').attr('id');
            $('#saveSection').data('target-id', targetId);
            $('#saveSection').data('action', action);
            createAndShowModal();
        }
    });

        function handleSaveSection() {
            if (!isEditingContent) return;
 
            let selectedIds = JSON.parse(getCookie("middle_sections") || '{}');
            let targetId = $(this).data('target-id');
            let action = $(this).data('action');
 
            if (!selectedIds || Object.keys(selectedIds).length === 0) return;
 
            let inserted = false;
            const $mainContainer = $('#mainPageContent');
 
            for (let section in selectedIds) {
                selectedIds[section].forEach(function (id) {
 
                    let sectionToClone = $('#' + id)
                        .find('.section-wrapper')
                        .first()
                        .clone();
 
                    if (!sectionToClone.length) return;
 
                    // assign new ID
                    let newSectionId = generateUniqueId();
                    sectionToClone
                        .attr('id', newSectionId)
                        .attr('data-new-section', 'true'); // ⭐ mark new
 
                    // remove old buttons
                    sectionToClone
                        .find('.add-section-above, .add-section-below, .remove-section-btn, .remove-section-btn-wrapper')
                        .remove();
 
                    // add fresh buttons
                    addActionButtons(sectionToClone);
                    sectionToClone.find('.remove-section-btn-wrapper:empty').remove();
 
                    const $targetWrapper = $('#' + targetId);
 
                    if ($targetWrapper.length) {
                        action === 'above'
                            ? $targetWrapper.before(sectionToClone)
                            : $targetWrapper.after(sectionToClone);
                    } else {
                        $mainContainer.append(sectionToClone);
                    }
 
                    inserted = true;
                });
            }
 
            if (inserted) {
                setCookie("middle_sections", JSON.stringify({}));
                uploadImagesFromAddedSections(); // NEW AJAX HERE
                $('#dynamicModal').modal('hide');
                $('.section-wrapper').show();
            }
        }

        function getFileNameFromImgSrc(imgEl) {
        let src = $(imgEl).attr('src');
        if (src.includes('?')) src = src.split('?')[0];
        return src.substring(src.lastIndexOf('/') + 1);
        }
        
        function uploadImagesFromAddedSections() {
 
            const clientName = getCookie('clientName');
            const clientProjectName = getCookie('clientProjectName');
 
            if (!clientName || !clientProjectName) {
                alert("clientName or clientProjectName missing in cookies");
                return;
            }
 
            $('.section-wrapper[data-new-section="true"]').each(function () {
 
                $(this).find('img').each(function () {
 
                    const imgEl = this;
                    const imgSrc = imgEl.src;
 
                    if (!imgSrc || imgSrc.startsWith('data:')) return;
 
                    urlToFile(imgSrc, getFileNameFromImgSrc(imgEl), function (file) {
 
                        const formData = new FormData();
                        formData.append('imgFile', file);
                        formData.append('imgFileName', getFileNameFromImgSrc(imgEl));
                        formData.append('clientName', clientName);
                        formData.append('clientProjectName', clientProjectName);
 
                        $.ajax({
                            type: "POST",
                            url: "fuos/",
                            data: formData,
                            processData: false,
                            contentType: false,
                            success: function () {
                                const basePath = getBasePathFromImgSrc(imgEl);
                                const fileName = getFileNameFromImgSrc(imgEl);
 
                                if (basePath && fileName) {
                                    $(imgEl).attr(
                                        'src',
                                        basePath + fileName + '?' + Date.now()
                                    );
                                }
                            },
                            error: function (xhr) {
                                console.error("Image upload failed:", xhr.responseText);
                            }
                        });
 
                    });
                });
 
                // clean marker after upload
                $(this).removeAttr('data-new-section');
            });
        }
 

    // Ensure event is attached once to avoid repeated execution
    $(document).ready(function() {
        $('#saveSection').off('click').on('click', handleSaveSection);
    });




    function handleSectionFilter() {
        let selectedSection = $(this).data('value');
        $('#section-filter button').text($(this).text());
        $('#section-filter .dropdown-menu li').removeClass('active');
        $(this).parent().addClass('active');
        let sectionsFound = false;
        if (selectedSection === 'all') {
            $('.middle_sections_container .component').show();
            $('#modalBodyContent').height('auto');
        } else {
            $('.middle_sections_container .component').each(function() {
                let sectionId = $(this).attr('id');
                if (sectionId && sectionId.includes(selectedSection)) {
                    $(this).show();
                    sectionsFound = true;
                } else {
                    $(this).hide();
                }
            });
            if (!sectionsFound) {
                $('.middle_sections_container').html(`<div class="no-sections-message">No sections are available for the "${$(this).text()}" category.</div>`);
                $('#modalBodyContent').height('100vh');
                $('#modalBodyContent').height('auto');
            }
        }
    }


    function handleAddSectionButton() {
        const action = $(this).data('action');
        const targetWrapper = $(this).closest('.section-wrapper');
        const targetId = targetWrapper.attr('id');

        if (!targetId) return;

        $('#saveSection').data('target-id', targetId);
        $('#saveSection').data('action', action);
        createAndShowModal();
    }


function addActionButtons(sectionWrapper) {
    // Ensure section has an ID
    if (!sectionWrapper.attr('id')) {
        sectionWrapper.attr('id', generateUniqueId());
    }

    const sectionId = sectionWrapper.attr('id');

    // 🧹 Remove all old buttons and wrappers first
    sectionWrapper.find('.add-section-above, .add-section-below, .remove-section-btn-wrapper, .remove-section-btn').remove();

    //  Create all button HTML (only add wrapper if it contains the button)
    const addAboveButtonHtml = `
        <button class="add-section-above" style="position:absolute; left:47%; top:25px; z-index:999;"
            data-target-id="${sectionId}" data-action="above">
            Add Section Above
            <span><img src="assets/images/arrow_up.png" style="width:20px; height:20px;"/></span>
        </button>
    `;
    const addBelowButtonHtml = `
        <button class="add-section-below" style="position:absolute; left:47%; bottom:22px; z-index:999;"
            data-target-id="${sectionId}" data-action="below">
            Add Section Below
            <span><img src="assets/images/arrow_down.png" style="width:20px; height:20px;"/></span>
        </button>
    `;
    const removeButtonHtml = `
        <button class="remove-section-btn" data-target-id="${sectionId}"
            style="position:absolute; top:5px; right:10px; z-index:999;">&times;</button>
    `;

    // 🧩 Append only meaningful elements — no blank wrapper
    sectionWrapper.append($(addAboveButtonHtml));
    sectionWrapper.append($(addBelowButtonHtml));
    sectionWrapper.append($(removeButtonHtml));

    // 🧹 Double-check no empty wrappers exist
    sectionWrapper.find('.remove-section-btn-wrapper:empty').remove();

    // 🔗 Rebind events
    sectionWrapper.find('.add-section-above, .add-section-below').off('click').on('click', handleAddSectionButton);
    sectionWrapper.find('.remove-section-btn').off('click').on('click', handleRemoveSection);
}


function handleRemoveSection(e) {
    e.stopPropagation();
    const sectionId = $(this).data('target-id');
    const section = $('#' + sectionId);

    if (confirm('Are you sure you want to remove this section?')) {
        section.remove();
    }
}

// Generate Unique ID
function generateUniqueId() {
    return 'section-' + Math.random().toString(36).substring(2, 15);
}

});


function getCookie(name) {
    const cookies = document.cookie.split("; ");

    for (let i = 0; i < cookies.length; i++) {
        const parts = cookies[i].split("=");
        const key = parts.shift();
        const value = parts.join("=");

        if (key === name) {
            return decodeURIComponent(value);
        }
    }
    return null;
}

//loader for uploadeditedproject 
function showProjectLoader(message = "Uploading changes, please wait…") {
    // If loader already exists, just update message and show
    let loader = $('#project-loader');
    if (!loader.length) {
        // Create the loader dynamically
        loader = $(`
            <div id="project-loader">
                <div class="pl-circle"></div>
                <div class="pl-text">${message}</div>
            </div>
        `).appendTo('body');

        // Inject CSS dynamically if not present
        if (!$('#project-loader-styles').length) {
            const css = `
                #project-loader {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: #0f172ae3;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-direction: column;
                    z-index: 99999;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.4s ease;
                }

                #project-loader.active {
                    opacity: 1;
                    pointer-events: all;
                }

                .pl-circle {
                    width: 80px;
                    height: 80px;
                    border: 6px solid #64748b;
                    border-top-color: #38bdf8;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 12px;
                }

                .pl-text {
                    color: #e2e8f0;
                    font-size: 18px;
                    letter-spacing: 1px;
                    font-family: sans-serif;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `;
            $('<style>', { id: 'project-loader-styles', text: css }).appendTo('head');
        }
    }

    // Update message and show
    loader.find('.pl-text').text(message);
    loader.addClass('active');
}

function hideProjectLoader() {
    const loader = $('#project-loader');
    loader.removeClass('active');
}

//end of loader of code


function uploadeditedproject() {
    const projectId = getCookie("UpdateContentAddSectionprojectId");
    const clientName = getCookie("clientName");
    const clientProjectName = getCookie("clientProjectName");
    // alert('Changes are uploading please wait');
    showProjectLoader("Uploading changes, please wait…");

  //  SHOW LOADER
    $('#project-loader').addClass('active');
    $.ajax({
        url: `/uploadeditedproject/${projectId}/`,
        type: "POST",
        data: {
            client_name: clientName,
            client_project_name: clientProjectName,
            changed_files: JSON.stringify(Array.from(changedFiles))
        
        },
        beforeSend: function () {
            console.log("Uploading changes...");
        },
        success: function (response) {
             // HIDE LOADER
              hideProjectLoader();
            if (response.status === 200) {
                // alert('changes has been Uploaded.');
                alert(response.message);
                 // reset ONLY after successful upload
                 clearChangedFilesSession();
            } else {
                alert(response.message || "Upload failed");
            }
            
        },
        error: function (xhr) {
             // HIDE LOADER
            hideProjectLoader();
            console.error(xhr.responseText);
            alert("Server error occurred");
        }
    });
}