function getReadingTime(text) {
    const wordsPerMinute = 200;
    const numberOfWords = text.split(/\s/g).length;
    return Math.ceil(numberOfWords / wordsPerMinute);
}

function generateCardHTML(post) {
    let cardHTML = "";

    let header = `<header class="post-card-header">`;
    // if( post.feature_image){
    //     header +=`<img class="post-card-image" src="${ post.feature_image }" alt="${ post.title }">`
    // }
    if (post.feature_image.startsWith("/en/blog")) {
        header += `<img class="post-card-image" src="https://komodoplatform.com${post.feature_image}" alt="${post.title}">`;
    } else {
        header += `<img class="post-card-image" src="${post.feature_image}" alt="${post.title}">`;
    }
    header += `<div class="post-card-tags">`;
    if (post.tags) {
        post.tags.forEach((tag) => {
            header += tag.name + " ";
        });
    }
    header += `</div><h2 class="post-card-title">${post.title}</h2></header>`;

    let excerpt = `<div class="post-card-excerpt"><p>${post.excerpt}</p></div>`;

    let footer = `<footer class="post-card-footer"><div class="post-card-footer-left">`;
    if (post.primary_author.profile_image) {
        footer += `<div class="post-card-avatar">
                    <img class="author-profile-image" src="${post.primary_author.profile_image}"
                        alt="${post.primary_author.name}"/></div>`;
    }
    footer += `<span>${post.primary_author.name}</span></div>`;
    footer += `<div class="post-card-footer-right">
                <div>${getReadingTime(post.html)} min read</div>
            </div></footer>`;

    cardHTML =
        `<a class="post-card ${
            post.featured ? "post-card-featured" : ""
        }" href="${post.url}">` +
        header +
        excerpt +
        footer +
        `</a>`;
    return cardHTML;
}

async function loadMorePosts(postFeedId, dataURI, buttonId) {
    let postFeedSection = document.getElementById(postFeedId);

    let postSetLoadCount = parseInt(postFeedSection.getAttribute("data-load-count"));
    let posts = [];
    try {
        let response = await fetch(
            `${dataURI}${postSetLoadCount}.json`
        );
        posts = await response.json();
    } catch (error) {
        console.log(error);
    }

    if (posts.length && posts[posts.length - 1].isLastPost) {
        document.getElementById(buttonId).setAttribute("hidden", true);
    }
    let postsHTML = "";
    posts.forEach((post, index) => {
        postsHTML += generateCardHTML(post);
    });
    postFeedSection.insertAdjacentHTML("beforeend", postsHTML);
    postFeedSection.setAttribute("data-load-count", postSetLoadCount + 1);
}

async function loadMoreHomePosts(event){
    await loadMorePosts("post-feed-all", "/data/posts/allPosts/", "loadPosts");
}

async function loadMoreTagPosts(event){
    const tagSlug = event.target.name.slice(13);
    const dataURI = `/data/posts/tagPosts/${tagSlug}/`;
    await loadMorePosts("tag-post-feed", dataURI, "loadTagPosts");
}

async function loadMoreAuthorPosts(event){
    const authorSlug = event.target.name.slice(16);
    const dataURI = `/data/posts/authorPosts/${authorSlug}/`;
    await loadMorePosts("author-post-feed", dataURI, "loadAuthorPosts");
}

if(document.getElementById("loadPosts")){
    document.getElementById("loadPosts").addEventListener("click", loadMoreHomePosts);
}
if(document.getElementById("loadTagPosts")){
    document.getElementById("loadTagPosts").addEventListener("click", loadMoreTagPosts);
}
if(document.getElementById("loadAuthorPosts")){
    document.getElementById("loadAuthorPosts").addEventListener("click", loadMoreAuthorPosts);
}