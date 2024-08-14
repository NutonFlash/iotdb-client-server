const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "development",
  entry: "./src/index.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/dist/",
  },
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
      {
        test: /\.proto$/,
        use: "protobufjs-loader",
      },
      {
        test: /\.worker\.js$/,
        use: {
          loader: "worker-loader",
          options: {
            inline: "no-fallback",
            name: "[name].[contenthash].worker.js",
            sourceMap: true,
          },
        },
      },
      {
        enforce: "pre",
        test: /\.js$/,
        exclude: /node_modules\/html-entities/,
        loader: "source-map-loader",
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: "src/proto/data.proto", to: "data.proto" }],
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, "public"),
    },
    compress: true,
    port: 9000,
    client: {
      overlay: false,
    },
  },
  ignoreWarnings: [(warning) => warning.message.includes("source-map-loader")],
};
