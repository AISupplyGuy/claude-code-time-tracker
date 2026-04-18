const esbuild = require("esbuild");
const path = require("path");

const shared = {
  bundle: true,
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  loader: { ".jsx": "jsx", ".js": "js" },
  external: [],
  define: {
    "process.env.NODE_ENV": '"production"',
  },
};

async function build() {
  await esbuild.build({
    ...shared,
    entryPoints: [path.join(__dirname, "src", "popover", "index.jsx")],
    outfile: path.join(__dirname, "renderer", "popover.bundle.js"),
  });

  await esbuild.build({
    ...shared,
    entryPoints: [path.join(__dirname, "src", "dashboard", "index.jsx")],
    outfile: path.join(__dirname, "renderer", "dashboard.bundle.js"),
  });

  console.log("Built popover + dashboard bundles");
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
