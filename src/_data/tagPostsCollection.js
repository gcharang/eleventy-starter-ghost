require("dotenv").config();
const ghostContentAPI = require("@tryghost/content-api");
const api = new ghostContentAPI({
    url: process.env.GHOST_API_URL,
    key: process.env.GHOST_CONTENT_API_KEY,
    version: "v2",
});

const stripDomain = (url) => {
    return url.replace(process.env.GHOST_API_URL, "");
};

//Create a tag post collection
module.exports = async function() {
    const allTags = await api.tags
        .browse({
            include: "count.posts",
            limit: "all",
        })
        .catch((err) => {
            console.error(err);
        });
    const allPosts = await api.posts
        .browse({
            include: "tags,authors",
            limit: "all",
        })
        .catch((err) => {
            console.error(err);
        });
 
    let tagPostsCollection = [];
    allTags.forEach(tag => {
        const taggedPosts = allPosts.filter(post => {
            post.url = stripDomain(post.url);
            const postTagNames = post.tags.map(postTag=>postTag.name)
            return postTagNames.includes(tag.name);
        });

        const postsPerPage = 7;
        for(let i = 0; i*postsPerPage < taggedPosts.length; i++){
            let postSet = {};
            postSet.posts = taggedPosts.slice( postsPerPage*(i) , postsPerPage*(i+1));
            postSet.tagName = tag.name;
            postSet.url = (i > 0) ? tag.slug + `/${i}/` : tag.slug + "/";
            if(i==0){
                postSet.isFirstPage = true;
            }
            if( (i+1)*postsPerPage > taggedPosts.length ){
                postSet.isLastPage = true;
            }
            tagPostsCollection.push(postSet);
        }
    })

    return tagPostsCollection;
}