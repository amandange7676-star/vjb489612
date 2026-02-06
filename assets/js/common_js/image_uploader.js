$(document).ready(function () {
    // Initialization
    var wrapper = $('#wrapper').addClass('editableSection');

    // Add top bar
    var topBar = $('<div>', { id: 'top-bar', class: 'top-bar' }).insertBefore(wrapper);

    // Add image upload form
    $('<form method="post" id="imgForm" enctype="multipart/form-data">').appendTo('body');
    $('<input type="file" name="imgFile" id="image-upload" class="hidden" accept="image/*">').appendTo('#imgForm');
    $('<input type="text" class="hidden formFieldFileName" name="imgFileName" value="">').appendTo('#imgForm');
    $('<input type="text" class="hidden selectedPageName" name="selectedPageName" value="">').appendTo('body');

    // GitHub info from localStorage
    const token = localStorage.getItem('feature_key');
    const repoOwner = localStorage.getItem('owner');
    const repoName = localStorage.getItem('repo_name');
    const branch = "main";

    // Convert file to base64
    function toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
        });
    }

    // Get latest SHA for a file in GitHub
    async function getLatestSha(filePath) {
        try {
            const res = await fetch(
                `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`,
                {
                    headers: { 
                        Authorization: `token ${token}`, 
                        Accept: "application/vnd.github+json" 
                    }
                }
            );
            if (res.ok) return (await res.json()).sha;
        } catch {
            console.warn("Could not fetch latest SHA for", filePath);
        }
        return null;
    }

    // Extract GitHub repo path from image src
    function extractRepoPath(imgSrc) {
        return imgSrc
            .replace(/^https?:\/\/[^/]+\//, '')    // remove domain
            .replace(/^testing\//, '')             // remove "testing/" prefix
            .replace(/^\/+/, '')                   // remove leading slashes
            .replace(/^.*?(assets\/)/, 'assets/'); // trim everything before "assets/"
    }

    // Click event for updating image
    $(document).on('click', '.updateImg', function () {
        if (localStorage.getItem("featureEnabled") === "load buttons") {
            let imgName = "default";

            if ($(this).attr("src")) {
                imgName = $(this).attr("src");
            } else {
                const bgImg = $(this).css('background-image');
                if (bgImg && bgImg.includes('url(')) {
                    imgName = bgImg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
                }
            }

            if (imgName.includes("?")) imgName = imgName.split("?")[0];

            $(".formFieldFileName").val(imgName);
            $("#image-upload").data('imageElement', this);
            $("#image-upload").click();
        } else {
            return;
        }
    });

    // Trigger upload when file selected
    $("#image-upload").on('change', function () {
        uploadImgData();
    });

    // Upload image to GitHub
    async function uploadImgData() {
        const fileInput = $("#image-upload")[0];
        const file = fileInput.files[0];
        if (!file) return alert("No file selected!");

        const imgName = $(".formFieldFileName").val();
        const element = $("#image-upload").data("imageElement");

        // Convert to base64
        const base64 = await toBase64(file);
        const repoImagePath = extractRepoPath(imgName);

        if (!repoImagePath) {
            alert("Unable to determine GitHub path for image!");
            return;
        }

        // Get latest SHA from GitHub
        const sha = await getLatestSha(repoImagePath);
        const commitMessage = `Update ${repoImagePath} via web editor`;

        // Upload to GitHub
        const response = await fetch(
            `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${repoImagePath}`,
            {
                method: "PUT",
                headers: {
                    Authorization: `token ${token}`,
                    Accept: "application/vnd.github+json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: commitMessage,
                    content: base64.split(",")[1],
                    sha: sha,
                    branch: branch,
                }),
            }
        );

        const result = await response.json();

        if (result.content && result.commit) {
            console.log("GitHub image updated:", repoImagePath);

            // Update image on page with cache-busting
            const newSrc = `${imgName}?${Date.now()}`;
            if (element.tagName === "IMG") {
                $(element).attr("src", newSrc);
            } else {
                $(element).css("background-image", `url(${newSrc})`);
            }

            alert("Image updated on GitHub!");
        } else {
            alert("Upload failed: " + (result.message || "Unknown error"));
        }

        // Reset file input
        fileInput.value = "";
    }
});