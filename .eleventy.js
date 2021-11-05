require("dotenv").config();

const cleanCSS = require("clean-css");
const fs = require("fs");
const pluginRSS = require("@11ty/eleventy-plugin-rss");
const localImages = require("eleventy-plugin-local-images");
const lazyImages = require("eleventy-plugin-lazyimages");
const ghostContentAPI = require("@tryghost/content-api");
const { DateTime } = require("luxon");
const path = require("path");
const del = require("del");
const swBuild = require("./util/sw-build.js");
const htmlMinTransform = require("./src/transforms/html-min-transform.js");

// Init Ghost API
const api = new ghostContentAPI({
  url: process.env.GHOST_API_URL,
  key: process.env.GHOST_CONTENT_API_KEY,
  version: "v2"
});

const config = {
    dir: {
        output: "dist",
        input: "src",
     },
  };

// Strip Ghost domain from urls
const stripDomain = url => {
  return url.replace(process.env.GHOST_API_URL, "");
};

module.exports = function(eleventyConfig) {

  const dirToClean = path.join(config.dir.output, "*");
  del.sync(dirToClean, { dot: true });
  const swOptions = {
      globIgnores: [
          "*.png",
          "*.jpg",
          "*.jpeg",
          "*.svg",
          "*.mp4",
          "*.gif",
          "*.webp",
          "*.avif",
      ],
      swDest: "./dist/service-worker.js",
      cleanupOutdatedCaches: true,
      mode: process.env.NODE_ENV,
      globDirectory: "./dist",
      clientsClaim: true,
      skipWaiting: false,
      runtimeCaching: [
          {
              // Match any request that ends with .png, .jpg, .jpeg or .svg.
              urlPattern: /\.(?:png|jpg|jpeg|svg|avif|webp|gif)$/,
  
              // Apply a cache-first strategy.
              handler: "CacheFirst",
  
              options: {
                  // Use a custom cache name.
                  cacheName: "images",
  
                  // Only cache 10 images.
                  expiration: {
                      maxEntries: 100,
                  },
              },
          },
          {
              urlPattern:
                  /^.*\.(html|css|ico|woff2|woff|eot|ttf|otf|ttc|json)$/,
              handler: "StaleWhileRevalidate",
          },
          {
              urlPattern: /^https?:\/\/fonts\.googleapis\.com\/css/,
              handler: "StaleWhileRevalidate",
          },
      ],
    };
  // Minify HTML
  eleventyConfig.addTransform("htmlmin", htmlMinTransform);

  eleventyConfig.on("afterBuild", async () => {
    if (process.env.NODE_ENV === "production") {
      criticalCss();
    }
    swBuild(swOptions, config.dir.output).then((res) => console.log(res));
  });

  if (process.env.NODE_ENV === "production") {
    //eleventyConfig.addPlugin(lazyImagesPlugin, { preferNativeLazyLoad: true });
    //
    eleventyConfig.addPlugin(safeExternalLinks, {
      pattern: "https{0,1}://", // RegExp pattern for external links
      noopener: true, // Whether to include noopener
      noreferrer: false, // Whether to include noreferrer
      files: [
        // What output file extensions to work on
        ".html",
      ],
    });
  }


  // Assist RSS feed template
  eleventyConfig.addPlugin(pluginRSS);

  // Apply performance attributes to images
  eleventyConfig.addPlugin(lazyImages, {
    cacheFile: ""
  });

      
  // Copy images over from Ghost
  eleventyConfig.addPlugin(localImages, {
    distPath: "dist",
    assetPath: "/assets/images",
    selector: "img",
    attribute: "data-src", // Lazy images attribute
    verbose: false
  });

  // Inline CSS
  eleventyConfig.addFilter("cssmin", code => {
    return new cleanCSS({}).minify(code).styles;
  });

  eleventyConfig.addFilter("getReadingTime", text => {
    const wordsPerMinute = 200;
    const numberOfWords = text.split(/\s/g).length;
    return Math.ceil(numberOfWords / wordsPerMinute);
  });

  // Date formatting filter
  eleventyConfig.addFilter("htmlDateString", dateObj => {
    return new Date(dateObj).toISOString().split("T")[0];
  });

  // Don't ignore the same files ignored in the git repo
  eleventyConfig.setUseGitIgnore(false);


  eleventyConfig.addFilter("getReadingTime", (text) => {
           const wordsPerMinute = 200;
           const numberOfWords = text.split(/\s/g).length;
            return Math.ceil(numberOfWords / wordsPerMinute);
        });
    
        // Date formatting filter
        eleventyConfig.addFilter("htmlDateString", (dateObj) => {
            return new Date(dateObj).toISOString().split("T")[0];
        });

  // Get all pages, called 'docs' to prevent
  // conflicting the eleventy page object
  eleventyConfig.addCollection("docs", async function(collection) {
    collection = await api.pages
      .browse({
        include: "authors",
        limit: "all"
      })
      .catch(err => {
        console.error(err);
      });

    collection.map(doc => {
      doc.url = stripDomain(doc.url);
      doc.primary_author.url = stripDomain(doc.primary_author.url);

      // Convert publish date into a Date object
      doc.published_at = new Date(doc.published_at);
      return doc;
    });

    return collection;
  });

  // Get all posts
  eleventyConfig.addCollection("posts", async function(collection) {
    collection = await api.posts
      .browse({
        include: "tags,authors",
        limit: "all"
      })
      .catch(err => {
        console.error(err);
      });

    collection.forEach(post => {
      post.url = stripDomain(post.url);
      post.primary_author.url = stripDomain(post.primary_author.url);
      post.tags.map(tag => (tag.url = stripDomain(tag.url)));

      // Convert publish date into a Date object
      post.published_at = new Date(post.published_at);
    });

    // Bring featured post to the top of the list
    collection.sort((post, nextPost) => nextPost.featured - post.featured);

    return collection;
  });

  // Get all authors
  eleventyConfig.addCollection("authors", async function(collection) {
    collection = await api.authors
      .browse({
        limit: "all"
      })
      .catch(err => {
        console.error(err);
      });

    // Get all posts with their authors attached
    const posts = await api.posts
      .browse({
        include: "authors",
        limit: "all"
      })
      .catch(err => {
        console.error(err);
      });

    // Attach posts to their respective authors
    collection.forEach(async author => {
      const authorsPosts = posts.filter(post => {
        post.url = stripDomain(post.url);
        return post.primary_author.id === author.id;
      });
      if (authorsPosts.length) author.posts = authorsPosts;

      author.url = stripDomain(author.url);
    });

    return collection;
  });

  // Get all tags
  eleventyConfig.addCollection("tags", async function(collection) {
    collection = await api.tags
      .browse({
        include: "count.posts",
        limit: "all"
      })
      .catch(err => {
        console.error(err);
      });

    // Get all posts with their tags attached
    const posts = await api.posts
      .browse({
        include: "tags,authors",
        limit: "all"
      })
      .catch(err => {
        console.error(err);
      });

    // Attach posts to their respective tags
    collection.forEach(async tag => {
      const taggedPosts = posts.filter(post => {
        post.url = stripDomain(post.url);
        return post.primary_tag && post.primary_tag.slug === tag.slug;
      });
      if (taggedPosts.length) tag.posts = taggedPosts;

      tag.url = stripDomain(tag.url);
    });

    return collection;
  });


  eleventyConfig.addFilter("readableDate", (dateObj) => {
            return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat(
               "dd LLLL yyyy"
            );
        });
    
  // eleventyConfig.addFilter("htmlDateString", (dateObj) => {
    //     return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat(
     //         "yyyy-LL-dd"
    //     );
    // });
    


  // Display 404 page in BrowserSnyc
  eleventyConfig.setBrowserSyncConfig({
    callbacks: {
      ready: (err, bs) => {
        const content_404 = fs.readFileSync("dist/404.html");

        bs.addMiddleware("*", (req, res) => {
          // Provides the 404 content without redirect.
          res.write(content_404);
          res.end();
        });
      }
    }
  });

  // Eleventy configuration
  return {
    dir: {
      input: "src",
      output: "dist"
    },

    // Files read by Eleventy, add as needed
    // templateFormats: ["css", "njk", "md", "txt"],
    // htmlTemplateEngine: "njk",
    // markdownTemplateEngine: "njk",
    // passthroughFileCopy: true
  };
};
