const fs = require("fs");
const workbox = require("workbox-build");

module.exports = async (options, outputDir) => {
  const appId = "blockren-2021-pwa";
  const defaultOptions = {
    cacheId: appId,
    skipWaiting: true,
    clientsClaim: true,
    swDest: `${outputDir}/service-worker.js`,
    globDirectory: outputDir,
    globPatterns: [
      //   "**/*.{html,css,js,mjs,map,jpg,png,gif,webp,ico,svg,woff2,woff,eot,ttf,otf,ttc,json}",
      "**/*.{html,css,js,mjs,map,ico,woff2,woff,eot,ttf,otf,ttc,json}",
    ],
    runtimeCaching: [
      {
        urlPattern:
          /^.*\.(html|css|jpg|png|gif|webp|ico|svg|woff2|woff|eot|ttf|otf|ttc|json)$/,
        handler: "StaleWhileRevalidate",
      },
      {
        urlPattern: /^https?:\/\/fonts\.googleapis\.com\/css/,
        handler: "StaleWhileRevalidate",
      },
    ],
  };

  const opts = Object.assign({}, defaultOptions, options);
  let files;
  try {
    files = fs.readdirSync(opts.globDirectory);
    if (files && files.length === 0)
      throw new Error(
        `No files that can be cached on '${opts.globDirectory}', ignoring.`
      );
  } catch (e) {
    return e.message;
  }
  const genSW = await workbox.generateSW(opts);
  const size = (genSW.size / 1048576).toFixed(2);
  return `${genSW.count} files will be precached, total: ${size} MB.`;
};
