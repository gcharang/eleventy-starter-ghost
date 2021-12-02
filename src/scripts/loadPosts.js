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

async function loadMorePosts() {
    if (!sessionStorage.getItem("postSetLoadCount")) {
        sessionStorage.setItem("postSetLoadCount", 1);
    }
    postSetLoadCount = parseInt(sessionStorage.getItem("postSetLoadCount"));
    let posts = [];
    try {
        let response = await fetch(
            `/data/posts/allPosts/${postSetLoadCount}.json`
        );
        posts = await response.json();
    } catch (error) {
        console.log(error);
    }

    if (posts.length && posts[posts.length - 1].isLastPost) {
        document.getElementById("loadPosts").setAttribute("hidden", true);
    }
    let postsHTML = "";
    posts.forEach((post, index) => {
        postsHTML += generateCardHTML(post);
    });
    allPostsSection = document.getElementById("post-feed-all");
    allPostsSection.insertAdjacentHTML("beforeend", postsHTML);
    sessionStorage.setItem("postSetLoadCount", postSetLoadCount + 1);
}

document.getElementById("loadPosts").addEventListener("click", loadMorePosts);
